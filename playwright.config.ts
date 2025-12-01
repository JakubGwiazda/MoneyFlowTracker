import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env['CI'],
  /* Retry on CI only */
  retries: process.env['CI'] ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env['CI'] ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html'], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:4200',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video recording on failure */
    video: 'retain-on-failure',
    /* Increase timeouts for CI environment (slower hardware) */
    actionTimeout: process.env['CI'] ? 20000 : 10000,
    navigationTimeout: process.env['CI'] ? 45000 : 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project - runs first to create authenticated state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main test project - individual tests control their auth via test.use()
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'ng serve --configuration=e2e --host 0.0.0.0',
    url: 'http://127.0.0.1:4200', // Use IPv4 explicitly instead of localhost
    reuseExistingServer: !process.env['CI'],
    timeout: 180 * 1000, // 3 minutes - CI needs more time for initial build
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
