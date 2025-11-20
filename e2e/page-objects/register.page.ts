import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object Model for the Register page
 */
export class RegisterPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get emailInput() {
    return this.getByTestId('register-email-input');
  }

  get passwordInput() {
    return this.getByTestId('register-password-input');
  }

  get confirmPasswordInput() {
    return this.getByTestId('register-confirm-password-input');
  }

  get registerButton() {
    return this.getByTestId('register-submit-button');
  }

  get loginLink() {
    return this.getByTestId('register-login-link');
  }

  get errorMessage() {
    return this.getByTestId('register-error-message');
  }

  get successMessage() {
    return this.getByTestId('register-success-message');
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto('/register');
    await this.waitForPageLoad();
  }

  async register(email: string, password: string, confirmPassword: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.registerButton.click();
  }

  async goToLogin(): Promise<void> {
    await this.loginLink.click();
  }

  async getErrorMessageText(): Promise<string | null> {
    return await this.errorMessage.textContent();
  }

  async getSuccessMessageText(): Promise<string | null> {
    return await this.successMessage.textContent();
  }

  async isRegisterButtonEnabled(): Promise<boolean> {
    return await this.registerButton.isEnabled();
  }
}

