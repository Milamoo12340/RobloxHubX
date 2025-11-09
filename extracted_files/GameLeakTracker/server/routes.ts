import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertLeakSchema, insertBotLogSchema, insertBotSettingSchema } from "@shared/schema";
import { WebSocketServer, WebSocket as WS } from "ws";
import fs from "fs";
import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import { createBot, getCommandList, discordBot, BotStatus } from "./bot";
import chokidar from "chokidar";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Maintain a simple cache for bot status
let botStatus: BotStatus = {
  isOnline: false,
  connectionStatus: "Disconnected",
  scanStatus: "Inactive",
  commandsRegistered: 0,
  lastRestartTime: new Date(),
  uptimeSeconds: 0,
  lastScanTime: null,
  nextScanTime: null,
  lastCommandUsed: null,
  latency: null,
};

// For WebSocket clients
const clients = new Set<WS>();

// Initialize bot and chokidar watcher
let watcher: ReturnType<typeof chokidar.watch> | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Serve static files from mock_game_files directory
  app.use('/game-files', express.static(path.join(__dirname, '..', 'mock_game_files')));
  
  // Set up WebSocket server for real-time updates with a specific path to avoid conflicts with Vite
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: "/api/ws"  // Use a specific path for our WebSocket connections
  });
  
  wss.on("connection", (ws: any) => {
    console.log("New WebSocket client connected");
    clients.add(ws as WS);
    
    // Send current status to new client
    try {
      ws.send(JSON.stringify({ 
        type: "status",
        data: botStatus
      }));
    } catch (error) {
      console.error("Error sending initial status to WebSocket client:", error);
    }
    
    ws.on("message", (message: any) => {
      console.log("Received message from client:", message.toString());
      // Handle client messages if needed
    });
    
    ws.on("error", (error: any) => {
      console.error("WebSocket client error:", error);
    });
    
    ws.on("close", (code: number, reason: string) => {
      console.log(`WebSocket client disconnected: ${code} ${reason}`);
      clients.delete(ws as WS);
    });
  });
  
  wss.on("error", (error: any) => {
    console.error("WebSocket server error:", error);
  });
  
  // Initialize Discord bot
  try {
    await createBot();
    // Update bot status periodically
    setInterval(async () => {
      botStatus = await discordBot.getStatus();
      broadcastToClients({ type: "status", data: botStatus });
    }, 5000);
  } catch (error) {
    console.error("Failed to initialize Discord bot:", error);
    await storage.createLog({
      eventType: "error",
      message: `Failed to initialize Discord bot: ${error instanceof Error ? error.message : String(error)}`,
      metadata: { error: String(error) }
    });
  }
  
  // Bot Status API
  app.get("/api/status", async (req: Request, res: Response) => {
    try {
      res.json(botStatus);
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to get bot status: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Bot Commands API
  app.get("/api/commands", async (req: Request, res: Response) => {
    try {
      const commands = getCommandList();
      res.json(commands);
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to get commands: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Bot Settings API
  app.get("/api/settings", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to get settings: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  app.post("/api/settings", async (req: Request, res: Response) => {
    try {
      // Modified to accept simple key-value format for admin dashboard
      const { key, value } = req.body;
      
      if (!key || value === undefined) {
        return res.status(400).json({ 
          message: "Missing required fields: key and value are required" 
        });
      }
      
      // Create appropriate setting object
      const settingData = {
        settingKey: key,
        settingValue: String(value)
      };
      
      const setting = await storage.updateSetting(
        settingData.settingKey,
        settingData.settingValue
      );
      
      // Log the setting change
      await storage.createLog({
        eventType: 'setting_update',
        message: `Setting '${key}' updated to '${value}'`,
        metadata: { key, value, previousValue: setting.settingValue }
      });
      
      // If scan frequency is updated, restart the cron job
      if (key === "scanFrequency") {
        const frequencyValue = parseInt(String(value));
        if (isNaN(frequencyValue) || frequencyValue < 1) {
          return res.status(400).json({ 
            message: "Invalid scan frequency: must be a positive number" 
          });
        }
        await discordBot.updateScanFrequency(frequencyValue);
      }
      
      // If game path is updated, restart the watcher
      if (key === "gamePath" && watcher) {
        await watcher.close();
        initializeWatcher(String(value));
      }
      
      // Broadcast setting change to all connected clients
      broadcastToClients({
        type: "setting_updated",
        data: setting
      });
      
      res.json(setting);
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to update setting: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Recent Leaks API
  app.get("/api/leaks/recent", async (req: Request, res: Response) => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 48;
      const recentLeaks = await storage.getRecentLeaks(hours);
      res.json(recentLeaks);
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to get recent leaks: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Developer Changes API
  app.get("/api/leaks/developer", async (req: Request, res: Response) => {
    try {
      const devChanges = await storage.getDeveloperChanges();
      res.json(devChanges);
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to get developer changes: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Recent Logs API
  app.get("/api/logs", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const logs = await storage.getLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to get logs: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Force Scan API
  app.post("/api/scan", async (req: Request, res: Response) => {
    try {
      await discordBot.runScan();
      res.json({ message: "Scan initiated" });
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to initiate scan: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Post Latest Leaks API
  app.post("/api/post-leaks", async (req: Request, res: Response) => {
    try {
      await discordBot.postLatestLeaks();
      res.json({ message: "Posted latest leaks" });
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to post leaks: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Restart Bot API
  app.post("/api/restart", async (req: Request, res: Response) => {
    try {
      await discordBot.restart();
      res.json({ message: "Bot restarted" });
    } catch (error) {
      res.status(500).json({ 
        message: `Failed to restart bot: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Ping endpoint to keep the bot alive
  app.get("/ping", (req: Request, res: Response) => {
    res.status(200).send("Bot is alive");
  });
  
  // File serving route - serves files from leaks with proper content type
  app.get("/api/files/:leakId", async (req: Request, res: Response) => {
    try {
      const leakId = parseInt(req.params.leakId);
      if (isNaN(leakId)) {
        return res.status(400).json({ error: "Invalid leak ID format" });
      }
      
      console.log(`File request received for leak ID: ${leakId}`);
      
      const leak = await storage.getLeak(leakId);
      if (!leak) {
        console.log(`Leak not found for ID: ${leakId}`);
        return res.status(404).json({ error: "Leak not found" });
      }
      
      console.log(`Serving file: ${leak.fileName} from path: ${leak.filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(leak.filePath)) {
        console.log(`File not found on disk: ${leak.filePath}`);
        return res.status(404).json({ error: "File not found on disk" });
      }
      
      // Map file extensions to MIME types
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.bmp': 'image/bmp',
        '.ico': 'image/x-icon',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
        '.mp3': 'audio/mpeg',
        '.mp4': 'video/mp4',
        '.obj': 'application/octet-stream',
        '.fbx': 'application/octet-stream',
        '.glb': 'model/gltf-binary',
        '.gltf': 'model/gltf+json'
      };
      
      const ext = path.extname(leak.fileName).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      
      console.log(`Determined content type: ${contentType} for extension: ${ext}`);
      
      // Set proper headers for cross-origin access (essential for Discord to load the resources)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', contentType);
      
      // Set content disposition based on request
      if (req.query.download === 'true') {
        res.setHeader('Content-Disposition', `attachment; filename="${leak.fileName}"`);
        console.log(`Setting content disposition to attachment for download`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${leak.fileName}"`);
        console.log(`Setting content disposition to inline for viewing`);
      }
      
      // For images, make sure there's no caching interference
      if (contentType.startsWith('image/')) {
        res.setHeader('Cache-Control', 'no-cache, max-age=0');
        console.log(`Setting no-cache headers for image`);
      }
      
      // Increment view count
      const viewCountSetting = await storage.getSetting(`view_count_${leakId}`);
      const viewCount = viewCountSetting ? parseInt(viewCountSetting.settingValue) + 1 : 1;
      await storage.updateSetting(`view_count_${leakId}`, viewCount.toString());
      
      // Log the file access
      await storage.createLog({
        eventType: "file_access",
        message: `File access: ${leak.fileName}`,
        metadata: { 
          leakId, 
          fileName: leak.fileName,
          downloadMode: req.query.download === 'true',
          contentType
        }
      });
      
      // Check if this is a metadata request
      if (req.query.meta === 'true') {
        // For web viewer - return leak metadata with URLs instead of file contents
        console.log(`Returning metadata for leak ID: ${leakId}`);
        
        // For text files, include a preview in the metadata
        const isTextFile = leak.fileName.match(/\.(txt|json|log|md|csv|js|ts|html|css|xml)$/i);
        let textPreview = null;
        
        if (isTextFile) {
          try {
            // Only read up to 10KB for the preview
            const stats = fs.statSync(leak.filePath);
            const fileSize = stats.size;
            const maxPreviewSize = 10 * 1024; // 10KB
            
            if (fileSize <= maxPreviewSize) {
              textPreview = fs.readFileSync(leak.filePath, 'utf8');
            } else {
              // Read partial content
              const buffer = Buffer.alloc(maxPreviewSize);
              const fd = fs.openSync(leak.filePath, 'r');
              fs.readSync(fd, buffer, 0, maxPreviewSize, 0);
              fs.closeSync(fd);
              textPreview = buffer.toString('utf8') + '\n\n... (content truncated)';
            }
          } catch (previewErr) {
            console.error(`Error creating text preview: ${previewErr}`);
          }
        }
        
        // Generate URLs for the web viewer
        const baseUrl = process.env.REPLIT_APP_URL || 
          (process.env.REPL_SLUG ? 
           `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER || 'repl.co'}` : 
           "http://localhost:3333");
        
        return res.json({
          ...leak,
          viewUrl: `${baseUrl}/view/${leakId}`,
          rawUrl: `${baseUrl}/api/files/${leakId}?raw=true`,
          downloadUrl: `${baseUrl}/api/files/${leakId}?download=true`,
          viewCount: viewCount,
          textPreview: textPreview,
          externalViewerUrl: `${baseUrl}/view/${leakId}`
        });
      }
      
      // Read the file data for serving the actual file
      try {
        const fileData = fs.readFileSync(leak.filePath);
        console.log(`Successfully read ${fileData.length} bytes from file`);
        
        // Send the file data rather than using sendFile
        return res.send(fileData);
      } catch (readError) {
        console.error(`Error reading file data:`, readError);
        // Fall back to sendFile if read fails
        console.log(`Falling back to sendFile method`);
        return res.sendFile(path.resolve(leak.filePath));
      }
    } catch (error) {
      console.error('Error serving file:', error);
      return res.status(500).json({ 
        error: `Failed to serve file: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
  
  // Roblox link API endpoints
  app.get("/api/roblox-links", async (req: Request, res: Response) => {
    try {
      // In a real application, we'd verify admin permissions here
      // Get all links from storage and sort by creation time
      const links = Array.from((storage as any).robloxLinks.values())
        .sort((a: any, b: any) => b.createdAt?.getTime() - a.createdAt?.getTime())
        .slice(0, 100);
      
      res.json(links);
    } catch (error) {
      console.error("Error fetching Roblox links:", error);
      res.status(500).json({ error: "Failed to fetch Roblox links" });
    }
  });
  
  app.get("/api/roblox-links/discord/:discordId", async (req: Request, res: Response) => {
    const { discordId } = req.params;
    
    try {
      const link = await storage.getRobloxLinkByDiscordId(discordId);
      
      if (!link) {
        return res.status(404).json({ error: "No Roblox link found for this Discord user" });
      }
      
      res.json(link);
    } catch (error) {
      console.error("Error fetching Roblox link by Discord ID:", error);
      res.status(500).json({ error: "Failed to fetch Roblox link" });
    }
  });
  
  app.get("/api/roblox-links/roblox/:robloxId", async (req: Request, res: Response) => {
    const { robloxId } = req.params;
    
    try {
      const link = await storage.getRobloxLinkByRobloxId(robloxId);
      
      if (!link) {
        return res.status(404).json({ error: "No Roblox link found for this Roblox user" });
      }
      
      res.json(link);
    } catch (error) {
      console.error("Error fetching Roblox link by Roblox ID:", error);
      res.status(500).json({ error: "Failed to fetch Roblox link" });
    }
  });
  
  app.post("/api/roblox-links", async (req: Request, res: Response) => {
    try {
      const linkData = req.body;
      
      // Validate the request body
      if (!linkData.discordUserId || !linkData.robloxUserId) {
        return res.status(400).json({ error: "Discord user ID and Roblox user ID are required" });
      }
      
      // Check if a link already exists for this Discord user
      const existingDiscordLink = await storage.getRobloxLinkByDiscordId(linkData.discordUserId);
      if (existingDiscordLink) {
        return res.status(409).json({ 
          error: "This Discord user already has a linked Roblox account",
          existingLink: existingDiscordLink
        });
      }
      
      // Check if a link already exists for this Roblox user
      const existingRobloxLink = await storage.getRobloxLinkByRobloxId(linkData.robloxUserId);
      if (existingRobloxLink) {
        return res.status(409).json({ 
          error: "This Roblox account is already linked to another Discord user",
          existingLink: existingRobloxLink
        });
      }
      
      // Create the new link
      const newLink = await storage.createRobloxLink({
        discordUserId: linkData.discordUserId,
        discordUsername: linkData.discordUsername || "",
        robloxUserId: linkData.robloxUserId,
        robloxUsername: linkData.robloxUsername || ""
      });
      
      // Log the link creation
      await storage.createLog({
        eventType: "account_link",
        message: `Roblox account ${linkData.robloxUserId} linked to Discord user ${linkData.discordUserId}`,
        metadata: linkData
      });
      
      res.status(201).json(newLink);
    } catch (error) {
      console.error("Error creating Roblox link:", error);
      res.status(500).json({ error: "Failed to create Roblox link" });
    }
  });
  
  app.delete("/api/roblox-links/:id", async (req: Request, res: Response) => {
    const linkId = parseInt(req.params.id, 10);
    
    if (isNaN(linkId)) {
      return res.status(400).json({ error: "Invalid link ID" });
    }
    
    try {
      // In a real application, we'd verify admin permissions here
      
      // Get the link before deleting it for logging purposes
      const link = (storage as any).robloxLinks.get(linkId);
      
      if (!link) {
        return res.status(404).json({ error: "Roblox link not found" });
      }
      
      // Delete the link
      const deleted = await storage.deleteRobloxLink(linkId);
      
      if (!deleted) {
        return res.status(404).json({ error: "Roblox link not found" });
      }
      
      // Log the deletion
      await storage.createLog({
        eventType: "account_unlink",
        message: `Roblox account ${link.robloxUserId} unlinked from Discord user ${link.discordUserId}`,
        metadata: { linkId, ...link }
      });
      
      res.status(200).json({ message: "Roblox link deleted successfully" });
    } catch (error) {
      console.error("Error deleting Roblox link:", error);
      res.status(500).json({ error: "Failed to delete Roblox link" });
    }
  });
  
  // Initialize file watcher
  async function initializeWatcher(gamePath: string) {
    try {
      // Always use the real game path for scanning
      const watchPath = gamePath;
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(watchPath)) {
        fs.mkdirSync(watchPath, { recursive: true });
        console.log(`Created game path directory: ${watchPath}`);
      }
      
      // Initialize watcher
      watcher = chokidar.watch(watchPath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 2000,
          pollInterval: 100
        }
      });
      
      // File events
      watcher
        .on("add", async (filePath: string) => handleFileChange(filePath, "added"))
        .on("change", async (filePath: string) => handleFileChange(filePath, "modified"))
        .on("unlink", async (filePath: string) => handleFileChange(filePath, "deleted"));
      
      await storage.createLog({
        eventType: "system",
        message: `File watcher initialized for path: ${watchPath}`,
        metadata: { path: watchPath }
      });
      
      console.log(`File watcher initialized for path: ${watchPath}`);
    } catch (error) {
      console.error("Failed to initialize watcher:", error);
      await storage.createLog({
        eventType: "error",
        message: `Failed to initialize watcher: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { error: String(error) }
      });
    }
  }
  
  // Handle file changes
  async function handleFileChange(filePath: string, changeType: string) {
    try {
      const fileName = path.basename(filePath);
      const fileExt = path.extname(filePath).toLowerCase();
      
      // Determine file type based on extension
      let fileType: string;
      let itemDetails: Record<string, any> = {};
      
      // First pass check for file type based on extension
      if (['.png', '.jpg', '.jpeg', '.bmp', '.tga', '.webp'].includes(fileExt)) {
        fileType = "Textures";
        
        // Further categorize image files based on path and name
        if (fileName.toLowerCase().includes('egg') || filePath.toLowerCase().includes('egg')) {
          fileType = "Egg Texture";
        } else if (fileName.toLowerCase().includes('huge') || filePath.toLowerCase().includes('huge')) {
          fileType = "Huge Pet Texture";
        } else if (fileName.toLowerCase().includes('pet') || filePath.toLowerCase().includes('pet') || 
                  filePath.toLowerCase().includes('pets')) {
          fileType = "Pet Texture";
        } else if (fileName.toLowerCase().includes('world') || filePath.toLowerCase().includes('world') ||
                  fileName.toLowerCase().includes('map') || filePath.toLowerCase().includes('map')) {
          fileType = "World Texture";
        } else if (fileName.toLowerCase().includes('ui') || filePath.toLowerCase().includes('ui') ||
                  fileName.toLowerCase().includes('icon') || filePath.toLowerCase().includes('icon')) {
          fileType = "UI Texture";
        }
      } else if (['.obj', '.fbx', '.mesh', '.glb', '.gltf'].includes(fileExt)) {
        fileType = "Models";
        
        // Further categorize model files
        if (fileName.toLowerCase().includes('egg') || filePath.toLowerCase().includes('egg')) {
          fileType = "Egg Model";
        } else if (fileName.toLowerCase().includes('huge') || filePath.toLowerCase().includes('huge')) {
          fileType = "Huge Pet Model";
        } else if (fileName.toLowerCase().includes('pet') || filePath.toLowerCase().includes('pet')) {
          fileType = "Pet Model";
        } else if (fileName.toLowerCase().includes('world') || filePath.toLowerCase().includes('world') ||
                  fileName.toLowerCase().includes('map') || filePath.toLowerCase().includes('map')) {
          fileType = "World Model";
        } else if (filePath.toLowerCase().includes('character') || fileName.toLowerCase().includes('character')) {
          fileType = "Character Model";
        }
      } else if (['.mp3', '.wav', '.ogg'].includes(fileExt)) {
        fileType = "Audio";
      } else if (fileExt === '.json') {
        fileType = "JSON";
        
        // For JSON files, first check by name patterns
        if (fileName.toLowerCase().includes('egg') || filePath.toLowerCase().includes('egg')) {
          fileType = "Egg Data";
        } else if (fileName.toLowerCase().includes('exclusive') || filePath.toLowerCase().includes('exclusive')) {
          fileType = "Exclusive Pet Data";
        } else if (fileName.toLowerCase().includes('huge') || filePath.toLowerCase().includes('huge')) {
          fileType = "Huge Pet Data";
        } else if (fileName.toLowerCase().includes('limited') || filePath.toLowerCase().includes('limited')) {
          fileType = "Limited Pet Data";
        } else if (fileName.toLowerCase().includes('pet') || filePath.toLowerCase().includes('pet')) {
          fileType = "Pet Data";
        } else if (fileName.toLowerCase().includes('world') || filePath.toLowerCase().includes('world')) {
          fileType = "World Data";
        } else if (fileName.toLowerCase().includes('zone') || filePath.toLowerCase().includes('zone')) {
          fileType = "Zone Data";
        } else if (fileName.toLowerCase().includes('event') || filePath.toLowerCase().includes('event')) {
          fileType = "Event Data";
        }
        
        // Then check JSON content for more accurate categorization and extract details
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const jsonData = JSON.parse(content);
            
            // Extract detailed information based on content structure
            if (jsonData.type === 'egg' || jsonData.eggType || jsonData.hatchChance) {
              fileType = "Egg Data";
              itemDetails = {
                type: jsonData.type || jsonData.eggType || 'egg',
                hatchChance: jsonData.hatchChance,
                cost: jsonData.cost || jsonData.price,
                currency: jsonData.currency,
                possiblePets: Array.isArray(jsonData.possiblePets) ? jsonData.possiblePets.length : 0,
                petsList: Array.isArray(jsonData.possiblePets) ? 
                  jsonData.possiblePets.slice(0, 5).map((p: any) => p.name || p.id || p) : []
              };
            } else if (jsonData.isHuge || 
                     (jsonData.rarity && (jsonData.rarity.toLowerCase() === 'huge' || jsonData.rarity.toLowerCase() === 'titanic'))) {
              fileType = "Huge Pet Data";
              itemDetails = {
                id: jsonData.petId || jsonData.id,
                name: jsonData.petName || jsonData.name,
                rarity: jsonData.rarity,
                value: jsonData.value,
                stats: jsonData.stats,
                abilities: jsonData.abilities,
                isLimited: jsonData.isLimited
              };
            } else if (jsonData.petId || jsonData.petType || jsonData.rarity) {
              // Standard pet file
              if (jsonData.isExclusive || 
                (jsonData.rarity && jsonData.rarity.toLowerCase() === 'exclusive')) {
                fileType = "Exclusive Pet Data";
              } else if (jsonData.isLimited || 
                       (jsonData.rarity && jsonData.rarity.toLowerCase() === 'limited')) {
                fileType = "Limited Pet Data";
              } else {
                fileType = "Pet Data";
              }
              
              itemDetails = {
                id: jsonData.petId || jsonData.id,
                name: jsonData.petName || jsonData.name,
                rarity: jsonData.rarity,
                stats: jsonData.stats,
                abilities: jsonData.abilities,
                value: jsonData.value
              };
            } else if (jsonData.worldId || jsonData.worldName || jsonData.areas) {
              fileType = "World Data";
              itemDetails = {
                id: jsonData.worldId,
                name: jsonData.worldName,
                areas: Array.isArray(jsonData.areas) ? jsonData.areas.length : 0,
                requiresGamepass: jsonData.requiresGamepass,
                unlockCost: jsonData.unlockCost
              };
            } else if (jsonData.zoneId || jsonData.zoneName) {
              fileType = "Zone Data";
              itemDetails = {
                id: jsonData.zoneId,
                name: jsonData.zoneName,
                enemies: jsonData.enemies,
                rewards: jsonData.rewards
              };
            } else if (jsonData.type === 'gamepass' || jsonData.passType) {
              fileType = "Gamepass Data";
              itemDetails = {
                id: jsonData.passId || jsonData.id,
                name: jsonData.name || jsonData.title,
                price: jsonData.price || jsonData.cost,
                robuxCost: jsonData.robuxCost,
                benefits: Array.isArray(jsonData.benefits) ? 
                  jsonData.benefits.map((b: any) => b.name || b.description || b).join(', ') : 
                  jsonData.benefits
              };
            } else if (jsonData.eventName || jsonData.eventType || jsonData.eventId) {
              fileType = "Event Data";
              itemDetails = {
                id: jsonData.eventId,
                name: jsonData.eventName,
                type: jsonData.eventType,
                startDate: jsonData.startDate,
                endDate: jsonData.endDate,
                rewards: jsonData.rewards
              };
            }
          } catch (err) {
            // Log but continue if JSON parsing fails
            console.log(`Could not parse JSON content from ${filePath}: ${err}`);
          }
        }
      }
      else if (['.ini', '.cfg', '.config'].includes(fileExt)) {
        fileType = "Config";
      }
      else if (fileName.toLowerCase().includes('egg')) {
        fileType = "Egg";
      }
      else if (fileName.toLowerCase().includes('huge')) {
        fileType = "Huge Pet";
      }
      else if (fileName.toLowerCase().includes('pet')) {
        fileType = "Pet";
      }
      else if (fileName.toLowerCase().includes('world') || fileName.toLowerCase().includes('zone')) {
        fileType = "World";
      }
      else {
        fileType = "Other";
      }
      
      // Determine if this is a developer file
      const isDeveloperChange = filePath.includes("workspace") || 
        filePath.includes("dev") || 
        fileName.includes("dev_") || 
        fileName.includes("test_") ||
        filePath.includes("beta") ||
        filePath.includes("QA");
      
      // Get file size
      let fileSize = 0;
      if (changeType !== "deleted" && fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }
      
      // Prepare enhanced metadata
      const metadata: Record<string, any> = {
        extension: fileExt,
        detectionMethod: "watcher",
        detectedTime: new Date().toISOString()
      };
      
      // Add item details if available
      if (Object.keys(itemDetails).length > 0) {
        metadata.itemDetails = itemDetails;
      }
      
      // Create leak record
      const leak = await storage.createLeak({
        fileName,
        filePath,
        fileType,
        changeType,
        isDeveloperChange,
        fileSize,
        metadata
      });
      
      const logMessage = `${changeType.toUpperCase()}: ${fileName} (${fileType})`;
      await storage.createLog({
        eventType: "detection",
        message: logMessage,
        metadata: { leak: leak.id, filePath, changeType, fileType }
      });
      
      // Broadcast the leak detection event to WebSocket clients
      broadcastToClients({
        type: "leak_detected",
        data: {
          leak: leak,
          message: logMessage,
          timestamp: new Date().toISOString()
        }
      });
      
      // Notify Discord if auto-posting is enabled and this is a new file (not already posted)
      const autoPostSetting = await storage.getSetting("isAutoPostEnabled");
      
      // Check if file with same name and path has been posted in last 24 hours to avoid duplicates
      const lastDayTimestamp = new Date();
      lastDayTimestamp.setDate(lastDayTimestamp.getDate() - 1);
      
      const recentLeaks = await storage.getRecentLeaks(24);
      const isDuplicate = recentLeaks.some(existingLeak => 
        existingLeak.id !== leak.id && 
        existingLeak.fileName === leak.fileName && 
        existingLeak.filePath === leak.filePath &&
        existingLeak.messageId !== null // Only consider it duplicate if it was posted
      );
      
      // Always post high-priority items (like huge pets, eggs, exclusive pets)
      const isHighPriority = fileType.includes("Huge") || 
                            fileType.includes("Exclusive") || 
                            fileType.includes("Egg") || 
                            (fileType.includes("Event") && changeType === "added");
      
      if ((autoPostSetting && autoPostSetting.settingValue === "true" && !isDuplicate) || isHighPriority) {
        // Post the leak
        try {
          await discordBot.postLeak(leak);
          console.log(`Posted leak: ${leak.fileName} (ID: ${leak.id}) - High priority: ${isHighPriority}`);
          
          // Log that we posted this leak
          await storage.createLog({
            eventType: "post",
            message: `Posted leak: ${leak.fileName} (${fileType})`,
            metadata: { 
              leakId: leak.id, 
              highPriority: isHighPriority,
              details: Object.keys(itemDetails).length > 0 ? 'Extracted detailed information' : 'Basic file only'
            }
          });
        } catch (postError) {
          console.error(`Error posting leak to Discord: ${postError}`);
          await storage.createLog({
            eventType: "error",
            message: `Failed to post leak to Discord: ${leak.fileName}`,
            metadata: { leakId: leak.id, error: String(postError) }
          });
        }
      } else if (isDuplicate) {
        console.log(`Skipping duplicate leak: ${leak.fileName}`);
        await storage.createLog({
          eventType: "info",
          message: `Skipped posting duplicate leak: ${leak.fileName}`,
          metadata: { leakId: leak.id }
        });
      }
      
    } catch (error) {
      console.error("Error handling file change:", error);
      await storage.createLog({
        eventType: "error",
        message: `Error handling file change: ${error instanceof Error ? error.message : String(error)}`,
        metadata: { filePath, changeType, error: String(error) }
      });
    }
  }
  
  // Initialize with stored settings
  try {
    const mockGamePath = path.join(process.cwd(), 'mock_game_files');
    fs.mkdirSync(mockGamePath, { recursive: true });
    fs.mkdirSync(path.join(mockGamePath, 'content'), { recursive: true });
    
    const gamePathSetting = await storage.getSetting("gamePath");
    await storage.updateSetting("gamePath", mockGamePath);
    initializeWatcher(mockGamePath);
  } catch (error) {
    console.error("Failed to initialize game path:", error);
  }
  
  function broadcastToClients(message: any) {
    // Skip broadcasting if there are no connected clients
    if (clients.size === 0) {
      return;
    }
    
    console.log(`Broadcasting to ${clients.size} WebSocket clients: ${message.type}`);
    
    let messageStr: string;
    try {
      messageStr = JSON.stringify(message);
    } catch (jsonError) {
      console.error("Error serializing message:", jsonError);
      return;
    }
    
    const clientsToRemove: WS[] = [];
    
    clients.forEach(client => {
      // WebSocket readyState constants: 0 (CONNECTING), 1 (OPEN), 2 (CLOSING), 3 (CLOSED)
      if (client.readyState === 1) { // OPEN
        try {
          client.send(messageStr);
        } catch (error) {
          console.error("Error sending message to WebSocket client:", error);
          clientsToRemove.push(client);
        }
      } else if (client.readyState === 0) { // CONNECTING
        console.log("Client is still connecting, not sending message");
      } else { // CLOSING or CLOSED
        console.log(`Removing WebSocket client in state: ${client.readyState}`);
        clientsToRemove.push(client);
      }
    });
    
    // Remove disconnected clients
    if (clientsToRemove.length > 0) {
      console.log(`Removing ${clientsToRemove.length} disconnected WebSocket clients`);
      clientsToRemove.forEach(client => {
        clients.delete(client);
      });
    }
  }

  return httpServer;
}
