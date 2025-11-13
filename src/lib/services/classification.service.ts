import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer, TimeoutError, from } from 'rxjs';
import { catchError, timeout, retry, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  OpenRouterRequest,
  OpenRouterResponse,
  ClassificationResult,
  ClassificationOptions,
  ClassificationError,
  ExpenseToClassify,
  ValidationResult,
  ResponseFormat
} from '../models/openrouter';
import { CategoryDto } from '../../types';
import { RateLimiterService } from './rate-limiter.service';
import { supabaseClient } from 'src/db/supabase.client';

@Injectable({
  providedIn: 'root'
})
export class ClassificationService {
  private readonly http = inject(HttpClient);
  private readonly rateLimiter = inject(RateLimiterService);
  
  private readonly edgeFunctionUrl: string;
  private readonly defaultTimeout = 30000;
  private readonly maxRetries = 3;
  private readonly defaultModel = 'openai/gpt-4o-mini';

  constructor() {
    this.edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/openrouter_integration`;
  }

  /**
   * Klasyfikuje pojedynczy wydatek
   */
  public classifyExpense(
    description: string,
    existingCategories: CategoryDto[],
    options?: ClassificationOptions
  ): Observable<ClassificationResult> {
    // Walidacja wejścia
    this.validateInput(description);

    // Rate limiting
    if (!this.rateLimiter.canMakeRequest('classification')) {
      const waitTime = this.rateLimiter.getTimeUntilNextRequest('classification');
      return throwError(() => new ClassificationError(
        `Przekroczono limit zapytań. Spróbuj ponownie za ${Math.ceil(waitTime / 1000)} sekund.`,
        'RATE_LIMIT_ERROR'
      ));
    }

    // Budowanie payloadu
    const payload: OpenRouterRequest = {
      model: options?.model || this.defaultModel,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(existingCategories)
        },
        {
          role: 'user',
          content: this.buildUserPrompt(description)
        }
      ],
      response_format: this.buildResponseFormat(),
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 500
    };

    // Wywołanie edge function
    this.rateLimiter.recordRequest('classification');
    
    return this.callEdgeFunction(payload).pipe(
      map(response => this.parseModelResponse(response)),
      map(result => this.enrichResult(result, existingCategories))
    );
  }

  /**
   * Klasyfikuje wiele wydatków jednocześnie
   */
  public batchClassifyExpenses(
    expenses: ExpenseToClassify[],
    existingCategories: CategoryDto[],
    options?: ClassificationOptions
  ): Observable<ClassificationResult[]> {
    // Walidacja
    if (!expenses || expenses.length === 0) {
      return throwError(() => new ClassificationError(
        'Lista wydatków jest pusta',
        'VALIDATION_ERROR'
      ));
    }

    // Rate limiting dla batch
    if (!this.rateLimiter.canMakeRequest('batch-classification')) {
      const waitTime = this.rateLimiter.getTimeUntilNextRequest('batch-classification');
      return throwError(() => new ClassificationError(
        `Przekroczono limit zapytań. Spróbuj ponownie za ${Math.ceil(waitTime / 1000)} sekund.`,
        'RATE_LIMIT_ERROR'
      ));
    }

    // Budowanie payloadu dla batch
    const expensesText = expenses
      .map((exp, idx) => `${idx + 1}. Opis: "${exp.description}", Kwota: ${exp.amount} PLN${exp.date ? `, Data: ${exp.date}` : ''}`)
    .join('\n');

    const payload: OpenRouterRequest = {
      model: options?.model || this.defaultModel,
      messages: [
        {
          role: 'system',
          content: this.buildBatchSystemPrompt(existingCategories)
        },
        {
          role: 'user',
          content: this.buildBatchUserPrompt(expensesText, expenses.length)
        }
      ],
      response_format: this.buildBatchResponseFormat(expenses.length),
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2000
    };

    this.rateLimiter.recordRequest('batch-classification');
    
    return this.callEdgeFunction(payload).pipe(
      map(response => this.parseBatchModelResponse(response, expenses.length)),
      map(results => results.map(result => this.enrichResult(result, existingCategories)))
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
      errors
    };
  }

  // ========== Prywatne metody ==========

  private buildSystemPrompt(categories: CategoryDto[]): string {
    const categoriesList = categories
      .map(cat => `- ID: ${cat.id}, Nazwa: "${cat.name}"`)
      .join('\n');
      
    return `Jesteś ekspertem w klasyfikacji wydatków finansowych.
    TWOJE ZADANIE:
    Na podstawie opisu pojedynczego wydatku dopasuj go do jednej z istniejących kategorii lub, jeśli żadne dopasowanie nie jest wystarczająco pewne, zaproponuj nową kategorię.
    
    ---
    
    ### LISTA ISTNIEJĄCYCH KATEGORII:
    ${categoriesList}    
    ---
    
    ### ZASADY KLASYFIKACJI:
    
    1. Oceń, do której z istniejących kategorii wydatek najbardziej pasuje.
    2. Jeśli **pewność dopasowania ≥ 0.7**, zwróć identyfikator i nazwę tej kategorii.
    3. Jeśli **pewność < 0.7**, zaproponuj **nową nazwę kategorii** zgodną z zasadami poniżej.
    4. Oceniaj pewność (confidence) w skali 0–1, uwzględniając:
       - słowa kluczowe w opisie,
       - kontekst zakupu (np. miejsce, usługa, produkt),
       - kwotę transakcji (większe kwoty mogą wskazywać na większe zakupy, np. sprzęt RTV/AGD, samochód itp.).
    5. Nowe kategorie muszą być:
       - krótkie (1–3 słowa),
       - jednoznaczne i zrozumiałe,
       - opisowe (np. „Sprzęt fotograficzny”, nie „Rzeczy”),
       - w języku polskim.
    6. Użyj kategorii „Inne” **tylko wtedy**, gdy żadna z istniejących nie pasuje, a nowa kategoria byłaby zbyt wąska lub unikalna.
    7. Zawsze podaj krótkie (1–2 zdania) uzasadnienie wyboru.
    8. Zwróć wynik **w formacie JSON**:
    `;   
  }

  private buildUserPrompt(description: string): string {
    return `Sklasyfikuj następujący wydatek:

Opis: ${description}

Zwróć wynik **tylko w formacie JSON**, bez żadnych dodatkowych komentarzy, opisów ani tekstu.`;
  }

  private buildBatchSystemPrompt(categories: CategoryDto[]): string {
    const categoriesList = categories
      .map(cat => `- ID: ${cat.id}, Nazwa: "${cat.name}"`)
      .join('\n');
      
    return `Jesteś ekspertem w klasyfikacji wydatków finansowych.
    TWOJE ZADANIE:
    Na podstawie listy wydatków dopasuj każdy z nich do jednej z istniejących kategorii lub, jeśli żadne dopasowanie nie jest wystarczająco pewne, zaproponuj nową kategorię.
    
    ---
    
    ### LISTA ISTNIEJĄCYCH KATEGORII:
    ${categoriesList}    
    ---
    
    ### ZASADY KLASYFIKACJI:
    
    1. Dla każdego wydatku oceń, do której z istniejących kategorii najbardziej pasuje.
    2. Jeśli **pewność dopasowania ≥ 0.7**, zwróć identyfikator i nazwę tej kategorii.
    3. Jeśli **pewność < 0.7**, zaproponuj **nową nazwę kategorii** zgodną z zasadami poniżej.
    4. Oceniaj pewność (confidence) w skali 0–1, uwzględniając:
       - słowa kluczowe w opisie,
       - kontekst zakupu (np. miejsce, usługa, produkt),
       - kwotę transakcji (większe kwoty mogą wskazywać na większe zakupy, np. sprzęt RTV/AGD, samochód itp.).
    5. Nowe kategorie muszą być:
       - krótkie (1–3 słowa),
       - jednoznaczne i zrozumiałe,
       - opisowe (np. „Sprzęt fotograficzny", nie „Rzeczy"),
       - w języku polskim.
    6. Użyj kategorii „Inne" **tylko wtedy**, gdy żadna z istniejących nie pasuje, a nowa kategoria byłaby zbyt wąska lub unikalna.
    7. Zawsze podaj krótkie (1–2 zdania) uzasadnienie wyboru dla każdego wydatku.
    8. Zwróć wynik **w formacie JSON** jako tablicę obiektów.
    9. Zachowaj kolejność wydatków - wynik dla wydatku nr 1 musi być pierwszy w tablicy, itd.
    10. Proponowane nazwy nowych kategorii muszą być unikalne i nie powinny być takie same jak nazwy istniejących kategorii.
    11. W przypadku nowych kategorii w polu ID oraz category name zwróć null, a uzupelnij pole newCategoryName nazwą nowej kategorii.
    `;   
  }

  private buildBatchUserPrompt(expensesText: string, count: number): string {
    return `Sklasyfikuj następujące ${count} wydatki:

${expensesText}

WAŻNE: Zwróć tablicę z dokładnie ${count} wynikami w tej samej kolejności. Każdy wynik musi zawierać pola: categoryId, categoryName, confidence, isNewCategory, reasoning.
Zwróć wynik **tylko w formacie JSON**, bez żadnych dodatkowych komentarzy, opisów ani tekstu.`;
  }

  private buildResponseFormat(): ResponseFormat {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'expense_classification',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            categoryId: {
              type: ['string', 'null'],
              description: 'ID dopasowanej kategorii z listy istniejących kategorii'
            },
            categoryName: {
              type: 'string',
              description: 'Nazwa dopasowanej kategorii z listy istniejących kategorii'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Pewność dopasowania w skali 0-1'
            },
            isNewCategory: {
              type: 'boolean',
              description: 'true jeśli proponowana jest nowa kategoria, false jeśli dopasowano do istniejącej'
            },
            newCategoryName: {
              type: 'string',
              description: 'Proponowana nazwa nowej kategorii'
            },
            reasoning: {
              type: 'string',
              description: 'Krótkie wyjaśnienie decyzji klasyfikacyjnej'
            }
          },
          required: ['categoryId', 'categoryName', 'confidence', 'isNewCategory', 'reasoning'],
          additionalProperties: false
        }
      }
    };
  }

  private buildBatchResponseFormat(expectedCount: number): ResponseFormat {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'batch_expense_classification',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              minItems: expectedCount,
              maxItems: expectedCount,
              items: {
                type: 'object',
                properties: {
                  categoryId: {
                    type: ['string', 'null'],
                    description: 'ID dopasowanej kategorii lub null dla nowej kategorii'
                  },
                  categoryName: {
                    type: 'string',
                    description: 'Nazwa dopasowanej kategorii z listy istniejących kategorii'
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'Pewność dopasowania w skali 0-1'
                  },
                  isNewCategory: {
                    type: 'boolean',
                    description: 'true jeśli proponowana jest nowa kategoria, false jeśli dopasowano do istniejącej'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Krótkie wyjaśnienie decyzji klasyfikacyjnej'
                  },
                  newCategoryName:{
                    type: 'string',
                    description: 'Proponowana nazwa nowej kategorii'
                  }
                },
                required: ['categoryId', 'categoryName', 'confidence', 'isNewCategory', 'reasoning','newCategoryName'],
                additionalProperties: false
              }
            }
          },
          required: ['results'],
          additionalProperties: false
        }
      }
    };
  }

  private callEdgeFunction(payload: OpenRouterRequest): Observable<OpenRouterResponse> {
    // Pobierz aktualny token sesji użytkownika
    return from(supabaseClient.auth.getSession()).pipe(
      switchMap(({ data: { session }, error }) => {
        if (error || !session?.access_token) {
          return throwError(() => new ClassificationError(
            'Nie jesteś zalogowany. Zaloguj się ponownie.',
            'AUTH_ERROR',
            error
          ));
        }
  
        // Użyj tokenu sesji użytkownika zamiast anon key
        return this.http.post<OpenRouterResponse>(
          this.edgeFunctionUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}` // ← To jest klucz!
            }
          }
        );
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
        resetOnSuccess: true
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
        reasoning: parsed.reasoning
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
        reasoning: result.reasoning
      }));
    } catch (error) {
      throw new ClassificationError(
        'Nie udało się sparsować odpowiedzi batch modelu',
        'PARSE_ERROR',
        error
      );
    }
  }

  private enrichResult(
    result: ClassificationResult,
    categories: CategoryDto[]
  ): ClassificationResult {
    // Jeśli jest categoryId, znajdź pełne dane kategorii
    if (result.categoryId) {
      const category = categories.find(cat => cat.id === result.categoryId);
      if (category) {
        result.categoryName = category.name;
      }
    }

    return result;
  }

  private validateInput(description: string): void {
    if (!description || description.trim().length === 0) {
      throw new ClassificationError(
        'Opis wydatku jest wymagany',
        'VALIDATION_ERROR'
      );
    }

    if (description.length > 500) {
      throw new ClassificationError(
        'Opis wydatku jest zbyt długi (maksymalnie 500 znaków)',
        'VALIDATION_ERROR'
      );
    }
  }

  private handleHttpError(error: HttpErrorResponse | TimeoutError | any): Observable<never> {
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