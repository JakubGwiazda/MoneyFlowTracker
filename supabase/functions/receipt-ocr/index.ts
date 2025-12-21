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
    console.log('Creating OCR provider from environment variables');
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

    // 8. Return standardized response (backwards compatible)
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
