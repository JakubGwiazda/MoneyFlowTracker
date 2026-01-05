-- Drop existing policies
DROP POLICY IF EXISTS categories_select_policy ON categories;
DROP POLICY IF EXISTS categories_insert_policy ON categories;
DROP POLICY IF EXISTS categories_update_policy ON categories;
DROP POLICY IF EXISTS categories_delete_policy ON categories;
DROP POLICY IF EXISTS categories_service_role_policy ON categories;

-- Users can see system categories + their own
CREATE POLICY categories_select_policy ON categories
    FOR SELECT
    TO authenticated
    USING (
        user_id IS NULL OR user_id = auth.uid()
    );

-- Users can only create their own categories
CREATE POLICY categories_insert_policy ON categories
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update system categories + their own (for testing)
CREATE POLICY categories_update_policy ON categories
    FOR UPDATE
    TO authenticated
    USING (user_id IS NULL OR user_id = auth.uid())
    WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Users can delete system categories + their own (for testing)
CREATE POLICY categories_delete_policy ON categories
    FOR DELETE
    TO authenticated
    USING (user_id IS NULL OR user_id = auth.uid());

-- Service role has full access
CREATE POLICY categories_service_role_policy ON categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);