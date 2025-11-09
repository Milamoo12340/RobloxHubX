/**
 * PS99 Icon & Thumbnail Scanner
 * 
 * This specialized scanner focuses on PS99 game icons and thumbnails,
 * which are often updated before major game updates.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const rateLimiter = require('./utils/rate-limiter');

// Load environment variables (if dotenv is available)
try {
  require('dotenv').config();
} catch (err) {
  console.log('dotenv not available, using environment variables as is');
}

// Configuration
const CONFIG = {
  // PS99 game info
  universeId: 3317771874,
  placeId: 8737899170,
  creatorId: 3959677, // BIG Games Pets group ID
  
  // API endpoints
  endpoints: {
    gameInfo: 'https://games.roblox.com/v1/games',
    gameIcons: 'https://thumbnails.roblox.com/v1/games/icons',
    gameThumbnails: 'https://thumbnails.roblox.com/v1/games/multiget/thumbnails',
    gamepassIcons: 'https://thumbnails.roblox.com/v1/game-passes',
    assetThumbnails: 'https://thumbnails.roblox.com/v1/assets'
  },
  
  // Scan intervals
  scanInterval: 5 * 60 * 1000, // 5 minutes
  
  // Image saving
  saveImages: true,
  imageDir: './ps99_images',
  
  // Discord webhook
  webhookUrl: process.env.DISCORD_WEBHOOK_URL || process.env.PETBOT_WEBHOOK_URL,
  
  // Cache file
  cacheFile: './ps99_icon_cache.json'
};

// Create image directory if it doesn't exist and saving is enabled
if (CONFIG.saveImages && !fs.existsSync(CONFIG.imageDir)) {
  fs.mkdirSync(CONFIG.imageDir, { recursive: true });
  console.log(`Created image directory: ${CONFIG.imageDir}`);
}

// Cache data
let cache = {
  gameIcon: '',
  gameThumbnails: [],
  lastScan: 0
};

// Load cache if exists
if (fs.existsSync(CONFIG.cacheFile)) {
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
    console.log('Loaded icon cache successfully');
    console.log(`Current icon: ${cache.gameIcon.substring(0, 50)}...`);
    console.log(`Thumbnails: ${cache.gameThumbnails.length}`);
  } catch (error) {
    console.error('Error loading cache:', error.message);
  }
} else {
  console.log('No cache found, starting fresh');
}

// Save cache
function saveCache() {
  try {
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
    console.log('Cache saved successfully');
  } catch (error) {
    console.error('Error saving cache:', error.message);
  }
}

// Get a random user agent
function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

// Make API request with rate limiting
async function makeApiRequest(url, options = {}) {
  const requestFn = async () => {
    console.log(`Making request to: ${url}`);
    
    const response = await axios({
      method: options.method || 'GET',
      url,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json',
        ...options.headers
      },
      data: options.data,
      params: options.params,
      timeout: options.timeout || 10000
    });
    
    return response.data;
  };
  
  // Use rate limiter
  return rateLimiter.retryWithBackoff(() => rateLimiter.queueRequest(url, requestFn));
}

// Send discovery to Discord
async function sendToDiscord(discovery) {
  if (!CONFIG.webhookUrl) {
    console.log('No webhook URL configured, skipping Discord notification');
    return false;
  }
  
  try {
    const response = await axios.post(CONFIG.webhookUrl, discovery);
    console.log(`Sent to Discord, response: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error sending to Discord:', error.message);
    return false;
  }
}

// Download image
async function downloadImage(imageUrl, filename) {
  if (!CONFIG.saveImages) return null;
  
  try {
    const imagePath = path.join(CONFIG.imageDir, filename);
    
    // Skip if already exists
    if (fs.existsSync(imagePath)) {
      console.log(`Image already exists: ${filename}`);
      return imagePath;
    }
    
    // Get image
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer'
    });
    
    // Save image
    fs.writeFileSync(imagePath, response.data);
    console.log(`Downloaded image: ${filename}`);
    
    return imagePath;
  } catch (error) {
    console.error(`Error downloading image ${filename}:`, error.message);
    return null;
  }
}

// Format discovery for Discord
function formatIconChangeForDiscord(oldIcon, newIcon, imagePath) {
  return {
    username: "PS99 Update Detector",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: "🚨 PS99 ICON UPDATED 🚨",
      description: "Pet Simulator 99 has a new game icon - update incoming!",
      color: 0xFF0000, // Red
      fields: [
        {
          name: "Detection Time",
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      image: {
        url: newIcon
      },
      footer: {
        text: "PS99 Icon & Thumbnail Scanner"
      },
      timestamp: new Date().toISOString()
    }]
  };
}

function formatThumbnailChangeForDiscord(newThumbnails) {
  return {
    username: "PS99 Update Detector",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: "🚨 PS99 THUMBNAILS UPDATED 🚨",
      description: `Pet Simulator 99 has ${newThumbnails.length} new thumbnails - update incoming!`,
      color: 0xFF9900, // Orange
      fields: [
        {
          name: "Detection Time",
          value: new Date().toLocaleString(),
          inline: true
        },
        {
          name: "New Thumbnails",
          value: `${newThumbnails.length} new images detected`,
          inline: true
        }
      ],
      image: {
        url: newThumbnails[0] // Show first new thumbnail
      },
      footer: {
        text: "PS99 Icon & Thumbnail Scanner"
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// Check game icon
async function checkGameIcon() {
  console.log('\n=== Checking PS99 game icon ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  try {
    // Get game icon
    const url = `${CONFIG.endpoints.gameIcons}?universeIds=${CONFIG.universeId}&size=512x512&format=Png`;
    const iconData = await makeApiRequest(url);
    
    if (!iconData || !iconData.data || iconData.data.length === 0) {
      console.log('No icon data found');
      return false;
    }
    
    const icon = iconData.data[0];
    
    // First run
    if (!cache.gameIcon) {
      console.log('First run, saving icon to cache');
      cache.gameIcon = icon.imageUrl;
      saveCache();
      
      // Download icon
      if (CONFIG.saveImages) {
        const filename = `icon_${CONFIG.universeId}_${Date.now()}.png`;
        await downloadImage(icon.imageUrl, filename);
      }
      
      return false;
    }
    
    // Check if icon changed
    if (icon.imageUrl !== cache.gameIcon) {
      console.log('Game icon has changed!');
      console.log(`Old: ${cache.gameIcon}`);
      console.log(`New: ${icon.imageUrl}`);
      
      // Download new icon
      let imagePath = null;
      if (CONFIG.saveImages) {
        const filename = `icon_${CONFIG.universeId}_${Date.now()}.png`;
        imagePath = await downloadImage(icon.imageUrl, filename);
      }
      
      // Format discovery
      const discovery = formatIconChangeForDiscord(cache.gameIcon, icon.imageUrl, imagePath);
      
      // Send to Discord
      await sendToDiscord(discovery);
      
      // Update cache
      cache.gameIcon = icon.imageUrl;
      saveCache();
      
      return true;
    }
    
    console.log('No changes to game icon');
    return false;
  } catch (error) {
    console.error('Error checking game icon:', error.message);
    return false;
  }
}

// Check game thumbnails
async function checkGameThumbnails() {
  console.log('\n=== Checking PS99 game thumbnails ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  try {
    // Get game thumbnails
    const url = `${CONFIG.endpoints.gameThumbnails}?universeIds=${CONFIG.universeId}&countPerUniverse=10&size=768x432&format=Png`;
    const thumbnailData = await makeApiRequest(url);
    
    if (!thumbnailData || !thumbnailData.data || thumbnailData.data.length === 0) {
      console.log('No thumbnail data found');
      return false;
    }
    
    const gameThumbnails = thumbnailData.data[0]?.thumbnails || [];
    
    if (gameThumbnails.length === 0) {
      console.log('No thumbnails found');
      return false;
    }
    
    console.log(`Found ${gameThumbnails.length} thumbnails`);
    
    // First run
    if (!cache.gameThumbnails || cache.gameThumbnails.length === 0) {
      console.log('First run, saving thumbnails to cache');
      
      // Save thumbnail URLs
      cache.gameThumbnails = gameThumbnails.map(t => t.imageUrl);
      saveCache();
      
      // Download thumbnails
      if (CONFIG.saveImages) {
        for (let i = 0; i < gameThumbnails.length; i++) {
          const thumbnail = gameThumbnails[i];
          const filename = `thumbnail_${CONFIG.universeId}_${i}_${Date.now()}.png`;
          await downloadImage(thumbnail.imageUrl, filename);
        }
      }
      
      return false;
    }
    
    // Check for new thumbnails
    const newThumbnails = [];
    const thumbnailUrls = gameThumbnails.map(t => t.imageUrl);
    
    for (const url of thumbnailUrls) {
      if (!cache.gameThumbnails.includes(url)) {
        console.log(`New thumbnail found: ${url}`);
        newThumbnails.push(url);
      }
    }
    
    if (newThumbnails.length > 0) {
      console.log(`Found ${newThumbnails.length} new thumbnails!`);
      
      // Download new thumbnails
      if (CONFIG.saveImages) {
        for (let i = 0; i < newThumbnails.length; i++) {
          const url = newThumbnails[i];
          const filename = `new_thumbnail_${CONFIG.universeId}_${i}_${Date.now()}.png`;
          await downloadImage(url, filename);
        }
      }
      
      // Format discovery
      const discovery = formatThumbnailChangeForDiscord(newThumbnails);
      
      // Send to Discord
      await sendToDiscord(discovery);
      
      // Update cache
      cache.gameThumbnails = thumbnailUrls;
      saveCache();
      
      return true;
    }
    
    console.log('No new thumbnails found');
    return false;
  } catch (error) {
    console.error('Error checking game thumbnails:', error.message);
    return false;
  }
}

// Run full scan
async function runFullScan() {
  console.log('\n=== Running full PS99 icon & thumbnail scan ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  // Check game icon
  const iconChanged = await checkGameIcon();
  
  // Check game thumbnails
  const thumbnailsChanged = await checkGameThumbnails();
  
  // Update last scan time
  cache.lastScan = Date.now();
  saveCache();
  
  return iconChanged || thumbnailsChanged;
}

// Start scanner
async function startScanner() {
  console.log('Starting PS99 Icon & Thumbnail Scanner');
  
  // Run initial scan
  await runFullScan();
  
  // Set interval
  setInterval(async () => {
    try {
      await runFullScan();
    } catch (error) {
      console.error('Error in scan interval:', error);
    }
  }, CONFIG.scanInterval);
  
  console.log(`Scanner running with ${CONFIG.scanInterval / (60 * 1000)} minute interval`);
}

// Send startup notification
async function sendStartupNotification() {
  const webhook = {
    username: "PS99 Update Detector",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: "🚀 PS99 Icon & Thumbnail Scanner Started",
      description: "Now monitoring for PS99 game icon and thumbnail changes",
      color: 0x00FF00, // Green
      fields: [
        {
          name: "Scan Interval",
          value: `${CONFIG.scanInterval / (60 * 1000)} minutes`,
          inline: true
        },
        {
          name: "Image Saving",
          value: CONFIG.saveImages ? 'Enabled' : 'Disabled',
          inline: true
        },
        {
          name: "Started At",
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      footer: {
        text: "PS99 Icon & Thumbnail Scanner"
      },
      timestamp: new Date().toISOString()
    }]
  };
  
  await sendToDiscord(webhook);
}

// Start the scanner
(async () => {
  try {
    // Send startup notification
    await sendStartupNotification();
    
    // Start scanner
    await startScanner();
  } catch (error) {
    console.error('Error starting scanner:', error);
  }
})();