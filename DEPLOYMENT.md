# Deployment Guide

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup PostgreSQL

```bash
# Create database
createdb linkly

# Run migrations
npm run db:migrate
```

Verify schema:
```bash
psql linkly -c "\d urls"
```

### 3. Setup Redis

#### Windows (via Memurai or Docker)

**Option A: Docker**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

**Option B: Memurai** (Redis-compatible for Windows)
```bash
# Download from https://www.memurai.com/
# Install and start service
```

#### macOS/Linux
```bash
# Install via package manager
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@localhost:5432/linkly
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

### 5. Start Development Server

```bash
npm run dev
```

Server will start on http://localhost:3000

## Production Deployment

### Environment Variables

Required environment variables for production:

```env
NODE_ENV=production
PORT=3000
BASE_URL=https://your-domain.com

# Database (use connection pooling in production)
DATABASE_URL=postgresql://user:password@host:5432/linkly?ssl=true

# Redis (use managed service in production)
REDIS_URL=redis://:password@host:6379
```

### Docker Deployment

#### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "src/index.js"]
```

#### 2. Build and Run

```bash
# Build image
docker build -t linkly:latest .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  -e BASE_URL=$BASE_URL \
  --name linkly \
  linkly:latest
```

### Docker Compose (Full Stack)

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/linkly
      - REDIS_URL=redis://cache:6379
      - BASE_URL=http://localhost:3000
    depends_on:
      - db
      - cache
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: linkly
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

Run:
```bash
docker-compose up -d
```

### Cloud Platforms

#### Railway / Render

1. Connect GitHub repository
2. Set environment variables
3. Add PostgreSQL and Redis add-ons
4. Deploy automatically

#### AWS / GCP / Azure

**Recommended architecture**:
- **Compute**: ECS / Cloud Run / App Service
- **Database**: RDS PostgreSQL / Cloud SQL / Azure Database
- **Cache**: ElastiCache Redis / Memorystore / Azure Cache
- **Load Balancer**: ALB / Cloud Load Balancer / Azure LB

### Performance Tuning

#### PostgreSQL

```sql
-- Increase connection pool
ALTER SYSTEM SET max_connections = 200;

-- Optimize for read-heavy workload
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET random_page_cost = 1.1;
```

#### Redis

```conf
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
```

#### Node.js

```bash
# Use cluster mode for multiple CPU cores
npm install pm2 -g
pm2 start src/index.js -i max
```

### Monitoring

#### Health Checks

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "cache": "up"
  },
  "cache": {
    "hitRatio": 0.96,
    "totalKeys": 15234
  }
}
```

#### Metrics to Monitor

- Redirect latency (p50, p99)
- Cache hit ratio (>95%)
- Database connection pool utilization
- Error rate
- Request throughput

### Backup Strategy

#### Database Backups

```bash
# Daily backup
pg_dump linkly > backup-$(date +%Y%m%d).sql

# Automated with cron
0 2 * * * pg_dump linkly | gzip > /backups/linkly-$(date +\%Y\%m\%d).sql.gz
```

#### Redis Persistence

Enable in `redis.conf`:
```conf
save 900 1
save 300 10
save 60 10000
```

### Scaling

#### Horizontal Scaling

1. **Stateless application**: Scale app instances behind load balancer
2. **Database**: Read replicas for analytics queries
3. **Cache**: Redis cluster or sharding

#### Vertical Scaling

- Increase database instance size
- Increase Redis memory
- Add more CPU/memory to app instances

### Security Checklist

- [ ] Use HTTPS (SSL/TLS certificates)
- [ ] Enable database SSL connections
- [ ] Use Redis password authentication
- [ ] Implement rate limiting
- [ ] Add API authentication for admin endpoints
- [ ] Regular security updates
- [ ] Database connection encryption
- [ ] Environment variable secrets management
