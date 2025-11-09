/**
 * JacBot - Discord Monitoring Bot for PS99
 * 
 * This bot monitors Discord servers and channels for PS99-related
 * messages, images, and leaks, then forwards them to a webhook.
 */

// Import required dependencies
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Configuration
const CONFIG = {
  // Bot token (from .env file)
  token: process.env.DISCORD_BOT_TOKEN,
  
  // Webhook URL for sending discoveries
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  
  // Channels to monitor (add your channels here)
  monitoredChannels: [
    // Example format:
    // { serverId: '123456789', channelId: '987654321', name: 'leaks-channel' }
  ],
  
  // Keywords to look for
  keywords: [
    'pet simulator', 'ps99', 'huge', 'exclusive', 'titanic',
    'update', 'leak', 'new pet', 'mythical', 'legendary',
    'pet sim', 'big games', 'preston', 'pixel', 'agony'
  ],
  
  // Data storage
  dataDir: './discord_scraped_data',
  messageCache: 'message_cache.json',
  imageCache: 'image_cache.json',
  
  // Auto-restart settings
  maxReconnectAttempts: 10,
  reconnectDelay: 5000 // 5 seconds
};

// Create data directory if it doesn't exist
if (!fs.existsSync(CONFIG.dataDir)) {
  fs.mkdirSync(CONFIG.dataDir, { recursive: true });
  console.log(`Created data directory: ${CONFIG.dataDir}`);
}

// Initialize message cache
let messageCache = {};
const messageCachePath = path.join(CONFIG.dataDir, CONFIG.messageCache);

if (fs.existsSync(messageCachePath)) {
  try {
    messageCache = JSON.parse(fs.readFileSync(messageCachePath));
    console.log(`Loaded message cache with ${Object.keys(messageCache).length} messages`);
  } catch (error) {
    console.error('Error loading message cache:', error);
    messageCache = {};
  }
} else {
  console.log('No message cache found, creating new one');
}

// Initialize image cache
let imageCache = {};
const imageCachePath = path.join(CONFIG.dataDir, CONFIG.imageCache);

if (fs.existsSync(imageCachePath)) {
  try {
    imageCache = JSON.parse(fs.readFileSync(imageCachePath));
    console.log(`Loaded image cache with ${Object.keys(imageCache).length} images`);
  } catch (error) {
    console.error('Error loading image cache:', error);
    imageCache = {};
  }
} else {
  console.log('No image cache found, creating new one');
}

// Save caches
function saveMessageCache() {
  try {
    fs.writeFileSync(messageCachePath, JSON.stringify(messageCache, null, 2));
    console.log(`Saved message cache with ${Object.keys(messageCache).length} messages`);
  } catch (error) {
    console.error('Error saving message cache:', error);
  }
}

function saveImageCache() {
  try {
    fs.writeFileSync(imageCachePath, JSON.stringify(imageCache, null, 2));
    console.log(`Saved image cache with ${Object.keys(imageCache).length} images`);
  } catch (error) {
    console.error('Error saving image cache:', error);
  }
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Client ready event
client.once('ready', () => {
  console.log(`JacBot logged in as ${client.user.tag}`);
  
  // Send startup notification
  sendStartupNotification();
  
  // Set status
  client.user.setActivity('for PS99 leaks', { type: 'WATCHING' });
});

// Handle messages
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;
  
  // Check if this is a monitored channel
  const isMonitored = CONFIG.monitoredChannels.some(channel => 
    channel.serverId === message.guild?.id && 
    channel.channelId === message.channel.id
  );
  
  // If not a monitored channel, check if the message contains keywords
  if (!isMonitored) {
    const hasKeyword = CONFIG.keywords.some(keyword => 
      message.content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (!hasKeyword) return;
  }
  
  // Process message
  await processMessage(message);
});

// Process a message for potential PS99 content
async function processMessage(message) {
  // Skip if already in cache
  if (messageCache[message.id]) return;
  
  // Add to cache
  messageCache[message.id] = {
    content: message.content,
    author: message.author.tag,
    channelId: message.channel.id,
    timestamp: message.createdTimestamp,
    hasAttachments: message.attachments.size > 0,
    processed: Date.now()
  };
  
  // Save cache
  saveMessageCache();
  
  // Check for PS99 related content
  const isPS99Related = CONFIG.keywords.some(keyword => 
    message.content.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Process if PS99 related or has attachments
  if (isPS99Related || message.attachments.size > 0) {
    console.log(`Found potential PS99 content in message: ${message.id}`);
    
    // Forward to webhook
    await forwardToWebhook(message);
    
    // Process attachments
    if (message.attachments.size > 0) {
      await processAttachments(message);
    }
  }
}

// Process message attachments
async function processAttachments(message) {
  for (const [id, attachment] of message.attachments) {
    // Skip if already in cache
    if (imageCache[id]) continue;
    
    // Check if it's an image
    const isImage = attachment.contentType?.startsWith('image/');
    
    // Add to cache
    imageCache[id] = {
      url: attachment.url,
      name: attachment.name,
      messageId: message.id,
      author: message.author.tag,
      isImage,
      contentType: attachment.contentType,
      size: attachment.size,
      processed: Date.now()
    };
    
    // Save image cache
    saveImageCache();
    
    // Download image if it's an image
    if (isImage) {
      await downloadImage(attachment);
    }
  }
}

// Download an image
async function downloadImage(attachment) {
  try {
    const imagePath = path.join(CONFIG.dataDir, `${attachment.id}_${attachment.name}`);
    
    // Skip if already downloaded
    if (fs.existsSync(imagePath)) return;
    
    // Download image
    const response = await axios({
      method: 'GET',
      url: attachment.url,
      responseType: 'stream'
    });
    
    // Save image
    const writer = fs.createWriteStream(imagePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`Downloaded image: ${attachment.name}`);
        resolve();
      });
      
      writer.on('error', (error) => {
        console.error(`Error downloading image: ${attachment.name}`, error);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`Error downloading image: ${attachment.name}`, error);
  }
}

// Forward message to webhook
async function forwardToWebhook(message) {
  if (!CONFIG.webhookUrl) {
    console.log('No webhook URL configured, skipping forward');
    return;
  }
  
  try {
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('PS99 Leak Detected')
      .setDescription(message.content || 'No content')
      .addFields(
        { name: 'Author', value: message.author.tag, inline: true },
        { name: 'Channel', value: message.channel.name, inline: true },
        { name: 'Server', value: message.guild?.name || 'Unknown', inline: true },
        { name: 'Message Link', value: `[Click to view](${message.url})`, inline: false }
      )
      .setTimestamp();
    
    // Add attachment if exists
    if (message.attachments.size > 0) {
      const firstAttachment = message.attachments.first();
      
      if (firstAttachment.contentType?.startsWith('image/')) {
        embed.setImage(firstAttachment.url);
      }
      
      // Add attachments field
      const attachmentsList = Array.from(message.attachments.values())
        .map(a => `[${a.name}](${a.url})`)
        .join('\n');
      
      embed.addFields({ name: 'Attachments', value: attachmentsList });
    }
    
    // Send to webhook
    const response = await axios.post(CONFIG.webhookUrl, {
      username: 'JacBot Leak Detector',
      avatar_url: 'https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png',
      embeds: [embed.toJSON()]
    });
    
    console.log(`Forwarded message to webhook, response: ${response.status}`);
  } catch (error) {
    console.error('Error forwarding to webhook:', error.message);
  }
}

// Send startup notification
async function sendStartupNotification() {
  if (!CONFIG.webhookUrl) return;
  
  try {
    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('JacBot Started')
      .setDescription('Discord monitoring bot for PS99 is now active')
      .addFields(
        { name: 'Status', value: 'Online', inline: true },
        { name: 'Monitored Channels', value: CONFIG.monitoredChannels.length.toString(), inline: true },
        { name: 'Started At', value: new Date().toLocaleString(), inline: true }
      )
      .setTimestamp();
    
    const response = await axios.post(CONFIG.webhookUrl, {
      username: 'JacBot Leak Detector',
      avatar_url: 'https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png',
      embeds: [embed.toJSON()]
    });
    
    console.log(`Sent startup notification, response: ${response.status}`);
  } catch (error) {
    console.error('Error sending startup notification:', error.message);
  }
}

// Login to Discord
let reconnectAttempts = 0;

function connect() {
  client.login(CONFIG.token)
    .catch(error => {
      console.error('Error connecting to Discord:', error.message);
      
      // Attempt to reconnect
      reconnectAttempts++;
      
      if (reconnectAttempts <= CONFIG.maxReconnectAttempts) {
        console.log(`Reconnecting in ${CONFIG.reconnectDelay}ms (attempt ${reconnectAttempts}/${CONFIG.maxReconnectAttempts})...`);
        
        setTimeout(connect, CONFIG.reconnectDelay);
      } else {
        console.error(`Failed to connect after ${CONFIG.maxReconnectAttempts} attempts`);
        process.exit(1);
      }
    });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down JacBot...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down JacBot...');
  client.destroy();
  process.exit(0);
});

// Start the bot
console.log('Starting JacBot...');

// Check for token
if (!CONFIG.token) {
  console.error('Error: Discord bot token not found in environment variables.');
  console.error('Please add DISCORD_BOT_TOKEN to your .env file.');
  process.exit(1);
}

// Connect to Discord
connect();