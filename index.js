import express from 'express';

// Create a simple Express app
const app = express();

// JSON parser middleware
app.use(express.json());

// Basic route for testing
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

// Get Discord Bot token status (for demonstration)
app.get('/api/bot/status', (req, res) => {
  const hasToken = process.env.DISCORD_BOT_TOKEN ? true : false;
  res.json({
    status: 'ready',
    name: 'Pet Simulator 99 Bot',
    hasToken
  });
});

// Determine port (use PORT env var or default to 3000)
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`API available at http://localhost:${port}/api/health`);
});