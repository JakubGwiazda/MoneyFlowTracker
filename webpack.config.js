const webpack = require('webpack');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

module.exports = (config, options, targetOptions) => {
  try {
    // Log configuration for debugging
    console.log('========== WEBPACK CONFIG START ==========');
    console.log('Webpack options:', JSON.stringify(options, null, 2));
    console.log('Webpack targetOptions:', JSON.stringify(targetOptions, null, 2));
    console.log('Config mode:', config?.mode || 'undefined');
    console.log('Config plugins length:', config?.plugins?.length || 'undefined');

    // Check if this is a test/Karma build
    const isTest =
      options?.test ||
      targetOptions?.test ||
      (config.mode === 'development' && options?.main?.includes('test.ts'));

    // For tests, inject empty environment variables
    if (isTest) {
      console.log('✓ Detected test environment - Injecting empty env variables for tests');
      const definePluginConfig = {
        'process.env.SUPABASE_URL': JSON.stringify(''),
        'process.env.SUPABASE_KEY': JSON.stringify(''),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(''),
      };

      // Ensure plugins array exists
      if (!config.plugins) {
        config.plugins = [];
      }

      config.plugins.push(new webpack.DefinePlugin(definePluginConfig));
      console.log('✓ DefinePlugin added successfully for tests');
      console.log('========== WEBPACK CONFIG END ==========\n');
      return config;
    }

    // Determine which .env file to use
    // Try multiple sources: NG_APP_ENV env var, targetOptions, options
    const ngAppEnv = process.env.NG_APP_ENV;
    const configuration = ngAppEnv || targetOptions?.configuration || options?.configuration;
    console.log('NG_APP_ENV:', ngAppEnv || 'undefined');
    console.log('Configuration resolved to:', configuration || 'undefined');

  let envFile = '.env.development'; // default

  if (configuration === 'e2e') {
    envFile = '.env.test';
  } else if (configuration === 'production') {
    envFile = '.env.prod';
  } else if (configuration === 'local') {
    envFile = '.env.development';
  }

    const envPath = path.resolve(__dirname, envFile);

    // Load environment variables from file
    let envVars = {};
    try {
      if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath });
        if (result.error) {
          console.error('❌ Error loading env file:', result.error);
        } else {
          envVars = result.parsed || {};
          console.log(
            `✓ Loaded ${Object.keys(envVars).length} environment variables from ${envFile}`
          );
          console.log('✓ Variables loaded:', Object.keys(envVars).join(', '));
        }
      } else {
        console.log(`⚠️  Environment file ${envFile} does not exist at ${envPath}`);
        console.log(`   Using values from process.env if available`);
        // For tests, we don't need to show this warning
        if (configuration !== 'test' && !targetOptions?.test) {
          console.log(`   Tip: Create ${envFile} file with your environment variables`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load environment file:', error.message);
      envVars = {};
    }

    // Prefer process.env over file vars (important for CI/CD)
    // This allows GitHub Actions to pass secrets directly
    const finalEnvVars = {
      SUPABASE_URL: process.env.SUPABASE_URL || envVars.SUPABASE_URL || '',
      SUPABASE_KEY: process.env.SUPABASE_KEY || envVars.SUPABASE_KEY || '',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || envVars.OPENROUTER_API_KEY || '',
    };

    console.log('✓ Final environment variables (showing presence, not values):');
    console.log('  SUPABASE_URL:', finalEnvVars.SUPABASE_URL ? '✓ present' : '✗ missing');
    console.log('  SUPABASE_KEY:', finalEnvVars.SUPABASE_KEY ? '✓ present' : '✗ missing');
    console.log(
      '  OPENROUTER_API_KEY:',
      finalEnvVars.OPENROUTER_API_KEY ? '✓ present' : '✗ missing'
    );
    console.log('=========================================\n');

    // Inject variables using DefinePlugin (without NODE_ENV to avoid conflicts)
    const definePluginConfig = {
      'process.env.SUPABASE_URL': JSON.stringify(finalEnvVars.SUPABASE_URL),
      'process.env.SUPABASE_KEY': JSON.stringify(finalEnvVars.SUPABASE_KEY),
      'process.env.OPENROUTER_API_KEY': JSON.stringify(finalEnvVars.OPENROUTER_API_KEY),
    };

    // Ensure plugins array exists
    if (!config.plugins) {
      config.plugins = [];
    }

    config.plugins.push(new webpack.DefinePlugin(definePluginConfig));
    console.log('✓ DefinePlugin added successfully for environment:', configuration || 'default');
    console.log('========== WEBPACK CONFIG END ==========\n');

    return config;
  } catch (error) {
    console.error('❌ Error in webpack.config.js:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
};
