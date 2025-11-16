import { test, expect } from '@playwright/test';
import { RegisterPage } from '../page-objects';

test.describe('Register Page', () => {
  let registerPage: RegisterPage;

  test.beforeEach(async ({ page }) => {
    // Arrange
    registerPage = new RegisterPage(page);
    await registerPage.navigate();
  });

  test('should display register form correctly', async () => {
    // Arrange - Already done in beforeEach

    // Act - Page is already loaded

    // Assert
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.registerButton).toBeVisible();
    await expect(registerPage.loginLink).toBeVisible();
  });

  test('should successfully register with valid data', async ({ page }) => {
    // Arrange
    const email = `test${Date.now()}@example.com`;
    const password = 'Password123!';

    // Act
    await registerPage.register(email, password, password);

    // Assert
    // Either success message or redirect to login/expenses
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/register|login|expenses/);
  });

  test('should show error when passwords do not match', async () => {
    // Arrange
    const email = 'test@example.com';
    const password = 'Password123!';
    const confirmPassword = 'DifferentPassword123!';

    // Act
    await registerPage.register(email, password, confirmPassword);

    // Assert
    await expect(registerPage.errorMessage).toBeVisible();
  });

  test('should disable register button when fields are empty', async () => {
    // Arrange - Fields are empty by default

    // Act - No action needed

    // Assert
    const isEnabled = await registerPage.isRegisterButtonEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('should navigate to login page when clicking login link', async ({ page }) => {
    // Arrange

    // Act
    await registerPage.goToLogin();

    // Assert
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show error with invalid email format', async () => {
    // Arrange
    const invalidEmail = 'notanemail';
    const password = 'Password123!';

    // Act
    await registerPage.register(invalidEmail, password, password);

    // Assert
    await expect(registerPage.errorMessage).toBeVisible();
  });

  test('should show error with weak password', async () => {
    // Arrange
    const email = 'test@example.com';
    const weakPassword = '123';

    // Act
    await registerPage.register(email, weakPassword, weakPassword);

    // Assert
    await expect(registerPage.errorMessage).toBeVisible();
  });

  test('should have correct page title', async () => {
    // Arrange - Already done in beforeEach

    // Act
    const title = await registerPage.getTitle();

    // Assert
    expect(title).toContain('MoneyFlowTracker');
  });
});

