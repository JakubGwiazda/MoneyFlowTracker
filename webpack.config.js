const webpack = require('webpack');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

module.exports = (config, options, targetOptions) => {
  // Determine which .env file to use
  // Try multiple sources: NG_APP_ENV env var, targetOptions, options
  const ngAppEnv = process.env.NG_APP_ENV;
  const configuration = ngAppEnv || targetOptions?.configuration || options?.configuration;
  
  let envFile = '.env'; // default
  
  if (configuration === 'e2e') {
    envFile = '.env.test';
  } else if (configuration === 'production') {
    envFile = '.env.prod';
  } else if (configuration === 'local') {
    envFile = '.env.local';
  }
  
  const envPath = path.resolve(__dirname, envFile);
  
  // Load environment variables from file
  let envVars = {};
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('Error loading env file:', result.error);
    } else {
      envVars = result.parsed || {};
    }
  } else {
    console.log('File does not exist, using empty values');
  }
  console.log('=========================================\n');
  
  // Inject variables using DefinePlugin (without NODE_ENV to avoid conflicts)
  const definePluginConfig = {
    'process.env.SUPABASE_URL': JSON.stringify(envVars.SUPABASE_URL || ''),
    'process.env.SUPABASE_KEY': JSON.stringify(envVars.SUPABASE_KEY || ''),
    'process.env.OPENROUTER_API_KEY': JSON.stringify(envVars.OPENROUTER_API_KEY || ''),
  };
  
  config.plugins.push(new webpack.DefinePlugin(definePluginConfig));

  return config;
};