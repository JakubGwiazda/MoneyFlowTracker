import { Page } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page Object Model for the Add Category Dialog
 */
export class AddCategoryDialog extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get dialog() {
    return this.getByTestId('add-category-dialog');
  }

  get nameInput() {
    return this.getByTestId('category-name-input');
  }

  get descriptionInput() {
    return this.getByTestId('category-description-input');
  }

  get colorInput() {
    return this.getByTestId('category-color-input');
  }

  get saveButton() {
    return this.getByTestId('category-save-button');
  }

  get cancelButton() {
    return this.getByTestId('category-cancel-button');
  }

  get errorMessage() {
    return this.getByTestId('category-error-message');
  }

  // Actions
  async waitForDialog(): Promise<void> {
    await this.dialog.waitFor({ state: 'visible' });
  }

  async fillCategoryForm(data: {
    name: string;
    description?: string;
    color?: string;
  }): Promise<void> {
    await this.nameInput.fill(data.name);
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

