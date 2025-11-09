/**
 * PS99 Developer Activity Tracker
 * 
 * This script specifically monitors PS99 developers' current game sessions,
 * including which games they're playing and if they're in private testing places.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Key PS99 developers to monitor
  developers: [
    { id: 13365322, username: "chickenputty", displayName: "Adam" },
    { id: 7707349, username: "JamienChee", displayName: "Jamien" },
    { id: 1210210, username: "ForeverDev", displayName: "David" },
    { id: 2213470865, username: "CoderConner", displayName: "Conner" }
  ],
  
  // PS99 game IDs for reference
  ps99GameId: 8737899170,
  ps99UniverseId: 3317771874,
  
  // API endpoints
  apiEndpoints: {
    presence: "https://presence.roblox.com/v1/presence/users",
    userInfo: "https://users.roblox.com/v1/users",
    gameInfo: "https://games.roblox.com/v1/games/multiget-place-details",
    gameIcon: "https://thumbnails.roblox.com/v1/places/gameicons"
  },
  
  // Monitoring interval in minutes
  intervalMinutes: 2,
  
  // Webhook URL for Discord notifications
  webhookUrl: process.env.DISCORD_WEBHOOK_URL,
  
  // Cache settings
  cacheFile: './ps99_dev_activity_cache.json'
};

// Initialize cache
let cache = {
  lastScan: 0,
  developers: {}
};

// Load cache if exists
if (fs.existsSync(CONFIG.cacheFile)) {
  try {
    cache = JSON.parse(fs.readFileSync(CONFIG.cacheFile, 'utf8'));
    console.log(`Loaded cache with ${Object.keys(cache.developers).length} developers`);
  } catch (error) {
    console.error('Error loading cache:', error.message);
  }
} else {
  console.log('No cache found, creating new cache');
  
  // Initialize developer cache entries
  for (const dev of CONFIG.developers) {
    cache.developers[dev.id] = {
      username: dev.username,
      displayName: dev.displayName,
      lastActivity: null,
      currentGameId: null,
      currentGameName: null,
      history: []
    };
  }
}

// Save cache
function saveCache() {
  try {
    fs.writeFileSync(CONFIG.cacheFile, JSON.stringify(cache, null, 2));
    console.log(`Saved cache with ${Object.keys(cache.developers).length} developers`);
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

// Make API request with error handling
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
      console.log(`Rate limited on ${url}. Waiting before retry...`);
      await delay(30000); // Wait 30 seconds
      return makeApiRequest(url, options);
    }
    
    console.log(`Request failed with status ${response.status}: ${url}`);
    return null;
  } catch (error) {
    console.error(`Error making request to ${url}:`, error.message);
    return null;
  }
}

// Get the presence (current activity) of multiple developers
async function getDeveloperPresence(developerIds) {
  if (developerIds.length === 0) return [];
  
  try {
    const presenceData = await makeApiRequest(CONFIG.apiEndpoints.presence, {
      method: 'POST',
      contentType: 'application/json',
      data: {
        userIds: developerIds
      }
    });
    
    if (!presenceData || !presenceData.userPresences) {
      console.log('Failed to get developer presence data');
      return [];
    }
    
    // Get more detailed information about each presence
    for (const presence of presenceData.userPresences) {
      if ((presence.userPresenceType === 2 || presence.userPresenceType === 3) && presence.placeId) {
        try {
          // Try to get the private server ID if they're in one
          if (presence.gameInstanceId) {
            console.log(`Developer is in a private server: ${presence.gameInstanceId}`);
            presence.isPrivateServer = true;
            presence.privateServerId = presence.gameInstanceId;
          }
          
          // Additional checks for Studio sessions
          if (presence.userPresenceType === 3) {
            // Could potentially get more info about the Studio session
            presence.isStudio = true;
            presence.lastLocation = "Roblox Studio";
          }
        } catch (error) {
          console.error('Error getting extended presence info:', error.message);
        }
      }
    }
    
    return presenceData.userPresences;
  } catch (error) {
    console.error('Error getting developer presence:', error.message);
    return [];
  }
}

// Get game details
async function getGameDetails(placeId) {
  if (!placeId) return null;
  
  try {
    const gameData = await makeApiRequest(`${CONFIG.apiEndpoints.gameInfo}?placeIds=${placeId}`);
    
    if (!gameData || gameData.length === 0) {
      console.log(`Failed to get game details for place ID: ${placeId}`);
      return null;
    }
    
    return gameData[0];
  } catch (error) {
    console.error(`Error getting game details for place ID ${placeId}:`, error.message);
    return null;
  }
}

// Get game icon
async function getGameIcon(placeId) {
  if (!placeId) return null;
  
  try {
    const iconData = await makeApiRequest(`${CONFIG.apiEndpoints.gameIcon}?placeIds=${placeId}&size=256x256&format=Png`);
    
    if (!iconData || !iconData.data || iconData.data.length === 0) {
      console.log(`Failed to get game icon for place ID: ${placeId}`);
      return null;
    }
    
    return iconData.data[0].imageUrl;
  } catch (error) {
    console.error(`Error getting game icon for place ID ${placeId}:`, error.message);
    return null;
  }
}

// Check if a place is likely a PS99 testing place
function isLikelyPS99TestingPlace(placeName, creatorName) {
  if (!placeName || !creatorName) return false;
  
  // Check game name
  const nameKeywords = [
    'pet sim', 'simulator 99', 'ps99', 'test', 
    'dev', 'private', 'staging', 'alpha', 'beta'
  ];
  
  const hasNameKeyword = nameKeywords.some(keyword => 
    placeName.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Check creator
  const isPS99Developer = CONFIG.developers.some(dev => 
    creatorName.toLowerCase().includes(dev.username.toLowerCase()) ||
    creatorName.toLowerCase().includes(dev.displayName.toLowerCase())
  );
  
  return hasNameKeyword || isPS99Developer;
}

// Format activity for Discord webhook
function formatActivityForDiscord(developer, activity) {
  const gameType = activity.isPS99TestingPlace ? 
    `🔒 PRIVATE PS99 TEST PLACE` : 
    activity.isPS99 ? 
      `🎮 PS99 PUBLIC GAME` : 
      `🕹️ OTHER GAME`;
  
  return {
    username: "PS99 Developer Tracker",
    avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
    embeds: [{
      title: `${gameType}: ${developer.displayName} (${developer.username})`,
      url: `https://www.roblox.com/users/${developer.id}/profile`,
      color: activity.isPS99TestingPlace ? 0xE74C3C : activity.isPS99 ? 0xF1C40F : 0x3498DB,
      description: `Developer ${developer.displayName} is currently in ${activity.gameName}`,
      fields: [
        {
          name: "Game ID",
          value: activity.gameId.toString(),
          inline: true
        },
        {
          name: "Current Status",
          value: activity.status || "Unknown",
          inline: true
        },
        {
          name: "Device",
          value: activity.device || "Unknown",
          inline: true
        },
        {
          name: "Found At",
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      thumbnail: {
        url: activity.gameIcon || "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png"
      },
      footer: {
        text: "PS99 Developer Tracker"
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// Send notification to Discord webhook
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

// Check developer activity
async function checkDeveloperActivity() {
  console.log('\n=== Checking PS99 Developer Activity ===');
  console.log(`Time: ${new Date().toLocaleString()}`);
  
  // Get all developer IDs
  const developerIds = CONFIG.developers.map(dev => dev.id);
  
  // Get presence data for all developers
  const presenceData = await getDeveloperPresence(developerIds);
  
  if (!presenceData || presenceData.length === 0) {
    console.log('No presence data available');
    return;
  }
  
  // Process each developer
  for (const presence of presenceData) {
    const developerId = presence.userId;
    
    // Find developer info
    const developerInfo = CONFIG.developers.find(dev => dev.id === developerId);
    if (!developerInfo) continue;
    
    console.log(`\nChecking ${developerInfo.username} (${developerInfo.displayName})`);
    console.log(`Status: ${presence.userPresenceType}`);
    
    // Get status string
    let status = "Offline";
    switch (presence.userPresenceType) {
      case 0: status = "Offline"; break;
      case 1: status = "Online"; break;
      case 2: status = "In-Game"; break;
      case 3: status = "Studio"; break;
      default: status = "Unknown";
    }
    
    // Check if they're in a game
    if (presence.userPresenceType === 2 || presence.userPresenceType === 3) {
      const placeId = presence.placeId;
      console.log(`Currently in place ID: ${placeId}`);
      
      // Get game details
      const gameDetails = await getGameDetails(placeId);
      let gameName = "Unknown Game";
      let gameIcon = null;
      
      if (gameDetails) {
        gameName = gameDetails.name || "Unknown Game";
        console.log(`Game name: ${gameName}`);
        
        // Get game icon
        gameIcon = await getGameIcon(placeId);
      }
      
      // Check if it's PS99 or a likely testing place
      const isPS99 = placeId === CONFIG.ps99GameId;
      const isPS99TestingPlace = isLikelyPS99TestingPlace(gameName, gameDetails?.builder || "");
      
      // Create activity record
      const activity = {
        status,
        gameId: placeId,
        gameName,
        gameIcon,
        isPS99,
        isPS99TestingPlace,
        device: presence.deviceType || "Unknown",
        timestamp: new Date().toISOString()
      };
      
      // Get cached activity
      const cachedDeveloper = cache.developers[developerId];
      
      // Check if activity changed
      const activityChanged = 
        !cachedDeveloper.currentGameId || 
        cachedDeveloper.currentGameId !== placeId;
      
      if (activityChanged) {
        console.log(`Activity changed for ${developerInfo.username}!`);
        
        // If they're in a PS99 testing place, this is interesting!
        if (isPS99TestingPlace) {
          console.log(`${developerInfo.username} is in a PS99 testing place: ${gameName}`);
          
          // Send to Discord
          const webhookPayload = formatActivityForDiscord(
            { id: developerId, ...developerInfo }, 
            activity
          );
          await sendToDiscord(webhookPayload);
        } else if (isPS99) {
          console.log(`${developerInfo.username} is playing PS99`);
          
          // Send to Discord (but could be made optional)
          const webhookPayload = formatActivityForDiscord(
            { id: developerId, ...developerInfo }, 
            activity
          );
          await sendToDiscord(webhookPayload);
        }
        
        // Update cache
        cachedDeveloper.lastActivity = activity.timestamp;
        cachedDeveloper.currentGameId = placeId;
        cachedDeveloper.currentGameName = gameName;
        
        // Add to history (keep last 10 entries)
        cachedDeveloper.history.unshift(activity);
        if (cachedDeveloper.history.length > 10) {
          cachedDeveloper.history = cachedDeveloper.history.slice(0, 10);
        }
      }
    } else {
      // Developer is offline or online but not in a game
      console.log(`${developerInfo.username} is ${status.toLowerCase()}`);
      
      // Check if this is a change from being in a game
      const cachedDeveloper = cache.developers[developerId];
      if (cachedDeveloper.currentGameId !== null) {
        console.log(`${developerInfo.username} was in ${cachedDeveloper.currentGameName} but is now ${status.toLowerCase()}`);
        
        // Update cache
        cachedDeveloper.lastActivity = new Date().toISOString();
        cachedDeveloper.currentGameId = null;
        cachedDeveloper.currentGameName = null;
      }
    }
    
    // Add delay between developers
    await delay(2000);
  }
  
  // Save updated cache
  saveCache();
}

// Run a one-time check of current developer activity
async function runDeveloperCheck() {
  await checkDeveloperActivity();
  console.log('\nDeveloper activity check complete!');
}

// Start continuous monitoring
async function startMonitoring() {
  console.log(`Starting PS99 developer activity monitoring at ${CONFIG.intervalMinutes}-minute intervals`);
  
  // Run initial check
  await checkDeveloperActivity();
  
  // Set up interval
  setInterval(async () => {
    try {
      await checkDeveloperActivity();
    } catch (error) {
      console.error('Error in developer activity check:', error);
    }
  }, CONFIG.intervalMinutes * 60 * 1000);
  
  console.log(`Monitoring started! Checking every ${CONFIG.intervalMinutes} minutes.`);
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
      username: "PS99 Developer Tracker",
      avatar_url: "https://tr.rbxcdn.com/e0ae48b60b4efbfea00ccc4ccde11aef/150/150/Image/Png",
      embeds: [{
        title: "PS99 Developer Tracker Started",
        description: "Monitoring PS99 developers for game activity and private testing places",
        color: 0x2ECC71, // Green
        fields: [
          {
            name: "Monitoring Interval",
            value: `${CONFIG.intervalMinutes} minutes`,
            inline: true
          },
          {
            name: "Developers Tracked",
            value: CONFIG.developers.length.toString(),
            inline: true
          }
        ],
        footer: {
          text: "PS99 Developer Tracker"
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

// Start the tracker if run directly
if (require.main === module) {
  // Send test notification
  sendTestNotification().then(() => {
    // Run immediate developer check
    runDeveloperCheck();
    
    // Start continuous monitoring
    // startMonitoring();
  });
}

module.exports = {
  checkDeveloperActivity,
  runDeveloperCheck,
  startMonitoring,
  getDeveloperPresence,
  sendTestNotification
};