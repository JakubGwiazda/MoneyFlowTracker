# E2E Testing with Playwright

This directory contains end-to-end tests for the MoneyFlowTracker application using Playwright.

## Structure

```
e2e/
├── auth/                    # Authentication tests (login, register)
├── expenses/                # Expense management tests
├── categories/              # Category management tests
├── page-objects/            # Page Object Models
│   ├── base.page.ts        # Base page class
│   ├── login.page.ts       # Login page
│   ├── register.page.ts    # Register page
│   ├── expenses.page.ts    # Expenses page
│   ├── categories.page.ts  # Categories page
│   ├── dialogs/            # Dialog page objects
│   └── index.ts            # Centralized exports
├── fixtures/                # Test data and fixtures
├── helpers/                 # Test helper functions
├── setup/                   # Test setup scripts
│   ├── auth.setup.ts       # Authentication state setup
│   └── global-setup.ts     # Global test setup
└── README.md               # This file
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Generate tests with codegen
```bash
npm run test:e2e:codegen
```

### View test report
```bash
npm run test:e2e:report
```

## Authentication in Tests

### Automatic Authentication

Tests requiring authentication automatically use a pre-authenticated session. The authentication state is saved once before tests run and reused across all tests.

**For authenticated tests** (expenses, categories, etc.):
- No login code needed in tests
- Authentication happens automatically via `storageState`
- Tests start with user already logged in

Example:
```typescript
import { test, expect } from '@playwright/test';
import { ExpensesPage } from '../page-objects';

test('should display expenses page', async ({ page }) => {
  // User is already logged in via storageState
  const expensesPage = new ExpensesPage(page);
  await expensesPage.navigate();
  
  await expect(expensesPage.addExpenseButton).toBeVisible();
});
```

**For authentication tests** (login, register):
- These tests run without pre-authenticated state
- Use the `chromium-guest` project
- Located in `e2e/auth/` directory

### How It Works

1. **Setup Phase**: `e2e/setup/auth.setup.ts` runs first, logs in, and saves auth state to `playwright/.auth/user.json`
2. **Test Phase**: Tests use the saved authentication state via `storageState` configuration
3. **Projects**: 
   - `chromium-authenticated`: Uses saved auth state (most tests)
   - `chromium-guest`: No auth state (auth tests only)

## Writing Tests

### Page Object Model (POM)

All tests use the Page Object Model pattern for maintainability and reusability. Page objects are located in `e2e/page-objects/`.

Example:
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../page-objects';

test('should login successfully', async ({ page }) => {
  // Arrange
  const loginPage = new LoginPage(page);
  await loginPage.navigate();

  // Act
  await loginPage.login('test@example.com', 'password123');

  // Assert
  await expect(page).toHaveURL(/.*expenses/);
});
```

### Test Structure (AAA Pattern)

All tests follow the **Arrange-Act-Assert** pattern:

1. **Arrange**: Set up test data and navigate to the page
2. **Act**: Perform the action being tested
3. **Assert**: Verify the expected outcome

Example:
```typescript
test('should add new expense', async ({ page }) => {
  // Arrange
  const expensesPage = new ExpensesPage(page);
  await expensesPage.navigate();

  // Act
  await expensesPage.clickAddExpense();
  await expensesPage.fillExpenseForm({ ... });
  await expensesPage.saveExpense();

  // Assert
  await expect(expensesPage.expenseRow('Coffee')).toBeVisible();
});
```

### Using data-testid Selectors

All interactive elements use `data-testid` attributes for reliable test selectors:

```typescript
// In component:
<button data-testid="add-expense-button">Add Expense</button>

// In test:
await page.getByTestId('add-expense-button').click();
```

### Test Data

Use fixtures from `e2e/fixtures/test-data.ts` for consistent test data:

```typescript
import { TEST_USERS, TEST_EXPENSES } from '../fixtures/test-data';

await loginPage.login(TEST_USERS.valid.email, TEST_USERS.valid.password);
```

### Environment Variables

Tests require credentials in `.env.test` file:

```env
E2E_USERNAME=your-test-user@example.com
E2E_PASSWORD=your-test-password
```

These credentials are used by the auth setup script to create the pre-authenticated session.

## Best Practices

1. **Use Page Objects**: Never interact with selectors directly in tests
2. **Follow AAA Pattern**: Keep tests readable and maintainable
3. **Use data-testid**: Always prefer test IDs over CSS selectors
4. **Isolate Tests**: Each test should be independent
5. **Clean Up**: Use hooks (`beforeEach`, `afterEach`) for setup/teardown
6. **Descriptive Names**: Test names should clearly describe what they test
7. **Wait Properly**: Use Playwright's auto-waiting, avoid arbitrary timeouts
8. **Parallel Execution**: Tests run in parallel by default

## Configuration

Test configuration is in `playwright.config.ts`:

- **Browser**: Chromium (Desktop Chrome)
- **Base URL**: http://localhost:4200
- **Retries**: 2 on CI, 0 locally
- **Timeout**: 30s per test
- **Screenshots**: On failure
- **Video**: On failure
- **Trace**: On first retry
- **Projects**:
  - `setup`: Runs auth setup before tests
  - `chromium-authenticated`: Tests requiring auth (uses saved auth state)
  - `chromium-guest`: Tests without auth (login/register tests)

## Debugging

### Run with UI Mode
```bash
npm run test:e2e:ui
```

### Run with Debug Mode
```bash
npm run test:e2e:debug
```

### View Traces
When a test fails on CI, check the trace viewer:
```bash
npx playwright show-trace path/to/trace.zip
```

## CI/CD Integration

Tests run automatically on CI with:
- Retry on failure (2 retries)
- Screenshot capture
- Video recording
- Trace collection
- HTML report generation

## Common Issues

### Port Already in Use
If the dev server fails to start, ensure port 4200 is available:
```bash
# Windows
netstat -ano | findstr :4200

# Linux/Mac
lsof -i :4200
```

### Authentication Issues

**Missing credentials:**
Ensure `.env.test` file exists with valid credentials:
```env
E2E_USERNAME=your-test-user@example.com
E2E_PASSWORD=your-test-password
```

**Auth setup failing:**
- Check if Supabase is running: `npm run db_start`
- Verify credentials are correct
- Ensure test user exists in database
- Check `playwright/.auth/user.json` is generated

### Flaky Tests
- Use proper waiting mechanisms
- Avoid hard-coded timeouts
- Check for race conditions
- Use test isolation

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

