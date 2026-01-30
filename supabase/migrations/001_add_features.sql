-- Migration: Add new features
-- Run this after the initial schema

-- Add favorites support
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add custom tags (separate from AI tags)
ALTER TABLE items ADD COLUMN IF NOT EXISTS custom_tags TEXT[] DEFAULT '{}';

-- Add archived status
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Add view count for analytics
ALTER TABLE items ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add last viewed timestamp
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_items_user_created ON items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(user_id, type);
CREATE INDEX IF NOT EXISTS idx_items_favorite ON items(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX IF NOT EXISTS idx_items_archived ON items(user_id, is_archived);

-- Full text search index
ALTER TABLE items ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION items_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(NEW.ai_tags, ' ')), 'D') ||
    setweight(to_tsvector('english', array_to_string(NEW.custom_tags, ' ')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_search_vector_trigger ON items;
CREATE TRIGGER items_search_vector_trigger
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION items_search_vector_update();

CREATE INDEX IF NOT EXISTS idx_items_search ON items USING gin(search_vector);

-- Update existing items to populate search vector
UPDATE items SET updated_at = updated_at;

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  query TEXT,
  filters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved searches" ON saved_searches
  FOR ALL USING (auth.uid() = user_id);

-- Recent searches table
CREATE TABLE IF NOT EXISTS recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recent searches" ON recent_searches
  FOR ALL USING (auth.uid() = user_id);

-- Keep only last 10 recent searches per user
CREATE OR REPLACE FUNCTION limit_recent_searches() RETURNS trigger AS $$
BEGIN
  DELETE FROM recent_searches
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM recent_searches
    WHERE user_id = NEW.user_id
    ORDER BY searched_at DESC
    LIMIT 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limit_recent_searches_trigger ON recent_searches;
CREATE TRIGGER limit_recent_searches_trigger
  AFTER INSERT ON recent_searches
  FOR EACH ROW EXECUTE FUNCTION limit_recent_searches();
