import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule, MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../services/authorization/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  standalone: true,
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
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
    this.resetPasswordForm = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    );
  }

  async ngOnInit(): Promise<void> {
    // Sprawdź czy użytkownik ma aktywną sesję (powinien być zalogowany przez link z email)
    await this.authService.waitForInitialization();

    if (!this.authService.isAuthenticated()) {
      this.errorMessage.set(
        'Link resetowania hasła wygasł lub jest nieprawidłowy. Spróbuj ponownie.'
      );
    }
  }

  async onSubmit(): Promise<void> {
    if (this.resetPasswordForm.invalid) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { password } = this.resetPasswordForm.value;
    const result = await this.authService.resetPassword(password);

    this.loading.set(false);

    if (result.success) {
      this.successMessage.set(
        'Hasło zostało pomyślnie zmienione. Za chwilę zostaniesz przekierowany...'
      );
      this.resetPasswordForm.disable();

      // Przekieruj do aplikacji po 2 sekundach
      setTimeout(async () => {
        await this.router.navigate(['/app']);
      }, 2000);
    } else if (result.error) {
      this.errorMessage.set(result.error);
    }
  }
}
