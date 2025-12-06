import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from } from 'rxjs';

import { AuthService } from '../services/authorization/auth.service';

/**
 * Functional guard that prevents authenticated users from accessing
 * guest-only routes (like login and register pages).
 * Redirects authenticated users to the main application.
 * Uses cached auth state from AuthService to avoid multiple getSession() calls.
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return from(
    authService.waitForInitialization().then(() => {
      if (authService.isAuthenticated()) {
        return router.parseUrl('/app');
      }

      return true;
    })
  );
};
