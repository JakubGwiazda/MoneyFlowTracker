import type {
  CreateExpenseCommand,
  UpdateExpenseCommand,
  ExpenseDto,
} from '../../../types';
import type { ClassificationResult } from '../../models/openrouter';
import type {
  ExpensesFilterState,
  CategoryOptionViewModel,
  BatchClassifyExpenseInput,
} from '../../components/expenses/expenses.models';

/**
 * Data structure for creating classified expenses (batch import/AI flow)
 */
export interface ClassifiedExpenseData {
  name: string;
  amount: number;
  expense_date: string;
  category_id: string | null;
  classification_status: 'predicted' | 'pending' | 'failed' | 'corrected';
  prediction_confidence?: number | null;
  predicted_category_id?: string | null;
}

/**
 * Category data transfer object for classification
 */
export interface CategoryDto {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  created_at: string;
  user_id: string | null;
}

/**
 * Unified interface for expense management operations.
 * Combines CRUD, querying, AI classification, and category management.
 */
export interface IExpenseManagementService {
  // ===== CRUD Operations =====

  /**
   * Creates a new expense record
   */
  createExpense(command: CreateExpenseCommand): Promise<ExpenseDto>;

  /**
   * Updates an existing expense record
   */
  updateExpense(expenseId: string, command: UpdateExpenseCommand): Promise<ExpenseDto>;

  /**
   * Deletes an expense record
   */
  deleteExpense(expenseId: string): Promise<void>;

  /**
   * Updates multiple expenses with a new category (marks as 'corrected')
   */
  massUpdateCategory(expenseIds: string[], categoryId: string): Promise<void>;

  // ===== Query Operations =====

  /**
   * Queries expenses with filtering, sorting, and pagination
   */
  queryExpenses(
    filters: ExpensesFilterState
  ): Promise<{ data: ExpenseDto[]; count: number }>;

  // ===== Category Operations =====

  /**
   * Loads categories for autocomplete (active only)
   */
  loadCategories(query?: string): Promise<CategoryOptionViewModel[]>;

  /**
   * Gets categories for AI classification (system + user's own categories)
   */
  getCategoriesForClassification(): Promise<CategoryDto[]>;

  // ===== AI Classification Operations =====

  /**
   * Suggests category using AI classification
   */
  suggestCategory(description: string, amount: number): Promise<ClassificationResult>;

  /**
   * Batch classifies and creates multiple expenses
   */
  batchClassifyAndCreateExpenses(expenses: BatchClassifyExpenseInput[]): Promise<void>;

  /**
   * Resets classification status to 'pending' to trigger re-classification
   */
  reclassifyExpense(expenseId: string): Promise<void>;

  // ===== Special Operations =====

  /**
   * Creates a new expense with classification data (for batch import/AI flow)
   */
  createClassifiedExpense(data: ClassifiedExpenseData): Promise<ExpenseDto>;

  /**
   * Updates an expense with AI classification results
   */
  updateExpenseClassification(
    expenseId: string,
    predictedCategoryId: string | null,
    confidence: number | null
  ): Promise<void>;
}
