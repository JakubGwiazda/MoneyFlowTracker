import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { supabaseClient } from '../../db/supabase.client';
import type { User, AuthError } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authStateSignal = signal<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  readonly authState = this.authStateSignal.asReadonly();

  constructor(private router: Router) {
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();

      if (error) {
        throw error;
      }

      this.authStateSignal.update((state) => ({
        ...state,
        user: session?.user || null,
        loading: false,
      }));

      // Listen to auth state changes
      supabaseClient.auth.onAuthStateChange((_event, session) => {
        this.authStateSignal.update((state) => ({
          ...state,
          user: session?.user || null,
        }));
      });
    } catch (error) {
      this.authStateSignal.update((state) => ({
        ...state,
        loading: false,
        error: this.resolveErrorMessage(error),
      }));
    }
  }

  async signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authStateSignal.update((state) => ({ ...state, loading: true, error: null }));

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      this.authStateSignal.update((state) => ({
        ...state,
        user: data.user,
        loading: false,
      }));

      await this.router.navigate(['/app']);
      return { success: true };
    } catch (error) {
      const errorMessage = this.resolveErrorMessage(error);
      this.authStateSignal.update((state) => ({
        ...state,
        loading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }

  async signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    this.authStateSignal.update((state) => ({ ...state, loading: true, error: null }));

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

      this.authStateSignal.update((state) => ({
        ...state,
        user: data.user,
        loading: false,
      }));

      await this.router.navigate(['/app']);
      return { success: true };
    } catch (error) {
      const errorMessage = this.resolveErrorMessage(error);
      this.authStateSignal.update((state) => ({
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

      this.authStateSignal.update((state) => ({
        ...state,
        user: null,
        error: null,
      }));

      await this.router.navigate(['/login']);
    } catch (error) {
      this.authStateSignal.update((state) => ({
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

