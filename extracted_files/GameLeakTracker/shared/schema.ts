import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Discord Leaks Bot Schema
export const leaks = pgTable("leaks", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  changeType: text("change_type").notNull(), // 'added', 'modified', 'deleted'
  fileSize: integer("file_size"), // in bytes
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isDeveloperChange: boolean("is_developer_change").default(false),
  messageId: text("message_id"), // Discord message ID if posted
  metadata: jsonb("metadata"), // Additional metadata about the leak
});

export const insertLeakSchema = createInsertSchema(leaks).omit({
  id: true,
  timestamp: true,
  messageId: true,
});

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(), // 'scan', 'post', 'command', 'error', etc.
  message: text("message").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  metadata: jsonb("metadata"), // Additional context
});

export const insertBotLogSchema = createInsertSchema(botLogs).omit({
  id: true,
  timestamp: true,
});

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBotSettingSchema = createInsertSchema(botSettings).omit({
  id: true,
  updatedAt: true,
});

// Typed exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertLeak = z.infer<typeof insertLeakSchema>;
export type Leak = typeof leaks.$inferSelect;

export type InsertBotLog = z.infer<typeof insertBotLogSchema>;
export type BotLog = typeof botLogs.$inferSelect;

export type InsertBotSetting = z.infer<typeof insertBotSettingSchema>;
export type BotSetting = typeof botSettings.$inferSelect;

// Table for storing Roblox user links to Discord users
export const robloxLinks = pgTable("roblox_links", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull(),
  discordUsername: text("discord_username"),
  robloxUserId: text("roblox_user_id").notNull(),
  robloxUsername: text("roblox_username"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRobloxLinkSchema = createInsertSchema(robloxLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRobloxLink = z.infer<typeof insertRobloxLinkSchema>;
export type RobloxLink = typeof robloxLinks.$inferSelect;
