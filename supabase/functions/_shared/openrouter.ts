/**
 * Shared OpenRouter Client
 * Common OpenRouter API integration utilities
 */

import type { OpenRouterRequest, OpenRouterResponse } from './types.ts';

export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Call OpenRouter API
 * @param request OpenRouter request payload
 * @param apiKey OpenRouter API key
 * @param referer HTTP Referer header value
 * @returns OpenRouter response
 * @throws Error if API call fails
 */
export async function callOpenRouter(
  request: OpenRouterRequest,
  apiKey: string,
  referer: string
): Promise<OpenRouterResponse> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': referer,
      'X-Title': 'MoneyFlowTracker',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenRouter API error:', errorText);
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

/**
 * Validate OpenRouter API key
 * @param apiKey API key to validate
 * @throws Error if API key is missing
 */
export function validateApiKey(apiKey: string | undefined): asserts apiKey is string {
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }
}
