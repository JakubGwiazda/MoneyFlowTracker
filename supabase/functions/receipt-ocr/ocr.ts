/**
 * OCR Module
 * Helper functions for receipt OCR processing using OpenRouter Vision API
 */

import type { OpenRouterMessage } from '../_shared/types.ts';

/**
 * Build system prompt for OCR expert
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
 * Build messages array for OCR request
 * @param imageBase64 Base64 encoded image string
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
 * Build JSON schema response format for OCR
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
