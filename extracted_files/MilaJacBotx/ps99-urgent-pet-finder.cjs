/**
 * PS99 URGENT PET FINDER
 * 
 * High-priority scanner focused exclusively on detecting new pets
 * for an imminent update. Polls aggressively on shortened intervals.
 */

const axios = require('axios');
const fs = require('fs');

// Configuration - FOCUSED ON IMMINENT UPDATE
const CONFIG = {
  // Critical targets - highest priority only
  developers: [
    { id: 13365322, username: "chickenputty" },  // Currently in Studio!
    { id: 7707349, username: "JamienChee" },
    { id: 19717956, username: "BuildIntoGames" }, // Currently in Studio!
    { id: 1210210, username: "ForeverDev" },     // David - Critical developer
    { id: 2213470865, username: "CoderConner" }, // Core developer
    { id: 2882755487, username: "CoderJoey" },   // Core developer
    { id: 2880286252, username: "spiffyproe" },  // Core developer
    { id: 2878290231, username: "CoderMitchell" }, // Core developer
    { id: 1909623504, username: "YoExile" },     // Developer
    { id: 3983340648, username: "CoderTony" },   // Currently in Studio!
    { id: 3959677, type: 'group', name: "BIG Games Pets" }
  ],
  
  // Keywords specifically for new pets
  petKeywords: [
    'pet', 'huge', 'exclusive', 'titanic', 'mythical', 
    'legendary', 'launch', 'release', 'update', 'new', 
    'ps99', 'version', 'pixel', 'agony', 'potato'
  ],
  
  // API endpoints
  endpoints: {
    devInventory: 'https://inventory.roblox.com/v2/users',
    groupAssets: 'https://catalog.roblox.com/v1/search/items',
    assetInfo: 'https://economy.roblox.com/v2/assets',
    thumbnails: 'https://thumbnails.roblox.com/v1/assets'
  },
  
  // Shortened scan intervals (in milliseconds)
  scanInterval: 20 * 1000, // 20 seconds between scans
  
  // Webhook for notifications
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  
  // Cache file
  cacheFile: './ps99_urgent_pets.json'
};

// Initialize cache
let cache = {
  lastScan: 0,
  assets: {}
};

// Load cache if exists
if (fs.existsSync(CONFIG.cacheFile)) {
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
    console.log(`Loaded cache with ${Object.keys(cache.assets).length} assets`);
  } catch (error) {
    console.error('Error loading cache:', error);
  }
} else {
  console.log('No cache found, creating new cache');
}

// Save cache
function saveCache() {
  try {
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
    console.log(`Saved cache with ${Object.keys(cache.assets).length} assets`);
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// Utilities
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
      params: options.params,
      timeout: options.timeout || 10000
    });
    
    if (response.status === 200) {
      return response.data;
    }
    
    // Handle rate limiting
    if (response.status === 429) {
      const waitTime = options.retryCount ? 
        Math.min(30000, 1000 * Math.pow(2, options.retryCount)) : 
        5000;
      
      console.log(`Rate limited on ${url}. Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
      
      // Retry with backoff
      return makeApiRequest(url, {
        ...options,
        retryCount: (options.retryCount || 0) + 1
      });
    }
    
    console.log(`Request failed with status ${response.status}: ${url}`);
    return null;
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    return null;
  }
}

// Check if an asset is related to PS99 pets
function isPetAsset(asset) {
  if (!asset || !asset.name) return false;
  
  const assetName = asset.name.toLowerCase();
  const assetDesc = (asset.description || '').toLowerCase();
  
  // Check if it has pet-related keywords
  return CONFIG.petKeywords.some(keyword => 
    assetName.includes(keyword.toLowerCase()) || 
    assetDesc.includes(keyword.toLowerCase())
  );
}

// Get developer's latest assets
async function getDeveloperAssets(developerId) {
  try {
    // Check multiple asset types that could contain pets
    const assetTypes = ['Image', 'Model', 'Decal', 'Mesh', 'MeshPart'];
    let allAssets = [];
    
    for (const assetType of assetTypes) {
      const url = `${CONFIG.endpoints.devInventory}/${developerId}/inventory/${assetType}?limit=30&sortOrder=Desc`;
      const response = await makeApiRequest(url);
      
      if (response && response.data) {
        allAssets = [...allAssets, ...response.data];
      }
      
      // Short delay between requests
      await delay(1000);
    }
    
    return allAssets;
  } catch (error) {
    console.error(`Error getting assets for developer ${developerId}:`, error.message);
    return [];
  }
}

// Get group assets
async function getGroupAssets(groupId) {
  try {
    const url = `${CONFIG.endpoints.groupAssets}`;
    const response = await makeApiRequest(url, {
      params: {
        category: 'All',
        creatorTargetId: groupId,
        creatorType: 'Group',
        limit: 30,
        sortType: 'RecentlyUpdated'
      }
    });
    
    if (response && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error(`Error getting assets for group ${groupId}:`, error.message);
    return [];
  }
}

// Get asset details
async function getAssetDetails(assetId) {
  try {
    const url = `${CONFIG.endpoints.assetInfo}/${assetId}/details`;
    return await makeApiRequest(url);
  } catch (error) {
    console.error(`Error getting details for asset ${assetId}:`, error.message);
    return null;
  }
}

// Get asset thumbnail
async function getAssetThumbnail(assetId) {
  try {
    const url = `${CONFIG.endpoints.thumbnails}?assetIds=${assetId}&size=420x420&format=Png`;
    const response = await makeApiRequest(url);
    
    if (response && response.data && response.data.length > 0) {
      return response.data[0].imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting thumbnail for asset ${assetId}:`, error.message);
    return null;
  }
}

// Format asset for Discord
function formatAssetForDiscord(asset) {
  // Determine emoji based on name keywords
  let emoji = '🐾'; // Default pet emoji
  
  if (asset.name.toLowerCase().includes('huge')) {
    emoji = '🔷';
  } else if (asset.name.toLowerCase().includes('titanic')) {
    emoji = '🔶';
  } else if (asset.name.toLowerCase().includes('exclusive')) {
    emoji = '✨';
  } else if (asset.name.toLowerCase().includes('pixel')) {
    emoji = '🎮';
  }
  
  // Format webhook payload
  return {
    username: "PS99 UPDATE ALERT",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: `${emoji} NEW PS99 PET FOUND: ${asset.name}`,
      url: `https://www.roblox.com/catalog/${asset.id}/`,
      color: 0xFF0000, // Red for urgency
      description: asset.description || 'No description available',
      fields: [
        {
          name: "Asset ID",
          value: asset.id.toString(),
          inline: true
        },
        {
          name: "Asset Type",
          value: asset.assetType || 'Unknown',
          inline: true
        },
        {
          name: "Creator",
          value: asset.creator || 'Unknown',
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
        text: "PS99 IMMINENT UPDATE SCANNER"
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// Send asset to Discord
async function sendToDiscord(webhookPayload) {
  if (!CONFIG.webhookUrl) {
    console.log('No webhook URL provided, skipping Discord notification');
    return false;
  }
  
  try {
    const response = await axios.post(CONFIG.webhookUrl, webhookPayload);
    console.log(`Sent to Discord, response: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Error sending to Discord:', error.message);
    return false;
  }
}

// Check if asset is in cache
function isAssetInCache(assetId) {
  return !!cache.assets[assetId];
}

// Add asset to cache
function addAssetToCache(asset) {
  cache.assets[asset.id] = {
    name: asset.name,
    type: asset.assetType,
    foundAt: Date.now()
  };
  saveCache();
}

// Run an urgent scan
async function runUrgentScan() {
  console.log('\n=== RUNNING URGENT PS99 PET SCAN ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  const discoveries = [];
  
  // Check developers first
  for (const target of CONFIG.developers) {
    if (target.type === 'group') {
      console.log(`Scanning group: ${target.name} (${target.id})`);
      
      const groupAssets = await getGroupAssets(target.id);
      
      for (const asset of groupAssets) {
        if (isAssetInCache(asset.id)) continue;
        
        // Process group asset
        const assetDetails = await getAssetDetails(asset.id);
        
        if (!assetDetails) continue;
        
        const isPet = isPetAsset({
          name: asset.name,
          description: assetDetails.Description
        });
        
        if (isPet) {
          console.log(`Found potential pet asset: ${asset.name} (${asset.id})`);
          
          // Get thumbnail
          const thumbnail = await getAssetThumbnail(asset.id);
          
          // Create asset object
          const petAsset = {
            id: asset.id,
            name: asset.name,
            description: assetDetails.Description,
            assetType: asset.type,
            creator: target.name,
            imageUrl: thumbnail || asset.thumbnailUrl
          };
          
          discoveries.push(petAsset);
          addAssetToCache(petAsset);
        }
      }
    } else {
      console.log(`Scanning developer: ${target.username} (${target.id})`);
      
      const devAssets = await getDeveloperAssets(target.id);
      
      for (const asset of devAssets) {
        const assetId = asset.assetId;
        
        if (isAssetInCache(assetId)) continue;
        
        // Get full asset details
        const assetDetails = await getAssetDetails(assetId);
        
        if (!assetDetails) continue;
        
        const isPet = isPetAsset({
          name: asset.name || assetDetails.Name,
          description: assetDetails.Description
        });
        
        if (isPet) {
          console.log(`Found potential pet asset: ${asset.name || assetDetails.Name} (${assetId})`);
          
          // Get thumbnail
          const thumbnail = await getAssetThumbnail(assetId);
          
          // Create asset object
          const petAsset = {
            id: assetId,
            name: asset.name || assetDetails.Name,
            description: assetDetails.Description,
            assetType: asset.assetType,
            creator: target.username,
            imageUrl: thumbnail
          };
          
          discoveries.push(petAsset);
          addAssetToCache(petAsset);
        }
      }
    }
    
    // Short delay between targets
    await delay(3000);
  }
  
  // Send discoveries to Discord
  console.log(`Found ${discoveries.length} potential new pets!`);
  
  for (const asset of discoveries) {
    const webhookPayload = formatAssetForDiscord(asset);
    await sendToDiscord(webhookPayload);
    
    // Short delay between notifications
    await delay(1000);
  }
  
  // Update last scan time
  cache.lastScan = Date.now();
  saveCache();
  
  return discoveries;
}

// Start continuous scanning
async function startUrgentScanning() {
  console.log('Starting URGENT PS99 pet scanning');
  console.log('Scanning every 20 seconds for imminent update');
  
  // Run initial scan
  await runUrgentScan();
  
  // Set interval
  const intervalId = setInterval(async () => {
    try {
      await runUrgentScan();
    } catch (error) {
      console.error('Error in scan:', error);
    }
  }, CONFIG.scanInterval);
  
  // Auto-stop after 2 hours
  setTimeout(() => {
    console.log('\nAuto-stopping urgent scanner after 2 hours');
    clearInterval(intervalId);
  }, 2 * 60 * 60 * 1000);
  
  console.log('Urgent scanner running!');
}

// Send alert that we're monitoring for imminent update
async function sendUpdateAlert() {
  if (!CONFIG.webhookUrl) {
    console.log('No webhook URL provided, skipping alert');
    return;
  }
  
  const alertPayload = {
    username: "PS99 UPDATE ALERT",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: "🚨 PS99 UPDATE IMMINENT 🚨",
      description: "Scanner activated for imminent PS99 update. Monitoring for new pets with aggressive polling.",
      color: 0xFF0000, // Red
      fields: [
        {
          name: "Status",
          value: "Actively Scanning",
          inline: true
        },
        {
          name: "Scan Interval",
          value: "Every 20 seconds",
          inline: true
        },
        {
          name: "Priority Targets",
          value: CONFIG.developers.map(d => d.type === 'group' ? d.name : d.username).join(', '),
          inline: false
        }
      ],
      footer: {
        text: "PS99 IMMINENT UPDATE SCANNER"
      },
      timestamp: new Date().toISOString()
    }]
  };
  
  try {
    const response = await axios.post(CONFIG.webhookUrl, alertPayload);
    console.log(`Alert sent to Discord, response: ${response.status}`);
  } catch (error) {
    console.error('Error sending alert:', error.message);
  }
}

// Start the scanner
sendUpdateAlert().then(() => {
  startUrgentScanning();
});