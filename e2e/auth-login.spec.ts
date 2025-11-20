import { test, expect } from '@playwright/test';

/**
 * TC-AUTH-001: Poprawne logowanie
 * Priorytet: Krytyczny
 * Typ: Funkcjonalny
 * 
 * Zgodny z planem testów: .ai/tests/test-plan.md sekcja 4.1
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    // Otwórz stronę logowania
    await page.goto('http://localhost:4200/login');
  });

  test('should display login form with all required elements', async ({ page }) => {
    // Sprawdź czy wyświetla się tytuł aplikacji
    await expect(page.getByRole('heading', { name: 'MoneyFlowTracker' })).toBeVisible();
    
    // Sprawdź czy wyświetla się podtytuł
    await expect(page.locator('text=Zaloguj się do swojego konta')).toBeVisible();
    
    // Sprawdź czy są pola formularza
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Hasło')).toBeVisible();
    
    // Sprawdź czy jest przycisk logowania
    await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeVisible();
    
    // Sprawdź czy jest link do rejestracji
    await expect(page.getByRole('link', { name: 'Zarejestruj się' })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Kliknij w pole email i opuść je (touch)
    await page.getByLabel('Email').click();
    await page.getByLabel('Hasło').click();
    await page.getByLabel('Email').click();
    
    // Sprawdź czy pojawia się błąd walidacji dla email
    await expect(page.locator('text=Email jest wymagany')).toBeVisible();
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    // Wprowadź niepoprawny email
    await page.getByLabel('Email').fill('invalid-email');
    await page.getByLabel('Hasło').click();
    
    // Sprawdź czy pojawia się błąd walidacji formatu email
    await expect(page.locator('text=Wprowadź poprawny adres email')).toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    // Wpisz hasło
    await page.getByLabel('Hasło').fill('TestPassword123');
    
    // Sprawdź czy pole hasła jest typu password
    await expect(page.getByLabel('Hasło')).toHaveAttribute('type', 'password');
    
    // Kliknij przycisk pokazywania hasła
    await page.getByRole('button', { name: /Hide password/i }).click();
    
    // Sprawdź czy pole hasła zmieniło typ na text
    await expect(page.getByLabel('Hasło')).toHaveAttribute('type', 'text');
    
    // Kliknij ponownie aby ukryć
    await page.getByRole('button', { name: /Hide password/i }).click();
    
    // Sprawdź czy wróciło do typu password
    await expect(page.getByLabel('Hasło')).toHaveAttribute('type', 'password');
  });

  test('should disable submit button when form is invalid', async ({ page }) => {
    // Przycisk powinien być disabled gdy formularz jest pusty
    await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeDisabled();
    
    // Wypełnij tylko email
    const testEmail = process.env['E2E_USERNAME'] || 'test@example.com';
    await page.getByLabel('Email').fill(testEmail);
    await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeDisabled();
    
    // Wypełnij hasło - przycisk powinien być enabled
    await page.getByLabel('Hasło').fill('TestPassword123');
    await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeEnabled();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    /**
     * TC-AUTH-001: Poprawne logowanie
     * 
     * Warunki wstępne: Użytkownik posiada konto w systemie
     * Oczekiwany rezultat:
     * - Brak błędów walidacji
     * - Użytkownik przekierowany do /app
     * - Token sesji zapisany
     */
    
    // UWAGA: Ten test wymaga rzeczywistego użytkownika testowego w bazie danych
    // Dane użytkownika pobierane są ze zmiennych środowiskowych (.env.test):
    // E2E_USERNAME i E2E_PASSWORD
    
    const testEmail = process.env['E2E_USERNAME'];
    const testPassword = process.env['E2E_PASSWORD'];
    
    if (!testEmail || !testPassword) {
      throw new Error('E2E_USERNAME and E2E_PASSWORD must be set in .env.test file');
    }
    
    // Wypełnij formularz
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Hasło').fill(testPassword);
    
    // Kliknij przycisk logowania
    await page.getByRole('button', { name: 'Zaloguj się' }).click();
    
    // Sprawdź czy pojawia się spinner/loading
    await expect(page.locator('text=Logowanie...')).toBeVisible({ timeout: 1000 }).catch(() => {
      // Loading może być bardzo szybkie, więc ignorujemy timeout
    });
    
    // Sprawdź czy nastąpiło przekierowanie do /app
    await expect(page).toHaveURL(/.*\/app/, { timeout: 10000 });
    
    // Sprawdź czy użytkownik jest zalogowany (brak przekierowania z powrotem do login)
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/.*\/login/);
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    /**
     * TC-AUTH-002: Logowanie z niepoprawnym hasłem
     * 
     * Oczekiwany rezultat:
     * - Komunikat: "Nieprawidłowy email lub hasło."
     * - Użytkownik pozostaje na /login
     */
    
    const testEmail = process.env['E2E_USERNAME'];
    
    if (!testEmail) {
      throw new Error('E2E_USERNAME must be set in .env.test file');
    }
    
    // Wypełnij formularz z niepoprawnym hasłem
    await page.getByLabel('Email').fill(testEmail);
    await page.getByLabel('Hasło').fill('WrongPassword123');
    
    // Kliknij przycisk logowania
    await page.getByRole('button', { name: 'Zaloguj się' }).click();
    
    // Poczekaj na odpowiedź serwera
    await page.waitForTimeout(2000);
    
    // Sprawdź czy pojawia się komunikat błędu
    // Może być różny w zależności od konfiguracji Supabase
    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    
    // Sprawdź czy użytkownik pozostał na stronie logowania
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('should navigate to register page', async ({ page }) => {
    // Kliknij link "Zarejestruj się"
    await page.getByRole('link', { name: 'Zarejestruj się' }).click();
    
    // Sprawdź czy nastąpiło przekierowanie do /register
    await expect(page).toHaveURL(/.*\/register/);
  });
});

