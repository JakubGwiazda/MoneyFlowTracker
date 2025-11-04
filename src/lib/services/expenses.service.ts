import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { CreateExpenseCommand, ExpenseDto } from '../../types';

/**
 * Service for managing expense operations.
 * Handles business logic for creating, updating, and managing expenses.
 */

/**
 * Creates a new expense record in the database.
 * 
 * @param command - The expense creation command with validated data
 * @param userId - The authenticated user's ID from JWT token
 * @param supabase - Supabase client instance
 * @returns Promise<ExpenseDto> - The created expense record
 * @throws Error if validation fails or database operation fails
 */
export async function createExpense(
  command: CreateExpenseCommand,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<ExpenseDto> {
  
  // Validate category_id if provided
  if (command.category_id) {
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, is_active')
      .eq('id', command.category_id)
      .eq('is_active', true)
      .single();

    if (categoryError || !category) {
      throw new Error('CATEGORY_NOT_FOUND');
    }

    if (!category.is_active) {
      throw new Error('CATEGORY_INACTIVE');
    }
  }

  // Prepare expense data for insertion
  const expenseData = {
    user_id: userId, // Always use authenticated user's ID, ignore any payload override
    name: command.name,
    amount: command.amount,
    expense_date: command.expense_date,
    category_id: command.category_id || null,
    classification_status: 'pending' as const,
    predicted_category_id: null,
    prediction_confidence: null,
    corrected_category_id: null
  };

  // Insert expense record
  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert(expenseData)
    .select()
    .single();

  if (expenseError || !expense) {
    console.error('Failed to create expense:', expenseError);
    throw new Error('EXPENSE_CREATE_FAILED');
  }

  // Create log entry for the insert operation
  const logPayload = {
    action: 'insert',
    expense_data: {
      name: expense.name,
      amount: expense.amount,
      expense_date: expense.expense_date,
      category_id: expense.category_id
    },
    timestamp: new Date().toISOString()
  };

  const { error: logError } = await supabase
    .from('logs')
    .insert({
      user_id: userId,
      expense_id: expense.id,
      log_action: 'insert',
      payload: logPayload
    });

  if (logError) {
    console.error('Failed to create log entry:', logError);
    // Don't throw here - expense was created successfully, log is secondary
  }

  // Return the expense as ExpenseDto
  return {
    id: expense.id,
    user_id: expense.user_id,
    name: expense.name,
    amount: expense.amount,
    expense_date: expense.expense_date,
    category_id: expense.category_id,
    predicted_category_id: expense.predicted_category_id,
    prediction_confidence: expense.prediction_confidence,
    classification_status: expense.classification_status,
    corrected_category_id: expense.corrected_category_id,
    created_at: expense.created_at,
    updated_at: expense.updated_at
  };
}

/**
 * Updates an expense record with AI classification results.
 * 
 * @param expenseId - The expense ID to update
 * @param predictedCategoryId - The AI-predicted category ID
 * @param confidence - The prediction confidence score (0-1)
 * @param userId - The user ID for logging
 * @param supabase - Supabase client instance
 */
export async function updateExpenseClassification(
  expenseId: string,
  predictedCategoryId: string | null,
  confidence: number | null,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  
  const status = predictedCategoryId ? 'predicted' : 'failed';
  
  // Update expense with classification results
  const { error: updateError } = await supabase
    .from('expenses')
    .update({
      predicted_category_id: predictedCategoryId,
      prediction_confidence: confidence,
      classification_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', expenseId);

  if (updateError) {
    console.error('Failed to update expense classification:', updateError);
    throw new Error('CLASSIFICATION_UPDATE_FAILED');
  }

  // Create log entry for classification
  const logPayload = {
    action: 'classify',
    classification_result: {
      predicted_category_id: predictedCategoryId,
      confidence: confidence,
      status: status
    },
    timestamp: new Date().toISOString()
  };

  const { error: logError } = await supabase
    .from('logs')
    .insert({
      user_id: userId,
      expense_id: expenseId,
      log_action: 'classify',
      payload: logPayload
    });

  if (logError) {
    console.error('Failed to create classification log:', logError);
    // Don't throw - classification update was successful
  }
}
