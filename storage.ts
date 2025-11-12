import { 
  users, User, InsertUser, 
  files, File, InsertFile,
  leaks, Leak, InsertLeak,
  tags, Tag, InsertTag,
  discordConfigs, DiscordConfig, InsertDiscordConfig,
  monitorSources, MonitorSource, InsertMonitorSource
} from "@shared/schema";
import { nanoid } from "nanoid";
import { db } from "./db";
import { eq, desc, and, like, sql } from "drizzle-orm";
// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // File operations
  createFile(file: InsertFile): Promise<File>;
  getFile(id: number): Promise<File | undefined>;
  getFileByAssetId(assetId: string): Promise<File | undefined>;
  getAllFiles(): Promise<File[]>;
  deleteFile(id: number): Promise<boolean>;
  // Leak operations
  createLeak(leak: InsertLeak): Promise<Leak>;
  getLeak(id: number): Promise<Leak | undefined>;
  getLeakById(id: string): Promise<Leak | undefined>;
  getLeaksByFileId(fileId: number): Promise<Leak[]>;
  getLeaksByType(type: string): Promise<Leak[]>;
  getLeaksByCategory(category: string): Promise<Leak[]>;
  getAllLeaks(): Promise<Leak[]>;
  searchLeaks(query: string, category?: string, after?: string): Promise<Leak[]>;
  getLeaksCount(): Promise<number>;
  // Tag operations
  createTag(tag: InsertTag): Promise<Tag>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  getAllTags(): Promise<Tag[]>;
  // Discord config operations
  createDiscordConfig(config: InsertDiscordConfig): Promise<DiscordConfig>;
  getDiscordConfig(id: number): Promise<DiscordConfig | undefined>;
  getDiscordConfigByServerId(serverId: string): Promise<DiscordConfig | undefined>;
  updateDiscordConfig(id: number, updates: Partial<InsertDiscordConfig>): Promise<DiscordConfig | undefined>;
  getAllDiscordConfigs(): Promise<DiscordConfig[]>;
  // Monitor source operations
  createMonitorSource(source: InsertMonitorSource): Promise<MonitorSource>;
  getMonitorSource(id: number): Promise<MonitorSource | undefined>;
  getMonitorSourcesByConfigId(configId: number): Promise<MonitorSource[]>;
  getMonitorSourcesByType(sourceType: string): Promise<MonitorSource[]>;
  updateMonitorSource(id: number, updates: Partial<InsertMonitorSource>): Promise<MonitorSource | undefined>;
  deleteMonitorSource(id: number): Promise<boolean>;
  getAllMonitorSources(): Promise<MonitorSource[]>;
  // Settings and logs
  getSetting(key: string): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date} | undefined>;
  updateSetting(key: string, value: string): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date}>;
  getAllSettings(): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date}[]>;
  getLastAutoDiscoveryTime(): Promise<Date | null>;
  getDeveloperCount(): Promise<number>;
  createLog(log: {eventType: string, message: string, metadata?: any}): Promise<any>;
  getLogs(limit?: number): Promise<any[]>;
  getLogsByType(eventType: string, limit?: number): Promise<any[]>;
}
// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private leaks: Map<number, Leak>;
  private tags: Map<number, Tag>;
  private discordConfigs: Map<number, DiscordConfig>;
  private monitorSources: Map<number, MonitorSource>;
  private settings: Map<string, {id: number, settingKey: string, settingValue: string, updatedAt: Date}>;
  private logs: Map<number, {id: number, eventType: string, message: string, timestamp: Date, metadata?: any}>;
  private userCurrentId: number;
  private fileCurrentId: number;
  private leakCurrentId: number;
  private tagCurrentId: number;
  private discordConfigCurrentId: number;
  private monitorSourceCurrentId: number;
  private settingCurrentId: number;
  private logCurrentId: number;
  
  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.leaks = new Map();
    this.tags = new Map();
    this.discordConfigs = new Map();
    this.monitorSources = new Map();
    this.settings = new Map();
    this.logs = new Map();
    this.userCurrentId = 1;
    this.fileCurrentId = 1;
    this.leakCurrentId = 1;
    this.tagCurrentId = 1;
    this.discordConfigCurrentId = 1;
    this.monitorSourceCurrentId = 1;
    this.settingCurrentId = 1;
    this.logCurrentId = 1;
    
    // Initialize with some default tags
    this.createTag({ name: "New Content", color: "#22c55e" });
    this.createTag({ name: "Model", color: "#3b82f6" });
    this.createTag({ name: "Script", color: "#8b5cf6" });
    this.createTag({ name: "Map", color: "#eab308" });
    this.createTag({ name: "Texture", color: "#ec4899" });
    this.createTag({ name: "Weapon", color: "#ef4444" });
    this.createTag({ name: "Unreleased", color: "#f97316" });
    this.createTag({ name: "Background", color: "#14b8a6" });
    this.createTag({ name: "Level", color: "#6366f1" });
    this.createTag({ name: "Quest Item", color: "#d946ef" });
    this.createTag({ name: "Image", color: "#0ea5e9" });
    
    // Add Pet Simulator 99 specific tags
    this.createTag({ name: "Pet Simulator 99", color: "#8b5cf6" });
    this.createTag({ name: "Verified Content", color: "#22c55e" });
    this.createTag({ name: "Official Developer", color: "#ef4444" });
    this.createTag({ name: "Pets", color: "#f97316" });
    this.createTag({ name: "Areas", color: "#3b82f6" });
    this.createTag({ name: "Eggs", color: "#ec4899" });
    this.createTag({ name: "Currency", color: "#eab308" });
    
    // Initialize default settings
    const defaultSettings = [
      { settingKey: "lastAutoDiscoveryTime", settingValue: new Date().toISOString() },
      { settingKey: "botStartTime", settingValue: new Date().toISOString() },
      { settingKey: "scanFrequency", settingValue: "15" }, // minutes
      { settingKey: "leakChannel", settingValue: "1352979345257529404" },
      { settingKey: "generalChannel", settingValue: "1285623731053527126" },
      { settingKey: "autoDiscoveryEnabled", settingValue: "true" }
    ];
    
    for (const setting of defaultSettings) {
      const id = this.settingCurrentId++;
      this.settings.set(setting.settingKey, {
        id,
        settingKey: setting.settingKey,
        settingValue: setting.settingValue,
        updatedAt: new Date()
      });
    }
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
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // File operations
  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileCurrentId++;
    const assetId = insertFile.assetId || `asset_${nanoid(5)}`;
    const file: File = { 
      ...insertFile, 
      id, 
      assetId,
      uploadDate: new Date()
    };
    this.files.set(id, file);
    return file;
  }
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }
  async getFileByAssetId(assetId: string): Promise<File | undefined> {
    return Array.from(this.files.values()).find(
      (file) => file.assetId === assetId
    );
  }
  async getAllFiles(): Promise<File[]> {
    return Array.from(this.files.values());
  }
  async deleteFile(id: number): Promise<boolean> {
    // Delete related leaks first
    const leaksToDelete = await this.getLeaksByFileId(id);
    for (const leak of leaksToDelete) {
      this.leaks.delete(leak.id);
    }
    return this.files.delete(id);
  }
  // Leak operations
  async createLeak(insertLeak: InsertLeak): Promise<Leak> {
    const id = this.leakCurrentId++;
    // Ensure null values are properly set for optional fields
    const leak: Leak = { 
      ...insertLeak, 
      id,
      leakDate: new Date(),
      description: insertLeak.description || null,
      gameName: insertLeak.gameName || null,
      channelId: insertLeak.channelId || null
    };
    this.leaks.set(id, leak);
    return leak;
  }
  async getLeak(id: number): Promise<Leak | undefined> {
    return this.leaks.get(id);
  }
  
  async getLeakById(id: string): Promise<Leak | undefined> {
    // If id is a number string, try to convert it
    if (/^\d+$/.test(id)) {
      return this.getLeak(parseInt(id, 10));
    }
    
    // Otherwise, try to find a leak with a matching custom ID
    return Array.from(this.leaks.values()).find(leak => 
      leak.title.toLowerCase().includes(id.toLowerCase()) || 
      (leak.tags && leak.tags.includes(id))
    );
  }
  async getLeaksByFileId(fileId: number): Promise<Leak[]> {
    return Array.from(this.leaks.values()).filter(
      (leak) => leak.fileId === fileId
    );
  }
  async getLeaksByType(type: string): Promise<Leak[]> {
    return Array.from(this.leaks.values()).filter(
      (leak) => leak.leakType === type
    );
  }
  async getLeaksByCategory(category: string): Promise<Leak[]> {
    return Array.from(this.leaks.values()).filter(
      (leak) => leak.category === category
    );
  }
  async getAllLeaks(): Promise<Leak[]> {
    return Array.from(this.leaks.values());
  }
  
  async getLeaksCount(): Promise<number> {
    return this.leaks.size;
  }
  
  async searchLeaks(query: string, category?: string, after?: string): Promise<Leak[]> {
    let results = Array.from(this.leaks.values());
    // Filter by category if provided
    if (category) {
      results = results.filter((leak) => leak.category === category);
    }
    // Filter by timestamp if provided
    if (after) {
      const afterDate = new Date(after);
      results = results.filter((leak) => {
        return new Date(leak.leakDate) >= afterDate;
      });
    }
    // Search by query in title, description, tags
    if (query) {
      const lowerQuery = query.toLowerCase();
      results = results.filter((leak) => {
        return (
          leak.title.toLowerCase().includes(lowerQuery) ||
          (leak.description && leak.description.toLowerCase().includes(lowerQuery)) ||
          leak.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
        );
      });
    }
    return results;
  }
  // Tag operations
  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.tagCurrentId++;
    const tag: Tag = { ...insertTag, id };
    this.tags.set(id, tag);
    return tag;
  }
  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }
  async getTagByName(name: string): Promise<Tag | undefined> {
    return Array.from(this.tags.values()).find(
      (tag) => tag.name.toLowerCase() === name.toLowerCase()
    );
  }
  async getAllTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }
  // Discord config operations
  async createDiscordConfig(insertConfig: InsertDiscordConfig): Promise<DiscordConfig> {
    const id = this.discordConfigCurrentId++;
    // Ensure all required properties are set with correct types
    const config: DiscordConfig = { 
      ...insertConfig, 
      id,
      inviteCode: insertConfig.inviteCode || null,
      monitoringChannel: insertConfig.monitoringChannel || null,
      isActive: insertConfig.isActive ?? true,
      pingRole: insertConfig.pingRole || null,
      notificationSettings: insertConfig.notificationSettings || JSON.stringify({
        newAssets: true,
        developerUpdates: true,
        gameUpdates: true,
        sendScreenshots: true
      })
    };
    this.discordConfigs.set(id, config);
    return config;
  }
  async getDiscordConfig(id: number): Promise<DiscordConfig | undefined> {
    return this.discordConfigs.get(id);
  }
  async getDiscordConfigByServerId(serverId: string): Promise<DiscordConfig | undefined> {
    return Array.from(this.discordConfigs.values()).find(
      (config) => config.serverId === serverId
    );
  }
  async updateDiscordConfig(id: number, updates: Partial<InsertDiscordConfig>): Promise<DiscordConfig | undefined> {
    const config = this.discordConfigs.get(id);
    if (!config) return undefined;
    const updatedConfig: DiscordConfig = { ...config, ...updates };
    this.discordConfigs.set(id, updatedConfig);
    return updatedConfig;
  }
  async getAllDiscordConfigs(): Promise<DiscordConfig[]> {
    return Array.from(this.discordConfigs.values());
  }
  // Monitor source operations
  async createMonitorSource(insertSource: InsertMonitorSource): Promise<MonitorSource> {
    const id = this.monitorSourceCurrentId++;
    // Ensure all required properties are set with correct types
    const source: MonitorSource = { 
      ...insertSource, 
      id, 
      isActive: insertSource.isActive ?? true,
      lastChecked: new Date(),
      autoDiscover: insertSource.autoDiscover ?? false,
      discoveryDepth: insertSource.discoveryDepth ?? 1,
      discoveryFilters: insertSource.discoveryFilters ?? null,
      lastDiscoveryResults: null
    };
    this.monitorSources.set(id, source);
    return source;
  }
  async getMonitorSource(id: number): Promise<MonitorSource | undefined> {
    return this.monitorSources.get(id);
  }
  async getMonitorSourcesByConfigId(configId: number): Promise<MonitorSource[]> {
    return Array.from(this.monitorSources.values()).filter(
      (source) => source.configId === configId
    );
  }
  async getMonitorSourcesByType(sourceType: string): Promise<MonitorSource[]> {
    return Array.from(this.monitorSources.values()).filter(
      (source) => source.sourceType === sourceType
    );
  }
  async updateMonitorSource(id: number, updates: Partial<InsertMonitorSource>): Promise<MonitorSource | undefined> {
    const source = this.monitorSources.get(id);
    if (!source) return undefined;
    const updatedSource: MonitorSource = { ...source, ...updates };
    this.monitorSources.set(id, updatedSource);
    return updatedSource;
  }
  async deleteMonitorSource(id: number): Promise<boolean> {
    return this.monitorSources.delete(id);
  }
  async getAllMonitorSources(): Promise<MonitorSource[]> {
    return Array.from(this.monitorSources.values());
  }
  
  // Settings operations
  async getSetting(key: string): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date} | undefined> {
    return this.settings.get(key);
  }
  
  async updateSetting(key: string, value: string): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date}> {
    const setting = this.settings.get(key);
    if (setting) {
      const updatedSetting = {
        ...setting,
        settingValue: value,
        updatedAt: new Date()
      };
      this.settings.set(key, updatedSetting);
      return updatedSetting;
    } else {
      const id = this.settingCurrentId++;
      const newSetting = {
        id,
        settingKey: key,
        settingValue: value,
        updatedAt: new Date()
      };
      this.settings.set(key, newSetting);
      return newSetting;
    }
  }
  
  async getAllSettings(): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date}[]> {
    return Array.from(this.settings.values());
  }
  
  async getLastAutoDiscoveryTime(): Promise<Date | null> {
    const setting = await this.getSetting('lastAutoDiscoveryTime');
    if (setting && setting.settingValue) {
      try {
        return new Date(setting.settingValue);
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  
  async getDeveloperCount(): Promise<number> {
    // Count distinct developer sources being monitored
    const developerSources = await this.getMonitorSourcesByType('developer');
    // Use Set to count unique developer IDs
    const uniqueDeveloperIds = new Set(developerSources.map(source => source.sourceId));
    return uniqueDeveloperIds.size;
  }
  
  // Log operations
  async createLog(log: {eventType: string, message: string, metadata?: any}): Promise<any> {
    const id = this.logCurrentId++;
    const newLog = {
      id,
      eventType: log.eventType,
      message: log.message,
      timestamp: new Date(),
      metadata: log.metadata || {}
    };
    this.logs.set(id, newLog);
    return newLog;
  }
  
  async getLogs(limit: number = 50): Promise<any[]> {
    let logs = Array.from(this.logs.values());
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (limit > 0) {
      logs = logs.slice(0, limit);
    }
    return logs;
  }
  
  async getLogsByType(eventType: string, limit: number = 50): Promise<any[]> {
    let logs = Array.from(this.logs.values())
      .filter(log => log.eventType === eventType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (limit > 0) {
      logs = logs.slice(0, limit);
    }
    return logs;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // File operations
  async createFile(insertFile: InsertFile): Promise<File> {
    const assetId = insertFile.assetId || `asset_${nanoid(8)}`;
    const fileToInsert = { ...insertFile, assetId };
    const [file] = await db.insert(files).values(fileToInsert).returning();
    return file;
  }

  async getFile(id: number): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async getFileByAssetId(assetId: string): Promise<File | undefined> {
    const [file] = await db.select().from(files).where(eq(files.assetId, assetId));
    return file;
  }

  async getAllFiles(): Promise<File[]> {
    return db.select().from(files);
  }

  async deleteFile(id: number): Promise<boolean> {
    const result = await db.delete(files).where(eq(files.id, id));
    return result.rowCount > 0;
  }

  // Leak operations
  async createLeak(insertLeak: InsertLeak): Promise<Leak> {
    const [leak] = await db.insert(leaks).values(insertLeak).returning();
    return leak;
  }

  async getLeak(id: number): Promise<Leak | undefined> {
    const [leak] = await db.select().from(leaks).where(eq(leaks.id, id));
    return leak;
  }
  
  async getLeakById(id: string): Promise<Leak | undefined> {
    // If id is a number string, try to get by numeric ID
    if (/^\d+$/.test(id)) {
      return this.getLeak(parseInt(id, 10));
    }
    
    // Otherwise, try to search in title or tags
    const results = await db.select().from(leaks).where(
      sql`${leaks.title} ILIKE ${`%${id}%`} OR ${id} = ANY(${leaks.tags})`
    );
    return results[0];
  }

  async getLeaksByFileId(fileId: number): Promise<Leak[]> {
    return db.select().from(leaks).where(eq(leaks.fileId, fileId));
  }

  async getLeaksByType(type: string): Promise<Leak[]> {
    return db.select().from(leaks).where(eq(leaks.leakType, type));
  }

  async getLeaksByCategory(category: string): Promise<Leak[]> {
    return db.select().from(leaks).where(eq(leaks.category, category));
  }

  async getAllLeaks(): Promise<Leak[]> {
    return db.select().from(leaks).orderBy(desc(leaks.leakDate));
  }
  
  async getLeaksCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)` }).from(leaks);
    return result[0].count;
  }
  
  async searchLeaks(query: string, category?: string, after?: string): Promise<Leak[]> {
    let conditions = [];
    
    // Add category condition if provided
    if (category) {
      conditions.push(eq(leaks.category, category));
    }
    
    // Add date condition if provided
    if (after) {
      const afterDate = new Date(after);
      conditions.push(sql`${leaks.leakDate} >= ${afterDate}`);
    }
    
    // Add query condition if provided
    if (query) {
      conditions.push(
        sql`${leaks.title} ILIKE ${`%${query}%`} OR 
            ${leaks.description} ILIKE ${`%${query}%`} OR 
            EXISTS (SELECT 1 FROM unnest(${leaks.tags}) tag WHERE tag ILIKE ${`%${query}%`})`
      );
    }
    
    // Build the query based on conditions
    if (conditions.length > 0) {
      return db.select().from(leaks)
        .where(and(...conditions))
        .orderBy(desc(leaks.leakDate));
    } else {
      return db.select().from(leaks).orderBy(desc(leaks.leakDate));
    }
  }

  // Tag operations
  async createTag(insertTag: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values(insertTag).returning();
    return tag;
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag;
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(
      sql`LOWER(${tags.name}) = LOWER(${name})`
    );
    return tag;
  }

  async getAllTags(): Promise<Tag[]> {
    return db.select().from(tags);
  }

  // Discord config operations
  async createDiscordConfig(insertConfig: InsertDiscordConfig): Promise<DiscordConfig> {
    const [config] = await db.insert(discordConfigs).values(insertConfig).returning();
    return config;
  }

  async getDiscordConfig(id: number): Promise<DiscordConfig | undefined> {
    const [config] = await db.select().from(discordConfigs).where(eq(discordConfigs.id, id));
    return config;
  }

  async getDiscordConfigByServerId(serverId: string): Promise<DiscordConfig | undefined> {
    const [config] = await db.select().from(discordConfigs).where(eq(discordConfigs.serverId, serverId));
    return config;
  }

  async updateDiscordConfig(id: number, updates: Partial<InsertDiscordConfig>): Promise<DiscordConfig | undefined> {
    const [updated] = await db.update(discordConfigs)
      .set(updates)
      .where(eq(discordConfigs.id, id))
      .returning();
    return updated;
  }

  async getAllDiscordConfigs(): Promise<DiscordConfig[]> {
    return db.select().from(discordConfigs);
  }

  // Monitor source operations
  async createMonitorSource(insertSource: InsertMonitorSource): Promise<MonitorSource> {
    const [source] = await db.insert(monitorSources).values(insertSource).returning();
    return source;
  }

  async getMonitorSource(id: number): Promise<MonitorSource | undefined> {
    const [source] = await db.select().from(monitorSources).where(eq(monitorSources.id, id));
    return source;
  }

  async getMonitorSourcesByConfigId(configId: number): Promise<MonitorSource[]> {
    return db.select().from(monitorSources).where(eq(monitorSources.configId, configId));
  }

  async getMonitorSourcesByType(sourceType: string): Promise<MonitorSource[]> {
    return db.select().from(monitorSources).where(eq(monitorSources.sourceType, sourceType));
  }

  async updateMonitorSource(id: number, updates: Partial<InsertMonitorSource>): Promise<MonitorSource | undefined> {
    const [updated] = await db.update(monitorSources)
      .set(updates)
      .where(eq(monitorSources.id, id))
      .returning();
    return updated;
  }

  async deleteMonitorSource(id: number): Promise<boolean> {
    const result = await db.delete(monitorSources).where(eq(monitorSources.id, id));
    return result.rowCount > 0;
  }

  async getAllMonitorSources(): Promise<MonitorSource[]> {
    return db.select().from(monitorSources);
  }
  
  // Settings and logs
  async getSetting(key: string): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date} | undefined> {
    // For settings, we'll use a simple implementation with leaks table for storage
    // In a real app, we would create a settings table
    const [settingLeak] = await db.select().from(leaks)
      .where(and(
        eq(leaks.category, "setting"),
        eq(leaks.title, key)
      ));
    
    if (settingLeak) {
      return {
        id: settingLeak.id,
        settingKey: settingLeak.title,
        settingValue: settingLeak.description || "",
        updatedAt: settingLeak.leakDate
      };
    }
    
    return undefined;
  }
  
  async updateSetting(key: string, value: string): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date}> {
    const existingSetting = await this.getSetting(key);
    
    if (existingSetting) {
      // Update existing setting
      const [updated] = await db.update(leaks)
        .set({ description: value })
        .where(eq(leaks.id, existingSetting.id))
        .returning();
      
      return {
        id: updated.id,
        settingKey: updated.title,
        settingValue: updated.description || "",
        updatedAt: updated.leakDate
      };
    } else {
      // Create new setting
      const [newLeak] = await db.insert(leaks).values({
        fileId: 1, // Special file ID for settings
        title: key,
        description: value,
        leakType: "other",
        category: "setting",
        leakedBy: 1, // System user
        tags: ["setting"]
      }).returning();
      
      return {
        id: newLeak.id,
        settingKey: newLeak.title,
        settingValue: newLeak.description || "",
        updatedAt: newLeak.leakDate
      };
    }
  }
  
  async getAllSettings(): Promise<{id: number, settingKey: string, settingValue: string, updatedAt: Date}[]> {
    const settingsLeaks = await db.select().from(leaks)
      .where(eq(leaks.category, "setting"));
    
    return settingsLeaks.map(leak => ({
      id: leak.id,
      settingKey: leak.title,
      settingValue: leak.description || "",
      updatedAt: leak.leakDate
    }));
  }
  
  async getLastAutoDiscoveryTime(): Promise<Date | null> {
    const setting = await this.getSetting('lastAutoDiscoveryTime');
    if (setting && setting.settingValue) {
      try {
        return new Date(setting.settingValue);
      } catch (error) {
        return null;
      }
    }
    return null;
  }
  
  async getDeveloperCount(): Promise<number> {
    const sources = await this.getMonitorSourcesByType('developer');
    const uniqueDeveloperIds = new Set(sources.map(source => source.sourceId));
    return uniqueDeveloperIds.size;
  }
  
  async createLog(log: {eventType: string, message: string, metadata?: any}): Promise<any> {
    // Store logs as leaks for simplicity
    const [newLog] = await db.insert(leaks).values({
      fileId: 1, // Special file ID for logs
      title: log.eventType,
      description: log.message,
      leakType: "other",
      category: "log",
      leakedBy: 1, // System user
      tags: ["log", log.eventType],
      // Save metadata in channelId field for simplicity
      channelId: log.metadata ? JSON.stringify(log.metadata) : null
    }).returning();
    
    return newLog;
  }
  
  async getLogs(limit?: number): Promise<any[]> {
    const query = db.select().from(leaks)
      .where(eq(leaks.category, "log"))
      .orderBy(desc(leaks.leakDate));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }
  
  async getLogsByType(eventType: string, limit?: number): Promise<any[]> {
    const query = db.select().from(leaks)
      .where(and(
        eq(leaks.category, "log"),
        eq(leaks.title, eventType)
      ))
      .orderBy(desc(leaks.leakDate));
    
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }
}

// Use DatabaseStorage if we have a database connection
const useDatabase = process.env.DATABASE_URL ? true : false;
export const storage = useDatabase ? new DatabaseStorage() : new MemStorage();

/**
 * Initialize storage
 * This function is used to create and return a new storage instance
 */
export function initStorage(): IStorage {
  return new MemStorage();
}
