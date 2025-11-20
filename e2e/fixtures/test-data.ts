/**
 * Test fixtures and test data for E2E tests
 */

export const TEST_USERS = {
  valid: {
    email: process.env['E2E_USERNAME'] || '',
    password: process.env['E2E_PASSWORD'] || '',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
  newUser: {
    email: `test${Date.now()}@example.com`,
    password: 'NewPassword123!',
  },
};

export const TEST_CATEGORIES = {
  food: {
    name: 'Food',
    description: 'Food and drinks',
    color: '#FF5733',
  },
  transport: {
    name: 'Transport',
    description: 'Transportation costs',
    color: '#3498DB',
  },
  entertainment: {
    name: 'Entertainment',
    description: 'Entertainment and leisure',
    color: '#9B59B6',
  },
};

export const TEST_EXPENSES = {
  coffee: {
    description: 'Morning Coffee',
    amount: '4.50',
    category: 'Food',
    date: '2024-01-15',
  },
  busTicket: {
    description: 'Bus Ticket',
    amount: '2.50',
    category: 'Transport',
    date: '2024-01-16',
  },
  movieTicket: {
    description: 'Movie Ticket',
    amount: '12.00',
    category: 'Entertainment',
    date: '2024-01-17',
  },
};

export const TIMEOUT = {
  short: 1000,
  medium: 3000,
  long: 5000,
  veryLong: 10000,
};

