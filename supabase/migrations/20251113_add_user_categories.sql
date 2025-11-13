-- Migration: Add User Categories Support
-- Description: Allow categories to be either system-wide (user_id IS NULL) 
--              or user-specific (user_id IS NOT NULL)

-- ========================================
-- 1. Add user_id column
-- ========================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE categories 
        ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        
        COMMENT ON COLUMN categories.user_id IS 
        'NULL = system category (shared), UUID = user category (private)';
    END IF;
END $$;

-- ========================================
-- 2. Create indexes
-- ========================================
CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories (user_id);
CREATE INDEX IF NOT EXISTS categories_user_active_idx ON categories (user_id, is_active);

-- ========================================
-- 3. Update uniqueness constraints
-- ========================================

-- Drop old global uniqueness constraint
DROP INDEX IF EXISTS categories_lower_idx;

-- System categories: unique name globally
CREATE UNIQUE INDEX categories_system_name_unique_idx 
    ON categories (LOWER(name)) 
    WHERE user_id IS NULL;

-- User categories: unique name per user
CREATE UNIQUE INDEX categories_user_name_unique_idx 
    ON categories (user_id, LOWER(name)) 
    WHERE user_id IS NOT NULL;

-- ========================================
-- 4. Category hierarchy validation
-- ========================================

CREATE OR REPLACE FUNCTION validate_category_parent()
RETURNS TRIGGER AS $$
BEGIN
    -- No parent_id means top-level category - OK
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Check if parent exists
    IF NOT EXISTS (SELECT 1 FROM categories WHERE id = NEW.parent_id) THEN
        RAISE EXCEPTION 'Parent category does not exist';
    END IF;
    
    -- Validate category type consistency
    -- System categories can only have system parents
    -- User categories can only have parents from the same user
    IF NOT EXISTS (
        SELECT 1 FROM categories 
        WHERE id = NEW.parent_id 
        AND (
            -- Both system categories
            (user_id IS NULL AND NEW.user_id IS NULL) 
            OR 
            -- Both belong to the same user
            (user_id IS NOT NULL AND user_id = NEW.user_id)
        )
    ) THEN
        RAISE EXCEPTION 'Category can only reference parent of the same type (system or same user)';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS category_parent_validation ON categories;
CREATE TRIGGER category_parent_validation
    BEFORE INSERT OR UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION validate_category_parent();

-- ========================================
-- 5. Row-Level Security (RLS)
-- ========================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS categories_select_policy ON categories;
DROP POLICY IF EXISTS categories_insert_policy ON categories;
DROP POLICY IF EXISTS categories_update_policy ON categories;
DROP POLICY IF EXISTS categories_delete_policy ON categories;
DROP POLICY IF EXISTS categories_service_role_policy ON categories;

-- Users can see system categories + their own
CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    USING (
        user_id IS NULL                -- System categories
        OR 
        user_id = auth.uid()          -- Own categories
    );

-- Users can only create their own categories
CREATE POLICY categories_insert_policy ON categories
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
    );

-- Users can only update their own categories
CREATE POLICY categories_update_policy ON categories
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own categories
CREATE POLICY categories_delete_policy ON categories
    FOR DELETE
    USING (user_id = auth.uid());

-- Service role has full access (for admin operations)
CREATE POLICY categories_service_role_policy ON categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ========================================
-- 6. Data migration
-- ========================================

-- All existing categories become system categories (user_id stays NULL)
-- No data migration needed - default NULL value is correct

-- Optional: Verify migration
DO $$
DECLARE
    total_count integer;
    system_count integer;
BEGIN
    SELECT COUNT(*) INTO total_count FROM categories;
    SELECT COUNT(*) INTO system_count FROM categories WHERE user_id IS NULL;
    
    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  Total categories: %', total_count;
    RAISE NOTICE '  System categories: %', system_count;
    RAISE NOTICE '  User categories: %', total_count - system_count;
END $$;

