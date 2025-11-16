import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';

test.describe('Login Page', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    // Arrange
    loginPage = new LoginPage(page);
    await loginPage.navigate();
  });

  test('should display login form correctly', async () => {
    // Arrange - Already done in beforeEach

    // Act - Page is already loaded

    // Assert
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.loginButton).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Arrange
    const validEmail = 'test@example.com';
    const validPassword = 'Password123!';

    // Act
    await loginPage.login(validEmail, validPassword);

    // Assert
    await expect(page).toHaveURL(/.*expenses/);
  });

  test('should show error message with invalid credentials', async () => {
    // Arrange
    const invalidEmail = 'invalid@example.com';
    const invalidPassword = 'wrongpassword';

    // Act
    await loginPage.login(invalidEmail, invalidPassword);

    // Assert
    await expect(loginPage.errorMessage).toBeVisible();
    const errorText = await loginPage.getErrorMessageText();
    expect(errorText).toBeTruthy();
  });

  test('should disable login button when fields are empty', async () => {
    // Arrange - Fields are empty by default

    // Act - No action needed

    // Assert
    const isEnabled = await loginPage.isLoginButtonEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('should navigate to register page when clicking register link', async ({ page }) => {
    // Arrange

    // Act
    await loginPage.goToRegister();

    // Assert
    await expect(page).toHaveURL(/.*register/);
  });

  test('should not allow login with empty email', async () => {
    // Arrange
    const password = 'Password123!';

    // Act
    await loginPage.passwordInput.fill(password);

    // Assert
    const isEnabled = await loginPage.isLoginButtonEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('should not allow login with empty password', async () => {
    // Arrange
    const email = 'test@example.com';

    // Act
    await loginPage.emailInput.fill(email);

    // Assert
    const isEnabled = await loginPage.isLoginButtonEnabled();
    expect(isEnabled).toBeFalsy();
  });

  test('should have correct page title', async () => {
    // Arrange - Already done in beforeEach

    // Act
    const title = await loginPage.getTitle();

    // Assert
    expect(title).toContain('MoneyFlowTracker');
  });
});

