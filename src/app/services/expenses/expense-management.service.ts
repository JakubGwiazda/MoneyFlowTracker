import { Injectable, inject } from '@angular/core';
import type { CreateExpenseCommand, UpdateExpenseCommand, ExpenseDto } from '../../../types';
import type { Database } from '../../../db/database.types';

import { SupabaseExpenseRepository } from './repositories/supabase-expense.repository';
import { CategoryValidator } from './validators/category.validator';
import { ExpenseLoggingService } from './logging/expense-logging.service';
import { ExpenseBuilder, ExpenseUpdateBuilder } from './builders/expense.builder';
import { ClassificationService } from '../classification/classification.service';
import { AuthService } from '../authorization/auth.service';
import { supabaseClient } from '../../../db/supabase.client';
import { lastValueFrom } from 'rxjs';

import type {
  IExpenseManagementService,
  ClassifiedExpenseData,
  CategoryDto,
} from './expense-management.interface';
import type {
  ExpensesFilterState,
  CategoryOptionViewModel,
  BatchClassifyExpenseInput,
} from '../../components/expenses/expenses.models';
import { ClassificationResult } from '../../models/openrouter';

/**
 * Unified service for all expense management operations.
 * Combines CRUD, querying, AI classification, and category management.
 * This is the main service that should be injected by components.
 */
@Injectable({ providedIn: 'root' })
export class ExpenseManagementService implements IExpenseManagementService {
  private readonly repository = inject(SupabaseExpenseRepository);
  private readonly validator = inject(CategoryValidator);
  private readonly logger = inject(ExpenseLoggingService);
  private readonly classificationService = inject(ClassificationService);
  private readonly authService = inject(AuthService);

  // ===== CRUD Operations =====

  /**
   * Creates a new expense record in the database.
   *
   * @param command - The expense creation command with validated data
   * @returns Promise<ExpenseDto> - The created expense record
   * @throws Error if validation fails or database operation fails
   */
  async createExpense(command: CreateExpenseCommand): Promise<ExpenseDto> {
    const user = await this.getCurrentUser();

    // Validate category if provided
    const validationResult = await this.validator.validate(command.category_id);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors[0]);
    }

    // Build expense data
    const expenseData = new ExpenseBuilder(user.id).fromCommand(command).build();

    // Create expense
    const expense = await this.repository.create(expenseData);

    // Log the operation (async, non-blocking)
    void this.logger.logCreate(expense, user.id);

    return expense;
  }

  /**
   * Updates an existing expense record.
   *
   * @param expenseId - The ID of the expense to update
   * @param command - The expense update command with new data
   * @returns Promise<ExpenseDto> - The updated expense record
   * @throws Error if validation fails, expense not found, or update fails
   */
  async updateExpense(expenseId: string, command: UpdateExpenseCommand): Promise<ExpenseDto> {
    const user = await this.getCurrentUser();

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
    const expense = await this.repository.update(expenseId, updateData, user.id);

    // Log the operation
    void this.logger.logUpdate(expenseId, command, user.id);

    return expense;
  }

  /**
   * Deletes an expense record.
   *
   * @param expenseId - The ID of the expense to delete
   * @returns Promise<void>
   */
  async deleteExpense(expenseId: string): Promise<void> {
    const user = await this.getCurrentUser();
    await this.repository.delete(expenseId, user.id);
    // Note: 'delete' action is not currently in log_action enum
  }

  /**
   * Updates multiple expenses with a new category.
   * This marks all expenses as 'corrected' with the specified category.
   *
   * @param expenseIds - Array of expense IDs to update
   * @param categoryId - The new category ID to apply
   * @returns Promise<void>
   * @throws Error if validation fails or mass update fails
   */
  async massUpdateCategory(expenseIds: string[], categoryId: string): Promise<void> {
    const user = await this.getCurrentUser();

    if (expenseIds.length === 0) {
      throw new Error('No expenses selected for update');
    }

    // Validate category
    const validationResult = await this.validator.validate(categoryId);
    if (!validationResult.isValid) {
      throw new Error(validationResult.errors[0]);
    }

    // Mass update expenses
    await this.repository.massUpdateCategory(expenseIds, categoryId, user.id);

    // Log the operation
    void this.logger.logUpdate(
      `mass_update_${expenseIds.length}`,
      { category_id: categoryId, classification_status: 'corrected' },
      user.id
    );
  }

  // ===== Query Operations =====

  /**
   * Queries expenses with filtering, sorting, and pagination
   */
  async queryExpenses(
    filters: ExpensesFilterState
  ): Promise<{ data: ExpenseDto[]; count: number }> {
    const user = await this.getCurrentUser();

    let query = supabaseClient
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id);

    // Apply filters
    if (filters.date_from) {
      query = query.gte('expense_date', filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte('expense_date', filters.date_to);
    }

    if (filters.status) {
      query = query.eq('classification_status', filters.status);
    }

    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }

    // Apply sorting
    if (filters.sort) {
      const [field, direction] = this.parseSortParam(filters.sort);
      query = query.order(field, { ascending: direction === 'asc' });
    } else {
      // Default sort by expense_date descending
      query = query.order('expense_date', { ascending: false });
    }

    // Apply pagination
    const fromIndex = (filters.page - 1) * filters.per_page;
    const toIndex = fromIndex + filters.per_page - 1;
    query = query.range(fromIndex, toIndex);

    const { data, error, count } = await query;

    if (error) {
      throw new Error('Nie udało się pobrać listy wydatków.');
    }

    const expenses: ExpenseDto[] = (data || []).map(
      (row: Database['public']['Tables']['expenses']['Row']) => ({
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        amount: row.amount,
        expense_date: row.expense_date,
        category_id: row.category_id,
        predicted_category_id: row.predicted_category_id,
        prediction_confidence: row.prediction_confidence,
        classification_status: row.classification_status,
        corrected_category_id: row.corrected_category_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })
    );

    return { data: expenses, count: count || 0 };
  }

  // ===== Category Operations =====

  /**
   * Loads categories for autocomplete (active only)
   */
  async loadCategories(query?: string): Promise<CategoryOptionViewModel[]> {
    const search = query?.trim() ?? '';

    const { data: categories, error } = await supabaseClient
      .from('categories')
      .select('id, name, is_active')
      .eq('is_active', true)
      .ilike('name', search ? `%${search}%` : '%')
      .order('name');

    if (error) {
      throw new Error('Nie udało się pobrać listy kategorii.');
    }

    return (categories || []).map(
      category =>
        ({
          id: category.id,
          label: category.name,
          isActive: category.is_active,
        }) satisfies CategoryOptionViewModel
    );
  }

  /**
   * Gets categories for AI classification (system + user's own categories)
   * RLS policy automatically filters to show only accessible categories
   */
  async getCategoriesForClassification(): Promise<CategoryDto[]> {
    const { data: categories, error } = await supabaseClient
      .from('categories')
      .select('id, name, parent_id, is_active, created_at, user_id')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new Error('Nie udało się pobrać kategorii do klasyfikacji.');
    }

    return categories || [];
  }

  // ===== AI Classification Operations =====

  /**
   * Suggests category using AI classification
   */
  async suggestCategory(description: string, amount: number): Promise<ClassificationResult> {
    return await lastValueFrom(this.classificationService.classifyExpense(description));
  }

  /**
   * Resets classification status to 'pending' to trigger re-classification
   */
  async reclassifyExpense(expenseId: string): Promise<void> {
    await this.updateExpense(expenseId, { classification_status: 'pending' });
  }

  /**
   * Batch classifies and creates multiple expenses
   */
  async batchClassifyAndCreateExpenses(expenses: BatchClassifyExpenseInput[]): Promise<void> {
    const user = await this.getCurrentUser();

    // Get categories for classification
    const categories = await this.getCategoriesForClassification();

    if (!categories) {
      throw new Error('Nie udało się pobrać kategorii do klasyfikacji.');
    }

    // Prepare expenses for classification
    const expensesToClassify = expenses.map(exp => ({
      description: exp.description,
      amount: exp.amount,
      date: exp.date,
    }));

    // Batch classify
    const classificationResults = await lastValueFrom(
      this.classificationService.batchClassifyExpenses(expensesToClassify)
    );

    if (!classificationResults) {
      throw new Error('Nie udało się sklasyfikować wydatków.');
    }

    // Create new categories if needed
    const newCategoriesToCreate = classificationResults
      .filter(result => result.isNewCategory)
      .map(result => result.newCategoryName);

    const uniqueNewCategories = [...new Set(newCategoriesToCreate)];
    const categoryNameToIdMap = new Map<string, string>();

    // Add existing categories to map
    categories.forEach(cat => {
      categoryNameToIdMap.set(cat.name, cat.id);
    });

    // Check if any of the "new" categories already exist for this user
    let categoriesToCreate = uniqueNewCategories;
    if (uniqueNewCategories.length > 0) {
      const { data: existingUserCategories, error: checkError } = await supabaseClient
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .in('name', uniqueNewCategories);

      if (checkError) {
        throw new Error('Nie udało się sprawdzić istniejących kategorii użytkownika.');
      }

      // Add existing user categories to map and filter out categories that already exist
      existingUserCategories?.forEach(cat => {
        categoryNameToIdMap.set(cat.name, cat.id);
      });

      const existingCategoryNames = new Set(existingUserCategories?.map(cat => cat.name) || []);
      categoriesToCreate = uniqueNewCategories.filter(name => !existingCategoryNames.has(name));
    }

    // Create only categories that don't already exist for this user
    if (categoriesToCreate.length > 0) {
      const { data: newCategories, error: createCategoriesError } = await supabaseClient
        .from('categories')
        .insert(
          categoriesToCreate.map(name => ({
            name,
            is_active: true,
            user_id: user.id,
          }))
        )
        .select('id, name');

      if (createCategoriesError) {
        throw new Error('Nie udało się utworzyć nowych kategorii.');
      }

      // Add new categories to map
      newCategories?.forEach(cat => {
        categoryNameToIdMap.set(cat.name, cat.id);
      });
    }

    // Create expenses with assigned categories AND LOGGING using Promise.all
    const creationPromises = expenses.map((expense, index) => {
      const classification = classificationResults[index];
      let categoryId: string | null = null;

      if (classification.categoryId) {
        // Verify that the category ID exists in available categories
        const categoryExists = categories.some(cat => cat.id === classification.categoryId);
        if (categoryExists) {
          categoryId = classification.categoryId;
        } else {
          console.warn(
            `Category ID ${classification.categoryId} not found in available categories, treating as new category`
          );
          // Fallback: try to find by category name in the map
          categoryId = categoryNameToIdMap.get(classification.categoryName) || null;
        }
      } else if (classification.isNewCategory) {
        categoryId = categoryNameToIdMap.get(classification.newCategoryName) || null;
      }

      return this.createClassifiedExpenseInternal(
        {
          name: expense.description,
          amount: expense.amount,
          expense_date: expense.date,
          category_id: categoryId,
          classification_status: 'predicted',
          prediction_confidence: classification.confidence,
        },
        user.id
      );
    });

    await Promise.all(creationPromises);
  }

  // ===== Special Operations =====

  /**
   * Creates a new expense record with classification data (for batch import/AI flow).
   * Public API - uses getCurrentUser internally.
   *
   * @param data - The expense data including classification info
   * @returns Promise<ExpenseDto>
   */
  async createClassifiedExpense(data: ClassifiedExpenseData): Promise<ExpenseDto> {
    const user = await this.getCurrentUser();
    return this.createClassifiedExpenseInternal(data, user.id);
  }

  /**
   * Internal method for creating classified expenses with explicit userId.
   * Used by batch operations that already have the user context.
   */
  private async createClassifiedExpenseInternal(
    data: ClassifiedExpenseData,
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
   */
  async updateExpenseClassification(
    expenseId: string,
    predictedCategoryId: string | null,
    confidence: number | null
  ): Promise<void> {
    const user = await this.getCurrentUser();

    // Build update with classification
    const updateData = new ExpenseUpdateBuilder()
      .withPrediction(predictedCategoryId, confidence)
      .build();

    // Update expense
    await this.repository.update(expenseId, updateData, user.id);

    // Log classification
    void this.logger.logClassification(expenseId, predictedCategoryId, confidence, user.id);
  }

  // ===== Private Helper Methods =====

  /**
   * Gets current authenticated user
   */
  private async getCurrentUser() {
    await this.authService.waitForInitialization();
    const user = this.authService.authState().user;

    if (!user) {
      throw new Error('Nie jesteś zalogowany.');
    }

    return user;
  }

  /**
   * Parses sort parameter string into field and direction
   */
  private parseSortParam(sort: string): [string, 'asc' | 'desc'] {
    if (sort.endsWith(':desc')) {
      return [sort.replace(':desc', ''), 'desc'];
    }
    return [sort, 'asc'];
  }
}
