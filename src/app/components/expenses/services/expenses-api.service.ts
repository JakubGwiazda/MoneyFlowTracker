import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap, lastValueFrom } from 'rxjs';
import { supabaseClient } from '../../../../db/supabase.client';
import type { Database } from '../../../../db/database.types';
import { ClassificationService } from '../../../../lib/services/classification.service';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  createClassifiedExpense,
} from '../../../../lib/services/expenses.service';
import { ClassificationResult } from '../../../../lib/models/openrouter';
import { AuthService } from '../../../../lib/services/auth.service';

import type { CreateExpenseCommand, ExpenseDto, UpdateExpenseCommand } from '../../../../types';
import type {
  ExpensesFilterState,
  CategoryOptionViewModel,
  BatchClassifyExpenseInput,
} from '../expenses.models';

@Injectable({ providedIn: 'root' })
export class ExpensesApiService {
  private readonly classificationService = inject(ClassificationService);
  private readonly authService = inject(AuthService);

  /**
   * Queries expenses with filtering, sorting, and pagination
   */
  queryExpenses(filters: ExpensesFilterState): Observable<{ data: ExpenseDto[]; count: number }> {
    return from(this.getCurrentUser()).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('Nie jesteś zalogowany.');
        }

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

        return from(query);
      }),
      map(({ data, error, count }) => {
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
      })
    );
  }

  /**
   * Creates a new expense
   */
  createExpense(command: CreateExpenseCommand): Observable<ExpenseDto> {
    return from(this.getCurrentUser()).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('Nie jesteś zalogowany.');
        }
        return createExpense(command, user.id, supabaseClient);
      })
    );
  }

  /**
   * Updates an existing expense
   */
  updateExpense(expenseId: string, command: UpdateExpenseCommand): Observable<ExpenseDto> {
    return from(this.getCurrentUser()).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('Nie jesteś zalogowany.');
        }
        return updateExpense(expenseId, command, user.id, supabaseClient);
      })
    );
  }

  /**
   * Deletes an expense
   */
  deleteExpense(expenseId: string): Observable<void> {
    return from(this.getCurrentUser()).pipe(
      switchMap(user => {
        if (!user) {
          throw new Error('Nie jesteś zalogowany.');
        }
        return deleteExpense(expenseId, user.id, supabaseClient);
      })
    );
  }

  /**
   * Resets classification status to trigger re-classification
   */
  reclassifyExpense(expenseId: string): Observable<void> {
    return from(this.getCurrentUser()).pipe(
      switchMap(async user => {
        if (!user) {
          throw new Error('Nie jesteś zalogowany.');
        }

        await updateExpense(
          expenseId,
          { classification_status: 'pending' },
          user.id,
          supabaseClient
        );
      })
    );
  }

  /**
   * Loads categories for autocomplete
   */
  loadCategories(query?: string): Observable<CategoryOptionViewModel[]> {
    const search = query?.trim() ?? '';

    return from(
      supabaseClient
        .from('categories')
        .select('id, name, is_active')
        .eq('is_active', true)
        .ilike('name', search ? `%${search}%` : '%')
        .order('name')
    ).pipe(
      map(({ data: categories, error }) => {
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
      })
    );
  }

  /**
   * Gets categories for AI classification
   */
  getCategoriesForClassification(): Observable<
    {
      id: string;
      name: string;
      parent_id: null;
      is_active: boolean;
      created_at: string;
      user_id: null;
    }[]
  > {
    return from(
      supabaseClient
        .from('categories')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name')
    ).pipe(
      map(({ data: categories, error }) => {
        if (error) {
          throw new Error('Nie udało się pobrać kategorii do klasyfikacji.');
        }

        return (categories || []).map(cat => ({
          id: cat.id,
          name: cat.name,
          parent_id: null,
          is_active: cat.is_active,
          created_at: new Date().toISOString(),
          user_id: null,
        }));
      })
    );
  }

  /**
   * Suggests category using AI classification
   */
  suggestCategory(description: string): Observable<ClassificationResult> {
    return this.classificationService.classifyExpense(description);
  }

  /**
   * Batch classifies and creates expenses
   */
  batchClassifyAndCreateExpenses(expenses: BatchClassifyExpenseInput[]): Observable<void> {
    return from(this.getCurrentUser()).pipe(
      switchMap(async user => {
        if (!user) {
          throw new Error('Nie jesteś zalogowany.');
        }

        // Get categories for classification
        const categories = await lastValueFrom(this.getCategoriesForClassification());
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
            categoryId = classification.categoryId;
          } else if (classification.isNewCategory) {
            categoryId = categoryNameToIdMap.get(classification.newCategoryName) || null;
          }

          return createClassifiedExpense(
            {
              name: expense.description,
              amount: expense.amount,
              expense_date: expense.date,
              category_id: categoryId,
              classification_status: 'predicted',
              prediction_confidence: classification.confidence,
            },
            user.id,
            supabaseClient
          );
        });

        await Promise.all(creationPromises);
      })
    );
  }

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
