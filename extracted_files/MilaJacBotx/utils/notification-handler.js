/**
 * PS99 Notification Handler
 * 
 * This utility handles sending notifications to Discord webhooks
 * with proper formatting and rate limiting.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Notification types
  types: {
    ASSET_FOUND: {
      emoji: '🔍',
      color: 0x3498DB, // Blue
      title: 'NEW PS99 ASSET FOUND'
    },
    PET_FOUND: {
      emoji: '🐾',
      color: 0xE91E63, // Pink
      title: 'NEW PS99 PET FOUND'
    },
    GAMEPASS_FOUND: {
      emoji: '💎',
      color: 0x9B59B6, // Purple
      title: 'NEW PS99 GAMEPASS FOUND'
    },
    GAME_UPDATED: {
      emoji: '🚨',
      color: 0xFF0000, // Red
      title: 'PS99 GAME UPDATED'
    },
    DEVELOPER_ACTIVITY: {
      emoji: '👨‍💻',
      color: 0xF39C12, // Orange
      title: 'PS99 DEVELOPER ACTIVITY'
    },
    THUMBNAIL_UPDATED: {
      emoji: '🖼️',
      color: 0x2ECC71, // Green
      title: 'PS99 THUMBNAILS UPDATED'
    },
    ICON_UPDATED: {
      emoji: '📱',
      color: 0xFF5722, // Deep Orange
      title: 'PS99 ICON UPDATED'
    },
    LEAK_FOUND: {
      emoji: '💧',
      color: 0x00BCD4, // Cyan
      title: 'PS99 LEAK FOUND'
    },
    SYSTEM_ALERT: {
      emoji: '⚠️',
      color: 0xFFEB3B, // Yellow
      title: 'PS99 TRACKER ALERT'
    }
  },
  
  // Rate limiting
  maxNotificationsPerMinute: 10,
  notificationCooldown: 5000, // 5 seconds between notifications
  
  // History tracking
  historyFile: './notification_history.json',
  maxHistoryEntries: 100
};

// Notification queue
const notificationQueue = [];
let isProcessingQueue = false;
let lastNotificationTime = 0;
let notificationHistory = [];

// Load notification history
function loadHistory() {
  if (fs.existsSync(CONFIG.historyFile)) {
    try {
      notificationHistory = JSON.parse(fs.readFileSync(CONFIG.historyFile, 'utf8'));
      console.log(`Loaded notification history with ${notificationHistory.length} entries`);
    } catch (error) {
      console.error('Error loading notification history:', error.message);
      notificationHistory = [];
    }
  }
}

// Save notification history
function saveHistory() {
  try {
    // Limit history size
    if (notificationHistory.length > CONFIG.maxHistoryEntries) {
      notificationHistory = notificationHistory.slice(-CONFIG.maxHistoryEntries);
    }
    
    fs.writeFileSync(CONFIG.historyFile, JSON.stringify(notificationHistory, null, 2));
  } catch (error) {
    console.error('Error saving notification history:', error.message);
  }
}

// Process notification queue
async function processQueue() {
  if (isProcessingQueue || notificationQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (notificationQueue.length > 0) {
    // Check cooldown
    const now = Date.now();
    const timeSinceLastNotification = now - lastNotificationTime;
    
    if (timeSinceLastNotification < CONFIG.notificationCooldown) {
      const waitTime = CONFIG.notificationCooldown - timeSinceLastNotification;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Send notification
    const notification = notificationQueue.shift();
    
    try {
      const response = await axios.post(notification.webhookUrl, notification.payload);
      console.log(`Notification sent: ${notification.type}, status: ${response.status}`);
      
      // Update last notification time
      lastNotificationTime = Date.now();
      
      // Add to history
      notificationHistory.push({
        type: notification.type,
        title: notification.payload.embeds[0]?.title,
        description: notification.payload.embeds[0]?.description,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      saveHistory();
    } catch (error) {
      console.error(`Error sending notification: ${error.message}`);
      
      // Add failed notification to history
      notificationHistory.push({
        type: notification.type,
        title: notification.payload.embeds[0]?.title,
        description: notification.payload.embeds[0]?.description,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });
      
      saveHistory();
      
      // If rate limited, pause the queue
      if (error.response && error.response.status === 429) {
        console.log('Discord rate limit hit, pausing notifications');
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
      }
    }
    
    // Small delay between notifications
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  isProcessingQueue = false;
}

// Format a notification payload
function formatNotification(type, data, customEmbed = null) {
  const typeConfig = CONFIG.types[type] || CONFIG.types.SYSTEM_ALERT;
  
  // Use custom embed if provided, otherwise build one
  const embed = customEmbed || {
    title: `${typeConfig.emoji} ${typeConfig.title}`,
    color: typeConfig.color,
    description: data.description || 'No description provided',
    fields: [],
    timestamp: new Date().toISOString()
  };
  
  // Add fields if provided
  if (data.fields) {
    embed.fields = data.fields;
  }
  
  // Add thumbnail if provided
  if (data.thumbnailUrl) {
    embed.thumbnail = { url: data.thumbnailUrl };
  }
  
  // Add image if provided
  if (data.imageUrl) {
    embed.image = { url: data.imageUrl };
  }
  
  // Add footer if provided
  if (data.footer) {
    embed.footer = { text: data.footer };
  } else {
    embed.footer = { text: 'PS99 Asset Tracker' };
  }
  
  return {
    username: data.username || "PS99 Asset Tracker",
    avatar_url: data.avatarUrl || "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [embed]
  };
}

// Queue a notification
function queueNotification(type, data, webhookUrl) {
  if (!webhookUrl) {
    console.log('No webhook URL provided, skipping notification');
    return false;
  }
  
  // Create notification payload
  const payload = formatNotification(type, data);
  
  // Add to queue
  notificationQueue.push({
    type,
    webhookUrl,
    payload
  });
  
  // Start processing queue if not already
  processQueue();
  
  return true;
}

// Send a custom notification
function sendCustomNotification(webhookUrl, embedData) {
  if (!webhookUrl) {
    console.log('No webhook URL provided, skipping notification');
    return false;
  }
  
  // Add to queue
  notificationQueue.push({
    type: 'CUSTOM',
    webhookUrl,
    payload: embedData
  });
  
  // Start processing queue if not already
  processQueue();
  
  return true;
}

// Initialize
loadHistory();

module.exports = {
  queueNotification,
  sendCustomNotification,
  notificationTypes: Object.keys(CONFIG.types),
  getHistory: () => notificationHistory
};