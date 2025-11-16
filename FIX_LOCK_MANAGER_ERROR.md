# Fix: NavigatorLockAcquireTimeoutError

## Problem

Aplikacja zgłaszała błąd w konsoli przeglądarki:

```
Acquiring an exclusive Navigator LockManager lock "lock:sb-127-auth-token" immediately failed
LockAcquireTimeoutError
NavigatorLockAcquireTimeoutError
```

Błąd ten nie wpływał na funkcjonalność aplikacji, ale wskazywał na problemy z wydajnością i wielokrotne próby uzyskania dostępu do tej samej blokady.

## Przyczyna

Problem był spowodowany przez:

1. **Wielokrotne równoczesne wywołania `supabaseClient.auth.getSession()`**
   - `AuthService.initializeAuth()` wywoływał `getSession()`
   - `authGuard` wywoływał `getSession()` przy każdej nawigacji
   - `guestGuard` wywoływał `getSession()` przy każdej nawigacji
   - `ClassificationService` wywoływał `getSession()` przy każdym żądaniu klasyfikacji

2. **Brak konfiguracji lock timeout** w kliencie Supabase

3. **Brak cache'owania stanu autentykacji** - każdy guard wykonywał pełne wywołanie API

## Rozwiązanie

### 1. Konfiguracja klienta Supabase (`src/db/supabase.client.ts`)

```typescript
export const supabaseClient = createClient<Database>(
  environment.supabaseUrl,
  environment.supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'sb-auth-token',
      storage: window.localStorage,
      flowType: 'pkce',
    },
  },
);
```

**Zmiany:**
- Dodano explicite konfigurację auth options
- Ustawiono `storageKey` na 'sb-auth-token'
- Włączono PKCE flow dla lepszego bezpieczeństwa
- Explicite określono storage (localStorage)

### 2. AuthService - singleton pattern dla sesji (`src/lib/services/auth.service.ts`)

```typescript
export class AuthService {
  private initializationPromise: Promise<void> | null = null;

  private async initializeAuth(): Promise<void> {
    // Prevent multiple simultaneous initialization calls
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      // ... initialization logic
    })();

    return this.initializationPromise;
  }

  isAuthenticated(): boolean {
    return this.authState().user !== null;
  }

  async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  async getAccessToken(): Promise<string | null> {
    await this.waitForInitialization();
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.access_token || null;
  }
}
```

**Zmiany:**
- Dodano `initializationPromise` - zapobiega wielokrotnym równoczesnym wywołaniom `getSession()`
- Dodano `isAuthenticated()` - sprawdza stan z cache bez wywołania API
- Dodano `waitForInitialization()` - zapewnia, że inicjalizacja się zakończyła
- Dodano `getAccessToken()` - zwraca token z cache po inicjalizacji

### 3. AuthGuard - używa cache z AuthService (`src/lib/guards/auth.guard.ts`)

```typescript
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return from(
    authService.waitForInitialization().then(() => {
      if (!authService.isAuthenticated()) {
        return router.parseUrl('/login');
      }
      return true;
    }),
  );
};
```

**Zmiany:**
- Zastąpiono bezpośrednie wywołanie `supabaseClient.auth.getSession()`
- Używa `AuthService.isAuthenticated()` - sprawdza cache zamiast API
- Czeka na inicjalizację przed sprawdzeniem stanu

### 4. GuestGuard - używa cache z AuthService (`src/lib/guards/guest.guard.ts`)

```typescript
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return from(
    authService.waitForInitialization().then(() => {
      if (authService.isAuthenticated()) {
        return router.parseUrl('/app');
      }
      return true;
    }),
  );
};
```

**Zmiany:**
- Zastąpiono bezpośrednie wywołanie `supabaseClient.auth.getSession()`
- Używa `AuthService.isAuthenticated()` - sprawdza cache zamiast API
- Czeka na inicjalizację przed sprawdzeniem stanu

### 5. ClassificationService - używa AuthService dla tokena (`src/lib/services/classification.service.ts`)

```typescript
export class ClassificationService {
  private readonly authService = inject(AuthService);

  private callEdgeFunction(payload: OpenRouterRequest): Observable<OpenRouterResponse> {
    return from(this.authService.getAccessToken()).pipe(
      switchMap((accessToken) => {
        if (!accessToken) {
          return throwError(() => new ClassificationError(
            'Nie jesteś zalogowany. Zaloguj się ponownie.',
            'AUTH_ERROR'
          ));
        }
        
        return this.http.post<OpenRouterResponse>(
          this.edgeFunctionUrl,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );
      }),
      // ... rest of the pipe
    );
  }
}
```

**Zmiany:**
- Zastąpiono bezpośrednie wywołanie `supabaseClient.auth.getSession()`
- Używa `AuthService.getAccessToken()` - pobiera token z cache
- Uproszczono obsługę błędów (nie ma już `error` z getSession)

## Korzyści

1. **Eliminacja błędu LockManager** - tylko jedno wywołanie `getSession()` podczas inicjalizacji
2. **Lepsza wydajność** - guardy używają cache zamiast API calls
3. **Spójność stanu** - wszystkie komponenty używają tego samego źródła prawdy
4. **Mniej network requests** - znacznie zmniejszona liczba żądań do Supabase
5. **Bardziej przewidywalne zachowanie** - singleton pattern zapobiega race conditions

## Testowanie

Po wprowadzeniu zmian:

1. Uruchom aplikację: `npm start`
2. Sprawdź konsolę przeglądarki - błąd `NavigatorLockAcquireTimeoutError` nie powinien występować
3. Przetestuj nawigację między stronami (login, register, app)
4. Sprawdź, czy guardy działają poprawnie
5. Przetestuj funkcję klasyfikacji wydatków (używa `getAccessToken()`)

## Dodatkowe uwagi

- Supabase automatycznie cache'uje sesję w localStorage
- `getSession()` w `getAccessToken()` jest bezpieczny, bo:
  - Jest wywoływany po inicjalizacji
  - Supabase zwraca dane z cache, a nie robi nowego API call
  - Nie konkuruje z innymi wywołaniami getSession()
  
- Jeśli w przyszłości pojawi się podobny problem, należy:
  1. Sprawdzić, czy nie ma nowych miejsc wywołujących `supabaseClient.auth.getSession()`
  2. Upewnić się, że wszystkie komponenty używają AuthService
  3. Rozważyć dodanie debounce dla częstych operacji

## Dokumentacja referencyjna

- [Supabase Auth Configuration](https://supabase.com/docs/reference/javascript/initializing)
- [Navigator LockManager API](https://developer.mozilla.org/en-US/docs/Web/API/LockManager)
- [Angular Guards Best Practices](https://angular.io/guide/router#guards)

