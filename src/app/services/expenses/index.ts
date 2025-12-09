/**
 * Expense Services Module
 *
 * Public API for expense management functionality.
 * Use these exports in your application code.
 */

// Main service (recommended for new code)
export { ExpenseManagementService } from './expense-management.service';

// Repository interfaces and implementations
export { IExpenseRepository } from './repositories/expense.repository.interface';
export { SupabaseExpenseRepository } from './repositories/supabase-expense.repository';

// Validators
export { CategoryValidator, type ValidationResult } from './validators/category.validator';

// Builders
export { ExpenseBuilder, ExpenseUpdateBuilder } from './builders/expense.builder';

// Logging
export { ExpenseLoggingService } from './logging/expense-logging.service';