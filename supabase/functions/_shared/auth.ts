/**
 * Shared Authentication Utilities
 * Common auth verification logic for edge functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  user: any;
  supabaseClient: any;
}

/**
 * Verify Supabase authentication token
 * @param authHeader Authorization header value
 * @returns User and Supabase client
 * @throws Error if authentication fails
 */
export async function verifyAuth(authHeader: string | null): Promise<AuthResult> {
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPA_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPA_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    throw new Error('Invalid authorization token');
  }

  return { user, supabaseClient };
}
