/**
 * Redis Cache Client - Mock for development without Redis
 * 
 * Provides a no-op cache that allows the app to run without Redis
 */

import { config } from '../config.js';

// In-memory fallback cache (not persistent, not shared across instances)
const memoryCache = new Map();

export const cache = {
  isReady: false,
  
  async connect() {
    console.log('✅ Using in-memory cache (no Redis)');
    this.isReady = true;
    return true;
  },
  
  async get(key) {
    return memoryCache.get(key) || null;
  },
  
  async set(key, value, options) {
    memoryCache.set(key, value);
    // Simple TTL implementation
    if (options && options.EX) {
      setTimeout(() => {
        memoryCache.delete(key);
      }, options.EX * 1000);
    }
    return 'OK';
  },
  
  async del(key) {
    return memoryCache.delete(key);
  },
  
  async ping() {
    return 'PONG';
  },
  
  async dbSize() {
    return memoryCache.size;
  },
  
  async info() {
    return `keyspace_hits:0\nkeyspace_misses:0`;
  },
  
  async quit() {
    memoryCache.clear();
    return 'OK';
  },
  
  on(event, handler) {
    // No-op for event handlers
  }
};

/**
 * Initialize cache connection
 */
export async function initializeCache() {
  try {
    await cache.connect();
    console.log('✅ Cache ready (in-memory mode)');
    console.warn('💡 Install Redis for production performance');
    return true;
  } catch (error) {
    console.error('❌ Cache initialization failed:', error.message);
    return false;
  }
}

/**
 * Health check for cache connection
 */
export async function checkCacheHealth() {
  try {
    const pong = await cache.ping();
    return pong === 'PONG';
  } catch (error) {
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  return {
    hits: 0,
    misses: 0,
    hitRatio: 0,
    totalKeys: memoryCache.size
  };
}
