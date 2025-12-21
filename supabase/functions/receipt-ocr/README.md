# Receipt OCR Edge Function

Funkcja Edge do rozpoznawania paragonów fiskalnych z obrazów. Obsługuje wielu providerów OCR z możliwością łatwego przełączania.

## 🎯 Funkcjonalność

- Ekstrakcja pozycji zakupowych z obrazów paragonów
- Wsparcie dla wielu providerów OCR (Strategy Pattern)
- Automatyczne mapowanie na standardowy format
- Opcjonalne metadane (sprzedawca, suma, data, VAT)

## 🔌 Dostępni Providerzy

### 1. OpenRouter (Claude 3.5 Sonnet Vision)

- **Domyślny provider**
- Model: `anthropic/claude-3.5-sonnet`
- Wysoka dokładność dla polskich paragonów
- Płatny (pay-per-use)

### 2. Veryfi

- Wyspecjalizowane API do paragonów
- Plan darmowy: 100 requestów/miesiąc
- Bogate metadane (vendor, tax, confidence)
- Płatne plany od $99/miesiąc

## 📡 API

### Endpoint

```
POST /functions/v1/receipt-ocr
```

### Request

```json
{
  "image": "base64_encoded_image_string"
}
```

### Response (Standardowy Format)

```json
{
  "items": [
    {
      "name": "Mleko 2%",
      "price": 4.5,
      "quantity": 1,
      "unit": "szt"
    },
    {
      "name": "Chleb razowy",
      "price": 3.2
    }
  ],
  "metadata": {
    "vendor": {
      "name": "Biedronka",
      "address": "ul. Przykładowa 1, Warszawa",
      "taxId": "1234567890"
    },
    "total": 7.7,
    "subtotal": 7.0,
    "tax": 0.7,
    "date": "2025-12-19",
    "currency": "PLN",
    "confidence": 0.92
  },
  "provider": "OpenRouter"
}
```

**Uwaga:** Pole `metadata` jest opcjonalne i zależy od providera:

- **OpenRouter**: Zwraca tylko `items` + podstawowe `metadata.confidence`
- **Veryfi**: Zwraca pełne `metadata` (vendor, total, date, tax, etc.)

## ⚙️ Konfiguracja

### Zmienne Środowiskowe

#### Wybór Providera

```bash
# Domyślnie: openrouter
OCR_PROVIDER=openrouter  # lub 'veryfi'
```

#### OpenRouter

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
SUPABASE_URL=https://your-project.supabase.co
```

#### Veryfi

```bash
VERYFI_API_KEY=your_veryfi_api_key
# Opcjonalnie (jeśli wymagane przez Veryfi):
# VERYFI_CLIENT_ID=your_client_id
# VERYFI_USERNAME=your_username
```

### Konfiguracja w `config.toml`

```toml
[functions.receipt-ocr]
entrypoint = "./functions/receipt-ocr/index.ts"

[functions.receipt-ocr.env]
OCR_PROVIDER = "openrouter"  # Domyślny provider
```

## 🏗️ Architektura

### Strategy Pattern

```
┌─────────────────────────────────┐
│   index.ts (Edge Function)      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   OcrProviderFactory            │
│   - createProviderFromEnv()     │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│   IOcrProvider (Interface)      │
│   + processReceipt()            │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌──────────┐
│OpenRouter│  │  Veryfi  │
│ Provider │  │ Provider │
└──────────┘  └──────────┘
```

### Struktura Plików

```
receipt-ocr/
├── index.ts                      # Główny endpoint
├── deno.json                     # Konfiguracja Deno
├── README.md                     # Ta dokumentacja
│
├── types/                        # Wspólne typy
│   └── ocr.types.ts             # OcrRequest, OcrResponse, ExpenseToAdd
│
└── providers/                    # Implementacje providerów
    ├── ocr-provider.interface.ts # Interfejs IOcrProvider
    ├── base-ocr-provider.ts      # Klasa bazowa
    ├── ocr-provider.factory.ts   # Factory Pattern
    │
    ├── openrouter/               # Provider OpenRouter
    │   ├── openrouter-ocr-provider.ts
    │   └── openrouter.config.ts
    │
    └── veryfi/                   # Provider Veryfi
        ├── veryfi-ocr-provider.ts
        ├── veryfi.config.ts
        ├── veryfi.types.ts
        └── veryfi.mapper.ts
```

## 🔧 Dodawanie Nowego Providera

1. Utwórz folder `providers/your-provider/`
2. Zaimplementuj klasę dziedziczącą po `BaseOcrProvider`
3. Zaimplementuj metody:
   - `processReceipt(request: OcrRequest): Promise<OcrResponse>`
   - `getProviderName(): string`
   - `validateConfig(): void` (opcjonalnie)
4. Dodaj do `OcrProviderFactory.createProvider()`
5. Dodaj typ do `OcrProviderType`

### Przykład

```typescript
import { BaseOcrProvider } from '../base-ocr-provider.ts';
import type { OcrRequest, OcrResponse } from '../../types/ocr.types.ts';

export class MyCustomOcrProvider extends BaseOcrProvider {
  getProviderName(): string {
    return 'MyCustomOCR';
  }

  async processReceipt(request: OcrRequest): Promise<OcrResponse> {
    // Twoja implementacja
    return {
      items: [...],
      provider: this.getProviderName(),
    };
  }
}
```

## 🧪 Testowanie

### Lokalnie (Supabase CLI)

```bash
# Uruchom funkcję lokalnie
supabase functions serve receipt-ocr

# Testuj z curl
curl -X POST http://localhost:54321/functions/v1/receipt-ocr \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_encoded_image"}'
```

### Zmiana Providera

```bash
# Testuj z OpenRouter
OCR_PROVIDER=openrouter supabase functions serve receipt-ocr

# Testuj z Veryfi
OCR_PROVIDER=veryfi supabase functions serve receipt-ocr
```

## 📊 Porównanie Providerów

| Feature          | OpenRouter          | Veryfi                         |
| ---------------- | ------------------- | ------------------------------ |
| **Koszt**        | ~$0.003-0.01/obraz  | 100 free/miesiąc, potem $99/m  |
| **Accuracy**     | Wysoka (Claude 3.5) | Bardzo wysoka (specjalizowane) |
| **Metadane**     | Podstawowe          | Bogate (vendor, tax, etc.)     |
| **Limit**        | Brak (płatne)       | 100/miesiąc (free tier)        |
| **Szybkość**     | ~2-5s               | ~2-4s                          |
| **Polski język** | ✅ Bardzo dobry     | ✅ Dobry                       |

## 🚀 Deployment

### Supabase Production

```bash
# Deploy funkcji
supabase functions deploy receipt-ocr

# Ustaw zmienne środowiskowe
supabase secrets set OCR_PROVIDER=openrouter
supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxxxx
```

### Weryfikacja

```bash
# Sprawdź logi
supabase functions logs receipt-ocr

# Test produkcyjny
curl -X POST https://your-project.supabase.co/functions/v1/receipt-ocr \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"image": "..."}'
```

## 🐛 Troubleshooting

### "API key is required"

- Sprawdź czy ustawiłeś `OPENROUTER_API_KEY` lub `VERYFI_API_KEY`
- Dla OpenRouter sprawdź też `SUPABASE_URL`

### "Unknown OCR provider type"

- Sprawdź wartość `OCR_PROVIDER` (dozwolone: `openrouter`, `veryfi`)
- Domyślnie używany jest `openrouter`

### "Veryfi provider not yet implemented"

- Upewnij się że masz najnowszą wersję kodu
- Sprawdź czy wszystkie pliki z folderu `providers/veryfi/` są wdrożone

### Niska dokładność rozpoznawania

- Sprawdź jakość obrazu (rozdzielczość, ostrość)
- Spróbuj innego providera
- Dla OpenRouter: sprawdź czy obraz jest w base64 JPEG

## 📝 Changelog

### v2.0.0 (2025-12-19)

- ✨ Dodano Strategy Pattern dla wielu providerów
- ✨ Dodano Veryfi provider
- ✨ Rozszerzono format odpowiedzi o metadata
- ♻️ Refaktoryzacja OpenRouter do nowej struktury
- 📚 Pełna dokumentacja API

### v1.0.0

- 🎉 Pierwsza wersja z OpenRouter

## 📄 Licencja

MoneyFlowTracker - Internal Use
