# 🚀 Przewodnik Deployment do Firebase Hosting

## 📋 Podsumowanie konfiguracji

### ✅ Co zostało naprawione:

1. **Zmienne środowiskowe** - Usunięto `process.env` (nie działa w Angular production build)
2. **Konfiguracja production** - Używamy `build:prod` zamiast `build:local`
3. **GitHub Actions** - Dodano `npm ci` dla czystej instalacji zależności
4. **Klucze Supabase** - Hardcoded w każdym environment (anon key jest bezpieczny)

---

## 🔧 Komendy deployment

### 1️⃣ Build lokalny + deploy ręczny

```bash
# Build produkcyjny
npm run build:prod

# Deploy do Firebase
firebase deploy
```

### 2️⃣ Automatyczny deployment przez GitHub Actions

```bash
# Push do master - automatyczny deploy
git push origin master

# Pull Request - preview deployment
# (automatycznie tworzy preview URL)
```

---

## 📁 Środowiska (Environments)

### `environment.ts` (default development)

- Używane: `ng serve` bez flagi
- Production: `false`
- Klucze: hardcoded

### `environment.local.ts` (local development)

- Używane: `npm run start:local`
- Production: `false`
- Klucze: hardcoded

### `environment.prod.ts` (production)

- Używane: `npm run build:prod`
- Production: `true`
- Klucze: hardcoded (Supabase anon key jest bezpieczny)

### `environment.e2e.ts` (E2E tests)

- Używane: `npm run test:e2e`
- Production: `false`

---

## 🔒 Bezpieczeństwo

### ✅ Bezpieczne do commitowania:

- `supabaseUrl` - publiczny URL
- `supabaseKey` - **anon key** (klucz publiczny z RLS)

### ❌ NIGDY nie commituj:

- `service_role` key (pełne uprawnienia)
- `openRouterApiKey` (jeśli używasz - powinien być w Supabase Edge Function)
- Hasła, tokeny JWT użytkowników

---

## 🌐 Firebase Hosting Configuration

### `firebase.json`

```json
{
  "hosting": {
    "public": "dist",                    // Folder z buildem
    "ignore": [...],
    "rewrites": [
      {
        "source": "**",                  // SPA routing
        "destination": "/index.html"     // Wszystko → index.html
      }
    ]
  }
}
```

**Ważne:** Rewrites są konieczne dla Angular routing (SPA)

---

## 🎯 Najlepsze praktyki

### ✅ DO:

- Używaj `npm run build:prod` przed deployment
- Testuj lokalnie: `npm run start:prod`
- Sprawdź wielkość bundle: Angular pokazuje rozmiary po build
- Używaj Angular optimizations (już skonfigurowane w `angular.json`)

### ❌ DON'T:

- NIE używaj `npm run build` (to alias do `build:local`)
- NIE commituj `dist/` do repo
- NIE deployuj bez testów
- NIE używaj `process.env` w Angular (nie działa w production)

---

## 🐛 Troubleshooting

### Problem: App nie ładuje się po deployment

**Rozwiązanie:** Sprawdź rewrites w `firebase.json`

### Problem: 404 na refresh strony

**Rozwiązanie:** Firebase rewrites muszą być skonfigurowane (już zrobione)

### Problem: Zmienne środowiskowe nie działają

**Rozwiązanie:** Angular nie wspiera `process.env` w production - użyj hardcoded values lub build-time replacement

### Problem: Supabase nie łączy się

**Rozwiązanie:** Sprawdź:

1. Czy `supabaseUrl` i `supabaseKey` są poprawne
2. Czy RLS policies są skonfigurowane w Supabase
3. Console browser (F12) → Network tab → błędy

---

## 📊 Konfiguracja GitHub Actions

### Merge do master (automatic deployment)

```yaml
- uses: actions/checkout@v4
- run: npm ci # Czysta instalacja
- run: npm run build:prod # Build produkcyjny
- uses: FirebaseExtended/action-hosting-deploy@v0
```

### Pull Request (preview deployment)

```yaml
# Tworzy preview URL dla PR
# URL format: https://PROJECT_ID--pr-NUMBER-HASH.web.app
```

---

## 🔗 Użyteczne komendy

```bash
# Lokalny development
npm run start:local        # Port 4200, environment.local.ts

# Build
npm run build:prod         # Produkcyjny build → dist/

# Firebase
firebase login             # Login do Firebase
firebase deploy            # Deploy do production
firebase hosting:channel:deploy preview  # Deploy do preview channel

# Testy
npm run test:e2e          # Playwright E2E tests
```

---

## 📝 Checklist przed deployment

- [ ] Testy przechodzą (`npm test`, `npm run test:e2e`)
- [ ] Linter OK (`npm run lint`)
- [ ] Build działa (`npm run build:prod`)
- [ ] Sprawdzono lokalnie (`npm run start:prod`)
- [ ] Firebase config poprawny (`firebase.json`)
- [ ] Environment variables ustawione (w `environment.prod.ts`)
- [ ] Commit i push do repo

---

## 🎉 Gotowe!

Twoja aplikacja powinna być teraz prawidłowo skonfigurowana dla Firebase Hosting.

**Live URL:** https://moneyflowtracker-8b4c6.web.app
**Firebase Console:** https://console.firebase.google.com/project/moneyflowtracker-8b4c6
