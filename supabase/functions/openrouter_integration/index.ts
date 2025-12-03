import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');

// Helper functions for building prompts
function buildSystemPrompt(categories: any[]): string {
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

function buildUserPrompt(description: string): string {
  return `Sklasyfikuj następujący wydatek:

Opis: ${description}

Zwróć wynik **tylko w formacie JSON**, bez żadnych dodatkowych komentarzy, opisów ani tekstu.`;
}

function buildBatchSystemPrompt(categories: any[]): string {
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

function buildBatchUserPrompt(expenses: any[]): string {
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

function buildResponseFormat(type: string, expectedCount?: number): any {
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

function buildMessages(payload: any, categories: any[]): any[] {
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

serve(async req => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Weryfikacja autoryzacji
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Weryfikacja tokenu Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SUPA_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPA_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Sprawdzenie API key OpenRouter
    if (!OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Parsowanie requestu
    const payload = await req.json();

    // 5. Walidacja payloadu
    if (!payload.type) {
      return new Response(JSON.stringify({ error: 'Invalid request: type required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.type === 'single' && !payload.description) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request: description required for single classification',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.type === 'batch' && (!payload.expenses || !Array.isArray(payload.expenses))) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request: expenses array required for batch classification',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Pobranie kategorii z bazy danych
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('categories')
      .select('id, name')
      .or('user_id.is.null,user_id.eq.' + user.id)
      .eq('is_active', true)
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch categories' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!categories || categories.length === 0) {
      return new Response(JSON.stringify({ error: 'No categories available for classification' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Budowanie promptów
    const messages = buildMessages(payload, categories);
    const expectedCount = payload.type === 'batch' ? payload.expenses.length : undefined;
    const responseFormat = buildResponseFormat(payload.type, expectedCount);

    // 7. Logowanie requestu
    console.log('Classification request:', {
      userId: user.id,
      timestamp: new Date().toISOString(),
      model: 'openai/gpt-4o-mini',
      type: payload.type,
    });

    // 8. Wywołanie OpenRouter API
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPA_URL') ?? '',
        'X-Title': 'MoneyFlowTracker',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: messages,
        response_format: responseFormat,
        temperature: 0.2,
        max_tokens: payload.type === 'batch' ? 2000 : 500,
        top_p: payload.top_p ?? 1,
        frequency_penalty: payload.frequency_penalty ?? 0,
        presence_penalty: payload.presence_penalty ?? 0,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter API error:', errorText);

      return new Response(
        JSON.stringify({
          error: 'OpenRouter API error',
          details: errorText,
        }),
        {
          status: openRouterResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 9. Zwrócenie odpowiedzi
    const data = await openRouterResponse.json();

    // 10. Logowanie odpowiedzi
    console.log('OpenRouter response:', {
      tokens: data.usage,
      model: data.model,
      finishReason: data.choices[0]?.finish_reason,
    });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      },
    });
  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
