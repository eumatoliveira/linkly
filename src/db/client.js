/**
 * PostgreSQL Database Client - Mock for development without PostgreSQL
 * 
 * Provides an in-memory database that allows the app to run without PostgreSQL
 */

import { config } from '../config.js';

// In-memory database (not persistent)
const urls = new Map();
let currentId = 1;

export const db = {
  async query(sql, params = []) {
    // Simple INSERT query simulation
    if (sql.includes('INSERT INTO urls')) {
      if (params[2] === 'TEMP') {
        // Initial insert
        const id = currentId++;
        return { rows: [{ id }] };
      }
    }
    
    // UPDATE query simulation
    if (sql.includes('UPDATE urls SET short_code')) {
      const [shortCode, id] = params;
      // Store in our map
      return { rowCount: 1 };
    }
    
    // SELECT by short_code
    if (sql.includes('SELECT') && sql.includes('short_code = $1')) {
      const shortCode = params[0];
      const entry = Array.from(urls.values()).find(u => u.short_code === shortCode);
      return { rows: entry ? [entry] : [], rowCount: entry ? 1 : 0 };
    }
    
    // SELECT for duplicate check
    if (sql.includes('SELECT short_code FROM urls WHERE original_url')) {
      const originalUrl = params[0];
      const entry = Array.from(urls.values()).find(u => u.original_url === originalUrl);
      return { rows: entry ? [{ short_code: entry.short_code }] : [] };
    }
    
    // INSERT with all fields
    if (sql.includes('INSERT') && params.length >= 2) {
      const id = currentId++;
      const entry = {
        id,
        original_url: params[0],
        expires_at: params[1],
        short_code: params[2] || `temp${id}`,
        click_count: 0,
        created_at: new Date()
      };
      urls.set(id, entry);
      return { rows: [entry], rowCount: 1 };
    }
    
    // UPDATE with short_code
    if (sql.includes('UPDATE') && params.length >= 2) {
      const [shortCode, id] = params;
      const entry = urls.get(id);
      if (entry) {
        entry.short_code = shortCode;
        urls.set(id, entry);
      }
      return { rowCount: 1 };
    }
    
    // UPDATE click count
    if (sql.includes('click_count = click_count + 1')) {
      const shortCode = params[0];
      const entry = Array.from(urls.values()).find(u => u.short_code === shortCode);
      if (entry) {
        entry.click_count = (entry.click_count || 0) + 1;
      }
      return { rowCount: 1 };
    }
    
    // DELETE expired URLs
    if (sql.includes('DELETE FROM urls WHERE expires_at')) {
      const deleted = [];
      urls.forEach((entry, id) => {
        if (entry.expires_at && new Date(entry.expires_at) < new Date()) {
          deleted.push(entry);
          urls.delete(id);
        }
      });
      return { rows: deleted, rowCount: deleted.length };
    }
    
    // SELECT NOW() for health check
    if (sql.includes('SELECT NOW()')) {
      return { rows: [{ now: new Date() }], rowCount: 1 };
    }
    
    return { rows: [], rowCount: 0 };
  },
  
  on(event, handler) {
    // No-op for events
  },
  
  totalCount: 0,
  idleCount: 0,
  waitingCount: 0
};

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth() {
  try {
    const result = await db.query('SELECT NOW()');
    return result.rowCount === 1;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  return {
    total: 1,
    idle: 0,
    waiting: 0
  };
}

// Log mode
console.log('✅ Using in-memory database (no PostgreSQL)');
console.warn('💡 This is DEMO MODE - data will not persist');
console.warn('💡 Install PostgreSQL for production use');
