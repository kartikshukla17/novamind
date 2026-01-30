-- Novamind Database Schema
-- Run this in your Supabase SQL Editor

-- Items table (core content)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image', 'file')),
  content TEXT,
  url TEXT,
  file_path TEXT,
  file_type TEXT,
  title TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  ai_summary TEXT,
  ai_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Boards (user-created categories/mood boards)
CREATE TABLE IF NOT EXISTS boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  icon TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Item-Board relationship (many-to-many)
CREATE TABLE IF NOT EXISTS item_boards (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (item_id, board_id)
);

-- AI Categories (system-generated)
CREATE TABLE IF NOT EXISTS ai_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT
);

-- Item-AI Category relationship
CREATE TABLE IF NOT EXISTS item_ai_categories (
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  category_id UUID REFERENCES ai_categories(id) ON DELETE CASCADE,
  confidence FLOAT DEFAULT 0.5,
  PRIMARY KEY (item_id, category_id)
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clipboard_monitoring BOOLEAN DEFAULT true,
  auto_categorize BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark'))
);

-- Row Level Security Policies
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_ai_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Items policies
CREATE POLICY "Users can view own items" ON items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own items" ON items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items" ON items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own items" ON items
  FOR DELETE USING (auth.uid() = user_id);

-- Boards policies
CREATE POLICY "Users can view own boards" ON boards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own boards" ON boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards" ON boards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards" ON boards
  FOR DELETE USING (auth.uid() = user_id);

-- Item-Boards policies
CREATE POLICY "Users can view own item_boards" ON item_boards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = item_boards.item_id AND items.user_id = auth.uid())
  );

CREATE POLICY "Users can create own item_boards" ON item_boards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM items WHERE items.id = item_boards.item_id AND items.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own item_boards" ON item_boards
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = item_boards.item_id AND items.user_id = auth.uid())
  );

-- Item-AI Categories policies
CREATE POLICY "Users can view own item_ai_categories" ON item_ai_categories
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = item_ai_categories.item_id AND items.user_id = auth.uid())
  );

CREATE POLICY "Users can manage own item_ai_categories" ON item_ai_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM items WHERE items.id = item_ai_categories.item_id AND items.user_id = auth.uid())
  );

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- AI Categories are public read
CREATE POLICY "AI categories are public" ON ai_categories
  FOR SELECT USING (true);

-- Seed AI categories
INSERT INTO ai_categories (name, icon) VALUES
  ('Articles', 'FileText'),
  ('Design', 'Palette'),
  ('Recipes', 'ChefHat'),
  ('Videos', 'Video'),
  ('Shopping', 'ShoppingBag'),
  ('Travel', 'Plane'),
  ('Work', 'Briefcase'),
  ('Learning', 'GraduationCap'),
  ('Inspiration', 'Lightbulb'),
  ('Other', 'Folder')
ON CONFLICT (name) DO NOTHING;

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Public read access for uploads (thumbnails, etc.)
CREATE POLICY "Public read for uploads" ON storage.objects
  FOR SELECT USING (bucket_id = 'uploads');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_boards_user_id ON boards(user_id);
CREATE INDEX IF NOT EXISTS idx_item_boards_item_id ON item_boards(item_id);
CREATE INDEX IF NOT EXISTS idx_item_boards_board_id ON item_boards(board_id);
CREATE INDEX IF NOT EXISTS idx_item_ai_categories_item_id ON item_ai_categories(item_id);

-- Full-text search index (optional, for better search)
CREATE INDEX IF NOT EXISTS idx_items_content_search ON items USING gin(to_tsvector('english', coalesce(content, '') || ' ' || coalesce(title, '') || ' ' || coalesce(ai_summary, '')));
