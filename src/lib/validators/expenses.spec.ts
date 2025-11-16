import { createExpenseSchema, CreateExpenseInput } from './expenses';
import { ZodError } from 'zod';

describe('Expense Validators - Critical Amount Validation Tests', () => {
  
  describe('Amount Validation - Positive Values (TC-VAL-001)', () => {
    it('should accept valid positive amount', () => {
      const validInput: CreateExpenseInput = {
        name: 'Zakup książki',
        amount: 29.99,
        expense_date: '2025-01-15',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = createExpenseSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(29.99);
      }
    });

    it('should accept amount with two decimal places', () => {
      const validInput: CreateExpenseInput = {
        name: 'Pizza',
        amount: 45.50,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(45.50);
      }
    });

    it('should accept large amounts up to maximum', () => {
      const validInput: CreateExpenseInput = {
        name: 'Samochód',
        amount: 150000.00,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(150000.00);
      }
    });

    it('should accept minimum positive amount (0.01)', () => {
      const validInput: CreateExpenseInput = {
        name: 'Cukierek',
        amount: 0.01,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(0.01);
      }
    });
  });

  describe('Amount Validation - Reject Invalid Values', () => {
    it('should reject amount equal to zero', () => {
      const invalidInput = {
        name: 'Test',
        amount: 0,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
        expect(amountError?.message).toBe('Amount must be greater than 0');
      }
    });

    it('should reject negative amounts', () => {
      const testCases = [-1, -10.50, -100, -0.01];

      testCases.forEach(amount => {
        const invalidInput = {
          name: 'Test',
          amount: amount,
          expense_date: '2025-01-15'
        };

        const result = createExpenseSchema.safeParse(invalidInput);

        expect(result.success).toBe(false);
        if (!result.success) {
          const amountError = result.error.errors.find(
            err => err.path[0] === 'amount'
          );
          expect(amountError).toBeDefined();
          expect(amountError?.message).toBe('Amount must be greater than 0');
        }
      });
    });

    it('should reject null amount', () => {
      const invalidInput = {
        name: 'Test',
        amount: null as any,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
        // Zod will report 'Expected number, received null'
        expect(amountError?.code).toBe('invalid_type');
      }
    });

    it('should reject undefined amount', () => {
      const invalidInput = {
        name: 'Test',
        amount: undefined as any,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
        expect(amountError?.code).toBe('invalid_type');
      }
    });

    it('should reject string values', () => {
      const testCases = ['abc', '10.50', 'NaN', 'Infinity', ''];

      testCases.forEach(amount => {
        const invalidInput = {
          name: 'Test',
          amount: amount as any,
          expense_date: '2025-01-15'
        };

        const result = createExpenseSchema.safeParse(invalidInput);

        expect(result.success).toBe(false);
        if (!result.success) {
          const amountError = result.error.errors.find(
            err => err.path[0] === 'amount'
          );
          expect(amountError).toBeDefined();
          expect(amountError?.code).toBe('invalid_type');
        }
      });
    });

    it('should reject boolean values', () => {
      const invalidInput = {
        name: 'Test',
        amount: true as any,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
        expect(amountError?.code).toBe('invalid_type');
      }
    });

    it('should reject object values', () => {
      const invalidInput = {
        name: 'Test',
        amount: { value: 100 } as any,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
      }
    });

    it('should reject array values', () => {
      const invalidInput = {
        name: 'Test',
        amount: [100] as any,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });
  });

  describe('Amount Validation - Decimal Precision', () => {
    it('should accept amounts with up to 2 decimal places', () => {
      const validAmounts = [10.99, 29.50, 0.99, 1234.56];

      validAmounts.forEach(amount => {
        const validInput = {
          name: 'Test',
          amount: amount,
          expense_date: '2025-01-15'
        };

        const result = createExpenseSchema.safeParse(validInput);
        expect(result.success).toBe(true);
      });
    });

    it('should handle amounts with more than 2 decimal places (JavaScript precision)', () => {
      // Note: Zod number() doesn't enforce decimal places, 
      // but our max value constraint ensures practical limits
      const validInput = {
        name: 'Test',
        amount: 10.999, // JavaScript will handle this
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      // JavaScript floating point will be preserved
    });

    it('should handle integer amounts (implicit .00)', () => {
      const validInput = {
        name: 'Test',
        amount: 100, // No decimal part
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amount).toBe(100);
      }
    });
  });

  describe('Amount Validation - Maximum Value', () => {
    it('should accept amounts at maximum limit', () => {
      const validInput = {
        name: 'Duży zakup',
        amount: 9999999999.99,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(validInput);

      expect(result.success).toBe(true);
    });

    it('should reject amounts exceeding maximum', () => {
      const invalidInput = {
        name: 'Zbyt duży',
        amount: 10000000000.00, // Exceeds max
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
        expect(amountError?.message).toBe('Amount exceeds maximum allowed value');
      }
    });

    it('should reject Infinity', () => {
      const invalidInput = {
        name: 'Test',
        amount: Infinity,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
      }
    });

    it('should reject -Infinity', () => {
      const invalidInput = {
        name: 'Test',
        amount: -Infinity,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
    });

    it('should reject NaN', () => {
      const invalidInput = {
        name: 'Test',
        amount: NaN,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const amountError = result.error.errors.find(
          err => err.path[0] === 'amount'
        );
        expect(amountError).toBeDefined();
        expect(amountError?.code).toBe('invalid_type');
      }
    });
  });

  describe('Complete Schema Validation', () => {
    it('should validate all required fields together', () => {
      const validInput: CreateExpenseInput = {
        name: 'Zakup spożywczy',
        amount: 125.50,
        expense_date: '2025-01-15',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = createExpenseSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Zakup spożywczy');
        expect(result.data.amount).toBe(125.50);
        expect(result.data.expense_date).toBe('2025-01-15');
        expect(result.data.category_id).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('should allow optional category_id', () => {
      const validInput = {
        name: 'Test',
        amount: 50.00,
        expense_date: '2025-01-15'
        // category_id is optional
      };

      const result = createExpenseSchema.safeParse(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category_id).toBeUndefined();
      }
    });

    it('should validate name field constraints', () => {
      const invalidInput = {
        name: '', // Empty name
        amount: 50.00,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const nameError = result.error.errors.find(
          err => err.path[0] === 'name'
        );
        expect(nameError).toBeDefined();
        expect(nameError?.message).toBe('Name is required');
      }
    });

    it('should validate date format', () => {
      const invalidInput = {
        name: 'Test',
        amount: 50.00,
        expense_date: '15-01-2025' // Wrong format
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const dateError = result.error.errors.find(
          err => err.path[0] === 'expense_date'
        );
        expect(dateError).toBeDefined();
        expect(dateError?.message).toBe('Date must be in YYYY-MM-DD format');
      }
    });

    it('should validate category_id UUID format', () => {
      const invalidInput = {
        name: 'Test',
        amount: 50.00,
        expense_date: '2025-01-15',
        category_id: 'not-a-uuid'
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const categoryError = result.error.errors.find(
          err => err.path[0] === 'category_id'
        );
        expect(categoryError).toBeDefined();
        expect(categoryError?.message).toBe('Category ID must be a valid UUID');
      }
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle typical grocery expense', () => {
      const groceryExpense = {
        name: 'Zakupy w Biedronce',
        amount: 87.35,
        expense_date: '2025-01-15',
        category_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = createExpenseSchema.safeParse(groceryExpense);
      expect(result.success).toBe(true);
    });

    it('should handle fuel expense', () => {
      const fuelExpense = {
        name: 'Tankowanie BP 95',
        amount: 245.80,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(fuelExpense);
      expect(result.success).toBe(true);
    });

    it('should handle small coffee purchase', () => {
      const coffeeExpense = {
        name: 'Kawa w kawiarni',
        amount: 12.00,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(coffeeExpense);
      expect(result.success).toBe(true);
    });

    it('should handle large purchase like car', () => {
      const carExpense = {
        name: 'Samochód używany',
        amount: 45000.00,
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(carExpense);
      expect(result.success).toBe(true);
    });

    it('should prevent financial data corruption with invalid amounts', () => {
      const corruptData = [
        { name: 'Test', amount: -50, expense_date: '2025-01-15' },
        { name: 'Test', amount: 0, expense_date: '2025-01-15' },
        { name: 'Test', amount: 'abc' as any, expense_date: '2025-01-15' },
        { name: 'Test', amount: null as any, expense_date: '2025-01-15' },
      ];

      corruptData.forEach(data => {
        const result = createExpenseSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Form Integration Scenarios', () => {
    it('should provide user-friendly error messages for form validation', () => {
      const userInput = {
        name: 'Zakup',
        amount: -10, // User accidentally entered negative
        expense_date: '2025-01-15'
      };

      const result = createExpenseSchema.safeParse(userInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        expect(errors.amount).toBeDefined();
        expect(errors.amount?.[0]).toBe('Amount must be greater than 0');
      }
    });

    it('should validate multiple fields and return all errors', () => {
      const invalidInput = {
        name: '', // Invalid
        amount: 0, // Invalid
        expense_date: 'invalid-date', // Invalid
        category_id: 'not-uuid' // Invalid
      };

      const result = createExpenseSchema.safeParse(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
        
        // Should have errors for all invalid fields
        const fieldPaths = result.error.errors.map(err => err.path[0]);
        expect(fieldPaths).toContain('name');
        expect(fieldPaths).toContain('amount');
        expect(fieldPaths).toContain('expense_date');
        expect(fieldPaths).toContain('category_id');
      }
    });
  });
});

