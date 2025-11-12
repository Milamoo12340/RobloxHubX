const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Initialize PostgreSQL client if DATABASE_URL is available
let pool = null;

if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    console.log('Database connection initialized');
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
  }
}

// Basic schema definitions
const schema = {
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  files: `
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      file_type VARCHAR(50) NOT NULL,
      file_size INTEGER NOT NULL,
      uploader_id INTEGER NOT NULL,
      file_data TEXT,
      asset_id VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  leaks: `
    CREATE TABLE IF NOT EXISTS leaks (
      id SERIAL PRIMARY KEY,
      file_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      leak_type VARCHAR(50) NOT NULL,
      category VARCHAR(100) NOT NULL,
      game_name VARCHAR(255) NOT NULL,
      leaked_by INTEGER NOT NULL,
      tags TEXT[] DEFAULT '{}',
      channel_id VARCHAR(255),
      leak_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  tags: `
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(7),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  discord_configs: `
    CREATE TABLE IF NOT EXISTS discord_configs (
      id SERIAL PRIMARY KEY,
      server_id VARCHAR(255) NOT NULL UNIQUE,
      leak_channel_id VARCHAR(255),
      general_channel_id VARCHAR(255),
      notification_enabled BOOLEAN DEFAULT TRUE,
      auto_discovery_enabled BOOLEAN DEFAULT TRUE,
      configured_by INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,
  monitor_sources: `
    CREATE TABLE IF NOT EXISTS monitor_sources (
      id SERIAL PRIMARY KEY,
      config_id INTEGER NOT NULL,
      source_type VARCHAR(50) NOT NULL,
      source_id VARCHAR(255) NOT NULL,
      source_name VARCHAR(255) NOT NULL,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `
};

// Initialize database tables
async function initializeDatabase() {
  if (!pool) {
    console.log('No database connection available. Skipping schema initialization.');
    return false;
  }
  
  try {
    // Create tables
    for (const [tableName, createStatement] of Object.entries(schema)) {
      console.log(`Creating table: ${tableName}`);
      await pool.query(createStatement);
    }
    
    console.log('Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database schema:', error);
    return false;
  }
}

// Basic query wrapper
async function query(text, params) {
  if (!pool) {
    throw new Error('No database connection available');
  }
  
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Check database connection
async function checkConnection() {
  if (!pool) {
    return { connected: false, message: 'No database connection available' };
  }
  
  try {
    const result = await pool.query('SELECT NOW()');
    return { 
      connected: true, 
      timestamp: result.rows[0].now,
      message: 'Database connection successful'
    };
  } catch (error) {
    console.error('Database connection check failed:', error);
    return { 
      connected: false, 
      message: 'Database connection failed', 
      error: error.message 
    };
  }
}

module.exports = {
  pool,
  query,
  initializeDatabase,
  checkConnection
};