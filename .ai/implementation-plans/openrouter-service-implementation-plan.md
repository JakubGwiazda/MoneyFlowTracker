# Plan Wdrożenia Usługi OpenRouter

## 1. Opis Usługi

Usługa OpenRouter będzie odpowiedzialna za komunikację z API OpenRouter w celu klasyfikacji wydatków przy użyciu modeli LLM. Głównym zadaniem będzie automatyczne dopasowanie wydatków do istniejących kategorii lub proponowanie nowych nazw kategorii, gdy dopasowanie nie jest możliwe.

### Architektura

```
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│  Angular App    │─────▶│  Supabase Edge       │─────▶│  OpenRouter API │
│  (Frontend)     │      │  Function (Proxy)    │      │                 │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
        │                          │
        │                          │
        ▼                          ▼
┌─────────────────┐      ┌──────────────────────┐
│  Classification │      │  Environment         │
│  Service        │      │  Variables (API Key) │
└─────────────────┘      └──────────────────────┘
```

### Zakres Odpowiedzialności

1. **Frontend Service (ClassificationService)**: Zarządzanie komunikacją z edge function, przygotowanie danych, obsługa odpowiedzi
2. **Supabase Edge Function**: Proxy dla OpenRouter API, zarządzanie API key, sanityzacja danych
3. **Type Definitions**: Silne typowanie dla requestów i responsów
4. **Error Handling**: Kompleksowa obsługa błędów na wszystkich poziomach

## 2. Opis Konstruktora

### ClassificationService (Angular Service)

```typescript
@Injectable({
  providedIn: 'root'
})
export class ClassificationService {
  private readonly edgeFunctionUrl: string;
  private readonly defaultTimeout = 30000; // 30 sekund
  private readonly maxRetries = 3;
  
  constructor() {
    const supabaseUrl = inject(ENVIRONMENT_CONFIG).supabaseUrl;
    this.edgeFunctionUrl = `${supabaseUrl}/functions/v1/openrouter-classify`;
  }
}
```

**Parametry konstruktora:**
- Automatyczne wstrzykiwanie konfiguracji Supabase
- Ustawienie domyślnych wartości timeout i retry

**Inicjalizacja:**
- URL edge function konstruowany z konfiguracji środowiska
- Domyślne wartości timeoutu i retries jako stałe

## 3. Publiczne Metody i Pola

### 3.1 classifyExpense()

**Sygnatura:**
```typescript
public classifyExpense(
  description: string,
  amount: number,
  existingCategories: CategoryDto[],
  options?: ClassificationOptions
): Observable<ClassificationResult>
```

**Parametry:**
- `description`: Opis wydatku do klasyfikacji
- `amount`: Kwota wydatku (może pomóc w klasyfikacji)
- `existingCategories`: Lista istniejących kategorii w systemie
- `options`: Opcjonalne parametry (model, temperatura, itp.)

**Zwraca:**
Observable z wynikiem klasyfikacji zawierającym:
- `categoryId`: ID dopasowanej kategorii (jeśli znaleziono)
- `categoryName`: Nazwa dopasowanej kategorii lub proponowana nowa
- `confidence`: Pewność dopasowania (0-1)
- `isNewCategory`: Czy to propozycja nowej kategorii
- `reasoning`: Opcjonalne wyjaśnienie decyzji

**Przykład użycia:**
```typescript
this.classificationService.classifyExpense(
  'Zakup kawy w Starbucks',
  15.50,
  this.categories,
  { model: 'openai/gpt-4o-mini', temperature: 0.3 }
).subscribe({
  next: (result) => {
    if (result.isNewCategory) {
      console.log(`Proponowana nowa kategoria: ${result.categoryName}`);
    } else {
      console.log(`Dopasowano do kategorii: ${result.categoryName}`);
    }
  },
  error: (error) => this.handleError(error)
});
```

### 3.2 batchClassifyExpenses()

**Sygnatura:**
```typescript
public batchClassifyExpenses(
  expenses: ExpenseToClassify[],
  existingCategories: CategoryDto[],
  options?: ClassificationOptions
): Observable<ClassificationResult[]>
```

**Parametry:**
- `expenses`: Tablica wydatków do klasyfikacji
- `existingCategories`: Lista istniejących kategorii
- `options`: Opcjonalne parametry

**Zwraca:**
Observable z tablicą wyników klasyfikacji

**Przykład użycia:**
```typescript
this.classificationService.batchClassifyExpenses(
  this.unclassifiedExpenses,
  this.categories
).subscribe({
  next: (results) => {
    results.forEach((result, index) => {
      this.unclassifiedExpenses[index].suggestedCategory = result;
    });
  }
});
```

### 3.3 validateClassification()

**Sygnatura:**
```typescript
public validateClassification(
  result: ClassificationResult
): ValidationResult
```

**Parametry:**
- `result`: Wynik klasyfikacji do walidacji

**Zwraca:**
Obiekt z informacją o poprawności wyniku

**Przykład użycia:**
```typescript
const validation = this.classificationService.validateClassification(result);
if (!validation.isValid) {
  console.error('Błąd walidacji:', validation.errors);
}
```

## 4. Prywatne Metody i Pola

### 4.1 buildSystemPrompt()

```typescript
private buildSystemPrompt(categories: CategoryDto[]): string
```

**Cel:** Konstruuje komunikat systemowy dla LLM z kontekstem istniejących kategorii.

**Implementacja:**
```typescript
private buildSystemPrompt(categories: CategoryDto[]): string {
  const categoriesList = categories
    .map(cat => `- ${cat.name}: ${cat.description || 'brak opisu'}`)
    .join('\n');
    
  return `Jesteś ekspertem w klasyfikacji wydatków finansowych. 
Twoim zadaniem jest dopasowanie wydatku do jednej z istniejących kategorii lub zaproponowanie nowej nazwy kategorii.

ISTNIEJĄCE KATEGORIE:
${categoriesList}

ZASADY:
1. Jeśli wydatek pasuje do istniejącej kategorii, zwróć jej dokładną nazwę i ID
2. Jeśli brak dopasowania, zaproponuj nową, konkretną nazwę kategorii
3. Oceniaj pewność dopasowania w skali 0-1
4. Bądź konserwatywny - jeśli pewność < 0.7, zaproponuj nową kategorię
5. Nowe kategorie powinny być jasne, zwięzłe i opisowe`;
}
```

### 4.2 buildUserPrompt()

```typescript
private buildUserPrompt(description: string, amount: number): string
```

**Cel:** Konstruuje komunikat użytkownika z detalami wydatku.

**Implementacja:**
```typescript
private buildUserPrompt(description: string, amount: number): string {
  return `Sklasyfikuj następujący wydatek:

Opis: ${description}
Kwota: ${amount} PLN

Zwróć wynik w formacie JSON zgodnym ze schematem.`;
}
```

### 4.3 buildResponseFormat()

```typescript
private buildResponseFormat(): ResponseFormat
```

**Cel:** Definiuje schemat JSON dla strukturyzowanej odpowiedzi z modelu.

**Implementacja:**
```typescript
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
            description: 'ID dopasowanej kategorii lub null dla nowej'
          },
          categoryName: {
            type: 'string',
            description: 'Nazwa dopasowanej lub proponowanej kategorii'
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Pewność dopasowania (0-1)'
          },
          isNewCategory: {
            type: 'boolean',
            description: 'Czy to propozycja nowej kategorii'
          },
          reasoning: {
            type: 'string',
            description: 'Krótkie wyjaśnienie decyzji'
          }
        },
        required: ['categoryName', 'confidence', 'isNewCategory'],
        additionalProperties: false
      }
    }
  };
}
```

### 4.4 callEdgeFunction()

```typescript
private callEdgeFunction(payload: OpenRouterRequest): Observable<OpenRouterResponse>
```

**Cel:** Wykonuje wywołanie do Supabase Edge Function z obsługą retry.

**Implementacja:**
```typescript
private callEdgeFunction(
  payload: OpenRouterRequest
): Observable<OpenRouterResponse> {
  return this.http.post<OpenRouterResponse>(
    this.edgeFunctionUrl,
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getSupabaseAnonKey()}`
      }
    }
  ).pipe(
    timeout(this.defaultTimeout),
    retry({
      count: this.maxRetries,
      delay: (error, retryCount) => {
        // Exponential backoff
        return timer(Math.pow(2, retryCount) * 1000);
      },
      resetOnSuccess: true
    }),
    catchError(this.handleHttpError.bind(this))
  );
}
```

### 4.5 parseModelResponse()

```typescript
private parseModelResponse(response: string): ClassificationResult
```

**Cel:** Parsuje odpowiedź JSON z modelu do interfejsu ClassificationResult.

**Implementacja:**
```typescript
private parseModelResponse(response: string): ClassificationResult {
  try {
    const parsed = JSON.parse(response);
    
    // Walidacja wymaganych pól
    if (!parsed.categoryName || typeof parsed.confidence !== 'number') {
      throw new Error('Invalid response structure');
    }
    
    return {
      categoryId: parsed.categoryId || null,
      categoryName: parsed.categoryName,
      confidence: parsed.confidence,
      isNewCategory: parsed.isNewCategory,
      reasoning: parsed.reasoning || ''
    };
  } catch (error) {
    throw new ClassificationError(
      'Failed to parse model response',
      'PARSE_ERROR',
      error
    );
  }
}
```

### 4.6 handleHttpError()

```typescript
private handleHttpError(error: HttpErrorResponse): Observable<never>
```

**Cel:** Centralizowana obsługa błędów HTTP.

**Implementacja:**
```typescript
private handleHttpError(error: HttpErrorResponse): Observable<never> {
  let classificationError: ClassificationError;
  
  if (error.status === 0) {
    classificationError = new ClassificationError(
      'Brak połączenia z serwerem',
      'NETWORK_ERROR',
      error
    );
  } else if (error.status === 401) {
    classificationError = new ClassificationError(
      'Błąd uwierzytelniania',
      'AUTH_ERROR',
      error
    );
  } else if (error.status === 429) {
    classificationError = new ClassificationError(
      'Przekroczono limit zapytań',
      'RATE_LIMIT_ERROR',
      error
    );
  } else if (error.status >= 500) {
    classificationError = new ClassificationError(
      'Błąd serwera',
      'SERVER_ERROR',
      error
    );
  } else {
    classificationError = new ClassificationError(
      error.message || 'Nieznany błąd',
      'UNKNOWN_ERROR',
      error
    );
  }
  
  return throwError(() => classificationError);
}
```

## 5. Obsługa Błędów

### 5.1 Hierarchia Błędów

```typescript
// Base error class
export class ClassificationError extends Error {
  constructor(
    message: string,
    public code: ClassificationErrorCode,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ClassificationError';
  }
}

// Error codes
export type ClassificationErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';
```

### 5.2 Scenariusze Błędów

**1. Błąd sieci (NETWORK_ERROR)**
- **Przyczyna:** Brak połączenia internetowego
- **Obsługa:** Retry z exponential backoff, informacja dla użytkownika
- **Kod statusu:** 0

**2. Błąd autoryzacji (AUTH_ERROR)**
- **Przyczyna:** Nieprawidłowy lub wygasły token Supabase
- **Obsługa:** Odświeżenie sesji, ponowna próba
- **Kod statusu:** 401

**3. Przekroczenie limitu (RATE_LIMIT_ERROR)**
- **Przyczyna:** Za dużo zapytań w krótkim czasie
- **Obsługa:** Kolejkowanie zapytań, informacja o opóźnieniu
- **Kod statusu:** 429

**4. Błąd serwera (SERVER_ERROR)**
- **Przyczyna:** Problem z edge function lub OpenRouter API
- **Obsługa:** Retry z większym opóźnieniem, fallback do ręcznej klasyfikacji
- **Kod statusu:** 500-599

**5. Timeout (TIMEOUT_ERROR)**
- **Przyczyna:** Zapytanie trwa zbyt długo
- **Obsługa:** Anulowanie zapytania, komunikat dla użytkownika
- **RxJS:** timeout operator

**6. Błąd parsowania (PARSE_ERROR)**
- **Przyczyna:** Nieprawidłowy format odpowiedzi z modelu
- **Obsługa:** Logowanie błędu, fallback do ręcznej klasyfikacji
- **Walidacja:** JSON.parse + schema validation

**7. Błąd walidacji (VALIDATION_ERROR)**
- **Przyczyna:** Dane wejściowe nie spełniają wymagań
- **Obsługa:** Wczesna walidacja, komunikaty o błędach
- **Guard:** Walidatory na początku metod

### 5.3 Error Handler Service

```typescript
@Injectable({
  providedIn: 'root'
})
export class ClassificationErrorHandler {
  handleError(error: ClassificationError): void {
    // Logowanie
    console.error(`[${error.code}] ${error.message}`, error.originalError);
    
    // Metryki (opcjonalnie)
    this.trackError(error);
    
    // User-friendly message
    const userMessage = this.getUserMessage(error.code);
    this.notificationService.showError(userMessage);
  }
  
  private getUserMessage(code: ClassificationErrorCode): string {
    const messages: Record<ClassificationErrorCode, string> = {
      NETWORK_ERROR: 'Brak połączenia z internetem. Sprawdź swoje połączenie.',
      AUTH_ERROR: 'Sesja wygasła. Odśwież stronę i spróbuj ponownie.',
      RATE_LIMIT_ERROR: 'Wykonano zbyt wiele operacji. Spróbuj za chwilę.',
      SERVER_ERROR: 'Wystąpił problem z serwerem. Spróbuj ponownie później.',
      TIMEOUT_ERROR: 'Operacja trwała zbyt długo. Spróbuj ponownie.',
      PARSE_ERROR: 'Błąd przetwarzania odpowiedzi. Spróbuj ponownie.',
      VALIDATION_ERROR: 'Nieprawidłowe dane wejściowe.',
      UNKNOWN_ERROR: 'Wystąpił nieoczekiwany błąd.'
    };
    
    return messages[code];
  }
}
```

## 6. Kwestie Bezpieczeństwa

### 6.1 Ochrona API Key

**Problemy:**
- API key OpenRouter nie może być ujawniony w kodzie frontend
- Przechowywanie w zmiennych środowiskowych frontend jest niebezpieczne

**Rozwiązanie:**
```typescript
// supabase/functions/openrouter-classify/index.ts
Deno.serve(async (req) => {
  // 1. Weryfikacja autoryzacji Supabase
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. Walidacja tokenu
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  
  if (error || !user) {
    return new Response('Invalid token', { status: 401 });
  }
  
  // 3. API key z environment variables (bezpieczne)
  const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterKey) {
    return new Response('Server configuration error', { status: 500 });
  }
  
  // 4. Wywołanie OpenRouter API
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  
  return response;
});
```

### 6.2 Sanityzacja Danych

**Input Validation:**
```typescript
private validateInput(description: string, amount: number): void {
  // Długość opisu
  if (!description || description.trim().length === 0) {
    throw new ClassificationError(
      'Opis wydatku jest wymagany',
      'VALIDATION_ERROR'
    );
  }
  
  if (description.length > 500) {
    throw new ClassificationError(
      'Opis wydatku jest zbyt długi (max 500 znaków)',
      'VALIDATION_ERROR'
    );
  }
  
  // Kwota
  if (typeof amount !== 'number' || amount < 0) {
    throw new ClassificationError(
      'Kwota musi być liczbą dodatnią',
      'VALIDATION_ERROR'
    );
  }
  
  // Sanityzacja HTML/XSS
  const sanitized = this.sanitizeHtml(description);
  if (sanitized !== description) {
    throw new ClassificationError(
      'Opis zawiera niedozwolone znaki',
      'VALIDATION_ERROR'
    );
  }
}
```

### 6.3 Rate Limiting

**Frontend Rate Limiter:**
```typescript
@Injectable({
  providedIn: 'root'
})
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 10; // 10 zapytań
  private readonly timeWindow = 60000; // w ciągu 1 minuty
  
  canMakeRequest(): boolean {
    const now = Date.now();
    
    // Usuń stare requesty spoza okna czasowego
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    return this.requests.length < this.maxRequests;
  }
  
  recordRequest(): void {
    this.requests.push(Date.now());
  }
  
  getTimeUntilNextRequest(): number {
    if (this.canMakeRequest()) return 0;
    
    const oldestRequest = Math.min(...this.requests);
    return this.timeWindow - (Date.now() - oldestRequest);
  }
}
```

### 6.4 Content Security Policy

**Edge Function Headers:**
```typescript
return new Response(JSON.stringify(result), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  }
});
```

## 7. Plan Wdrożenia Krok Po Kroku

### Krok 1: Przygotowanie Środowiska

**1.1 Instalacja zależności**
```bash
# W głównym katalogu projektu
npm install --save-dev @supabase/supabase-js
```

**1.2 Konfiguracja zmiennych środowiskowych**

Utwórz/zaktualizuj `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

Utwórz/zaktualizuj `src/environments/environment.prod.ts`:
```typescript
export const environment = {
  production: true,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY'
};
```

**1.3 Konfiguracja Supabase Edge Function**

W Supabase Dashboard:
1. Przejdź do `Edge Functions`
2. Kliknij `Create a new function`
3. Nazwa: `openrouter-classify`
4. W `Settings` → `Secrets` dodaj: `OPENROUTER_API_KEY`

### Krok 2: Definicja Typów TypeScript

**2.1 Utwórz plik `src/lib/models/openrouter.ts`**

```typescript
// Request/Response dla OpenRouter API
export interface OpenRouterRequest {
  model: string;
  messages: Message[];
  response_format?: ResponseFormat;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

export interface JsonSchema {
  type: string;
  properties: Record<string, JsonSchemaProperty>;
  required: string[];
  additionalProperties: boolean;
}

export interface JsonSchemaProperty {
  type: string | string[];
  description?: string;
  minimum?: number;
  maximum?: number;
  enum?: string[];
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Choice[];
  usage: Usage;
}

export interface Choice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Domain models
export interface ClassificationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExpenseToClassify {
  description: string;
  amount: number;
}

export interface ClassificationResult {
  categoryId: string | null;
  categoryName: string;
  confidence: number;
  isNewCategory: boolean;
  reasoning: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// Error types
export type ClassificationErrorCode = 
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'SERVER_ERROR'
  | 'TIMEOUT_ERROR'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

export class ClassificationError extends Error {
  constructor(
    message: string,
    public code: ClassificationErrorCode,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ClassificationError';
  }
}
```

### Krok 3: Implementacja Edge Function

**3.1 Utwórz plik `supabase/functions/openrouter-classify/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Weryfikacja autoryzacji
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Weryfikacja tokenu Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Sprawdzenie API key OpenRouter
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parsowanie requestu
    const payload = await req.json();
    
    // 5. Walidacja payloadu
    if (!payload.messages || !Array.isArray(payload.messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Wywołanie OpenRouter API
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPABASE_URL') ?? '',
        'X-Title': 'MoneyFlowTracker'
      },
      body: JSON.stringify({
        model: payload.model || 'openai/gpt-4o-mini',
        messages: payload.messages,
        response_format: payload.response_format,
        temperature: payload.temperature ?? 0.3,
        max_tokens: payload.max_tokens ?? 500,
        top_p: payload.top_p ?? 1,
        frequency_penalty: payload.frequency_penalty ?? 0,
        presence_penalty: payload.presence_penalty ?? 0
      })
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'OpenRouter API error',
          details: errorText 
        }),
        { 
          status: openRouterResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 7. Zwrócenie odpowiedzi
    const data = await openRouterResponse.json();
    
    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { 
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
```

**3.2 Utwórz plik `supabase/functions/openrouter-classify/deno.json`**

```json
{
  "tasks": {
    "dev": "deno run --watch --allow-all index.ts"
  },
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

### Krok 4: Implementacja Rate Limiter

**4.1 Utwórz plik `src/lib/services/rate-limiter.service.ts`**

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RateLimiterService {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 10;
  private readonly timeWindow = 60000; // 1 minuta

  canMakeRequest(key: string = 'default'): boolean {
    const now = Date.now();
    const requests = this.getRequests(key);
    
    // Usuń stare requesty
    const validRequests = requests.filter(time => now - time < this.timeWindow);
    this.requests.set(key, validRequests);
    
    return validRequests.length < this.maxRequests;
  }

  recordRequest(key: string = 'default'): void {
    const requests = this.getRequests(key);
    requests.push(Date.now());
    this.requests.set(key, requests);
  }

  getTimeUntilNextRequest(key: string = 'default'): number {
    if (this.canMakeRequest(key)) return 0;
    
    const requests = this.getRequests(key);
    const oldestRequest = Math.min(...requests);
    return this.timeWindow - (Date.now() - oldestRequest);
  }

  getRemainingRequests(key: string = 'default'): number {
    const now = Date.now();
    const requests = this.getRequests(key);
    const validRequests = requests.filter(time => now - time < this.timeWindow);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  private getRequests(key: string): number[] {
    return this.requests.get(key) || [];
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}
```

### Krok 5: Implementacja Classification Service

**5.1 Utwórz plik `src/lib/services/openrouter.service.ts`**

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, timeout, retry, map } from 'rxjs/operators';
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
import { CategoryDto } from '../models/categories';
import { RateLimiterService } from './rate-limiter.service';

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
    this.edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/openrouter-classify`;
  }

  /**
   * Klasyfikuje pojedynczy wydatek
   */
  public classifyExpense(
    description: string,
    amount: number,
    existingCategories: CategoryDto[],
    options?: ClassificationOptions
  ): Observable<ClassificationResult> {
    // Walidacja wejścia
    this.validateInput(description, amount);

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
          content: this.buildUserPrompt(description, amount)
        }
      ],
      response_format: this.buildResponseFormat(),
      temperature: options?.temperature ?? 0.3,
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
      .map((exp, idx) => `${idx + 1}. "${exp.description}" - ${exp.amount} PLN`)
      .join('\n');

    const payload: OpenRouterRequest = {
      model: options?.model || this.defaultModel,
      messages: [
        {
          role: 'system',
          content: this.buildSystemPrompt(existingCategories)
        },
        {
          role: 'user',
          content: `Sklasyfikuj następujące wydatki:\n\n${expensesText}\n\nZwróć tablicę wyników w formacie JSON.`
        }
      ],
      response_format: this.buildBatchResponseFormat(),
      temperature: options?.temperature ?? 0.3,
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
      .map(cat => `- ID: ${cat.id}, Nazwa: "${cat.name}"${cat.description ? `, Opis: ${cat.description}` : ''}`)
      .join('\n');
      
    return `Jesteś ekspertem w klasyfikacji wydatków finansowych. 
Twoim zadaniem jest dopasowanie wydatku do jednej z istniejących kategorii lub zaproponowanie nowej nazwy kategorii.

ISTNIEJĄCE KATEGORIE:
${categoriesList}

ZASADY KLASYFIKACJI:
1. Jeśli wydatek wyraźnie pasuje do istniejącej kategorii (pewność >= 0.7), zwróć jej ID i nazwę
2. Jeśli pewność dopasowania < 0.7, zaproponuj nową, konkretną nazwę kategorii
3. Oceniaj pewność dopasowania w skali 0-1 na podstawie:
   - Podobieństwa słów kluczowych
   - Kontekstu zakupu
   - Kwoty (duże kwoty mogą sugerować specyficzne kategorie)
4. Nowe kategorie powinny być:
   - Jasne i zrozumiałe
   - Zwięzłe (1-3 słowa)
   - Opisowe i specyficzne
   - W języku polskim
5. Zawsze podaj krótkie uzasadnienie swojej decyzji

PRZYKŁADY:
- "Zakup kawy w Starbucks" → pasuje do "Restauracje i kawiarnie" (confidence: 0.9)
- "Opłata za Netflix" → pasuje do "Rozrywka cyfrowa" (confidence: 0.95)
- "Zakup specjalistycznego sprzętu fotograficznego" → nowa kategoria "Sprzęt fotograficzny" (confidence: 0.3 dla ogólnej "Elektroniki")`;
  }

  private buildUserPrompt(description: string, amount: number): string {
    return `Sklasyfikuj następujący wydatek:

Opis: ${description}
Kwota: ${amount} PLN

Zwróć wynik w formacie JSON zgodnym ze schematem.`;
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
              description: 'ID dopasowanej kategorii lub null dla nowej kategorii'
            },
            categoryName: {
              type: 'string',
              description: 'Nazwa dopasowanej kategorii lub proponowana nazwa nowej kategorii'
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
            }
          },
          required: ['categoryName', 'confidence', 'isNewCategory', 'reasoning'],
          additionalProperties: false
        }
      }
    };
  }

  private buildBatchResponseFormat(): ResponseFormat {
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
              items: {
                type: 'object',
                properties: {
                  categoryId: {
                    type: ['string', 'null']
                  },
                  categoryName: {
                    type: 'string'
                  },
                  confidence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1
                  },
                  isNewCategory: {
                    type: 'boolean'
                  },
                  reasoning: {
                    type: 'string'
                  }
                },
                required: ['categoryName', 'confidence', 'isNewCategory', 'reasoning'],
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
    return this.http.post<OpenRouterResponse>(
      this.edgeFunctionUrl,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${environment.supabaseAnonKey}`
        }
      }
    ).pipe(
      timeout(this.defaultTimeout),
      retry({
        count: this.maxRetries,
        delay: (error: HttpErrorResponse, retryCount: number) => {
          // Exponential backoff: 2^retryCount * 1000ms
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
        reasoning: parsed.reasoning || ''
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
        categoryId: result.categoryId || null,
        categoryName: result.categoryName,
        confidence: result.confidence,
        isNewCategory: result.isNewCategory,
        reasoning: result.reasoning || ''
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

  private validateInput(description: string, amount: number): void {
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

    if (typeof amount !== 'number' || amount < 0) {
      throw new ClassificationError(
        'Kwota musi być liczbą dodatnią',
        'VALIDATION_ERROR'
      );
    }

    if (amount > 1000000) {
      throw new ClassificationError(
        'Kwota wydaje się być nieprawidłowa (przekracza 1 000 000 PLN)',
        'VALIDATION_ERROR'
      );
    }
  }

  private handleHttpError(error: HttpErrorResponse): Observable<never> {
    let classificationError: ClassificationError;

    if (error.status === 0) {
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
    } else if (error.name === 'TimeoutError') {
      classificationError = new ClassificationError(
        'Zapytanie trwało zbyt długo. Spróbuj ponownie.',
        'TIMEOUT_ERROR',
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
```

### Krok 6: Integracja z Istniejącym Kodem

**6.1 Aktualizacja `src/lib/services/expenses.service.ts`**

Dodaj metodę wykorzystującą klasyfikację:

```typescript
import { ClassificationService } from './classification.service';

@Injectable({
  providedIn: 'root'
})
export class ExpensesService {
  private readonly classificationService = inject(ClassificationService);
  
  // ... istniejący kod ...
  
  /**
   * Sugeruje kategorię dla nowego wydatku
   */
  async suggestCategory(
    description: string,
    amount: number
  ): Promise<ClassificationResult> {
    const categories = await this.categoriesService.getAllCategories();
    
    return firstValueFrom(
      this.classificationService.classifyExpense(
        description,
        amount,
        categories
      )
    );
  }
}
```

**6.2 Aktualizacja komponentu dodawania wydatku**

W `src/components/app/expenses/dialogs/add-expense-dialog.component.ts`:

```typescript
export class AddExpenseDialogComponent {
  private readonly classificationService = inject(ClassificationService);
  private readonly categoriesService = inject(CategoriesService);
  
  suggestedCategory = signal<ClassificationResult | null>(null);
  isClassifying = signal<boolean>(false);
  
  async onDescriptionChange(description: string): Promise<void> {
    if (description.length < 5) {
      this.suggestedCategory.set(null);
      return;
    }
    
    this.isClassifying.set(true);
    
    try {
      const amount = this.form.get('amount')?.value || 0;
      const categories = await this.categoriesService.getAllCategories();
      
      this.classificationService.classifyExpense(
        description,
        amount,
        categories
      ).subscribe({
        next: (result) => {
          this.suggestedCategory.set(result);
          this.isClassifying.set(false);
          
          // Auto-wybór jeśli pewność > 0.8
          if (result.confidence > 0.8 && !result.isNewCategory) {
            this.form.patchValue({ categoryId: result.categoryId });
          }
        },
        error: (error) => {
          console.error('Classification error:', error);
          this.isClassifying.set(false);
        }
      });
    } catch (error) {
      console.error('Classification error:', error);
      this.isClassifying.set(false);
    }
  }
}
```

**6.3 Aktualizacja template**

```html
<!-- W add-expense-dialog.component.html -->
<mat-form-field>
  <mat-label>Opis</mat-label>
  <input 
    matInput 
    formControlName="description"
    (input)="onDescriptionChange($event.target.value)"
  >
</mat-form-field>

@if (isClassifying()) {
  <div class="classification-loading">
    <mat-spinner diameter="20"></mat-spinner>
    <span>Sugeruję kategorię...</span>
  </div>
}

@if (suggestedCategory()) {
  <div class="classification-suggestion" [class.high-confidence]="suggestedCategory().confidence > 0.8">
    <mat-icon>{{ suggestedCategory().isNewCategory ? 'add_circle' : 'check_circle' }}</mat-icon>
    <div class="suggestion-content">
      <span class="category-name">{{ suggestedCategory().categoryName }}</span>
      <span class="confidence">Pewność: {{ (suggestedCategory().confidence * 100).toFixed(0) }}%</span>
      <span class="reasoning">{{ suggestedCategory().reasoning }}</span>
    </div>
    @if (suggestedCategory().isNewCategory) {
      <button mat-stroked-button (click)="createNewCategory(suggestedCategory().categoryName)">
        Utwórz kategorię
      </button>
    }
  </div>
}
```

### Krok 7: Deploy Edge Function

**7.1 Logowanie do Supabase CLI**

```bash
npx supabase login
```

**7.2 Link projektu**

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

**7.3 Deploy funkcji**

```bash
npx supabase functions deploy openrouter-classify
```

**7.4 Ustawienie secrets**

```bash
npx supabase secrets set OPENROUTER_API_KEY=your_openrouter_api_key
```

**7.5 Weryfikacja**

```bash
# Test lokalny
npx supabase functions serve openrouter-classify

# Test produkcyjny
curl -X POST \
  https://YOUR_PROJECT_REF.supabase.co/functions/v1/openrouter-classify \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant"},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### Krok 8: Monitorowanie i Logowanie

**8.1 Dodaj logging do Edge Function**

```typescript
// Na początku funkcji
console.log('Classification request:', {
  userId: user.id,
  timestamp: new Date().toISOString(),
  model: payload.model
});

// Po wywołaniu OpenRouter
console.log('OpenRouter response:', {
  tokens: data.usage,
  model: data.model,
  finishReason: data.choices[0].finish_reason
});
```

**8.2 Monitorowanie w Supabase Dashboard**

1. Przejdź do `Edge Functions` → `openrouter-classify`
2. Kliknij na `Logs` aby zobaczyć logi
3. Monitoruj `Invocations` dla statystyk użycia

**8.3 Tracking kosztów (opcjonalnie)**

Dodaj tracking usage w bazie:

```sql
CREATE TABLE openrouter_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Aktualizuj w Edge Function:

```typescript
// Po otrzymaniu odpowiedzi z OpenRouter
await supabaseClient.from('openrouter_usage').insert({
  user_id: user.id,
  model: data.model,
  prompt_tokens: data.usage.prompt_tokens,
  completion_tokens: data.usage.completion_tokens,
  total_tokens: data.usage.total_tokens
});
```

### Krok 9: Optymalizacja i Best Practices

**9.1 Caching wyników**

```typescript
@Injectable({
  providedIn: 'root'
})
export class ClassificationCacheService {
  private cache = new Map<string, { result: ClassificationResult, timestamp: number }>();
  private readonly cacheDuration = 3600000; // 1 godzina

  get(key: string): ClassificationResult | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.result;
  }

  set(key: string, result: ClassificationResult): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  getCacheKey(description: string, amount: number): string {
    return `${description.toLowerCase().trim()}_${amount}`;
  }
}
```

**9.2 Debouncing dla real-time suggestions**

```typescript
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

onDescriptionChange$ = new Subject<string>();

ngOnInit() {
  this.onDescriptionChange$.pipe(
    debounceTime(500), // Czekaj 500ms po ostatnim wpisie
    distinctUntilChanged(), // Ignoruj jeśli wartość się nie zmieniła
    switchMap(description => this.classifyDescription(description))
  ).subscribe(result => {
    this.suggestedCategory.set(result);
  });
}
```

**9.3 Fallback dla błędów**

```typescript
classifyExpenseWithFallback(
  description: string,
  amount: number,
  categories: CategoryDto[]
): Observable<ClassificationResult> {
  return this.classificationService.classifyExpense(description, amount, categories).pipe(
    catchError(error => {
      console.error('Classification failed, using fallback', error);
      
      // Prosty fallback - dopasowanie po słowach kluczowych
      return of(this.fallbackClassification(description, amount, categories));
    })
  );
}

private fallbackClassification(
  description: string,
  amount: number,
  categories: CategoryDto[]
): ClassificationResult {
  const lowerDesc = description.toLowerCase();
  
  // Proste dopasowanie po słowach kluczowych
  const match = categories.find(cat => 
    lowerDesc.includes(cat.name.toLowerCase())
  );
  
  if (match) {
    return {
      categoryId: match.id,
      categoryName: match.name,
      confidence: 0.5,
      isNewCategory: false,
      reasoning: 'Dopasowanie lokalne po słowach kluczowych'
    };
  }
  
  return {
    categoryId: null,
    categoryName: 'Inne',
    confidence: 0.3,
    isNewCategory: true,
    reasoning: 'Brak dopasowania - sugerowana kategoria domyślna'
  };
}
```

## 8. Podsumowanie

Ten plan wdrożenia obejmuje:

✅ **Bezpieczną architekturę** - API key chroniony przez Supabase Edge Function  
✅ **Silne typowanie** - TypeScript interfaces dla wszystkich modeli  
✅ **Obsługę błędów** - Kompleksowa hierarchia błędów i retry logic  
✅ **Rate limiting** - Ochrona przed nadmiernym użyciem API  
✅ **Strukturyzowane odpowiedzi** - JSON schema dla przewidywalnych wyników  
✅ **Integrację z istniejącym kodem** - Kompatybilność z ExpensesService  
✅ **Optymalizację** - Caching, debouncing, fallback strategies  
✅ **Monitorowanie** - Logging i tracking usage  
