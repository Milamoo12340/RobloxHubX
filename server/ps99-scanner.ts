import { robloxProxy } from "./roblox-proxy-service";
import { ALL_PS99_DEVELOPERS, ROBLOX_API, LEAK_KEYWORDS, PS99_PLACE_ID } from "@shared/ps99-constants";
import type { InsertPS99Asset } from "@shared/schema";
import { storage } from "./storage";


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

interface ScanResponse {
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
}

export class PS99Scanner {
  private readonly BATCH_SIZE = 10;
  private readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between batches

  async scanAll(): Promise<ScanResponse> {
    const startTime = Date.now();
    const allResults: ScanResult[] = [];

    console.log('🔍 Starting PS99 comprehensive scan...');

    try {
      // Scan core developers first (highest priority)
      const coreDeveloperResults = await this.scanDevelopers(
        ALL_PS99_DEVELOPERS.filter(d => d.priority === 1)
      );
      allResults.push(...coreDeveloperResults);

      // Scan additional developers
      const otherDeveloperResults = await this.scanDevelopers(
        ALL_PS99_DEVELOPERS.filter(d => d.priority > 1).slice(0, 5) // Limit to avoid rate limiting
      );
      allResults.push(...otherDeveloperResults);

      // Scan PS99 place for updates
      const placeResults = await this.scanPlace(PS99_PLACE_ID);
      allResults.push(...placeResults);

      const duration = Date.now() - startTime;
      const stats = this.calculateStats(allResults);

      console.log(`✅ PS99 scan completed in ${(duration / 1000).toFixed(1)}s - Found ${allResults.length} items`);

      return {
        results: allResults,
        stats,
        duration
      };
    } catch (error) {
      console.error('❌ PS99 scan failed:', error);
      throw new Error(`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async scanDevelopers(developers: typeof ALL_PS99_DEVELOPERS): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    for (const developer of developers) {
      try {
        console.log(`🔍 Scanning developer: ${developer.username} (${developer.id})`);

        // Scan developer's assets
        const assets = await this.scanDeveloperAssets(developer.id);
        results.push(...assets);

        // Add delay to avoid rate limiting
        await this.delay(this.RATE_LIMIT_DELAY);
      } catch (error) {
        console.warn(`⚠️ Failed to scan developer ${developer.username}:`, error);
      }
    }

    return results;
  }

  private async scanDeveloperAssets(developerId: number): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
      // Get developer info first
      const developerInfo = await robloxProxy.get(
        `${ROBLOX_API.USERS}/users/${developerId}`
      );

      if (!developerInfo) {
        return results;
      }

      // Scan for gamepasses
      try {
        const gamepasses = await this.scanGamepasses(developerId);
        results.push(...gamepasses);
      } catch (error) {
        console.warn(`Failed to scan gamepasses for developer ${developerId}:`, error);
      }

      // Scan for badges
      try {
        const badges = await this.scanBadges(developerId);
        results.push(...badges);
      } catch (error) {
        console.warn(`Failed to scan badges for developer ${developerId}:`, error);
      }

      // Scan for decals/images (limited batch)
      try {
        const decals = await this.scanDecals(developerId);
        results.push(...decals);
      } catch (error) {
        console.warn(`Failed to scan decals for developer ${developerId}:`, error);
      }

    } catch (error) {
      console.warn(`Failed to get developer info for ${developerId}:`, error);
    }

    return results;
  }

  private async scanGamepasses(developerId: number): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
      // Use universe ID for PS99 to get gamepasses
      const gamepassData = await robloxProxy.get(
        `${ROBLOX_API.GAMES}/games/3317771874/game-passes?limit=50&sortOrder=Desc`
      );

      if (gamepassData?.data) {
        for (const gamepass of gamepassData.data) {
          if (this.isLeakCandidate(gamepass.name, gamepass.description)) {
            results.push({
              type: 'gamepass',
              id: gamepass.id.toString(),
              name: gamepass.name,
              description: gamepass.description,
              price: gamepass.price,
              thumbnailUrl: await this.getGamepassThumbnail(gamepass.id),
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan gamepasses:`, error);
    }

    return results;
  }

  private async scanBadges(developerId: number): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
      // Get badges for PS99 universe
      const badgeData = await robloxProxy.get(
        `${ROBLOX_API.BADGES}/universes/3317771874/badges?limit=50&sortOrder=Desc`
      );

      if (badgeData?.data) {
        for (const badge of badgeData.data) {
          if (this.isLeakCandidate(badge.name, badge.description)) {
            results.push({
              type: 'badge',
              id: badge.id.toString(),
              name: badge.name,
              description: badge.description,
              thumbnailUrl: badge.iconImageId ? `https://thumbnails.roblox.com/v1/assets?assetIds=${badge.iconImageId}&size=150x150&format=Png` : undefined,
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan badges:`, error);
    }

    return results;
  }

  private async scanDecals(developerId: number): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
      // Search for recent decals by this developer
      const searchQuery = `creator:${developerId} pet simulator`;
      const catalogData = await robloxProxy.get(
        `${ROBLOX_API.CATALOG}/search/items?category=Decal&keyword=${encodeURIComponent(searchQuery)}&limit=20&sortOrder=Desc`
      );

      if (catalogData?.data) {
        for (const item of catalogData.data) {
          if (this.isLeakCandidate(item.name, item.description)) {
            results.push({
              type: 'decal',
              id: item.id.toString(),
              name: item.name,
              description: item.description,
              created: item.created,
              thumbnailUrl: `https://thumbnails.roblox.com/v1/assets?assetIds=${item.id}&size=420x420&format=Png`,
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan decals:`, error);
    }

    return results;
  }

  private async scanPlace(placeId: number): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    try {
      // Get place info to check for updates
      const placeData = await robloxProxy.get(
        `${ROBLOX_API.GAMES}/multiget-place-details?placeIds=${placeId}`
      );

      if (placeData?.[0]) {
        const place = placeData[0];
        const lastUpdate = new Date(place.updated);
        const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);

        // Consider recent updates (within 72 hours) as potential leaks
        if (hoursAgo <= 72) {
          results.push({
            type: 'place_update',
            id: `place-${placeId}-update`,
            name: `${place.name} - Recent Update`,
            description: `Place updated ${Math.floor(hoursAgo)} hours ago`,
            updated: place.updated,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to scan place ${placeId}:`, error);
    }

    return results;
  }

  private async getGamepassThumbnail(gamepassId: number): Promise<string | undefined> {
    try {
      const thumbnailData = await robloxProxy.get(
        `${ROBLOX_API.THUMBNAILS}/game-passes?gamePassIds=${gamepassId}&size=150x150&format=Png`
      );
      return thumbnailData?.data?.[0]?.imageUrl;
    } catch {
      return undefined;
    }
  }

  private isLeakCandidate(name: string, description?: string): boolean {
    if (!name) return false;

    const searchText = `${name} ${description || ''}`.toLowerCase();

    // Check for leak keywords
    const allKeywords = [
      ...LEAK_KEYWORDS.UPDATE,
      ...LEAK_KEYWORDS.ANUBIS,
      ...LEAK_KEYWORDS.PETS,
      ...LEAK_KEYWORDS.TESTING,
      ...LEAK_KEYWORDS.FEATURES
    ];

    return allKeywords.some(keyword => searchText.includes(keyword.toLowerCase()));
  }

  private calculateStats(results: ScanResult[]): ScanResponse['stats'] {
    const stats = {
      total: results.length,
      decals: 0,
      images: 0,
      gamepasses: 0,
      badges: 0,
      developerProducts: 0,
      placeUpdates: 0,
    };

    for (const result of results) {
      switch (result.type) {
        case 'decal':
          stats.decals++;
          break;
        case 'image':
          stats.images++;
          break;
        case 'gamepass':
          stats.gamepasses++;
          break;
        case 'badge':
          stats.badges++;
          break;
        case 'developer_product':
          stats.developerProducts++;
          break;
        case 'place_update':
          stats.placeUpdates++;
          break;
      }
    }

    return stats;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Save significant findings to storage
  async saveLeaks(results: ScanResult[]): Promise<void> {
    for (const result of results) {
      try {
        const assetData: InsertPS99Asset = {
          assetId: parseInt(result.id) || 0,
          name: result.name,
          description: result.description || '',
          assetType: this.mapTypeToAssetType(result.type),
          creatorId: 0, // Would need to fetch this
          creatorName: 'Unknown',
          discoveredDate: new Date(),
          thumbnailUrl: result.thumbnailUrl,
          isSignificant: true,
          verified: false,
          matchedKeywords: this.extractKeywords(result.name, result.description),
        };

        await storage.createPS99Asset(assetData);
      } catch (error) {
        console.warn(`Failed to save asset ${result.id}:`, error);
      }
    }
  }

  private mapTypeToAssetType(type: string): string {
    switch (type) {
      case 'gamepass':
        return 'GamePass';
      case 'badge':
        return 'Badge';
      case 'decal':
        return 'Decal';
      case 'image':
        return 'Image';
      case 'developer_product':
        return 'DeveloperProduct';
      case 'place_update':
        return 'Place';
      default:
        return 'Unknown';
    }
  }

  private extractKeywords(name: string, description?: string): string[] {
    const text = `${name} ${description || ''}`.toLowerCase();
    const keywords: string[] = [];

    const allKeywords = [
      ...LEAK_KEYWORDS.UPDATE,
      ...LEAK_KEYWORDS.ANUBIS,
      ...LEAK_KEYWORDS.PETS,
      ...LEAK_KEYWORDS.TESTING,
      ...LEAK_KEYWORDS.FEATURES
    ];

    for (const keyword of allKeywords) {
      if (text.includes(keyword.toLowerCase())) {
        keywords.push(keyword);
      }
    }

    return keywords;
  }
}