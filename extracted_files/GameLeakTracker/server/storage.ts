import { users, type User, type InsertUser, leaks, type Leak, type InsertLeak, botLogs, type BotLog, type InsertBotLog, botSettings, type BotSetting, type InsertBotSetting, robloxLinks, type RobloxLink, type InsertRobloxLink } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Leak operations
  createLeak(leak: InsertLeak): Promise<Leak>;
  getLeak(id: number): Promise<Leak | undefined>;
  getLeaksByTimeRange(startTime: Date, endTime: Date): Promise<Leak[]>;
  updateLeakMessageId(id: number, messageId: string): Promise<Leak>;
  getRecentLeaks(hours: number): Promise<Leak[]>;
  getLeaksByType(fileType: string): Promise<Leak[]>;
  getDeveloperChanges(): Promise<Leak[]>;
  searchLeaksByKeyword(keyword: string, fileType?: string, limit?: number): Promise<Leak[]>;

  // Bot log operations
  createLog(log: InsertBotLog): Promise<BotLog>;
  getLogs(limit: number): Promise<BotLog[]>;
  getLogsByType(eventType: string, limit: number): Promise<BotLog[]>;

  // Bot settings operations
  getSetting(key: string): Promise<BotSetting | undefined>;
  updateSetting(key: string, value: string): Promise<BotSetting>;
  getAllSettings(): Promise<BotSetting[]>;
  
  // Roblox user link operations
  createRobloxLink(link: InsertRobloxLink): Promise<RobloxLink>;
  getRobloxLinkByDiscordId(discordUserId: string): Promise<RobloxLink | undefined>;
  getRobloxLinkByRobloxId(robloxUserId: string): Promise<RobloxLink | undefined>;
  updateRobloxLink(id: number, updates: Partial<InsertRobloxLink>): Promise<RobloxLink>;
  deleteRobloxLink(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private leaksData: Map<number, Leak>;
  private logs: Map<number, BotLog>;
  private settings: Map<string, BotSetting>;
  private robloxLinks: Map<number, RobloxLink>;

  currentUserId: number;
  currentLeakId: number;
  currentLogId: number;
  currentSettingId: number;
  currentRobloxLinkId: number;

  constructor() {
    this.users = new Map();
    this.leaksData = new Map();
    this.logs = new Map();
    this.settings = new Map();
    this.robloxLinks = new Map();

    this.currentUserId = 1;
    this.currentLeakId = 1;
    this.currentLogId = 1;
    this.currentSettingId = 1;
    this.currentRobloxLinkId = 1;

    // Initialize default settings
    const defaultSettings = [
      { settingKey: 'scanFrequency', settingValue: '2' }, // minutes
      { settingKey: 'gamePath', settingValue: '/game/content/paks' },
      { settingKey: 'fileTypes', settingValue: 'Textures,Models,Audio,JSON,Config' },
      { settingKey: 'discordChannel', settingValue: 'leaks' },
      { settingKey: 'isAutoPostEnabled', settingValue: 'true' }, // Changed to true
      { settingKey: 'lastScanTime', settingValue: new Date().toISOString() },
      { settingKey: 'botStartTime', settingValue: new Date().toISOString() },
    ];

    defaultSettings.forEach(setting => {
      const id = this.currentSettingId++;
      this.settings.set(setting.settingKey, {
        ...setting,
        id,
        updatedAt: new Date(),
      });
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Leak operations
  async createLeak(insertLeak: InsertLeak): Promise<Leak> {
    const id = this.currentLeakId++;
    const leak: Leak = {
      id,
      fileName: insertLeak.fileName,
      filePath: insertLeak.filePath,
      fileType: insertLeak.fileType,
      changeType: insertLeak.changeType,
      fileSize: insertLeak.fileSize || null,
      isDeveloperChange: insertLeak.isDeveloperChange || false,
      timestamp: new Date(),
      messageId: null,
      metadata: insertLeak.metadata || {}
    };
    this.leaksData.set(id, leak);
    return leak;
  }

  async getLeak(id: number): Promise<Leak | undefined> {
    return this.leaksData.get(id);
  }

  async getLeaksByTimeRange(startTime: Date, endTime: Date): Promise<Leak[]> {
    return Array.from(this.leaksData.values()).filter(
      (leak) => leak.timestamp >= startTime && leak.timestamp <= endTime
    );
  }

  async updateLeakMessageId(id: number, messageId: string): Promise<Leak> {
    const leak = this.leaksData.get(id);
    if (!leak) {
      throw new Error(`Leak with id ${id} not found`);
    }

    const updatedLeak = { ...leak, messageId };
    this.leaksData.set(id, updatedLeak);
    return updatedLeak;
  }

  async getRecentLeaks(hours: number): Promise<Leak[]> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);

    return Array.from(this.leaksData.values()).filter(
      (leak) => leak.timestamp >= cutoff
    ).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLeaksByType(fileType: string): Promise<Leak[]> {
    return Array.from(this.leaksData.values()).filter(
      (leak) => leak.fileType === fileType
    );
  }

  async getDeveloperChanges(): Promise<Leak[]> {
    return Array.from(this.leaksData.values()).filter(
      (leak) => leak.isDeveloperChange
    );
  }
  
  async searchLeaksByKeyword(keyword: string, fileType?: string, limit?: number): Promise<Leak[]> {
    const lowercaseKeyword = keyword.toLowerCase();
    
    // Filter leaks by keyword in filename, path, and metadata
    let results = Array.from(this.leaksData.values()).filter(leak => {
      // Check in filename
      if (leak.fileName.toLowerCase().includes(lowercaseKeyword)) {
        return true;
      }
      
      // Check in file path
      if (leak.filePath.toLowerCase().includes(lowercaseKeyword)) {
        return true;
      }
      
      // Check in metadata (if JSON)
      if (leak.metadata && typeof leak.metadata === 'object') {
        try {
          const metadataStr = JSON.stringify(leak.metadata).toLowerCase();
          if (metadataStr.includes(lowercaseKeyword)) {
            return true;
          }
        } catch (error) {
          // Ignore JSON stringify errors
        }
      }
      
      return false;
    });
    
    // Apply file type filter if provided
    if (fileType && fileType !== 'all') {
      if (fileType === 'developer') {
        results = results.filter(leak => leak.isDeveloperChange);
      } else {
        results = results.filter(leak => 
          leak.fileType.toLowerCase().includes(fileType.toLowerCase())
        );
      }
    }
    
    // Sort by most recent first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply limit if provided
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }
    
    return results;
  }

  // Bot log operations
  async createLog(insertLog: InsertBotLog): Promise<BotLog> {
    const id = this.currentLogId++;
    const log: BotLog = {
      id,
      eventType: insertLog.eventType,
      message: insertLog.message,
      timestamp: new Date(),
      metadata: insertLog.metadata || {}
    };
    this.logs.set(id, log);
    return log;
  }

  async getLogs(limit: number): Promise<BotLog[]> {
    return Array.from(this.logs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getLogsByType(eventType: string, limit: number): Promise<BotLog[]> {
    return Array.from(this.logs.values())
      .filter((log) => log.eventType === eventType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Bot settings operations
  async getSetting(key: string): Promise<BotSetting | undefined> {
    return this.settings.get(key);
  }

  async updateSetting(key: string, value: string): Promise<BotSetting> {
    const setting = this.settings.get(key);

    if (setting) {
      const updatedSetting = {
        ...setting,
        settingValue: value,
        updatedAt: new Date(),
      };
      this.settings.set(key, updatedSetting);
      return updatedSetting;
    } else {
      const id = this.currentSettingId++;
      const newSetting: BotSetting = {
        id,
        settingKey: key,
        settingValue: value,
        updatedAt: new Date(),
      };
      this.settings.set(key, newSetting);
      return newSetting;
    }
  }

  async getAllSettings(): Promise<BotSetting[]> {
    return Array.from(this.settings.values());
  }
  
  // Roblox link operations
  async createRobloxLink(link: InsertRobloxLink): Promise<RobloxLink> {
    const id = this.currentRobloxLinkId++;
    const robloxLink: RobloxLink = {
      id,
      discordUserId: link.discordUserId,
      discordUsername: link.discordUsername || '',
      robloxUserId: link.robloxUserId,
      robloxUsername: link.robloxUsername || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.robloxLinks.set(id, robloxLink);
    return robloxLink;
  }
  
  async getRobloxLinkByDiscordId(discordUserId: string): Promise<RobloxLink | undefined> {
    return Array.from(this.robloxLinks.values()).find(
      (link) => link.discordUserId === discordUserId
    );
  }
  
  async getRobloxLinkByRobloxId(robloxUserId: string): Promise<RobloxLink | undefined> {
    return Array.from(this.robloxLinks.values()).find(
      (link) => link.robloxUserId === robloxUserId
    );
  }
  
  async updateRobloxLink(id: number, updates: Partial<InsertRobloxLink>): Promise<RobloxLink> {
    const link = this.robloxLinks.get(id);
    if (!link) {
      throw new Error(`Roblox link with id ${id} not found`);
    }
    
    const updatedLink: RobloxLink = {
      ...link,
      ...updates,
      updatedAt: new Date()
    };
    
    this.robloxLinks.set(id, updatedLink);
    return updatedLink;
  }
  
  async deleteRobloxLink(id: number): Promise<boolean> {
    if (!this.robloxLinks.has(id)) {
      return false;
    }
    
    return this.robloxLinks.delete(id);
  }
}

// Use in-memory storage for now
export const storage = new MemStorage();