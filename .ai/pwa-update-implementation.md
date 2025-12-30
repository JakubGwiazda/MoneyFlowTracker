# Implementacja Automatycznych Aktualizacji PWA

## Przegląd

Zaimplementowano mechanizm automatycznego sprawdzania i aktualizacji aplikacji PWA. System sprawdza dostępność nowych wersji przy każdym otwarciu aplikacji oraz okresowo co 6 godzin.

## Komponenty

### 1. PwaUpdateService (`src/app/services/pwa-update/pwa-update.service.ts`)

Główny serwis zarządzający aktualizacjami PWA.

**Funkcjonalności:**

- Sprawdzanie aktualizacji przy starcie aplikacji
- Okresowe sprawdzanie co 6 godzin
- Nasłuchiwanie na nowe wersje
- Aktywacja i instalacja aktualizacji

**Kluczowe metody:**

- `initializeUpdateChecks()` - inicjalizuje wszystkie mechanizmy sprawdzania
- `checkForUpdate()` - ręczne sprawdzenie dostępności aktualizacji
- `activateUpdate()` - aktywuje nową wersję i przeładowuje aplikację
- `getVersionUpdates()` - Observable z informacjami o nowych wersjach

### 2. PwaUpdateDialogComponent

Dialog informujący użytkownika o dostępnej aktualizacji.

**Pliki:**

- `src/app/components/shared/dialogs/pwa-update-dialog/pwa-update-dialog.component.ts`
- `src/app/components/shared/dialogs/pwa-update-dialog/pwa-update-dialog.component.html`
- `src/app/components/shared/dialogs/pwa-update-dialog/pwa-update-dialog.component.scss`

**Funkcjonalności:**

- Wyświetlanie informacji o dostępnej aktualizacji
- Przycisk "Aktualizuj teraz" - instaluje aktualizację natychmiast
- Przycisk "Później" - zamyka dialog, aktualizacja będzie zainstalowana przy następnym uruchomieniu
- Obsługa błędów z możliwością ponowienia próby
- Spinner podczas instalacji

### 3. AppComponent (`src/app.component.ts`)

Główny komponent aplikacji zintegrowany z systemem aktualizacji.

**Zmiany:**

- Inicjalizacja `PwaUpdateService` w `ngOnInit()`
- Nasłuchiwanie na dostępne aktualizacje
- Automatyczne wyświetlanie dialogu gdy jest dostępna nowa wersja

### 4. Konfiguracja Service Worker (`ngsw-config.json`)

Zaktualizowana konfiguracja z:

- Metadanymi aplikacji (wersja, nazwa, opis)
- Strategią aktualizacji `prefetch` dla głównych zasobów
- Cache dla API z strategią `freshness`

## Jak to działa

### Proces sprawdzania aktualizacji:

1. **Przy starcie aplikacji:**
   - AppComponent inicjalizuje PwaUpdateService
   - Service Worker sprawdza czy jest dostępna nowa wersja
   - Jeśli tak, wyświetlany jest dialog

2. **Okresowo (co 6 godzin):**
   - Automatyczne sprawdzenie w tle
   - Dialog pojawia się tylko jeśli jest nowa wersja

3. **Gdy użytkownik kliknie "Aktualizuj teraz":**
   - Aktywacja nowej wersji Service Workera
   - Automatyczne przeładowanie aplikacji
   - Użytkownik widzi najnowszą wersję

4. **Gdy użytkownik kliknie "Później":**
   - Dialog się zamyka
   - Aktualizacja zostanie zainstalowana przy następnym przeładowaniu

## Testowanie

### Testowanie w środowisku deweloperskim:

**Uwaga:** Service Worker działa tylko w trybie produkcyjnym!

1. **Zbuduj aplikację w trybie produkcyjnym:**

   ```bash
   npm run build:prod
   ```

2. **Uruchom lokalny serwer HTTP:**

   ```bash
   # Zainstaluj http-server globalnie (jednorazowo)
   npm install -g http-server

   # Uruchom serwer z katalogu dist
   http-server dist -p 8080 -c-1
   ```

3. **Otwórz aplikację:**
   - Przejdź do `http://localhost:8080`
   - Otwórz DevTools (F12)
   - Przejdź do zakładki "Application" > "Service Workers"

4. **Symuluj aktualizację:**

   **Metoda 1 - Zmiana wersji:**
   - Zmień wersję w `package.json` (np. z 0.0.1 na 0.0.2)
   - Zmień wersję w `ngsw-config.json`
   - Zbuduj ponownie: `npm run build:prod`
   - Odśwież aplikację
   - Dialog powinien się pojawić

   **Metoda 2 - Wymuszenie aktualizacji w DevTools:**
   - W zakładce "Application" > "Service Workers"
   - Kliknij "Update" przy aktywnym Service Worker
   - Odśwież stronę

### Testowanie na telefonie:

1. **Deploy aplikacji:**
   - Wdróż nową wersję na serwer produkcyjny
   - Upewnij się że aplikacja jest dostępna przez HTTPS

2. **Zainstaluj PWA:**
   - Otwórz aplikację w przeglądarce mobilnej
   - Dodaj do ekranu głównego

3. **Testuj aktualizację:**
   - Zmień wersję i wdróż nową wersję na serwer
   - Otwórz aplikację z ekranu głównego
   - Po kilku sekundach powinien pojawić się dialog z informacją o aktualizacji

### Sprawdzanie w konsoli:

Możesz sprawdzić logi w konsoli przeglądarki:

- "Aplikacja stabilna, sprawdzam aktualizacje..."
- "Dostępna nowa wersja aplikacji" lub "Aplikacja jest aktualna"
- "Nowa wersja dostępna:" (z detalami wersji)

## Konfiguracja

### Zmiana częstotliwości sprawdzania:

W `pwa-update.service.ts`, metoda `schedulePeriodicUpdateChecks()`:

```typescript
const everySixHours$ = interval(6 * 60 * 60 * 1000); // 6 godzin
```

Możesz zmienić na:

- 1 godzina: `interval(1 * 60 * 60 * 1000)`
- 12 godzin: `interval(12 * 60 * 60 * 1000)`
- 1 dzień: `interval(24 * 60 * 60 * 1000)`

### Zmiana strategii aktualizacji:

W `src/main.ts`:

```typescript
provideServiceWorker('ngsw-worker.js', {
  enabled: !isDevMode(),
  registrationStrategy: 'registerWhenStable:30000', // Rejestracja po 30 sekundach od stabilizacji
});
```

Możliwe strategie:

- `'registerWhenStable:30000'` - po stabilizacji + 30s (domyślne)
- `'registerImmediately'` - natychmiast
- `'registerWithDelay:5000'` - po 5 sekundach

## Wersjonowanie

Przy każdym wydaniu nowej wersji aplikacji:

1. Zaktualizuj wersję w `package.json`:

   ```json
   {
     "version": "0.0.2"
   }
   ```

2. Zaktualizuj wersję w `ngsw-config.json`:

   ```json
   {
     "appData": {
       "version": "0.0.2"
     }
   }
   ```

3. Zbuduj i wdróż aplikację

Service Worker automatycznie wykryje zmianę i powiadomi użytkowników.

## Rozwiązywanie problemów

### Dialog się nie pojawia:

1. Sprawdź czy Service Worker jest włączony:
   - DevTools > Application > Service Workers
   - Powinien być status "activated and is running"

2. Sprawdź konsolę czy są błędy

3. Sprawdź czy wersja rzeczywiście się zmieniła:
   ```javascript
   // W konsoli przeglądarki
   navigator.serviceWorker.getRegistration().then(reg => {
     console.log(reg.active);
   });
   ```

### Service Worker się nie aktualizuje:

1. Wymuś aktualizację w DevTools:
   - Application > Service Workers > "Update"

2. Wyczyść cache:
   - Application > Storage > "Clear site data"

3. Sprawdź czy aplikacja jest serwowana przez HTTPS (wymagane dla PWA)

### Aktualizacja nie działa na telefonie:

1. Sprawdź czy aplikacja jest zainstalowana jako PWA (nie tylko zakładka)
2. Zamknij całkowicie aplikację i otwórz ponownie
3. Sprawdź połączenie internetowe
4. Poczekaj kilka minut - Service Worker może potrzebować czasu na wykrycie zmian

## Best Practices

1. **Zawsze testuj aktualizacje przed wdrożeniem**
   - Przetestuj na różnych urządzeniach
   - Sprawdź czy dane użytkownika są zachowane

2. **Używaj semantycznego wersjonowania**
   - MAJOR.MINOR.PATCH (np. 1.2.3)
   - Zwiększaj odpowiednio do typu zmian

3. **Informuj użytkowników o zmianach**
   - Możesz rozszerzyć dialog o changelog
   - Dodaj informacje o nowych funkcjach

4. **Monitoruj proces aktualizacji**
   - Dodaj analytics do śledzenia aktualizacji
   - Monitoruj błędy w procesie aktualizacji

5. **Graceful degradation**
   - Aplikacja powinna działać nawet jeśli Service Worker zawiedzie
   - Zawsze obsługuj błędy

## Przyszłe usprawnienia

Możliwe rozszerzenia funkcjonalności:

1. **Changelog w dialogu**
   - Wyświetlanie listy zmian w nowej wersji

2. **Wymuszenie aktualizacji**
   - Dla krytycznych aktualizacji bezpieczeństwa
   - Dialog bez możliwości zamknięcia

3. **Progres bar**
   - Pokazywanie postępu pobierania aktualizacji

4. **Powiadomienia push**
   - Powiadomienie o dostępnej aktualizacji nawet gdy aplikacja jest zamknięta

5. **Inteligentne sprawdzanie**
   - Sprawdzanie tylko gdy jest połączenie WiFi
   - Unikanie sprawdzania przy słabym sygnale

6. **A/B testing aktualizacji**
   - Stopniowe wdrażanie dla części użytkowników

## Dokumentacja Angular

- [Angular Service Worker](https://angular.dev/ecosystem/service-workers)
- [SwUpdate API](https://angular.dev/api/service-worker/SwUpdate)
- [Service Worker Configuration](https://angular.dev/ecosystem/service-workers/config)
