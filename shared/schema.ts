import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const ps99Assets = pgTable("ps99_assets", {
  id: varchar("id").primaryKey(),
  assetId: integer("asset_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  assetType: text("asset_type").notNull(),
  creatorId: integer("creator_id").notNull(),
  creatorName: text("creator_name").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  createdDate: timestamp("created_date").notNull(),
  discoveredDate: timestamp("discovered_date").notNull().defaultNow(),
  matchedKeywords: text("matched_keywords").array(),
  isSignificant: boolean("is_significant").notNull().default(false),
  source: text("source").notNull(),
  verified: boolean("verified").notNull().default(false),
});

export const insertPS99AssetSchema = createInsertSchema(ps99Assets).omit({
  id: true,
  discoveredDate: true,
});

export type InsertPS99Asset = z.infer<typeof insertPS99AssetSchema>;
export type PS99Asset = typeof ps99Assets.$inferSelect;

export const ps99ScanProgress = pgTable("ps99_scan_progress", {
  id: varchar("id").primaryKey(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  lastScanned: timestamp("last_scanned").notNull().defaultNow(),
});

export const insertPS99ScanProgressSchema = createInsertSchema(ps99ScanProgress).omit({
  id: true,
  lastScanned: true,
});

export type InsertPS99ScanProgress = z.infer<typeof insertPS99ScanProgressSchema>;
export type PS99ScanProgress = typeof ps99ScanProgress.$inferSelect;
