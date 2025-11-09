/**
 * PS99 Imminent Update Tracker
 * 
 * This specialized scanner focuses on catching the exact moment
 * a PS99 update goes live by monitoring:
 * 1. Game thumbnail changes (indicates update)
 * 2. New game passes (premium features)
 * 3. New developer products (pets for purchase)
 * 4. Active studio sessions (developers deploying)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Game info
  universeId: 3317771874,
  placeId: 8737899170,
  creatorId: 3959677, // BIG Games Pets group ID
  
  // Critical developers to monitor
  developers: [
    { id: 13365322, username: "chickenputty" },  // Adam
    { id: 7707349, username: "JamienChee" },
    { id: 1210210, username: "ForeverDev" },     // David
    { id: 19717956, username: "BuildIntoGames" }, // Preston
    { id: 3983340648, username: "CoderTony" },
    { id: 2213470865, username: "CoderConner" }
  ],
  
  // API endpoints
  endpoints: {
    presence: 'https://presence.roblox.com/v1/presence/users',
    gameInfo: 'https://games.roblox.com/v1/games',
    gamePasses: 'https://games.roblox.com/v1/games/',
    gameIcons: 'https://thumbnails.roblox.com/v1/games/icons',
    developerProducts: 'https://api.roblox.com/developer-products/for-universe',
    groupAudit: 'https://groups.roblox.com/v1/groups/',
    thumbnails: 'https://thumbnails.roblox.com/v1/assets'
  },
  
  // Discord webhook
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  
  // Scanner settings
  scanInterval: 10 * 1000, // 10 seconds
  maxRetries: 3,
  
  // Cache settings
  cacheFile: './ps99_update_monitor.json'
};

// Cache data
let cache = {
  lastScan: 0,
  gameInfo: {},
  thumbnails: {},
  gameIcon: '',
  gamePasses: {},
  devProducts: {},
  devActivity: {}
};

// Load cache if exists
if (fs.existsSync(CONFIG.cacheFile)) {
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
    console.log('Loaded cache successfully');
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

// Make API request with retries
async function makeApiRequest(url, options = {}) {
  let retries = 0;
  const maxRetries = options.maxRetries || CONFIG.maxRetries;
  
  while (retries <= maxRetries) {
    try {
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
      
      if (response.status === 200) {
        return response.data;
      }
      
      console.log(`Request failed with status ${response.status}: ${url}`);
      
      // Handle rate limiting
      if (response.status === 429) {
        retries++;
        const waitTime = Math.min(30000, 1000 * Math.pow(2, retries));
        console.log(`Rate limited, waiting ${waitTime}ms before retry (${retries}/${maxRetries})...`);
        await delay(waitTime);
        continue;
      }
      
      return null;
    } catch (error) {
      retries++;
      
      if (error.response && error.response.status === 429) {
        const waitTime = Math.min(30000, 1000 * Math.pow(2, retries));
        console.log(`Rate limited, waiting ${waitTime}ms before retry (${retries}/${maxRetries})...`);
        await delay(waitTime);
        continue;
      }
      
      console.error(`Error making request to ${url}:`, error.message);
      
      if (retries <= maxRetries) {
        const waitTime = 1000 * retries;
        console.log(`Retrying in ${waitTime}ms (${retries}/${maxRetries})...`);
        await delay(waitTime);
      } else {
        console.log(`Max retries (${maxRetries}) exceeded for ${url}`);
        return null;
      }
    }
  }
  
  return null;
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

// Format discovery for Discord
function formatDiscoveryForDiscord(type, data) {
  let embed = {
    title: `PS99 UPDATE ALERT: ${type}`,
    color: 0xFF0000, // Red alert color
    timestamp: new Date().toISOString(),
    footer: {
      text: "PS99 Imminent Update Tracker"
    }
  };
  
  switch (type) {
    case 'GAME UPDATED':
      embed = {
        ...embed,
        title: '🚨 PS99 GAME UPDATED 🚨',
        description: `Pet Simulator 99 has been updated!`,
        fields: [
          {
            name: 'Game Version',
            value: data.version || 'Unknown',
            inline: true
          },
          {
            name: 'Last Updated',
            value: new Date(data.updated).toLocaleString() || 'Unknown',
            inline: true
          },
          {
            name: 'Active Players',
            value: data.playing?.toString() || '0',
            inline: true
          }
        ],
        thumbnail: {
          url: data.iconUrl || 'https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png'
        }
      };
      break;
      
    case 'GAMEPASS ADDED':
      embed = {
        ...embed,
        title: `💎 NEW GAMEPASS DETECTED: ${data.name}`,
        description: data.description || 'No description available',
        fields: [
          {
            name: 'Gamepass ID',
            value: data.id.toString(),
            inline: true
          },
          {
            name: 'Price',
            value: data.price?.toString() || 'Unknown',
            inline: true
          },
          {
            name: 'Detection Time',
            value: new Date().toLocaleString(),
            inline: true
          }
        ],
        thumbnail: {
          url: data.imageUrl || 'https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png'
        }
      };
      break;
      
    case 'DEVELOPER PRODUCT ADDED':
      embed = {
        ...embed,
        title: `🛒 NEW IN-GAME PURCHASE: ${data.name}`,
        description: data.description || 'No description available',
        fields: [
          {
            name: 'Product ID',
            value: data.id.toString(),
            inline: true
          },
          {
            name: 'Price',
            value: data.price ? `${data.price} Robux` : 'Unknown',
            inline: true
          },
          {
            name: 'Detection Time',
            value: new Date().toLocaleString(),
            inline: true
          }
        ]
      };
      break;
      
    case 'GAME ICON UPDATED':
      embed = {
        ...embed,
        title: '🖼️ PS99 ICON UPDATED',
        description: 'Pet Simulator 99 has a new game icon - update incoming!',
        fields: [
          {
            name: 'Detection Time',
            value: new Date().toLocaleString(),
            inline: true
          }
        ],
        image: {
          url: data.newIcon || 'https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png'
        }
      };
      break;
      
    case 'GAME DEPLOYING':
      embed = {
        ...embed,
        title: '🔄 PS99 UPDATE DEPLOYING',
        description: 'Developers are currently updating the game!',
        fields: [
          {
            name: 'Active Developers',
            value: data.activeDevelopers?.join(', ') || 'Unknown',
            inline: false
          },
          {
            name: 'Last Active',
            value: new Date().toLocaleString(),
            inline: true
          }
        ]
      };
      break;
  }
  
  return {
    username: "PS99 UPDATE ALERT",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [embed]
  };
}

// Check for game updates
async function checkGameInfo() {
  console.log('\n=== Checking for PS99 game info updates ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  const url = `${CONFIG.endpoints.gameInfo}?universeIds=${CONFIG.universeId}`;
  const gameData = await makeApiRequest(url);
  
  if (!gameData || !gameData.data || gameData.data.length === 0) {
    console.log('No game data found, skipping check');
    return false;
  }
  
  const game = gameData.data[0];
  
  // Check if this is first run
  const isFirstRun = !cache.gameInfo.id;
  
  if (isFirstRun) {
    console.log('First run, saving game info to cache');
    cache.gameInfo = game;
    saveCache();
    return false;
  }
  
  // Check for updates
  let updated = false;
  const changes = [];
  
  if (game.updated !== cache.gameInfo.updated) {
    console.log('Game update time changed!');
    console.log(`Old: ${new Date(cache.gameInfo.updated).toLocaleString()}`);
    console.log(`New: ${new Date(game.updated).toLocaleString()}`);
    changes.push('Update Time');
    updated = true;
  }
  
  if (game.playing !== cache.gameInfo.playing) {
    console.log('Player count changed!');
    console.log(`Old: ${cache.gameInfo.playing || 0}`);
    console.log(`New: ${game.playing || 0}`);
    changes.push('Player Count');
  }
  
  if (game.visits !== cache.gameInfo.visits) {
    console.log('Visit count changed!');
    changes.push('Visit Count');
  }
  
  if (updated) {
    // Create discovery payload
    const discovery = formatDiscoveryForDiscord('GAME UPDATED', {
      ...game,
      version: 'New Version' // Roblox API doesn't provide version numbers
    });
    
    // Send to Discord
    await sendToDiscord(discovery);
    
    // Update cache
    cache.gameInfo = game;
    saveCache();
    
    return true;
  }
  
  return false;
}

// Check for game icon updates
async function checkGameIcon() {
  console.log('\n=== Checking for PS99 icon updates ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  const url = `${CONFIG.endpoints.gameIcons}?universeIds=${CONFIG.universeId}&size=256x256&format=Png`;
  const iconData = await makeApiRequest(url);
  
  if (!iconData || !iconData.data || iconData.data.length === 0) {
    console.log('No icon data found, skipping check');
    return false;
  }
  
  const icon = iconData.data[0];
  
  // Check if icon URL has changed
  if (icon.imageUrl !== cache.gameIcon) {
    // Skip on first run
    if (!cache.gameIcon) {
      console.log('First run, saving icon to cache');
      cache.gameIcon = icon.imageUrl;
      saveCache();
      return false;
    }
    
    console.log('Game icon has changed!');
    console.log(`Old: ${cache.gameIcon}`);
    console.log(`New: ${icon.imageUrl}`);
    
    // Create discovery payload
    const discovery = formatDiscoveryForDiscord('GAME ICON UPDATED', {
      newIcon: icon.imageUrl,
      oldIcon: cache.gameIcon
    });
    
    // Send to Discord
    await sendToDiscord(discovery);
    
    // Update cache
    cache.gameIcon = icon.imageUrl;
    saveCache();
    
    return true;
  }
  
  return false;
}

// Check for new game passes
async function checkGamePasses() {
  console.log('\n=== Checking for new PS99 game passes ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  const url = `${CONFIG.endpoints.gamePasses}${CONFIG.placeId}/game-passes?limit=100&sortOrder=Asc`;
  const passesData = await makeApiRequest(url);
  
  if (!passesData || !passesData.data) {
    console.log('No game passes data found, skipping check');
    return false;
  }
  
  let newPasses = [];
  
  // Check for new passes
  for (const pass of passesData.data) {
    if (!cache.gamePasses[pass.id]) {
      console.log(`New game pass found: ${pass.name} (${pass.id})`);
      
      // Get pass thumbnail
      const thumbnailUrl = await getPassThumbnail(pass.id);
      
      // Add to new passes list
      newPasses.push({
        ...pass,
        imageUrl: thumbnailUrl
      });
      
      // Add to cache
      cache.gamePasses[pass.id] = {
        ...pass,
        imageUrl: thumbnailUrl,
        firstSeen: Date.now()
      };
    }
  }
  
  // Save cache if new passes found
  if (newPasses.length > 0) {
    saveCache();
    
    // Send notifications for new passes
    for (const pass of newPasses) {
      const discovery = formatDiscoveryForDiscord('GAMEPASS ADDED', pass);
      await sendToDiscord(discovery);
      
      // Delay between notifications
      await delay(2000);
    }
    
    return true;
  }
  
  return false;
}

// Get pass thumbnail
async function getPassThumbnail(passId) {
  try {
    const url = `https://thumbnails.roblox.com/v1/game-passes?gamePassIds=${passId}&size=512x512&format=Png`;
    const thumbnailData = await makeApiRequest(url);
    
    if (thumbnailData && thumbnailData.data && thumbnailData.data.length > 0) {
      return thumbnailData.data[0].imageUrl;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting thumbnail for pass ${passId}:`, error.message);
    return null;
  }
}

// Check for new developer products
async function checkDeveloperProducts() {
  console.log('\n=== Checking for new PS99 developer products ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  const url = `${CONFIG.endpoints.developerProducts}?universeId=${CONFIG.universeId}&maxRows=100`;
  const productsData = await makeApiRequest(url);
  
  if (!productsData || !productsData.DeveloperProducts) {
    console.log('No developer products data found, skipping check');
    return false;
  }
  
  let newProducts = [];
  
  // Check for new products
  for (const product of productsData.DeveloperProducts) {
    if (!cache.devProducts[product.ProductId]) {
      console.log(`New developer product found: ${product.Name} (${product.ProductId})`);
      
      // Add to new products list
      newProducts.push({
        id: product.ProductId,
        name: product.Name,
        description: product.Description,
        price: product.PriceInRobux,
        firstSeen: Date.now()
      });
      
      // Add to cache
      cache.devProducts[product.ProductId] = {
        name: product.Name,
        description: product.Description,
        price: product.PriceInRobux,
        firstSeen: Date.now()
      };
    }
  }
  
  // Save cache if new products found
  if (newProducts.length > 0) {
    saveCache();
    
    // Send notifications for new products
    for (const product of newProducts) {
      const discovery = formatDiscoveryForDiscord('DEVELOPER PRODUCT ADDED', product);
      await sendToDiscord(discovery);
      
      // Delay between notifications
      await delay(2000);
    }
    
    return true;
  }
  
  return false;
}

// Check for developer activity (Studio mode)
async function checkDeveloperActivity() {
  console.log('\n=== Checking for PS99 developer activity ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  // Build array of developer IDs
  const developerIds = CONFIG.developers.map(dev => dev.id);
  
  // Get presence data
  const presenceData = await makeApiRequest(CONFIG.endpoints.presence, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      userIds: developerIds
    }
  });
  
  if (!presenceData || !presenceData.userPresences) {
    console.log('No presence data found, skipping check');
    return false;
  }
  
  // Track developers in Studio mode
  let activeDevelopers = [];
  
  for (const presence of presenceData.userPresences) {
    const developer = CONFIG.developers.find(dev => dev.id === presence.userId);
    
    if (!developer) continue;
    
    const username = developer.username;
    const isInStudio = presence.userPresenceType === 3; // 3 = Studio
    
    if (isInStudio) {
      console.log(`Developer ${username} is in Studio mode!`);
      activeDevelopers.push(username);
    }
    
    // Update cache
    cache.devActivity[presence.userId] = {
      username,
      lastSeen: Date.now(),
      presenceType: presence.userPresenceType,
      placeId: presence.placeId,
      isInStudio
    };
  }
  
  // Check if this is a new Studio session
  const hasStudioSessionChanged = 
    activeDevelopers.length > 0 && 
    (!cache.lastStudioNotification || 
     Date.now() - cache.lastStudioNotification > 15 * 60 * 1000); // 15 minute cooldown
  
  if (hasStudioSessionChanged) {
    console.log('New studio activity detected!');
    
    // Create discovery payload
    const discovery = formatDiscoveryForDiscord('GAME DEPLOYING', {
      activeDevelopers
    });
    
    // Send to Discord
    await sendToDiscord(discovery);
    
    // Update notification timestamp
    cache.lastStudioNotification = Date.now();
    saveCache();
    
    return true;
  }
  
  return false;
}

// Send startup notification
async function sendStartupNotification() {
  const webhook = {
    username: "PS99 UPDATE ALERT",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: "🚨 PS99 IMMINENT UPDATE TRACKER STARTED 🚨",
      description: "Now monitoring for the imminent Pet Simulator 99 update!",
      color: 0xFF0000, // Red alert color
      fields: [
        {
          name: "Monitoring",
          value: "• Game updates\n• Game icon changes\n• New game passes\n• New developer products\n• Developer activity",
          inline: false
        },
        {
          name: "Scan Interval",
          value: `${CONFIG.scanInterval / 1000} seconds`,
          inline: true
        },
        {
          name: "Started At",
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      footer: {
        text: "PS99 Imminent Update Tracker"
      },
      timestamp: new Date().toISOString()
    }]
  };
  
  await sendToDiscord(webhook);
}

// Run a full scan
async function runFullScan() {
  console.log('\n=== Running full PS99 update scan ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  let updateDetected = false;
  
  // First check developer activity - this signals an imminent update
  const developersActive = await checkDeveloperActivity();
  
  if (developersActive) {
    updateDetected = true;
    console.log('Developer activity detected! Update likely imminent.');
  }
  
  // Then check if the game icon has changed - this is often updated just before release
  const iconChanged = await checkGameIcon();
  
  if (iconChanged) {
    updateDetected = true;
    console.log('Game icon changed! Update likely imminent.');
  }
  
  // Then check for game updates - this confirms the update is live
  const gameUpdated = await checkGameInfo();
  
  if (gameUpdated) {
    updateDetected = true;
    console.log('Game updated! New version is live.');
    
    // When game is updated, immediately check for new gamepasses and products
    await checkGamePasses();
    await checkDeveloperProducts();
  } else {
    // Otherwise check these on regular schedule
    const newPasses = await checkGamePasses();
    
    if (newPasses) {
      updateDetected = true;
      console.log('New game passes found! Update likely includes paid features.');
    }
    
    const newProducts = await checkDeveloperProducts();
    
    if (newProducts) {
      updateDetected = true;
      console.log('New developer products found! Update likely includes in-app purchases.');
    }
  }
  
  // Update last scan time
  cache.lastScan = Date.now();
  saveCache();
  
  return updateDetected;
}

// Start monitoring
async function startMonitoring() {
  // Send startup notification
  await sendStartupNotification();
  
  // Run initial scan
  await runFullScan();
  
  console.log(`\nPS99 Imminent Update Tracker started. Scanning every ${CONFIG.scanInterval / 1000} seconds.`);
  
  // Start interval
  const intervalId = setInterval(async () => {
    try {
      await runFullScan();
    } catch (error) {
      console.error('Error in scan interval:', error);
    }
  }, CONFIG.scanInterval);
  
  // Capture exit signals
  process.on('SIGINT', () => {
    console.log('\nStopping PS99 Update Tracker...');
    clearInterval(intervalId);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nStopping PS99 Update Tracker...');
    clearInterval(intervalId);
    process.exit(0);
  });
}

// Start monitoring
startMonitoring();