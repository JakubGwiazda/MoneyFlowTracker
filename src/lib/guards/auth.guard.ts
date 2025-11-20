import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs';

import { AuthService } from '../services/auth.service';

/**
 * Functional guard verifying Supabase session presence before allowing access
 * to protected application routes.
 * Uses cached auth state from AuthService to avoid multiple getSession() calls.
 */
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return from(
    authService.waitForInitialization().then(() => {
      if (!authService.isAuthenticated()) {
        return router.parseUrl('/login');
      }

      return true;
    }),
  );
};

