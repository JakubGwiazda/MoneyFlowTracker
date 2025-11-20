import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';
import { environment } from '../environments/environment';

export const supabaseClient = createClient<Database>(
  environment.supabaseUrl,
  environment.supabaseKey,
  {
    auth: {
      // Disable automatic token refresh in Angular to avoid race conditions
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Configure lock options to prevent timeout errors
      storageKey: 'sb-auth-token',
      storage: window.localStorage,
      // Increase lock timeout to prevent errors in slow environments
      flowType: 'pkce',
    },
  },
);
