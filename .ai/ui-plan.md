# Architektura UI dla MoneyFlowTracker

## 1. Przegląd struktury UI

- Główna struktura dzieli aplikację na dwa układy: `AuthLayout` dla tras publicznych (`/login`, `/register`) oraz `MainShell` dla zabezpieczonych widoków (`/app/*`) z nawigacją boczną, paskiem górnym i obszarem treści.
- Widoki po zalogowaniu koncentrują się na czterech filarach: szybki wgląd (Dashboard), zarządzanie danymi (Lista wydatków), konfiguracja (Kategorie), wspierane modalami dla działań kontekstowych.
- Interakcje CRUD korzystają z usług Angular `HttpClient` powiązanych z endpointami REST `/api/v1/*`, z globalnym interceptorem dodającym nagłówek `Authorization` i mapującym błędy na snackbary.
- Wykresy (`ngx-charts`) na Dashboardzie posiadają tabelaryczne fallbacki dostępne bez JavaScriptu oraz komunikaty ARIA, a dane analityczne pobierane są z `/api/v1/analitycs/expenses` z tym samym zakresem dat co lista wydatków.
- Punkty wymagajace dużego wysiłku po stornie użytkownika takie jak (czasochłonne wprowadzanie danych, błędy klasyfikacji, brak przejrzystości) adresowane są przez modal szybkiego dodawania, statusy klasyfikacji, przejrzyste badge w tabeli i natychmiastowe informacje zwrotne o błędach.

## 2. Lista widoków

### Widok: AuthLayout – Logowanie
- **Ścieżka widoku:** `/login`
- **Główny cel:** Umożliwia użytkownikom zalogowanie się (US-002) i przekierowanie do Dashboardu po sukcesie.
- **Kluczowe informacje do wyświetlenia:** Pola `email`, `hasło`, komunikaty błędów (niepoprawne dane, brak połączenia), link do rejestracji, informacja o wymogach hasła.
- **Kluczowe komponenty widoku:** Formularz Angular Reactive Forms, `MatFormField` z `MatInput`, przycisk `Zaloguj się`, loader przy wysyłce, globalny komunikat błędu (snackbar) z interceptora.
- **UX, dostępność i względy bezpieczeństwa:** Automatyczny focus na pierwszym polu, komunikaty o błędach powiązane `aria-describedby`, blokada przycisku przy walidacji, maskowanie hasła, przekierowanie guardem jeśli użytkownik już zalogowany.

### Widok: AuthLayout – Rejestracja
- **Ścieżka widoku:** `/register`
- **Główny cel:** Rejestracja nowych kont (US-001) i automatyczne logowanie lub przekierowanie do logowania po sukcesie.
- **Kluczowe informacje do wyświetlenia:** Pola `email`, `hasło`, `potwierdzenie hasła`, lista wymagań co do złożoności, komunikaty o błędach walidacyjnych i serwerowych.
- **Kluczowe komponenty widoku:** Reactive Forms z walidatorami, przycisk `Utwórz konto`, link do logowania, snackbar z potwierdzeniem.
- **UX, dostępność i względy bezpieczeństwa:** Weryfikacja emaila i haseł po stronie klienta, informowanie o błędach inline, minimalizacja pól, obsługa klawisza Enter, bezpieczne przesyłanie danych do Supabase.

### Widok: MainLayout (Layout uwierzytelniony)
- **Ścieżka widoku:** `/app/*`
- **Główny cel:** Zapewnia wspólny układ dla wszystkich tras zabezpieczonych, umożliwia dostęp do nawigacji, przełącznika motywu i akcji globalnych (US-011).
- **Kluczowe informacje do wyświetlenia:** Nazwa/logotyp aplikacji, aktywna trasa, skróty do kluczowych działań (przycisk „Dodaj wydatek”), status połączenia (opcjonalnie), menu użytkownika.
- **Kluczowe komponenty widoku:** SideNav z listą tras (Dashboard, Wydatki, Kategorie, Logi), TopBar z przyciskiem dodawania, ikoną profilu, przełącznikiem dark-mode (CSS variables), komponent `RouterOutlet`.
- **UX, dostępność i względy bezpieczeństwa:** Role `navigation`, widoczny stan aktywnej trasy, log out w menu profilu, zabezpieczenie guardem SupabaseTokenGuard.

### Widok: Dashboard
- **Ścieżka widoku:** `/app/dashboard`
- **Główny cel:** Szybki przegląd bieżącej sytuacji finansowej (saldo dzienne, top kategorie, ostatnie wydatki) zgodnie z decyzjami sesji.
- **Kluczowe informacje do wyświetlenia:** Karta „Saldo dzienne” (różnica wpływy/wydatki, jeśli dostępne), wykres kołowy Top 5 kategorii, wykres słupkowy wydatków wg kategorii lub okresu, tabela fallback z kolumnami ID, nazwa, kwota, data, kategoria, lista 5 ostatnich wydatków z akcjami.
- **Kluczowe komponenty widoku:** Karty Angular Material, `ngx-charts` (pie + bar) z opisami ARIA, tabela fallback (`MatTable`), `MatList` ostatnich wydatków, przyciski CTA („Dodaj wydatek”, „Zobacz wszystkie”).
- **UX, dostępność i względy bezpieczeństwa:** Synchronizacja zakresów dat z listą wydatków (domyślnie bieżący miesiąc), opisy alternatywne dla wykresów, informacja o stanie ładowania, komunikat przy braku danych, dane pobierane z `/api/v1/analytics/expenses` i `/api/v1/expenses` (ostatnie pozycje).

### Widok: Lista wydatków
- **Ścieżka widoku:** `/app/expenses`
- **Główny cel:** Zarządzanie wydatkami (US-003, US-004, US-005, US-006, US-007) z możliwością filtrowania, sortowania, paginacji i edycji kategorii.
- **Kluczowe informacje do wyświetlenia:** Tabela z kolumnami: ID, Nazwa, Kwota, Data, Kategoria (predykcja/wybrana), Status klasyfikacji (badge „Predykcja”/„Skorygowano”), Pewność, Akcje (Edytuj, Usuń, Reklasyfikuj). Filtry dat (Today/Week/Month/Year/Własny), filtr statusu, wyników paginacji.
- **Kluczowe komponenty widoku:** `MatTable` z sortowaniem, `MatPaginator` dostosowany do nagłówków `Link`, komponent `DateQuickFilter` + `MatDateRangePicker`, `MatChips` dla aktywnych filtrów, snackbar statusu klasyfikacji („Klasyfikuję…”), menu akcji wiersza, checkboxy wielokrotnego wyboru (opcjonalnie przyszłościowo).
- **UX, dostępność i względy bezpieczeństwa:** etykiety `aria-sort`, komunikaty pustych stanów, potwierdzenie przed usunięciem (`MatDialog`), obsługa błędów 422/500 (toast + utrzymanie filtrów), natychmiastowe odświeżenie po operacjach CRUD (ponowne wywołanie `/api/v1/expenses`).

### Widok modalny: Dodaj wydatek
- **Ścieżka widoku:** Modal wywoływany z przycisku (`/app/expenses#new` lub state routera).
- **Główny cel:** Szybkie dodanie wydatku z walidacją i automatyczną klasyfikacją (US-003, US-005).
- **Kluczowe informacje do wyświetlenia:** Pola `nazwa`, `kwota`, `data` (domyślnie dziś), opcjonalna kategoria (autocomplete), informacja o statusie klasyfikacji, przełącznik „Zapisz i dodaj kolejny”.
- **Kluczowe komponenty widoku:** `MatDialog`, formularz reactive, `MatAutocomplete` dla kategorii (zapytania do `/api/v1/categories?active=true`), dwa przyciski akcji, snackbar „Klasyfikuję…”, wskaźnik postępu.
- **UX, dostępność i względy bezpieczeństwa:** walidacja kwoty (`amount > 0`), blokada daty przyszłej, komunikaty błędów inline, reset formularza przy „Zapisz i dodaj kolejny”, przechwytywanie błędów 400/422.

### Widok modalny: Edycja kategorii wydatku
- **Ścieżka widoku:** Modal z tabeli (`/app/expenses/:id/category`).
- **Główny cel:** Ręczna korekta kategorii pojedynczego wydatku (US-006) i wymuszenie reclasyfikacji.
- **Kluczowe informacje do wyświetlenia:** Aktualna kategoria, proponowana kategoria (predykcja + confidence), lista dostępnych kategorii z autouzupełnianiem, możliwość dodania nowej kategorii w locie.
- **Kluczowe komponenty widoku:** `MatDialog`, `MatAutocomplete`, sekcja z informacją o pewności, przycisk „Dodaj kategorię” (otwiera modal tworzenia kategorii), przyciski `Zapisz`, `Anuluj`.
- **UX, dostępność i względy bezpieczeństwa:** Wyraźna informacja o statusie po zapisie, automatyczne zamknięcie z odświeżeniem tabeli, prezentacja błędów duplikatu (409) i braku węzła (404).

### Widok: Ustawienia – Kategorie
- **Ścieżka widoku:** `/app/settings/categories`
- **Główny cel:** Zarządzanie słownikiem kategorii (US-006) i zapewnienie spójności z automatyczną klasyfikacją.
- **Kluczowe informacje do wyświetlenia:** Lista kategorii z hierarchią (parent_id), status aktywności, liczba powiązanych wydatków (opcjonalna kolumna informacyjna), formularz dodawania/edycji, ostrzeżenia przy dezaktywacji.
- **Kluczowe komponenty widoku:** `MatTree` lub paginowana lista z grupowaniem, formularz kategorii (nazwa, rodzic), przełącznik `Aktywna`, dialog potwierdzenia dezaktywacji, info-badges o użyciu.
- **UX, dostępność i względy bezpieczeństwa:** Walidacja unikalności nazwy (pre-check przed POST), ostrzeżenia przy usuwaniu wykorzystywanej kategorii, informacja o błędach 409/400, tooltipy z opisami.

### Widok: Logi operacji
- **Ścieżka widoku:** `/app/logs`
- **Główny cel:** Wgląd w historię operacji użytkownika (US-010) w celach audytu.
- **Kluczowe informacje do wyświetlenia:** Tabela logów z kolumnami: Data/Czas, Akcja (dodanie, edycja, klasyfikacja), Identyfikator wydatku, Zmiany (diff), wynik, filtr akcji i zakresu dat.
- **Kluczowe komponenty widoku:** `MatTable` z paginacją i sortowaniem, filtr akcji (`MatSelect`), filtr dat (DateRange), przycisk „Pokaż szczegóły” otwierający side-sheet z pełnym payloadem.
- **UX, dostępność i względy bezpieczeństwa:** Czytelne znaczniki (badges), obsługa błędów 401/403 (redirect), informacja o braku logów.

### Widok: Strona błędu / brak uprawnień
- **Ścieżka widoku:** `/error`, `/unauthorized` (fallback).
- **Główny cel:** Informowanie o błędach globalnych, w tym braku autoryzacji lub niedostępności API.
- **Kluczowe informacje do wyświetlenia:** Komunikat przyjazny użytkownikowi, instrukcja ponownego zalogowania, linki do wsparcia.
- **Kluczowe komponenty widoku:** Statyczny layout z ikoną, przycisk `Spróbuj ponownie`, link do logowania.
- **UX, dostępność i względy bezpieczeństwa:** Wyraźna hierarchia nagłówków, brak wycieku szczegółów technicznych.

## 3. Mapa podróży użytkownika

1. **Onboarding nowego użytkownika (US-001 → US-002):** Wejście na `/register`, wypełnienie formularza, sukces → przekierowanie do `/login`, logowanie → guard przenosi do `/app/dashboard`.
2. **Monitorowanie i szybkie działania (US-003, US-008, US-009):** Dashboard prezentuje karty i wykresy; użytkownik z przycisku „Dodaj wydatek” otwiera modal, zapisuje pozycję → snackbar „Klasyfikuję…”, modal zamyka się → Dashboard i lista wydatków odświeżają się po potwierdzeniu z `/api/v1/expenses`.
3. **Analiza szczegółowa (US-007):** Użytkownik przechodzi do `/app/expenses`, ustawia filtr dat (przyciski lub zakres własny), tabela aktualizuje dane. Może zmienić sortowanie, paginację (`Link` headers) i zobaczyć statusy klasyfikacji.
4. **Korekta kategorii (US-006):** Z wiersza wydatku wybiera `Edytuj kategorię`, modal z autocomplete umożliwia wybór/utworzenie nowej kategorii → PATCH `/api/v1/expenses/{id}` oraz opcjonalne POST `/api/v1/categories` → tabela aktualizuje wiersz, badge zmienia się na „Skorygowano”.
5. **Zarządzanie słownikiem (US-006):** Przez nawigację boczną wchodzi do `/app/settings/categories`, dodaje/edytuje rekordy, dezaktywuje nieużywane → potwierdzenia i walidacje inline, dane zsynchronizowane z modalami.
6. **Audyt działań (US-010):** W `/app/logs` filtruje logi po dacie/akcji, otwiera szczegóły diffów. W razie błędów API otrzymuje komunikat i instrukcję ponownej próby.
7. **Wylogowanie i odzyskanie sesji (US-011):** Z menu profilu wybiera `Wyloguj`, trasy zabezpieczone przekierowują do `/login`; przy braku ważnego tokena guard blokuje dostęp i kieruje do logowania.

## 4. Układ i struktura nawigacji

- **Nawigacja główna:** Stały panel boczny (desktop) z pozycjami: Dashboard, Wydatki, Kategorie, Logi.
- **Pasek górny:** Zawiera przycisk „Dodaj wydatek”, przełącznik motywu, ikonę/snackbar statusu klasyfikacji, menu użytkownika z akcjami (profil, wyloguj).
- **Breadcrumbs/Title:** W TopBarze dynamiczny tytuł trasy oraz opcjonalne breadcrumbs dla ustawień/logów.
- **Stany aktywne:** Podświetlenie aktualnej pozycji w side nav. Dostęp do logowania/rejestracji poprzez linki w AuthLayout.
- **Routing i zabezpieczenia:** Guard `AuthGuard` kontroluje `/app/*`, `GuestGuard` blokuje dostęp do `/login` / `/register` dla zalogowanych. Błędy 401 → intercept → redirect.

## 5. Kluczowe komponenty

- **SupabaseTokenGuard:** Sprawdza ważność tokena przed renderowaniem tras zabezpieczonych, obsługuje wygasłe sesje (US-011).
- **HttpErrorInterceptor:** Dodaje nagłówek `Authorization`, mapuje kody błędów na snackbary (400/409/422), prezentuje przyjazne komunikaty.
- **SnackbarService:** Standaryzuje powiadomienia („Klasyfikuję…”, sukcesy, błędy), zapewnia dostęp do informacji dla czytników ekranu (`aria-live`).
- **DateQuickFilter + DateRangePicker:** Ujednolicone filtry zakresów dat używane w Dashboardzie i Liście wydatków, synchronizują parametry zapytań API.
- **ExpensesTable:** Tabela z obsługą sortowania, statusów klasyfikacji (badges), akcji wiersza, paginacją opartą o nagłówki `Link`.
- **AddExpenseDialog:** Reużywalny modal formularza wydatku używany z Dashboardu i Listy wydatków, obsługuje dwa tryby zapisu.
- **CategoryAutocomplete:** Komponent zasilany danymi `/api/v1/categories`, umożliwia szybkie wyszukiwanie i tworzenie nowych pozycji, z walidacją duplikatów.
- **ThemeToggle:** Przełącznik trybu jasny/ciemny bazujący na zmiennych CSS, zapamiętuje preferencje w `localStorage` (zgodnie z przyszłymi decyzjami).
- **AnalyticsChartPanel:** Wrapper dla wykresów `ngx-charts` wraz z tabelą fallback i komunikatami ARIA.

Mapowanie historyjek użytkownika i wymagań na opisane widoki i komponenty zapewnia pokrycie funkcjonalne MVP, a uwzględnione wzorce UX i mechanizmy obsługi błędów zmniejszają ryzyko frustracji użytkownika oraz spełniają założenia dostępności i bezpieczeństwa.

