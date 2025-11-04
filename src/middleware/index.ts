import { defineMiddleware } from 'astro:middleware';

import { supabaseClient } from '../db/supabase.client.ts';

export const onRequest = defineMiddleware(async (context, next) => {
  // Set supabase client in locals
  context.locals.supabase = supabaseClient;

  // Extract JWT token from Authorization header
  const authHeader = context.request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      // Verify JWT token and get user
      const { data: { user }, error } = await supabaseClient.auth.getUser(token);
      
      if (!error && user) {
        context.locals.user = user;
      }
    } catch (error) {
      // Token verification failed, continue without user
      console.warn('Token verification failed:', error);
    }
  }

  return next();
});
