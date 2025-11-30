/**
 * Environment configuration helper for E2E tests
 * Loads and validates environment variables from .env.test
 */

export interface E2EConfig {
  supabaseUrl: string;
  supabaseKey: string;
  testUsername: string;
  testPassword: string;
}

/**
 * Gets E2E configuration from environment variables
 * Throws error if required variables are missing
 */
export function getE2EConfig(): E2EConfig {
  const config: E2EConfig = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_KEY || '',
    testUsername: process.env.E2E_USERNAME || '',
    testPassword: process.env.E2E_PASSWORD || '',
  };

  return config;
}

/**
 * Validates that all required environment variables are set
 * Returns array of missing variables
 */
export function validateE2EConfig(): string[] {
  const missing: string[] = [];

  if (!process.env.SUPABASE_URL) {
    missing.push('SUPABASE_URL');
  }
  if (!process.env.SUPABASE_KEY) {
    missing.push('SUPABASE_KEY');
  }
  if (!process.env.E2E_USERNAME) {
    missing.push('E2E_USERNAME');
  }
  if (!process.env.E2E_PASSWORD) {
    missing.push('E2E_PASSWORD');
  }

  return missing;
}

/**
 * Checks if E2E environment is properly configured
 * Logs warnings for missing variables
 */
export function checkE2EEnvironment(): boolean {
  const missing = validateE2EConfig();

  if (missing.length > 0) {
    console.warn('⚠️  Missing environment variables in .env.test:');
    missing.forEach(varName => {
      console.warn(`   - ${varName}`);
    });
    console.warn('\n📝 Create .env.test file with the required environment variables.');
    console.warn('   See .github/E2E_GITHUB_SETUP.md for details.');
    return false;
  }

  return true;
}

/**
 * Prints current E2E configuration (with masked sensitive data)
 */
export function printE2EConfig(): void {
  const config = getE2EConfig();

  console.log('🔧 E2E Configuration:');
  console.log(`   SUPABASE_URL: ${config.supabaseUrl || '(not set)'}`);
  console.log(
    `   SUPABASE_KEY: ${config.supabaseKey ? '***' + config.supabaseKey.slice(-8) : '(not set)'}`
  );
  console.log(`   E2E_USERNAME: ${config.testUsername || '(not set)'}`);
  console.log(`   E2E_PASSWORD: ${config.testPassword ? '********' : '(not set)'}`);
}
