import { randomUUID } from "crypto";
import { eq, desc, and, gte } from "drizzle-orm";
import { db } from "./db";
import { users, ps99Assets, ps99ScanProgress, type User, type InsertUser, type PS99Asset, type InsertPS99Asset, type PS99ScanProgress } from "../shared/schema.js";

// In-memory storage as fallback
class MemoryStorage {
  private users = new Map<string, User>();
  private ps99Assets = new Map<string, PS99Asset>();
  private ps99ScanProgress = new Map<string, PS99ScanProgress>();

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getPS99Assets(limit: number = 50, offset: number = 0): Promise<PS99Asset[]> {
    const assets = Array.from(this.ps99Assets.values());
    assets.sort((a, b) => new Date(b.discoveredDate).getTime() - new Date(a.discoveredDate).getTime());
    return assets.slice(offset, offset + limit);
  }

  async getPS99AssetById(id: string): Promise<PS99Asset | undefined> {
    return this.ps99Assets.get(id);
  }

  async getPS99AssetByAssetId(assetId: number): Promise<PS99Asset | undefined> {
    for (const asset of this.ps99Assets.values()) {
      if (asset.assetId === assetId) {
        return asset;
      }
    }
    return undefined;
  }

  async getRecentPS99Assets(hoursAgo: number, limit: number = 50): Promise<PS99Asset[]> {
    const cutoffDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
    const assets = Array.from(this.ps99Assets.values())
      .filter(asset => new Date(asset.discoveredDate) >= cutoffDate);
    assets.sort((a, b) => new Date(b.discoveredDate).getTime() - new Date(a.discoveredDate).getTime());
    return assets.slice(0, limit);
  }

  async createPS99Asset(insertAsset: InsertPS99Asset): Promise<PS99Asset> {
    const id = randomUUID();
    const asset: PS99Asset = { ...insertAsset, id };
    this.ps99Assets.set(id, asset);
    return asset;
  }

  async updatePS99AssetVerified(id: string, verified: boolean): Promise<void> {
    const asset = this.ps99Assets.get(id);
    if (asset) {
      asset.verified = verified;
    }
  }

  async getPS99ScanProgress(targetType: string, targetId: number): Promise<PS99ScanProgress | undefined> {
    return this.ps99ScanProgress.get(`${targetType}-${targetId}`);
  }

  async updatePS99ScanProgress(progress: InsertPS99ScanProgress): Promise<PS99ScanProgress> {
    const id = `${progress.targetType}-${progress.targetId}`;
    const existing = this.ps99ScanProgress.get(id);
    const updatedProgress: PS99ScanProgress = {
      ...progress,
      id,
      lastScanned: new Date(),
    };
    this.ps99ScanProgress.set(id, updatedProgress);
    return updatedProgress;
  }
}

const memoryStorage = new MemoryStorage();

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getPS99Assets(limit?: number, offset?: number): Promise<PS99Asset[]>;
  getPS99AssetById(id: string): Promise<PS99Asset | undefined>;
  getPS99AssetByAssetId(assetId: number): Promise<PS99Asset | undefined>;
  getRecentPS99Assets(hoursAgo: number, limit?: number): Promise<PS99Asset[]>;
  createPS99Asset(asset: InsertPS99Asset): Promise<PS99Asset>;
  updatePS99AssetVerified(id: string, verified: boolean): Promise<void>;

  getPS99ScanProgress(targetType: string, targetId: number): Promise<PS99ScanProgress | undefined>;
  updatePS99ScanProgress(progress: InsertPS99ScanProgress): Promise<PS99ScanProgress>;
}

export const storage: IStorage = {
  async getUser(id: string): Promise<User | undefined> {
    if (db) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    }
    return memoryStorage.getUser(id);
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (db) {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user || undefined;
    }
    return memoryStorage.getUserByUsername(username);
  },

  async createUser(insertUser: InsertUser): Promise<User> {
    if (db) {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    }
    return memoryStorage.createUser(insertUser);
  },

  async getPS99Assets(limit: number = 50, offset: number = 0): Promise<PS99Asset[]> {
    if (db) {
      return await db
        .select()
        .from(ps99Assets)
        .orderBy(desc(ps99Assets.discoveredDate))
        .limit(limit)
        .offset(offset);
    }
    return memoryStorage.getPS99Assets(limit, offset);
  },

  async getPS99AssetById(id: string): Promise<PS99Asset | undefined> {
    if (db) {
      const [asset] = await db.select().from(ps99Assets).where(eq(ps99Assets.id, id));
      return asset || undefined;
    }
    return memoryStorage.getPS99AssetById(id);
  },

  async getPS99AssetByAssetId(assetId: number): Promise<PS99Asset | undefined> {
    if (db) {
      const [asset] = await db.select().from(ps99Assets).where(eq(ps99Assets.assetId, assetId));
      return asset || undefined;
    }
    return memoryStorage.getPS99AssetByAssetId(assetId);
  },

  async getRecentPS99Assets(hoursAgo: number, limit: number = 50): Promise<PS99Asset[]> {
    if (db) {
      const cutoffDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
      return await db
        .select()
        .from(ps99Assets)
        .where(gte(ps99Assets.discoveredDate, cutoffDate))
        .orderBy(desc(ps99Assets.discoveredDate))
        .limit(limit);
    }
    return memoryStorage.getRecentPS99Assets(hoursAgo, limit);
  },

  async createPS99Asset(insertAsset: InsertPS99Asset): Promise<PS99Asset> {
    if (db) {
      const [asset] = await db
        .insert(ps99Assets)
        .values({
          ...insertAsset,
          id: randomUUID(),
        })
        .returning();
      return asset;
    }
    return memoryStorage.createPS99Asset(insertAsset);
  },

  async updatePS99AssetVerified(id: string, verified: boolean): Promise<void> {
    if (db) {
      await db
        .update(ps99Assets)
        .set({ verified })
        .where(eq(ps99Assets.id, id));
    } else {
      await memoryStorage.updatePS99AssetVerified(id, verified);
    }
  },

  async getPS99ScanProgress(targetType: string, targetId: number): Promise<PS99ScanProgress | undefined> {
    if (db) {
      const [progress] = await db
        .select()
        .from(ps99ScanProgress)
        .where(
          and(
            eq(ps99ScanProgress.targetType, targetType),
            eq(ps99ScanProgress.targetId, targetId)
          )
        );
      return progress || undefined;
    }
    return memoryStorage.getPS99ScanProgress(targetType, targetId);
  },

  async updatePS99ScanProgress(progress: InsertPS99ScanProgress): Promise<PS99ScanProgress> {
    if (db) {
      const id = `${progress.targetType}-${progress.targetId}`;
      const existing = await this.getPS99ScanProgress(progress.targetType, progress.targetId);

      if (existing) {
        const [updated] = await db
          .update(ps99ScanProgress)
          .set({ lastScanned: new Date() })
          .where(eq(ps99ScanProgress.id, id))
          .returning();
        return updated;
      } else {
        const [created] = await db
          .insert(ps99ScanProgress)
          .values({ ...progress, id })
          .returning();
        return created;
      }
    }
    return memoryStorage.updatePS99ScanProgress(progress);
  }
};