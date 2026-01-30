-- Add AI description column for better semantic search
-- This stores detailed descriptions of images and files for search

ALTER TABLE items ADD COLUMN IF NOT EXISTS ai_description TEXT;

-- Create index for faster text search on ai_description
CREATE INDEX IF NOT EXISTS idx_items_ai_description_search 
ON items USING gin(to_tsvector('english', coalesce(ai_description, '')));

-- Update the full-text search index to include ai_description
DROP INDEX IF EXISTS idx_items_content_search;
CREATE INDEX idx_items_content_search ON items 
USING gin(to_tsvector('english', 
  coalesce(content, '') || ' ' || 
  coalesce(title, '') || ' ' || 
  coalesce(ai_summary, '') || ' ' ||
  coalesce(ai_description, '')
));
