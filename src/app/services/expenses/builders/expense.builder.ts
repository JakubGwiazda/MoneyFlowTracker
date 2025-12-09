import type { Database } from '../../../../db/database.types';
import type { CreateExpenseCommand } from '../../../../types';

/**
 * Builder for creating expense data objects.
 * Provides fluent API for constructing complex expense records.
 */
export class ExpenseBuilder {
  private data: Partial<Database['public']['Tables']['expenses']['Insert']> = {};

  constructor(private readonly userId: string) {
    this.data.user_id = userId;
  }

  /**
   * Sets the expense name
   */
  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * Sets the expense amount
   */
  withAmount(amount: number): this {
    this.data.amount = amount;
    return this;
  }

  /**
   * Sets the expense date
   */
  withDate(date: string): this {
    this.data.expense_date = date;
    return this;
  }

  /**
   * Sets the category ID
   */
  withCategory(categoryId: string | null): this {
    this.data.category_id = categoryId;
    return this;
  }

  /**
   * Sets classification as pending (default state)
   */
  asPending(): this {
    this.data.classification_status = 'pending';
    this.data.predicted_category_id = null;
    this.data.prediction_confidence = null;
    this.data.corrected_category_id = null;
    return this;
  }

  /**
   * Sets classification with AI prediction
   */
  withPrediction(categoryId: string | null, confidence: number | null): this {
    this.data.classification_status = categoryId ? 'predicted' : 'failed';
    this.data.predicted_category_id = categoryId;
    this.data.prediction_confidence = confidence;
    this.data.category_id = categoryId;
    this.data.corrected_category_id = null;
    return this;
  }

  /**
   * Sets classification as corrected
   */
  asCorrected(categoryId: string): this {
    this.data.classification_status = 'corrected';
    this.data.corrected_category_id = categoryId;
    this.data.category_id = categoryId;
    return this;
  }

  /**
   * Builds from a CreateExpenseCommand
   */
  fromCommand(command: CreateExpenseCommand): this {
    this.withName(command.name).withAmount(command.amount).withDate(command.expense_date);

    if (command.category_id) {
      this.withCategory(command.category_id);
    } else {
      this.asPending();
    }

    return this;
  }

  /**
   * Builds and returns the expense data
   */
  build(): Database['public']['Tables']['expenses']['Insert'] {
    if (!this.data.name || !this.data.amount || !this.data.expense_date) {
      throw new Error('Missing required expense fields: name, amount, or expense_date');
    }

    // Set defaults if not already set
    if (this.data.classification_status === undefined) {
      this.asPending();
    }

    return this.data as Database['public']['Tables']['expenses']['Insert'];
  }
}

/**
 * Builder for expense update operations
 */
export class ExpenseUpdateBuilder {
  private data: Database['public']['Tables']['expenses']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  /**
   * Updates the expense name
   */
  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  /**
   * Updates the expense amount
   */
  withAmount(amount: number): this {
    this.data.amount = amount;
    return this;
  }

  /**
   * Updates the expense date
   */
  withDate(date: string): this {
    this.data.expense_date = date;
    return this;
  }

  /**
   * Updates the category and optionally the classification status
   */
  withCategory(categoryId: string, classificationStatus?: string): this {
    this.data.category_id = categoryId;

    if (classificationStatus) {
      this.data.classification_status = classificationStatus as any;

      if (classificationStatus === 'corrected') {
        this.data.corrected_category_id = categoryId;
      }
    }

    return this;
  }

  /**
   * Resets classification to pending
   */
  resetClassification(): this {
    this.data.classification_status = 'pending';
    this.data.predicted_category_id = null;
    this.data.prediction_confidence = null;
    return this;
  }

  /**
   * Updates classification with AI prediction
   */
  withPrediction(categoryId: string | null, confidence: number | null): this {
    this.data.predicted_category_id = categoryId;
    this.data.prediction_confidence = confidence;
    this.data.classification_status = categoryId ? 'predicted' : 'failed';
    return this;
  }

  /**
   * Builds and returns the update data
   */
  build(): Database['public']['Tables']['expenses']['Update'] {
    return this.data;
  }
}
