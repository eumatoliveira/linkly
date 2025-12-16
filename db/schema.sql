-- Linkly Database Schema
-- Optimized for read-heavy workloads with proper indexing

-- Drop existing table if exists (for development)
DROP TABLE IF EXISTS urls;

-- Main URLs table
CREATE TABLE urls (
    id BIGSERIAL PRIMARY KEY,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    click_count BIGINT DEFAULT 0,
    
    -- Constraint: short_code length validation
    CONSTRAINT short_code_length CHECK (length(short_code) <= 10),
    CONSTRAINT short_code_format CHECK (short_code ~ '^[0-9a-zA-Z]+$')
);

-- Critical index: O(1) lookup for redirects
-- This is the most important index for performance
CREATE UNIQUE INDEX idx_short_code ON urls(short_code);

-- Index for cleanup of expired URLs
-- Partial index to save space (only indexes non-null expires_at)
CREATE INDEX idx_expires_at ON urls(expires_at) 
WHERE expires_at IS NOT NULL;

-- Index for analytics queries (optional, for phase 2)
CREATE INDEX idx_created_at ON urls(created_at);

-- Index for duplicate URL detection (optional optimization)
-- Helps avoid creating multiple short codes for same URL
CREATE INDEX idx_original_url_hash ON urls(md5(original_url));

-- Comments for documentation
COMMENT ON TABLE urls IS 'Stores URL mappings with Base62 encoded short codes';
COMMENT ON COLUMN urls.id IS 'Auto-incrementing ID used to generate Base62 short_code';
COMMENT ON COLUMN urls.short_code IS 'Base62 encoded ID - guaranteed unique, no collisions';
COMMENT ON COLUMN urls.original_url IS 'Original long URL to redirect to';
COMMENT ON COLUMN urls.click_count IS 'Number of times this short URL was accessed';
COMMENT ON COLUMN urls.expires_at IS 'Optional expiration timestamp';

-- Display schema info
SELECT 
    'Schema created successfully' as status,
    'Table: urls' as table_name,
    '5 indexes created' as indexes,
    'Ready for Base62 ID generation' as note;
