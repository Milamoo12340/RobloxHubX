/**
 * PS99 Asset Scanner
 * 
 * Comprehensive scanner using PUBLIC Roblox APIs (no authentication required):
 * - catalog.roblox.com/v1/search/items - Search by creator/keyword
 * - inventory.roblox.com/v2/users/{id}/inventory - User inventory
 * - marketplace.roblox.com/search - Marketplace search
 * - groups.roblox.com/v1/groups/{id}/assets - Group assets
 * - Game passes, badges, developer products
 * - Universe/place updates
 * 
 * FILTERS: Only returns assets from last 72 hours
 */

import { robloxProxy } from "./roblox-proxy-service";
import { ALL_PS99_DEVELOPERS, ROBLOX_API, LEAK_KEYWORDS } from "../shared/ps99-constants.js";
import { insertPS99AssetSchema, type InsertPS99Asset } from "../shared/schema.js";

const PS99_UNIVERSE_ID = 3317771874;
const PS99_PLACE_ID = 8737899170;
const HOURS_72_MS = 72 * 60 * 60 * 1000;

interface ScanResult {
  type: 'decal' | 'image' | 'gamepass' | 'badge' | 'developer_product' | 'place_update' | 'catalog_item' | 'marketplace_item' | 'inventory_item' | 'group_asset';
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  price?: number;
  created?: string;
  updated?: string;
  metadata?: Record<string, any>;
  discoveredAt: string;
}

export class PS99Scanner {
  private results: ScanResult[] = [];
  private scanProgress = 0;
  private totalSteps = 0;
  private isScanning = false;

  async scanAll(): Promise<{
    results: ScanResult[];
    stats: {
      total: number;
      decals: number;
      images: number;
      gamepasses: number;
      badges: number;
      developerProducts: number;
      placeUpdates: number;
      catalogItems: number;
      marketplaceItems: number;
      inventoryItems: number;
      groupAssets: number;
    };
    duration: number;
  }> {
    if (this.isScanning) {
      throw new Error("Scan already in progress");
    }

    const startTime = Date.now();
    this.isScanning = true;
    this.results = [];
    this.scanProgress = 0;
    this.totalSteps = 11; // Updated total steps

    try {
      console.log('🔍 Starting comprehensive PS99 asset scan...');
      console.log('⏰ Filtering to assets from last 72 hours only');

      // Original scanning methods
      await this.scanGamePasses();
      await this.scanBadges();
      await this.scanDeveloperProducts();
      await this.scanPlaceInfo();
      await this.scanUniverseInfo();

      // NEW: Advanced PUBLIC API scanning methods
      await this.scanCatalogByCreators();
      await this.scanMarketplace();
      await this.scanDeveloperInventories();
      await this.scanGroupAssets();
      await this.scanDeveloperAssets();
      await this.scanCatalogByKeywords();

      // Filter to 72 hours
      const cutoffTime = Date.now() - HOURS_72_MS;
      const filteredResults = this.results.filter(result => {
        if (!result.created && !result.updated) return true; // Keep if no date
        const resultDate = new Date(result.created || result.updated || '').getTime();
        return resultDate >= cutoffTime;
      });

      this.results = filteredResults;

      const duration = Date.now() - startTime;
      const stats = this.calculateStats();

      console.log(`✅ Scan complete! Found ${this.results.length} assets from last 72 hours in ${(duration/1000).toFixed(1)}s`);

      return {
        results: this.results,
        stats,
        duration
      };

    } finally {
      this.isScanning = false;
    }
  }

  private calculateStats() {
    return {
      total: this.results.length,
      decals: this.results.filter(r => r.type === 'decal').length,
      images: this.results.filter(r => r.type === 'image').length,
      gamepasses: this.results.filter(r => r.type === 'gamepass').length,
      badges: this.results.filter(r => r.type === 'badge').length,
      developerProducts: this.results.filter(r => r.type === 'developer_product').length,
      placeUpdates: this.results.filter(r => r.type === 'place_update').length,
      catalogItems: this.results.filter(r => r.type === 'catalog_item').length,
      marketplaceItems: this.results.filter(r => r.type === 'marketplace_item').length,
      inventoryItems: this.results.filter(r => r.type === 'inventory_item').length,
      groupAssets: this.results.filter(r => r.type === 'group_asset').length,
    };
  }

  private async scanGamePasses(): Promise<void> {
    try {
      console.log('📜 Scanning game passes...');

      const response = await robloxProxy.get(
        `${ROBLOX_API.GAMES}/games/${PS99_UNIVERSE_ID}/game-passes?limit=100&sortOrder=Desc`
      );

      if (response?.data) {
        for (const gamepass of response.data) {
          this.results.push({
            type: 'gamepass',
            id: gamepass.id.toString(),
            name: gamepass.name,
            description: gamepass.description,
            thumbnailUrl: gamepass.iconImageId 
              ? `https://assetdelivery.roblox.com/v1/asset/?id=${gamepass.iconImageId}`
              : undefined,
            price: gamepass.price,
            created: gamepass.created,
            updated: gamepass.updated,
            discoveredAt: new Date().toISOString(),
            metadata: {
              productId: gamepass.productId,
              sellerId: gamepass.sellerId,
            }
          });
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error scanning game passes:', error);
    }
  }

  private async scanBadges(): Promise<void> {
    try {
      console.log('🏆 Scanning badges...');

      const response = await robloxProxy.get(
        `${ROBLOX_API.BADGES}/universes/${PS99_UNIVERSE_ID}/badges?limit=100&sortOrder=Desc`
      );

      if (response?.data) {
        for (const badge of response.data) {
          this.results.push({
            type: 'badge',
            id: badge.id.toString(),
            name: badge.name,
            description: badge.description,
            thumbnailUrl: badge.iconImageId
              ? `https://assetdelivery.roblox.com/v1/asset/?id=${badge.iconImageId}`
              : undefined,
            created: badge.created,
            updated: badge.updated,
            metadata: {
              enabled: badge.enabled,
              awardingUniverse: badge.awardingUniverse,
              statistics: badge.statistics,
            }
          });
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error scanning badges:', error);
    }
  }

  private async scanDeveloperProducts(): Promise<void> {
    try {
      console.log('💰 Scanning developer products...');

      const response = await robloxProxy.get(
        `${ROBLOX_API.DEVELOP}/universes/${PS99_UNIVERSE_ID}/developerproducts?page=1&pageSize=100`
      );

      if (response?.data) {
        for (const product of response.data) {
          this.results.push({
            type: 'developer_product',
            id: product.id.toString(),
            name: product.name,
            description: product.Description || product.description,
            thumbnailUrl: product.IconImageAssetId
              ? `https://assetdelivery.roblox.com/v1/asset/?id=${product.IconImageAssetId}`
              : undefined,
            price: product.PriceInRobux || product.priceInRobux,
            metadata: {
              productId: product.ProductId || product.productId,
            }
          });
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error scanning developer products:', error);
    }
  }

  private async scanPlaceInfo(): Promise<void> {
    try {
      console.log('🎮 Scanning place information...');

      const response = await robloxProxy.get(
        `${ROBLOX_API.GAMES}/multiget-place-details?placeIds=${PS99_PLACE_ID}`
      );

      if (response && response.length > 0) {
        const placeData = response[0];

        this.results.push({
          type: 'place_update',
          id: placeData.placeId.toString(),
          name: placeData.name,
          description: placeData.description,
          thumbnailUrl: placeData.imageToken 
            ? `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${PS99_PLACE_ID}&returnPolicy=PlaceHolder&size=512x512&format=Png&isCircular=false`
            : undefined,
          metadata: {
            universeId: placeData.universeId,
            builder: placeData.builder,
            builderId: placeData.builderId,
            hasVerifiedBadge: placeData.hasVerifiedBadge,
            updated: placeData.updated,
            isPlayable: placeData.isPlayable,
            reasonProhibited: placeData.reasonProhibited,
            universeRootPlaceId: placeData.universeRootPlaceId,
          }
        });
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error scanning place info:', error);
    }
  }

  private async scanUniverseInfo(): Promise<void> {
    try {
      console.log('🌌 Scanning universe information...');

      const response = await robloxProxy.get(
        `${ROBLOX_API.GAMES}/games?universeIds=${PS99_UNIVERSE_ID}`
      );

      if (response?.data && response.data.length > 0) {
        const universeData = response.data[0];

        this.results.push({
          type: 'place_update',
          id: `universe-${universeData.id}`,
          name: universeData.name,
          description: universeData.description,
          created: universeData.created,
          updated: universeData.updated,
          metadata: {
            universeId: universeData.id,
            rootPlaceId: universeData.rootPlaceId,
            playing: universeData.playing,
            visits: universeData.visits,
            maxPlayers: universeData.maxPlayers,
            favoritedCount: universeData.favoritedCount,
            creator: universeData.creator,
            genre: universeData.genre,
            allowedGearGenres: universeData.allowedGearGenres,
            isGenreEnforced: universeData.isGenreEnforced,
            copyingAllowed: universeData.copyingAllowed,
            price: universeData.price,
          }
        });
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error scanning universe info:', error);
    }
  }

  private async scanDeveloperAssets(): Promise<void> {
    try {
      console.log('👤 Scanning developer assets...');

      // Scan Preston's recent assets (creator of PS99)
      const prestonId = 19717956;

      const inventoryResponse = await robloxProxy.get(
        `${ROBLOX_API.INVENTORY}/users/${prestonId}/inventory/Decal?sortOrder=Desc&limit=50`
      );

      if (inventoryResponse?.data) {
        for (const asset of inventoryResponse.data.slice(0, 20)) {
          this.results.push({
            type: 'decal',
            id: asset.assetId.toString(),
            name: asset.name,
            created: asset.created,
            updated: asset.updated,
            thumbnailUrl: `https://assetdelivery.roblox.com/v1/asset/?id=${asset.assetId}`,
            metadata: {
              assetType: asset.assetType,
              creatorType: asset.creatorType,
              creatorTargetId: asset.creatorTargetId,
            }
          });
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error scanning developer assets:', error);
    }
  }

  // NEW METHODS FROM SCANNER RESEARCH FILES

  private async scanCatalogByCreators(): Promise<void> {
    try {
      console.log('🔍 Scanning catalog by creators (PUBLIC API)...');

      // Scan top priority developers using catalog search API
      for (const dev of PS99_CORE_DEVELOPERS.slice(0, 3)) {
        try {
          const response = await robloxProxy.get(
            `${ROBLOX_API.CATALOG}/search/items?category=All&creatorTargetId=${dev.id}&creatorType=User&limit=30&sortType=Updated`
          );

          if (response?.data) {
            for (const item of response.data) {
              this.results.push({
                type: 'catalog_item',
                id: item.id.toString(),
                name: item.name || 'Unknown',
                description: item.description,
                created: item.created,
                updated: item.updated,
                discoveredAt: new Date().toISOString(),
                price: item.price,
                metadata: {
                  creatorId: dev.id,
                  creatorName: dev.username,
                  itemType: item.itemType,
                  assetType: item.assetType,
                  source: 'catalog_search'
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error scanning catalog for ${dev.username}:`, error);
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error in catalog scan:', error);
    }
  }

  private async scanMarketplace(): Promise<void> {
    try {
      console.log('🛒 Scanning Roblox marketplace (PUBLIC API)...');

      const searchTerms = ['pet simulator 99', 'ps99', 'big games'];

      for (const term of searchTerms) {
        try {
          // Note: This endpoint might be deprecated - testing it
          const response = await robloxProxy.get(
            `https://search.roblox.com/catalog/json?Category=All&Keyword=${encodeURIComponent(term)}&ResultsPerPage=30`
          );

          if (response && Array.isArray(response)) {
            for (const item of response) {
              this.results.push({
                type: 'marketplace_item',
                id: item.AssetId?.toString() || item.id?.toString(),
                name: item.Name || item.name,
                description: item.Description,
                created: item.Created,
                updated: item.Updated,
                discoveredAt: new Date().toISOString(),
                price: item.PriceInRobux || item.price,
                metadata: {
                  searchTerm: term,
                  creatorName: item.Creator?.Name,
                  source: 'marketplace_search'
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error searching marketplace for ${term}:`, error);
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error in marketplace scan:', error);
    }
  }

  private async scanDeveloperInventories(): Promise<void> {
    try {
      console.log('📦 Scanning developer inventories (PUBLIC API)...');

      // Scan Preston's inventory for recent PS99 assets
      const prestonId = 19717956;
      const assetTypes = ['Model', 'Decal', 'Audio', 'MeshPart'];

      for (const assetType of assetTypes.slice(0, 2)) {
        try {
          const response = await robloxProxy.get(
            `${ROBLOX_API.INVENTORY}/users/${prestonId}/inventory/${assetType}?sortOrder=Desc&limit=30`
          );

          if (response?.data) {
            for (const item of response.data) {
              this.results.push({
                type: 'inventory_item',
                id: item.assetId?.toString() || item.id?.toString(),
                name: item.name || 'Unknown',
                created: item.created,
                updated: item.updated,
                discoveredAt: new Date().toISOString(),
                metadata: {
                  assetType: assetType,
                  creatorId: prestonId,
                  creatorName: 'BuildIntoGames',
                  source: 'user_inventory'
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error scanning inventory for ${assetType}:`, error);
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error in inventory scan:', error);
    }
  }

  private async scanGroupAssets(): Promise<void> {
    try {
      console.log('🏢 Scanning BIG Games group assets (PUBLIC API)...');

      // Scan main BIG Games groups
      const groupsToScan = [
        { id: BIG_GAMES_GROUPS.MAIN, name: 'BIG Games' },
        { id: BIG_GAMES_GROUPS.PETS, name: 'BIG Games Pets' },
      ];

      for (const group of groupsToScan) {
        try {
          const response = await robloxProxy.get(
            `${ROBLOX_API.GROUPS}/groups/${group.id}/wall/posts?sortOrder=Desc&limit=10`
          );

          // Also try catalog search for group
          const catalogResponse = await robloxProxy.get(
            `${ROBLOX_API.CATALOG}/search/items?category=All&creatorTargetId=${group.id}&creatorType=Group&limit=30&sortType=Updated`
          );

          if (catalogResponse?.data) {
            for (const item of catalogResponse.data) {
              this.results.push({
                type: 'group_asset',
                id: item.id.toString(),
                name: item.name || 'Unknown',
                description: item.description,
                created: item.created,
                updated: item.updated,
                discoveredAt: new Date().toISOString(),
                price: item.price,
                metadata: {
                  groupId: group.id,
                  groupName: group.name,
                  itemType: item.itemType,
                  source: 'group_catalog'
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error scanning group ${group.name}:`, error);
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error in group assets scan:', error);
    }
  }

  private async scanCatalogByKeywords(): Promise<void> {
    try {
      console.log('🔑 Scanning catalog by PS99 keywords (PUBLIC API)...');

      const keywords = ['anubis ps99', 'egypt pet simulator', 'update55 ps99'];

      for (const keyword of keywords) {
        try {
          const response = await robloxProxy.get(
            `${ROBLOX_API.CATALOG}/search/items?keyword=${encodeURIComponent(keyword)}&limit=20&sortType=Updated`
          );

          if (response?.data) {
            for (const item of response.data) {
              this.results.push({
                type: 'catalog_item',
                id: item.id.toString(),
                name: item.name || 'Unknown',
                description: item.description,
                created: item.created,
                updated: item.updated,
                discoveredAt: new Date().toISOString(),
                price: item.price,
                metadata: {
                  keyword: keyword,
                  itemType: item.itemType,
                  creatorName: item.creatorName,
                  source: 'keyword_search'
                }
              });
            }
          }
        } catch (error) {
          console.error(`Error searching for keyword ${keyword}:`, error);
        }
      }

      this.scanProgress++;
    } catch (error) {
      console.error('Error in keyword scan:', error);
    }
  }

  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.scanProgress,
      total: this.totalSteps,
      percentage: Math.round((this.scanProgress / this.totalSteps) * 100)
    };
  }
}