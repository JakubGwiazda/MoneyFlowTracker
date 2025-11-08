import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs';

import { supabaseClient } from '../../db/supabase.client';

/**
 * Functional guard that prevents authenticated users from accessing
 * guest-only routes (like login and register pages).
 * Redirects authenticated users to the main application.
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);

  return from(
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (!error && data.session) {
        return router.parseUrl('/app');
      }

      return true;
    }),
  );
};

