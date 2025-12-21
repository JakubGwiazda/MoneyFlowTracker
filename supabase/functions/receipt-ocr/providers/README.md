# OCR Providers - Developer Guide

Ten folder zawiera implementacje różnych providerów OCR dla funkcji `receipt-ocr`.

## 🏗️ Architektura

Implementacja oparta na **Strategy Pattern** - każdy provider implementuje ten sam interfejs, co pozwala na łatwe przełączanie między nimi.

## 📁 Struktura

```
providers/
├── ocr-provider.interface.ts    # Interfejs IOcrProvider
├── base-ocr-provider.ts          # Abstrakcyjna klasa bazowa
├── ocr-provider.factory.ts       # Factory do tworzenia providerów
│
├── openrouter/                   # OpenRouter (Claude Vision)
│   ├── openrouter-ocr-provider.ts
│   └── openrouter.config.ts
│
└── veryfi/                       # Veryfi API
    ├── veryfi-ocr-provider.ts
    ├── veryfi.config.ts
    ├── veryfi.types.ts
    └── veryfi.mapper.ts
```

## 🔌 Interfejs IOcrProvider

Każdy provider musi implementować:

```typescript
interface IOcrProvider {
  processReceipt(request: OcrRequest): Promise<OcrResponse>;
  validateConfig(): void;
  getProviderName(): string;
  getConfig(): OcrProviderConfig;
}
```

## 🎯 Dodawanie Nowego Providera

### Krok 1: Utwórz folder providera

```bash
mkdir providers/my-provider
```

### Krok 2: Implementuj providera

```typescript
// providers/my-provider/my-provider-ocr-provider.ts
import { BaseOcrProvider } from '../base-ocr-provider.ts';
import type { OcrRequest, OcrResponse } from '../../types/ocr.types.ts';

export class MyProviderOcrProvider extends BaseOcrProvider {
  getProviderName(): string {
    return 'MyProvider';
  }

  validateConfig(): void {
    super.validateConfig(); // Sprawdza API key

    // Dodatkowa walidacja specyficzna dla providera
    if (!this.config.endpoint) {
      throw new Error('MyProvider: endpoint is required');
    }
  }

  async processReceipt(request: OcrRequest): Promise<OcrResponse> {
    try {
      this.log('Processing receipt', {
        userId: request.userId,
        imageSize: request.image.length,
      });

      // 1. Wywołaj API providera
      const response = await fetch(this.config.endpoint!, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: request.image,
          // ... inne parametry
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // 2. Mapuj odpowiedź na standardowy format
      return {
        items: data.items.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        provider: this.getProviderName(),
        metadata: {
          confidence: data.confidence || 0.9,
        },
      };
    } catch (error: any) {
      this.handleError(error, 'processReceipt');
    }
  }
}
```

### Krok 3: Dodaj do Factory

```typescript
// providers/ocr-provider.factory.ts
import { MyProviderOcrProvider } from './my-provider/my-provider-ocr-provider.ts';

export type OcrProviderType = 'openrouter' | 'veryfi' | 'my-provider';

export class OcrProviderFactory {
  static createProvider(type: OcrProviderType, config: OcrProviderConfig): IOcrProvider {
    switch (type.toLowerCase()) {
      case 'openrouter':
        return new OpenRouterOcrProvider(config);

      case 'veryfi':
        return new VeryfiOcrProvider(config);

      case 'my-provider':
        return new MyProviderOcrProvider(config);

      default:
        throw new Error(`Unknown OCR provider type: ${type}`);
    }
  }

  static createProviderFromEnv(): IOcrProvider {
    const providerType = (Deno.env.get('OCR_PROVIDER') || 'openrouter') as OcrProviderType;

    if (providerType === 'my-provider') {
      return this.createProvider('my-provider', {
        apiKey: Deno.env.get('MY_PROVIDER_API_KEY'),
        endpoint: Deno.env.get('MY_PROVIDER_ENDPOINT'),
      });
    }

    // ... reszta kodu
  }
}
```

### Krok 4: Dodaj zmienne środowiskowe

```bash
# .env
OCR_PROVIDER=my-provider
MY_PROVIDER_API_KEY=your_api_key
MY_PROVIDER_ENDPOINT=https://api.myprovider.com/ocr
```

### Krok 5: Testuj

```bash
# Uruchom lokalnie
supabase functions serve receipt-ocr

# Testuj
curl -X POST http://localhost:54321/functions/v1/receipt-ocr \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"image": "base64_image"}'
```

## 🛠️ Klasa Bazowa (BaseOcrProvider)

Dostarcza wspólną funkcjonalność:

### Logowanie

```typescript
this.log('Processing receipt', { userId: 'abc123' });
// Output: [MyProvider] Processing receipt { userId: 'abc123' }
```

### Obsługa błędów

```typescript
try {
  // ... kod
} catch (error: any) {
  this.handleError(error, 'processReceipt');
  // Automatycznie loguje i rzuca Error z nazwą providera
}
```

### Walidacja

```typescript
validateConfig(): void {
  super.validateConfig(); // Sprawdza API key
  // Dodaj własną walidację
}
```

## 📊 Standardowy Format Odpowiedzi

Każdy provider musi zwrócić:

```typescript
interface OcrResponse {
  items: ExpenseToAdd[];     // WYMAGANE
}

interface ExpenseToAdd {
  name: string;              // WYMAGANE
  amount: number;            // WYMAGANE
  expense_date: string;      // WYMAGANE (ISO 8601 format: YYYY-MM-DD)
  quantity?: number;         // OPCJONALNE
  unit?: string;             // OPCJONALNE (kg, szt, etc.)
}
  unit?: string;             // OPCJONALNE
}

interface OcrMetadata {
  vendor?: VendorInfo;
  total?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  currency?: string;
  confidence?: number;
}
```

## 🎨 Best Practices

### 1. Separacja Logiki

- **Provider** - logika wywołania API
- **Config** - konfiguracja (endpoint, model, parametry)
- **Types** - typy specyficzne dla API providera
- **Mapper** - mapowanie odpowiedzi na standardowy format

### 2. Error Handling

```typescript
try {
  // ... kod
} catch (error: any) {
  // Użyj handleError z klasy bazowej
  this.handleError(error, 'methodName');
}
```

### 3. Logging

```typescript
// Na początku
this.log('Processing receipt', { userId, imageSize });

// Po sukcesie
this.log('Receipt processed successfully', { itemsCount, confidence });
```

### 4. Walidacja

```typescript
validateConfig(): void {
  super.validateConfig(); // Zawsze wywołaj super

  // Sprawdź wymagane pola
  if (!this.config.endpoint) {
    throw new Error(`${this.getProviderName()}: endpoint is required`);
  }
}
```

## 🔍 Przykłady Providerów

### OpenRouter

- Używa Claude 3.5 Sonnet Vision
- Zwraca tylko items + podstawowe metadata
- Konfiguracja: API key + endpoint (Supabase URL)

### Veryfi

- Wyspecjalizowane API do paragonów
- Zwraca bogate metadata (vendor, tax, etc.)
- Konfiguracja: API key
- Mapper konwertuje format Veryfi → standardowy

## 📚 Dodatkowe Zasoby

- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [Factory Pattern](https://refactoring.guru/design-patterns/factory-method)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

## 🤝 Contributing

Przy dodawaniu nowego providera:

1. Postępuj według kroków w sekcji "Dodawanie Nowego Providera"
2. Dodaj testy (jeśli dostępne)
3. Zaktualizuj dokumentację główną (../README.md)
4. Dodaj przykład użycia
5. Porównaj accuracy z innymi providerami
