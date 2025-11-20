import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Database features will be disabled until configured.");
  console.log("To enable database features:");
  console.log("1. Go to the Secrets tab in Replit");
  console.log("2. Add a new secret called 'DATABASE_URL'");
  console.log("3. Set it to your Neon PostgreSQL connection string");
}

export const pool = process.env.DATABASE_URL ? new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
}) : null;

export const db = pool ? drizzle({ client: pool, schema }) : null;

// Test database connection on startup
export async function testConnection() {
  if (!pool) {
    console.log("Database not configured - skipping connection test");
    return false;
  }
  
  try {
    const client = await pool.connect();
    console.log("Database connected successfully");
    client.release();
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
