import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { CreateCategoryCommand, UpdateCategoryCommand, CategoryDto } from '../../types';

/**
 * Service for managing category operations.
 * Handles business logic for creating, updating, and managing categories.
 */

/**
 * Creates a new category record in the database.
 * 
 * @param command - The category creation command with validated data
 * @param userId - The authenticated user's ID from JWT token
 * @param supabase - Supabase client instance
 * @returns Promise<CategoryDto> - The created category record
 * @throws Error if validation fails or database operation fails
 */
export async function createCategory(
  command: CreateCategoryCommand,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<CategoryDto> {
  
  // Check for duplicate name (categories are global, case-insensitive unique)
  const { data: existingCategory, error: duplicateError } = await supabase
    .from('categories')
    .select('id')
    .ilike('name', command.name)
    .maybeSingle();

  if (duplicateError) {
    console.error('Failed to check for duplicate category:', duplicateError);
    throw new Error('CATEGORY_CHECK_FAILED');
  }

  if (existingCategory) {
    throw new Error('CATEGORY_DUPLICATE');
  }

  // Validate parent_id if provided
  if (command.parent_id) {
    const { data: parent, error: parentError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', command.parent_id)
      .single();

    if (parentError || !parent) {
      throw new Error('PARENT_CATEGORY_NOT_FOUND');
    }
  }

  // Prepare category data for insertion (categories are global, no user_id)
  const categoryData = {
    name: command.name,
    parent_id: command.parent_id || null,
    is_active: command.is_active ?? true,
  };

  // Insert category record
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single();

  if (categoryError || !category) {
    console.error('Failed to create category:', categoryError);
    throw new Error('CATEGORY_CREATE_FAILED');
  }

  // Return the category as CategoryDto
  return {
    id: category.id,
    name: category.name,
    parent_id: category.parent_id,
    is_active: category.is_active,
    created_at: category.created_at,
  };
}

/**
 * Updates an existing category record.
 * 
 * @param categoryId - The category ID to update
 * @param command - The category update command with validated data
 * @param userId - The authenticated user's ID from JWT token
 * @param supabase - Supabase client instance
 * @returns Promise<CategoryDto> - The updated category record
 * @throws Error if validation fails or database operation fails
 */
export async function updateCategory(
  categoryId: string,
  command: UpdateCategoryCommand,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<CategoryDto> {
  
  // Check if category exists (categories are global)
  const { data: existingCategory, error: fetchError } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  if (fetchError || !existingCategory) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  // Check for duplicate name if name is being changed (case-insensitive)
  if (command.name && command.name.toLowerCase() !== existingCategory.name.toLowerCase()) {
    const { data: duplicateCategory, error: duplicateError } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', command.name)
      .neq('id', categoryId)
      .maybeSingle();

    if (duplicateError) {
      console.error('Failed to check for duplicate category:', duplicateError);
      throw new Error('CATEGORY_CHECK_FAILED');
    }

    if (duplicateCategory) {
      throw new Error('CATEGORY_DUPLICATE');
    }
  }

  // Validate parent_id if provided
  if (command.parent_id !== undefined && command.parent_id !== null) {
    // Check for circular reference
    if (command.parent_id === categoryId) {
      throw new Error('CATEGORY_CIRCULAR_REFERENCE');
    }

    const { data: parent, error: parentError } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('id', command.parent_id)
      .single();

    if (parentError || !parent) {
      throw new Error('PARENT_CATEGORY_NOT_FOUND');
    }

    // Check if parent has this category as parent (circular reference)
    if (parent.parent_id === categoryId) {
      throw new Error('CATEGORY_CIRCULAR_REFERENCE');
    }
  }

  // Prepare update data (no updated_at field in categories table)
  const updateData: Database['public']['Tables']['categories']['Update'] = {};

  if (command.name !== undefined) {
    updateData.name = command.name;
  }

  if (command.parent_id !== undefined) {
    updateData.parent_id = command.parent_id;
  }

  if (command.is_active !== undefined) {
    updateData.is_active = command.is_active;
  }

  // Update category record
  const { data: category, error: updateError } = await supabase
    .from('categories')
    .update(updateData)
    .eq('id', categoryId)
    .select()
    .single();

  if (updateError || !category) {
    console.error('Failed to update category:', updateError);
    throw new Error('CATEGORY_UPDATE_FAILED');
  }

  return {
    id: category.id,
    name: category.name,
    parent_id: category.parent_id,
    is_active: category.is_active,
    created_at: category.created_at,
  };
}

/**
 * Deletes a category (soft delete by setting is_active to false).
 * 
 * @param categoryId - The category ID to delete
 * @param userId - The authenticated user's ID from JWT token
 * @param supabase - Supabase client instance
 * @throws Error if validation fails or database operation fails
 */
export async function deleteCategory(
  categoryId: string,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  
  // Check if category is being used by any expenses
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('id')
    .eq('user_id', userId)
    .or(`category_id.eq.${categoryId},predicted_category_id.eq.${categoryId}`)
    .limit(1);

  if (expensesError) {
    console.error('Failed to check category usage:', expensesError);
    throw new Error('CATEGORY_CHECK_FAILED');
  }

  if (expenses && expenses.length > 0) {
    throw new Error('CATEGORY_IN_USE');
  }

  // Check if category has child categories
  const { data: children, error: childrenError } = await supabase
    .from('categories')
    .select('id')
    .eq('parent_id', categoryId)
    .limit(1);

  if (childrenError) {
    console.error('Failed to check child categories:', childrenError);
    throw new Error('CATEGORY_CHECK_FAILED');
  }

  if (children && children.length > 0) {
    throw new Error('CATEGORY_HAS_CHILDREN');
  }

  // Soft delete by setting is_active to false
  const { error: deleteError } = await supabase
    .from('categories')
    .update({ 
      is_active: false,
    })
    .eq('id', categoryId);

  if (deleteError) {
    console.error('Failed to delete category:', deleteError);
    throw new Error('CATEGORY_DELETE_FAILED');
  }
}

