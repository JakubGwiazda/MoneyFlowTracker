/**
 * Expense Classification Edge Function
 * Classifies expenses using OpenRouter AI
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { handleCors, errorResponse, successResponse } from '../_shared/cors.ts';
import { callOpenRouter, validateApiKey } from '../_shared/openrouter.ts';
import { buildMessages, buildResponseFormat } from './classification.ts';

serve(async req => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Verify authentication
    const { user, supabaseClient } = await verifyAuth(req.headers.get('Authorization'));

    // 2. Validate OpenRouter API key
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    validateApiKey(openRouterApiKey);

    // 3. Parse request payload
    const payload = await req.json();

    // 4. Validate request type
    if (!payload.type || !['single', 'batch'].includes(payload.type)) {
      return errorResponse('Invalid request: type must be single or batch', 400);
    }

    // 5. Validate payload based on type
    if (payload.type === 'single' && !payload.description) {
      return errorResponse('Invalid request: description required for single classification', 400);
    }

    if (payload.type === 'batch' && (!payload.expenses || !Array.isArray(payload.expenses))) {
      return errorResponse(
        'Invalid request: expenses array required for batch classification',
        400
      );
    }

    // 6. Fetch user categories (system categories + user's own categories)
    const { data: categories, error: categoriesError } = await supabaseClient
      .from('categories')
      .select('id, name')
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .eq('is_active', true)
      .order('name');

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return errorResponse('Failed to fetch categories', 500);
    }

    if (!categories || categories.length === 0) {
      return errorResponse('No categories available for classification', 400);
    }

    // 7. Build classification request
    const messages = buildMessages(payload, categories);
    const expectedCount = payload.type === 'batch' ? payload.expenses.length : undefined;
    const responseFormat = buildResponseFormat(payload.type, expectedCount);

    // 8. Log classification request
    console.log('Classification request:', {
      userId: user.id,
      timestamp: new Date().toISOString(),
      model: 'openai/gpt-4o-mini',
      type: payload.type,
      count: expectedCount || 1,
    });

    // 9. Call OpenRouter API
    const data = await callOpenRouter(
      {
        model: 'openai/gpt-4o-mini',
        messages: messages,
        response_format: responseFormat,
        temperature: 0.2,
        max_tokens: payload.type === 'batch' ? 2000 : 500,
        top_p: payload.top_p ?? 1,
        frequency_penalty: payload.frequency_penalty ?? 0,
        presence_penalty: payload.presence_penalty ?? 0,
      },
      openRouterApiKey,
      Deno.env.get('SUPA_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''
    );

    // 10. Log response
    console.log('OpenRouter classification response:', {
      tokens: data.usage,
      model: data.model,
      finishReason: data.choices[0]?.finish_reason,
    });

    // 10.5 Parse and validate the AI response
    try {
      const content = data.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);

        // Validate categoryIds in the response
        if (payload.type === 'batch' && parsed.results) {
          const invalidCategories = parsed.results
            .filter((r: any) => r.categoryId && !categories.some(c => c.id === r.categoryId))
            .map((r: any) => ({ categoryId: r.categoryId, categoryName: r.categoryName }));

          if (invalidCategories.length > 0) {
            console.warn('AI returned invalid category IDs:', invalidCategories);
          }
        } else if (payload.type === 'single' && parsed.categoryId) {
          const categoryExists = categories.some(c => c.id === parsed.categoryId);
          if (!categoryExists) {
            console.warn('AI returned invalid category ID:', {
              categoryId: parsed.categoryId,
              categoryName: parsed.categoryName,
            });
          }
        }
      }
    } catch (parseError) {
      console.error('Error parsing AI response for validation:', parseError);
    }

    // 11. Return success response
    return successResponse(data);
  } catch (error: any) {
    console.error('Expense classification function error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
