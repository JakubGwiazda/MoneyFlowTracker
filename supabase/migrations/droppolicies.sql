-- =====================================================================================
-- 7. DISABLE ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Disable all policies for categories table
drop policy if exists "categories_select_policy" on categories;
drop policy if exists "categories_insert_policy" on categories;
drop policy if exists "categories_update_policy" on categories;
drop policy if exists "categories_delete_policy" on categories;

-- Disable all policies for expenses table
drop policy if exists "expenses_select_policy" on expenses;
drop policy if exists "expenses_insert_policy" on expenses;
drop policy if exists "expenses_update_policy" on expenses;
drop policy if exists "expenses_delete_policy" on expenses;

-- Disable all policies for logs table
drop policy if exists "logs_select_policy" on logs;
drop policy if exists "logs_insert_policy" on logs;

-- Disable RLS on all tables
alter table categories disable row level security;
alter table expenses disable row level security;
alter table logs disable row level security;
