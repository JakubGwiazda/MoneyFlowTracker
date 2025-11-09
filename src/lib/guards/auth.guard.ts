import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs';

import { supabaseClient } from '../../db/supabase.client';

/**
 * Functional guard verifying Supabase session presence before allowing access
 * to protected application routes.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);

  return from(
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        return router.parseUrl('/login');
      }

      return true;
    }),
  );
};

