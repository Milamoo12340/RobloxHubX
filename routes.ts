import { Router } from 'express';
import { DiscordBot } from './bot';
import { IStorage } from './storage';
import { parseCommand } from './bot/simplified-commands';
import { nanoid } from 'nanoid';

export function apiRouter(storage: IStorage, bot: DiscordBot) {
  const router = Router();

  // API health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Get Discord connection status
  router.get('/discord/status', (req, res) => {
    res.json({
      connected: bot.isConnected(),
      clientId: bot.getClientId()
    });
  });

  // Get Discord help info
  router.get('/discord/help', (req, res) => {
    res.json(bot.getHelpMessage());
  });

  // Process bot command
  router.post('/discord/command', async (req, res) => {
    try {
      const { commandText, username = 'demo_user' } = req.body;
      
      if (!commandText) {
        return res.status(400).json({ error: 'Command text is required' });
      }

      // Parse the command but just pass the original command text to the bot
      parseCommand(commandText); // Validate the command format
      const result = await bot.handleCommand(commandText, 1); // Use ID 1 for demo user
      
      res.json({ success: true, result });
    } catch (error: any) {
      console.error("Error processing command:", error);
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  });

  // Upload a file to the bot
  router.post('/discord/upload', async (req, res) => {
    try {
      const { fileName, fileData, fileType, username = 'demo_user' } = req.body;
      
      if (!fileName || !fileData) {
        return res.status(400).json({ error: 'File name and data are required' });
      }

      // Get user
      let user = await storage.getUserByUsername(username);
      
      // Create user if doesn't exist
      if (!user) {
        user = await storage.createUser({
          username,
          password: `demo_${nanoid(8)}` // Generate random password for demo users
        });
      }

      const fileSize = Buffer.from(fileData, 'base64').length;
      
      const file = await bot.handleFileUpload(
        fileName,
        fileSize,
        fileType || 'other',
        fileData,
        user.id
      );
      
      res.json({ success: true, file });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  });

  // Get all leaks
  router.get('/leaks', async (req, res) => {
    try {
      const leaks = await storage.getAllLeaks();
      res.json(leaks);
    } catch (error: any) {
      console.error("Error getting leaks:", error);
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  });

  // Get all tags
  router.get('/tags', async (req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json(tags);
    } catch (error: any) {
      console.error("Error getting tags:", error);
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  });

  // Get a specific leak
  router.get('/leaks/:id', async (req, res) => {
    try {
      const leak = await storage.getLeakById(req.params.id);
      
      if (!leak) {
        return res.status(404).json({ error: 'Leak not found' });
      }
      
      res.json(leak);
    } catch (error: any) {
      console.error("Error getting leak:", error);
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  });

  // Get a specific file
  router.get('/files/:assetId', async (req, res) => {
    try {
      const file = await storage.getFileByAssetId(req.params.assetId);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.json(file);
    } catch (error: any) {
      console.error("Error getting file:", error);
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  });

  // Search leaks
  router.get('/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const category = req.query.category as string || undefined;
      
      const results = await storage.searchLeaks(query, category);
      res.json(results);
    } catch (error: any) {
      console.error("Error searching leaks:", error);
      res.status(500).json({ error: error.message || 'Unknown error' });
    }
  });

  return router;
}