/**
 * Receipt OCR Edge Function
 * Extracts items from receipt images using OpenRouter Vision API
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { handleCors, errorResponse, successResponse } from '../_shared/cors.ts';
import { callOpenRouter, validateApiKey } from '../_shared/openrouter.ts';
import { buildOcrMessages, buildOcrResponseFormat } from './ocr.ts';

serve(async req => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Verify authentication
    const { user } = await verifyAuth(req.headers.get('Authorization'));

    // 2. Validate OpenRouter API key
    const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    validateApiKey(openRouterApiKey);

    // 3. Parse request payload
    const payload = await req.json();

    // 4. Validate image payload
    if (!payload.image || typeof payload.image !== 'string') {
      return errorResponse('Invalid request: image (base64) required for OCR', 400);
    }

    // 5. Log OCR request
    console.log('OCR request:', {
      userId: user.id,
      timestamp: new Date().toISOString(),
      model: 'anthropic/claude-3.5-sonnet',
      imageSize: payload.image.length,
    });

    // 6. Build OCR request
    const messages = buildOcrMessages(payload.image);
    const responseFormat = buildOcrResponseFormat();

    // 7. Call OpenRouter API
    const data = await callOpenRouter(
      {
        model: 'anthropic/claude-3.5-sonnet',
        messages: messages,
        response_format: responseFormat,
        temperature: 0.1,
        max_tokens: 1000,
      },
      openRouterApiKey,
      Deno.env.get('SUPA_URL') ?? Deno.env.get('SUPABASE_URL') ?? ''
    );

    // 8. Log response
    console.log('OpenRouter OCR response:', {
      tokens: data.usage,
      model: data.model,
      finishReason: data.choices[0]?.finish_reason,
      itemsCount: JSON.parse(data.choices[0]?.message?.content || '{"items":[]}').items.length,
    });

    // 9. Return success response
    return successResponse(data);
  } catch (error: any) {
    console.error('Receipt OCR function error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
});
