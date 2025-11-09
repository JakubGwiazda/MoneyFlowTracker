# API Endpoint Implementation Plan: POST /api/v1/expenses

## 1. Przegląd punktu końcowego
- Cel: umożliwić zalogowanemu użytkownikowi utworzenie rekordu wydatku i zainicjować jego klasyfikację AI.
- Środowisko: Angular 20 + Supabase (PostgreSQL) + integracja z OpenRouter.ai dla klasyfikacji.
- Rezultat: nowy wpis w tabeli `expenses` powiązany z `logs` oraz rozpoczęta asynchroniczna klasyfikacja.

## 2. Szczegóły żądania
- Metoda HTTP: `POST`
- Struktura URL: `/api/v1/expenses`
- Nagłówki: `Authorization: Bearer <JWT>` (wymagane), `Content-Type: application/json`.
- Parametry:
  - Wymagane: brak parametrów ścieżki/query; autoryzacja przez JWT.
  - Opcjonalne: brak parametrów ścieżki/query.
- Request Body (`CreateExpenseCommand`):
  - `name` (string, trim > 0, 100? znaków – potwierdzić wymagania UI).
  - `amount` (number, `> 0`, max `numeric(12,2)`).
  - `expense_date` (string w formacie ISO `YYYY-MM-DD`).
  - `category_id` (string UUID, opcjonalny – gdy brak, klasyfikacja AI decyduje).
- Typy wspierające wejście:
  - `CreateExpenseCommand` (`src/types.ts`).
  - `TablesInsert<"expenses">` (`src/db/database.types.ts`).

## 3. Szczegóły odpowiedzi
- Status 201 (`Created`) przy sukcesie.
- Nagłówki: `Content-Type: application/json`.
- Body (`ExpenseDto`): pola `id`, `user_id`, `name`, `amount`, `expense_date`, `category_id`, `predicted_category_id`, `prediction_confidence`, `classification_status`, `corrected_category_id`, `created_at`, `updated_at`.
- Statusy błędów:
  - 400: niepoprawne dane wejściowe.
  - 401: brak/niepoprawny JWT.
  - 403: odwołanie do zasobu, do którego użytkownik nie ma dostępu (np. nieaktywna/obca kategoria).
  - 404: wskazana kategoria nie istnieje.
  - 500: błędy serwera/Supabase/AI dispatch.

## 4. Przepływ danych
1. Klient przesyła `POST` z danymi wydatku i JWT.
2. Astro API route (`src/pages/api/v1/expenses/index.ts`) uzyskuje `supabase` i `user` z `context.locals` (middleware).
3. Zod schema waliduje body, mapowana do `CreateExpenseCommand`.
4. Route deleguje do serwisu `createExpense` w `src/lib/services/expenses.service.ts`.
5. Serwis:
   - Ustala `user_id` z kontekstu, ignoruje ewentualne nadpisania w payloadzie.
   - Opcjonalnie waliduje `category_id` (istnienie, `is_active=true`).
   - Wstawia rekord do `expenses` z `classification_status='pending'` i inicjalnymi wartościami predykcji `null`.
   - Tworzy wpis w `logs` (`log_action='insert'`, payload z informacjami).
6. Serwis inicjuje asynchroniczne zadanie klasyfikacji (np. `classificationService.classifyExpense(expense.id)`):
   - Wysyła request do OpenRouter.ai.
   - Aktualizuje rekord `expenses` z wynikami (`predicted_category_id`, `prediction_confidence`, `classification_status='predicted'`).
   - W przypadku błędu aktualizuje `classification_status='failed'` oraz zapisuje wpis w `logs` (action `classify`).
7. Route zwraca dane w formie `ExpenseDto` (może pochodzić z `insert().select().single()`).

## 5. Względy bezpieczeństwa
- Autoryzacja: weryfikacja JWT w middleware; endpoint zakłada obecność `context.locals.user`.
- Autoryzacja zasobów: przypisanie `user_id` z tokena (ignorować body), walidacja kategorii ograniczona do aktywnych rekordów; opcjonalnie upewnić się, że kategorie są globalne lub user-specific (ustalić wymagania – w razie potrzeby filtrować po `user_id`).
- Walidacja danych: Zod (guard clauses) + dodatkowe sprawdzenia po stronie serwisu (np. limit kwoty, data w przyszłości?).
- Rate limiting: wykorzystać istniejące middleware (60 req/min) – endpoint musi być kompatybilny.
- Sekrety: klucz OpenRouter przechowywany w `import.meta.env` i przekazywany tylko do serwisu klasyfikacji.
- Bezpieczeństwo AI: sanitizacja danych wysyłanych do modelu, ustawienie limitów czasu i obsługa błędów.

## 6. Obsługa błędów
- Walidacja wejścia (Zod) → `return new Response(JSON.stringify({ code: "VALIDATION_ERROR", ... }), { status: 400 })`.
- Brak użytkownika w kontekście → 401.
- Niezgodności kategorii (nie istnieje, nieaktywna, nieautoryzowana) → 404 lub 403 (zgodnie ze specyfikacją `FORBIDDEN` dla cudzych zasobów).
- Błędy Supabase (insert/log) → logowanie stack trace, odpowiedź 500 z kodem `SERVER_ERROR`.
- Błąd uruchomienia klasyfikacji:
  - Jeżeli wystąpi przed wysłaniem odpowiedzi i jest krytyczny → 500.
  - Preferowany scenariusz: klasyfikacja działa w tle; w przypadku błędu aktualizuje rekord na `failed`, wpis w `logs`, brak modyfikacji odpowiedzi (201 wysłane wcześniej).
- Wszystkie błędy logować przy pomocy `console.error` lub dedykowanego loggera; rozważyć integrację z centralnym logowaniem jeśli dostępne.

## 7. Wydajność
- Użyć istniejącego indeksu `expenses_user_date_idx` – przy późniejszych listowaniach zapewnia szybkie kwerendy.
- Minimalizować liczbę połączeń Supabase: pojedynczy insert z `select()` zamiast dodatkowego zapytania.
- Klasyfikacja asynchroniczna, aby nie blokować odpowiedzi; wprowadzić kolejkę/worker jeżeli obciążenie wzrośnie.
- Dodać timeout dla requestu AI (np. 5s) i fallback na status `failed`.
- Monitorować logi błędów – ewentualnie wprowadzić retry/backoff dla AI przy 5xx.
-
## 8. Kroki implementacji
1. Utworzyć strukturę katalogów, jeśli brak: `src/pages/api/v1/expenses/index.ts`, `src/lib/services/expenses.service.ts`, `src/lib/services/classification.service.ts` (lub analogiczną).
2. Dodać Zod schema (`createExpenseSchema`) w pliku route lub dedykowanym module (`src/lib/validators/expenses.ts`).
3. Zaimplementować API route:
   - Sprawdzić metodę (`context.request.method === "POST"`).
   - Pobierać `locals` użytkownika i Supabase, obsłużyć brak (401/500).
   - Parsować body JSON, walidować Zod -> `CreateExpenseCommand`.
   - Wywołać `createExpense` serwisu i zwrócić 201 z `ExpenseDto`.
4. Zaimplementować `createExpense` w serwisie:
   - Przyjąć `command`, `userId`, `supabase` klienta.
   - Zweryfikować opcjonalne `category_id` (`select` w `categories` + `is_active=true`).
   - Wykonać insert do `expenses` (ustawić `classification_status='pending'`).
   - Zapisać wpis w `logs` (akcja `insert`).
   - Zwrócić świeżo utworzony rekord.
5. Dodać `classificationService`:
   - Funkcja `scheduleClassification(expense: ExpenseDto)` (fire-and-forget z `void classificationService.scheduleClassification(...)`).
   - Wysyła żądanie do OpenRouter, aktualizuje rekord (`update` na Supabase) i dokłada wpis do `logs` (akcja `classify`).
   - Obsługuje błędy (ustawia `classification_status='failed'`, loguje).
6. Zintegrować krok 5 w serwisie `createExpense` (bez oczekiwania na wynik, `catch` logujący błędy).
7. Wdrożyć spójny format odpowiedzi i błędów (np. helper `jsonResponse(data, status)`), zastosować w route.
8. Dopisać testy jednostkowe/integracyjne (jeśli infrastruktura pozwala) dla schematu walidacji i serwisu (można użyć Vitest + Supabase mock).
9. Zaktualizować dokumentację/README, jeśli wprowadzono nowe zależności (np. zmienne środowiskowe dla OpenRouter).

