# Dokument wymagań produktu (PRD) - MoneyFlowTracker

## 1. Przegląd produktu

Aplikacja MoneyFlowTracker to webowe narzędzie do rejestrowania i analizowania wydatków użytkownika. MVP będzie oparte na Angular + Astro, z uwierzytelnianiem przez Supabase. Umożliwia szybkie dodawanie pozycji, ich automatyczną klasyfikację AI i wizualizację wydatków na wykresach.

## 2. Problem użytkownika

Śledzenie wydatków ręcznie jest czasochłonne i podatne na błędy. Użytkownicy muszą ręcznie wprowadzać każdą pozycję i klasyfikować ją do odpowiedniej kategorii, co zniechęca do regularnego monitorowania budżetu.

## 3. Wymagania funkcjonalne

1. Rejestracja konta i logowanie (email + hasło via Supabase)
2. CRUD pozycji wydatków (nazwa, kwota, data) z walidacją (kwota > 0, tylko zakupy)
3. Automatyczna klasyfikacja pozycji do kategorii i podkategorii (integracja z zewnętrznym modelem AI)
4. Manualna korekta kategorii: autouzupełnianie istniejących i możliwość dodania własnej
5. Filtracja wydatków według zakresu dat: dzień, tydzień, miesiąc, rok, zakres własny
6. Wizualizacja wydatków: wykres słupkowy i kołowy według kategorii
7. Logowanie operacji w tabeli Logs (dodanie, edycja, klasyfikacja)
8. Bezpieczne przechowywanie kluczy API w zmiennych środowiskowych (.env)

## 4. Granice produktu

W MVP nie obejmujemy:

- Współdzielenia rejestru między użytkownikami
- Zaawansowanych metod kategoryzacji (planowanie budżetu, sug. budżetowe)
- Importu pozycji z zewnętrznych źródeł (OCR, zdjęcia)
- Systemu planowania budżetu na celach
- Sugestii budżetowych na kolejny miesiąc

## 5. Historyjki użytkowników

- ID: US-001  
  Tytuł: Rejestracja konta  
  Opis: Jako nowy użytkownik chcę się zarejestrować, by móc zapisywać wydatki.  
  Kryteria akceptacji:
  - Formularz rejestracji dostępny
  - Weryfikacja poprawności adresu email
  - Hasło spełnia minimalne wymagania długości
  - Po rejestracji przekierowanie do pulpitu

- ID: US-002  
  Tytuł: Logowanie  
  Opis: Jako zarejestrowany użytkownik chcę się zalogować, by uzyskać dostęp do swojego konta.  
  Kryteria akceptacji:
  - Formularz logowania dostępny
  - Błąd przy niepoprawnych danych
  - Przekierowanie do pulpitu po zalogowaniu

- ID: US-003  
  Tytuł: Dodanie pozycji wydatku  
  Opis: Jako zalogowany użytkownik chcę dodać wydatki z nazwą i kwotą, by rejestrować wydatki.  
  Kryteria akceptacji:
  - Możliwość wprowadzenia nazwy i kwoty (>0)
  - Po dodaniu pozycja widoczna na liście
  - Automatyczna klasyfikacja wywołana

- ID: US-004  
  Tytuł: Walidacja wpisu  
  Opis: Jako użytkownik chcę otrzymać informację o błędzie przy niepoprawnych danych, by uniknąć nieprawidłowych wpisów.  
  Kryteria akceptacji:
  - Odrzucenie kwoty ≤0 lub pustej nazwy
  - Wyświetlenie błędu via alert

- ID: US-005  
  Tytuł: Automatyczna klasyfikacja  
  Opis: Jako użytkownik chcę, aby system automatycznie przypisał kategorię do wydatku, by przyspieszyć proces.  
  Kryteria akceptacji:
  - Wywołanie API AI po dodaniu pozycji
  - Przyporządkowanie kategorii/podkategorii
  - Zapis klasyfikacji w bazie

- ID: US-006  
  Tytuł: Ręczna korekta kategorii  
  Opis: Jako użytkownik chcę poprawić kategorię, gdy automatyczna klasyfikacja jest błędna.  
  Kryteria akceptacji:
  - Autouzupełnianie istniejących kategorii
  - Możliwość dodania nowej kategorii
  - Aktualizacja zapisu w bazie

- ID: US-007  
  Tytuł: Filtrowanie wydatków  
  Opis: Jako użytkownik chcę filtrować wydatki wg zakresu dat, by analizować okresy.  
  Kryteria akceptacji:
  - Wybór predefiniowanych zakresów
  - Możliwość ustawienia zakresu własnego
  - Widoczne tylko pozycje z wybranego zakresu

- ID: US-008  
  Tytuł: Wizualizacja słupkowa  
  Opis: Jako użytkownik chcę zobaczyć wydatki na wykresie słupkowym, by porównać kategorie.  
  Kryteria akceptacji:
  - Generowanie wykresu słupkowego
  - Oś X: kategorie; oś Y: suma wydatków

- ID: US-009  
  Tytuł: Wizualizacja kołowa  
  Opis: Jako użytkownik chcę zobaczyć wydatki na wykresie kołowym, by ocenić procentowo udział kategorii.  
  Kryteria akceptacji:
  - Generowanie wykresu kołowego
  - Legendy kategorii z procentami

- ID: US-010  
  Tytuł: Logowanie operacji  
  Opis: Jako zespół produktowy chcemy rejestrować akcje użytkownika, by audytować działania.  
  Kryteria akceptacji:
  - Zapis operacji (dodanie, edycja, klasyfikacja) w tabeli Logs

- ID: US-011  
  Tytuł: Bezpieczny dostęp  
  Opis: Jako użytkownik chcę, aby tylko zalogowani mogli modyfikować dane, by zachować prywatność.  
  Kryteria akceptacji:
  - Ochrona endpointów CRUD za pomocą tokenu Supabase
  - Przekierowanie niezalogowanych do formularza logowania

## 6. Metryki sukcesu

- Automatyczna klasyfikacja osiąga ≥75% zgodności (mierzona liczbą poprawek)
- Kompletność funkcji: wszystkie wymienione w wymaganiach
