import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../lib/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
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
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-card-title>
            <h1>MoneyFlowTracker</h1>
          </mat-card-title>
          <mat-card-subtitle>Utwórz nowe konto</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            @if (errorMessage()) {
              <div class="error-message" data-testid="register-error-message">
                <mat-icon>error</mat-icon>
                <span>{{ errorMessage() }}</span>
              </div>
            }

            @if (successMessage()) {
              <div class="success-message" data-testid="register-success-message">
                <mat-icon>check_circle</mat-icon>
                <span>{{ successMessage() }}</span>
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
                data-testid="register-email-input"
              />
              @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
                <mat-error>Email jest wymagany</mat-error>
              }
              @if (registerForm.get('email')?.hasError('email') && registerForm.get('email')?.touched) {
                <mat-error>Wprowadź poprawny adres email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hasło</mat-label>
              <input
                matInput
                [type]="hidePassword() ? 'password' : 'text'"
                formControlName="password"
                placeholder="Minimum 6 znaków"
                autocomplete="new-password"
                data-testid="register-password-input"
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
              @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
                <mat-error>Hasło jest wymagane</mat-error>
              }
              @if (registerForm.get('password')?.hasError('minlength') && registerForm.get('password')?.touched) {
                <mat-error>Hasło musi zawierać co najmniej 6 znaków</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Powtórz hasło</mat-label>
              <input
                matInput
                [type]="hideConfirmPassword() ? 'password' : 'text'"
                formControlName="confirmPassword"
                placeholder="Wprowadź hasło ponownie"
                autocomplete="new-password"
                data-testid="register-confirm-password-input"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hideConfirmPassword.set(!hideConfirmPassword())"
                [attr.aria-label]="'Hide confirm password'"
                [attr.aria-pressed]="hideConfirmPassword()"
              >
                <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (registerForm.get('confirmPassword')?.hasError('required') && registerForm.get('confirmPassword')?.touched) {
                <mat-error>Potwierdzenie hasła jest wymagane</mat-error>
              }
              @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched) {
                <mat-error>Hasła nie są identyczne</mat-error>
              }
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              type="submit"
              [disabled]="registerForm.invalid || loading()"
              class="submit-button"
              data-testid="register-submit-button"
            >
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
                <span>Rejestrowanie...</span>
              } @else {
                <span>Zarejestruj się</span>
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <p class="login-link">
            Masz już konto?
            <a routerLink="/login" data-testid="register-login-link">Zaloguj się</a>
          </p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .register-card {
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

    .success-message {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: #d1fae5;
      border: 1px solid #6ee7b7;
      border-radius: 4px;
      color: #065f46;
      font-size: 14px;
    }

    .success-message mat-icon {
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

    .login-link {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
    }

    .login-link a {
      color: #667eea;
      font-weight: 500;
      text-decoration: none;
      margin-left: 4px;
    }

    .login-link a:hover {
      text-decoration: underline;
    }
  `],
})
export class RegisterComponent {
  registerForm: FormGroup;
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    );
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { email, password } = this.registerForm.value;
    const result = await this.authService.signUp(email, password);

    this.loading.set(false);

    if (result.success) {
      if (result.error) {
        // This is a success message about email confirmation
        this.successMessage.set(result.error);
      }
    } else if (result.error) {
      this.errorMessage.set(result.error);
    }
  }
}

