/**
 * API Routes
 * 
 * RESTful endpoints for URL shortening and redirection
 */

import express from 'express';
import { UrlService } from './services/url-service.js';
import { RedirectService } from './services/redirect-service.js';

const router = express.Router();
const urlService = new UrlService();
const redirectService = new RedirectService();

/**
 * POST /api/shorten
 * Creates a shortened URL
 * 
 * Body:
 *   - url (required): The URL to shorten
 *   - expires_at (optional): ISO 8601 timestamp
 * 
 * Response:
 *   - shortUrl: Full shortened URL
 *   - shortCode: Just the code part
 *   - originalUrl: The original URL
 */
router.post('/api/shorten', async (req, res) => {
  try {
    const { url, expires_at } = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        error: 'URL is required',
        example: { url: 'https://example.com' }
      });
    }
    
    // Parse expiration date if provided
    let expiresAt = null;
    if (expires_at) {
      expiresAt = new Date(expires_at);
      if (isNaN(expiresAt.getTime())) {
        return res.status(400).json({ 
          error: 'Invalid expires_at format. Use ISO 8601 format (e.g., 2024-12-31T23:59:59Z)' 
        });
      }
      if (expiresAt < new Date()) {
        return res.status(400).json({ 
          error: 'expires_at must be in the future' 
        });
      }
    }
    
    const result = await urlService.createShortUrl(url, { expires_at: expiresAt });
    
    res.status(201).json({
      shortUrl: result.shortUrl,
      shortCode: result.shortCode,
      originalUrl: result.originalUrl,
      isNew: result.isNew
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /:shortCode
 * Redirects to the original URL
 * 
 * Response:
 *   - 302 redirect to original URL
 *   - 404 if not found or expired
 *   - 400 if invalid format
 */
router.get('/:shortCode', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { shortCode } = req.params;
    
    // Validate format (Base62: alphanumeric only)
    if (!/^[0-9a-zA-Z]+$/.test(shortCode)) {
      return res.status(400).send('Invalid short code format');
    }
    
    // Validate length (reasonable bounds)
    if (shortCode.length > 10) {
      return res.status(400).send('Short code too long');
    }
    
    const originalUrl = await redirectService.getOriginalUrl(shortCode);
    
    if (!originalUrl) {
      return res.status(404).send('URL not found or expired');
    }
    
    // Log performance in development
    const latency = Date.now() - startTime;
    if (process.env.NODE_ENV === 'development') {
      console.log(`Redirect ${shortCode} → ${latency}ms`);
    }
    
    // 302 Temporary Redirect (allows analytics tracking)
    // Use 301 for permanent redirects (better caching, but loses analytics)
    res.redirect(config.app.redirectType, originalUrl);
  } catch (error) {
    console.error('Error redirecting:', error);
    res.status(500).send('Internal server error');
  }
});

/**
 * GET /api/stats/:shortCode
 * Gets analytics for a short URL
 * 
 * Response:
 *   - short_code: The short code
 *   - original_url: The original URL
 *   - click_count: Number of clicks
 *   - created_at: Creation timestamp
 *   - expires_at: Expiration timestamp (if set)
 */
router.get('/api/stats/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    // Validate format
    if (!/^[0-9a-zA-Z]+$/.test(shortCode)) {
      return res.status(400).json({ error: 'Invalid short code format' });
    }
    
    const stats = await urlService.getUrlStats(shortCode);
    
    if (!stats) {
      return res.status(404).json({ error: 'URL not found' });
    }
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/api/health', async (req, res) => {
  try {
    const { checkDatabaseHealth } = await import('./db/client.js');
    const { checkCacheHealth, getCacheStats } = await import('./cache/client.js');
    
    const [dbHealthy, cacheHealthy, cacheStats] = await Promise.all([
      checkDatabaseHealth(),
      checkCacheHealth(),
      getCacheStats()
    ]);
    
    const healthy = dbHealthy && cacheHealthy;
    
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        cache: cacheHealthy ? 'up' : 'down'
      },
      cache: cacheStats ? {
        hitRatio: cacheStats.hitRatio,
        totalKeys: cacheStats.totalKeys
      } : null
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/cleanup
 * Cleanup expired URLs (admin endpoint - should be protected in production)
 */
router.post('/api/admin/cleanup', async (req, res) => {
  try {
    const deleted = await urlService.cleanupExpiredUrls();
    res.json({ 
      message: 'Cleanup completed',
      deletedCount: deleted 
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/**
 * POST /api/admin/preload-cache
 * Preload popular URLs into cache (admin endpoint)
 */
router.post('/api/admin/preload-cache', async (req, res) => {
  try {
    const limit = parseInt(req.body.limit) || 1000;
    const loaded = await redirectService.preloadCache(limit);
    res.json({ 
      message: 'Cache preloaded',
      loadedCount: loaded 
    });
  } catch (error) {
    console.error('Cache preload failed:', error);
    res.status(500).json({ error: 'Cache preload failed' });
  }
});

export default router;
