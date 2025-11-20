/**
 * Enhanced Roblox Endpoints Registry
 * 
 * This file provides additional Roblox endpoints to scan for assets related to
 * badges, developer products, gamepasses, and game icons/thumbnails.
 * 
 * These endpoints are based on official Roblox API documentation and GitHub
 * repositories like noblox.js, roblox-js, and bloxy.
 */

import axios from 'axios';
import { nanoid } from 'nanoid';
import { storage } from '../storage';
import { AssetType, InsertAsset } from '@shared/schema';

// Base URLs for different Roblox API services
const BADGE_API_BASE = 'https://badges.roblox.com/v1/badges';
const DEVELOPER_PRODUCT_API_BASE = 'https://apis.roblox.com/developer-products/v1';
const GAME_PASS_API_BASE = 'https://apis.roblox.com/game-passes/v1';
const GAME_API_BASE = 'https://games.roblox.com/v1';
const THUMBNAILS_API_BASE = 'https://thumbnails.roblox.com/v1';
const ASSET_DELIVERY_API_BASE = 'https://assetdelivery.roblox.com/v1';
const GAME_THUMBNAILS_API_BASE = 'https://apis.roblox.com/game-thumbnails/v1';

// Headers for Roblox API requests
const HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'Pet Simulator 99 Leak Tracker/1.0'
};

// Pet Simulator 99 game ID
const PS99_GAME_ID = "8737899209";
// BIG Games Pets Group ID
const BIG_GAMES_GROUP_ID = "3959677";

/**
 * Enhanced endpoint scanner for additional Roblox content types
 */
export class EnhancedRobloxEndpoints {
  private lastRequestTime = 0;
  private domainBackoff: Map<string, number> = new Map();
  
  constructor() {
    console.log('Enhanced Roblox Endpoints scanner initialized');
  }
  
  /**
   * Extract domain from URL for rate limiting
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return 'unknown';
    }
  }
  
  /**
   * Wait for rate limit before making a request
   */
  private async waitForRateLimit(url: string): Promise<void> {
    const now = Date.now();
    const domain = this.extractDomain(url);
    
    // Get current backoff for this domain, default to 1 second
    const backoff = this.domainBackoff.get(domain) || 1000;
    
    // Calculate time to wait
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < backoff) {
      const waitTime = backoff - timeSinceLastRequest;
      console.log(`Rate limiting: Waiting ${waitTime}ms for ${domain}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Make a request with rate limiting and error handling
   */
  private async makeRequest(url: string, headers = HEADERS): Promise<any> {
    await this.waitForRateLimit(url);
    
    try {
      const response = await axios.get(url, { headers });
      
      // If request was successful, decrease backoff for this domain
      const domain = this.extractDomain(url);
      let currentBackoff = this.domainBackoff.get(domain) || 1000;
      // Only decrease if it's more than the minimum
      if (currentBackoff > 1000) {
        currentBackoff = Math.max(1000, Math.floor(currentBackoff * 0.8));
        this.domainBackoff.set(domain, currentBackoff);
      }
      
      return response;
    } catch (error: any) {
      const domain = this.extractDomain(url);
      
      // If rate limited, increase backoff for this domain
      if (error.response && error.response.status === 429) {
        const currentBackoff = this.domainBackoff.get(domain) || 1000;
        const newBackoff = Math.min(30000, currentBackoff * 2);
        this.domainBackoff.set(domain, newBackoff);
        
        console.log(`Rate limit exceeded for ${domain}. Increasing backoff to ${newBackoff}ms`);
        console.log(`Rate limited (429) for ${url}. Retry after ${newBackoff}ms backoff`);
      }
      
      throw error;
    }
  }
  
  /**
   * Process and save a discovered asset
   */
  private async processAndSaveAsset(
    assetId: string, 
    name: string, 
    type: AssetType, 
    thumbnail: string | null = null,
    metadata: any = {},
    sourceUrl: string | null = null,
    creator: string = 'BIG Games'
  ): Promise<void> {
    try {
      // Check if this asset already exists
      const existingAssets = await storage.getAssetsByRobloxId(assetId);
      
      if (existingAssets && existingAssets.length > 0) {
        const mostRecent = existingAssets[0];
        
        // Check if we need to update
        const hasRobloxData = mostRecent.metadata && 
                          typeof mostRecent.metadata === 'object' && 
                          Object.prototype.hasOwnProperty.call(mostRecent.metadata, 'robloxData');
        const hasNewRobloxData = metadata && 
                          typeof metadata === 'object' && 
                          Object.prototype.hasOwnProperty.call(metadata, 'robloxData');
        const needsUpdate = (
          (!mostRecent.thumbnail && thumbnail) ||
          (mostRecent.creator === 'Unknown' && creator) ||
          (!hasRobloxData && hasNewRobloxData)
        );
        
        if (needsUpdate) {
          // Create an update with new information
          const update = {
            ...mostRecent,
            thumbnail: mostRecent.thumbnail || thumbnail,
            creator: mostRecent.creator === 'Unknown' ? creator : mostRecent.creator,
            metadata: {
              ...(mostRecent.metadata || {}),
              ...metadata
            }
          };
          
          await storage.updateAsset(mostRecent.id, update);
          console.log(`✓ Updated existing asset ${mostRecent.id} for ${type} ${assetId}`);
        } else {
          console.log(`Asset ${assetId} already exists with complete data`);
        }
      } else {
        // Create a new asset
        const newAssetId = nanoid();
        await storage.createAsset({
          id: newAssetId,
          name,
          thumbnail,
          type,
          size: '0 bytes', // Will be updated later if we fetch the actual content
          game: 'Pet Simulator 99',
          creator,
          detectedAt: 'Just now',
          status: 'New',
          metadata: {
            format: 'json',
            ...metadata
          },
          robloxAssetId: assetId,
          sourceUrl: sourceUrl || `https://www.roblox.com/catalog/${assetId}/`
        });
        
        console.log(`✓ Created new asset for ${type} ${assetId}`);
      }
    } catch (error: any) {
      console.error(`Error saving asset ${assetId}:`, error.message);
    }
  }
  
  /**
   * Scan badges for a specific game
   */
  async scanGameBadges(gameId = PS99_GAME_ID): Promise<number> {
    console.log(`Scanning badges for game ${gameId}...`);
    let discoverCount = 0;
    
    try {
      // First get universe ID for the game
      const gameUrl = `${GAME_API_BASE}/games?universeIds=${gameId}`;
      const gameResponse = await this.makeRequest(gameUrl);
      
      if (gameResponse.data && gameResponse.data.data && gameResponse.data.data.length > 0) {
        const universeId = gameResponse.data.data[0].id;
        
        // Now get badges for this universe
        const badgesUrl = `${BADGE_API_BASE}?universeId=${universeId}&limit=100&sortOrder=Desc`;
        const badgesResponse = await this.makeRequest(badgesUrl);
        
        if (badgesResponse.data && badgesResponse.data.data) {
          const badges = badgesResponse.data.data;
          console.log(`Found ${badges.length} badges for game ${gameId}`);
          
          for (const badge of badges) {
            // Get badge details and icon
            const badgeUrl = `${BADGE_API_BASE}/${badge.id}`;
            const iconUrl = `${BADGE_API_BASE}/${badge.id}/icons`;
            
            // Try to get badge details
            try {
              const badgeResponse = await this.makeRequest(badgeUrl);
              const iconResponse = await this.makeRequest(iconUrl);
              
              if (badgeResponse.data && iconResponse.data) {
                const badgeData = badgeResponse.data;
                const iconData = iconResponse.data;
                
                // Use the badge data to save as an asset
                await this.processAndSaveAsset(
                  badge.id.toString(),
                  badgeData.name || `Badge ${badge.id}`,
                  'Badge',
                  iconData.data?.[0]?.imageUrl || null,
                  {
                    robloxData: {
                      assetType: 'Badge',
                      description: badgeData.description,
                      created: badgeData.created,
                      updated: badgeData.updated,
                      enabled: badgeData.enabled,
                      iconImageId: badgeData.iconImageId,
                      creatorId: badgeData.awardingUniverse?.id,
                      creatorName: badgeData.awardingUniverse?.name,
                      creatorType: 'Universe'
                    }
                  },
                  `https://www.roblox.com/badges/${badge.id}/`,
                  badgeData.awardingUniverse?.name || 'BIG Games'
                );
                
                discoverCount++;
              }
            } catch (error: any) {
              console.error(`Error fetching badge ${badge.id}:`, error.message);
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`Error scanning badges for game ${gameId}:`, error.message);
    }
    
    return discoverCount;
  }
  
  /**
   * Scan game passes for a specific game
   */
  async scanGamePasses(gameId = PS99_GAME_ID): Promise<number> {
    console.log(`Scanning game passes for game ${gameId}...`);
    let discoverCount = 0;
    
    try {
      // First get universe ID
      const gameUrl = `${GAME_API_BASE}/games?universeIds=${gameId}`;
      const gameResponse = await this.makeRequest(gameUrl);
      
      if (gameResponse.data && gameResponse.data.data && gameResponse.data.data.length > 0) {
        const universeId = gameResponse.data.data[0].id;
        
        // Get game passes
        const passesUrl = `https://games.roblox.com/v1/games/${universeId}/game-passes?limit=100&sortOrder=Desc`;
        const passesResponse = await this.makeRequest(passesUrl);
        
        if (passesResponse.data && passesResponse.data.data) {
          const passes = passesResponse.data.data;
          console.log(`Found ${passes.length} game passes for game ${gameId}`);
          
          for (const pass of passes) {
            try {
              // Get thumbnail for the pass
              const thumbnailUrl = `${THUMBNAILS_API_BASE}/game-passes?gamePassIds=${pass.id}&size=420x420&format=png`;
              const thumbnailResponse = await this.makeRequest(thumbnailUrl);
              
              let thumbnail = null;
              if (thumbnailResponse.data && thumbnailResponse.data.data && thumbnailResponse.data.data.length > 0) {
                thumbnail = thumbnailResponse.data.data[0].imageUrl;
              }
              
              // Save the game pass as an asset
              await this.processAndSaveAsset(
                pass.id.toString(),
                pass.name || `Game Pass ${pass.id}`,
                'Gamepass',
                thumbnail,
                {
                  robloxData: {
                    assetType: 'Gamepass',
                    price: pass.price,
                    creatorId: pass.seller?.id,
                    creatorName: pass.seller?.name,
                    creatorType: pass.seller?.type,
                    description: pass.description,
                    isForSale: pass.isForSale
                  }
                },
                `https://www.roblox.com/game-pass/${pass.id}/`,
                pass.seller?.name || 'BIG Games'
              );
              
              discoverCount++;
            } catch (error: any) {
              console.error(`Error fetching game pass ${pass.id}:`, error.message);
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`Error scanning game passes for game ${gameId}:`, error.message);
    }
    
    return discoverCount;
  }
  
  /**
   * Scan developer products for a specific game
   */
  async scanDeveloperProducts(gameId = PS99_GAME_ID): Promise<number> {
    console.log(`Scanning developer products for game ${gameId}...`);
    let discoverCount = 0;
    
    try {
      // First get universe ID
      const gameUrl = `${GAME_API_BASE}/games?universeIds=${gameId}`;
      const gameResponse = await this.makeRequest(gameUrl);
      
      if (gameResponse.data && gameResponse.data.data && gameResponse.data.data.length > 0) {
        const universeId = gameResponse.data.data[0].id;
        
        // Get developer products
        const productsUrl = `https://apis.roblox.com/developer-products/v1/universes/${universeId}/developer-products?limit=100`;
        const productsResponse = await this.makeRequest(productsUrl);
        
        if (productsResponse.data && productsResponse.data.developerProducts) {
          const products = productsResponse.data.developerProducts;
          console.log(`Found ${products.length} developer products for game ${gameId}`);
          
          for (const product of products) {
            try {
              // Get details and icons
              const productUrl = `https://apis.roblox.com/developer-products/v1/developer-products/${product.id}`;
              const iconUrl = `https://apis.roblox.com/developer-products/v1/developer-products/${product.id}/icons`;
              
              const productResponse = await this.makeRequest(productUrl);
              
              // Try to get icon but don't fail if it's not available
              let thumbnail = null;
              try {
                const iconResponse = await this.makeRequest(iconUrl);
                if (iconResponse.data && iconResponse.data.data && iconResponse.data.data.length > 0) {
                  thumbnail = iconResponse.data.data[0].imageUrl;
                }
              } catch (iconError) {
                // Just continue without icon
              }
              
              if (productResponse.data) {
                const productData = productResponse.data;
                
                // Save as asset
                await this.processAndSaveAsset(
                  product.id.toString(),
                  productData.name || `Developer Product ${product.id}`,
                  'DeveloperProduct',
                  thumbnail,
                  {
                    robloxData: {
                      assetType: 'DeveloperProduct',
                      description: productData.description,
                      price: productData.price,
                      creatorId: universeId,
                      creatorName: productData.universeId?.name || 'BIG Games',
                      creatorType: 'Universe'
                    }
                  },
                  `https://www.roblox.com/game-pass/${product.id}/`,
                  'BIG Games'
                );
                
                discoverCount++;
              }
            } catch (error: any) {
              console.error(`Error fetching developer product ${product.id}:`, error.message);
            }
          }
        }
      }
    } catch (error: any) {
      console.error(`Error scanning developer products for game ${gameId}:`, error.message);
    }
    
    return discoverCount;
  }
  
  /**
   * Scan localized game icons and thumbnails
   */
  async scanGameIcons(gameId = PS99_GAME_ID): Promise<number> {
    console.log(`Scanning game icons and thumbnails for game ${gameId}...`);
    let discoverCount = 0;
    
    try {
      // Get game icons
      const iconsUrl = `${GAME_THUMBNAILS_API_BASE}/games/${gameId}`;
      const iconsResponse = await this.makeRequest(iconsUrl);
      
      if (iconsResponse.data && iconsResponse.data.data) {
        const icons = iconsResponse.data.data;
        console.log(`Found ${icons.length} icons for game ${gameId}`);
        
        for (const icon of icons) {
          try {
            // Save as asset
            await this.processAndSaveAsset(
              `${gameId}-icon-${icon.languageCode || 'default'}`,
              `Game Icon: ${icon.languageCode || 'Default'}`,
              'Texture',
              icon.imageUrl,
              {
                robloxData: {
                  assetType: 'GameIcon',
                  languageCode: icon.languageCode,
                  altText: icon.altText,
                  imageId: icon.imageId,
                  creatorId: gameId,
                  creatorName: 'BIG Games',
                  creatorType: 'Universe'
                }
              },
              icon.imageUrl,
              'BIG Games'
            );
            
            discoverCount++;
          } catch (error: any) {
            console.error(`Error saving game icon:`, error.message);
          }
        }
      }
      
      // Get game thumbnails
      const thumbnailsUrl = `${THUMBNAILS_API_BASE}/games/icons?universeIds=${gameId}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`;
      const thumbnailsResponse = await this.makeRequest(thumbnailsUrl);
      
      if (thumbnailsResponse.data && thumbnailsResponse.data.data) {
        const thumbnails = thumbnailsResponse.data.data;
        console.log(`Found ${thumbnails.length} thumbnails for game ${gameId}`);
        
        for (const thumbnail of thumbnails) {
          try {
            // Save as asset
            await this.processAndSaveAsset(
              `${gameId}-thumbnail-${thumbnail.targetId}`,
              `Game Thumbnail`,
              'Texture',
              thumbnail.imageUrl,
              {
                robloxData: {
                  assetType: 'GameThumbnail',
                  state: thumbnail.state,
                  imageId: thumbnail.imageId,
                  creatorId: gameId,
                  creatorName: 'BIG Games',
                  creatorType: 'Universe'
                }
              },
              thumbnail.imageUrl,
              'BIG Games'
            );
            
            discoverCount++;
          } catch (error: any) {
            console.error(`Error saving game thumbnail:`, error.message);
          }
        }
      }
    } catch (error: any) {
      console.error(`Error scanning game icons for game ${gameId}:`, error.message);
    }
    
    return discoverCount;
  }
  
  /**
   * Run a full scan using all enhanced endpoints
   */
  async runFullScan(): Promise<any> {
    console.log('Starting enhanced Roblox endpoints scan...');
    const results = {
      totalDiscovered: 0,
      badgesDiscovered: 0,
      gamePassesDiscovered: 0,
      developerProductsDiscovered: 0,
      gameIconsDiscovered: 0
    };
    
    // Scan badges
    results.badgesDiscovered = await this.scanGameBadges();
    results.totalDiscovered += results.badgesDiscovered;
    
    // Scan game passes
    results.gamePassesDiscovered = await this.scanGamePasses();
    results.totalDiscovered += results.gamePassesDiscovered;
    
    // Scan developer products
    results.developerProductsDiscovered = await this.scanDeveloperProducts();
    results.totalDiscovered += results.developerProductsDiscovered;
    
    // Scan game icons
    results.gameIconsDiscovered = await this.scanGameIcons();
    results.totalDiscovered += results.gameIconsDiscovered;
    
    console.log(`Enhanced Roblox endpoints scan complete. Discovered ${results.totalDiscovered} assets.`);
    return results;
  }
}

// Create and export a singleton instance
export const enhancedRobloxEndpoints = new EnhancedRobloxEndpoints();