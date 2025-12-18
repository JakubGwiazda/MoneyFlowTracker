/**
 * Classification Module
 * Helper functions for expense classification using OpenRouter API
 */

/**
 * Build system prompt for single expense classification
 * @param categories List of available categories
 */
export function buildSystemPrompt(categories: any[]): string {
  const categoriesList = categories.map(cat => `- ID: ${cat.id}, Nazwa: "${cat.name}"`).join('\n');

  return `Jesteś ekspertem w klasyfikacji wydatków finansowych.
TWOJE ZADANIE:
Na podstawie opisu pojedynczego wydatku dopasuj go do jednej z istniejących kategorii lub, jeśli żadne dopasowanie nie jest wystarczająco pewne, zaproponuj nową kategorię.

---

### LISTA ISTNIEJĄCYCH KATEGORII:
${categoriesList}    
---

### ZASADY KLASYFIKACJI:

1. Oceń, do której z istniejących kategorii wydatek najbardziej pasuje.
2. Jeśli **pewność dopasowania ≥ 0.7**, zwróć identyfikator i nazwę tej kategorii.
3. Jeśli **pewność < 0.7**, zaproponuj **nową nazwę kategorii** zgodną z zasadami poniżej.
4. Oceniaj pewność (confidence) w skali 0–1, uwzględniając:
   - słowa kluczowe w opisie,
   - kontekst zakupu (np. miejsce, usługa, produkt),
   - kwotę transakcji (większe kwoty mogą wskazywać na większe zakupy, np. sprzęt RTV/AGD, samochód itp.).
5. Nowe kategorie muszą być:
   - krótkie (1–3 słowa),
   - jednoznaczne i zrozumiałe,
   - opisowe (np. „Sprzęt fotograficzny", nie „Rzeczy"),
   - w języku polskim.
6. Użyj kategorii „Inne" **tylko wtedy**, gdy żadna z istniejących nie pasuje, a nowa kategoria byłaby zbyt wąska lub unikalna.
7. Zawsze podaj krótkie (1–2 zdania) uzasadnienie wyboru.
8. Zwróć wynik **w formacie JSON**:
`;
}

/**
 * Build user prompt for single expense classification
 * @param description Expense description
 */
export function buildUserPrompt(description: string): string {
  return `Sklasyfikuj następujący wydatek:

Opis: ${description}

Zwróć wynik **tylko w formacie JSON**, bez żadnych dodatkowych komentarzy, opisów ani tekstu.`;
}

/**
 * Build system prompt for batch expense classification
 * @param categories List of available categories
 */
export function buildBatchSystemPrompt(categories: any[]): string {
  const categoriesList = categories.map(cat => `- ID: ${cat.id}, Nazwa: "${cat.name}"`).join('\n');

  return `Jesteś ekspertem w klasyfikacji wydatków finansowych.
TWOJE ZADANIE:
Na podstawie listy wydatków dopasuj każdy z nich do jednej z istniejących kategorii lub, jeśli żadne dopasowanie nie jest wystarczająco pewne, zaproponuj nową kategorię.

---

### LISTA ISTNIEJĄCYCH KATEGORII:
${categoriesList}    
---

### ZASADY KLASYFIKACJI:

1. Dla każdego wydatku oceń, do której z istniejących kategorii najbardziej pasuje.
2. Jeśli **pewność dopasowania ≥ 0.7**, zwróć identyfikator i nazwę tej kategorii.
3. Jeśli **pewność < 0.7**, zaproponuj **nową nazwę kategorii** zgodną z zasadami poniżej.
4. Oceniaj pewność (confidence) w skali 0–1, uwzględniając:
   - słowa kluczowe w opisie,
   - kontekst zakupu (np. miejsce, usługa, produkt),
   - kwotę transakcji (większe kwoty mogą wskazywać na większe zakupy, np. sprzęt RTV/AGD, samochód itp.).
5. Nowe kategorie muszą być:
   - krótkie (1–3 słowa),
   - jednoznaczne i zrozumiałe,
   - opisowe (np. „Sprzęt fotograficzny", nie „Rzeczy"),
   - w języku polskim.
6. Użyj kategorii „Inne" **tylko wtedy**, gdy żadna z istniejących nie pasuje, a nowa kategoria byłaby zbyt wąska lub unikalna.
7. Zawsze podaj krótkie (1–2 zdania) uzasadnienie wyboru dla każdego wydatku.
8. Zwróć wynik **w formacie JSON** jako tablicę obiektów.
9. Zachowaj kolejność wydatków - wynik dla wydatku nr 1 musi być pierwszy w tablicy, itd.
10. Proponowane nazwy nowych kategorii muszą być unikalne i nie powinny być takie same jak nazwy istniejących kategorii.
11. W przypadku nowych kategorii w polu ID oraz category name zwróć null, a uzupelnij pole newCategoryName nazwą nowej kategorii.
`;
}

/**
 * Build user prompt for batch expense classification
 * @param expenses Array of expenses to classify
 */
export function buildBatchUserPrompt(expenses: any[]): string {
  const expensesText = expenses
    .map(
      (exp, idx) =>
        `${idx + 1}. Opis: "${exp.description}", Kwota: ${exp.amount} PLN${exp.date ? `, Data: ${exp.date}` : ''}`
    )
    .join('\n');

  return `Sklasyfikuj następujące ${expenses.length} wydatki:

${expensesText}

WAŻNE: Zwróć tablicę z dokładnie ${expenses.length} wynikami w tej samej kolejności. Każdy wynik musi zawierać pola: categoryId, categoryName, confidence, isNewCategory, reasoning.
Zwróć wynik **tylko w formacie JSON**, bez żadnych dodatkowych komentarzy, opisów ani tekstu.`;
}

/**
 * Build response format for classification
 * @param type Classification type ('single' or 'batch')
 * @param expectedCount Expected count for batch classification
 */
export function buildResponseFormat(type: string, expectedCount?: number): any {
  if (type === 'single') {
    return {
      type: 'json_schema',
      json_schema: {
        name: 'expense_classification',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            categoryId: {
              type: ['string', 'null'],
              description: 'ID dopasowanej kategorii z listy istniejących kategorii',
            },
            categoryName: {
              type: 'string',
              description: 'Nazwa dopasowanej kategorii z listy istniejących kategorii',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Pewność dopasowania w skali 0-1',
            },
            isNewCategory: {
              type: 'boolean',
              description:
                'true jeśli proponowana jest nowa kategoria, false jeśli dopasowano do istniejącej',
            },
            newCategoryName: {
              type: 'string',
              description: 'Proponowana nazwa nowej kategorii',
            },
            reasoning: {
              type: 'string',
              description: 'Krótkie wyjaśnienie decyzji klasyfikacyjnej',
            },
          },
          required: ['categoryId', 'categoryName', 'confidence', 'isNewCategory', 'reasoning'],
          additionalProperties: false,
        },
      },
    };
  }

  // Batch response format
  return {
    type: 'json_schema',
    json_schema: {
      name: 'batch_expense_classification',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            minItems: expectedCount,
            maxItems: expectedCount,
            items: {
              type: 'object',
              properties: {
                categoryId: {
                  type: ['string', 'null'],
                  description: 'ID dopasowanej kategorii lub null dla nowej kategorii',
                },
                categoryName: {
                  type: 'string',
                  description: 'Nazwa dopasowanej kategorii z listy istniejących kategorii',
                },
                confidence: {
                  type: 'number',
                  minimum: 0,
                  maximum: 1,
                  description: 'Pewność dopasowania w skali 0-1',
                },
                isNewCategory: {
                  type: 'boolean',
                  description:
                    'true jeśli proponowana jest nowa kategoria, false jeśli dopasowano do istniejącej',
                },
                reasoning: {
                  type: 'string',
                  description: 'Krótkie wyjaśnienie decyzji klasyfikacyjnej',
                },
                newCategoryName: {
                  type: 'string',
                  description: 'Proponowana nazwa nowej kategorii',
                },
              },
              required: [
                'categoryId',
                'categoryName',
                'confidence',
                'isNewCategory',
                'reasoning',
                'newCategoryName',
              ],
              additionalProperties: false,
            },
          },
        },
        required: ['results'],
        additionalProperties: false,
      },
    },
  };
}

/**
 * Build messages for classification request
 * @param payload Request payload
 * @param categories Available categories
 */
export function buildMessages(payload: any, categories: any[]): any[] {
  if (payload.type === 'single') {
    return [
      {
        role: 'system',
        content: buildSystemPrompt(categories),
      },
      {
        role: 'user',
        content: buildUserPrompt(payload.description),
      },
    ];
  }

  if (payload.type === 'batch') {
    return [
      {
        role: 'system',
        content: buildBatchSystemPrompt(categories),
      },
      {
        role: 'user',
        content: buildBatchUserPrompt(payload.expenses),
      },
    ];
  }

  return [];
}

