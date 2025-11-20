/**
 * Auto Discovery Service for Pet Simulator 99 Leaks
 * This service automatically discovers and processes new leaks from various sources
 */

const { RobloxAPIService } = require('./roblox-api.cjs');
const { petSimulatorDevelopers, PET_SIMULATOR_99_GAME_ID, assetTypes } = require('./shared/roblox-developers.cjs');
const leakedAssetsData = require('./shared/leaked-assets-data.cjs');
const db = require('./db.cjs');

class AutoDiscoveryService {
  constructor() {
    this.robloxApi = new RobloxAPIService();
    this.knownAssetIds = new Set();
    this.lastDiscoveryTimestamp = new Date().toISOString();
    
    // Load known assets
    this.loadKnownAssets();
  }
  
  /**
   * Load already known assets to avoid duplicates
   */
  async loadKnownAssets() {
    try {
      // If we're using a database, load known assets from there
      if (db.pool) {
        const result = await db.query('SELECT asset_id FROM files WHERE asset_id IS NOT NULL');
        result.rows.forEach(row => {
          if (row.asset_id) {
            this.knownAssetIds.add(row.asset_id);
          }
        });
        console.log(`Loaded ${this.knownAssetIds.size} known asset IDs from database`);
      } else {
        // Otherwise load from local data
        const allAssets = leakedAssetsData.getAllAssets();
        allAssets.forEach(asset => {
          if (asset.assetId) {
            this.knownAssetIds.add(asset.assetId);
          }
        });
        console.log(`Loaded ${this.knownAssetIds.size} known asset IDs from local data`);
      }
    } catch (error) {
      console.error('Error loading known assets:', error);
    }
  }
  
  /**
   * Run the auto-discovery process on all sources
   * @returns {Promise<Array>} Array of discovery results by source
   */
  async runDiscovery() {
    console.log('Running auto-discovery process...');
    
    const results = [];
    const startTime = Date.now();
    
    // Discover from all Pet Simulator developers
    for (const developer of petSimulatorDevelopers) {
      try {
        console.log(`Checking developer ${developer.username} (${developer.id})...`);
        const discoveredAssets = await this.discoverDeveloperAssets(developer.id);
        
        if (discoveredAssets.length > 0) {
          console.log(`Found ${discoveredAssets.length} new assets from ${developer.username}`);
          results.push({
            developer: developer.username,
            developerId: developer.id,
            itemsFound: discoveredAssets.length,
            items: discoveredAssets
          });
        } else {
          console.log(`No new assets found from ${developer.username}`);
        }
      } catch (error) {
        console.error(`Error checking developer ${developer.username}:`, error);
      }
    }
    
    // Discover from Pet Simulator 99 game listing
    try {
      console.log('Checking Pet Simulator 99 game updates...');
      const gameUpdates = await this.checkGameUpdates(PET_SIMULATOR_99_GAME_ID);
      
      if (gameUpdates.length > 0) {
        console.log(`Found ${gameUpdates.length} game updates`);
        results.push({
          source: 'Pet Simulator 99 Game',
          itemsFound: gameUpdates.length,
          items: gameUpdates
        });
      } else {
        console.log('No game updates found');
      }
    } catch (error) {
      console.error('Error checking game updates:', error);
    }
    
    const duration = (Date.now() - startTime) / 1000;
    console.log(`Auto-discovery process completed in ${duration.toFixed(2)}s`);
    
    // Update the last discovery timestamp
    this.lastDiscoveryTimestamp = new Date().toISOString();
    
    return results;
  }
  
  /**
   * Discover assets from a Roblox developer
   * @param {number} developerId - Roblox developer ID
   * @returns {Promise<Array>} Array of discovered assets
   */
  async discoverDeveloperAssets(developerId) {
    try {
      // First check if the developer exists
      const exists = await this.robloxApi.checkDeveloperExists(developerId);
      if (!exists) {
        console.log(`Developer ${developerId} does not exist or is unavailable`);
        return [];
      }
      
      // Get assets from the developer
      const assets = await this.robloxApi.getDeveloperAssets(developerId);
      
      // Filter for new assets only
      const newAssets = assets.filter(asset => {
        // Skip already known assets
        if (this.knownAssetIds.has(asset.id.toString())) {
          return false;
        }
        
        // Add to known assets
        this.knownAssetIds.add(asset.id.toString());
        return true;
      });
      
      // Process the new assets
      const processedAssets = [];
      for (const asset of newAssets) {
        try {
          // Get more details about the asset
          const assetDetails = await this.robloxApi.getAsset(asset.id);
          
          // Get thumbnail URL
          const thumbnailResponse = await this.robloxApi.getAssetThumbnails(asset.id);
          const thumbnailUrl = thumbnailResponse?.data?.[0]?.imageUrl || null;
          
          const processedAsset = {
            assetId: asset.id.toString(),
            name: asset.name || assetDetails?.Name || 'Unknown Asset',
            description: assetDetails?.Description || 'No description available',
            type: this.determineAssetType(asset),
            thumbnailUrl,
            leakDate: new Date().toISOString(),
            verified: false,
            tags: [],
            developerId,
            gameId: PET_SIMULATOR_99_GAME_ID,
            gameName: 'Pet Simulator 99',
            source: 'auto-discovery'
          };
          
          // Store the processed asset
          processedAssets.push(processedAsset);
          
          // Store in database if available
          if (db.pool) {
            await this.storeDiscoveredAsset(processedAsset);
          }
        } catch (error) {
          console.error(`Error processing asset ${asset.id}:`, error);
        }
      }
      
      return processedAssets;
    } catch (error) {
      console.error(`Error discovering assets for developer ${developerId}:`, error);
      return [];
    }
  }
  
  /**
   * Check for updates to Pet Simulator 99 game
   * @param {string} gameId - Roblox game ID
   * @returns {Promise<Array>} Array of discovered updates
   */
  async checkGameUpdates(gameId) {
    try {
      // Create a hash of the current timestamp to use as ID
      const timestamp = Date.now().toString(36);
      const updateId = `gs_${timestamp}`;
      
      // Use a different URL that doesn't require authentication
      const url = `https://games.roblox.com/v1/games?universeIds=${gameId}`;
      const response = await this.robloxApi.makeRequest(url, 'GET', null, 'GAMES');
      
      if (!response || !response.data || response.data.length === 0) {
        console.log(`No game data found for ${gameId}`);
        return [];
      }
      
      const gameData = response.data[0];
      const updateInfo = {
        assetId: updateId,
        name: `${gameData.name} Update`,
        description: `Last updated: ${gameData.updated}`,
        type: 'gameupdate',
        thumbnailUrl: null,
        leakDate: new Date().toISOString(),
        verified: true,
        tags: ['game-update'],
        developerId: gameData.creator.id,
        developerName: gameData.creator.name,
        gameId,
        gameName: gameData.name,
        source: 'game-status'
      };
      
      // Try to get the game thumbnail
      try {
        const thumbnailResponse = await this.robloxApi.makeRequest(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${gameId}&size=512x512&format=Png`, 
          'GET', null, 'THUMBNAILS'
        );
        if (thumbnailResponse?.data?.[0]?.imageUrl) {
          updateInfo.thumbnailUrl = thumbnailResponse.data[0].imageUrl;
        }
      } catch (error) {
        console.error('Error getting game thumbnail:', error);
      }
      
      return [updateInfo];
    } catch (error) {
      console.error(`Error checking game updates for ${gameId}:`, error);
      return [];
    }
  }
  
  /**
   * Determine the asset type based on properties
   * @param {Object} asset - Asset data
   * @returns {string} Asset type
   */
  determineAssetType(asset) {
    // Try to determine from asset.type or asset.assetType if available
    if (asset.type) {
      // Convert type to lowercase for easier matching
      const lowerType = asset.type.toLowerCase();
      
      // Find the appropriate assetType
      for (const type of assetTypes) {
        if (lowerType.includes(type.id.toLowerCase())) {
          return type.id;
        }
      }
    }
    
    // Default to 'model' if we can't determine
    return 'model';
  }
  
  /**
   * Store a discovered asset in the database
   * @param {Object} asset - Asset data
   * @returns {Promise<boolean>} Success status
   */
  async storeDiscoveredAsset(asset) {
    if (!db.pool) {
      return false;
    }
    
    try {
      // First create a file entry
      const fileResult = await db.query(
        `INSERT INTO files 
         (filename, file_type, file_size, uploader_id, file_data, asset_id) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id`,
        [
          asset.name,
          'roblox_asset',
          0, // File size is 0 for discovered assets
          1, // System user ID
          JSON.stringify(asset),
          asset.assetId
        ]
      );
      
      if (!fileResult.rows || fileResult.rows.length === 0) {
        throw new Error('File insertion failed');
      }
      
      const fileId = fileResult.rows[0].id;
      
      // Then create a leak entry
      const leakResult = await db.query(
        `INSERT INTO leaks 
         (file_id, title, description, leak_type, category, game_name, leaked_by, tags, channel_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING id`,
        [
          fileId,
          asset.name,
          asset.description,
          'automatic', // Leak type is 'automatic' for discovered assets
          asset.type,
          asset.gameName,
          1, // System user ID
          asset.tags || [],
          null // No channel ID for automatic discoveries
        ]
      );
      
      return Boolean(leakResult.rows && leakResult.rows.length > 0);
    } catch (error) {
      console.error('Error storing discovered asset:', error);
      return false;
    }
  }
  
  /**
   * Get the timestamp of the last discovery run
   * @returns {string} ISO timestamp
   */
  getLastDiscoveryTimestamp() {
    return this.lastDiscoveryTimestamp;
  }
}

module.exports = { AutoDiscoveryService };