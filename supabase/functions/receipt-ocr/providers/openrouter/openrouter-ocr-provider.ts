import { BaseOcrProvider } from '../base-ocr-provider.ts';
import type { OcrRequest, OcrResponse } from '../../types/ocr.types.ts';
import { callOpenRouter } from '../../../_shared/openrouter.ts';
import {
  buildOcrMessages,
  buildOcrResponseFormat,
  DEFAULT_OCR_MODEL,
  DEFAULT_OCR_PARAMS,
} from './openrouter.config.ts';

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
          model: DEFAULT_OCR_MODEL,
          messages: messages,
          response_format: responseFormat,
          temperature: DEFAULT_OCR_PARAMS.temperature,
          max_tokens: DEFAULT_OCR_PARAMS.max_tokens,
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

