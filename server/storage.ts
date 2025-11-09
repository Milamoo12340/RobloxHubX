import { 
  users,
  ps99Assets,
  ps99ScanProgress,
  type User, 
  type InsertUser,
  type PS99Asset,
  type InsertPS99Asset,
  type PS99ScanProgress,
  type InsertPS99ScanProgress
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte } from "drizzle-orm";

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

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPS99Assets(limit: number = 50, offset: number = 0): Promise<PS99Asset[]> {
    return await db
      .select()
      .from(ps99Assets)
      .orderBy(desc(ps99Assets.discoveredDate))
      .limit(limit)
      .offset(offset);
  }

  async getPS99AssetById(id: string): Promise<PS99Asset | undefined> {
    const [asset] = await db.select().from(ps99Assets).where(eq(ps99Assets.id, id));
    return asset || undefined;
  }

  async getPS99AssetByAssetId(assetId: number): Promise<PS99Asset | undefined> {
    const [asset] = await db.select().from(ps99Assets).where(eq(ps99Assets.assetId, assetId));
    return asset || undefined;
  }

  async getRecentPS99Assets(hoursAgo: number, limit: number = 50): Promise<PS99Asset[]> {
    const cutoffDate = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
    return await db
      .select()
      .from(ps99Assets)
      .where(gte(ps99Assets.discoveredDate, cutoffDate))
      .orderBy(desc(ps99Assets.discoveredDate))
      .limit(limit);
  }

  async createPS99Asset(insertAsset: InsertPS99Asset): Promise<PS99Asset> {
    const [asset] = await db
      .insert(ps99Assets)
      .values({
        ...insertAsset,
        id: randomUUID(),
      })
      .returning();
    return asset;
  }

  async updatePS99AssetVerified(id: string, verified: boolean): Promise<void> {
    await db
      .update(ps99Assets)
      .set({ verified })
      .where(eq(ps99Assets.id, id));
  }

  async getPS99ScanProgress(targetType: string, targetId: number): Promise<PS99ScanProgress | undefined> {
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

  async updatePS99ScanProgress(progress: InsertPS99ScanProgress): Promise<PS99ScanProgress> {
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
}

export const storage = new DatabaseStorage();
