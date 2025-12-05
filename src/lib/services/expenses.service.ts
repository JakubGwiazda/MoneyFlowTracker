import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';
import type { CreateExpenseCommand, UpdateExpenseCommand, ExpenseDto } from '../../types';

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
    corrected_category_id: null,
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
      category_id: expense.category_id,
    },
    timestamp: new Date().toISOString(),
  };

  const { error: logError } = await supabase.from('logs').insert({
    user_id: userId,
    expense_id: expense.id,
    log_action: 'insert',
    payload: logPayload,
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
    updated_at: expense.updated_at,
  };
}

/**
 * Updates an existing expense record.
 *
 * @param expenseId - The ID of the expense to update
 * @param command - The expense update command with new data
 * @param userId - The authenticated user's ID
 * @param supabase - Supabase client instance
 * @returns Promise<ExpenseDto> - The updated expense record
 * @throws Error if validation fails, expense not found, or update fails
 */
export async function updateExpense(
  expenseId: string,
  command: UpdateExpenseCommand,
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

  // Prepare update data
  const updateData: Database['public']['Tables']['expenses']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (command.name !== undefined) updateData.name = command.name;
  if (command.amount !== undefined) updateData.amount = command.amount;
  if (command.expense_date !== undefined) updateData.expense_date = command.expense_date;

  // Handle category update specially - might affect classification status
  if (command.category_id !== undefined) {
    updateData.category_id = command.category_id;
    // If user manually sets category, we might want to update status or corrected_category_id
    if (command.classification_status) {
      updateData.classification_status = command.classification_status;
    }
    // Logic for correction tracking could be here, but usually UI sends corrected_category_id logic
    // For now, simple update as per command
    if (command.classification_status === 'corrected') {
      updateData.corrected_category_id = command.category_id;
    }
  }

  if (command.classification_status !== undefined && command.category_id === undefined) {
    // Just status update (e.g. reclassify reset)
    updateData.classification_status = command.classification_status;
    if (command.classification_status === 'pending') {
      updateData.predicted_category_id = null;
      updateData.prediction_confidence = null;
    }
  }

  // Update expense record
  const { data: expense, error: updateError } = await supabase
    .from('expenses')
    .update(updateData)
    .eq('id', expenseId)
    .eq('user_id', userId) // Ensure ownership
    .select()
    .single();

  if (updateError || !expense) {
    console.error('Failed to update expense:', updateError);
    throw new Error('EXPENSE_UPDATE_FAILED');
  }

  // Create log entry for the update operation
  const logPayload = {
    action: 'update',
    changes: command,
    timestamp: new Date().toISOString(),
  };

  const { error: logError } = await supabase.from('logs').insert({
    user_id: userId,
    expense_id: expense.id,
    log_action: 'update',
    payload: logPayload,
  });

  if (logError) {
    console.error('Failed to create log entry:', logError);
  }

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
    updated_at: expense.updated_at,
  };
}

/**
 * Deletes an expense record.
 *
 * @param expenseId - The ID of the expense to delete
 * @param userId - The authenticated user's ID
 * @param supabase - Supabase client instance
 * @returns Promise<void>
 */
export async function deleteExpense(
  expenseId: string,
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Failed to delete expense:', deleteError);
    throw new Error('EXPENSE_DELETE_FAILED');
  }

  // Note: 'delete' action is not currently in log_action enum, so we skip logging for now
  // per requirements focusing on insert/update/classify.
}

/**
 * Creates a new expense record with classification data (for batch import/AI flow).
 *
 * @param data - The expense data including classification info
 * @param userId - The authenticated user's ID
 * @param supabase - Supabase client instance
 * @returns Promise<ExpenseDto>
 */
export async function createClassifiedExpense(
  data: {
    name: string;
    amount: number;
    expense_date: string;
    category_id: string | null;
    classification_status: 'predicted' | 'pending' | 'failed' | 'corrected';
    prediction_confidence?: number | null;
    predicted_category_id?: string | null;
  },
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<ExpenseDto> {
  const expenseData = {
    user_id: userId,
    name: data.name,
    amount: data.amount,
    expense_date: data.expense_date,
    category_id: data.category_id,
    classification_status: data.classification_status,
    predicted_category_id:
      data.predicted_category_id ??
      (data.classification_status === 'predicted' ? data.category_id : null),
    prediction_confidence: data.prediction_confidence ?? null,
    corrected_category_id: null,
  };

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert(expenseData)
    .select()
    .single();

  if (expenseError || !expense) {
    console.error('Failed to create classified expense:', expenseError);
    throw new Error('EXPENSE_CREATE_FAILED');
  }

  // Create log entry
  const logPayload = {
    action: 'insert', // It's still an insert
    expense_data: {
      name: expense.name,
      amount: expense.amount,
      expense_date: expense.expense_date,
      category_id: expense.category_id,
      classification_status: expense.classification_status,
    },
    timestamp: new Date().toISOString(),
  };

  const { error: logError } = await supabase.from('logs').insert({
    user_id: userId,
    expense_id: expense.id,
    log_action: 'insert',
    payload: logPayload,
  });

  if (logError) {
    console.error('Failed to create log entry:', logError);
  }

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
    updated_at: expense.updated_at,
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
      updated_at: new Date().toISOString(),
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
      status: status,
    },
    timestamp: new Date().toISOString(),
  };

  const { error: logError } = await supabase.from('logs').insert({
    user_id: userId,
    expense_id: expenseId,
    log_action: 'classify',
    payload: logPayload,
  });

  if (logError) {
    console.error('Failed to create classification log:', logError);
    // Don't throw - classification update was successful
  }
}
