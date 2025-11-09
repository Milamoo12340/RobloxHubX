import { 
  users, User, InsertUser, 
  files, File, InsertFile,
  leaks, Leak, InsertLeak,
  tags, Tag, InsertTag,
  developerIds, DeveloperId, InsertDeveloperId,
  discordConfigs, DiscordConfig, InsertDiscordConfig,
  monitorSources, MonitorSource, InsertMonitorSource
} from "@shared/schema";
import { nanoid } from "nanoid";

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
  getLeaksByFileId(fileId: number): Promise<Leak[]>;
  getLeaksByType(type: string): Promise<Leak[]>;
  getLeaksByCategory(category: string): Promise<Leak[]>;
  getAllLeaks(): Promise<Leak[]>;
  searchLeaks(query: string, category?: string): Promise<Leak[]>;
  
  // Tag operations
  createTag(tag: InsertTag): Promise<Tag>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  getAllTags(): Promise<Tag[]>;
  
  // Developer ID operations - for tracking changing developer IDs
  createDeveloperId(developerId: InsertDeveloperId): Promise<DeveloperId>;
  getDeveloperId(id: number): Promise<DeveloperId | undefined>;
  getDeveloperIdByCurrentId(currentId: string): Promise<DeveloperId | undefined>;
  getDeveloperIdByName(developerName: string): Promise<DeveloperId | undefined>;
  updateDeveloperId(id: number, updates: Partial<InsertDeveloperId>): Promise<DeveloperId | undefined>;
  getAllDeveloperIds(): Promise<DeveloperId[]>;
  getActiveDeveloperIds(): Promise<DeveloperId[]>;
  trackDeveloperIdHistory(id: number, newId: string): Promise<DeveloperId | undefined>;
  
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
  
  // Bot status operations
  getLastAutoDiscoveryTime(): Promise<Date | null>;
  setLastAutoDiscoveryTime(time: Date): Promise<void>;
  getLeaksCount(): Promise<number>;
  getDeveloperCount(): Promise<number>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private leaks: Map<number, Leak>;
  private tags: Map<number, Tag>;
  private developerIds: Map<number, DeveloperId>;
  private discordConfigs: Map<number, DiscordConfig>;
  private monitorSources: Map<number, MonitorSource>;
  
  private userCurrentId: number;
  private fileCurrentId: number;
  private leakCurrentId: number;
  private tagCurrentId: number;
  private developerIdCurrentId: number;
  private discordConfigCurrentId: number;
  private monitorSourceCurrentId: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.leaks = new Map();
    this.tags = new Map();
    this.developerIds = new Map();
    this.discordConfigs = new Map();
    this.monitorSources = new Map();
    
    this.userCurrentId = 1;
    this.fileCurrentId = 1;
    this.leakCurrentId = 1;
    this.tagCurrentId = 1;
    this.developerIdCurrentId = 1;
    this.discordConfigCurrentId = 1;
    this.monitorSourceCurrentId = 1;
    
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

  async searchLeaks(query: string, category?: string): Promise<Leak[]> {
    let results = Array.from(this.leaks.values());
    
    // Filter by category if provided
    if (category) {
      results = results.filter((leak) => leak.category === category);
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
  
  // Bot status operations
  private lastAutoDiscoveryTime: Date | null = null;
  
  async getLastAutoDiscoveryTime(): Promise<Date | null> {
    return this.lastAutoDiscoveryTime;
  }
  
  async setLastAutoDiscoveryTime(time: Date): Promise<void> {
    this.lastAutoDiscoveryTime = time;
  }
  
  async getLeaksCount(): Promise<number> {
    return this.leaks.size;
  }
  
  async getDeveloperCount(): Promise<number> {
    return this.developerIds.size;
  }

  // Developer ID operations
  async createDeveloperId(insertDeveloperId: InsertDeveloperId): Promise<DeveloperId> {
    const id = this.developerIdCurrentId++;
    const developerId: DeveloperId = {
      ...insertDeveloperId,
      id,
      lastUpdated: new Date(),
      previousIds: insertDeveloperId.previousIds || [],
      games: insertDeveloperId.games || [],
      isActive: insertDeveloperId.isActive ?? true,
      autoTrack: insertDeveloperId.autoTrack ?? true,
      verificationMethod: insertDeveloperId.verificationMethod || null,
      metaData: insertDeveloperId.metaData || null
    };
    this.developerIds.set(id, developerId);
    return developerId;
  }

  async getDeveloperId(id: number): Promise<DeveloperId | undefined> {
    return this.developerIds.get(id);
  }

  async getDeveloperIdByCurrentId(currentId: string): Promise<DeveloperId | undefined> {
    return Array.from(this.developerIds.values()).find(
      (dev) => dev.currentId === currentId
    );
  }

  async getDeveloperIdByName(developerName: string): Promise<DeveloperId | undefined> {
    return Array.from(this.developerIds.values()).find(
      (dev) => dev.developerName.toLowerCase() === developerName.toLowerCase()
    );
  }

  async updateDeveloperId(id: number, updates: Partial<InsertDeveloperId>): Promise<DeveloperId | undefined> {
    const dev = this.developerIds.get(id);
    if (!dev) return undefined;
    
    const updatedDev: DeveloperId = { 
      ...dev, 
      ...updates,
      lastUpdated: new Date()
    };
    this.developerIds.set(id, updatedDev);
    return updatedDev;
  }

  async getAllDeveloperIds(): Promise<DeveloperId[]> {
    return Array.from(this.developerIds.values());
  }

  async getActiveDeveloperIds(): Promise<DeveloperId[]> {
    return Array.from(this.developerIds.values()).filter(
      (dev) => dev.isActive
    );
  }

  async trackDeveloperIdHistory(id: number, newId: string): Promise<DeveloperId | undefined> {
    const dev = this.developerIds.get(id);
    if (!dev) return undefined;
    
    // Don't add duplicate IDs
    if (dev.currentId === newId) return dev;
    
    // Add current ID to previous IDs
    const previousIds = [...dev.previousIds];
    if (dev.currentId && !previousIds.includes(dev.currentId)) {
      previousIds.push(dev.currentId);
    }
    
    // Update with new ID
    const updatedDev: DeveloperId = {
      ...dev,
      currentId: newId,
      previousIds,
      lastUpdated: new Date()
    };
    
    this.developerIds.set(id, updatedDev);
    return updatedDev;
  }
}

export const storage = new MemStorage();
