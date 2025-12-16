/**
 * URL Service - Write Path
 * 
 * Handles creation of shortened URLs with deduplication and validation
 */

import validator from 'validator';
import { idToBase62 } from '../lib/id-generator.js';
import { db } from '../db/client.js';
import { cache } from '../cache/client.js';
import { config } from '../config.js';

export class UrlService {
  /**
   * Creates a shortened URL
   * @param {string} originalUrl - The URL to shorten
   * @param {Object} options - Optional parameters
   * @param {Date} options.expires_at - Expiration date
   * @returns {Promise<Object>} - { shortCode, shortUrl, originalUrl, isNew }
   */
  async createShortUrl(originalUrl, options = {}) {
    // 1. Validation
    if (!originalUrl || typeof originalUrl !== 'string') {
      throw new Error('URL is required');
    }
    
    // Trim whitespace
    originalUrl = originalUrl.trim();
    
    // Validate URL format
    if (!validator.isURL(originalUrl, { 
      require_protocol: true,
      protocols: ['http', 'https']
    })) {
      throw new Error('Invalid URL format. Must include http:// or https://');
    }
    
    // Check length
    if (originalUrl.length > config.app.maxUrlLength) {
      throw new Error(`URL too long. Maximum length is ${config.app.maxUrlLength} characters`);
    }
    
    // 2. Check for existing URL (deduplication optimization)
    // Only deduplicate non-expiring URLs to avoid complexity
    if (!options.expires_at) {
      try {
        const existing = await db.query(
          'SELECT short_code FROM urls WHERE original_url = $1 AND expires_at IS NULL LIMIT 1',
          [originalUrl]
        );
        
        if (existing.rows.length > 0) {
          const shortCode = existing.rows[0].short_code;
          return {
            shortCode,
            shortUrl: `${config.app.baseUrl}/${shortCode}`,
            originalUrl,
            isNew: false
          };
        }
      } catch (error) {
        // Non-critical error, continue with creation
        console.warn('Deduplication check failed:', error.message);
      }
    }
    
    // 3. Insert with temporary short_code (will be replaced)
    // We need the ID first to generate the Base62 code
    const result = await db.query(
      `INSERT INTO urls (original_url, expires_at, short_code)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [originalUrl, options.expires_at || null, 'TEMP']
    );
    
    const id = result.rows[0].id;
    
    // 4. Generate Base62 code from ID
    const shortCode = idToBase62(id);
    
    // 5. Update with actual short_code
    await db.query(
      'UPDATE urls SET short_code = $1 WHERE id = $2',
      [shortCode, id]
    );
    
    // 6. Warm the cache for immediate reads
    try {
      if (cache.isReady) {
        await cache.set(shortCode, originalUrl, { 
          EX: config.redis.ttl 
        });
      }
    } catch (error) {
      // Cache warming is not critical, log and continue
      console.warn('Failed to warm cache:', error.message);
    }
    
    return {
      shortCode,
      shortUrl: `${config.app.baseUrl}/${shortCode}`,
      originalUrl,
      isNew: true
    };
  }
  
  /**
   * Get URL statistics
   * @param {string} shortCode - The short code to get stats for
   * @returns {Promise<Object|null>} URL statistics or null if not found
   */
  async getUrlStats(shortCode) {
    const result = await db.query(
      `SELECT 
        short_code,
        original_url,
        click_count,
        created_at,
        expires_at
       FROM urls 
       WHERE short_code = $1`,
      [shortCode]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  }
  
  /**
   * Delete expired URLs (cleanup job)
   * @returns {Promise<number>} Number of deleted URLs
   */
  async cleanupExpiredUrls() {
    const result = await db.query(
      `DELETE FROM urls 
       WHERE expires_at IS NOT NULL 
       AND expires_at < NOW()
       RETURNING short_code`
    );
    
    // Also remove from cache
    if (result.rows.length > 0) {
      for (const row of result.rows) {
        try {
          await cache.del(row.short_code);
        } catch (error) {
          console.warn('Failed to delete from cache:', error.message);
        }
      }
    }
    
    return result.rowCount;
  }
}
