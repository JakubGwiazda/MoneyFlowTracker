import type { IOcrProvider } from './ocr-provider.interface.ts';
import type { OcrProviderConfig } from '../types/ocr.types.ts';
import { OpenRouterOcrProvider } from './openrouter/openrouter-ocr-provider.ts';
import { VeryfiOcrProvider } from './veryfi/veryfi-ocr-provider.ts';

export type OcrProviderType = 'openrouter' | 'veryfi';

/**
 * Factory do tworzenia odpowiednich providerów OCR
 * Implementuje Factory Pattern
 */
export class OcrProviderFactory {
  /**
   * Tworzy providera na podstawie typu i konfiguracji
   */
  static createProvider(type: OcrProviderType, config: OcrProviderConfig): IOcrProvider {
    switch (type.toLowerCase()) {
      case 'openrouter':
        return new OpenRouterOcrProvider(config);

      case 'veryfi':
        return new VeryfiOcrProvider(config);

      default:
        throw new Error(`Unknown OCR provider type: ${type}`);
    }
  }

  /**
   * Tworzy providera na podstawie zmiennych środowiskowych
   * Domyślnie: OpenRouter
   */
  static createProviderFromEnv(): IOcrProvider {
    const providerType = Deno.env.get('OCR_PROVIDER') as OcrProviderType;
    const VERIFY_API_KEY = Deno.env.get('VERIFY_API_KEY');
    const VERIFY_CLIENT_ID = Deno.env.get('VERIFY_CLIENT_ID');
    const VERIFY_CLIENT_NAME = Deno.env.get('VERIFY_CLIENT_NAME');
    // Konfiguracja dla OpenRouter
    if (providerType === 'openrouter') {
      return this.createProvider('openrouter', {
        apiKey: Deno.env.get('OPENROUTER_API_KEY'),
        endpoint: Deno.env.get('SUPA_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      });
    }

    // Konfiguracja dla Veryfi
    if (providerType === 'veryfi') {
      return this.createProvider('veryfi', {
        apiKey: VERIFY_API_KEY,
        clientId: VERIFY_CLIENT_ID,
        clientName: VERIFY_CLIENT_NAME,
      });
    }

    throw new Error(`Unsupported OCR provider: ${providerType}`);
  }

  /**
   * Lista dostępnych providerów
   */
  static getAvailableProviders(): OcrProviderType[] {
    return ['openrouter', 'veryfi'];
  }
}
