import { test as setup, expect } from '@playwright/test';
import { login, TEST_USER } from '../helpers/auth.helper';
import path from 'path';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');

/**
 * Authentication setup
 * Runs once before all tests to create an authenticated session
 * Saves the authentication state to a file for reuse in tests
 */
setup('authenticate', async ({ page }) => {
  console.log('Setting up authentication for tests...');
  console.log('Base URL:', page.context()._options.baseURL || 'http://localhost:4200');

  // Check if credentials are available
  if (!TEST_USER.email || !TEST_USER.password) {
    throw new Error('E2E_USERNAME and E2E_PASSWORD must be set in .env.test file');
  }

  console.log('Credentials available:', {
    email: TEST_USER.email,
    hasPassword: !!TEST_USER.password,
  });

  // Navigate to login page first and check if it loads
  console.log('Navigating to /login...');
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 60000 });

  // Log page title and URL for debugging
  console.log('Page loaded. URL:', page.url());
  console.log('Page title:', await page.title());

  // Check for console errors
  page.on('console', msg => console.log('Browser console:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('Browser error:', err));

  // Take screenshot before attempting login
  await page.screenshot({ path: 'playwright/.auth/before-login.png' });

  // Check if login form is visible
  const emailField = page.getByLabel('Email');
  const isVisible = await emailField.isVisible().catch(() => false);
  console.log('Email field visible:', isVisible);

  if (!isVisible) {
    // Get page content for debugging
    const content = await page.content();
    console.log('Page HTML length:', content.length);
    console.log('Page HTML preview:', content.substring(0, 500));
    throw new Error('Login form not found on page');
  }

  // Perform login
  const loginSuccess = await login(page, TEST_USER);

  if (!loginSuccess) {
    await page.screenshot({ path: 'playwright/.auth/login-failed.png' });
    throw new Error('Authentication failed during setup. Check credentials in .env.test');
  }

  // Verify we're logged in
  await expect(page).toHaveURL(/.*\/app/);

  // Wait a bit to ensure session is fully established
  await page.waitForTimeout(1000);

  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });

  console.log('Authentication state saved successfully');
});
