import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema remains for authentication purposes
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Enum for leak types
export const leakTypeEnum = pgEnum("leak_type", [
  "asset",
  "script",
  "model",
  "map",
  "texture",
  "audio",
  "other",
  "automatic" // For automatically discovered content
]);

// Enum for file types
export const fileTypeEnum = pgEnum("file_type", [
  "rbxm", // Roblox Model
  "rbxl", // Roblox Place
  "lua",  // Lua Script
  "png",  // Image
  "jpg",  // Image
  "jpeg", // Image
  "obj",  // 3D Object
  "fbx",  // 3D Model
  "mp3",  // Audio
  "wav",  // Audio
  "txt",  // Text
  "json", // JSON
  "xml",  // XML
  "other", // Other
  "roblox_asset" // For Roblox assets discovery
]);

// Files table for storing uploaded files
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  uploaderId: integer("uploader_id").notNull(),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  fileData: text("file_data").notNull(), // Base64 encoded file data
  assetId: text("asset_id").notNull().unique(),
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  uploadDate: true,
});

// Leaks table for storing leak information
export const leaks = pgTable("leaks", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  leakType: leakTypeEnum("leak_type").notNull(),
  category: text("category").notNull(),
  gameName: text("game_name"),
  leakDate: timestamp("leak_date").defaultNow().notNull(),
  leakedBy: integer("leaked_by").notNull(),
  tags: text("tags").array().notNull(),
  channelId: text("channel_id"),
});

export const insertLeakSchema = createInsertSchema(leaks).omit({
  id: true,
  leakDate: true,
});

// Tags table for organizing leaks
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull(),
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
});

// Developer IDs table for tracking and updating Roblox developer IDs
export const developerIds = pgTable("developer_ids", {
  id: serial("id").primaryKey(),
  developerName: text("developer_name").notNull(),
  currentId: text("current_id").notNull(),  // Current Roblox ID
  previousIds: text("previous_ids").array().default([]), // History of previous IDs
  role: text("role").default("Developer"),
  games: text("games").array().default([]),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  autoTrack: boolean("auto_track").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  verificationMethod: text("verification_method"), // How the ID was verified
  metaData: text("meta_data") // Additional information about the developer
});

export const insertDeveloperIdSchema = createInsertSchema(developerIds).omit({
  id: true,
  lastUpdated: true
});

// Discord server config for notifications
export const discordConfigs = pgTable("discord_configs", {
  id: serial("id").primaryKey(),
  serverId: text("server_id").notNull().unique(),
  serverName: text("server_name").notNull(),
  inviteCode: text("invite_code"),
  monitoringChannel: text("monitoring_channel"),
  isActive: boolean("is_active").default(true).notNull(),
  pingRole: text("ping_role"),
  notificationSettings: text("notification_settings").notNull().default(JSON.stringify({
    newAssets: true,
    developerUpdates: true,
    gameUpdates: true,
    sendScreenshots: true
  }))
});

export const insertDiscordConfigSchema = createInsertSchema(discordConfigs).omit({
  id: true
});

// Monitor sources - developers, games, asset types to track
export const monitorSources = pgTable("monitor_sources", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").notNull(),
  sourceType: text("source_type").notNull(), // developer, game, assetType, keyword, auto
  sourceId: text("source_id").notNull(),     // developer ID, game ID, asset type, keyword
  sourceName: text("source_name").notNull(), // For display purposes
  lastChecked: timestamp("last_checked").defaultNow(),
  isActive: boolean("is_active").default(true).notNull(),
  autoDiscover: boolean("auto_discover").default(false), // Enable automatic discovery of related content
  discoveryDepth: integer("discovery_depth").default(1), // How deep to search for related content
  discoveryFilters: text("discovery_filters"), // JSON filters for auto-discovery
  lastDiscoveryResults: text("last_discovery_results") // JSON results from last discovery
});

export const insertMonitorSourceSchema = createInsertSchema(monitorSources).omit({
  id: true,
  lastChecked: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;

export type Leak = typeof leaks.$inferSelect;
export type InsertLeak = z.infer<typeof insertLeakSchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type DeveloperId = typeof developerIds.$inferSelect;
export type InsertDeveloperId = z.infer<typeof insertDeveloperIdSchema>;

export type DiscordConfig = typeof discordConfigs.$inferSelect;
export type InsertDiscordConfig = z.infer<typeof insertDiscordConfigSchema>;

export type MonitorSource = typeof monitorSources.$inferSelect;
export type InsertMonitorSource = z.infer<typeof insertMonitorSourceSchema>;
