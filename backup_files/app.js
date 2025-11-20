import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();
app.use(express.json({ limit: '50mb' }));

// In-memory storage for demonstration
const storage = {
  files: [],
  leaks: [],
  developers: [
    { id: 13365322, username: "Prestonfaas", name: "Preston", role: "CEO" },
    { id: 1210210, username: "BigGamesInc", name: "Big Games", role: "Studio" },
    { id: 2878290231, username: "BigGamesRoblox", name: "Big Games Roblox", role: "Official" },
    { id: 1784060946, username: "BuildIntoGames", name: "BIG Games", role: "Developer" }
  ],
  tags: [
    { id: 1, name: "Pet", color: "blue" },
    { id: 2, name: "Model", color: "green" },
    { id: 3, name: "Script", color: "red" },
    { id: 4, name: "Audio", color: "purple" },
    { id: 5, name: "Verified", color: "gold" }
  ],
  settings: {
    lastAutoDiscoveryTime: new Date().toISOString()
  },
  
  // Helper methods
  createLeak(leak) {
    const id = this.leaks.length + 1;
    const newLeak = { 
      ...leak, 
      id, 
      leakDate: new Date().toISOString(),
      description: leak.description || null,
      gameName: leak.gameName || null,
      channelId: leak.channelId || null
    };
    this.leaks.push(newLeak);
    return newLeak;
  },
  
  createFile(file) {
    const id = this.files.length + 1;
    const assetId = file.assetId || `asset_${Math.random().toString(36).substring(2, 7)}`;
    const newFile = {
      ...file,
      id,
      assetId,
      uploadDate: new Date().toISOString()
    };
    this.files.push(newFile);
    return newFile;
  },
  
  // Storage methods
  getAllLeaks() {
    return this.leaks;
  },
  
  getAllFiles() {
    return this.files;
  },
  
  getAllTags() {
    return this.tags;
  },
  
  getAllDevelopers() {
    return this.developers;
  },
  
  getSettings() {
    return this.settings;
  },
  
  searchLeaks(query, category) {
    let results = this.leaks;
    
    // Filter by category if provided
    if (category) {
      results = results.filter(leak => leak.category === category);
    }
    
    // Search by query in title, description, tags
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(leak => {
        return (
          leak.title.toLowerCase().includes(lowerQuery) ||
          (leak.description && leak.description.toLowerCase().includes(lowerQuery)) ||
          leak.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
      });
    }
    
    return results;
  }
};

// Discord Bot simulation
const discordBot = {
  isConnected() {
    return process.env.DISCORD_BOT_TOKEN ? true : false;
  },
  
  getClientId() {
    return '1352881326461812736';
  },
  
  getChannels() {
    return {
      leakChannel: '1352979345257529404',
      generalChannel: '1285623731053527126'
    };
  },
  
  getHelpMessage() {
    return {
      title: "Pet Simulator 99 Leak Bot Commands",
      commands: [
        { name: "/upload", description: "Upload Pet Simulator 99 game files" },
        { name: "/leak", description: "Share leaked content in the channel" },
        { name: "/search", description: "Find specific Pet Simulator 99 leaks" },
        { name: "/categorize", description: "Categorize uploaded content" },
        { name: "/verify", description: "Verify if content is from Pet Simulator 99 developers" },
        { name: "/monitor", description: "Start monitoring for new Pet Simulator 99 leaks" },
        { name: "/help", description: "Display this help message" }
      ]
    };
  },
  
  handleCommand(command) {
    // Simple command handler for demonstration
    switch (command.type) {
      case 'upload':
        return { message: `Please upload a ${command.options.mode} file.` };
      case 'search':
        return { results: storage.searchLeaks(command.options.query, command.options.category) };
      case 'help':
        return this.getHelpMessage();
      default:
        return { message: `Command ${command.type} not implemented in demo mode` };
    }
  }
};

// Auto-discovery simulation
const autoDiscover = {
  runDiscovery() {
    const timestamp = new Date().toISOString();
    storage.settings.lastAutoDiscoveryTime = timestamp;
    
    // Simulate discovering content
    const mockAsset = {
      assetId: `roblox_${Math.random().toString(36).substring(2, 7)}`,
      name: `Pet Simulator 99 Asset ${Math.floor(Math.random() * 1000)}`,
      description: "Auto-discovered asset",
      assetType: "Model"
    };
    
    // Create a file for the discovered asset
    const file = storage.createFile({
      filename: mockAsset.name,
      fileType: "roblox_asset",
      fileSize: 0,
      uploaderId: 1, // System user
      fileData: JSON.stringify(mockAsset),
      assetId: mockAsset.assetId
    });
    
    // Create a leak for the discovered asset
    const leak = storage.createLeak({
      fileId: file.id,
      title: mockAsset.name,
      description: mockAsset.description,
      leakType: "automatic",
      category: "auto-discovered",
      gameName: "Pet Simulator 99",
      leakedBy: 1, // System user
      tags: ["Auto-Discovered", "Roblox Asset", mockAsset.assetType]
    });
    
    return {
      timestamp,
      results: [
        {
          developer: "Preston",
          developerID: 13365322,
          itemsFound: 1,
          items: [{
            file,
            leak,
            verification: {
              isVerified: true,
              confidence: 80,
              matchType: "name"
            }
          }]
        }
      ]
    };
  }
};

// Basic routes for testing
app.get('/', (req, res) => {
  res.send('Pet Simulator 99 Bot is running');
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Bot status endpoint
app.get('/api/bot/status', (req, res) => {
  const hasToken = process.env.DISCORD_BOT_TOKEN ? true : false;
  res.json({
    status: 'ready',
    name: 'Pet Simulator 99 Leak Bot',
    connected: hasToken,
    clientId: discordBot.getClientId(),
    channels: discordBot.getChannels()
  });
});

// API to get all leaks
app.get('/api/leaks', (req, res) => {
  res.json({ leaks: storage.getAllLeaks() });
});

// API to search leaks
app.get('/api/leaks/search', (req, res) => {
  const { query, category } = req.query;
  res.json({ 
    leaks: storage.searchLeaks(
      typeof query === 'string' ? query : '', 
      typeof category === 'string' ? category : undefined
    )
  });
});

// API to get all tags
app.get('/api/tags', (req, res) => {
  res.json({ tags: storage.getAllTags() });
});

// API to get all developers
app.get('/api/developers', (req, res) => {
  res.json({ developers: storage.getAllDevelopers() });
});

// API to trigger discovery
app.post('/api/discovery/run', (req, res) => {
  const result = autoDiscover.runDiscovery();
  res.json({ 
    success: true, 
    message: 'Discovery process triggered',
    result
  });
});

// API to get bot commands
app.get('/api/bot/commands', (req, res) => {
  res.json(discordBot.getHelpMessage());
});

// Bot Command endpoint
app.post('/api/bot/command', (req, res) => {
  try {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ 
        success: false, 
        error: "Command parameter is required" 
      });
    }
    
    // Parse the command
    const parts = command.startsWith('/') ? command.slice(1).split(' ') : command.split(' ');
    const commandType = parts[0].toLowerCase();
    const argsString = parts.slice(1).join(' ');
    
    // Simple parsing for demo
    let options = {};
    
    // Parse options based on command type
    switch (commandType) {
      case 'upload':
        const modeMatch = argsString.match(/mode:\s*(\w+)/i);
        options = { mode: modeMatch ? modeMatch[1] : 'asset' };
        break;
      
      case 'search':
        const queryMatch = argsString.match(/query:\s*([^\s]+)/i);
        const categoryMatch = argsString.match(/category:\s*(\w+)/i);
        options = {
          query: queryMatch ? queryMatch[1] : '',
          category: categoryMatch ? categoryMatch[1] : undefined
        };
        break;
    }
    
    const result = discordBot.handleCommand({ type: commandType, options });
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message || "Error processing command" 
    });
  }
});

// File upload endpoint
app.post('/api/bot/upload', (req, res) => {
  try {
    const { fileName, fileSize, fileType, fileData } = req.body;
    
    if (!fileName || !fileData) {
      return res.status(400).json({ 
        success: false, 
        error: "fileName and fileData are required" 
      });
    }
    
    // Create file entry
    const file = storage.createFile({
      filename: fileName,
      fileType: fileType || 'other',
      fileSize: fileSize || 0,
      uploaderId: 1, // Default user
      fileData
    });
    
    res.json({ success: true, file });
  } catch (error) {
    res.status(400).json({ 
      success: false, 
      error: error.message || "Error uploading file" 
    });
  }
});

// Static file serving for frontend (if available)
try {
  const clientPath = join(__dirname, 'client');
  if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    
    // Fallback route to serve index.html for client-side routing
    app.get('*', (req, res) => {
      // Skip API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }
      
      const indexPath = join(clientPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.send('Pet Simulator 99 Bot - Frontend not built yet');
      }
    });
  }
} catch (error) {
  console.error('Error setting up static file serving:', error);
}

// Determine port
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}/api/health`);
});