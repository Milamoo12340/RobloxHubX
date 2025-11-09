/**
 * PS99 Asset Scanner
 * 
 * Comprehensive scanner for Pet Simulator 99 assets including:
 * - Decals and images
 * - Game passes
 * - Developer products
 * - Badges
 * - Configuration changes
 * - Universe/place updates
 */

import { robloxProxy } from "./roblox-proxy-service";
import { ALL_PS99_DEVELOPERS, ROBLOX_API } from "@shared/ps99-constants";

const PS99_UNIVERSE_ID = 3959677;
const PS99_PLACE_ID = 8737899170;

interface ScanResult {
  type: 'decal' | 'image' | 'gamepass' | 'badge' | 'developer_product' | 'place_update';
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  price?: number;
  created?: string;
  updated?: string;
  metadata?: Record<string, any>;
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
    this.totalSteps = 6; // Number of scan operations

    try {
      console.log('🔍 Starting PS99 asset scan...');
      
      await this.scanGamePasses();
      await this.scanBadges();
      await this.scanDeveloperProducts();
      await this.scanPlaceInfo();
      await this.scanUniverseInfo();
      await this.scanDeveloperAssets();
      
      const duration = Date.now() - startTime;
      
      const stats = this.calculateStats();
      
      console.log(`✅ Scan complete! Found ${this.results.length} assets in ${(duration/1000).toFixed(1)}s`);
      
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

  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.scanProgress,
      total: this.totalSteps,
      percentage: Math.round((this.scanProgress / this.totalSteps) * 100)
    };
  }
}
