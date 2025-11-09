import { IStorage } from "../storage";
import { 
  InsertFile, File, InsertLeak, Leak, Tag,
  InsertDiscordConfig, DiscordConfig,
  InsertMonitorSource, MonitorSource
} from "@shared/schema";
import { nanoid } from "nanoid";
import { 
  petSimulatorDevelopers, 
  isOfficialPetSimulatorDeveloper, 
  verifyPetSimulatorContent,
  PET_SIMULATOR_99_GAME_ID
} from "@shared/roblox-developers";
import { ContentDiscoveryService } from "./auto-discover";
import { DiscordNotifier } from './discord-notifier';
import { DeveloperTracker } from './developer-tracker';

// This file simulates Discord.js bot functionality
// In a real implementation, this would use the Discord.js library to connect to Discord

export enum CommandType {
  UPLOAD = 'upload',
  LEAK = 'leak',
  SEARCH = 'search',
  CATEGORIZE = 'categorize',
  VERIFY = 'verify',
  MONITOR = 'monitor',
  HELP = 'help'
}

export type UploadCommandOptions = {
  mode: string;
};

export type LeakCommandOptions = {
  id: string;
  channel: string;
};

export type SearchCommandOptions = {
  query: string;
  category?: string;
};

export type CategorizeCommandOptions = {
  id: string;
  category: string;
  tags: string[];
};

export type VerifyCommandOptions = {
  id: string;
  developerId?: number;
  gameName?: string;
  contentDescription?: string;
};

export type MonitorCommandOptions = {
  developerIds?: number[];
  gameFilter?: string;
  channelId: string;
  autoDiscover?: boolean;
  discoveryDepth?: number;
  keywordFilters?: string[];
};

export type CommandOptions = 
  | UploadCommandOptions
  | LeakCommandOptions
  | SearchCommandOptions
  | CategorizeCommandOptions
  | VerifyCommandOptions
  | MonitorCommandOptions
  | Record<string, never>;

export interface Command {
  type: CommandType;
  options: CommandOptions;
}

export class DiscordBot {
  private storage: IStorage;
  private discoveryService: ContentDiscoveryService;
  private discordNotifier: DiscordNotifier;
  private developerTracker: DeveloperTracker;
  
  private connected: boolean = false;
  
  constructor(storage: IStorage) {
    this.storage = storage;
    this.discoveryService = new ContentDiscoveryService(storage);
    this.discordNotifier = new DiscordNotifier(storage);
    this.developerTracker = new DeveloperTracker(storage);
    
    // Initialize developer tracker
    this.developerTracker.initialize();
    
    // Set initial connection status
    this.connected = true;
  }
  
  /**
   * Check if the bot is connected to Discord
   */
  isConnected(): boolean {
    return this.connected;
  }
  
  /**
   * Connect to Discord (simulated)
   */
  async connect(): Promise<boolean> {
    if (!this.connected) {
      console.log('Connecting Discord bot...');
      
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      this.connected = true;
      console.log('Discord bot connected successfully');
    }
    
    return this.connected;
  }
  
  /**
   * Disconnect from Discord (simulated)
   */
  async disconnect(): Promise<boolean> {
    if (this.connected) {
      console.log('Disconnecting Discord bot...');
      
      // Simulate disconnection process
      await new Promise(resolve => setTimeout(resolve, 300));
      
      this.connected = false;
      console.log('Discord bot disconnected');
    }
    
    return !this.connected;
  }
  
  /**
   * Run the auto-discovery process to find Pet Simulator 99 content from all developers
   * This method would be called periodically in a real bot implementation
   */
  async runAutoDiscovery(): Promise<any> {
    console.log('Running auto-discovery for Pet Simulator 99 content...');
    
    try {
      // Check for developer ID changes first
      await this.developerTracker.checkForUpdates();
      
      // Run content discovery
      const results = await this.discoveryService.runDiscovery();
      
      // Send notifications for each discovered source
      for (const result of results) {
        if (result.discoveredItems > 0) {
          await this.discordNotifier.notifyAutoDiscoveryResults(
            result.items,
            result.source
          );
        }
      }
      
      console.log(`Auto-discovery complete. Found content from ${results.length} sources.`);
      return results;
    } catch (error) {
      console.error('Error during auto-discovery:', error);
      return { error: 'Auto-discovery process failed' };
    }
  }
  
  async handleCommand(command: Command, username: string): Promise<any> {
    switch (command.type) {
      case CommandType.UPLOAD:
        return this.handleUploadCommand(command.options as UploadCommandOptions);
      
      case CommandType.LEAK:
        return this.handleLeakCommand(command.options as LeakCommandOptions, username);
      
      case CommandType.SEARCH:
        return this.handleSearchCommand(command.options as SearchCommandOptions);
      
      case CommandType.CATEGORIZE:
        return this.handleCategorizeCommand(command.options as CategorizeCommandOptions);
        
      case CommandType.VERIFY:
        return this.handleVerifyCommand(command.options as VerifyCommandOptions);
        
      case CommandType.MONITOR:
        return this.handleMonitorCommand(command.options as MonitorCommandOptions);
      
      case CommandType.HELP:
        return this.getHelpMessage();
      
      default:
        throw new Error("Unknown command type");
    }
  }
  
  async handleUploadCommand(options: UploadCommandOptions): Promise<string> {
    // This would initiate the file upload process in a real bot
    // Here we just return a response
    return `Please upload a Roblox ${options.mode} file.`;
  }
  
  async handleFileUpload(
    fileName: string,
    fileSize: number,
    fileType: string,
    fileData: string,
    userId: number
  ): Promise<File> {
    // Generate a unique asset ID
    const assetId = `asset_${nanoid(5)}`;
    
    // Create file entry
    const file: InsertFile = {
      filename: fileName,
      fileType: fileType as any,
      fileSize,
      uploaderId: userId,
      fileData,
      assetId
    };
    
    return await this.storage.createFile(file);
  }
  
  async handleLeakCommand(options: LeakCommandOptions, username: string): Promise<any> {
    const file = await this.storage.getFileByAssetId(options.id);
    if (!file) {
      throw new Error(`File with asset ID ${options.id} not found`);
    }
    
    // Get user
    const user = await this.storage.getUserByUsername(username);
    if (!user) {
      throw new Error(`User ${username} not found`);
    }
    
    // Determine file type category
    let category = 'other';
    let leakType = 'other';
    
    if (['png', 'jpg', 'jpeg'].includes(file.fileType)) {
      category = 'assets';
      leakType = 'asset';
    } else if (file.fileType === 'lua') {
      category = 'scripts';
      leakType = 'script';
    } else if (['rbxm', 'rbxl'].includes(file.fileType)) {
      category = 'models';
      leakType = 'model';
    } else if (['obj', 'fbx'].includes(file.fileType)) {
      category = 'models';
      leakType = 'model';
    } else if (['mp3', 'wav'].includes(file.fileType)) {
      category = 'assets';
      leakType = 'audio';
    }
    
    // Generate title based on filename
    const title = file.filename
      .replace(/\.[^/.]+$/, "") // Remove extension
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
      
    // Create leak entry
    const leak: InsertLeak = {
      fileId: file.id,
      title,
      description: `${title} leaked from Roblox game files.`,
      leakType: leakType as any,
      category,
      leakedBy: user.id,
      tags: ['New Content', getTagForFileType(file.fileType)],
      channelId: options.channel
    };
    
    return await this.storage.createLeak(leak);
  }
  
  async handleSearchCommand(options: SearchCommandOptions): Promise<Leak[]> {
    return await this.storage.searchLeaks(options.query, options.category);
  }
  
  async handleCategorizeCommand(options: CategorizeCommandOptions): Promise<any> {
    const file = await this.storage.getFileByAssetId(options.id);
    if (!file) {
      throw new Error(`File with asset ID ${options.id} not found`);
    }
    
    // Get leaks associated with this file
    const leaks = await this.storage.getLeaksByFileId(file.id);
    if (leaks.length === 0) {
      throw new Error(`No leaks found for asset ID ${options.id}`);
    }
    
    // Update the first leak with the new category and tags
    const leak = leaks[0];
    const updatedLeak: InsertLeak = {
      ...leak,
      category: options.category,
      tags: options.tags
    };
    
    // Delete the old leak and create a new one with updated data
    await this.storage.createLeak(updatedLeak);
    
    return updatedLeak;
  }
  
  getHelpMessage(): Record<string, any> {
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
  }
  
  async getTags(): Promise<Tag[]> {
    return await this.storage.getAllTags();
  }
  
  async handleVerifyCommand(options: VerifyCommandOptions): Promise<any> {
    // First, find the file by asset ID
    const file = await this.storage.getFileByAssetId(options.id);
    if (!file) {
      throw new Error(`File with asset ID ${options.id} not found`);
    }
    
    // Run verification based on provided information
    const metadata = {
      developerId: options.developerId,
      gameName: options.gameName || "Pet Simulator 99",
      contentDescription: options.contentDescription,
      gameId: PET_SIMULATOR_99_GAME_ID, // Default to Pet Simulator 99 game ID
      assetUrl: `https://www.roblox.com/library/${options.id}` // Construct a potential asset URL
    };
    
    // Use the verification function from roblox-developers.ts
    const verificationResult = verifyPetSimulatorContent(metadata);
    
    // If verified, add appropriate tags to the file's leaks
    if (verificationResult.isVerified) {
      const leaks = await this.storage.getLeaksByFileId(file.id);
      
      if (leaks.length > 0) {
        const leak = leaks[0];
        
        // Add appropriate verification tags
        let verificationTags = ['Verified Content'];
        
        if (verificationResult.confidence === 'high') {
          verificationTags.push('Official Developer');
        }
        
        if (verificationResult.developerInfo) {
          verificationTags.push(`${verificationResult.developerInfo.name}`);
        }
        
        // Create an updated leak with the new tags
        // Manually remove duplicates to avoid Set conversion issues
        const combinedTags = [...leak.tags];
        for (const tag of verificationTags) {
          if (!combinedTags.includes(tag)) {
            combinedTags.push(tag);
          }
        }
        
        const updatedLeak: InsertLeak = {
          ...leak,
          tags: combinedTags,
          gameName: 'Pet Simulator 99'
        };
        
        // Save the updated leak
        await this.storage.createLeak(updatedLeak);
      }
    }
    
    // Return the verification result
    return {
      file,
      verification: verificationResult,
      developerInfo: verificationResult.developerInfo ?
        verificationResult.developerInfo : 
        petSimulatorDevelopers // Return list of all developers if no match
    };
  }
  
  async handleMonitorCommand(options: MonitorCommandOptions): Promise<any> {
    // Get developer IDs to monitor, default to all Pet Simulator 99 developers if not specified
    const developerIdsToMonitor = options.developerIds || 
      petSimulatorDevelopers.map(dev => dev.id);
    
    // Get game filter, default to Pet Simulator 99
    const gameFilter = options.gameFilter || "Pet Simulator 99";
    
    // Set auto-discovery parameters, defaulting to true if not specified
    const autoDiscover = options.autoDiscover ?? true;
    const discoveryDepth = options.discoveryDepth ?? 2;
    
    // Default keyword filters for Pet Simulator 99 if not provided
    const keywordFilters = options.keywordFilters || [
      "pet simulator", "pet sim", "petsim99", "pet sim 99", 
      "big games", "preston", "pet", "simulator"
    ];
    
    // Check if there's already a Discord config for this server
    // For our demo, we'll use a placeholder server ID based on the channel ID
    const serverId = `server_${options.channelId.substring(0, 5)}`;
    let config = await this.storage.getDiscordConfigByServerId(serverId);
    
    // If no config exists, create one
    if (!config) {
      const insertConfig: InsertDiscordConfig = {
        serverId,
        serverName: "Pet Simulator 99 Leaks",
        monitoringChannel: options.channelId,
        inviteCode: null,
        isActive: true,
        pingRole: null,
        notificationSettings: JSON.stringify({
          newAssets: true,
          developerUpdates: true,
          gameUpdates: true,
          sendScreenshots: true,
          discoverContent: true // Enable content discovery
        })
      };
      
      config = await this.storage.createDiscordConfig(insertConfig);
    } else {
      // Update existing config to ensure it's active and using the right channel
      const updatedSettings = JSON.parse(config.notificationSettings);
      updatedSettings.discoverContent = true;
      
      config = await this.storage.updateDiscordConfig(config.id, {
        monitoringChannel: options.channelId,
        isActive: true,
        notificationSettings: JSON.stringify(updatedSettings)
      });
    }
    
    // Create monitoring sources for each developer
    const monitorPromises = developerIdsToMonitor.map(async (devId) => {
      const dev = petSimulatorDevelopers.find(d => d.id === devId);
      if (!dev) return null;
      
      // Check if this source already exists
      const existingSources = await this.storage.getMonitorSourcesByConfigId(config!.id);
      const existingSource = existingSources.find(s => 
        s.sourceType === 'developer' && s.sourceId === devId.toString()
      );
      
      if (existingSource) {
        // If it exists, update with new discovery settings
        return await this.storage.updateMonitorSource(existingSource.id, {
          isActive: true,
          autoDiscover,
          discoveryDepth,
          discoveryFilters: JSON.stringify({
            keywords: keywordFilters,
            gameId: PET_SIMULATOR_99_GAME_ID
          })
        });
      } else {
        // Create a new monitor source
        const insertSource: InsertMonitorSource = {
          configId: config!.id,
          sourceType: 'developer',
          sourceId: devId.toString(),
          sourceName: dev.name,
          isActive: true,
          autoDiscover,
          discoveryDepth,
          discoveryFilters: JSON.stringify({
            keywords: keywordFilters,
            gameId: PET_SIMULATOR_99_GAME_ID
          })
        };
        
        return await this.storage.createMonitorSource(insertSource);
      }
    });
    
    // Create a monitor source for the game itself
    const gameMonitorPromise = (async () => {
      const existingSources = await this.storage.getMonitorSourcesByConfigId(config!.id);
      const existingGameSource = existingSources.find(s => 
        s.sourceType === 'game' && s.sourceId === PET_SIMULATOR_99_GAME_ID.toString()
      );
      
      if (existingGameSource) {
        return await this.storage.updateMonitorSource(existingGameSource.id, {
          isActive: true,
          autoDiscover,
          discoveryDepth,
          discoveryFilters: JSON.stringify({
            keywords: keywordFilters,
            gameId: PET_SIMULATOR_99_GAME_ID
          })
        });
      } else {
        const insertSource: InsertMonitorSource = {
          configId: config!.id,
          sourceType: 'game',
          sourceId: PET_SIMULATOR_99_GAME_ID.toString(),
          sourceName: "Pet Simulator 99",
          isActive: true,
          autoDiscover,
          discoveryDepth,
          discoveryFilters: JSON.stringify({
            keywords: keywordFilters,
            gameId: PET_SIMULATOR_99_GAME_ID
          })
        };
        
        return await this.storage.createMonitorSource(insertSource);
      }
    })();
    
    // Add automatic discovery sources that track content from ANY developer referencing Pet Simulator 99
    const keywordMonitorPromises = keywordFilters.map(async (keyword) => {
      const existingSources = await this.storage.getMonitorSourcesByConfigId(config!.id);
      const existingKeywordSource = existingSources.find(s => 
        s.sourceType === 'keyword' && s.sourceId === keyword
      );
      
      if (existingKeywordSource) {
        return await this.storage.updateMonitorSource(existingKeywordSource.id, {
          isActive: true,
          autoDiscover: true, // Always auto-discover for keywords
          discoveryDepth: 3    // Search deeper for keywords
        });
      } else {
        const insertSource: InsertMonitorSource = {
          configId: config!.id,
          sourceType: 'keyword',
          sourceId: keyword,
          sourceName: `Auto-discover: ${keyword}`,
          isActive: true,
          autoDiscover: true,
          discoveryDepth: 3,
          discoveryFilters: JSON.stringify({
            keywords: [keyword],
            gameId: PET_SIMULATOR_99_GAME_ID
          })
        };
        
        return await this.storage.createMonitorSource(insertSource);
      }
    });
    
    // Create a generic monitor source that automatically finds content from any developer
    const autoMonitorPromise = (async () => {
      const existingSources = await this.storage.getMonitorSourcesByConfigId(config!.id);
      const existingAutoSource = existingSources.find(s => 
        s.sourceType === 'auto' && s.sourceId === 'pet_simulator_99_all'
      );
      
      if (existingAutoSource) {
        return await this.storage.updateMonitorSource(existingAutoSource.id, {
          isActive: true,
          autoDiscover: true,
          discoveryDepth: 3
        });
      } else {
        const insertSource: InsertMonitorSource = {
          configId: config!.id,
          sourceType: 'auto',
          sourceId: 'pet_simulator_99_all',
          sourceName: "All Pet Simulator 99 Content",
          isActive: true,
          autoDiscover: true,
          discoveryDepth: 3,
          discoveryFilters: JSON.stringify({
            keywords: keywordFilters,
            gameId: PET_SIMULATOR_99_GAME_ID,
            includeAllDevelopers: true
          })
        };
        
        return await this.storage.createMonitorSource(insertSource);
      }
    })();
    
    // Wait for all sources to be created/updated
    const allPromises = [
      ...monitorPromises, 
      gameMonitorPromise, 
      ...keywordMonitorPromises,
      autoMonitorPromise
    ];
    
    const monitorResults = await Promise.all(allPromises);
    const validResults = monitorResults.filter(r => r !== null);
    
    // Create a response with the monitoring configuration
    return {
      status: "Monitoring activated",
      channel: options.channelId,
      serverId: serverId,
      configId: config!.id,
      developers: developerIdsToMonitor.map(id => {
        const dev = petSimulatorDevelopers.find(d => d.id === id);
        return dev ? `${dev.name} (${dev.role})` : `Unknown Developer (ID: ${id})`;
      }),
      gameFilter,
      monitorSources: validResults.map(source => source?.sourceName),
      autoDiscovery: {
        enabled: autoDiscover,
        depth: discoveryDepth,
        keywords: keywordFilters,
        includeAllDevelopers: true
      },
      message: `Bot is now monitoring for new Pet Simulator 99 content from all developers. Auto-discovery is ${autoDiscover ? 'enabled' : 'disabled'}. Notifications will be sent to channel ${options.channelId}.`
    };
  }
}

// Helper function to map file type to appropriate tag
function getTagForFileType(fileType: string): string {
  switch (fileType) {
    case 'rbxm':
    case 'rbxl':
      return 'Model';
    case 'lua':
      return 'Script';
    case 'png':
    case 'jpg':
    case 'jpeg':
      return 'Image';
    case 'obj':
    case 'fbx':
      return 'Model';
    case 'mp3':
    case 'wav':
      return 'Audio';
    default:
      return 'Other';
  }
}
