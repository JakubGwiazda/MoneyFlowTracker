import { FullConfig } from '@playwright/test';
import { checkE2EEnvironment, printE2EConfig } from '../helpers/env.helper';

/**
 * Global setup for E2E tests
 * Runs once before all tests
 * 
 * Validates environment configuration and prints warnings if needed
 */
async function globalSetup(config: FullConfig) {
  console.log('=' .repeat(50));
  
  // Check environment configuration
  const isConfigValid = checkE2EEnvironment();
  
  if (!isConfigValid) {
    console.log('Some tests may fail due to missing configuration.');
    console.log('Tests requiring authentication will be skipped or fail.\n');
  } else {
    console.log('Environment configuration is valid\n');
    printE2EConfig();
  }
  
  console.log('=' .repeat(50) + '\n');
}

export default globalSetup;


