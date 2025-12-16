/**
 * Linkly - Production-Ready URL Shortener
 * 
 * Main application entry point
 */

import express from 'express';
import { config } from './config.js';
import routes from './routes.js';
import { initializeCache } from './cache/client.js';
import { checkDatabaseHealth } from './db/client.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Request logging (development only)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use('/', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

/**
 * Initialize and start server
 */
async function startServer() {
  try {
    // Initialize Redis connection (optional, degrades gracefully)
    console.log('🔄 Initializing Redis...');
    const redisConnected = await initializeCache();
    
    if (!redisConnected) {
      console.warn('⚠️  Running in degraded mode (no cache)');
      console.warn('⚠️  Install Redis for production performance');
    }
    
    // Check database connection
    console.log('🔄 Checking database connection...');
    const dbHealthy = await checkDatabaseHealth();
    if (!dbHealthy) {
      console.error('❌ Database connection failed');
      console.error('💡 Make sure PostgreSQL is running and database exists');
      console.error('   Run: createdb linkly && psql linkly < db/schema.sql');
      throw new Error('Database unavailable');
    }
    console.log('✅ Database connected');
    
    // Optional: Preload cache with popular URLs
    if (config.nodeEnv === 'production') {
      console.log('🔄 Preloading cache...');
      const { RedirectService } = await import('./services/redirect-service.js');
      const redirectService = new RedirectService();
      await redirectService.preloadCache(1000);
    }
    
    // Start HTTP server
    app.listen(config.port, () => {
      console.log('');
      console.log('🚀 Linkly URL Shortener');
      console.log(`📡 Server running on port ${config.port}`);
      console.log(`🌐 Base URL: ${config.app.baseUrl}`);
      console.log(`🔧 Environment: ${config.nodeEnv}`);
      console.log(`🎯 Target latency: p50 < ${config.performance.redirectLatencyP50}ms`);
      console.log('');
      console.log('API Endpoints:');
      console.log(`  POST ${config.app.baseUrl}/api/shorten`);
      console.log(`  GET  ${config.app.baseUrl}/:shortCode`);
      console.log(`  GET  ${config.app.baseUrl}/api/stats/:shortCode`);
      console.log(`  GET  ${config.app.baseUrl}/api/health`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Start the server
startServer();
