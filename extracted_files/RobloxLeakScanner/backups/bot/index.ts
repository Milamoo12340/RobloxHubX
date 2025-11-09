import { DiscordBot } from './discord';
import { parseCommand } from './commands';
import { IStorage } from '../storage';

/**
 * This class represents the main Bot service that handles commands
 * from the client and routes them to the appropriate handlers.
 */
export class BotService {
  private bot: DiscordBot;
  private autoDiscoveryInterval: NodeJS.Timeout | null = null;
  
  constructor(storage: IStorage) {
    this.bot = new DiscordBot(storage);
    
    // Start the auto-discovery process
    this.startAutoDiscovery();
  }
  
  /**
   * Handles commands sent from the client
   */
  async handleCommand(commandText: string, username: string): Promise<any> {
    try {
      // Parse the command from text format to a structured command
      const command = parseCommand(commandText);
      
      if (!command) {
        return {
          error: "Invalid command format. Try /help to see available commands."
        };
      }
      
      // Process the command using the Discord bot
      return await this.bot.handleCommand(command, username);
    } catch (error: any) {
      console.error(`Error handling command: ${error.message}`);
      return {
        error: error.message || "An error occurred while processing the command."
      };
    }
  }
  
  /**
   * Handles file uploads from the client
   */
  async handleFileUpload(
    fileName: string,
    fileSize: number,
    fileType: string,
    fileData: string,
    userId: number
  ): Promise<any> {
    try {
      return await this.bot.handleFileUpload(
        fileName,
        fileSize,
        fileType,
        fileData,
        userId
      );
    } catch (error: any) {
      console.error(`Error handling file upload: ${error.message}`);
      return {
        error: error.message || "An error occurred while processing the file upload."
      };
    }
  }
  
  /**
   * Start the auto-discovery process that runs periodically
   */
  private startAutoDiscovery() {
    // Run discovery every 15 minutes (in a real implementation, might be longer)
    const DISCOVERY_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    // Run an initial discovery
    this.runDiscovery();
    
    // Set up periodic discovery
    this.autoDiscoveryInterval = setInterval(() => {
      this.runDiscovery();
    }, DISCOVERY_INTERVAL);
    
    console.log('Auto-discovery service started. Will run every 15 minutes.');
  }
  
  /**
   * Stop the auto-discovery process
   */
  stopAutoDiscovery() {
    if (this.autoDiscoveryInterval) {
      clearInterval(this.autoDiscoveryInterval);
      this.autoDiscoveryInterval = null;
      console.log('Auto-discovery service stopped.');
    }
  }
  
  /**
   * Run a single discovery cycle
   */
  private async runDiscovery() {
    try {
      console.log('Running auto-discovery for Pet Simulator 99 content...');
      const results = await this.bot.runAutoDiscovery();
      console.log(`Auto-discovery complete. Found content from ${results.length} sources.`);
      
      // In a real implementation, this would send notifications to Discord channels
      // based on the discovered content
      
      return results;
    } catch (error: any) {
      console.error(`Error during auto-discovery: ${error.message}`);
    }
  }
  
  /**
   * Manually trigger an auto-discovery run
   */
  async triggerDiscovery(): Promise<any> {
    return await this.runDiscovery();
  }
}