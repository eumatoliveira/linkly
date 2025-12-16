# API Documentation

## Overview

Linkly provides a simple RESTful API for URL shortening and redirection.

**Base URL**: `http://localhost:3000` (development)

**Response Format**: JSON

## Authentication

Currently, no authentication is required. In production, consider adding:
- API keys for programmatic access
- Rate limiting per API key
- OAuth for user-specific URLs

## Endpoints

### Create Short URL

Creates a new shortened URL or returns existing one if URL was already shortened.

**Endpoint**: `POST /api/shorten`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "url": "https://example.com/very/long/url",
  "expires_at": "2024-12-31T23:59:59Z"  // Optional
}
```

**Parameters**:
- `url` (required): The URL to shorten. Must include `http://` or `https://`
- `expires_at` (optional): ISO 8601 timestamp for expiration

**Success Response** (201 Created):
```json
{
  "shortUrl": "http://localhost:3000/a1b2c3",
  "shortCode": "a1b2c3",
  "originalUrl": "https://example.com/very/long/url",
  "isNew": true
}
```

**Error Responses**:

400 Bad Request - Invalid URL:
```json
{
  "error": "Invalid URL format. Must include http:// or https://"
}
```

400 Bad Request - URL too long:
```json
{
  "error": "URL too long. Maximum length is 2048 characters"
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/nodejs/node"}'
```

---

### Redirect to Original URL

Redirects to the original URL associated with the short code.

**Endpoint**: `GET /:shortCode`

**Parameters**:
- `shortCode`: The Base62 encoded identifier (path parameter)

**Success Response** (302 Found):
```
Location: https://example.com/very/long/url
```

Browser will automatically redirect to the original URL.

**Error Responses**:

404 Not Found:
```
URL not found or expired
```

400 Bad Request:
```
Invalid short code format
```

**Example**:
```bash
curl -L http://localhost:3000/a1b2c3
# -L flag follows redirects
```

---

### Get URL Statistics

Retrieves analytics data for a shortened URL.

**Endpoint**: `GET /api/stats/:shortCode`

**Parameters**:
- `shortCode`: The Base62 encoded identifier

**Success Response** (200 OK):
```json
{
  "short_code": "a1b2c3",
  "original_url": "https://example.com/very/long/url",
  "click_count": 42,
  "created_at": "2025-12-15T23:00:00.000Z",
  "expires_at": null
}
```

**Fields**:
- `short_code`: The short code
- `original_url`: Original long URL
- `click_count`: Number of times the short URL was accessed
- `created_at`: Creation timestamp (ISO 8601)
- `expires_at`: Expiration timestamp (ISO 8601) or null

**Error Responses**:

404 Not Found:
```json
{
  "error": "URL not found"
}
```

**Example**:
```bash
curl http://localhost:3000/api/stats/a1b2c3
```

---

### Health Check

Checks the health of the service and its dependencies.

**Endpoint**: `GET /api/health`

**Success Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2025-12-15T23:28:00.000Z",
  "services": {
    "database": "up",
    "cache": "up"
  },
  "cache": {
    "hitRatio": 0.9621,
    "totalKeys": 15234
  }
}
```

**Degraded Response** (503 Service Unavailable):
```json
{
  "status": "degraded",
  "timestamp": "2025-12-15T23:28:00.000Z",
  "services": {
    "database": "up",
    "cache": "down"
  },
  "cache": null
}
```

**Example**:
```bash
curl http://localhost:3000/api/health
```

---

## Admin Endpoints

### Cleanup Expired URLs

Removes all expired URLs from the database.

**Endpoint**: `POST /api/admin/cleanup`

**Success Response** (200 OK):
```json
{
  "message": "Cleanup completed",
  "deletedCount": 127
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/admin/cleanup
```

---

### Preload Cache

Loads the most popular URLs into Redis cache.

**Endpoint**: `POST /api/admin/preload-cache`

**Request Body**:
```json
{
  "limit": 1000
}
```

**Success Response** (200 OK):
```json
{
  "message": "Cache preloaded",
  "loadedCount": 1000
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/admin/preload-cache \
  -H "Content-Type: application/json" \
  -d '{"limit": 500}'
```

---

## Rate Limiting

Currently not implemented. Recommended limits for production:

- **Creation**: 100 requests per 15 minutes per IP
- **Redirects**: No limit (read-heavy by design)
- **Stats**: 1000 requests per hour per IP

## Error Handling

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

**HTTP Status Codes**:
- `200`: Success
- `201`: Created
- `302`: Redirect
- `400`: Bad Request (invalid input)
- `404`: Not Found
- `500`: Internal Server Error
- `503`: Service Unavailable

## Performance Characteristics

### Latency Targets

- **Redirect**: p50 < 50ms, p99 < 200ms
- **Create**: p50 < 100ms
- **Stats**: p50 < 50ms

### Caching Strategy

Redirects use cache-first strategy:
1. Check Redis (sub-ms)
2. If miss, query PostgreSQL
3. Warm cache for next request

Expected cache hit ratio: **>95%**

## SDK Examples

### JavaScript/Node.js

```javascript
// Create short URL
async function shortenUrl(longUrl) {
  const response = await fetch('http://localhost:3000/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: longUrl })
  });
  
  return await response.json();
}

// Usage
const result = await shortenUrl('https://example.com/long/url');
console.log(result.shortUrl); // http://localhost:3000/a1b2c3
```

### Python

```python
import requests

def shorten_url(long_url):
    response = requests.post(
        'http://localhost:3000/api/shorten',
        json={'url': long_url}
    )
    return response.json()

# Usage
result = shorten_url('https://example.com/long/url')
print(result['shortUrl'])
```

### cURL

```bash
# Shorten URL
curl -X POST http://localhost:3000/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/long/url"}'

# Get stats
curl http://localhost:3000/api/stats/a1b2c3

# Test redirect
curl -I http://localhost:3000/a1b2c3
```

## Changelog

### v1.0.0 (Current)
- Initial release
- Base62 ID generation
- Cache-first redirects
- Click analytics
- URL expiration support
