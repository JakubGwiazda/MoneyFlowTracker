# Plan Implementacji: OCR Strategy Pattern dla MoneyFlowTracker

**Data:** 18 grudnia 2025  
**Cel:** Wprowadzenie elastycznego systemu obsługi wielu providerów OCR (OpenRouter, Veryfi) z możliwością łatwego przełączania i dodawania nowych.

---

## 🎯 Założenia Biznesowe

1. **Zachowanie obecnego rozwiązania** - OpenRouter Vision (Claude 3.5 Sonnet) pozostaje jako provider
2. **Dodanie Veryfi API** - wyspecjalizowane rozwiązanie do paragonów (100 request/miesiąc w planie darmowym)
3. **Elastyczność** - łatwe przełączanie między providerami przez zmienną środowiskową
4. **Rozszerzalność** - możliwość dodania kolejnych providerów w przyszłości (np. Google Vision, Tesseract)
5. **Fallback** - opcjonalna obsługa failover (jeśli jeden provider zawiedzie, użyj drugiego)

---

## 🏗️ Architektura Rozwiązania

### Strategy Pattern

```
┌─────────────────────────────────────────┐
│     receipt-ocr/index.ts (Endpoint)     │
│  (Edge Function - główny entry point)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      OcrProviderFactory                 │
│  - createProvider(type: string)         │
│  - getProvider(): IOcrProvider          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│      IOcrProvider (Interface)           │
│  + processReceipt(image: string)        │
│  + validateConfig(): void               │
│  + getProviderName(): string            │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
┌────────────────────┐  ┌──────────────────┐
│ OpenRouterProvider │  │  VeryfiProvider  │
│  - callOpenRouter  │  │  - callVeryfi    │
│  - buildMessages   │  │  - mapResponse   │
└────────────────────┘  └──────────────────┘
```

---

## 📁 Struktura Plików

### Nowa struktura w `supabase/functions/receipt-ocr/`

```
receipt-ocr/
├── index.ts                          # Główny endpoint (Edge Function)
├── deno.json                         # Istniejący plik konfiguracyjny
├── ocr.ts                            # DEPRECATED - do usunięcia po migracji
│
├── providers/                        # ✨ NOWY FOLDER
│   ├── ocr-provider.interface.ts    # Interfejs IOcrProvider
│   ├── ocr-provider.factory.ts      # Factory do tworzenia providerów
│   ├── base-ocr-provider.ts         # Abstrakcyjna klasa bazowa
│   │
│   ├── openrouter/                  # Provider OpenRouter
│   │   ├── openrouter-ocr-provider.ts
│   │   ├── openrouter.config.ts     # Konfiguracja modelu, prompty
│   │   └── openrouter.types.ts      # Typy specyficzne dla OpenRouter
│   │
│   └── veryfi/                      # Provider Veryfi
│       ├── veryfi-ocr-provider.ts
│       ├── veryfi.config.ts         # Konfiguracja API, mapowanie
│       ├── veryfi.types.ts          # Typy specyficzne dla Veryfi
│       └── veryfi.mapper.ts         # Mapowanie odpowiedzi Veryfi -> format standardowy
│
└── types/                            # ✨ NOWY FOLDER
    └── ocr.types.ts                 # Wspólne typy OCR (OcrRequest, OcrResponse)
```

---

## 🔧 Szczegółowa Implementacja

### 1. Typy wspólne (`types/ocr.types.ts`)

```typescript
/**
 * Standardowy format żądania OCR
 * Niezależny od providera
 */
export interface OcrRequest {
  image: string; // Base64 encoded image
  userId?: string; // ID użytkownika (do logowania)
  options?: OcrOptions; // Opcjonalne ustawienia
}

/**
 * Opcje przetwarzania OCR
 */
export interface OcrOptions {
  async?: boolean; // Przetwarzanie asynchroniczne
  extractVendor?: boolean; // Czy wyciągać dane sprzedawcy
  extractTotal?: boolean; // Czy wyciągać sumę
  extractDate?: boolean; // Czy wyciągać datę
  language?: string; // Język paragonu (domyślnie 'pl')
}

/**
 * Standardowy format odpowiedzi OCR
 * Zwracany przez wszystkich providerów
 */
export interface OcrResponse {
  items: ReceiptItem[]; // Lista pozycji z paragonu
  metadata?: OcrMetadata; // Dodatkowe metadane
  provider: string; // Nazwa użytego providera
}

/**
 * Pojedyncza pozycja z paragonu
 */
export interface ReceiptItem {
  name: string; // Nazwa produktu
  price: number; // Cena (zawsze w walucie paragonu)
  quantity?: number; // Ilość (jeśli dostępna)
  unit?: string; // Jednostka miary (kg, szt, etc.)
}

/**
 * Metadane z paragonu (opcjonalne)
 */
export interface OcrMetadata {
  vendor?: VendorInfo; // Informacje o sprzedawcy
  total?: number; // Suma z paragonu
  subtotal?: number; // Suma bez VAT
  tax?: number; // VAT
  date?: string; // Data paragonu (ISO 8601)
  currency?: string; // Waluta (PLN, EUR, etc.)
  confidence?: number; // Pewność rozpoznania (0-1)
}

/**
 * Informacje o sprzedawcy
 */
export interface VendorInfo {
  name?: string;
  address?: string;
  taxId?: string; // NIP / VAT number
  phone?: string;
}

/**
 * Konfiguracja providera
 */
export interface OcrProviderConfig {
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
  retries?: number;
}
```

### 2. Interfejs providera (`providers/ocr-provider.interface.ts`)

```typescript
import type { OcrRequest, OcrResponse, OcrProviderConfig } from '../types/ocr.types.ts';

/**
 * Interfejs dla wszystkich providerów OCR
 * Implementuje Strategy Pattern
 */
export interface IOcrProvider {
  /**
   * Główna metoda przetwarzająca obraz paragonu
   * @param request Żądanie OCR ze standardowym formatem
   * @returns Odpowiedź OCR ze standardowym formatem
   * @throws Error jeśli przetwarzanie się nie powiedzie
   */
  processReceipt(request: OcrRequest): Promise<OcrResponse>;

  /**
   * Walidacja konfiguracji providera
   * Sprawdza czy wszystkie wymagane zmienne środowiskowe są ustawione
   * @throws Error jeśli konfiguracja jest nieprawidłowa
   */
  validateConfig(): void;

  /**
   * Zwraca nazwę providera (do logowania i debugowania)
   */
  getProviderName(): string;

  /**
   * Zwraca konfigurację providera
   */
  getConfig(): OcrProviderConfig;
}
```

### 3. Abstrakcyjna klasa bazowa (`providers/base-ocr-provider.ts`)

```typescript
import type { IOcrProvider, OcrProviderConfig } from './ocr-provider.interface.ts';

/**
 * Abstrakcyjna klasa bazowa dla wszystkich providerów
 * Implementuje wspólną logikę (logging, error handling)
 */
export abstract class BaseOcrProvider implements IOcrProvider {
  protected config: OcrProviderConfig;

  constructor(config: OcrProviderConfig) {
    this.config = config;
    this.validateConfig();
  }

  abstract processReceipt(request: OcrRequest): Promise<OcrResponse>;
  abstract getProviderName(): string;

  /**
   * Domyślna walidacja - sprawdza obecność API key
   * Może być nadpisana przez konkretne implementacje
   */
  validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`${this.getProviderName()}: API key is required`);
    }
  }

  getConfig(): OcrProviderConfig {
    return this.config;
  }

  /**
   * Helper do logowania
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.getProviderName()}] ${message}`, data || '');
  }

  /**
   * Helper do obsługi błędów
   */
  protected handleError(error: any, context: string): never {
    this.log(`Error in ${context}:`, error);
    throw new Error(`${this.getProviderName()} error: ${error.message || error}`);
  }
}
```

### 4. OpenRouter Provider (`providers/openrouter/openrouter-ocr-provider.ts`)

```typescript
import { BaseOcrProvider } from '../base-ocr-provider.ts';
import type { OcrRequest, OcrResponse } from '../../types/ocr.types.ts';
import { callOpenRouter } from '../../../_shared/openrouter.ts';
import { buildOcrMessages, buildOcrResponseFormat } from './openrouter.config.ts';

/**
 * Provider dla OpenRouter (Claude Vision)
 * Migracja z obecnego rozwiązania w ocr.ts
 */
export class OpenRouterOcrProvider extends BaseOcrProvider {
  getProviderName(): string {
    return 'OpenRouter';
  }

  validateConfig(): void {
    super.validateConfig();
    // Dodatkowa walidacja specyficzna dla OpenRouter
    if (!this.config.endpoint) {
      throw new Error('OpenRouter: SUPABASE_URL is required');
    }
  }

  async processReceipt(request: OcrRequest): Promise<OcrResponse> {
    try {
      this.log('Processing receipt', {
        userId: request.userId,
        imageSize: request.image.length,
        timestamp: new Date().toISOString(),
      });

      // 1. Buduj wiadomości dla modelu (z ocr.ts)
      const messages = buildOcrMessages(request.image);
      const responseFormat = buildOcrResponseFormat();

      // 2. Wywołaj OpenRouter API
      const data = await callOpenRouter(
        {
          model: 'anthropic/claude-3.5-sonnet',
          messages: messages,
          response_format: responseFormat,
          temperature: 0.1,
          max_tokens: 1000,
        },
        this.config.apiKey!,
        this.config.endpoint!
      );

      // 3. Parsuj odpowiedź
      const content = JSON.parse(data.choices[0]?.message?.content || '{"items":[]}');

      this.log('Receipt processed successfully', {
        tokens: data.usage,
        itemsCount: content.items.length,
      });

      // 4. Zwróć w standardowym formacie
      return {
        items: content.items,
        provider: this.getProviderName(),
        metadata: {
          confidence: 0.85, // OpenRouter nie zwraca confidence
        },
      };
    } catch (error: any) {
      this.handleError(error, 'processReceipt');
    }
  }
}
```

### 5. Veryfi Provider (`providers/veryfi/veryfi-ocr-provider.ts`)

```typescript
import { BaseOcrProvider } from '../base-ocr-provider.ts';
import type { OcrRequest, OcrResponse } from '../../types/ocr.types.ts';
import { mapVeryfiResponse } from './veryfi.mapper.ts';
import type { VeryfiResponse } from './veryfi.types.ts';

/**
 * Provider dla Veryfi API
 * Nowy provider do rozpoznawania paragonów
 */
export class VeryfiOcrProvider extends BaseOcrProvider {
  private readonly VERYFI_ENDPOINT = 'https://api.veryfi.com/api/v8/partner/documents';

  getProviderName(): string {
    return 'Veryfi';
  }

  validateConfig(): void {
    super.validateConfig();
    // Veryfi może wymagać dodatkowych kluczy (client_id, username, etc.)
    // Do doprecyzowania po sprawdzeniu dokumentacji auth
  }

  async processReceipt(request: OcrRequest): Promise<OcrResponse> {
    try {
      this.log('Processing receipt', {
        userId: request.userId,
        imageSize: request.image.length,
        timestamp: new Date().toISOString(),
      });

      // 1. Przygotuj payload dla Veryfi
      const payload = {
        file_data: request.image, // Base64 encoded image
        boost_mode: true, // Szybsze przetwarzanie
        categories: [], // Można dodać kategoryzację
        confidence_details: true, // Zwróć poziom pewności
        parse_address: true, // Parsuj adres sprzedawcy
      };

      // 2. Wywołaj Veryfi API
      const response = await fetch(this.VERYFI_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CLIENT-ID': this.config.apiKey!, // Do doprecyzowania format auth
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Veryfi API error: ${response.status} ${response.statusText}`);
      }

      const veryfiData: VeryfiResponse = await response.json();

      this.log('Receipt processed successfully', {
        itemsCount: veryfiData.line_items?.length || 0,
        vendor: veryfiData.vendor?.name,
        total: veryfiData.total,
      });

      // 3. Mapuj odpowiedź Veryfi na standardowy format
      return mapVeryfiResponse(veryfiData, this.getProviderName());
    } catch (error: any) {
      this.handleError(error, 'processReceipt');
    }
  }
}
```

### 6. Veryfi Mapper (`providers/veryfi/veryfi.mapper.ts`)

```typescript
import type { OcrResponse, ReceiptItem, OcrMetadata } from '../../types/ocr.types.ts';
import type { VeryfiResponse, VeryfiLineItem } from './veryfi.types.ts';

/**
 * Mapuje odpowiedź Veryfi na standardowy format OcrResponse
 */
export function mapVeryfiResponse(veryfiData: VeryfiResponse, providerName: string): OcrResponse {
  // Mapuj pozycje
  const items: ReceiptItem[] = (veryfiData.line_items || []).map((item: VeryfiLineItem) => ({
    name: item.description || 'Unknown',
    price: item.total || 0,
    quantity: item.quantity,
    unit: item.unit_of_measure,
  }));

  // Mapuj metadane
  const metadata: OcrMetadata = {
    vendor: veryfiData.vendor
      ? {
          name: veryfiData.vendor.name,
          address: veryfiData.vendor.address,
          taxId: veryfiData.vendor.vat_number || veryfiData.vendor.reg_number,
          phone: veryfiData.vendor.phone_number,
        }
      : undefined,
    total: veryfiData.total,
    subtotal: veryfiData.subtotal,
    tax: veryfiData.tax,
    date: veryfiData.date,
    currency: veryfiData.currency_code,
    confidence: calculateAverageConfidence(veryfiData),
  };

  return {
    items,
    metadata,
    provider: providerName,
  };
}

/**
 * Oblicza średnią pewność rozpoznania (jeśli Veryfi zwraca confidence scores)
 */
function calculateAverageConfidence(data: VeryfiResponse): number {
  // Do implementacji na podstawie rzeczywistej struktury odpowiedzi Veryfi
  // Może być w data.confidence lub data.line_items[].confidence
  return 0.9; // Placeholder
}
```

### 7. Veryfi Types (`providers/veryfi/veryfi.types.ts`)

```typescript
/**
 * Typy specyficzne dla Veryfi API
 * Na podstawie dokumentacji: https://docs.veryfi.com/api/receipts-invoices/process-a-document/
 */

export interface VeryfiResponse {
  line_items: VeryfiLineItem[];
  vendor?: VeryfiVendor;
  total?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  currency_code?: string;
  // ... pozostałe 50+ pól z dokumentacji Veryfi
}

export interface VeryfiLineItem {
  description?: string;
  total?: number;
  quantity?: number;
  unit_of_measure?: string;
  price?: number;
  sku?: string;
  // ... więcej pól
}

export interface VeryfiVendor {
  name?: string;
  address?: string;
  phone_number?: string;
  vat_number?: string;
  reg_number?: string;
  // ... więcej pól
}

export interface VeryfiRequest {
  file_data?: string; // Base64 image
  file_url?: string; // URL to image
  boost_mode?: boolean;
  async?: boolean;
  categories?: string[];
  confidence_details?: boolean;
  parse_address?: boolean;
  // ... więcej opcji
}
```

### 8. OpenRouter Config (`providers/openrouter/openrouter.config.ts`)

```typescript
/**
 * Konfiguracja OpenRouter OCR
 * Migracja logiki z obecnego ocr.ts
 */

import type { OpenRouterMessage } from '../../../_shared/types.ts';

/**
 * Prompt systemowy dla OCR (zachowany z ocr.ts)
 */
export function buildOcrSystemPrompt(): string {
  return `Jesteś ekspertem w rozpoznawaniu paragonów fiskalnych.
Twoim zadaniem jest wyekstraktowanie wszystkich pozycji zakupowych z obrazu paragonu.

ZASADY:
1. Dla każdej pozycji wyciągnij nazwę produktu i cenę
2. Ignoruj nagłówki, stopki, sumy częściowe, VAT, rabaty
3. Zwróć tylko listę produktów z cenami
4. Jeśli nazwa jest skrócona, spróbuj ją rozwinąć do pełnej nazwy (np. "MLEKO 2%" -> "Mleko 2%")
5. Ceny zawsze jako liczby (bez "zł", "PLN")
6. Jeśli nie możesz odczytać ceny lub nazwy, pomiń tę pozycję
7. Zachowaj kolejność pozycji jak na paragonie

Format odpowiedzi: JSON z tablicą items, gdzie każdy item ma: name (string) i price (number)`;
}

/**
 * Buduje wiadomości dla OpenRouter (zachowane z ocr.ts)
 */
export function buildOcrMessages(imageBase64: string): OpenRouterMessage[] {
  return [
    {
      role: 'system',
      content: buildOcrSystemPrompt(),
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Wyekstraktuj wszystkie pozycje z tego paragonu.',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ],
    },
  ];
}

/**
 * Schema odpowiedzi JSON (zachowana z ocr.ts)
 */
export function buildOcrResponseFormat(): any {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'receipt_items',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nazwa produktu' },
                price: { type: 'number', minimum: 0, description: 'Cena produktu' },
              },
              required: ['name', 'price'],
              additionalProperties: false,
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  };
}
```

### 9. Factory (`providers/ocr-provider.factory.ts`)

```typescript
import type { IOcrProvider, OcrProviderConfig } from './ocr-provider.interface.ts';
import { OpenRouterOcrProvider } from './openrouter/openrouter-ocr-provider.ts';
import { VeryfiOcrProvider } from './veryfi/veryfi-ocr-provider.ts';

export type OcrProviderType = 'openrouter' | 'veryfi';

/**
 * Factory do tworzenia odpowiednich providerów OCR
 * Implementuje Factory Pattern
 */
export class OcrProviderFactory {
  /**
   * Tworzy providera na podstawie typu i konfiguracji
   */
  static createProvider(type: OcrProviderType, config: OcrProviderConfig): IOcrProvider {
    switch (type.toLowerCase()) {
      case 'openrouter':
        return new OpenRouterOcrProvider(config);

      case 'veryfi':
        return new VeryfiOcrProvider(config);

      default:
        throw new Error(`Unknown OCR provider type: ${type}`);
    }
  }

  /**
   * Tworzy providera na podstawie zmiennych środowiskowych
   * Domyślnie: OpenRouter
   */
  static createProviderFromEnv(): IOcrProvider {
    const providerType = (Deno.env.get('OCR_PROVIDER') || 'openrouter') as OcrProviderType;

    // Konfiguracja dla OpenRouter
    if (providerType === 'openrouter') {
      return this.createProvider('openrouter', {
        apiKey: Deno.env.get('OPENROUTER_API_KEY'),
        endpoint: Deno.env.get('SUPA_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      });
    }

    // Konfiguracja dla Veryfi
    if (providerType === 'veryfi') {
      return this.createProvider('veryfi', {
        apiKey: Deno.env.get('VERYFI_API_KEY'),
        // Dodaj inne wymagane klucze Veryfi (CLIENT_ID, etc.)
      });
    }

    throw new Error(`Unsupported OCR provider: ${providerType}`);
  }

  /**
   * Lista dostępnych providerów
   */
  static getAvailableProviders(): OcrProviderType[] {
    return ['openrouter', 'veryfi'];
  }
}
```

### 10. Nowy endpoint (`index.ts`)

```typescript
/**
 * Receipt OCR Edge Function
 * Supports multiple OCR providers (OpenRouter, Veryfi)
 * Version 2.0 - Strategy Pattern implementation
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { handleCors, errorResponse, successResponse } from '../_shared/cors.ts';
import { OcrProviderFactory } from './providers/ocr-provider.factory.ts';
import type { OcrRequest } from './types/ocr.types.ts';

serve(async req => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Verify authentication
    const { user } = await verifyAuth(req.headers.get('Authorization'));

    // 2. Parse request payload
    const payload = await req.json();

    // 3. Validate image payload
    if (!payload.image || typeof payload.image !== 'string') {
      return errorResponse('Invalid request: image (base64) required for OCR', 400);
    }

    // 4. Create OCR provider from environment variables
    const provider = OcrProviderFactory.createProviderFromEnv();

    console.log(`Using OCR provider: ${provider.getProviderName()}`);

    // 5. Build OCR request
    const ocrRequest: OcrRequest = {
      image: payload.image,
      userId: user.id,
      options: {
        extractVendor: true,
        extractTotal: true,
        extractDate: true,
      },
    };

    // 6. Process receipt with selected provider
    const result = await provider.processReceipt(ocrRequest);

    // 7. Log success
    console.log('Receipt processed successfully:', {
      provider: result.provider,
      itemsCount: result.items.length,
      hasMetadata: !!result.metadata,
    });

    // 8. Return standardized response
    return successResponse({
      items: result.items,
      metadata: result.metadata,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('Receipt OCR function error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
```

---

## 🔐 Konfiguracja Zmiennych Środowiskowych

### Istniejące (zachowane)

```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxx
SUPABASE_URL=https://xxx.supabase.co
```

### Nowe (do dodania)

```bash
# Wybór providera OCR (domyślnie: openrouter)
OCR_PROVIDER=openrouter  # lub 'veryfi'

# Klucze API dla Veryfi (opcjonalne, tylko jeśli OCR_PROVIDER=veryfi)
VERYFI_API_KEY=your_veryfi_api_key
VERYFI_CLIENT_ID=your_veryfi_client_id  # jeśli wymagane
VERYFI_USERNAME=your_veryfi_username    # jeśli wymagane
```

### Konfiguracja w `supabase/config.toml`

```toml
[functions.receipt-ocr]
entrypoint = "./functions/receipt-ocr/index.ts"

[functions.receipt-ocr.env]
OCR_PROVIDER = "openrouter"  # Domyślny provider
```

---

## 📝 Migracja z Obecnego Rozwiązania

### Kroki migracji:

1. **Utworzenie nowej struktury folderów**
   - `providers/`, `types/`

2. **Przeniesienie logiki OpenRouter**
   - `ocr.ts` → `providers/openrouter/openrouter.config.ts` (prompty i formatowanie)
   - Logika wywołania → `OpenRouterOcrProvider`

3. **Implementacja Veryfi**
   - Utworzenie `VeryfiOcrProvider` i mapper

4. **Aktualizacja `index.ts`**
   - Zamiana bezpośrednich wywołań na factory pattern

5. **Testing**
   - Testowanie obu providerów
   - Walidacja backwards compatibility

6. **Usunięcie starego kodu**
   - Usuń `ocr.ts` po potwierdzeniu działania

### Backwards Compatibility

Obecny frontend wysyła:

```json
{
  "image": "base64_string"
}
```

Odpowiedź (zgodna z obecną):

```json
{
  "items": [
    { "name": "Mleko", "price": 4.5 },
    { "name": "Chleb", "price": 3.2 }
  ]
}
```

Rozszerzona odpowiedź (opcjonalna, jeśli Veryfi):

```json
{
  "items": [...],
  "metadata": {
    "vendor": {"name": "Biedronka", ...},
    "total": 7.70,
    "date": "2025-12-18",
    "currency": "PLN"
  },
  "provider": "Veryfi"
}
```

**Frontend nie wymaga zmian** - `items` pozostaje w tym samym formacie.

---

## 🚀 Kolejność Implementacji (Etapy)

### Etap 1: Fundament ⭐ (Priorytet: Wysoki)

1. Utworzenie struktury folderów
2. Definicja typów wspólnych (`ocr.types.ts`)
3. Definicja interfejsu (`ocr-provider.interface.ts`)
4. Klasa bazowa (`base-ocr-provider.ts`)

### Etap 2: Migracja OpenRouter ⭐ (Priorytet: Wysoki)

5. `openrouter.config.ts` (przeniesienie logiki z `ocr.ts`)
6. `OpenRouterOcrProvider` (implementacja interfejsu)
7. Testowanie OpenRouter providera

### Etap 3: Factory Pattern ⭐ (Priorytet: Wysoki)

8. `ocr-provider.factory.ts`
9. Aktualizacja `index.ts` (użycie factory)
10. Testowanie backwards compatibility

### Etap 4: Veryfi Implementation 🔶 (Priorytet: Średni)

11. `veryfi.types.ts`
12. `veryfi.mapper.ts`
13. `VeryfiOcrProvider`
14. Testowanie Veryfi providera

### Etap 5: Finalizacja 🔶 (Priorytet: Średni)

15. Dodanie zmiennych środowiskowych
16. Dokumentacja API (README w funkcji)
17. Czyszczenie - usunięcie `ocr.ts`

### Etap 6: Usprawnienia 🔹 (Priorytet: Niski - przyszłość)

18. Fallback mechanism (jeśli Veryfi fail → OpenRouter)
19. Caching odpowiedzi (jeśli ten sam obraz)
20. Monitoring i metryki (success rate, latency)
21. Rate limiting per provider

---

## 💰 Analiza Kosztów

### OpenRouter (Claude 3.5 Sonnet Vision)

- **Koszt:** ~$3.00 per 1M input tokens, ~$15 per 1M output tokens
- **Średnio na obraz:** ~$0.003 - $0.01 (zależnie od rozmiaru)
- **Limit:** Brak twardego limitu (płatne)

### Veryfi (Plan Darmowy)

- **Limit:** 100 paragonów/miesiąc
- **Koszt:** $0 (w ramach limitu)
- **Po przekroczeniu:** Płatne plany od $99/miesiąc

### Strategia:

1. **Domyślnie:** Veryfi (darmowe 100 req/miesiąc)
2. **Po wyczerpaniu limitu:** Automatyczne przełączenie na OpenRouter
3. **Lub:** Użytkownik wybiera providera w ustawieniach

---

## 🎯 Metryki Sukcesu

### Funkcjonalne

- ✅ Oba providery działają poprawnie
- ✅ Łatwe przełączanie przez zmienną środowiskową
- ✅ Frontend nie wymaga zmian
- ✅ Backward compatibility zachowana

### Niefunkcjonalne

- ✅ Czas odpowiedzi < 5s dla obu providerów
- ✅ Accuracy > 90% dla polskich paragonów
- ✅ Kod jest testowalny i maintainable
- ✅ Łatwe dodanie nowego providera w przyszłości

---

## 🔮 Przyszłe Rozszerzenia

### Dodatkowi Providerzy (Candidate List)

1. **Google Cloud Vision API**
   - Świetna accuracy, drogie
2. **AWS Textract**
   - Dobre dla dokumentów, średnio dla paragonów
3. **Tesseract OCR**
   - Open source, darmowe, gorsza accuracy
4. **Azure Computer Vision**
   - Dobra accuracy, Microsoft ecosystem

### Fallback Chain

```typescript
// Przykład przyszłej implementacji
const providers = [
  'veryfi', // Pierwszy wybór (darmowy limit)
  'openrouter', // Fallback 1 (płatny, dobry)
  'tesseract', // Fallback 2 (darmowy, gorszy)
];
```

### Smart Routing

- Prosty paragon → Tesseract (tani)
- Trudny paragon → Veryfi/OpenRouter (dokładny)
- Decyzja na podstawie jakości obrazu (blur detection)

---

## 📚 Dodatkowe Pliki do Utworzenia

### 1. `providers/README.md`

Dokumentacja dla deweloperów:

- Jak dodać nowego providera
- Jak działa factory pattern
- Przykłady użycia

### 2. `supabase/functions/receipt-ocr/README.md`

Dokumentacja funkcji edge:

- Endpoint description
- Request/Response format
- Environment variables
- Examples

### 3. `.env.example` (w głównym katalogu projektu)

```bash
# OCR Configuration
OCR_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-xxxxx
VERYFI_API_KEY=your_key_here
```

---

## ✅ Checklist Implementacji

- [ ] **Etap 1: Fundament**
  - [ ] Utworzyć folder `providers/`
  - [ ] Utworzyć folder `types/`
  - [ ] Zaimplementować `ocr.types.ts`
  - [ ] Zaimplementować `ocr-provider.interface.ts`
  - [ ] Zaimplementować `base-ocr-provider.ts`

- [ ] **Etap 2: Migracja OpenRouter**
  - [ ] Przenieść logikę do `openrouter.config.ts`
  - [ ] Zaimplementować `openrouter-ocr-provider.ts`
  - [ ] Przetestować OpenRouter provider

- [ ] **Etap 3: Factory**
  - [ ] Zaimplementować `ocr-provider.factory.ts`
  - [ ] Zaktualizować `index.ts`
  - [ ] Przetestować backwards compatibility

- [ ] **Etap 4: Veryfi**
  - [ ] Sprawdzić Veryfi authentication (API keys format)
  - [ ] Zaimplementować `veryfi.types.ts`
  - [ ] Zaimplementować `veryfi.mapper.ts`
  - [ ] Zaimplementować `veryfi-ocr-provider.ts`
  - [ ] Przetestować Veryfi provider

- [ ] **Etap 5: Finalizacja**
  - [ ] Dodać zmienne środowiskowe do `config.toml`
  - [ ] Utworzyć `.env.example`
  - [ ] Napisać dokumentację (README.md)
  - [ ] Usunąć stary `ocr.ts`

- [ ] **Etap 6: Testing & Deployment**
  - [ ] Manual testing z prawdziwymi paragonami
  - [ ] Porównanie wyników obu providerów
  - [ ] Deploy do Supabase
  - [ ] Monitoring pierwszych requestów produkcyjnych
