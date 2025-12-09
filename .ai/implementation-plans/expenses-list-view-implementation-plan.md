# Plan implementacji widoku Lista wydatków

## 1. Przegląd
Widok `Lista wydatków` prezentuje i umożliwia zarządzanie wydatkami użytkownika. Obejmuje filtrowanie po zakresie dat i statusie klasyfikacji, sortowanie, paginację, akcje CRUD oraz ręczną korektę kategorii. Integruje się z automatyczną klasyfikacją AI i zapewnia spójne komunikaty o stanie operacji.

## 2. Routing widoku
Widok jest dostępny pod trasą chronioną `'/app/expenses'` w ramach `MainShell`. Trasa wymaga `AuthGuard` weryfikującego token Supabase.

## 3. Struktura komponentów
- `ExpensesPageComponent`
  - `ExpensesToolbarComponent`
    - `DateQuickFilterComponent`
    - `MatDateRangeInput`
    - `ClassificationStatusChips`
    - `CategoryAutocompleteComponent`
  - `ExpensesTableComponent`
    - `ClassificationBadgeComponent`
    - `ExpenseRowActionsComponent`
  - `PaginationControlsComponent`
  - Portale dialogów: `AddExpenseDialogComponent`, `EditExpenseCategoryDialogComponent`, `ConfirmDialogComponent`

## 4. Szczegóły komponentów
### ExpensesPageComponent
- Opis komponentu: Container odpowiedzialny za orkiestrację widoku, pobieranie danych, spójność filtrów i komunikację z serwisem `ExpensesFacadeService`.
- Główne elementy: wrapper układu, toolbar, tabela, paginacja, hosty `mat-dialog-host`.
- Obsługiwane interakcje: inicjalizacja danych, reakcja na zmiany filtrów (Observable), obsługa dialogów dodawania/edycji/usuwania/reklasyfikacji, odświeżanie listy.
- Obsługiwana walidacja: weryfikacja, że `date_from ≤ date_to`, `per_page` w dozwolonym zakresie; blokada akcji podczas `loading`.
- Typy: `ExpensesFilterState`, `ExpensesListViewModel`, `PaginationState`, `ExpenseDialogResult`.
- Propsy: brak (komponent najwyższego poziomu, korzysta z injectowanych serwisów).

### ExpensesToolbarComponent
- Opis komponentu: Panel kontrolny do filtrów dat, statusu klasyfikacji, kategorii oraz wywołania modali.
- Główne elementy: `mat-button-toggle-group` z presetami dat, `mat-date-range-input` + `mat-date-range-picker`, `mat-chip-listbox` dla statusów, pole `mat-autocomplete` dla kategorii, przycisk „Dodaj wydatek”.
- Obsługiwane interakcje: zmiana presetów dat, wybór własnego zakresu, reset filtrów, wybór statusu, wybór kategorii, kliknięcie „Dodaj”.
- Obsługiwana walidacja: `dateRangeForm` sprawdza kompletność i kolejność dat, `categoryControl` waliduje UUID (opcjonalnie), status ograniczony do wartości z `classification_status` enum.
- Typy: `DatePresetOption`, `ExpensesFilterFormValue`, `CategoryOptionViewModel`.
- Propsy: `value: ExpensesFilterState`, `loading: boolean`, `categories: CategoryOptionViewModel[]`, zdarzenia `filterChange`, `addExpenseClick`, `categorySearch`.

### DateQuickFilterComponent
- Opis komponentu: Predefiniowane zakresy dat (dziś, tydzień, miesiąc, rok).
- Główne elementy: `mat-button-toggle-group`.
- Obsługiwane interakcje: wybór presetów, emitowanie `presetChange`.
- Obsługiwana walidacja: brak dodatkowej (wartości stałe).
- Typy: `DatePresetOption`.
- Propsy: `selectedPreset`, `disabled`, `presets`, zdarzenie `presetChange`.

### ClassificationStatusChips
- Opis komponentu: Lista wyboru statusów klasyfikacji (all/pending/predicted/corrected/failed).
- Główne elementy: `mat-chip-listbox` z `mat-chip-option`.
- Obsługiwane interakcje: kliknięcie chipu, reset.
- Obsługiwana walidacja: wartość ze zbioru `ClassificationStatus` lub `undefined`.
- Typy: `ClassificationStatus` (z `Enums`), `StatusFilterOption` (nowy).
- Propsy: `selectedStatus`, `options`, `disabled`, zdarzenie `statusChange`.

### CategoryAutocompleteComponent
- Opis komponentu: Autouzupełnianie kategorii aktywnych.
- Główne elementy: `mat-form-field` z `input` + `mat-autocomplete`, lista `mat-option` z etykietami i informacją o aktywności.
- Obsługiwane interakcje: wpisywanie tekstu (debounced emit `queryChange`), wybór opcji, czyszczenie.
- Obsługiwana walidacja: wybrana opcja musi zawierać `id` (UUID) lub `null`.
- Typy: `CategoryOptionViewModel`.
- Propsy: `options`, `loading`, `value`, `disabled`, zdarzenia `valueChange`, `queryChange`.

### ExpensesTableComponent
- Opis komponentu: Prezentuje listę wydatków w tabeli z sortowaniem, statusami i akcjami.
- Główne elementy: `mat-table`, kolumny: `name`, `amount`, `expense_date`, `category`, `classification_status` (z `ClassificationBadge`), `confidence`, `actions`.
- Obsługiwane interakcje: zmiana sortowania (`matSort`), kliknięcia w akcje wiersza (edit/delete/reclassify), zaznaczenie wiersza (opcjonalnie do przyszłej selekcji).
- Obsługiwana walidacja: brak formularzy; waliduje poprawność danych (np. fallback tekstu przy braku kategorii).
- Typy: `ExpensesListViewModel[]`, `ExpenseTableColumn`, `SortState`.
- Propsy: `data`, `loading`, `sort`, `displayedColumns`, `emptyState`, zdarzenia `sortChange`, `editExpense`, `editCategory`, `deleteExpense`, `reclassifyExpense`.

### ExpenseRowActionsComponent
- Opis komponentu: Menu działań w wierszu.
- Główne elementy: `mat-menu` z przyciskami „Edytuj”, „Zmień kategorię”, „Reklasyfikuj”, „Usuń”.
- Obsługiwane interakcje: kliknięcia poszczególnych opcji, popover.
- Obsługiwana walidacja: dostępność akcji (np. `Reklasyfikuj` tylko gdy status != `pending`).
- Typy: `ExpenseActionType` (union), `ExpenseRowContext`.
- Propsy: `expense: ExpensesListViewModel`, `disabled`, zdarzenia `actionSelect`.

### ClassificationBadgeComponent
- Opis komponentu: Wizualizuje status klasyfikacji z kolorem i etykietą.
- Główne elementy: `mat-chip` lub `shadcn` badge.
- Obsługiwane interakcje: tooltip z `reasoning` (gdy dostępne), fallback w przypadku `failed`.
- Obsługiwana walidacja: status w dopuszczalnym zbiorze.
- Typy: `ClassificationBadgeConfig`.
- Propsy: `status`, `confidence`, `pending`, `reasoning`.

### PaginationControlsComponent
- Opis komponentu: Obsługuje paginację bazującą na nagłówkach `Link`.
- Główne elementy: `mat-paginator` (custom adapter) lub własne przyciski „Poprzednia/Następna” z informacją o stronie.
- Obsługiwane interakcje: zmiana strony, zmiana `perPage`.
- Obsługiwana walidacja: `perPage` ∈ `[10, 25, 50, 100]`, tylko dostępne linki aktywne.
- Typy: `PaginationState`, `PaginationLink`.
- Propsy: `state`, `disabled`, zdarzenia `pageChange`, `perPageChange`.

### AddExpenseDialogComponent
- Opis komponentu: Modal do tworzenia wydatku.
- Główne elementy: `mat-dialog`, `ReactiveForm` z polami nazwa, kwota, data, kategoria, przełącznik „Zapisz i dodaj kolejny”, akcje `mat-button`.
- Obsługiwane interakcje: submit, cancel, toggle `saveAndAdd`, autouzupełnianie kategorii (używa `CategoryAutocompleteComponent`).
- Obsługiwana walidacja: nazwa (min 1, max 100, trimmed), kwota (>0, max 9999999999.99), data (format, brak przyszłej), kategoria (UUID lub pusty). Walidacja reużywa `createExpenseSchema` na submit (via zod + `zod-form` lub manual).
- Typy: `CreateExpenseCommand`, `CreateExpenseFormValue`, `FormSubmitMode`.
- Propsy: `categories`, `loading`, `defaultDate`, `onSubmit`, `onCancel` (przez `MatDialogRef`).

### EditExpenseCategoryDialogComponent
- Opis komponentu: Modal do ręcznej korekty kategorii i zapisu statusu `corrected`.
- Główne elementy: `mat-dialog`, aktualne dane wydatku (read-only), pole wyboru kategorii, możliwość dodania nowej kategorii (link do modalu `CreateCategoryDialog`), przyciski zapisz/anuluj.
- Obsługiwane interakcje: wybór kategorii, zapis (PATCH), opcjonalnie otwarcie modalu tworzenia kategorii.
- Obsługiwana walidacja: wymaga `category_id` (istniejącego) lub nowej nazwy (walidacja duplikatów przy POST `/categories`).
- Typy: `UpdateExpenseCommand`, `EditCategoryFormValue`, `CategoryOptionViewModel`.
- Propsy: `expense: ExpensesListViewModel`, `categories`, `loading`, zdarzenia `save`, `addCategory`.

### ConfirmDialogComponent / ReclassifyConfirmDialogComponent
- Opis komponentu: Wspólny modal potwierdzający usunięcie lub rekalsyfikację.
- Główne elementy: `mat-dialog` z tytułem, treścią, przyciskami tak/nie.
- Obsługiwane interakcje: potwierdzenie/odrzucenie.
- Obsługiwana walidacja: brak.
- Typy: `ConfirmDialogData`.
- Propsy: przekazywane przez `MatDialogConfig.data`.

## 5. Typy
- Istniejące z `src/types.ts`: `ExpenseDto`, `ExpenseListQueryDto`, `CreateExpenseCommand`, `UpdateExpenseCommand`, `ClassifyExpenseCommand`, `CategoryDto`, `ClassificationStatus`.
- Nowe typy:
  - `ExpensesFilterState`: `{ preset?: DatePreset; date_from?: string; date_to?: string; status?: ClassificationStatus; category_id?: string | null; sort?: ExpenseSortParam; page: number; per_page: number; }`.
  - `ExpensesListViewModel`: rozszerza `ExpenseDto` o `{ categoryName: string; predictedCategoryName?: string; statusLabel: string; statusTone: 'info' | 'success' | 'warning' | 'error'; confidenceDisplay: string; }`.
  - `PaginationState`: `{ page: number; perPage: number; total?: number; links: PaginationLink[]; hasNext: boolean; hasPrev: boolean; }`.
  - `PaginationLink`: `{ rel: 'next' | 'prev' | 'first' | 'last'; page: number; perPage: number; href: string; }`.
  - `DatePresetOption`: `{ id: 'today' | 'week' | 'month' | 'year' | 'custom'; label: string; range?: { from: string; to: string; }; }`.
  - `ExpensesFilterFormValue`: `Pick<ExpensesFilterState, 'date_from' | 'date_to' | 'status' | 'category_id'> & { preset: DatePresetOption['id']; }`.
  - `CategoryOptionViewModel`: `{ id: string; label: string; isActive: boolean; }`.
  - `ClassificationBadgeConfig`: `{ status: ClassificationStatus | 'failed'; tone: string; label: string; icon?: string; }`.
  - `ExpenseActionType`: `'edit' | 'changeCategory' | 'reclassify' | 'delete'`.
  - `SortState`: `{ active: ExpenseSortableField; direction: 'asc' | 'desc'; }`.
  - `ExpenseDialogResult`: union dla komunikacji dialogów (`created`, `deleted`, `updated`, `reclassified`).

## 6. Zarządzanie stanem
- Utworzyć `ExpensesFacadeService` wykorzystujący `ComponentStore` lub `BehaviorSubject` do przechowywania `filters`, `expenses`, `pagination`, `loading`, `error`.
- `ExpensesPageComponent` subskrybuje Observables (`expenses$`, `filters$`, `pagination$`, `loading$`).
- Akcje: `setFilters`, `setSort`, `setPage`, `refresh`, `createExpense`, `updateExpense`, `deleteExpense`, `reclassifyExpense`.
- Dialogi komunikują wyniki do facady poprzez `Facade.handleDialogResult(result)`.
- Kategorie dla autocomplete dostarczane przez `CategoriesService` z buforem i mechanizmem cache + `switchMap` dla wyszukiwania.

## 7. Integracja API
- Lista: `GET /api/v1/expenses` z parametrami zgodnymi z `ExpenseListQueryDto`. Odpowiedź: `ExpenseDto[]` + nagłówki `Link`, `X-Total-Count` (jeżeli dostępne). Parsowanie linków do `PaginationState`.
- Tworzenie: `POST /api/v1/expenses` z `CreateExpenseCommand`. Po sukcesie zamknięcie dialogu, snackbar „Klasyfikuję…”, odświeżenie listy.
- Aktualizacja kategorii: `PATCH /api/v1/expenses/{id}` z `UpdateExpenseCommand` (pole `category_id` oraz `corrected_category_id` ustawiane po stronie API). Po sukcesie snackbar „Kategoria zaktualizowana”, odświeżenie.
- Reklasyfikacja: `POST /api/v1/expenses/{id}/classify` (bez body). Po sukcesie ustawienie statusu lokalnie na `pending`, trigger odświeżenia po zakończeniu (poll lub manual refresh).
- Usuwanie: `DELETE /api/v1/expenses/{id}`. Po sukcesie snackbar i `refresh`.
- Kategorie: `GET /api/v1/categories?active=true&search=` (rozszerzenie parametru do implementacji) oraz `POST /api/v1/categories` w dialogu dodawania nowej kategorii.
- Wywołania idą przez `HttpClient` z globalnym `AuthorizationInterceptor`.

## 8. Interakcje użytkownika
- Zmiana presetów dat → aktualizacja filtrów, automatyczne przeładowanie listy.
- Wybór własnego zakresu → walidacja, ustawienie `preset='custom'`, odświeżenie.
- Wybór statusu klasyfikacji → filtrowanie po `classification_status`.
- Autouzupełnianie kategorii → zapytania co 300 ms, wybór aktualizuje filtr.
- Kliknięcie „Dodaj wydatek” → otwarcie dialogu, po zapisie odświeżenie tabeli i komunikat.
- Sortowanie kolumn → budowanie parametru `sort` (`field`/`field:desc`).
- Paginacja → aktualizacja `page` i `per_page`, request do API.
- Akcje wiersza: edycja szczegółów (opcjonalny modal), zmiana kategorii (dialog), reklasyfikacja (potwierdzenie), usunięcie (potwierdzenie).

## 9. Warunki i walidacja
- Formularze: nazwa (1-100 znaków, trim), kwota (>0, max 9999999999.99), data w formacie ISO i nie w przyszłości (porównanie z `today`), kategoria – UUID.
- Filtry: `date_from` i `date_to` opcjonalne, ale jeśli podane oba -> `date_from ≤ date_to`. Przy braku ustaw domyślnie bieżący miesiąc.
- Status: tylko wartości z `classification_status` (`pending`, `predicted`, `corrected`, `failed`).
- Paginacja: `per_page` w `[10,25,50,100]`, `page ≥ 1`.
- Komponenty blokują akcje jeśli `loading`.

## 10. Obsługa błędów
- 400/422 walidacji (POST/PATCH) → wyświetlić błędy formularza w dialogu wraz z mapowaniem wiadomości (np. `VALIDATION_ERROR`).
- 401/403 → interceptor przekierowuje do `/login` i pokazuje snackbar „Sesja wygasła”.
- 404 (np. podczas edycji usuniętego wydatku) → snackbar „Wpis nie istnieje”, zamknięcie dialogu i odświeżenie listy.
- 409 (duplikat kategorii) → komunikat w dialogu dodawania kategorii.
- 422 `CLASSIFICATION_FAILED` → ustaw badge „Klasyfikacja nie powiodła się”, zaproponować ręczną korektę.
- Błędy sieci / 500 → snackbar „Operacja nie powiodła się”, pozostawienie poprzedniego stanu i możliwość ponowienia.
- Rate limit 429 → snackbar z informacją o limicie i opóźnienie kolejnych requestów (disable przyciski na kilka sekund).

## 11. Kroki implementacji
1. Skonfiguruj trasę Angular `app/expenses` w module zabezpieczonym i podłącz do `MainShell`.
2. Utwórz `ExpensesFacadeService` z zarządzaniem stanem filtrów, listy i paginacji (ComponentStore/BehaviorSubjects) oraz integracją z API.
3. Zaimplementuj modele i interfejsy typów (`ExpensesFilterState`, `ExpensesListViewModel`, `PaginationState`, itd.).
4. Stwórz `ExpensesPageComponent`, wstrzyknij facade, zbuduj szablon z toolbar, tabelą i paginacją.
5. Zaimplementuj `ExpensesToolbarComponent` wraz z formularzem filtrów, presetami dat, statusami i autouzupełnianiem kategorii.
6. Przygotuj `CategoryAutocompleteComponent` z obsługą wyszukiwania i serwisu kategorii (debounce + cache).
7. Zbuduj `ExpensesTableComponent` z kolumnami, sortowaniem i podkomponentami `ClassificationBadge` oraz `ExpenseRowActions`.
8. Dodaj `PaginationControlsComponent` z parserem nagłówka `Link` i opcjami `perPage`.
9. Utwórz dialogi: `AddExpenseDialogComponent` (reactive form + walidacje), `EditExpenseCategoryDialogComponent`, `ConfirmDialogComponent`.
10. Podłącz akcje dialogów do facady (POST/PATCH/DELETE/POST classify) i zapewnij komunikaty snackbar poprzez `SnackbarService`.
11. Dodaj obsługę błędów w serwisie (mapowanie statusów HTTP) oraz testy jednostkowe komponentów/serwisów.
12. Zweryfikuj dostępność (ARIA dla tabeli, przycisków) oraz responsywność, a następnie ręcznie przetestuj scenariusze z historyjek US-003–US-007.

