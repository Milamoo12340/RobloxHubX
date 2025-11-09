import { PET_SIMULATOR_99_GAME_ID } from "@shared/roblox-developers";
import { IStorage } from "../storage";
import { MonitorSource, InsertFile, InsertLeak, InsertUser } from "@shared/schema";
import { nanoid } from "nanoid";

/**
 * Service responsible for auto-discovering content related to Pet Simulator 99
 * across all developers on Roblox, not just the official ones
 */
export class ContentDiscoveryService {
  private storage: IStorage;
  private systemUser: number | null = null;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Check for developer ID changes during discovery
   */
  private async checkForDeveloperIdChanges(developerId: string, developerName: string): Promise<string> {
    // Get developer ID from storage
    const existingDev = await this.storage.getDeveloperIdByCurrentId(developerId);
    
    if (existingDev) {
      // Current ID matches, so return it
      return developerId;
    }
    
    // Check if we have this developer by name
    const devByName = await this.storage.getDeveloperIdByName(developerName);
    
    if (devByName) {
      // We found the developer by name but with a different ID
      // This indicates the ID has changed, so update it
      console.log(`Developer ID changed for ${developerName}: ${devByName.currentId} → ${developerId}`);
      
      // Track the ID change
      await this.storage.trackDeveloperIdHistory(devByName.id, developerId);
      
      return developerId;
    }
    
    // New developer we haven't seen before
    // Create new developer entry
    const newDeveloper = await this.storage.createDeveloperId({
      developerName,
      currentId: developerId,
      role: 'Developer',
      games: ['Pet Simulator 99'],
      autoTrack: true,
      verificationMethod: 'auto_discovery'
    });
    
    console.log(`Added new developer during discovery: ${developerName} (${developerId})`);
    
    return developerId;
  }

  /**
   * Get or create the system user for automatic discoveries
   */
  private async getSystemUser(): Promise<number> {
    if (this.systemUser) return this.systemUser;
    
    // Check if system user exists
    const systemUser = await this.storage.getUserByUsername("AutoDiscoveryBot");
    
    if (systemUser) {
      this.systemUser = systemUser.id;
      return systemUser.id;
    }
    
    // Create system user
    const user: InsertUser = {
      username: "AutoDiscoveryBot",
      password: nanoid(16) // Generate a random password
    };
    
    const createdUser = await this.storage.createUser(user);
    this.systemUser = createdUser.id;
    return createdUser.id;
  }
  
  /**
   * Run auto-discovery for all monitor sources that have auto-discovery enabled
   */
  async runDiscovery(): Promise<any[]> {
    const results: any[] = [];
    
    // Get all monitor sources with auto-discovery enabled
    const allSources = await this.storage.getAllMonitorSources();
    const discoveryEnabledSources = allSources.filter(source => 
      source.isActive && source.autoDiscover
    );
    
    // Process each source
    for (const source of discoveryEnabledSources) {
      const sourceResults = await this.discoverContentForSource(source);
      results.push({
        source: source.sourceName,
        discoveredItems: sourceResults.length,
        items: sourceResults
      });
      
      // Update the source with the last discovery results
      await this.storage.updateMonitorSource(source.id, {
        lastDiscoveryResults: JSON.stringify({
          timestamp: new Date(),
          itemsFound: sourceResults.length,
          items: sourceResults.map(item => ({
            title: item.title,
            id: item.id,
            type: item.type
          }))
        })
      });
    }
    
    return results;
  }
  
  /**
   * Discover content for a specific monitor source
   */
  private async discoverContentForSource(source: MonitorSource): Promise<any[]> {
    // Determine source type and run appropriate discovery
    switch (source.sourceType) {
      case 'developer': 
        return await this.discoverDeveloperContent(source);
      case 'game':
        return await this.discoverGameContent(source);
      case 'keyword':
        return await this.discoverKeywordContent(source);
      case 'auto':
        return await this.discoverAllPetSimContent(source);
      default:
        return [];
    }
  }
  
  /**
   * Discover content from a specific developer
   */
  private async discoverDeveloperContent(source: MonitorSource): Promise<any[]> {
    // Parse discovery filters
    const filters = source.discoveryFilters ? 
      JSON.parse(source.discoveryFilters) : 
      { keywords: [] };
    
    // In a real implementation, this would call Roblox API to get developer content
    // For demo purposes, we'll simulate finding content
    const discoveredItems = await this.simulateDiscoveryFromDeveloper(
      source.sourceId, 
      filters.keywords || [],
      source.discoveryDepth || 1
    );
    
    // Process and save discovered items
    return await this.processDiscoveredItems(discoveredItems, source);
  }
  
  /**
   * Discover content related to a specific game
   */
  private async discoverGameContent(source: MonitorSource): Promise<any[]> {
    // Parse discovery filters
    const filters = source.discoveryFilters ? 
      JSON.parse(source.discoveryFilters) : 
      { keywords: [] };
    
    // In a real implementation, this would call Roblox API to get game content
    // For demo purposes, we'll simulate finding content
    const discoveredItems = await this.simulateDiscoveryFromGame(
      source.sourceId, 
      filters.keywords || [],
      source.discoveryDepth || 1
    );
    
    // Process and save discovered items
    return await this.processDiscoveredItems(discoveredItems, source);
  }
  
  /**
   * Discover content based on keywords
   */
  private async discoverKeywordContent(source: MonitorSource): Promise<any[]> {
    // Parse discovery filters
    const filters = source.discoveryFilters ? 
      JSON.parse(source.discoveryFilters) : 
      { keywords: [] };
    
    // In a real implementation, this would search across all Roblox content
    // For demo purposes, we'll simulate finding content
    const discoveredItems = await this.simulateDiscoveryFromKeywords(
      filters.keywords || [source.sourceId],
      source.discoveryDepth || 2
    );
    
    // Process and save discovered items
    return await this.processDiscoveredItems(discoveredItems, source);
  }
  
  /**
   * Discover all content related to Pet Simulator 99 from any developer
   */
  private async discoverAllPetSimContent(source: MonitorSource): Promise<any[]> {
    // Parse discovery filters
    const filters = source.discoveryFilters ? 
      JSON.parse(source.discoveryFilters) : 
      { keywords: [], includeAllDevelopers: true };
    
    // In a real implementation, this would be a comprehensive Roblox search
    // For demo purposes, we'll simulate finding content
    const discoveredItems = await this.simulateGeneralPetSimDiscovery(
      filters.keywords || [],
      source.discoveryDepth || 3,
      filters.includeAllDevelopers || true
    );
    
    // Process and save discovered items
    return await this.processDiscoveredItems(discoveredItems, source);
  }
  
  /**
   * Process discovered items and save them to storage
   */
  private async processDiscoveredItems(items: any[], source: MonitorSource): Promise<any[]> {
    const systemUserId = await this.getSystemUser();
    const results = [];
    
    for (const item of items) {
      try {
        // Create file record
        const file: InsertFile = {
          filename: `${item.title}.${item.fileExt || 'png'}`,
          fileType: item.fileType || 'png',
          fileSize: item.fileSize || Math.floor(Math.random() * 1000000) + 10000,
          uploaderId: systemUserId,
          fileData: item.data || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', // Base64 placeholder
          assetId: item.assetId || `asset_${nanoid(5)}`
        };
        
        const savedFile = await this.storage.createFile(file);
        
        // Create leak record
        const leak: InsertLeak = {
          fileId: savedFile.id,
          title: item.title,
          description: item.description || `Auto-discovered Pet Simulator 99 content: ${item.title}`,
          leakType: 'automatic',
          category: item.category || 'auto-discovered',
          leakedBy: systemUserId,
          tags: ['Auto-Discovered', 'Pet Simulator 99', ...this.getTagsForItem(item)],
          channelId: null, // Will be set when sent to Discord
          gameName: 'Pet Simulator 99'
        };
        
        const savedLeak = await this.storage.createLeak(leak);
        
        results.push({
          id: savedLeak.id,
          title: leak.title,
          type: leak.leakType,
          file: savedFile,
          tags: leak.tags
        });
      } catch (error) {
        console.error(`Error processing discovered item: ${error}`);
      }
    }
    
    return results;
  }
  
  /**
   * Generate appropriate tags based on the discovered item
   */
  private getTagsForItem(item: any): string[] {
    const tags = [];
    
    if (item.type === 'model') {
      tags.push('Model');
    } else if (item.type === 'script') {
      tags.push('Script');
    } else if (item.type === 'image' || item.type === 'texture') {
      tags.push('Image');
    } else if (item.type === 'audio') {
      tags.push('Audio');
    }
    
    if (item.keywords) {
      if (item.keywords.includes('pet')) {
        tags.push('Pets');
      }
      if (item.keywords.includes('area') || item.keywords.includes('zone')) {
        tags.push('Areas');
      }
      if (item.keywords.includes('egg')) {
        tags.push('Eggs');
      }
      if (item.keywords.includes('coin') || item.keywords.includes('gems') || item.keywords.includes('currency')) {
        tags.push('Currency');
      }
    }
    
    return tags;
  }
  
  /**
   * Simulate discovering content from a developer
   * In a real implementation, this would call the Roblox API
   */
  private async simulateDiscoveryFromDeveloper(developerId: string, keywords: string[], depth: number): Promise<any[]> {
    // This is a simulation - in a real bot this would connect to Roblox API
    const items = [];
    const types = ['model', 'script', 'image', 'audio'];
    const categories = ['pets', 'areas', 'eggs', 'currency', 'mechanics'];
    
    // Generate random items (in a real bot, this would be actual Roblox content)
    const numItems = Math.min(5, depth * 2); // More depth = more items, max 5
    
    for (let i = 0; i < numItems; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      items.push({
        title: `Pet Simulator 99 ${category} ${type} ${i + 1}`,
        description: `Discovered ${type} related to ${category} in Pet Simulator 99 by developer ${developerId}`,
        type,
        category: `auto-${category}`,
        keywords: [category, 'pet simulator', 'pet sim 99'],
        assetId: `asset_${nanoid(5)}`,
        fileType: this.getFileTypeForContentType(type),
        fileExt: this.getFileExtForContentType(type),
        fileSize: Math.floor(Math.random() * 1000000) + 10000,
        discoveredFrom: {
          type: 'developer',
          id: developerId
        }
      });
    }
    
    return items;
  }
  
  /**
   * Simulate discovering content from a game
   */
  private async simulateDiscoveryFromGame(gameId: string, keywords: string[], depth: number): Promise<any[]> {
    // This is a simulation - in a real bot this would connect to Roblox API
    const items = [];
    const types = ['model', 'script', 'image', 'audio'];
    const categories = ['pets', 'areas', 'eggs', 'currency', 'mechanics', 'ui', 'achievements'];
    
    // Generate random items (in a real bot, this would be actual Roblox content)
    const numItems = Math.min(8, depth * 3); // More depth = more items, max 8
    
    for (let i = 0; i < numItems; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      items.push({
        title: `Pet Sim 99 ${category} ${type} ${i + 1}`,
        description: `Discovered ${type} from game ${gameId} related to ${category}`,
        type,
        category: `auto-${category}`,
        keywords: [category, 'pet simulator', 'pet sim 99'],
        assetId: `asset_${nanoid(5)}`,
        fileType: this.getFileTypeForContentType(type),
        fileExt: this.getFileExtForContentType(type),
        fileSize: Math.floor(Math.random() * 1000000) + 10000,
        discoveredFrom: {
          type: 'game',
          id: gameId
        }
      });
    }
    
    return items;
  }
  
  /**
   * Simulate discovering content from keywords
   */
  private async simulateDiscoveryFromKeywords(keywords: string[], depth: number): Promise<any[]> {
    // This is a simulation - in a real bot this would search Roblox catalog
    const items = [];
    const types = ['model', 'script', 'image', 'audio'];
    const keywordOptions = keywords.length > 0 ? keywords : ['pet simulator', 'pet sim 99'];
    
    // Generate random items (in a real bot, this would be actual Roblox content)
    const numItems = Math.min(10, depth * 4); // More depth = more items, max 10
    
    for (let i = 0; i < numItems; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const keyword = keywordOptions[Math.floor(Math.random() * keywordOptions.length)];
      
      items.push({
        title: `${keyword} ${type} discovery ${i + 1}`,
        description: `Auto-discovered content matching keyword "${keyword}"`,
        type,
        category: 'keyword-search',
        keywords: [keyword, 'pet simulator'],
        assetId: `asset_${nanoid(5)}`,
        fileType: this.getFileTypeForContentType(type),
        fileExt: this.getFileExtForContentType(type),
        fileSize: Math.floor(Math.random() * 1000000) + 10000,
        discoveredFrom: {
          type: 'keyword',
          keyword
        }
      });
    }
    
    return items;
  }
  
  /**
   * Simulate discovering all Pet Simulator 99 content
   */
  private async simulateGeneralPetSimDiscovery(keywords: string[], depth: number, includeAllDevelopers: boolean): Promise<any[]> {
    // This is a simulation - in a real bot this would be a comprehensive search
    const items = [];
    const types = ['model', 'script', 'image', 'audio'];
    const categories = ['pets', 'areas', 'eggs', 'currency', 'mechanics', 'ui', 'test', 'unreleased'];
    
    // Generate random items (in a real bot, this would be actual Roblox content)
    const numItems = Math.min(15, depth * 5); // More depth = more items, max 15
    
    // Include "test area" content that might be from unofficial developers
    const developerTypes = ['official', 'unofficial', 'test', 'community'];
    
    for (let i = 0; i < numItems; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const developerType = developerTypes[Math.floor(Math.random() * developerTypes.length)];
      
      let title = `Pet Simulator 99 ${category} ${i + 1}`;
      let description = `Auto-discovered ${category} content for Pet Simulator 99`;
      
      if (developerType === 'test') {
        title = `Test ${title}`;
        description = `Test area content: ${description}`;
      } else if (developerType === 'unofficial') {
        title = `Unofficial ${title}`;
        description = `Community-created content: ${description}`;
      } else if (developerType === 'community') {
        title = `Community ${title}`;
        description = `Fan-made content: ${description}`;
      }
      
      items.push({
        title,
        description,
        type,
        category: `auto-${category}`,
        keywords: [category, 'pet simulator', 'pet sim 99'],
        assetId: `asset_${nanoid(5)}`,
        fileType: this.getFileTypeForContentType(type),
        fileExt: this.getFileExtForContentType(type),
        fileSize: Math.floor(Math.random() * 1000000) + 10000,
        discoveredFrom: {
          type: 'auto',
          developerType
        }
      });
    }
    
    return items;
  }
  
  /**
   * Get the appropriate file type for content
   */
  private getFileTypeForContentType(contentType: string): string {
    switch (contentType) {
      case 'model':
        return 'rbxm';
      case 'script':
        return 'lua';
      case 'image':
        return 'png';
      case 'audio':
        return 'mp3';
      default:
        return 'other';
    }
  }
  
  /**
   * Get the appropriate file extension for content
   */
  private getFileExtForContentType(contentType: string): string {
    switch (contentType) {
      case 'model':
        return 'rbxm';
      case 'script':
        return 'lua';
      case 'image':
        return 'png';
      case 'audio':
        return 'mp3';
      default:
        return 'txt';
    }
  }
}