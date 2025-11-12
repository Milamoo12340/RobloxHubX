import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// Parse JSON bodies
app.use(express.json());

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
  
  // Storage methods
  getAllLeaks() {
    return this.leaks;
  },
  
  getAllTags() {
    return this.tags;
  },
  
  getAllDevelopers() {
    return this.developers;
  },
  
  getSettings() {
    return this.settings;
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
    hasToken,
    clientId: '1352881326461812736',
    channels: {
      leakChannel: '1352979345257529404',
      generalChannel: '1285623731053527126'
    }
  });
});

// API to get all leaks
app.get('/api/leaks', (req, res) => {
  res.json({ leaks: storage.getAllLeaks() });
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
  // Simulate discovery process
  const timestamp = new Date().toISOString();
  storage.settings.lastAutoDiscoveryTime = timestamp;
  
  res.json({ 
    success: true, 
    message: 'Discovery process triggered',
    timestamp,
    developers: storage.developers.length
  });
});

// API to get bot commands
app.get('/api/bot/commands', (req, res) => {
  res.json({
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
  });
});

// Static file serving for frontend
app.use(express.static(join(__dirname, 'client')));

// Fallback route to serve index.html for client-side routing
app.get('*', (req, res) => {
  // Check if client/index.html exists
  const indexPath = join(__dirname, 'client', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Pet Simulator 99 Bot - Frontend not built yet');
  }
});

// Determine port
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}/api/health`);
});