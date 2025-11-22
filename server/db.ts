import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Use individual PG* environment variables or DATABASE_URL
const poolConfig = process.env.DATABASE_URL ? { 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
} : process.env.PGHOST ? {
  host: process.env.PGHOST,
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  max: 10,
  connectionTimeoutMillis: 5000,
} : null;

if (!poolConfig) {
  console.warn("Database not configured. Skipping database setup.");
  console.log("To enable database, set either DATABASE_URL or PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD");
}

export const pool = poolConfig ? new Pool(poolConfig) : null;

// Add error handler to prevent unhandled errors
if (pool) {
  pool.on('error', (err) => {
    console.warn("Database pool error (non-fatal):", err.message);
  });
}

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
    console.warn("Database connection test failed (app will use in-memory storage):", error instanceof Error ? error.message : String(error));
    return false;
  }
}
