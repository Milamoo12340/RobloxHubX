const express = require('express');
const WebSocket = require('ws');
const db = require('./db');
const { ACCESSIBLE_ENDPOINTS, PROTECTED_ENDPOINTS, formatUrl } = require('./roblox-api-endpoints');
const { RobloxAPIService } = require('./roblox-api');
const { AutoDiscoveryService } = require('./auto-discover');
const leakedAssetsData = require('./shared/leaked-assets-data');
const robloxDevelopers = require('./shared/roblox-developers');

// Create Express app
const app = express();
app.use(express.json({ limit: '50mb' }));

// Initialize services
const robloxApi = new RobloxAPIService();
const autoDiscovery = new AutoDiscoveryService();

// Initialize database schema
(async function() {
  try {
    await db.initializeDatabase();
    console.log('Database schema initialization complete');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
  }
})();

// Default route
app.get('/', (req, res) => {
  res.send('Pet Simulator 99 Bot is running');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Get Discord Bot token status
app.get('/api/bot/status', (req, res) => {
  const hasToken = process.env.DISCORD_BOT_TOKEN ? true : false;
  res.json({
    status: 'ready',
    name: 'Pet Simulator 99 Bot',
    hasToken
  });
});

// Database connection check
app.get('/api/db/status', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.json({
      status: 'not_configured',
      message: 'Database URL not provided',
      usingMemory: true
    });
  }
  
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    const result = await client.query('SELECT NOW() as time');
    await client.end();
    
    res.json({
      status: 'connected',
      time: result.rows[0].time,
      usingMemory: false
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database',
      error: error.message
    });
  }
});

// API routes for leaks
app.get('/api/leaks', async (req, res) => {
  try {
    let leaks = [];
    
    // Get from database if available
    if (db.pool) {
      const result = await db.query(`
        SELECT l.*, f.asset_id, f.filename 
        FROM leaks l
        JOIN files f ON l.file_id = f.id
        ORDER BY l.leak_date DESC
        LIMIT 100
      `);
      leaks = result.rows;
    } else {
      // Otherwise use sample data
      leaks = leakedAssetsData.getAllAssets().map(asset => ({
        id: asset.id,
        file_id: asset.id,
        title: asset.name,
        description: asset.description,
        leak_type: asset.type,
        category: asset.type,
        game_name: asset.gameName,
        leaked_by: 1,
        tags: asset.tags,
        channel_id: null,
        leak_date: asset.leakDate,
        asset_id: asset.assetId,
        filename: asset.name
      }));
    }
    
    res.json({
      status: 'success',
      message: 'Leaks retrieved successfully',
      count: leaks.length,
      leaks
    });
  } catch (error) {
    console.error('Error fetching leaks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching leaks',
      error: error.message
    });
  }
});

// API route for single leak
app.get('/api/leaks/:id', async (req, res) => {
  try {
    const leakId = req.params.id;
    let leak = null;
    
    // Get from database if available
    if (db.pool) {
      const result = await db.query(`
        SELECT l.*, f.asset_id, f.filename, f.file_data 
        FROM leaks l
        JOIN files f ON l.file_id = f.id
        WHERE l.id = $1
      `, [leakId]);
      
      if (result.rows.length > 0) {
        leak = result.rows[0];
      }
    } else {
      // Otherwise use sample data
      const asset = leakedAssetsData.getAssetById(parseInt(leakId, 10));
      if (asset) {
        leak = {
          id: asset.id,
          file_id: asset.id,
          title: asset.name,
          description: asset.description,
          leak_type: asset.type,
          category: asset.type,
          game_name: asset.gameName,
          leaked_by: 1,
          tags: asset.tags,
          channel_id: null,
          leak_date: asset.leakDate,
          asset_id: asset.assetId,
          filename: asset.name,
          thumbnailUrl: asset.thumbnailUrl
        };
      }
    }
    
    if (!leak) {
      return res.status(404).json({
        status: 'error',
        message: 'Leak not found'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Leak retrieved successfully',
      leak
    });
  } catch (error) {
    console.error('Error fetching leak:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching leak',
      error: error.message
    });
  }
});

// API routes for files
app.get('/api/files', async (req, res) => {
  try {
    let files = [];
    
    // Get from database if available
    if (db.pool) {
      const result = await db.query(`
        SELECT id, filename, file_type, file_size, uploader_id, asset_id, created_at
        FROM files
        ORDER BY created_at DESC
        LIMIT 100
      `);
      files = result.rows;
    } else {
      // Otherwise use sample data
      files = leakedAssetsData.getAllAssets().map(asset => ({
        id: asset.id,
        filename: asset.name,
        file_type: 'roblox_asset',
        file_size: 0,
        uploader_id: 1,
        asset_id: asset.assetId,
        created_at: asset.leakDate
      }));
    }
    
    res.json({
      status: 'success',
      message: 'Files retrieved successfully',
      count: files.length,
      files
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching files',
      error: error.message
    });
  }
});

// API routes for tags
app.get('/api/tags', async (req, res) => {
  try {
    let tags = [];
    
    // Get from database if available
    if (db.pool) {
      const result = await db.query(`
        SELECT id, name, color, created_at
        FROM tags
        ORDER BY name ASC
      `);
      tags = result.rows;
    } else {
      // Use predefined tags
      tags = [
        { id: 1, name: 'Pet', color: '#4287f5', created_at: new Date().toISOString() },
        { id: 2, name: 'Model', color: '#42f5a7', created_at: new Date().toISOString() },
        { id: 3, name: 'Mesh', color: '#f542e3', created_at: new Date().toISOString() },
        { id: 4, name: 'Script', color: '#f5d442', created_at: new Date().toISOString() },
        { id: 5, name: 'Audio', color: '#f54242', created_at: new Date().toISOString() },
        { id: 6, name: 'Verified', color: '#42f55a', created_at: new Date().toISOString() }
      ];
    }
    
    res.json({
      status: 'success',
      message: 'Tags retrieved successfully',
      count: tags.length,
      tags
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching tags',
      error: error.message
    });
  }
});

// API routes for developers
app.get('/api/developers', (req, res) => {
  const developers = robloxDevelopers.petSimulatorDevelopers.map(dev => ({
    id: dev.id,
    username: dev.username,
    role: dev.role,
    isOfficial: dev.isOfficial,
    description: dev.description
  }));
  
  res.json({
    status: 'success',
    message: 'Developer list retrieved',
    count: developers.length,
    developers
  });
});

// API to get asset types
app.get('/api/asset-types', (req, res) => {
  res.json({
    status: 'success',
    message: 'Asset types retrieved',
    count: robloxDevelopers.assetTypes.length,
    assetTypes: robloxDevelopers.assetTypes
  });
});

// API to get leak types
app.get('/api/leak-types', (req, res) => {
  res.json({
    status: 'success',
    message: 'Leak types retrieved',
    count: robloxDevelopers.leakTypes.length,
    leakTypes: robloxDevelopers.leakTypes
  });
});

// API to trigger discovery
app.post('/api/discovery/run', async (req, res) => {
  try {
    console.log('Auto-discovery process triggered via API');
    const results = await autoDiscovery.runDiscovery();
    
    res.json({ 
      status: 'success', 
      message: 'Discovery process completed',
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('Error running discovery process:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error running discovery process',
      error: error.message
    });
  }
});

// API to check last discovery time
app.get('/api/discovery/status', (req, res) => {
  const lastTimestamp = autoDiscovery.getLastDiscoveryTimestamp();
  
  res.json({
    status: 'success',
    message: 'Discovery status retrieved',
    lastRunTimestamp: lastTimestamp,
    timeSinceLast: new Date().getTime() - new Date(lastTimestamp).getTime()
  });
});

// API to search for Roblox assets
app.get('/api/roblox/search', async (req, res) => {
  try {
    const { query, category = 'Model', limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Query parameter is required'
      });
    }
    
    console.log(`Searching Roblox assets for: ${query} (${category})`);
    const results = await robloxApi.searchToolboxAssets(query, category, { limit: parseInt(limit, 10) });
    
    res.json({
      status: 'success',
      message: 'Search completed',
      query,
      category,
      results
    });
  } catch (error) {
    console.error('Error searching Roblox assets:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error searching Roblox assets',
      error: error.message
    });
  }
});

// API to get Roblox asset details
app.get('/api/roblox/assets/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;
    
    console.log(`Getting details for Roblox asset: ${assetId}`);
    const assetDetails = await robloxApi.getAsset(assetId);
    
    // Get the thumbnail as well
    let thumbnailUrl = null;
    try {
      const thumbnailResponse = await robloxApi.getAssetThumbnails(assetId);
      if (thumbnailResponse?.data && thumbnailResponse.data.length > 0) {
        thumbnailUrl = thumbnailResponse.data[0].imageUrl;
      }
    } catch (thumbnailError) {
      console.error('Error getting asset thumbnail:', thumbnailError);
    }
    
    res.json({
      status: 'success',
      message: 'Asset details retrieved',
      assetId,
      thumbnailUrl,
      details: assetDetails
    });
  } catch (error) {
    console.error(`Error getting Roblox asset details for ${req.params.assetId}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting Roblox asset details',
      error: error.message
    });
  }
});

// Start the server
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}/api/health`);
});

// WebSocket server setup
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to Pet Simulator 99 Bot WebSocket server',
    timestamp: new Date().toISOString()
  }));
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received message:', data);
      
      // Echo back the message
      ws.send(JSON.stringify({
        type: 'echo',
        data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  // Handle disconnection
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Load Discord bot if token is available
if (process.env.DISCORD_BOT_TOKEN) {
  console.log('Discord bot token found, initializing bot...');
  try {
    const { DiscordBot } = require('./discord-bot.js');
    const bot = new DiscordBot();
    
    bot.start()
      .then(success => {
        if (success) {
          console.log('Discord bot initialized and connected');
          
          // Setup WS notification for bot events
          wss.on('connection', (ws) => {
            // Broadcast bot status to all clients
            ws.send(JSON.stringify({
              type: 'bot_status',
              status: 'connected',
              clientId: bot.clientId,
              timestamp: new Date().toISOString()
            }));
          });
          
          // Add bot status route
          app.get('/api/bot/details', (req, res) => {
            res.json({
              status: 'connected',
              clientId: bot.clientId,
              channels: {
                leakChannel: bot.leakChannelId,
                generalChannel: bot.generalChannelId
              },
              autoDiscoveryEnabled: bot.autoDiscoveryEnabled
            });
          });
          
          // Add bot command route
          app.post('/api/bot/command', (req, res) => {
            const { command, args = [] } = req.body;
            
            if (!command) {
              return res.status(400).json({
                status: 'error',
                message: 'Command parameter is required'
              });
            }
            
            try {
              if (bot.commands[command]) {
                // We can't directly call the command handlers since they expect Discord Message objects
                // For testing purposes, we'll return success
                res.json({
                  status: 'success',
                  message: `Command ${command} processed`,
                  args
                });
              } else {
                res.status(400).json({
                  status: 'error',
                  message: `Unknown command: ${command}`
                });
              }
            } catch (error) {
              res.status(500).json({
                status: 'error',
                message: `Error processing command: ${error.message}`
              });
            }
          });
          
          // Add discovery trigger route
          app.post('/api/bot/discover', async (req, res) => {
            try {
              console.log('Triggering discovery process...');
              const results = await bot.runDiscovery();
              res.json({
                status: 'success',
                message: 'Discovery process triggered',
                results
              });
            } catch (error) {
              res.status(500).json({
                status: 'error',
                message: `Error triggering discovery: ${error.message}`
              });
            }
          });
        } else {
          console.log('Discord bot failed to connect');
        }
      })
      .catch(error => {
        console.error('Failed to start Discord bot:', error);
      });
  } catch (error) {
    console.error('Failed to initialize Discord bot:', error);
  }
} else {
  console.log('No Discord bot token found. Bot will not be initialized.');
}

// For clean shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server shut down');
    process.exit(0);
  });
});