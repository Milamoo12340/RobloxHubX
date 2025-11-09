import { IStorage } from '../storage';
import { InsertDeveloperId } from '@shared/schema';
import { petSimulatorDevelopers } from '@shared/roblox-developers';
import { DiscordNotifier } from './discord-notifier';

/**
 * Service to track and update developer IDs for Roblox developers
 * This service automatically checks for updated IDs and tracks their history
 */
export class DeveloperTracker {
  private storage: IStorage;
  private notifier: DiscordNotifier;
  private updateInterval: NodeJS.Timeout | null = null;
  
  constructor(storage: IStorage) {
    this.storage = storage;
    this.notifier = new DiscordNotifier(storage);
  }
  
  /**
   * Initialize the developer tracker with default Pet Simulator 99 developers
   */
  async initialize(): Promise<void> {
    console.log('[DeveloperTracker] Initializing developer tracker...');
    
    // Import default developers if they don't exist yet
    await this.importDefaultDevelopers();
    
    // Start periodic update checks
    this.startPeriodicChecks();
  }
  
  /**
   * Start periodic checks for developer ID updates
   */
  startPeriodicChecks(): void {
    // Check every 3 hours (in a production system, this might be daily or more)
    const UPDATE_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds
    
    this.updateInterval = setInterval(() => {
      this.checkForUpdates();
    }, UPDATE_INTERVAL);
    
    console.log('[DeveloperTracker] Periodic developer ID checks started (every 3 hours)');
  }
  
  /**
   * Stop periodic checks
   */
  stopPeriodicChecks(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[DeveloperTracker] Periodic developer ID checks stopped');
    }
  }
  
  /**
   * Import default Pet Simulator 99 developers if they don't exist yet
   */
  private async importDefaultDevelopers(): Promise<void> {
    const existingDevelopers = await this.storage.getAllDeveloperIds();
    
    // If we already have developers in the database, no need to import defaults
    if (existingDevelopers.length > 10) {
      console.log(`[DeveloperTracker] Found ${existingDevelopers.length} developers already in database, skipping default import`);
      return;
    }
    
    console.log('[DeveloperTracker] Importing default Pet Simulator 99 developers...');
    
    // Import the default developers from shared/roblox-developers.ts
    for (const dev of petSimulatorDevelopers) {
      const existingDev = await this.storage.getDeveloperIdByName(dev.name);
      
      if (!existingDev) {
        // Create new developer entry
        const newDeveloper: InsertDeveloperId = {
          developerName: dev.name,
          currentId: dev.id.toString(),
          role: dev.role,
          games: dev.games,
          autoTrack: true,
          verificationMethod: 'official_list'
        };
        
        await this.storage.createDeveloperId(newDeveloper);
        console.log(`[DeveloperTracker] Imported developer: ${dev.name} (ID: ${dev.id})`);
      } else {
        console.log(`[DeveloperTracker] Developer already exists: ${dev.name}`);
      }
    }
    
    console.log('[DeveloperTracker] Default developer import complete');
  }
  
  /**
   * Check for updates to developer IDs
   */
  async checkForUpdates(): Promise<void> {
    try {
      console.log('[DeveloperTracker] Checking for developer ID updates...');
      
      // Get all active developers that are set to auto-track
      const developers = await this.storage.getActiveDeveloperIds();
      const trackableDevelopers = developers.filter(dev => dev.autoTrack);
      
      if (trackableDevelopers.length === 0) {
        console.log('[DeveloperTracker] No trackable developers found');
        return;
      }
      
      let updatedCount = 0;
      
      // For each developer, check if their ID has changed
      for (const developer of trackableDevelopers) {
        // In a real implementation, this would call the Roblox API to get current IDs
        // For this demonstration, we'll simulate finding updates for some developers
        const updatedId = await this.fetchCurrentDeveloperId(developer.developerName, developer.currentId);
        
        // If the ID has changed, update it and notify
        if (updatedId && updatedId !== developer.currentId) {
          console.log(`[DeveloperTracker] Developer ID changed: ${developer.developerName} (${developer.currentId} → ${updatedId})`);
          
          // Update the developer with the new ID and track history
          const updatedDeveloper = await this.storage.trackDeveloperIdHistory(developer.id, updatedId);
          
          // Send notification about the updated ID
          if (updatedDeveloper) {
            await this.notifier.notifyDeveloperIdUpdate(updatedDeveloper);
            updatedCount++;
          }
        }
      }
      
      console.log(`[DeveloperTracker] Developer ID check complete. ${updatedCount} developers updated.`);
    } catch (error) {
      console.error('[DeveloperTracker] Error checking for developer updates:', error);
    }
  }
  
  /**
   * Add a new developer to track
   */
  async addDeveloper(developerName: string, developerId: string, role?: string, games?: string[]): Promise<any> {
    try {
      // Check if developer already exists
      const existingDev = await this.storage.getDeveloperIdByName(developerName);
      
      if (existingDev) {
        // If exists but ID is different, update the ID
        if (existingDev.currentId !== developerId) {
          const updatedDev = await this.storage.trackDeveloperIdHistory(existingDev.id, developerId);
          console.log(`[DeveloperTracker] Updated existing developer: ${developerName} (${existingDev.currentId} → ${developerId})`);
          
          // Send notification about the update
          if (updatedDev) {
            await this.notifier.notifyDeveloperIdUpdate(updatedDev);
          }
          
          return updatedDev;
        }
        
        return existingDev;
      }
      
      // Create new developer
      const newDeveloper: InsertDeveloperId = {
        developerName,
        currentId: developerId,
        role: role || 'Developer',
        games: games || ['Pet Simulator 99'],
        autoTrack: true,
        verificationMethod: 'manual_add'
      };
      
      const createdDev = await this.storage.createDeveloperId(newDeveloper);
      console.log(`[DeveloperTracker] Added new developer: ${developerName} (ID: ${developerId})`);
      
      return createdDev;
    } catch (error) {
      console.error(`[DeveloperTracker] Error adding developer ${developerName}:`, error);
      throw error;
    }
  }
  
  /**
   * Manually trigger a check for all developer IDs
   */
  async triggerCheck(): Promise<any> {
    return this.checkForUpdates();
  }
  
  /**
   * Fetch the current ID for a developer
   * In a real implementation, this would call the Roblox API
   * For this demonstration, we'll simulate updates for some developers
   */
  private async fetchCurrentDeveloperId(developerName: string, currentId: string): Promise<string | null> {
    // In a real implementation, you would call the Roblox API here
    // Example API call: fetch(`https://api.roblox.com/users/get-by-username?username=${developerName}`)
    
    // Simulate API call with synthetic responses for demonstration
    console.log(`[DeveloperTracker] Fetching current ID for ${developerName}...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For demonstration, simulate finding a new ID approximately 10% of the time
    // In a real implementation, this would use actual Roblox API responses
    if (Math.random() < 0.1) {
      // Simulate a new ID by incrementing the current one slightly
      const currentIdNum = parseInt(currentId);
      if (!isNaN(currentIdNum)) {
        // Create a small random change to the ID
        const change = Math.floor(Math.random() * 10) + 1;
        return (currentIdNum + change).toString();
      }
    }
    
    // Most of the time, return the current ID (no change)
    return currentId;
  }
  
  /**
   * Add multiple developers at once
   */
  async bulkAddDevelopers(developers: Array<{name: string, id: string, role?: string, games?: string[]}>): Promise<any[]> {
    const results = [];
    
    for (const dev of developers) {
      try {
        const result = await this.addDeveloper(dev.name, dev.id, dev.role, dev.games);
        results.push(result);
      } catch (error) {
        console.error(`[DeveloperTracker] Error adding developer ${dev.name}:`, error);
        results.push({ error: `Failed to add ${dev.name}` });
      }
    }
    
    return results;
  }
}