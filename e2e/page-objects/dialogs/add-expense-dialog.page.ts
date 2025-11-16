import { Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page Object Model for the Add Expense Dialog
 */
export class AddExpenseDialog extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get dialog() {
    return this.getByTestId('add-expense-dialog');
  }

  get descriptionInput() {
    return this.getByTestId('expense-description-input');
  }

  get amountInput() {
    return this.getByTestId('expense-amount-input');
  }

  get categorySelect() {
    return this.getByTestId('expense-category-select');
  }

  get dateInput() {
    return this.getByTestId('expense-date-input');
  }

  get saveButton() {
    return this.getByTestId('expense-save-button');
  }

  get cancelButton() {
    return this.getByTestId('expense-cancel-button');
  }

  get errorMessage() {
    return this.getByTestId('expense-error-message');
  }

  // Actions
  async waitForDialog(): Promise<void> {
    await this.dialog.waitFor({ state: 'visible' });
  }

  async fillExpenseForm(data: {
    description: string;
    amount: string;
    category: string;
    date: string;
  }): Promise<void> {
    await this.descriptionInput.fill(data.description);
    await this.amountInput.fill(data.amount);
    await this.categorySelect.click();
    await this.page.getByRole('option', { name: data.category }).click();
    await this.dateInput.fill(data.date);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async isSaveButtonEnabled(): Promise<boolean> {
    return await this.saveButton.isEnabled();
  }

  async getErrorMessageText(): Promise<string | null> {
    return await this.errorMessage.textContent();
  }
}

