/**
 * Redirect Service - Read Path (Optimized)
 * 
 * Cache-first strategy for low-latency redirects
 * Target: p50 < 50ms, p99 < 200ms
 */

import { db } from '../db/client.js';
import { cache } from '../cache/client.js';
import { config } from '../config.js';

export class RedirectService {
  /**
   * Gets the original URL for a short code (cache-first lookup)
   * @param {string} shortCode - The short code to lookup
   * @returns {Promise<string|null>} Original URL or null if not found/expired
   */
  async getOriginalUrl(shortCode) {
    // 1. Try cache first (O(1) lookup, sub-ms latency)
    let cachedUrl;
    try {
      if (cache.isReady) {
        cachedUrl = await cache.get(shortCode);
      }
    } catch (error) {
      console.warn('Cache lookup failed, falling back to database:', error.message);
    }
    
    if (cachedUrl) {
      // Cache hit! Increment click count asynchronously (fire-and-forget)
      // Don't await to avoid blocking the redirect
      this.incrementClickCount(shortCode).catch(err => 
        console.error('Failed to increment click count:', err.message)
      );
      
      return cachedUrl;
    }
    
    // 2. Cache miss: query database
    const result = await db.query(
      `SELECT original_url, expires_at 
       FROM urls 
       WHERE short_code = $1`,
      [shortCode]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const { original_url, expires_at } = result.rows[0];
    
    // 3. Check expiration
    if (expires_at && new Date(expires_at) < new Date()) {
      // URL expired, remove from database and cache
      this.deleteExpiredUrl(shortCode).catch(err => 
        console.error('Failed to delete expired URL:', err.message)
      );
      return null;
    }
    
    // 4. Warm cache for subsequent requests
    try {
      if (cache.isReady) {
        await cache.set(shortCode, original_url, { EX: config.redis.ttl });
      }
    } catch (error) {
      console.warn('Failed to warm cache:', error.message);
    }
    
    // 5. Async increment click count (non-blocking)
    this.incrementClickCount(shortCode).catch(err => 
      console.error('Failed to increment click count:', err.message)
    );
    
    return original_url;
  }
  
  /**
   * Increments click count for analytics
   * This is async and non-blocking to avoid slowing down redirects
   * @param {string} shortCode - The short code
   * @private
   */
  async incrementClickCount(shortCode) {
    await db.query(
      'UPDATE urls SET click_count = click_count + 1 WHERE short_code = $1',
      [shortCode]
    );
  }
  
  /**
   * Deletes an expired URL
   * @param {string} shortCode - The short code
   * @private
   */
  async deleteExpiredUrl(shortCode) {
    await db.query('DELETE FROM urls WHERE short_code = $1', [shortCode]);
    try {
      await cache.del(shortCode);
    } catch (error) {
      console.warn('Failed to delete from cache:', error.message);
    }
  }
  
  /**
   * Preload popular URLs into cache
   * Useful for warming cache on startup or after Redis restart
   * @param {number} limit - Number of URLs to preload (default: 1000)
   */
  async preloadCache(limit = 1000) {
    const result = await db.query(
      `SELECT short_code, original_url 
       FROM urls 
       WHERE expires_at IS NULL OR expires_at > NOW()
       ORDER BY click_count DESC 
       LIMIT $1`,
      [limit]
    );
    
    let loaded = 0;
    for (const row of result.rows) {
      try {
        await cache.set(row.short_code, row.original_url, { 
          EX: config.redis.ttl 
        });
        loaded++;
      } catch (error) {
        console.warn(`Failed to preload ${row.short_code}:`, error.message);
      }
    }
    
    console.log(`✅ Preloaded ${loaded} URLs into cache`);
    return loaded;
  }
}
