/**
 * Application Configuration
 * Centralized configuration with environment variable support
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const config = {
  // Server configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  database: {
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/linkly',
    max: 20, // Maximum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
  
  // Redis cache configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: 86400, // 24 hours cache TTL
    maxRetries: 3,
  },
  
  // Application settings
  app: {
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    redirectType: 302, // 302 (temporary) for analytics, 301 for permanent
    maxUrlLength: 2048,
    defaultExpiration: null, // null = no expiration by default
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // per IP per window
    enabled: true,
  },
  
  // Performance targets (for monitoring)
  performance: {
    redirectLatencyP50: 50, // ms
    redirectLatencyP99: 200, // ms
    cacheHitRatio: 0.95, // 95%
  },
};

// Validation: ensure critical configs are set
if (!config.database.connectionString) {
  console.warn('⚠️  DATABASE_URL not set, using default');
}

if (!config.redis.url) {
  console.warn('⚠️  REDIS_URL not set, using default');
}

// Log configuration in development
if (config.nodeEnv === 'development') {
  console.log('📋 Configuration loaded:', {
    port: config.port,
    env: config.nodeEnv,
    baseUrl: config.app.baseUrl,
  });
}
