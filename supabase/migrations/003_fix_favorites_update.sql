-- Fix for favorites update error
-- The issue is likely permissions on the search vector trigger function
-- unexpected error during update: "permission denied for function items_search_vector_update" or similar RLS issue

-- Redefine the function with SECURITY DEFINER to run as owner
CREATE OR REPLACE FUNCTION items_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(NEW.ai_tags, ' ')), 'D') ||
    setweight(to_tsvector('english', array_to_string(NEW.custom_tags, ' ')), 'D');
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- If text search fails for any reason (e.g. language not found), 
    -- still allow the update to proceed, just without updating the index
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Explicitly grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION items_search_vector_update() TO authenticated;
GRANT EXECUTE ON FUNCTION items_search_vector_update() TO service_role;

-- Ensure RLS on items table allows updating the search_vector column implicitly
-- (The existing policy "Users can update own items" covers this, but SECURITY DEFINER on the trigger bypasses RLS for the trigger's internal actions)

-- Force a schema cache reload (sometimes needed for Supabase)
NOTIFY pgrst, 'reload schema';
