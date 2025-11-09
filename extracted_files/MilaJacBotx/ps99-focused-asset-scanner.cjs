/**
 * PS99 Focused Asset Scanner
 * 
 * This script specifically monitors high-priority developers for new PS99 assets.
 * It's designed to run continuously and catch assets as they're created.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const keyDevelopers = require('./key-developers.cjs');

// Configuration
const CONFIG = {
  // Prioritize developers
  developers: keyDevelopers,
  
  // Asset types to monitor
  assetTypes: [
    'Image',
    'Decal',
    'Model',
    'Mesh',
    'MeshPart',
    'Animation',
    'Audio',
    'Package'
  ],
  
  // PS99 related keywords
  ps99Keywords: [
    'pet simulator 99', 'ps99', 'pet sim', 'simulator 99', 
    'pixel', 'agony', 'huge', 'egg', 'exclusive', 'rare',
    'mythical', 'legendary', 'potatoes', 'plaza', 'limited'
  ],
  
  // API endpoints
  apiEndpoints: {
    inventory: 'https://inventory.roblox.com/v2/users',
    assetDetails: 'https://economy.roblox.com/v2/assets',
    thumbnails: 'https://thumbnails.roblox.com/v1/assets'
  },
  
  // Monitoring interval (in milliseconds)
  scanIntervalMinutes: 15,
  
  // Cache file
  cacheFile: './ps99_focused_asset_scanner_cache.json',
  
  // Discord webhook URL
  webhookUrl: process.env.DISCORD_WEBHOOK_URL
};

// Initialize cache
let cache = {
  lastScan: 0,
  developers: {},
  assets: {}
};

// Load cache if exists
if (fs.existsSync(CONFIG.cacheFile)) {
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
    console.log(`Loaded cache with ${Object.keys(cache.assets).length} assets`);
  } catch (error) {
    console.error('Error loading cache:', error.message);
  }
} else {
  console.log('No cache found, creating new cache');
  
  // Initialize developer cache
  for (const dev of CONFIG.developers) {
    cache.developers[dev.id] = {
      username: dev.username,
      displayName: dev.displayName,
      lastScan: 0,
      assets: {}
    };
  }
}

// Save cache
function saveCache() {
  try {
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
    console.log(`Saved cache with ${Object.keys(cache.assets).length} assets`);
  } catch (error) {
    console.error('Error saving cache:', error.message);
  }
}

// Utility functions
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

// Make API request with rate limit handling
async function makeApiRequest(url, options = {}) {
  try {
    console.log(`Making request to: ${url}`);
    
    const response = await axios({
      method: options.method || 'GET',
      url,
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': options.accept || 'application/json',
        'Content-Type': options.contentType || 'application/json',
        ...options.headers
      },
      data: options.data,
      timeout: options.timeout || 10000
    });
    
    if (response.status === 200) {
      return response.data;
    }
    
    if (response.status === 429) {
      console.log(`Rate limited on ${url}. Waiting 30 seconds before retry...`);
      await delay(30000);
      return makeApiRequest(url, options);
    }
    
    console.log(`Request failed with status ${response.status}: ${url}`);
    return null;
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    
    if (error.response && error.response.status === 429) {
      console.log(`Rate limited on ${url}. Waiting 60 seconds before retry...`);
      await delay(60000);
      return makeApiRequest(url, options);
    }
    
    return null;
  }
}

// Get developer's inventory for a specific asset type
async function getDeveloperInventory(developerId, assetType) {
  try {
    const inventoryUrl = `${CONFIG.apiEndpoints.inventory}/${developerId}/inventory/${assetType}?limit=100&sortOrder=Desc`;
    const response = await makeApiRequest(inventoryUrl);
    
    if (!response || !response.data) {
      console.log(`Failed to get ${assetType} inventory for developer ${developerId}`);
      return [];
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error getting ${assetType} inventory for developer ${developerId}:`, error.message);
    return [];
  }
}

// Get asset details
async function getAssetDetails(assetId) {
  try {
    const assetUrl = `${CONFIG.apiEndpoints.assetDetails}/${assetId}/details`;
    const response = await makeApiRequest(assetUrl);
    
    if (!response) {
      console.log(`Failed to get details for asset ${assetId}`);
      return null;
    }
    
    return response;
  } catch (error) {
    console.error(`Error getting details for asset ${assetId}:`, error.message);
    return null;
  }
}

// Get asset thumbnail
async function getAssetThumbnail(assetId) {
  try {
    const thumbnailUrl = `${CONFIG.apiEndpoints.thumbnails}?assetIds=${assetId}&size=420x420&format=Png`;
    const response = await makeApiRequest(thumbnailUrl);
    
    if (!response || !response.data || response.data.length === 0) {
      console.log(`Failed to get thumbnail for asset ${assetId}`);
      return null;
    }
    
    return response.data[0].imageUrl;
  } catch (error) {
    console.error(`Error getting thumbnail for asset ${assetId}:`, error.message);
    return null;
  }
}

// Check if asset is likely related to PS99
function isPS99Related(asset) {
  if (!asset || !asset.name) return false;
  
  // Check name and description against keywords
  const name = asset.name.toLowerCase();
  const description = (asset.description || '').toLowerCase();
  
  return CONFIG.ps99Keywords.some(keyword => 
    name.includes(keyword.toLowerCase()) || 
    description.includes(keyword.toLowerCase())
  );
}

// Format asset for Discord webhook
function formatAssetForDiscord(asset, developer) {
  // Get emoji based on asset type
  const typeEmojis = {
    'Image': '🖼️',
    'Decal': '🎨',
    'Model': '🧩',
    'Mesh': '🔷',
    'MeshPart': '📐',
    'Animation': '🏃',
    'Audio': '🔊',
    'Package': '📦'
  };
  
  const emoji = typeEmojis[asset.assetType] || '📦';
  
  return {
    username: "PS99 Asset Scanner",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: `${emoji} NEW PS99 ASSET: ${asset.name}`,
      url: `https://www.roblox.com/catalog/${asset.id}/`,
      color: 0x2ECC71, // Green
      description: asset.description || 'No description available',
      fields: [
        {
          name: "Asset ID",
          value: asset.id.toString(),
          inline: true
        },
        {
          name: "Type",
          value: asset.assetType,
          inline: true
        },
        {
          name: "Creator",
          value: `${developer.displayName} (${developer.username})`,
          inline: true
        },
        {
          name: "Found At",
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      thumbnail: {
        url: asset.imageUrl || "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png"
      },
      footer: {
        text: "PS99 Asset Scanner"
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// Send asset to Discord webhook
async function sendToDiscord(payload) {
  if (!CONFIG.webhookUrl) {
    console.log('No webhook URL provided, skipping Discord notification');
    return false;
  }
  
  try {
    const response = await axios.post(CONFIG.webhookUrl, payload);
    console.log(`Notification sent to Discord, response: ${response.status}`);
    return true;
  } catch (error) {
    console.error(`Error sending to Discord:`, error.message);
    return false;
  }
}

// Scan a developer's inventory for PS99 assets
async function scanDeveloperInventory(developer) {
  console.log(`\nScanning developer: ${developer.username} (${developer.displayName})`);
  
  // Track discovered assets
  const discoveries = [];
  
  // Get developer cache
  const devCache = cache.developers[developer.id];
  
  // Scan each asset type
  for (const assetType of CONFIG.assetTypes) {
    console.log(`Scanning ${assetType} assets...`);
    
    // Get developer's inventory for this asset type
    const assets = await getDeveloperInventory(developer.id, assetType);
    
    console.log(`Found ${assets.length} ${assetType} assets`);
    
    // Process each asset
    for (const asset of assets) {
      const assetId = asset.assetId;
      
      // Skip if already in cache
      if (devCache.assets[assetId]) {
        continue;
      }
      
      console.log(`Checking asset: ${asset.name || 'Unknown'} (${assetId})`);
      
      // Get full asset details
      const assetDetails = await getAssetDetails(assetId);
      
      if (!assetDetails) {
        continue;
      }
      
      // Check if PS99 related
      const ps99Related = isPS99Related({
        name: asset.name || assetDetails.Name,
        description: assetDetails.Description
      });
      
      // Get asset thumbnail
      let imageUrl = null;
      if (ps99Related) {
        imageUrl = await getAssetThumbnail(assetId);
      }
      
      // Create asset object
      const assetObj = {
        id: assetId,
        name: asset.name || assetDetails.Name,
        assetType: assetType,
        description: assetDetails.Description,
        createdAt: assetDetails.Created,
        updatedAt: assetDetails.Updated,
        imageUrl: imageUrl,
        creator: {
          id: developer.id,
          name: developer.username
        }
      };
      
      // Add to cache
      devCache.assets[assetId] = {
        name: assetObj.name,
        assetType: assetObj.assetType,
        ps99Related: ps99Related,
        lastChecked: Date.now()
      };
      
      // If PS99 related, add to discoveries
      if (ps99Related) {
        console.log(`Found PS99 related asset: ${assetObj.name} (${assetId})`);
        discoveries.push(assetObj);
        
        // Also add to global assets cache
        cache.assets[assetId] = {
          name: assetObj.name,
          assetType: assetObj.assetType,
          creator: developer.username,
          foundAt: Date.now()
        };
      }
      
      // Add delay between asset checks to avoid rate limiting
      await delay(1000);
    }
    
    // Add delay between asset types
    await delay(5000);
  }
  
  // Update developer's last scan time
  devCache.lastScan = Date.now();
  
  // Return discoveries
  return discoveries;
}

// Run a full scan
async function runFullScan() {
  console.log('\n=== Starting PS99 focused asset scan ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  // Track all discoveries
  let allDiscoveries = [];
  
  // Scan all developers by priority
  const prioritizedDevelopers = [...CONFIG.developers].sort((a, b) => a.priority - b.priority);
  
  for (const developer of prioritizedDevelopers) {
    // Skip if developer was scanned recently (within 1 hour)
    const devCache = cache.developers[developer.id];
    if (devCache && Date.now() - devCache.lastScan < 60 * 60 * 1000) {
      console.log(`Skipping ${developer.username}, scanned recently`);
      continue;
    }
    
    // Scan developer's inventory
    const discoveries = await scanDeveloperInventory(developer);
    
    // Add to all discoveries
    allDiscoveries = [...allDiscoveries, ...discoveries];
    
    // Send discoveries to Discord
    for (const asset of discoveries) {
      const webhookPayload = formatAssetForDiscord(asset, developer);
      await sendToDiscord(webhookPayload);
      
      // Add delay between webhook messages
      await delay(1000);
    }
    
    // Add delay between developers
    await delay(10000);
  }
  
  // Update last scan time
  cache.lastScan = Date.now();
  
  // Save cache
  saveCache();
  
  console.log(`\nScan complete. Found ${allDiscoveries.length} new PS99 assets.`);
  return allDiscoveries;
}

// Start continuous scanning
async function startContinuousScanning() {
  console.log(`Starting PS99 focused asset scanning at ${CONFIG.scanIntervalMinutes}-minute intervals`);
  
  // Run initial scan
  await runFullScan();
  
  // Set up interval for continuous scanning
  setInterval(async () => {
    try {
      await runFullScan();
    } catch (error) {
      console.error('Error in scheduled scan:', error);
    }
  }, CONFIG.scanIntervalMinutes * 60 * 1000);
  
  console.log('Continuous scanning started!');
}

// Send a test notification
async function sendTestNotification() {
  console.log('Sending test notification to Discord webhook...');
  
  if (!CONFIG.webhookUrl) {
    console.log('No webhook URL provided, cannot send test notification');
    return false;
  }
  
  try {
    const testPayload = {
      username: "PS99 Asset Scanner",
      avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
      embeds: [{
        title: "PS99 Focused Asset Scanner Started",
        description: "Now monitoring high-priority developers for PS99 assets",
        color: 0x2ECC71, // Green
        fields: [
          {
            name: "Monitoring Interval",
            value: `${CONFIG.scanIntervalMinutes} minutes`,
            inline: true
          },
          {
            name: "Developers Tracked",
            value: CONFIG.developers.length.toString(),
            inline: true
          },
          {
            name: "Asset Types",
            value: CONFIG.assetTypes.join(', '),
            inline: false
          }
        ],
        footer: {
          text: "PS99 Asset Scanner"
        },
        timestamp: new Date().toISOString()
      }]
    };
    
    const response = await axios.post(CONFIG.webhookUrl, testPayload);
    console.log(`Test notification sent, response: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error sending test notification:', error);
    return false;
  }
}

// Run if executed directly
if (require.main === module) {
  // Send test notification
  sendTestNotification().then(() => {
    // Start continuous scanning
    startContinuousScanning();
  });
}

module.exports = {
  runFullScan,
  startContinuousScanning,
  scanDeveloperInventory,
  sendTestNotification
};