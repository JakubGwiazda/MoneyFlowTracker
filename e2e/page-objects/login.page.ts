import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page Object Model for the Login page
 */
export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Locators
  get emailInput() {
    return this.getByTestId('login-email-input');
  }

  get passwordInput() {
    return this.getByTestId('login-password-input');
  }

  get loginButton() {
    return this.getByTestId('login-submit-button');
  }

  get registerLink() {
    return this.getByTestId('login-register-link');
  }

  get errorMessage() {
    return this.getByTestId('login-error-message');
  }

  // Actions
  async navigate(): Promise<void> {
    await this.goto('/login');
    await this.waitForPageLoad();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async goToRegister(): Promise<void> {
    await this.registerLink.click();
  }

  async getErrorMessageText(): Promise<string | null> {
    return await this.errorMessage.textContent();
  }

  async isLoginButtonEnabled(): Promise<boolean> {
    return await this.loginButton.isEnabled();
  }
}

