import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { supabaseClient } from '../../db/supabase.client';
import type { User, AuthError } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  session: any | null;
  loading: boolean;
  error: string | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authStateSignal = signal<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  readonly authState = this.authStateSignal.asReadonly();
  private initializationPromise: Promise<void> | null = null;

  constructor(private router: Router) {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    // Prevent multiple simultaneous initialization calls
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession();

        if (error) {
          throw error;
        }

        this.authStateSignal.update(state => ({
          ...state,
          user: session?.user || null,
          session: session,
          loading: false,
        }));

        // Listen to auth state changes (only once)
        supabaseClient.auth.onAuthStateChange((_event, session) => {
          this.authStateSignal.update(state => ({
            ...state,
            user: session?.user || null,
            session: session,
          }));
        });
      } catch (error) {
        this.authStateSignal.update(state => ({
          ...state,
          loading: false,
          error: this.resolveErrorMessage(error),
        }));
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Check if user is authenticated without calling getSession() again
   * Uses cached state from AuthService
   */
  isAuthenticated(): boolean {
    return this.authState().user !== null;
  }

  /**
   * Wait for initialization to complete before checking auth status
   */
  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  /**
   * Get current session access token
   * Returns the cached token without making additional API calls
   */
  async getAccessToken(): Promise<string | null> {
    await this.waitForInitialization();

    // Get session from our cached state (no API call)
    const session = this.authState().session;
    return session?.access_token || null;
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authStateSignal.update(state => ({ ...state, loading: true, error: null }));

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      this.authStateSignal.update(state => ({
        ...state,
        user: data.user,
        session: data.session,
        loading: false,
      }));

      await this.router.navigate(['/app']);
      return { success: true };
    } catch (error) {
      const errorMessage = this.resolveErrorMessage(error);
      this.authStateSignal.update(state => ({
        ...state,
        loading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authStateSignal.update(state => ({ ...state, loading: true, error: null }));

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return {
          success: true,
          error: 'Sprawdź swoją skrzynkę email, aby potwierdzić konto.',
        };
      }

      this.authStateSignal.update(state => ({
        ...state,
        user: data.user,
        session: data.session,
        loading: false,
      }));

      await this.router.navigate(['/app']);
      return { success: true };
    } catch (error) {
      const errorMessage = this.resolveErrorMessage(error);
      this.authStateSignal.update(state => ({
        ...state,
        loading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }

  async signOut(): Promise<void> {
    try {
      await supabaseClient.auth.signOut();

      this.authStateSignal.update(state => ({
        ...state,
        user: null,
        session: null,
        error: null,
      }));

      await this.router.navigate(['/login']);
    } catch (error) {
      this.authStateSignal.update(state => ({
        ...state,
        error: this.resolveErrorMessage(error),
      }));
    }
  }

  private resolveErrorMessage(error: unknown): string {
    if (!error) {
      return 'Wystąpił nieoczekiwany błąd.';
    }

    const authError = error as AuthError;

    switch (authError.message) {
      case 'Invalid login credentials':
        return 'Nieprawidłowy email lub hasło.';
      case 'Email not confirmed':
        return 'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową.';
      case 'User already registered':
        return 'Użytkownik o tym adresie email już istnieje.';
      case 'Password should be at least 6 characters':
        return 'Hasło powinno zawierać co najmniej 6 znaków.';
      default:
        return authError.message || 'Wystąpił błąd podczas uwierzytelniania.';
    }
  }
}
