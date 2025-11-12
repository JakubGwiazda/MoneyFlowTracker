# OpenRouter AI Classification - Instrukcje Konfiguracji

## Wymagania

1. **Konto OpenRouter**: Zarejestruj się na [openrouter.ai](https://openrouter.ai)
2. **API Key**: Wygeneruj API key w panelu OpenRouter
3. **Supabase CLI**: Zainstaluj Supabase CLI dla deploy edge functions

## Konfiguracja Zmiennych Środowiskowych

### 1. Lokalne środowisko (.env.local)

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 2. Supabase Edge Function Secrets

```bash
# Ustaw secret dla edge function
npx supabase secrets set OPENROUTER_API_KEY=your_openrouter_api_key
```

## Deploy Edge Function

### 1. Zaloguj się do Supabase CLI

```bash
npx supabase login
```

### 2. Link projekt

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
```

### 3. Deploy funkcję

```bash
npx supabase functions deploy openrouter-classify
```

### 4. Weryfikacja

```bash
# Test edge function
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

## Użycie w Aplikacji

### 1. Automatyczne sugerowanie kategorii

Gdy użytkownik wpisuje opis wydatku w formularzu dodawania:
- Po wpisaniu min. 5 znaków system automatycznie sugeruje kategorię
- Sugestia pojawia się z opóźnieniem 500ms (debounce)
- Wyświetlana jest pewność dopasowania i uzasadnienie

### 2. Auto-aplikacja sugestii

- Jeśli pewność > 90% i kategoria istnieje, zostanie automatycznie wybrana
- Użytkownik może ręcznie zastosować sugestię przyciskiem "Zastosuj"
- Dla nowych kategorii dostępny jest przycisk "Utwórz kategorię"

### 3. Rate Limiting

- Maksymalnie 10 zapytań na minutę per użytkownik
- System automatycznie informuje o przekroczeniu limitu
- Implementowany exponential backoff dla retry

## Obsługiwane Modele

Domyślnie używany jest `openai/gpt-4o-mini`, ale można konfigurować:

- `openai/gpt-4o-mini` (szybki, tani)
- `openai/gpt-4o` (dokładniejszy, droższy)
- `anthropic/claude-3-haiku` (alternatywa)

## Monitorowanie

### 1. Logi Edge Function

```bash
# Podgląd logów
npx supabase functions logs openrouter-classify
```

### 2. Metryki w Supabase Dashboard

- Przejdź do Edge Functions → openrouter-classify
- Sprawdź Invocations i Error Rate
- Monitoruj Response Time

## Rozwiązywanie Problemów

### Błąd 401 - Unauthorized

- Sprawdź czy OPENROUTER_API_KEY jest poprawnie ustawiony
- Zweryfikuj czy token Supabase jest ważny

### Błąd 429 - Rate Limit

- Użytkownik przekroczył limit 10 zapytań/minutę
- System automatycznie obsługuje retry z opóźnieniem

### Błąd 500 - Server Error

- Sprawdź logi edge function
- Zweryfikuj konfigurację OpenRouter API

### Timeout Error

- Domyślny timeout to 30 sekund
- Sprawdź połączenie z OpenRouter API
- Rozważ użycie szybszego modelu

## Koszty

Orientacyjne koszty OpenRouter (gpt-4o-mini):
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- Średnio ~100-200 tokenów per klasyfikacja
- Koszt: ~$0.00002-0.00004 per klasyfikacja

## Bezpieczeństwo

- API key nigdy nie jest ujawniony w frontend
- Wszystkie zapytania przechodzą przez Supabase Edge Function
- Autoryzacja przez Supabase JWT token
- Rate limiting zapobiega nadużyciom
- Walidacja danych wejściowych przeciwko XSS/injection
