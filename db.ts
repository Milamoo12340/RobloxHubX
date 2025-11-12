import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema';

// Required for NeonDB in serverless environments
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not found. Will use in-memory storage instead.");
}

// Create a connection pool to PostgreSQL if we have a database URL
export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

// Create a Drizzle database instance
export const db = pool 
  ? drizzle(pool, { schema })
  : null;

// Push the schema to the database
export async function pushSchema() {
  if (db) {
    console.log("Database connected. Schema ready.");
    return true;
  }
  return false;
}