// import type { SupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '../../../db/database.types';
// import type { CreateExpenseCommand, UpdateExpenseCommand, ExpenseDto } from '../../../types';
// import { ExpenseManagementService } from './expense-management.service';

// /**
//  * @deprecated Use ExpenseManagementService instead.
//  *
//  * Legacy functional API for managing expense operations.
//  * Maintained for backward compatibility. New code should inject ExpenseManagementService.
//  *
//  * These functions delegate to ExpenseManagementService internally.
//  */

// // Create a singleton instance for the legacy functions
// let serviceInstance: ExpenseManagementService | null = null;

// function getServiceInstance(): ExpenseManagementService {
//   if (!serviceInstance) {
//     serviceInstance = new ExpenseManagementService();
//   }
//   return serviceInstance;
// }

// /**
//  * Creates a new expense record in the database.
//  *
//  * @deprecated Use ExpenseManagementService.createExpense() instead
//  * @param command - The expense creation command with validated data
//  * @param userId - The authenticated user's ID from JWT token
//  * @param supabase - Supabase client instance (ignored, kept for compatibility)
//  * @returns Promise<ExpenseDto> - The created expense record
//  * @throws Error if validation fails or database operation fails
//  */
// export async function createExpense(
//   command: CreateExpenseCommand,
//   userId: string,
//   supabase: SupabaseClient<Database>
// ): Promise<ExpenseDto> {
//   return getServiceInstance().createExpense(command, userId);
// }

// /**
//  * Updates an existing expense record.
//  *
//  * @deprecated Use ExpenseManagementService.updateExpense() instead
//  * @param expenseId - The ID of the expense to update
//  * @param command - The expense update command with new data
//  * @param userId - The authenticated user's ID
//  * @param supabase - Supabase client instance (ignored, kept for compatibility)
//  * @returns Promise<ExpenseDto> - The updated expense record
//  * @throws Error if validation fails, expense not found, or update fails
//  */
// export async function updateExpense(
//   expenseId: string,
//   command: UpdateExpenseCommand,
//   userId: string,
//   supabase: SupabaseClient<Database>
// ): Promise<ExpenseDto> {
//   return getServiceInstance().updateExpense(expenseId, command, userId);
// }

// /**
//  * Deletes an expense record.
//  *
//  * @deprecated Use ExpenseManagementService.deleteExpense() instead
//  * @param expenseId - The ID of the expense to delete
//  * @param userId - The authenticated user's ID
//  * @param supabase - Supabase client instance (ignored, kept for compatibility)
//  * @returns Promise<void>
//  */
// export async function deleteExpense(
//   expenseId: string,
//   userId: string,
//   supabase: SupabaseClient<Database>
// ): Promise<void> {
//   return getServiceInstance().deleteExpense(expenseId, userId);
// }

// /**
//  * Creates a new expense record with classification data (for batch import/AI flow).
//  *
//  * @deprecated Use ExpenseManagementService.createClassifiedExpense() instead
//  * @param data - The expense data including classification info
//  * @param userId - The authenticated user's ID
//  * @param supabase - Supabase client instance (ignored, kept for compatibility)
//  * @returns Promise<ExpenseDto>
//  */
// export async function createClassifiedExpense(
//   data: {
//     name: string;
//     amount: number;
//     expense_date: string;
//     category_id: string | null;
//     classification_status: 'predicted' | 'pending' | 'failed' | 'corrected';
//     prediction_confidence?: number | null;
//     predicted_category_id?: string | null;
//   },
//   userId: string,
//   supabase: SupabaseClient<Database>
// ): Promise<ExpenseDto> {
//   return getServiceInstance().createClassifiedExpense(data, userId);
// }

// /**
//  * Updates an expense record with AI classification results.
//  *
//  * @deprecated Use ExpenseManagementService.updateExpenseClassification() instead
//  * @param expenseId - The expense ID to update
//  * @param predictedCategoryId - The AI-predicted category ID
//  * @param confidence - The prediction confidence score (0-1)
//  * @param userId - The user ID for logging
//  * @param supabase - Supabase client instance (ignored, kept for compatibility)
//  */
// export async function updateExpenseClassification(
//   expenseId: string,
//   predictedCategoryId: string | null,
//   confidence: number | null,
//   userId: string,
//   supabase: SupabaseClient<Database>
// ): Promise<void> {
//   return getServiceInstance().updateExpenseClassification(
//     expenseId,
//     predictedCategoryId,
//     confidence,
//     userId
//   );
// }
