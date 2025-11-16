# Plan Testów - MoneyFlowTracker

## Spis treści

1. [Wprowadzenie i cele testowania](#1-wprowadzenie-i-cele-testowania)
2. [Zakres testów](#2-zakres-testów)
3. [Typy testów do przeprowadzenia](#3-typy-testów-do-przeprowadzenia)
4. [Scenariusze testowe dla kluczowych funkcjonalności](#4-scenariusze-testowe-dla-kluczowych-funkcjonalności)
5. [Środowisko testowe](#5-środowisko-testowe)
6. [Narzędzia do testowania](#6-narzędzia-do-testowania)
7. [Harmonogram testów](#7-harmonogram-testów)
8. [Kryteria akceptacji testów](#8-kryteria-akceptacji-testów)
9. [Role i odpowiedzialności](#9-role-i-odpowiedzialności)
10. [Procedury raportowania błędów](#10-procedury-raportowania-błędów)

---

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu

Niniejszy dokument definiuje kompleksowy plan testów dla aplikacji MoneyFlowTracker - webowej aplikacji do śledzenia wydatków osobistych z wykorzystaniem AI do automatycznej klasyfikacji.

### 1.2 Cele testowania

- **Weryfikacja funkcjonalności**: Zapewnienie, że wszystkie funkcjonalności aplikacji działają zgodnie z wymaganiami
- **Bezpieczeństwo**: Weryfikacja mechanizmów autentykacji i autoryzacji (RLS policies)
- **Integracja z zewnętrznymi serwisami**: Poprawne działanie z Supabase i OpenRouter.ai
- **Wydajność**: Sprawdzenie responsywności interfejsu i czasu odpowiedzi API
- **Stabilność**: Wykrycie błędów krytycznych przed wdrożeniem na produkcję
- **UX/UI**: Weryfikacja intuicyjności interfejsu i poprawności wyświetlania danych

### 1.3 Kontekst projektu

MoneyFlowTracker to aplikacja MVP w wersji 0.0.1, wykorzystująca:
- **Frontend**: Angular 20, TypeScript 5, Angular Material, Ngx-Charts
- **Backend**: Supabase (autentykacja i baza danych PostgreSQL)
- **AI**: OpenRouter.ai do klasyfikacji wydatków
- **CI/CD**: GitHub Actions → DigitalOcean

---

## 2. Zakres testów

### 2.1 Funkcjonalności objęte testami

#### 2.1.1 Moduł Autentykacji
- Rejestracja nowego użytkownika
- Logowanie użytkownika
- Wylogowanie użytkownika
- Ochrona tras (guards)
- Obsługa błędów autentykacji
- Sesje użytkownika

#### 2.1.2 Moduł Wydatków
- Dodawanie wydatku (z i bez kategorii)
- Edycja wydatku
- Usuwanie wydatku
- Wyświetlanie listy wydatków
- Sortowanie i paginacja
- Filtrowanie po datach (predefiniowane i niestandardowe zakresy)
- Filtrowanie po kategoriach
- Walidacja pól formularza

#### 2.1.3 Moduł Kategorii
- Wyświetlanie kategorii
- Dodawanie nowej kategorii
- Edycja kategorii
- Dezaktywacja kategorii (soft delete)
- Struktura hierarchiczna kategorii (parent-child)

#### 2.1.4 Moduł Klasyfikacji AI
- Klasyfikacja pojedynczego wydatku
- Klasyfikacja wsadowa (batch)
- Obsługa propozycji nowej kategorii
- Obsługa błędów API (rate limiting, timeout)
- Weryfikacja poziomu pewności (confidence score)
- Manualna korekta klasyfikacji

#### 2.1.5 Moduł Wizualizacji
- Wykresy słupkowe wydatków po kategoriach
- Wykresy kołowe wydatków po kategoriach
- Filtrowanie danych na wykresach
- Przełączanie typów wykresów
- Responsywność wykresów

#### 2.1.6 Moduł Logowania Operacji
- Logowanie operacji INSERT
- Logowanie operacji UPDATE
- Logowanie operacji CLASSIFY
- Niemodyfikowalność logów

### 2.2 Funkcjonalności wyłączone z testów (MVP)

- Współdzielenie wydatków między użytkownikami
- Zaawansowane funkcje budżetowania
- Import wydatków z zewnętrznych źródeł (OCR, zdjęcia)
- System celów budżetowych
- Automatyczne sugestie budżetowe

---

## 3. Typy testów do przeprowadzenia

### 3.1 Testy jednostkowe (Unit Tests)

**Cel**: Weryfikacja poprawności działania pojedynczych jednostek kodu w izolacji

**Framework**: Jasmine + Karma

**Komponenty do testowania**:

#### 3.1.1 Serwisy (Services)

##### AuthService (`src/lib/services/auth.service.ts`)
- ✅ Inicjalizacja stanu autentykacji
- ✅ Metoda `signIn()` - poprawne logowanie
- ✅ Metoda `signIn()` - niepoprawne dane
- ✅ Metoda `signUp()` - rejestracja z potwierdzeniem email
- ✅ Metoda `signUp()` - użytkownik już istnieje
- ✅ Metoda `signOut()` - wylogowanie
- ✅ Obsługa błędów autentykacji
- ✅ Tłumaczenie komunikatów błędów

##### ClassificationService (`src/lib/services/classification.service.ts`)
- ✅ Klasyfikacja pojedynczego wydatku - sukces
- ✅ Klasyfikacja wsadowa - sukces
- ✅ Walidacja wejścia (opis pusty, zbyt długi)
- ✅ Rate limiting - blokada po przekroczeniu limitu
- ✅ Obsługa timeout
- ✅ Obsługa błędów HTTP (401, 429, 500)
- ✅ Parsowanie odpowiedzi modelu
- ✅ Wzbogacanie wyników o pełne dane kategorii
- ✅ Walidacja wyniku klasyfikacji

##### ExpensesService (`src/lib/services/expenses.service.ts`)
- ✅ Tworzenie wydatku - poprawne dane
- ✅ Walidacja category_id
- ✅ Walidacja kategorii nieaktywnej
- ✅ Tworzenie wpisu w logach
- ✅ Aktualizacja klasyfikacji wydatku
- ✅ Obsługa błędów bazy danych

##### CategoriesService
- ✅ Pobieranie listy kategorii
- ✅ Filtrowanie aktywnych kategorii
- ✅ Pobieranie struktury hierarchicznej
- ✅ Dodawanie nowej kategorii
- ✅ Walidacja unikalności nazwy

##### RateLimiterService (`src/lib/services/rate-limiter.service.ts`)
- ✅ Sprawdzanie dostępności żądania
- ✅ Rejestracja żądania
- ✅ Obliczanie czasu do następnego żądania
- ✅ Reset limitów po upływie okna czasowego

#### 3.1.2 Guards

##### authGuard (`src/lib/guards/auth.guard.ts`)
- ✅ Zezwolenie na dostęp z aktywną sesją
- ✅ Przekierowanie do /login bez sesji
- ✅ Obsługa błędów Supabase

##### guestGuard (`src/lib/guards/guest.guard.ts`)
- ✅ Przekierowanie do /app dla zalogowanego użytkownika
- ✅ Zezwolenie na dostęp dla niezalogowanego

#### 3.1.3 Komponenty UI

##### LoginComponent (`src/components/pages/login.component.ts`)
- ✅ Inicjalizacja formularza z walidacją
- ✅ Wywołanie AuthService.signIn() przy submit
- ✅ Wyświetlanie błędów walidacji
- ✅ Wyświetlanie komunikatu błędu z serwera
- ✅ Stan ładowania

##### ExpensesTableComponent (`src/components/app/expenses/ui/expenses-table.component.ts`)
- ✅ Renderowanie danych z inputu
- ✅ Sortowanie kolumn
- ✅ Emitowanie eventów akcji (edit, delete)
- ✅ Wyświetlanie badge dla kategorii
- ✅ Obsługa pustej listy

##### ExpensesChartsComponent (`src/components/app/expenses/ui/expenses-charts.component.ts`)
- ✅ Renderowanie wykresu słupkowego
- ✅ Renderowanie wykresu kołowego
- ✅ Przełączanie typów wykresów
- ✅ Filtrowanie danych
- ✅ Obsługa pustych danych

##### AddExpenseDialogComponent
- ✅ Walidacja formularza
- ✅ Wywołanie klasyfikacji AI
- ✅ Zapisywanie wydatku
- ✅ Zamykanie dialogu z wynikiem

##### BadgeComponent, ChipsComponent, PaginationControlsComponent
- ✅ Renderowanie z różnymi inputami
- ✅ Emitowanie eventów

#### 3.1.4 Walidatory

##### expenseValidators (`src/lib/validators/expenses.ts`)
- ✅ Walidacja kwoty (wartość dodatnia)
- ✅ Walidacja nazwy (niepusta, max długość)
- ✅ Walidacja daty (format, zakres)

### 3.2 Testy integracyjne (Integration Tests)

**Cel**: Weryfikacja poprawności współpracy między komponentami

**Framework**: Jasmine + Karma (z mockami HTTP)

#### 3.2.1 Scenariusze integracyjne

##### Przepływ dodawania wydatku z klasyfikacją
1. Użytkownik otwiera dialog dodawania wydatku
2. Wypełnia formularz (nazwa, kwota, data)
3. System automatycznie wywołuje klasyfikację AI
4. AI zwraca sugerowaną kategorię
5. Użytkownik akceptuje lub koryguje kategorię
6. System zapisuje wydatek do bazy
7. System tworzy wpis w logach
8. Lista wydatków jest odświeżana

##### Przepływ edycji i korekty kategorii
1. Użytkownik wybiera wydatek z listy
2. Otwiera dialog edycji
3. Zmienia kategorię (z autocomplete)
4. System zapisuje zmiany
5. `corrected_category_id` jest aktualizowane
6. System loguje operację UPDATE

##### Przepływ logowania użytkownika
1. Użytkownik wchodzi na /login
2. Wypełnia email i hasło
3. Klika "Zaloguj"
4. System weryfikuje dane przez Supabase
5. Użytkownik jest przekierowywany do /app
6. Guard authGuard zezwala na dostęp

##### Przepływ filtrowania i wizualizacji
1. Użytkownik wybiera zakres dat
2. System filtruje wydatki
3. Wykresy są aktualizowane z nowymi danymi
4. Użytkownik przełącza typ wykresu (słupkowy/kołowy)
5. Dane pozostają spójne

### 3.3 Testy E2E (End-to-End Tests)

**Cel**: Weryfikacja kompletnych ścieżek użytkownika w realnym środowisku przeglądarki

**Framework**: Playwright (rekomendacja dla Angular 20)

#### 3.3.1 Krytyczne ścieżki użytkownika

##### TC-E2E-001: Rejestracja i logowanie nowego użytkownika
**Kroki**:
1. Otwórz aplikację
2. Przejdź do /register
3. Zarejestruj nowe konto
4. Potwierdź email (mock lub test w środowisku dev)
5. Zaloguj się
6. Sprawdź przekierowanie do /app

**Oczekiwany rezultat**: Użytkownik jest zalogowany i widzi dashboard

##### TC-E2E-002: Dodanie pierwszego wydatku z klasyfikacją AI
**Kroki**:
1. Zaloguj się jako użytkownik testowy
2. Kliknij "Dodaj wydatek"
3. Wpisz: "Pizza w Dominium" (nazwa), 45.50 (kwota), dzisiejsza data
4. Poczekaj na klasyfikację AI
5. Zaakceptuj sugerowaną kategorię "Jedzenie"
6. Zapisz
7. Sprawdź, czy wydatek pojawił się w tabeli

**Oczekiwany rezultat**: Wydatek jest zapisany z kategorią "Jedzenie"

##### TC-E2E-003: Edycja wydatku i korekta kategorii
**Kroki**:
1. Wybierz wydatek z listy
2. Kliknij akcję "Edytuj"
3. Zmień kategorię na "Transport"
4. Zmień kwotę na 50.00
5. Zapisz
6. Sprawdź aktualizację w tabeli

**Oczekiwany rezultat**: Wydatek jest zaktualizowany, kategoria skorygowana

##### TC-E2E-004: Filtrowanie wydatków po dacie
**Kroki**:
1. Dodaj 3 wydatki z różnymi datami (dzisiaj, wczoraj, tydzień temu)
2. Wybierz filtr "Ostatnie 7 dni"
3. Sprawdź, że widoczne są tylko odpowiednie wydatki
4. Wybierz niestandardowy zakres dat
5. Sprawdź poprawność filtrowania

**Oczekiwany rezultat**: Filtrowanie działa prawidłowo

##### TC-E2E-005: Wizualizacja wydatków na wykresach
**Kroki**:
1. Dodaj wydatki z różnych kategorii
2. Przejdź do sekcji wizualizacji
3. Sprawdź wykres słupkowy
4. Przełącz na wykres kołowy
5. Zastosuj filtr dat
6. Sprawdź aktualizację wykresów

**Oczekiwany rezultat**: Wykresy wyświetlają dane zgodnie z filtrami

##### TC-E2E-006: Dodanie nowej kategorii podczas klasyfikacji
**Kroki**:
1. Dodaj wydatek z nietypowym opisem (np. "Zakup drona DJI")
2. AI proponuje nową kategorię "Elektronika"
3. Zaakceptuj nową kategorię
4. Sprawdź, że kategoria została dodana do listy
5. Dodaj kolejny wydatek elektroniczny
6. Sprawdź, że nowa kategoria jest dostępna

**Oczekiwany rezultat**: Nowa kategoria jest tworzona i używana

### 3.4 Testy bezpieczeństwa (Security Tests)

**Cel**: Weryfikacja mechanizmów bezpieczeństwa i autoryzacji

#### 3.4.1 Testy Row Level Security (RLS)

##### TC-SEC-001: Izolacja wydatków między użytkownikami
**Test**: Próba dostępu do wydatków innego użytkownika przez API
**Oczekiwany rezultat**: Brak dostępu, błąd 403

##### TC-SEC-002: Próba modyfikacji wydatku innego użytkownika
**Test**: Próba UPDATE na expense_id należącym do innego użytkownika
**Oczekiwany rezultat**: Operacja odrzucona przez RLS

##### TC-SEC-003: Ochrona tras przed nieautoryzowanym dostępem
**Test**: Próba dostępu do /app bez zalogowania
**Oczekiwany rezultat**: Przekierowanie do /login

##### TC-SEC-004: Niemodyfikowalność logów
**Test**: Próba UPDATE/DELETE na tabeli logs
**Oczekiwany rezultat**: Operacja odrzucona (brak policy)

##### TC-SEC-005: Walidacja JWT tokenu
**Test**: Żądanie z wygasłym tokenem
**Oczekiwany rezultat**: Błąd 401, przekierowanie do logowania

#### 3.4.2 Testy walidacji danych

##### TC-VAL-001: Walidacja kwoty wydatku
**Test**: Próba dodania wydatku z kwotą <= 0, NULL, tekstem
**Oczekiwany rezultat**: Błąd walidacji

##### TC-VAL-002: Walidacja długości opisu
**Test**: Opis pusty, opis > 500 znaków
**Oczekiwany rezultat**: Błąd walidacji

##### TC-VAL-003: SQL Injection w nazwie wydatku
**Test**: Wprowadzenie `' OR '1'='1` w pole nazwy
**Oczekiwany rezultat**: Wartość jest escapowana, brak podatności

### 3.5 Testy wydajnościowe (Performance Tests)

**Cel**: Weryfikacja responsywności i czasów odpowiedzi

**Narzędzia**: Lighthouse, Chrome DevTools

#### 3.5.1 Metryki wydajności

##### TC-PERF-001: Czas ładowania strony głównej
**Cel**: < 3s na 3G
**Metryka**: Largest Contentful Paint (LCP)

##### TC-PERF-002: Czas odpowiedzi API klasyfikacji
**Cel**: < 5s dla pojedynczego wydatku
**Warunki**: Timeout ustawiony na 30s

##### TC-PERF-003: Renderowanie tabeli z 100 wydatkami
**Cel**: Płynne scrollowanie bez lagów
**Metryka**: FPS > 30

##### TC-PERF-004: Ładowanie wykresów
**Cel**: Rendering wykresu < 1s dla 50 punktów danych

##### TC-PERF-005: Responsywność na urządzeniach mobilnych
**Cel**: First Input Delay (FID) < 100ms

### 3.6 Testy kompatybilności (Compatibility Tests)

**Cel**: Weryfikacja działania na różnych przeglądarkach i urządzeniach

#### 3.6.1 Przeglądarki (ostatnie 2 wersje)
- ✅ Google Chrome
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari (macOS/iOS)

#### 3.6.2 Urządzenia
- ✅ Desktop (1920x1080, 1366x768)
- ✅ Tablet (iPad, Android)
- ✅ Mobile (iPhone, Android)

### 3.7 Testy dostępności (Accessibility Tests)

**Cel**: Zgodność z WCAG 2.1 AA

**Narzędzia**: axe DevTools, Lighthouse

#### 3.7.1 Kluczowe aspekty
- ✅ Kontrast kolorów
- ✅ Nawigacja klawiaturą (Tab, Enter, Escape)
- ✅ Atrybuty ARIA dla komponentów Material
- ✅ Obsługa czytników ekranu
- ✅ Etykiety formularzy

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Moduł Autentykacji

#### TC-AUTH-001: Poprawne logowanie
**Priorytet**: Krytyczny  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Użytkownik posiada konto w systemie |
| **Kroki** | 1. Otwórz /login<br>2. Wprowadź email: test@example.com<br>3. Wprowadź hasło: TestPass123!<br>4. Kliknij "Zaloguj" |
| **Oczekiwany rezultat** | - Brak błędów walidacji<br>- Użytkownik przekierowany do /app<br>- Token sesji zapisany<br>- authState.user jest wypełniony |
| **Dane testowe** | Email: test@example.com, Hasło: TestPass123! |

#### TC-AUTH-002: Logowanie z niepoprawnym hasłem
**Priorytet**: Wysoki  
**Typ**: Negatywny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Użytkownik posiada konto w systemie |
| **Kroki** | 1. Otwórz /login<br>2. Wprowadź poprawny email<br>3. Wprowadź błędne hasło<br>4. Kliknij "Zaloguj" |
| **Oczekiwany rezultat** | - Komunikat: "Nieprawidłowy email lub hasło."<br>- Użytkownik pozostaje na /login<br>- authState.error jest ustawiony |
| **Dane testowe** | Email: test@example.com, Hasło: WrongPass |

#### TC-AUTH-003: Rejestracja nowego użytkownika
**Priorytet**: Krytyczny  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Email nie jest zarejestrowany w systemie |
| **Kroki** | 1. Otwórz /register<br>2. Wprowadź email: newuser@example.com<br>3. Wprowadź hasło: SecurePass123!<br>4. Potwierdź hasło<br>5. Kliknij "Zarejestruj" |
| **Oczekiwany rezultat** | - Komunikat o potwierdzeniu email (jeśli włączone)<br>- Konto jest tworzone w auth.users<br>- Użytkownik może się zalogować |
| **Dane testowe** | Email: newuser@example.com, Hasło: SecurePass123! |

#### TC-AUTH-004: Ochrona trasy /app
**Priorytet**: Krytyczny  
**Typ**: Bezpieczeństwa

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Użytkownik nie jest zalogowany |
| **Kroki** | 1. Otwórz bezpośrednio URL: /app/expenses |
| **Oczekiwany rezultat** | - authGuard odmawia dostępu<br>- Przekierowanie do /login |
| **Dane testowe** | Brak |

### 4.2 Moduł Wydatków

#### TC-EXP-001: Dodanie wydatku bez kategorii
**Priorytet**: Krytyczny  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Użytkownik jest zalogowany |
| **Kroki** | 1. Kliknij "Dodaj wydatek"<br>2. Wprowadź nazwę: "Zakup książki"<br>3. Wprowadź kwotę: 29.99<br>4. Wybierz datę: dzisiejsza<br>5. Nie wybieraj kategorii<br>6. Kliknij "Zapisz" |
| **Oczekiwany rezultat** | - Wydatek zapisany z category_id = NULL<br>- classification_status = 'pending'<br>- Wpis w tabeli logs (action: insert)<br>- Wydatek widoczny w tabeli |
| **Dane testowe** | Nazwa: Zakup książki, Kwota: 29.99 |

#### TC-EXP-002: Dodanie wydatku z błędną kwotą
**Priorytet**: Wysoki  
**Typ**: Negatywny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Użytkownik jest zalogowany, otworzony dialog |
| **Kroki** | 1. Wprowadź nazwę: "Test"<br>2. Wprowadź kwotę: -10<br>3. Spróbuj zapisać |
| **Oczekiwany rezultat** | - Błąd walidacji: "Kwota musi być większa niż 0"<br>- Przycisk "Zapisz" nieaktywny lub formularz nie jest wysyłany |
| **Dane testowe** | Kwota: -10, 0, "abc" |

#### TC-EXP-003: Edycja istniejącego wydatku
**Priorytet**: Krytyczny  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wydatek z ID=xyz istnieje w bazie |
| **Kroki** | 1. Kliknij "Edytuj" na wydatku<br>2. Zmień nazwę na "Zakup nowości"<br>3. Zmień kwotę na 35.00<br>4. Zmień kategorię na "Edukacja"<br>5. Kliknij "Zapisz" |
| **Oczekiwany rezultat** | - Wydatek zaktualizowany<br>- updated_at jest aktualizowane<br>- Wpis w logs (action: update)<br>- Tabela odświeżona |
| **Dane testowe** | expense_id: xyz |

#### TC-EXP-004: Usunięcie wydatku
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wydatek z ID=xyz istnieje |
| **Kroki** | 1. Kliknij "Usuń" na wydatku<br>2. Potwierdź usunięcie w dialogu |
| **Oczekiwany rezultat** | - Wydatek usunięty z bazy (DELETE)<br>- Tabela odświeżona bez tego wydatku<br>- Powiązane logi pozostają (expense_id = NULL po cascade) |
| **Dane testowe** | expense_id: xyz |

#### TC-EXP-005: Sortowanie tabeli wydatków
**Priorytet**: Średni  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Co najmniej 5 wydatków w bazie |
| **Kroki** | 1. Kliknij nagłówek kolumny "Kwota"<br>2. Sprawdź sortowanie rosnące<br>3. Kliknij ponownie<br>4. Sprawdź sortowanie malejące |
| **Oczekiwany rezultat** | - Wydatki są sortowane poprawnie<br>- Ikona sortowania jest aktualizowana |
| **Dane testowe** | Lista wydatków |

#### TC-EXP-006: Paginacja tabeli wydatków
**Priorytet**: Średni  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Więcej niż 10 wydatków w bazie |
| **Kroki** | 1. Ustaw rozmiar strony: 10<br>2. Sprawdź pierwszą stronę<br>3. Kliknij "Następna strona"<br>4. Sprawdź drugą stronę |
| **Oczekiwany rezultat** | - Wyświetlane są właściwe rekordy<br>- Licznik stron jest poprawny<br>- Przyciski nawigacji działają |
| **Dane testowe** | 25 wydatków |

### 4.3 Moduł Klasyfikacji AI

#### TC-AI-001: Klasyfikacja do istniejącej kategorii (pewność >= 0.7)
**Priorytet**: Krytyczny  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Kategoria "Transport" istnieje |
| **Kroki** | 1. Dodaj wydatek: "Tankowanie BP 95"<br>2. Poczekaj na klasyfikację<br>3. Sprawdź wynik |
| **Oczekiwany rezultat** | - categoryId: [ID kategorii Transport]<br>- categoryName: "Transport" lub "Paliwo"<br>- confidence: >= 0.7<br>- isNewCategory: false<br>- predicted_category_id jest ustawione |
| **Dane testowe** | Opis: "Tankowanie BP 95" |

#### TC-AI-002: Propozycja nowej kategorii (pewność < 0.7)
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Brak kategorii "Elektronika" |
| **Kroki** | 1. Dodaj wydatek: "Zakup drona DJI Mavic"<br>2. Poczekaj na klasyfikację<br>3. Sprawdź wynik |
| **Oczekiwany rezultat** | - categoryId: null<br>- newCategoryName: "Elektronika" lub podobna<br>- confidence: < 0.7<br>- isNewCategory: true<br>- reasoning: wyjaśnienie decyzji |
| **Dane testowe** | Opis: "Zakup drona DJI Mavic" |

#### TC-AI-003: Klasyfikacja wsadowa (batch)
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Użytkownik ma listę wydatków do sklasyfikowania |
| **Kroki** | 1. Przygotuj tablicę 5 wydatków<br>2. Wywołaj batchClassifyExpenses()<br>3. Sprawdź odpowiedź |
| **Oczekiwany rezultat** | - Zwrócona tablica ma 5 elementów<br>- Kolejność wyników odpowiada kolejności wejścia<br>- Każdy wynik ma wymagane pola<br>- Czas odpowiedzi < 15s |
| **Dane testowe** | 5 wydatków z różnych kategorii |

#### TC-AI-004: Obsługa rate limiting
**Priorytet**: Wysoki  
**Typ**: Negatywny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Limit zapytań został przekroczony |
| **Kroki** | 1. Wywołaj classifyExpense() > limit<br>2. Sprawdź odpowiedź |
| **Oczekiwany rezultat** | - Błąd: RATE_LIMIT_ERROR<br>- Komunikat: "Przekroczono limit zapytań. Spróbuj ponownie za X sekund."<br>- Żądanie nie jest wysyłane do API |
| **Dane testowe** | N/A |

#### TC-AI-005: Timeout klasyfikacji
**Priorytet**: Średni  
**Typ**: Negatywny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | API nie odpowiada w czasie |
| **Kroki** | 1. Symuluj opóźnienie > 30s<br>2. Sprawdź obsługę błędu |
| **Oczekiwany rezultat** | - Błąd: TIMEOUT_ERROR<br>- Komunikat: "Zapytanie trwało zbyt długo. Spróbuj ponownie."<br>- Wydatek pozostaje z status 'pending' lub 'failed' |
| **Dane testowe** | Mock timeout |

#### TC-AI-006: Walidacja wyniku klasyfikacji
**Priorytet**: Średni  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Otrzymano wynik klasyfikacji |
| **Kroki** | 1. Wywołaj validateClassification() z wynikiem |
| **Oczekiwany rezultat** | - isValid: true dla poprawnych danych<br>- errors: [] dla poprawnych danych<br>- isValid: false dla niepoprawnych<br>- errors: lista błędów walidacji |
| **Dane testowe** | Różne struktury wyniku |

### 4.4 Moduł Kategorii

#### TC-CAT-001: Dodanie nowej kategorii
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Użytkownik jest zalogowany |
| **Kroki** | 1. Kliknij "Dodaj kategorię"<br>2. Wprowadź nazwę: "Subskrypcje"<br>3. Opcjonalnie wybierz kategorię nadrzędną<br>4. Kliknij "Zapisz" |
| **Oczekiwany rezultat** | - Kategoria zapisana w bazie<br>- is_active = true<br>- Kategoria widoczna w liście<br>- Dostępna w autocomplete |
| **Dane testowe** | Nazwa: "Subskrypcje" |

#### TC-CAT-002: Unikatowość nazwy kategorii
**Priorytet**: Wysoki  
**Typ**: Negatywny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Kategoria "Transport" już istnieje |
| **Kroki** | 1. Spróbuj dodać kategorię "Transport"<br>2. Sprawdź błąd |
| **Oczekiwany rezultat** | - Błąd: "Kategoria o tej nazwie już istnieje"<br>- Uniemożliwienie zapisu (unique index) |
| **Dane testowe** | Nazwa: "Transport" |

#### TC-CAT-003: Dezaktywacja kategorii
**Priorytet**: Średni  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Kategoria "Test" istnieje |
| **Kroki** | 1. Kliknij "Dezaktywuj" na kategorii<br>2. Potwierdź |
| **Oczekiwany rezultat** | - is_active = false<br>- Kategoria nie jest widoczna w autocomplete<br>- Istniejące wydatki zachowują powiązanie |
| **Dane testowe** | category_id: test |

#### TC-CAT-004: Struktura hierarchiczna kategorii
**Priorytet**: Średni  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Kategoria "Transport" istnieje |
| **Kroki** | 1. Dodaj podkategorię "Paliwo" z parent_id = Transport |
| **Oczekiwany rezultat** | - Podkategoria zapisana<br>- Widoczna struktura parent-child<br>- Możliwość przypisania wydatku do podkategorii |
| **Dane testowe** | Parent: Transport, Child: Paliwo |

### 4.5 Moduł Wizualizacji

#### TC-VIZ-001: Wyświetlanie wykresu słupkowego
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Co najmniej 3 wydatki z różnych kategorii |
| **Kroki** | 1. Przejdź do sekcji wykresów<br>2. Wybierz wykres słupkowy<br>3. Sprawdź wyświetlanie |
| **Oczekiwany rezultat** | - Wykres renderowany poprawnie<br>- Osie X (kategorie) i Y (kwoty) są opisane<br>- Kolory są czytelne<br>- Tooltip pokazuje szczegóły |
| **Dane testowe** | 5 wydatków |

#### TC-VIZ-002: Wyświetlanie wykresu kołowego
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Co najmniej 3 wydatki z różnych kategorii |
| **Kroki** | 1. Przejdź do sekcji wykresów<br>2. Wybierz wykres kołowy<br>3. Sprawdź wyświetlanie |
| **Oczekiwany rezultat** | - Wykres kołowy renderowany<br>- Kategorie są oznaczone kolorami<br>- Legenda wyświetlana<br>- Procenty sumują się do 100% |
| **Dane testowe** | 5 wydatków |

#### TC-VIZ-003: Filtrowanie wykresów po dacie
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wydatki z różnych okresów |
| **Kroki** | 1. Ustaw filtr "Ostatni miesiąc"<br>2. Sprawdź wykres<br>3. Zmień na "Ostatnie 7 dni"<br>4. Sprawdź aktualizację |
| **Oczekiwany rezultat** | - Wykres aktualizowany zgodnie z filtrem<br>- Wyświetlane tylko dane z wybranego zakresu<br>- Sumy są poprawne |
| **Dane testowe** | 10 wydatków |

#### TC-VIZ-004: Obsługa pustych danych
**Priorytet**: Średni  
**Typ**: Negatywny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Brak wydatków w wybranym zakresie |
| **Kroki** | 1. Ustaw filtr, dla którego brak danych<br>2. Sprawdź wykres |
| **Oczekiwany rezultat** | - Komunikat: "Brak danych do wyświetlenia"<br>- Wykres nie renderuje pustych osi<br>- Brak błędów w konsoli |
| **Dane testowe** | Puste dane |

#### TC-VIZ-005: Responsywność wykresów
**Priorytet**: Średni  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wykresy wyświetlane |
| **Kroki** | 1. Zmień rozmiar okna przeglądarki<br>2. Przejdź do widoku mobilnego (375px)<br>3. Sprawdź wykres |
| **Oczekiwany rezultat** | - Wykres dostosowuje się do rozmiaru<br>- Etykiety są czytelne<br>- Brak overflow |
| **Dane testowe** | Różne rozmiary ekranu |

### 4.6 Moduł Filtrowania

#### TC-FIL-001: Filtrowanie po predefiniowanym zakresie dat
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wydatki z różnych okresów |
| **Kroki** | 1. Wybierz "Dzisiaj"<br>2. Sprawdź listę<br>3. Wybierz "Ostatnie 7 dni"<br>4. Sprawdź listę |
| **Oczekiwany rezultat** | - Wyświetlane tylko wydatki z wybranego zakresu<br>- Liczba wydatków się zmienia<br>- Daty są poprawne |
| **Dane testowe** | Wydatki: dzisiaj, wczoraj, tydzień temu, miesiąc temu |

#### TC-FIL-002: Filtrowanie po niestandardowym zakresie dat
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wydatki z różnych okresów |
| **Kroki** | 1. Kliknij "Niestandardowy zakres"<br>2. Wybierz datę od: 2025-01-01<br>3. Wybierz datę do: 2025-01-31<br>4. Zastosuj |
| **Oczekiwany rezultat** | - Wyświetlane tylko wydatki ze stycznia 2025<br>- Filtr jest zapisany<br>- Możliwość resetu |
| **Dane testowe** | Zakres: 2025-01-01 do 2025-01-31 |

#### TC-FIL-003: Filtrowanie po kategorii
**Priorytet**: Wysoki  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wydatki z różnych kategorii |
| **Kroki** | 1. Wybierz kategorię "Transport" z autocomplete<br>2. Zastosuj filtr |
| **Oczekiwany rezultat** | - Wyświetlane tylko wydatki z kategorii Transport<br>- Można wybrać wiele kategorii (chips)<br>- Reset filtru działa |
| **Dane testowe** | Kategoria: Transport |

#### TC-FIL-004: Kombinacja filtrów (data + kategoria)
**Priorytet**: Średni  
**Typ**: Funkcjonalny

| Pole | Wartość |
|------|---------|
| **Warunki wstępne** | Wydatki z różnych kategorii i okresów |
| **Kroki** | 1. Ustaw zakres dat: Ostatnie 30 dni<br>2. Wybierz kategorię: Jedzenie<br>3. Zastosuj |
| **Oczekiwany rezultat** | - Wyświetlane tylko wydatki spełniające oba warunki<br>- Filtry działają razem (AND)<br>- Liczba wydatków poprawna |
| **Dane testowe** | Różne wydatki |

---

## 5. Środowisko testowe

### 5.1 Środowiska

#### 5.1.1 Lokalne środowisko deweloperskie
- **Cel**: Testy jednostkowe i integracyjne przez deweloperów
- **URL**: http://localhost:4200 (Angular dev server)
- **Backend**: Supabase Local Development (via `supabase start`)
- **Baza danych**: PostgreSQL w Docker
- **AI**: Mock ClassificationService lub test API key
- **Node.js**: v22.14.0 (zarządzane przez nvm)

#### 5.1.2 Środowisko CI/CD (GitHub Actions)
- **Cel**: Automatyczne testy przy każdym push/PR
- **Testy**: Jednostkowe + linting
- **Przeglądarka**: ChromeHeadless
- **Konfiguracja**: `.github/workflows/test.yml`

#### 5.1.3 Środowisko stagingowe
- **Cel**: Testy E2E i akceptacyjne
- **URL**: https://staging.moneyflowtracker.app (przykład)
- **Backend**: Supabase projekt testowy
- **AI**: OpenRouter.ai z kluczem testowym (ograniczony rate limit)
- **Dane**: Testowe konta użytkowników i wydatki seed

#### 5.1.4 Środowisko produkcyjne
- **Cel**: Smoke tests po wdrożeniu
- **URL**: https://moneyflowtracker.app
- **Backend**: Supabase projekt produkcyjny
- **Monitoring**: Weryfikacja dostępności i kluczowych funkcjonalności

### 5.2 Konfiguracja testowa

#### 5.2.1 Zmienne środowiskowe
```bash
# .env.test
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<local_anon_key>
OPENROUTER_API_KEY=<test_api_key>
NODE_ENV=test
```

#### 5.2.2 Dane testowe (seed)
- **Użytkownicy**: test@example.com, test2@example.com
- **Kategorie**: Komplet domyślnych kategorii z migracji
- **Wydatki**: 20 przykładowych wydatków z różnych okresów i kategorii

### 5.3 Wymagania sprzętowe

#### 5.3.1 Lokalne środowisko
- **RAM**: Min. 8GB (zalecane 16GB)
- **Dysk**: 10GB wolnego miejsca
- **Procesor**: Współczesny procesor wielordzeniowy

#### 5.3.2 CI/CD (GitHub Actions Runner)
- **Plan**: GitHub Free (2000 minut/miesiąc)
- **VM**: ubuntu-latest

---

## 6. Narzędzia do testowania

### 6.1 Testy jednostkowe i integracyjne

#### 6.1.1 Jasmine
- **Wersja**: ~5.1.1
- **Cel**: Framework do pisania testów (BDD style)
- **Plik konfiguracyjny**: `karma.conf.cjs`
- **Składnia**: `describe`, `it`, `expect`

#### 6.1.2 Karma
- **Wersja**: ~6.4.4
- **Cel**: Test runner wykonujący testy w przeglądarce
- **Przeglądarki**: Chrome, ChromeHeadless
- **Reportery**: jasmine-html-reporter, coverage

#### 6.1.3 Angular Testing Utilities
- **TestBed**: Konfiguracja modułów testowych
- **ComponentFixture**: Testy komponentów
- **inject()**: Dependency injection w testach
- **HttpClientTestingModule**: Mock HTTP requests

### 6.2 Testy E2E

#### 6.2.1 Playwright (rekomendacja)
- **Wersja**: Najnowsza stabilna
- **Cel**: Testy end-to-end w realnej przeglądarce
- **Zalety**: Szybki setup, time-travel debugging, automatyczne czekanie


**Alternatywa**: Playwright (jeśli potrzebne cross-browser testing)

### 6.3 Mockowanie

#### 6.3.1 Supabase Mocks
- **Metoda**: Jasmine spies na `supabaseClient`
- **Przykład**:
  ```typescript
  spyOn(supabaseClient.auth, 'signInWithPassword').and.returnValue(
    Promise.resolve({ data: mockUser, error: null })
  );
  ```

#### 6.3.2 HTTP Mocks
- **HttpClientTestingModule**: Angular testing module
- **HttpTestingController**: Przechwytywanie i mockowanie żądań HTTP

#### 6.3.3 ClassificationService Mock
- **Metoda**: Spy lub mock implementation
- **Cel**: Uniknięcie rzeczywistych wywołań do OpenRouter.ai w testach

### 6.4 Linting i formatowanie

#### 6.4.1 ESLint
- **Wersja**: 9.23.0
- **Konfiguracja**: `eslint.config.js`
- **Reguły**: @typescript-eslint, prettier integration
- **Komenda**: `npm run lint`

#### 6.4.2 Prettier
- **Plugin**: eslint-plugin-prettier
- **Komenda**: `npm run format`

### 6.5 Pokrycie kodu (Code Coverage)

#### 6.5.1 Istanbul (via Karma)
- **Plugin**: karma-coverage
- **Raport**: HTML, LCOV
- **Lokalizacja**: `coverage/` folder
- **Cel pokrycia**: Min. 80% dla kluczowych modułów

#### 6.5.2 Metryki
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### 6.6 Wydajność

#### 6.6.1 Lighthouse
- **Cel**: Audyt wydajności, SEO, dostępności
- **Tryb**: CLI lub Chrome DevTools
- **Metryki**: Performance score, LCP, FID, CLS

#### 6.6.2 Chrome DevTools
- **Performance tab**: Profilowanie renderowania
- **Network tab**: Analiza czasu ładowania
- **Coverage tab**: Niewykorzystany kod

### 6.7 Dostępność

#### 6.7.1 axe DevTools
- **Cel**: Automatyczne sprawdzanie WCAG 2.1
- **Integracja**: Browser extension

#### 6.7.2 WAVE
- **Cel**: Wizualna analiza dostępności
- **URL**: https://wave.webaim.org/

### 6.8 Monitoring i debugowanie

#### 6.8.1 Browser Developer Tools
- **Console**: Logi błędów
- **Network**: Analiza żądań API
- **Sources**: Debugowanie kodu

#### 6.8.2 Supabase Dashboard
- **Logs**: Przegląd logów Edge Functions
- **SQL Editor**: Weryfikacja danych w bazie
- **Auth**: Zarządzanie użytkownikami testowymi

---

## 7. Harmonogram testów

### 7.1 Fazy testowania

#### Faza 1: Testy jednostkowe (Sprint 1-2)
**Czas trwania**: 2 tygodnie  
**Odpowiedzialny**: Deweloperzy  
**Zakres**:
- Serwisy: AuthService, ClassificationService, ExpensesService
- Guards: authGuard, guestGuard
- Walidatory: expenseValidators
- Komponenty: 50% komponentów UI

**Kryteria zakończenia**: 80% pokrycia kodu

#### Faza 2: Testy integracyjne (Sprint 2-3)
**Czas trwania**: 1,5 tygodnia  
**Odpowiedzialny**: Deweloperzy + QA Engineer  
**Zakres**:
- Przepływy dodawania i edycji wydatków
- Integracja z Supabase
- Przepływy autentykacji
- Klasyfikacja AI (z mockami)

**Kryteria zakończenia**: Wszystkie krytyczne przepływy działają

#### Faza 3: Testy E2E (Sprint 3)
**Czas trwania**: 1 tydzień  
**Odpowiedzialny**: QA Engineer  
**Zakres**:
- 6 kluczowych ścieżek użytkownika (TC-E2E-001 do TC-E2E-006)
- Testy w środowisku stagingowym
- Krzyżowe testowanie przeglądarek

**Kryteria zakończenia**: Wszystkie scenariusze E2E przechodzą

#### Faza 4: Testy bezpieczeństwa (Sprint 3)
**Czas trwania**: 3 dni  
**Odpowiedzialny**: Security Engineer / Senior QA  
**Zakres**:
- Testy RLS policies
- Walidacja danych
- Testy podatności (SQL injection, XSS)

**Kryteria zakończenia**: Brak krytycznych luk bezpieczeństwa

#### Faza 5: Testy wydajnościowe (Sprint 4)
**Czas trwania**: 2 dni  
**Odpowiedzialny**: QA Engineer  
**Zakres**:
- Lighthouse audits
- Testy obciążeniowe (symulacja 50 użytkowników)
- Analiza czasu odpowiedzi API

**Kryteria zakończenia**: Wszystkie metryki w zakresie docelowym

#### Faza 6: Testy akceptacyjne (UAT) (Sprint 4)
**Czas trwania**: 3 dni  
**Odpowiedzialny**: Product Owner + Beta testerzy  
**Zakres**:
- Weryfikacja zgodności z wymaganiami biznesowymi
- Testy użyteczności
- Feedback od użytkowników końcowych

**Kryteria zakończenia**: Akceptacja PO, brak blockerów

#### Faza 7: Smoke tests produkcyjne (Post-deployment)
**Czas trwania**: 1 godzina  
**Odpowiedzialny**: QA Engineer  
**Zakres**:
- Weryfikacja dostępności aplikacji
- Test logowania i podstawowych funkcji
- Sprawdzenie integracji produkcyjnych

**Kryteria zakończenia**: Aplikacja działa na produkcji

### 7.2 Harmonogram CI/CD

#### Automatyczne testy przy każdym commit
- **Trigger**: Push do dowolnej gałęzi
- **Testy**: Linting + testy jednostkowe
- **Czas wykonania**: ~5 minut
- **Rezultat**: GitHub status check

#### Automatyczne testy przy Pull Request
- **Trigger**: Otwarcie/aktualizacja PR
- **Testy**: Linting + testy jednostkowe + testy integracyjne
- **Czas wykonania**: ~10 minut
- **Rezultat**: Blokada merge przy niepowodzeniu

#### Automatyczne testy przed deployment
- **Trigger**: Push do gałęzi `main`
- **Testy**: Pełna suita (unit + integration + E2E)
- **Czas wykonania**: ~20 minut
- **Rezultat**: Wdrożenie tylko przy sukcesie

### 7.3 Regresja

#### Testy regresyjne przed każdym release
**Częstotliwość**: Przed każdym wdrożeniem na staging/produkcję  
**Zakres**: Wszystkie krytyczne scenariusze testowe  
**Czas trwania**: ~2 godziny (częściowo zautomatyzowane)

---

## 8. Kryteria akceptacji testów

### 8.1 Kryteria dla testów jednostkowych

| Kryterium | Próg akceptacji |
|-----------|-----------------|
| **Pokrycie kodu (statements)** | ≥ 80% |
| **Pokrycie funkcji** | ≥ 80% |
| **Pokrycie gałęzi** | ≥ 75% |
| **Liczba testów przechodzących** | 100% |
| **Czas wykonania testów** | < 2 minuty |

### 8.2 Kryteria dla testów integracyjnych

| Kryterium | Próg akceptacji |
|-----------|-----------------|
| **Wszystkie krytyczne przepływy** | 100% działają |
| **Przepływy wysokiego priorytetu** | 100% działają |
| **Przepływy średniego priorytetu** | ≥ 90% działają |
| **Czas wykonania testów** | < 5 minut |

### 8.3 Kryteria dla testów E2E

| Kryterium | Próg akceptacji |
|-----------|-----------------|
| **Krytyczne ścieżki użytkownika** | 100% przechodzą |
| **Inne scenariusze E2E** | ≥ 95% przechodzą |
| **Stabilność testów** | < 5% flaky tests |
| **Czas wykonania** | < 15 minut |

### 8.4 Kryteria bezpieczeństwa

| Kryterium | Próg akceptacji |
|-----------|-----------------|
| **Luki krytyczne** | 0 |
| **Luki wysokiego ryzyka** | 0 |
| **Luki średniego ryzyka** | ≤ 2 (udokumentowane) |
| **RLS policies** | 100% działają poprawnie |

### 8.5 Kryteria wydajnościowe

| Metryka | Próg akceptacji |
|---------|-----------------|
| **Lighthouse Performance Score** | ≥ 85 |
| **Largest Contentful Paint (LCP)** | < 2.5s |
| **First Input Delay (FID)** | < 100ms |
| **Cumulative Layout Shift (CLS)** | < 0.1 |
| **Czas odpowiedzi API (klasyfikacja)** | < 5s (p95) |
| **Renderowanie tabeli (100 wierszy)** | < 2s |

### 8.6 Kryteria dostępności

| Kryterium | Próg akceptacji |
|-----------|-----------------|
| **WCAG 2.1 AA - naruszenia krytyczne** | 0 |
| **WCAG 2.1 AA - naruszenia poważne** | ≤ 3 |
| **Nawigacja klawiaturą** | 100% funkcji dostępnych |
| **Kontrast kolorów** | Zgodny z WCAG AA (4.5:1) |

### 8.7 Kryteria akceptacji UAT

| Kryterium | Próg akceptacji |
|-----------|-----------------|
| **Zgodność z wymaganiami biznesowymi** | 100% |
| **Błędy blokujące (blockers)** | 0 |
| **Błędy krytyczne** | ≤ 2 |
| **Satysfakcja użytkowników testowych** | ≥ 4/5 |

### 8.8 Definicja priorytetów błędów

#### Priorytet 1 (Blocker)
- Aplikacja nie uruchamia się
- Brak możliwości logowania
- Utrata danych użytkownika
- Luka bezpieczeństwa krytyczna

**Akcja**: Natychmiastowa naprawa, blokada release

#### Priorytet 2 (Krytyczny)
- Kluczowa funkcjonalność nie działa (np. dodawanie wydatku)
- Błąd powodujący utratę danych w określonych warunkach
- Błąd wpływający na >50% użytkowników

**Akcja**: Naprawa przed release

#### Priorytet 3 (Wysoki)
- Funkcjonalność działa, ale z błędami
- Błędy UX utrudniające korzystanie
- Problemy z wydajnością

**Akcja**: Naprawa w bieżącym sprincie

#### Priorytet 4 (Średni)
- Drobne błędy UI
- Błędy w funkcjonalnościach drugorzędnych
- Ulepszenia użyteczności

**Akcja**: Naprawa w następnym sprincie

#### Priorytet 5 (Niski)
- Sugestie ulepszeń
- Błędy kosmetyczne
- Nice-to-have features

**Akcja**: Backlog

---

## 9. Role i odpowiedzialności

### 9.1 Role w procesie testowania

#### 9.1.1 Deweloper (Developer)
**Odpowiedzialności**:
- Pisanie testów jednostkowych dla swojego kodu
- Osiągnięcie min. 80% pokrycia kodu
- Naprawianie błędów priorytet 1-3
- Code review testów innych deweloperów
- Utrzymanie testów przy zmianach kodu
- Lokalne uruchomienie testów przed commit

**Narzędzia**: Jasmine, Karma, ESLint

#### 9.1.2 QA Engineer
**Odpowiedzialności**:
- Tworzenie planu testów i scenariuszy testowych
- Pisanie testów integracyjnych i E2E
- Wykonywanie testów manualnych (eksploracyjnych)
- Raportowanie i weryfikacja błędów
- Utrzymanie zestawu testów automatycznych
- Testy regresyjne przed release
- Testy akceptacyjne (UAT) z PO
- Monitorowanie jakości w CI/CD

**Narzędzia**: Playwright, Lighthouse, axe DevTools

#### 9.1.3 Tech Lead / Senior Developer
**Odpowiedzialności**:
- Przegląd planu testów
- Architektura testów (mockowanie, fixtures)
- Mentoring deweloperów w TDD
- Decyzje o pokryciu kodu i strategii testowania
- Code review testów
- Rozwiązywanie problemów z CI/CD

**Narzędzia**: Wszystkie

#### 9.1.4 Product Owner (PO)
**Odpowiedzialności**:
- Definiowanie kryteriów akceptacji dla user stories
- Akceptacja wyników UAT
- Priorytetyzacja naprawy błędów
- Decyzja o gotowości do release

**Narzędzia**: Staging environment, issue tracker

#### 9.1.5 DevOps Engineer
**Odpowiedzialności**:
- Konfiguracja pipeline CI/CD dla testów
- Utrzymanie środowisk testowych (staging)
- Monitorowanie wydajności testów w CI
- Integracja narzędzi testowych
- Smoke tests po wdrożeniu

**Narzędzia**: GitHub Actions, Supabase CLI

#### 9.1.6 Security Engineer (opcjonalnie, konsultacja)
**Odpowiedzialności**:
- Przegląd RLS policies
- Testy penetracyjne (penetration testing)
- Weryfikacja walidacji danych
- Audyt zależności (npm audit)

**Narzędzia**: OWASP ZAP, Burp Suite, npm audit

### 9.2 Macierz RACI

| Zadanie | Deweloper | QA Engineer | Tech Lead | PO | DevOps |
|---------|-----------|-------------|-----------|-----|--------|
| **Pisanie testów jednostkowych** | R, A | I | C | I | I |
| **Pisanie testów E2E** | I | R, A | C | I | I |
| **Przegląd planu testów** | C | R | A | C | I |
| **Wykonywanie testów manualnych** | I | R, A | I | I | I |
| **Raportowanie błędów** | I | R | I | I | I |
| **Naprawa błędów** | R, A | I | C | I | I |
| **Konfiguracja CI/CD** | I | C | C | I | R, A |
| **Testy akceptacyjne (UAT)** | I | R | I | A | I |
| **Decyzja o release** | I | C | C | R, A | I |
| **Testy bezpieczeństwa** | C | R | A | I | C |

**Legenda**:
- **R (Responsible)**: Wykonuje zadanie
- **A (Accountable)**: Odpowiada za rezultat (jedna osoba)
- **C (Consulted)**: Konsultowany przed decyzją
- **I (Informed)**: Informowany o rezultacie

### 9.3 Komunikacja

#### 9.3.1 Kanały komunikacji
- **Daily Standup**: Status testów, blokery
- **Slack/Teams**: Szybkie pytania, alerty CI/CD
- **Jira/GitHub Issues**: Raportowanie i tracking błędów
- **Confluence/Wiki**: Dokumentacja testów

#### 9.3.2 Spotkania
- **Sprint Planning**: Planowanie testów dla user stories
- **Sprint Review**: Demonstracja przetestowanych funkcjonalności
- **Test Review Meeting**: Co 2 tygodnie, przegląd wyników testów

---

## 10. Procedury raportowania błędów

### 10.1 Przepływ raportowania

```
Wykrycie błędu → Weryfikacja → Utworzenie issue → Przypisanie → Naprawa → Weryfikacja → Zamknięcie
```

### 10.2 Szablon raportu błędu (GitHub Issue)

```markdown
## 🐛 Opis błędu
[Krótki opis problemu]

## 📋 Kroki do reprodukcji
1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

## ✅ Oczekiwane zachowanie
[Co powinno się stać]

## ❌ Aktualne zachowanie
[Co się faktycznie dzieje]

## 🖼️ Zrzuty ekranu / logi
[Załącz screenshoty lub logi]

## 🌐 Środowisko
- **URL**: [np. staging.moneyflowtracker.app]
- **Przeglądarka**: [np. Chrome 120]
- **OS**: [np. Windows 11]
- **Urządzenie**: [np. Desktop, iPhone 12]

## 🔥 Priorytet
[ ] Blocker (P1)
[ ] Krytyczny (P2)
[x] Wysoki (P3)
[ ] Średni (P4)
[ ] Niski (P5)

## 🏷️ Etykiety
- `bug`
- `frontend` / `backend` / `ai-integration`
- `needs-triage`

## 👤 Osoba raportująca
@username

## 📝 Dodatkowe informacje
[Wszelkie inne istotne informacje]
```

### 10.3 Klasyfikacja błędów

#### Według typu
- `bug-frontend`: Błędy UI/UX, komponentów Angular
- `bug-backend`: Błędy API, Supabase, Edge Functions
- `bug-ai`: Błędy klasyfikacji, integracji z OpenRouter
- `bug-data`: Problemy z danymi, migracje
- `bug-security`: Luki bezpieczeństwa
- `bug-performance`: Problemy z wydajnością

#### Według priorytetu
- `priority-1-blocker`: Blokujące, natychmiastowa akcja
- `priority-2-critical`: Krytyczne, naprawa przed release
- `priority-3-high`: Wysokie, naprawa w bieżącym sprincie
- `priority-4-medium`: Średnie, naprawa w następnym sprincie
- `priority-5-low`: Niskie, backlog

#### Według statusu
- `needs-triage`: Wymaga weryfikacji przez Tech Lead
- `confirmed`: Potwierdzony błąd
- `in-progress`: W trakcie naprawy
- `needs-testing`: Gotowy do weryfikacji przez QA
- `verified`: Zweryfikowany, gotowy do zamknięcia

### 10.4 Proces weryfikacji błędu

#### 10.4.1 Przez QA Engineer
1. **Próba reprodukcji** (do 3 prób)
   - Jeśli nie da się odtworzyć → etykieta `cannot-reproduce`, poproszenie o więcej informacji
   - Jeśli odtworzono → etykieta `confirmed`

2. **Weryfikacja priorytetu**
   - Czy priorytet jest odpowiedni?
   - Konsultacja z Tech Lead dla P1-P2

3. **Przypisanie**
   - Przypisanie do odpowiedniego dewelopera
   - Dodanie do odpowiedniego Milestone/Sprint

#### 10.4.2 Przez Developera (po naprawie)
1. **Naprawa** w gałęzi `fix/issue-123`
2. **Testy jednostkowe** pokrywające przypadek błędu
3. **Pull Request** z referencją do issue
4. **Code review** przez innego dewelopera
5. **Merge** do `develop` po aprobacie
6. **Etykieta** `needs-testing`

#### 10.4.3 Przez QA Engineer (weryfikacja naprawy)
1. **Deploy** na staging
2. **Weryfikacja** według kroków z raportu
3. **Testy regresyjne** powiązanych funkcjonalności
4. **Zamknięcie issue** jeśli OK lub **reopening** jeśli błąd nadal występuje

### 10.5 Metryki błędów

#### 10.5.1 Metryki śledzone
- **Liczba otwartych błędów** (breakdown po priorytecie)
- **Czas do naprawy** (Time to Resolution)
  - P1: < 4 godziny
  - P2: < 1 dzień
  - P3: < 3 dni
- **Liczba błędów wykrytych w produkcji** (cel: < 5 miesięcznie)
- **Wskaźnik regresji** (% błędów powracających)

#### 10.5.2 Raportowanie
- **Cotygodniowe**: Bug report dla zespołu (liczba, priorytety, trendy)
- **Co sprint**: Bug burn-down chart
- **Co release**: Post-mortem dla błędów P1-P2 wykrytych w produkcji

### 10.6 Eskalacja

#### Kiedy eskalować?
- Błąd P1-P2 nie jest naprawiany w ramach SLA
- Błąd P3 blokuje wykonanie testów
- Konflikt priorytetów między zespołami

#### Do kogo eskalować?
1. **Poziom 1**: Tech Lead
2. **Poziom 2**: Product Owner / Engineering Manager
3. **Poziom 3**: CTO (tylko dla krytycznych problemów produkcyjnych)

---

## 11. Załączniki

### 11.1 Checklist przed release

- [ ] Wszystkie testy jednostkowe przechodzą (100%)
- [ ] Wszystkie testy integracyjne przechodzą (100%)
- [ ] Wszystkie krytyczne scenariusze E2E przechodzą (100%)
- [ ] Pokrycie kodu ≥ 80%
- [ ] Brak otwartych błędów P1-P2
- [ ] Testy bezpieczeństwa zakończone bez krytycznych luk
- [ ] Lighthouse Performance Score ≥ 85
- [ ] Testy akceptacyjne (UAT) zakończone pozytywnie
- [ ] Dokumentacja zaktualizowana
- [ ] Smoke tests na staging przeszły pomyślnie
- [ ] Akceptacja Product Ownera

### 11.2 Linki do narzędzi

- **GitHub Repository**: [link do repozytorium]
- **Supabase Dashboard**: [link do dashboardu]
- **Staging Environment**: [link do stagingu]
- **CI/CD Pipeline**: [link do GitHub Actions]
- **Test Reports**: [link do raportów]
- **Coverage Reports**: [link do pokrycia kodu]

### 11.3 Kontakty

| Rola | Imię i nazwisko | Email | Slack |
|------|-----------------|-------|-------|
| Tech Lead | [Imię] | tech-lead@example.com | @tech-lead |
| QA Engineer | [Imię] | qa@example.com | @qa-engineer |
| Product Owner | [Imię] | po@example.com | @product-owner |
| DevOps Engineer | [Imię] | devops@example.com | @devops |

---

## Historia zmian

| Wersja | Data | Autor | Opis zmian |
|--------|------|-------|------------|
| 1.0 | 2025-11-16 | AI QA Engineer | Utworzenie początkowego planu testów |

---

**Dokument przygotowany przez**: AI QA Engineer  
**Data ostatniej aktualizacji**: 2025-11-16  
**Status**: Wersja robocza do przeglądu

