import { Injectable, inject } from '@angular/core';
import type { CreateExpenseCommand, UpdateExpenseCommand, ExpenseDto } from '../../../types';

import { SupabaseExpenseRepository } from './repositories/supabase-expense.repository';
import { CategoryValidator } from './validators/category.validator';
import { ExpenseLoggingService } from './logging/expense-logging.service';
import { ExpenseBuilder, ExpenseUpdateBuilder } from './builders/expense.builder';

/**
 * High-level service for managing expense operations.
 * Orchestrates repository, validation, and logging services.
 * This is the main service that should be injected by components/facades.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseManagementService {
  private readonly repository = inject(SupabaseExpenseRepository);
  private readonly validator = inject(CategoryValidator);
  private readonly logger = inject(ExpenseLoggingService);

  /**
   * Creates a new expense record in the database.
   *
   * @param command - The expense creation command with validated data
   * @param userId - The authenticated user's ID from JWT token
   * @returns Promise<ExpenseDto> - The created expense record
   * @throws Error if validation fails or database operation fails
   */
  async createExpense(command: CreateExpenseCommand, userId: string): Promise<ExpenseDto> {
    // Validate category if provided
    const validationResult = await this.validator.validate(command.category_id);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors[0]);
    }

    // Build expense data
    const expenseData = new ExpenseBuilder(userId).fromCommand(command).build();

    // Create expense
    const expense = await this.repository.create(expenseData);

    // Log the operation (async, non-blocking)
    void this.logger.logCreate(expense, userId);

    return expense;
  }

  /**
   * Updates an existing expense record.
   *
   * @param expenseId - The ID of the expense to update
   * @param command - The expense update command with new data
   * @param userId - The authenticated user's ID
   * @returns Promise<ExpenseDto> - The updated expense record
   * @throws Error if validation fails, expense not found, or update fails
   */
  async updateExpense(
    expenseId: string,
    command: UpdateExpenseCommand,
    userId: string
  ): Promise<ExpenseDto> {
    // Validate category if provided
    if (command.category_id) {
      const validationResult = await this.validator.validate(command.category_id);
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors[0]);
      }
    }

    // Build update data
    const builder = new ExpenseUpdateBuilder();

    if (command.name !== undefined) builder.withName(command.name);
    if (command.amount !== undefined) builder.withAmount(command.amount);
    if (command.expense_date !== undefined) builder.withDate(command.expense_date);

    // Handle category update with classification status
    if (command.category_id !== undefined) {
      builder.withCategory(command.category_id!, command.classification_status);
    } else if (command.classification_status === 'pending') {
      // Reset classification without category change
      builder.resetClassification();
    }

    const updateData = builder.build();

    // Update expense
    const expense = await this.repository.update(expenseId, updateData, userId);

    // Log the operation
    void this.logger.logUpdate(expenseId, command, userId);

    return expense;
  }

  /**
   * Deletes an expense record.
   *
   * @param expenseId - The ID of the expense to delete
   * @param userId - The authenticated user's ID
   * @returns Promise<void>
   */
  async deleteExpense(expenseId: string, userId: string): Promise<void> {
    await this.repository.delete(expenseId, userId);
    // Note: 'delete' action is not currently in log_action enum
  }

  /**
   * Creates a new expense record with classification data (for batch import/AI flow).
   *
   * @param data - The expense data including classification info
   * @param userId - The authenticated user's ID
   * @returns Promise<ExpenseDto>
   */
  async createClassifiedExpense(
    data: {
      name: string;
      amount: number;
      expense_date: string;
      category_id: string | null;
      classification_status: 'predicted' | 'pending' | 'failed' | 'corrected';
      prediction_confidence?: number | null;
      predicted_category_id?: string | null;
    },
    userId: string
  ): Promise<ExpenseDto> {
    // Build expense with classification data
    const builder = new ExpenseBuilder(userId)
      .withName(data.name)
      .withAmount(data.amount)
      .withDate(data.expense_date);

    // Apply classification based on status
    if (data.classification_status === 'predicted') {
      const predictedId =
        data.predicted_category_id ??
        (data.classification_status === 'predicted' ? data.category_id : null);
      builder.withPrediction(predictedId, data.prediction_confidence ?? null);
    } else if (data.classification_status === 'corrected' && data.category_id) {
      builder.asCorrected(data.category_id);
    } else if (data.classification_status === 'failed') {
      builder.withPrediction(null, null);
    } else {
      builder.withCategory(data.category_id).asPending();
    }

    const expenseData = builder.build();

    // Create expense
    const expense = await this.repository.create(expenseData);

    // Log the operation
    void this.logger.logCreate(expense, userId);

    return expense;
  }

  /**
   * Updates an expense record with AI classification results.
   *
   * @param expenseId - The expense ID to update
   * @param predictedCategoryId - The AI-predicted category ID
   * @param confidence - The prediction confidence score (0-1)
   * @param userId - The user ID for logging
   */
  async updateExpenseClassification(
    expenseId: string,
    predictedCategoryId: string | null,
    confidence: number | null,
    userId: string
  ): Promise<void> {
    // Build update with classification
    const updateData = new ExpenseUpdateBuilder()
      .withPrediction(predictedCategoryId, confidence)
      .build();

    // Update expense
    await this.repository.update(expenseId, updateData, userId);

    // Log classification
    void this.logger.logClassification(expenseId, predictedCategoryId, confidence, userId);
  }

  /**
   * Updates multiple expenses with a new category.
   * This marks all expenses as 'corrected' with the specified category.
   *
   * @param expenseIds - Array of expense IDs to update
   * @param categoryId - The new category ID to apply
   * @param userId - The authenticated user's ID
   * @returns Promise<void>
   * @throws Error if validation fails or mass update fails
   */
  async massUpdateCategory(
    expenseIds: string[],
    categoryId: string,
    userId: string
  ): Promise<void> {
    if (expenseIds.length === 0) {
      throw new Error('No expenses selected for update');
    }

    // Validate category
    const validationResult = await this.validator.validate(categoryId);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors[0]);
    }

    // Mass update expenses
    await this.repository.massUpdateCategory(expenseIds, categoryId, userId);

    // Log the operation
    void this.logger.logUpdate(
      `mass_update_${expenseIds.length}`,
      { category_id: categoryId, classification_status: 'corrected' },
      userId
    );
  }
}
