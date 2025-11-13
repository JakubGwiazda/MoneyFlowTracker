-- =====================================================================================
-- Migration: Create MoneyFlowTracker Database Schema
-- Purpose: Initialize complete database schema for expense tracking application
-- Affected: categories, expenses, logs tables + enums + indexes + RLS policies
-- Date: 2025-10-30 14:00:00 UTC
-- =====================================================================================

-- Enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- =====================================================================================
-- 1. CREATE ENUMERATED TYPES
-- =====================================================================================

-- Classification status for expense categorization workflow
create type classification_status as enum (
    'pending',    -- Initial state, awaiting AI classification
    'predicted',  -- AI has provided a category prediction
    'corrected',  -- User has manually corrected the AI prediction
    'failed'      -- AI classification failed
);

-- Log action types for audit trail
create type log_action as enum (
    'insert',    -- Record creation
    'update',    -- Record modification
    'classify'   -- AI classification action
);

-- =====================================================================================
-- 2. CREATE TABLES
-- =====================================================================================

-- Categories table with hierarchical structure
-- Supports parent-child relationships for expense categorization
create table categories (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(trim(name)) > 0),
    parent_id uuid references categories(id) on delete restrict,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Enable RLS for categories table
alter table categories enable row level security;

-- Expenses table - core entity for tracking user expenditures
-- Includes AI prediction workflow with confidence scoring
create table expenses (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    category_id uuid references categories(id) on delete restrict,
    amount numeric(12,2) not null check (amount > 0),
    name text not null check (char_length(trim(name)) > 0),
    expense_date date not null,
    predicted_category_id uuid references categories(id) on delete restrict,
    corrected_category_id uuid references categories(id) on delete restrict,
    prediction_confidence numeric(5,4) check (prediction_confidence between 0 and 1),
    classification_status classification_status not null default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Enable RLS for expenses table
alter table expenses enable row level security;

-- Logs table for comprehensive audit trail
-- Tracks all user actions and system events
create table logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    expense_id uuid references expenses(id) on delete set null,
    log_action log_action not null,
    payload jsonb not null,
    created_at timestamptz not null default now()
);

-- Enable RLS for logs table
alter table logs enable row level security;

-- =====================================================================================
-- 3. CREATE PERFORMANCE INDEXES
-- =====================================================================================

-- Primary query patterns: user expenses filtered by date
create index expenses_user_date_idx on expenses (user_id, expense_date);

-- Case-insensitive unique category names globally (also serves for lookups)
create unique index categories_name_unique_idx on categories (lower(name));

-- Full-text search on expense names using trigram matching
create index expenses_name_trgm_idx on expenses using gin (name gin_trgm_ops);

-- Category hierarchy navigation
create index categories_parent_idx on categories (parent_id);

-- User activity logs lookup
create index logs_user_idx on logs (user_id);

-- Expense-specific logs lookup
create index logs_expense_idx on logs (expense_id);

-- Classification status filtering for AI workflow
create index expenses_classification_status_idx on expenses (classification_status);

-- =====================================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- =====================================================================================

-- Categories table policies
-- Categories are globally accessible but only authenticated users can modify

-- Allow all users to read categories
create policy "categories_select_policy" on categories
    for select
    to anon, authenticated
    using (true);

-- Only authenticated users can insert categories
create policy "categories_insert_policy" on categories
    for insert
    to authenticated
    with check (true);

-- Only authenticated users can update categories
create policy "categories_update_policy" on categories
    for update
    to authenticated
    using (true)
    with check (true);

-- Only authenticated users can delete categories (soft delete via is_active)
create policy "categories_delete_policy" on categories
    for delete
    to authenticated
    using (true);

-- Expenses table policies
-- Users can only access their own expenses

-- Users can only select their own expenses
create policy "expenses_select_policy" on expenses
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Users can only insert expenses for themselves
create policy "expenses_insert_policy" on expenses
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Users can only update their own expenses
create policy "expenses_update_policy" on expenses
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Users can only delete their own expenses
create policy "expenses_delete_policy" on expenses
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- Logs table policies
-- Users can only access their own activity logs

-- Users can only select their own logs
create policy "logs_select_policy" on logs
    for select
    to authenticated
    using (auth.uid() = user_id);

-- Users can only insert logs for themselves
create policy "logs_insert_policy" on logs
    for insert
    to authenticated
    with check (auth.uid() = user_id);

-- Users cannot update logs (immutable audit trail)
-- No update policy = no updates allowed

-- Users cannot delete logs (permanent audit trail)
-- No delete policy = no deletes allowed

-- =====================================================================================
-- 5. TRIGGER FUNCTIONS FOR AUTOMATIC TIMESTAMPS
-- =====================================================================================

-- Function to automatically update the updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Apply the trigger to expenses table
create trigger update_expenses_updated_at
    before update on expenses
    for each row
    execute function update_updated_at_column();

-- =====================================================================================
-- 6. INITIAL DATA SETUP
-- =====================================================================================

-- Insert default categories for common expense types
-- These provide a starting point for users and AI classification
insert into categories (name, parent_id) values
    ('Jedzenie', null),
    ('Transport', null),
    ('Zakupy', null),
    ('Rozrywka', null),
    ('Rachunki', null),
    ('Zdrowie', null),
    ('Edukacja', null),
    ('Podróże', null),
    ('Inne', null);

-- Insert subcategories for more granular classification
insert into categories (name, parent_id) 
select 'Słodycze', id from categories where name = 'Jedzenie';

insert into categories (name, parent_id) 
select 'Podstawowe', id from categories where name = 'Zakupy';

insert into categories (name, parent_id) 
select 'Transport publiczny', id from categories where name = 'Transport';

insert into categories (name, parent_id) 
select 'Paliwo', id from categories where name = 'Transport';

insert into categories (name, parent_id) 
select 'Odzież', id from categories where name = 'Zakupy';

insert into categories (name, parent_id) 
select 'Elektronika', id from categories where name = 'Zakupy';

insert into categories (name, parent_id) 
select 'Filmy', id from categories where name = 'Rozrywka';

insert into categories (name, parent_id) 
select 'Gry', id from categories where name = 'Rozrywka';

insert into categories (name, parent_id) 
select 'Prąd', id from categories where name = 'Rachunki';

insert into categories (name, parent_id) 
select 'Internet', id from categories where name = 'Rachunki';


-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

-- This migration creates the complete MoneyFlowTracker database schema including:
-- - Enumerated types for classification workflow
-- - Categories table with hierarchical structure
-- - Expenses table with AI prediction support
-- - Logs table for comprehensive audit trail
-- - Performance indexes for common query patterns
-- - Row Level Security policies for data isolation (DISABLED)
-- - Automatic timestamp triggers
-- - Initial category data for immediate use
