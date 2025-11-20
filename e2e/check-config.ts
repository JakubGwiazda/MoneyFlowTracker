/**
 * Standalone script to check E2E configuration
 * Run: npx ts-node e2e/check-config.ts
 */

import dotenv from 'dotenv';
import path from 'path';
import { checkE2EEnvironment, printE2EConfig } from './helpers/env.helper';

// Load .env.test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const isValid = checkE2EEnvironment();

if (isValid) {
  console.log('All required environment variables are set!');
  printE2EConfig();
  console.log('You can now run E2E tests with: npm run test:e2e');
  process.exit(0);
} else {
  console.log('Configuration is incomplete.');
  process.exit(1);
}


