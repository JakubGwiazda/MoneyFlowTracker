import { Page, expect } from '@playwright/test';

/**
 * Helper functions for authentication tests
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Default test user credentials from environment variables
 * Make sure this user exists in your test database
 * Configure in .env.test file: E2E_USERNAME and E2E_PASSWORD
 */
export const TEST_USER: LoginCredentials = {
  email: process.env['E2E_USERNAME'] || '',
  password: process.env['E2E_PASSWORD'] || '',
};

/**
 * Fills in the login form with provided credentials
 */
export async function fillLoginForm(
  page: Page,
  credentials: LoginCredentials
): Promise<void> {
  await page.getByLabel('Email').fill(credentials.email);
  await page.getByLabel('Hasło').fill(credentials.password);
}

/**
 * Performs a complete login action
 * @returns true if login was successful, false otherwise
 */
export async function login(
  page: Page,
  credentials: LoginCredentials = TEST_USER
): Promise<boolean> {
  await page.goto('/login');
  await fillLoginForm(page, credentials);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();

  // Wait for either redirect to /app or error message
  try {
    await page.waitForURL(/.*\/app/, { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if user is logged in by verifying current URL
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  return url.includes('/app') && !url.includes('/login');
}

/**
 * Performs logout action
 * Assumes logout button is available in the UI
 */
export async function logout(page: Page): Promise<void> {
  // This will need to be implemented based on your logout UI
  // For now, we can navigate to login which should clear session
  await page.goto('/login');
  await page.waitForURL(/.*\/login/);
}

/**
 * Waits for and returns error message if present
 */
export async function getErrorMessage(page: Page): Promise<string | null> {
  try {
    const errorElement = page.locator('.error-message');
    await errorElement.waitFor({ state: 'visible', timeout: 5000 });
    return await errorElement.textContent();
  } catch {
    return null;
  }
}

/**
 * Checks if login form is valid (submit button enabled)
 */
export async function isLoginFormValid(page: Page): Promise<boolean> {
  const submitButton = page.getByRole('button', { name: 'Zaloguj się' });
  return !(await submitButton.isDisabled());
}

/**
 * Clears login form
 */
export async function clearLoginForm(page: Page): Promise<void> {
  await page.getByLabel('Email').clear();
  await page.getByLabel('Hasło').clear();
}

