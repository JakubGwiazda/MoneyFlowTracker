import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../lib/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>
            <h1>MoneyFlowTracker</h1>
          </mat-card-title>
          <mat-card-subtitle>Zaloguj się do swojego konta</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            @if (errorMessage()) {
              <div class="error-message" data-testid="login-error-message">
                <mat-icon>error</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                placeholder="nazwa@example.com"
                autocomplete="email"
                data-testid="login-email-input"
              />
              @if (loginForm.get('email')?.hasError('required') && loginForm.get('email')?.touched) {
                <mat-error>Email jest wymagany</mat-error>
              }
              @if (loginForm.get('email')?.hasError('email') && loginForm.get('email')?.touched) {
                <mat-error>Wprowadź poprawny adres email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hasło</mat-label>
              <input
                matInput
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                placeholder="Twoje hasło"
                autocomplete="current-password"
                data-testid="login-password-input"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword.set(!hidePassword())"
                [attr.aria-label]="'Hide password'"
                [attr.aria-pressed]="hidePassword()"
              >
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (loginForm.get('password')?.hasError('required') && loginForm.get('password')?.touched) {
                <mat-error>Hasło jest wymagane</mat-error>
              }
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="loginForm.invalid || loading()"
              class="submit-button"
              data-testid="login-submit-button"
            >
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
                <span>Logowanie...</span>
              } @else {
                <span>Zaloguj się</span>
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="register-link">
            Nie masz konta?
            <a routerLink="/register" data-testid="login-register-link">Zarejestruj się</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 420px;
      padding: 32px;
    }

    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 24px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 600;
      color: #1f2937;
    }

    mat-card-subtitle {
      margin-top: 8px;
      font-size: 14px;
      color: #6b7280;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: #fee2e2;
      border: 1px solid #fca5a5;
      border-radius: 4px;
      color: #dc2626;
      font-size: 14px;
    }

    .error-message mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    mat-form-field {
      width: 100%;
    }

    .submit-button {
      margin-top: 8px;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
    }

    .submit-button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    mat-card-actions {
      padding: 16px 0 0;
      margin: 0;
      display: flex;
      justify-content: center;
    }

    .register-link {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
    }

    .register-link a {
      color: #667eea;
      font-weight: 500;
      text-decoration: none;
      margin-left: 4px;
    }

    .register-link a:hover {
      text-decoration: underline;
    }
  `],
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = signal(true);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;
    const result = await this.authService.signIn(email, password);

    this.loading.set(false);

    if (!result.success && result.error) {
      this.errorMessage.set(result.error);
    }
  }
}

