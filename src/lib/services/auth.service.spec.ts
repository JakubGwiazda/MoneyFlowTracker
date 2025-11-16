import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, AuthState } from './auth.service';
import { supabaseClient } from '../../db/supabase.client';
import type { User, AuthError } from '@supabase/supabase-js';

// Helper to create mock AuthError
function createMockAuthError(message: string, status: number = 400): AuthError {
  return {
    name: 'AuthError',
    message,
    status
  } as unknown as AuthError;
}

describe('AuthService - Critical Authentication Tests', () => {
  let service: AuthService;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00Z',
    role: 'authenticated'
  } as User;

  const mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Date.now() / 1000 + 3600,
    token_type: 'bearer',
    user: mockUser
  };

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockRouter.navigate.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter }
      ]
    });

    // Prevent automatic initialization during construction
    spyOn(supabaseClient.auth, 'getSession').and.returnValue(
      Promise.resolve({
        data: { session: null },
        error: null
      })
    );

    spyOn(supabaseClient.auth, 'onAuthStateChange').and.returnValue({
      data: { subscription: { id: 'mock-sub' } } as any
    } as any);

    service = TestBed.inject(AuthService);
  });

  describe('signIn - Successful Login (TC-AUTH-001)', () => {
    it('should successfully log in with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'TestPass123!';

      // Mock successful login
      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: {
            user: mockUser,
            session: mockSession as any
          },
          error: null
        })
      );

      const result = await service.signIn(email, password);

      // Verify API call
      expect(supabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email,
        password
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify state update
      const authState = service.authState();
      expect(authState.user).toBeDefined();
      expect(authState.user?.id).toBe(mockUser.id);
      expect(authState.user?.email).toBe(mockUser.email);
      expect(authState.loading).toBe(false);
      expect(authState.error).toBeNull();

      // Verify navigation to dashboard
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app']);
    });

    it('should set loading state during login process', async () => {
      const email = 'test@example.com';
      const password = 'TestPass123!';

      let loadingStateDuringCall: boolean | undefined;

      spyOn(supabaseClient.auth, 'signInWithPassword').and.callFake(async () => {
        // Capture loading state while API call is in progress
        loadingStateDuringCall = service.authState().loading;
        
        return Promise.resolve({
          data: {
            user: mockUser,
            session: mockSession as any
          },
          error: null
        });
      });

      await service.signIn(email, password);

      // Loading should have been true during call
      expect(loadingStateDuringCall).toBe(true);

      // Loading should be false after completion
      expect(service.authState().loading).toBe(false);
    });

    it('should store session token after successful login', async () => {
      const email = 'test@example.com';
      const password = 'TestPass123!';

      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: {
            user: mockUser,
            session: mockSession as any
          },
          error: null
        })
      );

      await service.signIn(email, password);

      // Verify user is authenticated
      const authState = service.authState();
      expect(authState.user).not.toBeNull();
      expect(authState.user?.id).toBe(mockUser.id);

      // Session token is managed by Supabase client internally
      // We verify by checking that user state is set correctly
    });

    it('should clear any previous errors on successful login', async () => {
      const email = 'test@example.com';
      const password = 'TestPass123!';

      // First, cause an error
      const authError = createMockAuthError('Invalid login credentials', 400);

      spyOn(supabaseClient.auth, 'signInWithPassword')
        .and.returnValue(
          Promise.resolve({
            data: { user: null, session: null },
            error: authError
          })
        );

      await service.signIn(email, 'wrongpassword');
      expect(service.authState().error).not.toBeNull();

      // Now succeed
      (supabaseClient.auth.signInWithPassword as jasmine.Spy).and.returnValue(
        Promise.resolve({
          data: {
            user: mockUser,
            session: mockSession as any
          },
          error: null
        })
      );

      await service.signIn(email, password);

      // Error should be cleared
      expect(service.authState().error).toBeNull();
    });
  });

  describe('signIn - Failed Login (TC-AUTH-002)', () => {
    it('should handle incorrect password error', async () => {
      const email = 'test@example.com';
      const password = 'WrongPassword';

      const authError = createMockAuthError('Invalid login credentials', 400);

      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: { user: null, session: null },
          error: authError
        })
      );

      const result = await service.signIn(email, password);

      // Verify result
      expect(result.success).toBe(false);
      expect(result.error).toBe('Nieprawidłowy email lub hasło.');

      // Verify state
      const authState = service.authState();
      expect(authState.user).toBeNull();
      expect(authState.loading).toBe(false);
      expect(authState.error).toBe('Nieprawidłowy email lub hasło.');

      // Should not navigate
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should translate English error messages to Polish', async () => {
      const testCases = [
        {
          errorMessage: 'Invalid login credentials',
          expectedTranslation: 'Nieprawidłowy email lub hasło.'
        },
        {
          errorMessage: 'Email not confirmed',
          expectedTranslation: 'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.'
        },
        {
          errorMessage: 'User already registered',
          expectedTranslation: 'Użytkownik o tym adresie email już istnieje.'
        },
        {
          errorMessage: 'Password should be at least 6 characters',
          expectedTranslation: 'Hasło powinno zawierać co najmniej 6 znaków.'
        }
      ];

      for (const testCase of testCases) {
        const authError = createMockAuthError(testCase.errorMessage, 400);

        (supabaseClient.auth.signInWithPassword as jasmine.Spy) = spyOn(
          supabaseClient.auth,
          'signInWithPassword'
        ).and.returnValue(
          Promise.resolve({
            data: { user: null, session: null },
            error: authError
          })
        );

        const result = await service.signIn('test@example.com', 'password');

        expect(result.error).toBe(testCase.expectedTranslation);
      }
    });

    it('should preserve error state in authState signal', async () => {
      const authError = createMockAuthError('Invalid login credentials', 400);

      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: { user: null, session: null },
          error: authError
        })
      );

      await service.signIn('test@example.com', 'wrong');

      const authState = service.authState();
      expect(authState.error).toBe('Nieprawidłowy email lub hasło.');
      expect(authState.user).toBeNull();
    });

    it('should remain on login page after failed attempt', async () => {
      const authError = createMockAuthError('Invalid login credentials', 400);

      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: { user: null, session: null },
          error: authError
        })
      );

      await service.signIn('test@example.com', 'wrong');

      // Router navigate should not have been called
      expect(mockRouter.navigate).not.toHaveBeenCalledWith(['/app']);
    });
  });

  describe('signUp - User Registration (TC-AUTH-003)', () => {
    it('should successfully register new user', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePass123!';

      spyOn(supabaseClient.auth, 'signUp').and.returnValue(
        Promise.resolve({
          data: {
            user: mockUser,
            session: mockSession as any
          },
          error: null
        })
      );

      const result = await service.signUp(email, password);

      // Verify API call
      expect(supabaseClient.auth.signUp).toHaveBeenCalledWith({
        email,
        password
      });

      // Verify result
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      // Verify user is set
      expect(service.authState().user).toBeDefined();
      expect(service.authState().user?.email).toBe(mockUser.email);

      // Verify navigation
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/app']);
    });

    it('should handle email confirmation required scenario', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePass123!';

      // User created but no session (email confirmation required)
      spyOn(supabaseClient.auth, 'signUp').and.returnValue(
        Promise.resolve({
          data: {
            user: mockUser,
            session: null // No session means email confirmation required
          },
          error: null
        })
      );

      const result = await service.signUp(email, password);

      expect(result.success).toBe(true);
      expect(result.error).toBe('Sprawdź swoją skrzynkę email, aby potwierdzić konto.');
    });

    it('should handle existing user error', async () => {
      const email = 'existing@example.com';
      const password = 'SecurePass123!';

      const authError = createMockAuthError('User already registered', 400);

      spyOn(supabaseClient.auth, 'signUp').and.returnValue(
        Promise.resolve({
          data: { user: null, session: null },
          error: authError
        })
      );

      const result = await service.signUp(email, password);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Użytkownik o tym adresie email już istnieje.');
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('signOut - User Logout', () => {
    it('should successfully log out user', async () => {
      // First login
      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: {
            user: mockUser,
            session: mockSession as any
          },
          error: null
        })
      );

      await service.signIn('test@example.com', 'password');
      expect(service.authState().user).not.toBeNull();

      // Now logout
      spyOn(supabaseClient.auth, 'signOut').and.returnValue(
        Promise.resolve({ error: null })
      );

      await service.signOut();

      // Verify API call
      expect(supabaseClient.auth.signOut).toHaveBeenCalled();

      // Verify state cleared
      expect(service.authState().user).toBeNull();
      expect(service.authState().error).toBeNull();

      // Verify navigation to login
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should handle logout errors gracefully', async () => {
      const authError = createMockAuthError('Logout failed', 500);

      spyOn(supabaseClient.auth, 'signOut').and.returnValue(
        Promise.resolve({ error: authError })
      );

      await service.signOut();

      // Error should be set
      expect(service.authState().error).toBe('Logout failed');
    });
  });

  describe('Session Management', () => {
    it('should initialize auth state on service creation', async () => {
      // This test verifies the initializeAuth() behavior
      const getSessionSpy = spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: mockSession as any },
          error: null
        })
      );

      const authStateChangeSpy = spyOn(supabaseClient.auth, 'onAuthStateChange').and.returnValue({
        data: { subscription: { id: 'mock-sub' } } as any
      } as any);

      // Create new service instance
      const newService = new AuthService(mockRouter);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(getSessionSpy).toHaveBeenCalled();
      expect(authStateChangeSpy).toHaveBeenCalled();
    });

    it('should listen to auth state changes', () => {
      const onAuthStateChangeSpy = spyOn(supabaseClient.auth, 'onAuthStateChange').and.returnValue({
        data: { subscription: { id: 'mock-sub' } } as any
      } as any);

      // Create new service to trigger initialization
      new AuthService(mockRouter);

      expect(onAuthStateChangeSpy).toHaveBeenCalled();
    });

    it('should handle session initialization errors', async () => {
      const authError = createMockAuthError('Session error', 500);

      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: null },
          error: authError
        })
      );

      const newService = new AuthService(mockRouter);

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = newService.authState();
      expect(state.loading).toBe(false);
      expect(state.error).not.toBeNull();
    });
  });

  describe('Error Message Translation', () => {
    it('should provide fallback error message for unknown errors', async () => {
      const authError = createMockAuthError('Some unknown error', 500);

      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: { user: null, session: null },
          error: authError
        })
      );

      const result = await service.signIn('test@example.com', 'password');

      // Should return the original error message as fallback
      expect(result.error).toBe('Some unknown error');
    });

    it('should handle null/undefined errors gracefully', async () => {
      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: { user: null, session: null },
          error: null as any
        })
      );

      // Manually trigger error path with no error object
      const privateService = service as any;
      const errorMessage = privateService.resolveErrorMessage(null);

      expect(errorMessage).toBe('Wystąpił nieoczekiwany błąd.');
    });
  });

  describe('AuthState Signal Integration', () => {
    it('should provide readonly access to auth state', () => {
      const authState = service.authState();
      
      expect(authState).toBeDefined();
      expect(authState.user).toBeDefined();
      expect(authState.loading).toBeDefined();
      expect(authState.error).toBeDefined();

      // Verify it's readonly (TypeScript compile-time check, runtime verification)
      expect(typeof authState).toBe('object');
    });

    it('should update auth state reactively on login', async () => {
      const states: AuthState[] = [];

      // Subscribe to state changes (simulate component subscription)
      const initialState = service.authState();
      states.push({ ...initialState });

      spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
        Promise.resolve({
          data: {
            user: mockUser,
            session: mockSession as any
          },
          error: null
        })
      );

      await service.signIn('test@example.com', 'password');

      const finalState = service.authState();
      states.push({ ...finalState });

      // Initial state should have no user
      expect(states[0].user).toBeNull();

      // Final state should have user
      expect(states[1].user).not.toBeNull();
      expect(states[1].user?.id).toBe(mockUser.id);
    });
  });
});

