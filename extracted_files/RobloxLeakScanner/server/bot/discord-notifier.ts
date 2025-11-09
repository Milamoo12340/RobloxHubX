import { IStorage } from '../storage';
import { Leak, MonitorSource, DeveloperId } from '@shared/schema';

/**
 * This service handles sending notifications to Discord when new content is discovered
 */
export class DiscordNotifier {
  private storage: IStorage;
  
  constructor(storage: IStorage) {
    this.storage = storage;
  }
  
  /**
   * Send a notification about a new leak to all configured Discord channels
   */
  async notifyNewLeak(leak: Leak): Promise<void> {
    try {
      console.log(`[DiscordNotifier] Sending notification for leak: ${leak.title}`);
      
      // Get file details
      const file = await this.storage.getFile(leak.fileId);
      if (!file) {
        console.error(`[DiscordNotifier] File not found for leak ID: ${leak.id}`);
        return;
      }
      
      // Get uploader details
      const uploader = await this.storage.getUser(leak.leakedBy);
      
      // Get all active Discord configs
      const configs = await this.storage.getAllDiscordConfigs();
      const activeConfigs = configs.filter(config => config.isActive);
      
      if (activeConfigs.length === 0) {
        console.log('[DiscordNotifier] No active Discord configurations found');
        return;
      }
      
      // For each config, check if it should receive this notification
      for (const config of activeConfigs) {
        if (!config.monitoringChannel) {
          console.log(`[DiscordNotifier] No monitoring channel set for server ${config.serverName}`);
          continue;
        }
        
        // Parse notification settings
        const settings = typeof config.notificationSettings === 'string' 
          ? JSON.parse(config.notificationSettings) 
          : config.notificationSettings;
        
        // Skip if notification settings don't match
        if (
          (leak.category === 'New Content' && !settings.newAssets) ||
          (leak.category === 'Developer Update' && !settings.developerUpdates) ||
          (leak.category === 'Game Update' && !settings.gameUpdates)
        ) {
          continue;
        }
        
        // In a real implementation, this would use a Discord.js client to send the message
        // For our demonstration, we'll log what would be sent
        
        const embedData = {
          title: leak.title,
          description: leak.description || 'No description provided',
          color: this.getCategoryColor(leak.category),
          fields: [
            {
              name: 'Category',
              value: leak.category,
              inline: true
            },
            {
              name: 'Type',
              value: leak.leakType,
              inline: true
            },
            {
              name: 'Tags',
              value: leak.tags.join(', ') || 'None',
              inline: false
            },
            {
              name: 'Game',
              value: leak.gameName || 'Pet Simulator 99',
              inline: true
            },
            {
              name: 'Discovered By',
              value: uploader?.username || 'System',
              inline: true
            }
          ],
          footer: {
            text: `Asset ID: ${file.assetId}`
          },
          timestamp: new Date().toISOString()
        };
        
        // If this is an image file and settings allow screenshots, add it to the embed
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        if (settings.sendScreenshots && imageExtensions.includes(file.fileType.toLowerCase())) {
          embedData['image'] = {
            url: `data:image/${file.fileType};base64,${file.fileData.substring(0, 20)}...` // Truncated for log
          };
        }
        
        console.log(`[DiscordNotifier] Would send to server ${config.serverName}, channel ${config.monitoringChannel}:`);
        console.log(`Embed: ${JSON.stringify({...embedData, image: embedData['image'] ? 'Image data included' : undefined})}`);
        
        // In real implementation: 
        // discordClient.channels.cache.get(config.monitoringChannel).send({ embeds: [embedData] });
        
        // Simulate Discord webhook - in real implementation this would use actual Discord API
        this.simulateDiscordWebhook(config.serverId, config.monitoringChannel, embedData);
      }
    } catch (error) {
      console.error('[DiscordNotifier] Error sending notification:', error);
    }
  }
  
  /**
   * Send notifications about new developer IDs being tracked
   */
  async notifyDeveloperIdUpdate(developerId: DeveloperId): Promise<void> {
    try {
      console.log(`[DiscordNotifier] Sending notification for developer ID update: ${developerId.developerName}`);
      
      // Get all active Discord configs with developerUpdates enabled
      const configs = await this.storage.getAllDiscordConfigs();
      const activeConfigs = configs.filter(config => {
        if (!config.isActive || !config.monitoringChannel) return false;
        
        const settings = typeof config.notificationSettings === 'string' 
          ? JSON.parse(config.notificationSettings) 
          : config.notificationSettings;
          
        return settings.developerUpdates;
      });
      
      if (activeConfigs.length === 0) {
        console.log('[DiscordNotifier] No active Discord configurations found for developer updates');
        return;
      }
      
      // Create notification embed
      const embedData = {
        title: `Developer ID Updated: ${developerId.developerName}`,
        description: 'A developer ID has been updated in our tracking system',
        color: 0x5865F2, // Discord blue
        fields: [
          {
            name: 'Developer',
            value: developerId.developerName,
            inline: true
          },
          {
            name: 'Current ID',
            value: developerId.currentId,
            inline: true
          },
          {
            name: 'Role',
            value: developerId.role || 'Developer',
            inline: true
          },
          {
            name: 'Previous IDs',
            value: developerId.previousIds.length > 0 
              ? developerId.previousIds.join(', ') 
              : 'None',
            inline: false
          },
          {
            name: 'Related Games',
            value: developerId.games.length > 0 
              ? developerId.games.join(', ') 
              : 'Unknown',
            inline: false
          }
        ],
        footer: {
          text: 'Auto-tracking system'
        },
        timestamp: new Date().toISOString()
      };
      
      // Send to all configured channels
      for (const config of activeConfigs) {
        console.log(`[DiscordNotifier] Would send developer update to server ${config.serverName}, channel ${config.monitoringChannel}`);
        
        // Simulate Discord webhook - in real implementation this would use actual Discord API
        this.simulateDiscordWebhook(config.serverId, config.monitoringChannel, embedData);
      }
    } catch (error) {
      console.error('[DiscordNotifier] Error sending developer ID notification:', error);
    }
  }
  
  /**
   * Send a notification about results from auto-discovery
   */
  async notifyAutoDiscoveryResults(results: any[], sourceName: string): Promise<void> {
    if (results.length === 0) {
      console.log('[DiscordNotifier] No results to notify for auto-discovery');
      return;
    }
    
    try {
      console.log(`[DiscordNotifier] Sending notification for auto-discovery results: ${results.length} items`);
      
      // Get all active Discord configs with auto-discovery notifications enabled
      const configs = await this.storage.getAllDiscordConfigs();
      const activeConfigs = configs.filter(config => {
        if (!config.isActive || !config.monitoringChannel) return false;
        
        const settings = typeof config.notificationSettings === 'string' 
          ? JSON.parse(config.notificationSettings) 
          : config.notificationSettings;
          
        return settings.newAssets;
      });
      
      if (activeConfigs.length === 0) {
        console.log('[DiscordNotifier] No active Discord configurations found for auto-discovery notifications');
        return;
      }
      
      // Create notification embed
      const embedData = {
        title: '🔍 Auto-Discovery Results',
        description: `Found ${results.length} new items related to Pet Simulator 99`,
        color: 0x22C55E, // Green
        fields: [
          {
            name: 'Source',
            value: sourceName,
            inline: true
          },
          {
            name: 'Time',
            value: new Date().toLocaleString(),
            inline: true
          },
          {
            name: 'Items Found',
            value: results.length.toString(),
            inline: true
          }
        ],
        footer: {
          text: 'Auto-discovery system'
        },
        timestamp: new Date().toISOString()
      };
      
      // Add some example results if available (limited to avoid huge messages)
      if (results.length > 0) {
        const exampleResults = results.slice(0, Math.min(3, results.length));
        const exampleText = exampleResults.map((result: any, index: number) => 
          `${index+1}. ${result.title || result.name || 'Unnamed asset'}`
        ).join('\\n');
        
        embedData.fields.push({
          name: 'Examples',
          value: exampleText,
          inline: false
        });
      }
      
      // Send to all configured channels
      for (const config of activeConfigs) {
        console.log(`[DiscordNotifier] Would send auto-discovery results to server ${config.serverName}, channel ${config.monitoringChannel}`);
        
        // Simulate Discord webhook - in real implementation this would use actual Discord API
        this.simulateDiscordWebhook(config.serverId, config.monitoringChannel, embedData);
      }
    } catch (error) {
      console.error('[DiscordNotifier] Error sending auto-discovery notification:', error);
    }
  }
  
  /**
   * Simulate sending a Discord webhook (for demonstration purposes)
   * In a real implementation, this would use the Discord API
   */
  private simulateDiscordWebhook(serverId: string, channelId: string, embedData: any): void {
    console.log(`[Discord Webhook] SERVER=${serverId} CHANNEL=${channelId}`);
    console.log(`[Discord Webhook] Embed:`, JSON.stringify({
      ...embedData,
      image: embedData.image ? '[Image data included]' : undefined,
      fields: embedData.fields.map((f: any) => ({...f, value: f.value.length > 50 ? f.value.substring(0, 50) + '...' : f.value}))
    }, null, 2));
  }
  
  /**
   * Get color code for different leak categories
   */
  private getCategoryColor(category: string): number {
    switch (category.toLowerCase()) {
      case 'new content':
        return 0x22C55E; // Green
      case 'developer update':
        return 0x3B82F6; // Blue
      case 'game update':
        return 0xF97316; // Orange
      case 'pet':
      case 'pets':
        return 0xEC4899; // Pink
      case 'map':
      case 'area':
      case 'areas':
        return 0x8B5CF6; // Purple
      case 'egg':
      case 'eggs':
        return 0xEAB308; // Yellow
      default:
        return 0x5865F2; // Discord blue
    }
  }
}