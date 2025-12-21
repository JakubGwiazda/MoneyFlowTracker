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

/**
 * Domyślny model OpenRouter dla OCR
 */
export const DEFAULT_OCR_MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * Domyślne parametry dla OCR
 */
export const DEFAULT_OCR_PARAMS = {
  temperature: 0.1,
  max_tokens: 1000,
};

