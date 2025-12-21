import { BaseOcrProvider } from '../base-ocr-provider.ts';
import type { OcrRequest, OcrResponse } from '../../types/ocr.types.ts';
import { mapVeryfiResponse } from './veryfi.mapper.ts';
import type { VeryfiResponse, VeryfiRequest, VeryfiError } from './veryfi.types.ts';
import { VERYFI_API_ENDPOINT, DEFAULT_VERYFI_OPTIONS } from './veryfi.config.ts';

/**
 * Provider dla Veryfi API
 * Wyspecjalizowane rozwiązanie do rozpoznawania paragonów
 */
export class VeryfiOcrProvider extends BaseOcrProvider {
  getProviderName(): string {
    return 'Veryfi';
  }

  validateConfig(): void {
    super.validateConfig();

    // Veryfi wymaga dodatkowych kluczy autoryzacji
    // Format auth może się różnić - do weryfikacji z dokumentacją
    if (!this.config.apiKey) {
      throw new Error('Veryfi: API key (CLIENT_ID) is required');
    }
  }

  async processReceipt(request: OcrRequest): Promise<OcrResponse> {
    try {
      this.log('Processing receipt', {
        userId: request.userId,
        imageSize: request.image.length,
        timestamp: new Date().toISOString(),
      });

      // 1. Przygotuj payload dla Veryfi
      const payload: VeryfiRequest = {
        file_data: request.image, // Base64 encoded image
        boost_mode: DEFAULT_VERYFI_OPTIONS.boost_mode,
        confidence_details: DEFAULT_VERYFI_OPTIONS.confidence_details,
        parse_address: DEFAULT_VERYFI_OPTIONS.parse_address,
        categories: DEFAULT_VERYFI_OPTIONS.categories,
      };

      console.log(this.config);
      // 2. Wywołaj Veryfi API
      const response = await fetch(VERYFI_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CLIENT-ID': this.config.clientId!,
          Authorization: `apikey ${this.config.clientName}:${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData: VeryfiError = await response.json().catch(() => ({
          status: 'error',
          error: response.statusText,
        }));

        throw new Error(
          `Veryfi API error: ${response.status} - ${errorData.error || errorData.message || response.statusText}`
        );
      }

      const veryfiData: VeryfiResponse = await response.json();
      console.log('veryfiData: ', veryfiData);
      this.log('Receipt processed successfully', {
        itemsCount: veryfiData.line_items?.length || 0,
        vendor: veryfiData.vendor?.name,
        total: veryfiData.total,
        confidence: veryfiData.confidence,
        items: veryfiData.line_items,
      });

      // 3. Mapuj odpowiedź Veryfi na standardowy format
      return mapVeryfiResponse(veryfiData, this.getProviderName());
    } catch (error: any) {
      this.handleError(error, 'processReceipt');
    }
  }
}
