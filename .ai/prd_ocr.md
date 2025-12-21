# Dokument wymagań produktu (PRD) - Funkcjonalność OCR w MoneyFlowTracker

## 1. Przegląd produktu

### 1.1. Nazwa produktu
Funkcjonalność automatycznego dodawania wydatków ze zdjęć paragonów w aplikacji MoneyFlowTracker

### 1.2. Opis produktu
Rozszerzenie istniejącej aplikacji MoneyFlowTracker o możliwość automatycznego dodawania wydatków poprzez zrobienie zdjęcia paragonu. System wykorzystuje technologie OCR (Optical Character Recognition) do ekstrakcji pozycji zakupowych i sztuczną inteligencję do automatycznej klasyfikacji wydatków.

### 1.3. Cel biznesowy
Zwiększenie efektywności użytkowników poprzez eliminację czasochłonnego ręcznego przepisywania pozycji z paragonów, co prowadzi do lepszego trackingu wydatków i większego zaangażowania użytkowników.

### 1.4. Grupa docelowa
Dotychczasowi użytkownicy aplikacji MoneyFlowTracker, szczególnie ci, którzy regularnie robią zakupy i chcą szybciej dodawać multiple wydatki z jednego paragonu.

### 1.5. Kluczowe metryki sukcesu
- Średnio 60 paragonów przetwarzanych miesięcznie na użytkownika
- Dokładność OCR > 85% dla rozpoznawania pozycji
- Koszt przetwarzania < 3 USD miesięcznie na użytkownika
- Czas przetwarzania jednego paragonu < 30 sekund
- Adoption rate nowej funkcjonalności > 20% wśród aktywnych użytkowników

## 2. Problem użytkownika

### 2.1. Opis problemu
Użytkownicy MoneyFlowTracker muszą ręcznie przepisywać każdą pozycję z paragonu, co jest:
- Czasochłonne (szczególnie przy paragonach z wieloma pozycjami)
- Podatne na błędy przepisywania
- Frustrujące przy regularnych zakupach
- Zniechęcające do systematycznego trackingu wydatków

### 2.2. Obecne rozwiązanie (workaround)
Aktualnie użytkownicy mogą tylko ręcznie dodawać wydatki jeden po drugim przez interfejs aplikacji, co przy paragonie z 10+ pozycjami może zająć kilka minut.

### 2.3. Wpływ problemu
- Spadek częstotliwości dodawania wydatków
- Niepełne dane o wydatkach (użytkownicy pomijają drobne pozycje)
- Zwiększona prawdopodobność rezygnacji z używania aplikacji
- Gorsze dane do analiz finansowych

### 2.4. Koszt braku rozwiązania
- Utracone możliwości lepszego zarządzania finansami osobistymi
- Mniejsze zaangażowanie użytkowników w długoterminowe planowanie budżetu
- Potencjalna utrata użytkowników na rzecz konkurencji z funkcjami OCR

## 3. Wymagania funkcjonalne

### 3.1. FR-001: Przechwycenie obrazu paragonu
System musi umożliwiać użytkownikowi robienie zdjęć paragonów bezpośrednio z aplikacji przez:
- Dostęp do kamery urządzenia przez Media Devices API
- Interface do robienia i preview zdjęć
- Walidację jakości obrazu przed przetwarzaniem
- Kompresję obrazu do optymalnego rozmiaru (max 2MB, 1920x1080px)

### 3.2. FR-002: Przetwarzanie OCR
System musi automatycznie rozpoznawać i ekstraktować dane z paragonu:
- Wysyłanie zdjęcia do OpenRouter API z vision capabilities
- Ekstrakcja nazw produktów i cen dla każdej pozycji
- Strukturalizacja danych w format JSON
- Obsługa timeout'ów (max 30 sekund)
- Comprehensive error handling dla błędów OCR

### 3.3. FR-003: Przegląd i edycja rozpoznanych pozycji
System musi prezentować rozpoznane pozycje w edytowalnej formie:
- Wyświetlenie listy pozycji z możliwością edycji nazw i cen
- Usuwanie niepotrzebnych pozycji przed zapisem
- Walidacja danych (cena > 0, nazwa niepusta)
- Automatyczne przypisanie daty bieżącej

### 3.4. FR-004: Batch klasyfikacja wydatków
System musi automatycznie klasyfikować wszystkie pozycje:
- Wykorzystanie istniejącej integracji z OpenRouter dla klasyfikacji
- Wysyłanie wszystkich pozycji jednocześnie do AI
- Przypisanie kategorii do każdej pozycji
- Możliwość ręcznej korekty kategorii przed zapisem

### 3.5. FR-005: Bulk zapis wydatków
System musi zapisywać wszystkie pozycje jako osobne wydatki:
- Zapis każdej pozycji jako oddzielny expense w bazie danych
- Wykorzystanie istniejących serwisów ekspensów
- Transakcyjna obsługa błędów (rollback w przypadku partial failure)
- Success feedback po udanym zapisie

### 3.6. FR-006: Obsługa błędów i stanów ładowania
System musi zapewniać clear feedback dla użytkownika:
- Progress indicators podczas OCR i klasyfikacji
- Jasne komunikaty błędów z sugestiami rozwiązania
- Możliwość powrotu do manualnego dodawania przy błędach
- Timeout handling z opcjami retry lub manual fallback

## 4. Granice produktu

### 4.1. W zakresie MVP
- Dostęp do kamery przez PWA (Media Devices API)
- OCR przez OpenRouter Vision API (GPT-4 Vision lub Claude 3.5 Sonnet)
- Ekstrakcja podstawowych danych: nazwa produktu + cena
- Review i edycja rozpoznanych pozycji
- Automatyczna klasyfikacja przez istniejący system AI
- Bulk zapis jako osobne wydatki
- Basic error handling i loading states
- Client-side kompresja obrazów
- Integracja z istniejącym AddExpenseDialog

### 4.2. Poza zakresem MVP
- Offline mode (wymaga native app)
- Rozpoznawanie ilości/wagi produktów
- Ekstrakcja daty z paragonu (używana data bieżąca)
- Rozpoznawanie nazwy sklepu lub lokalizacji
- Grupowanie wydatków z jednego paragonu
- Przechowywanie historii zdjęć paragonów
- Obsługa zwrotów lub korekt paragonów
- Multi-receipt batch processing
- Advanced image quality validation
- Native mobile app (Capacitor migration)
- Client-side OCR fallback
- Auto-retry mechanisms
- Caching wyników OCR
- Obsługa paragonów w różnych językach
- Rozpoznawanie i obsługa VAT/podatków
- Rate limiting dla użytkowników

### 4.3. Wymagania techniczne
- Maksymalny rozmiar obrazu: 2MB
- Maksymalna rozdzielczość: 1920x1080px
- Timeout OCR: 30 sekund
- Timeout klasyfikacji: 15 sekund
- Docelowa dokładność OCR: >85%
- Maksymalny koszt miesięczny: $3 na 60 paragonów
- Wsparcie dla nowoczesnych przeglądarek z Media Devices API

### 4.4. Ograniczenia biznesowe
- Funkcjonalność dostępna tylko dla zalogowanych użytkowników
- Wymaga aktywnego połączenia internetowego
- Ograniczona do paragonów w języku polskim
- Brak wsparcia dla paragonów fiskalnych wydrukowanych w słabej jakości

## 5. Historyjki użytkowników

### 5.1. Scenariusze podstawowe

#### US-001: Dodawanie wydatków ze zdjęcia paragonu
Tytuł: Automatyczne dodawanie wydatków z paragonu

Opis: Jako użytkownik aplikacji, chcę zrobić zdjęcie paragonu i automatycznie dodać wszystkie pozycje jako wydatki, aby zaoszczędzić czas na ręcznym przepisywaniu.

Kryteria akceptacji:
- Mogę otworzyć dialog dodawania wydatków
- Mogę wybrać opcję "Dodaj ze zdjęcia"
- Mogę uruchomić kamerę i zrobić zdjęcie paragonu
- System automatycznie rozpoznaje pozycje z paragonu
- Widzę listę rozpoznanych pozycji z możliwością edycji
- Mogę usunąć niepotrzebne pozycje
- System automatycznie klasyfikuje wszystkie pozycje
- Mogę skorygować kategorie przed zapisem
- Wszystkie pozycje zapisują się jako osobne wydatki
- Otrzymuję potwierdzenie sukcesu

#### US-002: Weryfikacja jakości zdjęcia przed przetwarzaniem
Tytuł: Preview zdjęcia paragonu

Opis: Jako użytkownik, chcę zobaczyć preview zrobionego zdjęcia i mieć możliwość zrobienia nowego, aby upewnić się, że paragon jest wyraźny i zostanie poprawnie odczytany.

Kryteria akceptacji:
- Po zrobieniu zdjęcia widzę preview/miniaturkę
- Mam opcję "Użyj tego zdjęcia" lub "Zrób nowe zdjęcie"
- Widzę wskazówki dotyczące optymalnej jakości zdjęcia
- Mogę wielokrotnie robić nowe zdjęcia do momentu zadowolenia
- System nie przetwarza zdjęcia dopóki go nie zaakceptuję

#### US-003: Edycja rozpoznanych pozycji przed zapisem
Tytuł: Modyfikacja rozpoznanych danych

Opis: Jako użytkownik, chcę móc edytować nazwy i ceny rozpoznanych pozycji oraz usunąć niepotrzebne pozycje, aby mieć pełną kontrolę nad danymi przed zapisem.

Kryteria akceptacji:
- Widzę tabelę/listę wszystkich rozpoznanych pozycji
- Mogę kliknąć na nazwę produktu i edytować ją inline
- Mogę kliknąć na cenę i edytować ją inline
- Mam przycisk usuwania dla każdej pozycji
- System waliduje, że cena jest większa od 0
- System waliduje, że nazwa nie jest pusta
- Widzę informację o dacie (automatycznie przypisanej jako dzisiejsza)
- Mam przycisk "Klasyfikuj wszystkie" po zakończeniu edycji

#### US-004: Automatyczna klasyfikacja batch wszystkich pozycji
Tytuł: Grupowa klasyfikacja wydatków

Opis: Jako użytkownik, chcę aby system automatycznie przypisał kategorie do wszystkich pozycji z paragonu jednocześnie, aby nie musieć klasyfikować każdej pozycji osobno.

Kryteria akceptacji:
- Mam przycisk "Klasyfikuj wszystkie" po przeglądzie pozycji
- System wysyła wszystkie pozycje do AI jednocześnie
- Widzę progress indicator podczas klasyfikacji
- System przypisuje kategorie automatycznie do każdej pozycji
- Mogę przejrzeć przypisane kategorie przed zapisem
- Mogę ręcznie skorygować każdą kategorię
- Widzę podsumowanie wszystkich wydatków przed zapisem

### 5.2. Scenariusze alternatywne

#### US-005: Obsługa błędu OCR
Tytuł: Niepowodzenie rozpoznawania paragonu

Opis: Jako użytkownik, gdy system nie może odczytać danych ze zdjęcia paragonu, chcę otrzymać jasną informację o problemie i opcje dalszego działania, aby nie stracić czasu i móc kontynuować dodawanie wydatków.

Kryteria akceptacji:
- Gdy OCR nie powiedzie się, widzę komunikat "Nie udało się odczytać danych ze zdjęcia"
- Otrzymuję wskazówki typu "Upewnij się, że paragon jest wyraźny i dobrze oświetlony"
- Mam opcję "Spróbuj ponownie" (powrót do kamery)
- Mam opcję "Dodaj ręcznie" (przejście do standardowego formularza)
- System nie przechowuje zdjęcia po niepowodzeniu
- Error jest logowany dla celów debugowania

#### US-006: Obsługa timeout podczas przetwarzania
Tytuł: Zbyt długie przetwarzanie

Opis: Jako użytkownik, gdy analiza paragonu trwa zbyt długo, chcę być poinformowany o problemie i mieć opcje kontynuacji, aby nie czekać w nieskończoność.

Kryteria akceptacji:
- Po 30 sekundach widzę komunikat "Analiza trwa zbyt długo"
- Otrzymuję sugestię "Spróbuj ponownie lub dodaj wydatki ręcznie"
- Mam opcję "Spróbuj ponownie" z nowym zdjęciem
- Mam opcję "Dodaj ręcznie" z przejściem do standardowego formularza
- System automatycznie anuluje długotrwałe zapytanie do API
- Widzę pozostały czas do timeout'u podczas przetwarzania

#### US-007: Brak rozpoznanych pozycji na paragonie
Tytuł: Pusty wynik OCR

Opis: Jako użytkownik, gdy system nie znajdzie żadnych pozycji na paragonie, chcę być poinformowany o problemie i mieć możliwość ponowienia lub manualnego dodania.

Kryteria akceptacji:
- Gdy nie znajdzie pozycji, widzę komunikat "Nie znaleziono pozycji na paragonie"
- Otrzymuję sugestię "Sprawdź zdjęcie i spróbuj ponownie"
- Mam opcję "Spróbuj ponownie" z nowym zdjęciem
- Mam opcję "Dodaj ręcznie" z przejściem do standardowego formularza
- Widzę wskazówki dotyczące lepszej jakości zdjęcia
- System nie zapisuje pustego wyniku

#### US-008: Błąd podczas zapisywania wydatków
Tytuł: Niepowodzenie zapisu batch wydatków

Opis: Jako użytkownik, gdy system nie może zapisać wszystkich wydatków z paragonu, chcę być poinformowany które pozycje się zapisały, a które nie, aby móc dokończyć proces ręcznie.

Kryteria akceptacji:
- Gdy zapis częściowo się nie powiedzie, widzę szczegółowy komunikat błędu
- System pokazuje które pozycje zostały zapisane pomyślnie
- System pokazuje które pozycje wymagają ponowienia
- Mam opcję ponowienia zapisu tylko dla nieudanych pozycji
- Mam opcję manualnego dodania nieudanych pozycji
- System nie duplikuje pomyślnie zapisanych pozycji

### 5.3. Scenariusze skrajne

#### US-009: Brak dostępu do kamery
Tytuł: Niedostępność kamery urządzenia

Opis: Jako użytkownik na urządzeniu bez kamery lub z zablokowanymi uprawnieniami, chcę być poinformowany o problemie i mieć alternatywną opcję dodawania wydatków.

Kryteria akceptacji:
- System sprawdza dostępność kamery przed pokazaniem opcji "Dodaj ze zdjęcia"
- Gdy kamera niedostępna, opcja jest ukryta lub nieaktywna
- Widzę komunikat "Kamera niedostępna na tym urządzeniu"
- Jestem automatycznie przekierowywany do manualnego formularza
- System wykrywa blokadę uprawnień i prosi o ich przyznanie
- W przypadku odmowy uprawnień, widzę instrukcję jak je włączyć w ustawieniach

#### US-010: Zbyt duży rozmiar zdjęcia
Tytuł: Problemy z kompresją obrazu

Opis: Jako użytkownik, gdy zdjęcie paragonu jest zbyt duże lub nie może być skompresowane, chcę być poinformowany o problemie i mieć opcje rozwiązania.

Kryteria akceptacji:
- System sprawdza rozmiar zdjęcia przed wysłaniem do OCR
- Gdy zdjęcie >2MB po kompresji, widzę komunikat o problemie
- Otrzymuję sugestię zrobienia nowego zdjęcia z mniejszą rozdzielczością
- Mam opcję spróbowania ponownie z nowym zdjęciem
- Mam opcję przejścia do manualnego dodawania
- System loguje błędy kompresji dla celów debugowania

#### US-011: Słaba jakość połączenia internetowego
Tytuł: Problemy z połączeniem podczas OCR

Opis: Jako użytkownik z powolnym internetem, chcę widzieć postęp przetwarzania i mieć możliwość anulowania długotrwałych operacji.

Kryteria akceptacji:
- Widzę progress indicator z szacowanym czasem pozostałym
- Mam przycisk "Anuluj" podczas przetwarzania OCR i klasyfikacji
- System automatycznie timeout'uje po 30 sekundach
- Po anulowaniu mogę spróbować ponownie lub dodać ręcznie
- Widzę komunikat o słabym połączeniu gdy detectowana jest niska prędkość
- System optymalizuje rozmiar wysyłanych danych

#### US-012: Paragon ze skrajnie wieloma pozycjami
Tytuł: Obsługa dużych paragonów

Opis: Jako użytkownik z paragonem zawierającym bardzo dużo pozycji (>50), chcę aby system radził sobie z takimi przypadkami bez problemów wydajnościowych.

Kryteria akceptacji:
- System przetwarza paragony do 100 pozycji
- Widzę progress indicator przy klasyfikacji dużej liczby pozycji
- Interface pozostaje responsywny przy scrollowaniu przez listę pozycji
- Mam opcję usunięcia multiple pozycji za jednym razem (select all)
- System paguje pozycje gdy >20 pozycji na stronie
- Bulk operations nie blokują UI

### 5.4. Scenariusze bezpieczeństwa i uwierzytelniania

#### US-013: Weryfikacja uprawnień użytkownika
Tytuł: Dostęp tylko dla zalogowanych użytkowników

Opis: Jako system, muszę upewnić się że funkcjonalność OCR jest dostępna tylko dla zalogowanych i uwierzytelnionych użytkowników aplikacji.

Kryteria akceptacji:
- Opcja "Dodaj ze zdjęcia" jest widoczna tylko dla zalogowanych użytkowników
- System sprawdza ważność sesji przed umożliwieniem dostępu do kamery
- Gdy sesja wygasła, użytkownik jest przekierowywany do logowania
- Po ponownym zalogowaniu, użytkownik może kontynuować process OCR
- Wszystkie API calls zawierają ważny token uwierzytelniania
- System loguje próby nieautoryzowanego dostępu

#### US-014: Ochrona danych z paragonów
Tytuł: Bezpieczne przetwarzanie wrażliwych danych

Opis: Jako użytkownik, chcę mieć pewność że moje zdjęcia paragonów są bezpiecznie przetwarzane i nie są przechowywane bez mojej wiedzy.

Kryteria akceptacji:
- System natychmiast usuwa zdjęcie po otrzymaniu wyników OCR
- Dane z paragonów są przesyłane przez szyfrowane połączenia (HTTPS)
- Nie ma opcji zapisywania zdjęć w aplikacji lub chmurze
- System informuje użytkownika że zdjęcia nie są przechowywane
- W przypadku błędu OCR, zdjęcie również jest usuwane
- Logi systemu nie zawierają wrażliwych danych z paragonów

#### US-015: Obsługa błędów autoryzacji w trakcie procesu
Tytuł: Wygaśnięcie sesji podczas OCR

Opis: Jako użytkownik, gdy moja sesja wygaśnie w trakcie przetwarzania paragonu, chcę móc bezpiecznie kontynuować po ponownym zalogowaniu bez utraty danych.

Kryteria akceptacji:
- Gdy sesja wygaśnie podczas OCR, widzę komunikat o konieczności ponownego logowania
- Po zalogowaniu mogę kontynuować z rozpoznanych już pozycji
- System tymczasowo przechowuje rozpoznane pozycje (bez zdjęcia) w sesji
- Dane pozycji są automatycznie czyszczone po 10 minutach nieaktywności
- Po ponownym logowaniu mogę dokończyć klasyfikację i zapis
- System nie duplikuje wydatków po ponownym logowaniu
