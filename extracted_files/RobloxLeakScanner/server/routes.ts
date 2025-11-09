import express, { Router } from "express";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { nanoid } from "nanoid";
import { BotService } from "./bot/index";
import { User } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = Router();
  
  // Create a bot instance with the storage
  const bot = new BotService(storage);
  
  // Create a mock user for demo purposes
  let demoUser: User;
  try {
    demoUser = await storage.createUser({
      username: "Username",
      password: "password" // In a real app, we'd hash this
    });
  } catch (error) {
    demoUser = (await storage.getUserByUsername("Username"))!;
  }
  
  // API endpoints
  apiRouter.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  
  // Bot health check endpoint
  apiRouter.get("/api/bot/health", async (_req, res) => {
    try {
      const isActive = await bot.isActive();
      res.json({ 
        status: isActive ? "ok" : "offline",
        service: "discord-bot",
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({ 
        status: "error",
        error: error.message
      });
    }
  });
  
  // Simple ping endpoint for external status monitors
  apiRouter.get("/api/bot/ping", async (_req, res) => {
    try {
      const isActive = await bot.isActive();
      // If the bot is not active, try to activate it
      if (!isActive) {
        await bot.activate();
      }
      // Check again after activation attempt
      const status = await bot.isActive();
      
      res.json({
        pong: true,
        time: new Date().toISOString(),
        status: status ? "online" : "offline"
      });
    } catch (error) {
      res.status(200).json({
        pong: false,
        time: new Date().toISOString(),
        status: "error"
      });
    }
  });
  
  // Bot status endpoint for monitoring and pinging
  apiRouter.get("/api/bot/status", async (_req, res) => {
    try {
      const lastRunTime = await storage.getLastAutoDiscoveryTime();
      const isActive = await bot.isActive();
      const stats = {
        uptime: process.uptime(),
        lastAutoDiscoveryRun: lastRunTime,
        status: isActive ? "online" : "offline",
        leaksCount: await storage.getLeaksCount(),
        developersTracked: await storage.getDeveloperCount(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
      
      // Ping the bot to "wake" it if needed
      if (!isActive) {
        await bot.activate();
      }
      
      res.json({ success: true, ...stats });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message,
        status: "error"
      });
    }
  });
  
  // Bot Command endpoint
  apiRouter.post("/api/bot/command", async (req, res) => {
    try {
      const { command, username } = z.object({
        command: z.string(),
        username: z.string().default("Username")
      }).parse(req.body);
      
      // Handle the command directly with the command text
      const result = await bot.handleCommand(command, username);
      
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // File upload endpoint
  apiRouter.post("/api/bot/upload", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { fileName, fileSize, fileType, fileData, username } = z.object({
        fileName: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
        fileData: z.string(), // Base64 encoded file data
        username: z.string().default("Username")
      }).parse(req.body);
      
      const user = await storage.getUserByUsername(username) || demoUser;
      
      // Store the file
      const file = await bot.handleFileUpload(
        fileName,
        fileSize,
        fileType,
        fileData,
        user.id
      );
      
      res.json({ success: true, file });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Get leaks endpoint
  apiRouter.get("/api/leaks", async (req, res) => {
    try {
      const leaks = await storage.getAllLeaks();
      
      // Map the leaks to include file and user data
      const leaksWithDetails = await Promise.all(
        leaks.map(async (leak) => {
          const file = await storage.getFile(leak.fileId);
          const user = await storage.getUser(leak.leakedBy);
          return {
            ...leak,
            file,
            leakedByUser: user?.username
          };
        })
      );
      
      res.json({ success: true, leaks: leaksWithDetails });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Search leaks endpoint
  apiRouter.get("/api/leaks/search", async (req, res) => {
    try {
      const { query, category } = z.object({
        query: z.string(),
        category: z.string().optional()
      }).parse(req.query);
      
      const leaks = await storage.searchLeaks(query, category);
      
      // Map the leaks to include file and user data
      const leaksWithDetails = await Promise.all(
        leaks.map(async (leak) => {
          const file = await storage.getFile(leak.fileId);
          const user = await storage.getUser(leak.leakedBy);
          return {
            ...leak,
            file,
            leakedByUser: user?.username
          };
        })
      );
      
      res.json({ success: true, leaks: leaksWithDetails });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Get tags endpoint
  apiRouter.get("/api/tags", async (_req, res) => {
    try {
      const tags = await storage.getAllTags();
      res.json({ success: true, tags });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Get monitor configs endpoint
  apiRouter.get("/api/monitors", async (_req, res) => {
    try {
      const configs = await storage.getAllDiscordConfigs();
      
      // Map configs to include their monitor sources
      const configsWithSources = await Promise.all(
        configs.map(async (config) => {
          const sources = await storage.getMonitorSourcesByConfigId(config.id);
          return {
            ...config,
            sources
          };
        })
      );
      
      res.json({ success: true, configs: configsWithSources });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Get monitor sources by game ID
  apiRouter.get("/api/monitors/game/:gameId", async (req, res) => {
    try {
      const { gameId } = req.params;
      
      // Get all monitor sources
      const allSources = await storage.getAllMonitorSources();
      
      // Filter sources to find the game source matching the game ID
      const gameSources = allSources.filter(
        source => source.sourceType === 'game' && source.sourceId === gameId
      );
      
      // Get configs that are associated with these sources
      const relatedConfigs = await Promise.all(
        gameSources.map(async (source) => {
          const config = await storage.getDiscordConfig(source.configId);
          
          if (config) {
            // Get all sources for this config
            const sources = await storage.getMonitorSourcesByConfigId(config.id);
            return {
              ...config,
              sources
            };
          }
          return null;
        })
      );
      
      // Filter out null values
      const filteredConfigs = relatedConfigs.filter(config => config !== null);
      
      res.json({ success: true, configs: filteredConfigs, gameId });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Get monitor sources by developer ID
  apiRouter.get("/api/monitors/developer/:developerId", async (req, res) => {
    try {
      const { developerId } = req.params;
      
      // Get all monitor sources
      const allSources = await storage.getAllMonitorSources();
      
      // Filter sources to find the developer sources matching the ID
      const devSources = allSources.filter(
        source => source.sourceType === 'developer' && source.sourceId === developerId
      );
      
      // Get configs that are associated with these sources
      const relatedConfigs = await Promise.all(
        devSources.map(async (source) => {
          const config = await storage.getDiscordConfig(source.configId);
          
          if (config) {
            // Get all sources for this config
            const sources = await storage.getMonitorSourcesByConfigId(config.id);
            return {
              ...config,
              sources
            };
          }
          return null;
        })
      );
      
      // Filter out null values
      const filteredConfigs = relatedConfigs.filter(config => config !== null);
      
      res.json({ success: true, configs: filteredConfigs, developerId });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Trigger auto-discovery
  apiRouter.post("/api/bot/discover", async (_req, res) => {
    try {
      // Trigger an auto-discovery run manually
      const results = await bot.triggerDiscovery();
      
      res.json({ 
        success: true, 
        message: "Auto-discovery triggered successfully", 
        results
      });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });
  
  // Use the API router
  app.use(apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
