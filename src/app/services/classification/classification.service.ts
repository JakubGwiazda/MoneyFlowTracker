import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, TimeoutError, from } from 'rxjs';
import { catchError, timeout, retry, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  OpenRouterRequest,
  OpenRouterResponse,
  ClassificationResult,
  ClassificationOptions,
  ClassificationError,
  ExpenseToClassify,
  ValidationResult,
  ResponseFormat,
} from '../../models/openrouter';
import { RateLimiterService } from '../rate-limiter/rate-limiter.service';
import { AuthService } from '../authorization/auth.service';

@Injectable({
  providedIn: 'root',
})
export class ClassificationService {
  private readonly http = inject(HttpClient);
  private readonly rateLimiter = inject(RateLimiterService);
  private readonly authService = inject(AuthService);

  private readonly edgeFunctionUrl: string;
  private readonly defaultTimeout = 30000;
  private readonly maxRetries = 3;

  constructor() {
    this.edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/expense-classification`;
  }

  /**
   * Klasyfikuje pojedynczy wydatek
   */
  public classifyExpense(
    description: string,
    options?: ClassificationOptions
  ): Observable<ClassificationResult> {
    // Walidacja wejścia
    this.validateInput(description);

    // Rate limiting
    if (!this.rateLimiter.canMakeRequest('classification')) {
      const waitTime = this.rateLimiter.getTimeUntilNextRequest('classification');
      return throwError(
        () =>
          new ClassificationError(
            `Przekroczono limit zapytań. Spróbuj ponownie za ${Math.ceil(waitTime / 1000)} sekund.`,
            'RATE_LIMIT_ERROR'
          )
      );
    }

    // Budowanie payloadu - tylko opis i opcje
    const payload = {
      type: 'single',
      description: description,
    };

    // Wywołanie edge function
    this.rateLimiter.recordRequest('classification');

    return this.callEdgeFunction(payload).pipe(map(response => this.parseModelResponse(response)));
  }

  /**
   * Klasyfikuje wiele wydatków jednocześnie
   */
  public batchClassifyExpenses(
    expenses: ExpenseToClassify[],
    options?: ClassificationOptions
  ): Observable<ClassificationResult[]> {
    // Walidacja
    if (!expenses || expenses.length === 0) {
      return throwError(
        () => new ClassificationError('Lista wydatków jest pusta', 'VALIDATION_ERROR')
      );
    }

    // Rate limiting dla batch
    if (!this.rateLimiter.canMakeRequest('batch-classification')) {
      const waitTime = this.rateLimiter.getTimeUntilNextRequest('batch-classification');
      return throwError(
        () =>
          new ClassificationError(
            `Przekroczono limit zapytań. Spróbuj ponownie za ${Math.ceil(waitTime / 1000)} sekund.`,
            'RATE_LIMIT_ERROR'
          )
      );
    }

    // Budowanie payloadu dla batch - tylko wydatki i opcje
    const payload = {
      type: 'batch',
      expenses: expenses,
    };

    this.rateLimiter.recordRequest('batch-classification');

    return this.callEdgeFunction(payload).pipe(
      map(response => this.parseBatchModelResponse(response, expenses.length))
    );
  }

  /**
   * Waliduje wynik klasyfikacji
   */
  public validateClassification(result: ClassificationResult): ValidationResult {
    const errors: string[] = [];

    if (!result.categoryName || result.categoryName.trim().length === 0) {
      errors.push('Nazwa kategorii jest wymagana');
    }

    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      errors.push('Pewność musi być liczbą z zakresu 0-1');
    }

    if (typeof result.isNewCategory !== 'boolean') {
      errors.push('isNewCategory musi być wartością boolean');
    }

    if (!result.isNewCategory && !result.categoryId) {
      errors.push('categoryId jest wymagane dla istniejącej kategorii');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ========== Prywatne metody ==========

  private callEdgeFunction(payload: any): Observable<OpenRouterResponse> {
    // Pobierz aktualny token sesji użytkownika z cache
    return from(this.authService.getAccessToken()).pipe(
      switchMap(accessToken => {
        if (!accessToken) {
          return throwError(
            () =>
              new ClassificationError('Nie jesteś zalogowany. Zaloguj się ponownie.', 'AUTH_ERROR')
          );
        }

        // Użyj tokenu sesji użytkownika zamiast anon key
        return this.http.post<OpenRouterResponse>(this.edgeFunctionUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`, // ← To jest klucz!
          },
        });
      }),
      timeout(this.defaultTimeout),
      retry({
        count: this.maxRetries,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          if (error.status === 429 || error.status >= 500) {
            return timer(Math.pow(2, retryCount) * 1000);
          }
          return throwError(() => error);
        },
        resetOnSuccess: true,
      }),
      catchError(this.handleHttpError.bind(this))
    );
  }

  private parseModelResponse(response: OpenRouterResponse): ClassificationResult {
    try {
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No choices in response');
      }

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);

      // Walidacja struktury
      if (!parsed.categoryName || typeof parsed.confidence !== 'number') {
        throw new Error('Invalid response structure');
      }

      return {
        categoryId: parsed.categoryId || null,
        categoryName: parsed.categoryName,
        confidence: parsed.confidence,
        isNewCategory: parsed.isNewCategory,
        newCategoryName: parsed.newCategoryName,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      throw new ClassificationError(
        'Nie udało się sparsować odpowiedzi modelu',
        'PARSE_ERROR',
        error
      );
    }
  }

  private parseBatchModelResponse(
    response: OpenRouterResponse,
    expectedCount: number
  ): ClassificationResult[] {
    try {
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No choices in response');
      }

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);

      if (!parsed.results || !Array.isArray(parsed.results)) {
        throw new Error('Invalid batch response structure');
      }

      if (parsed.results.length !== expectedCount) {
        console.warn(`Expected ${expectedCount} results, got ${parsed.results.length}`);
      }

      return parsed.results.map((result: any) => ({
        categoryId: result.categoryId,
        categoryName: result.categoryName,
        confidence: result.confidence,
        isNewCategory: result.isNewCategory,
        newCategoryName: result.newCategoryName,
        reasoning: result.reasoning,
      }));
    } catch (error) {
      throw new ClassificationError(
        'Nie udało się sparsować odpowiedzi batch modelu',
        'PARSE_ERROR',
        error
      );
    }
  }

  private validateInput(description: string): void {
    if (!description || description.trim().length === 0) {
      throw new ClassificationError('Opis wydatku jest wymagany', 'VALIDATION_ERROR');
    }

    if (description.length > 500) {
      throw new ClassificationError(
        'Opis wydatku jest zbyt długi (maksymalnie 500 znaków)',
        'VALIDATION_ERROR'
      );
    }
  }

  private handleHttpError(error: HttpErrorResponse | TimeoutError | any): Observable<never> {
    // Jeśli błąd jest już ClassificationError, przepuść go bez zmian
    if (error instanceof ClassificationError) {
      return throwError(() => error);
    }

    let classificationError: ClassificationError;

    if (error instanceof TimeoutError) {
      classificationError = new ClassificationError(
        'Zapytanie trwało zbyt długo. Spróbuj ponownie.',
        'TIMEOUT_ERROR',
        error
      );
    } else if (error.status === 0) {
      classificationError = new ClassificationError(
        'Brak połączenia z serwerem. Sprawdź swoje połączenie internetowe.',
        'NETWORK_ERROR',
        error
      );
    } else if (error.status === 401) {
      classificationError = new ClassificationError(
        'Sesja wygasła. Odśwież stronę i zaloguj się ponownie.',
        'AUTH_ERROR',
        error
      );
    } else if (error.status === 429) {
      classificationError = new ClassificationError(
        'Przekroczono limit zapytań do API. Spróbuj za chwilę.',
        'RATE_LIMIT_ERROR',
        error
      );
    } else if (error.status >= 500) {
      classificationError = new ClassificationError(
        'Błąd serwera. Spróbuj ponownie później.',
        'SERVER_ERROR',
        error
      );
    } else {
      classificationError = new ClassificationError(
        error.message || 'Wystąpił nieoczekiwany błąd',
        'UNKNOWN_ERROR',
        error
      );
    }

    console.error('[ClassificationService]', classificationError);
    return throwError(() => classificationError);
  }
}
