import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, timeout, lastValueFrom } from 'rxjs';
import { ImageCompressionService } from '../image-compression/image-compression.service';
import { AuthService } from '../authorization/auth.service';
import { OcrError, ReceiptItem, OcrResult, OCR_TIMEOUT } from '../../models/receipt';
import { environment } from '../../../environments/environment';

/**
 * ReceiptOcrService
 * Orchestrates the OCR process: compression, API call, response parsing
 */
@Injectable({ providedIn: 'root' })
export class ReceiptOcrService {
  private readonly http = inject(HttpClient);
  private readonly compressionService = inject(ImageCompressionService);
  private readonly authService = inject(AuthService);

  private readonly edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/receipt-ocr`;

  /**
   * Process receipt image and extract items
   * @param imageBlob Receipt image blob
   * @returns OCR result with items or error
   */
  async processReceipt(imageBlob: Blob): Promise<OcrResult> {
    try {
      // 1. Validate image blob
      const validation = this.compressionService.validateImageBlob(imageBlob);
      if (!validation.valid) {
        throw new OcrError(`Invalid image: ${validation.reason}`, 'INVALID_RESPONSE');
      }

      // 2. Compress image
      const compressedBlob = await this.compressionService.compressImage(imageBlob);

      // 3. Convert to base64
      const base64Image = await this.compressionService.blobToBase64(compressedBlob);

      // 4. Build request payload (no type needed - dedicated endpoint)
      const payload = {
        image: base64Image,
      };

      // 5. Get auth token
      const token = await this.authService.getAccessToken();
      if (!token) {
        throw new OcrError('Not authenticated', 'AUTH_ERROR');
      }

      // 6. Call edge function with timeout
      const response = await lastValueFrom(
        this.http
          .post<any>(this.edgeFunctionUrl, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            timeout(OCR_TIMEOUT),
            catchError(error => {
              throw this.handleOcrError(error);
            })
          )
      );

      // 7. Parse and validate response
      const items = this.parseOcrResponse(response);

      return {
        success: true,
        items,
      };
    } catch (error: any) {
      console.error('OCR processing error:', error);

      if (error instanceof OcrError) {
        return {
          success: false,
          items: [],
          error: this.getUserFriendlyError(error),
        };
      }

      return {
        success: false,
        items: [],
        error: 'Nieoczekiwany błąd podczas przetwarzania paragonu',
      };
    }
  }

  /**
   * Parse OCR response and validate items
   * @param response OpenRouter API response
   * @returns Array of receipt items
   */
  private parseOcrResponse(response: any): ReceiptItem[] {
    try {
      // Parse content from OpenRouter response
      const content = response.choices?.[0]?.message?.content;

      if (!content) {
        throw new OcrError('Empty response from OCR', 'INVALID_RESPONSE');
      }

      const parsed = typeof content === 'string' ? JSON.parse(content) : content;

      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new OcrError('Invalid response format', 'INVALID_RESPONSE');
      }

      // Validate and clean items
      const items: ReceiptItem[] = [];
      for (const item of parsed.items) {
        if (!item.name || typeof item.name !== 'string') {
          continue; // Skip invalid items
        }

        const price = Number(item.price);
        if (isNaN(price) || price <= 0) {
          continue; // Skip invalid prices
        }

        items.push({
          name: item.name.trim(),
          price: Math.round(price * 100) / 100, // Round to 2 decimals
        });
      }

      if (items.length === 0) {
        throw new OcrError('No valid items found', 'NO_ITEMS_FOUND');
      }

      return items;
    } catch (error: any) {
      if (error instanceof OcrError) {
        throw error;
      }
      throw new OcrError('Failed to parse OCR response', 'PARSE_ERROR', error);
    }
  }

  /**
   * Handle OCR API errors and convert to OcrError
   * @param error HTTP error or timeout error
   * @returns OcrError instance
   */
  private handleOcrError(error: any): OcrError {
    // Check for timeout
    if (error.name === 'TimeoutError') {
      return new OcrError('OCR processing timeout', 'OCR_TIMEOUT', error);
    }

    // Check for auth errors
    if (error.status === 401 || error.status === 403) {
      return new OcrError('Authentication failed', 'AUTH_ERROR', error);
    }

    // Check for server errors
    if (error.status >= 500) {
      return new OcrError('Server error', 'SERVER_ERROR', error);
    }

    // Generic API error
    return new OcrError('OCR API error', 'OCR_API_ERROR', error);
  }

  /**
   * Convert OcrError to user-friendly message
   * @param error OcrError instance
   * @returns User-friendly error message
   */
  private getUserFriendlyError(error: OcrError): string {
    const errorMessages: Record<string, string> = {
      AUTH_ERROR: 'Sesja wygasła. Zaloguj się ponownie.',
      OCR_TIMEOUT: 'Analiza trwa zbyt długo. Spróbuj ponownie lub dodaj wydatki ręcznie.',
      OCR_API_ERROR: 'Nie udało się przetworzyć paragonu. Spróbuj ponownie.',
      SERVER_ERROR: 'Problem z serwerem. Spróbuj ponownie za chwilę.',
      INVALID_RESPONSE: 'Nie udało się odczytać danych ze zdjęcia.',
      NO_ITEMS_FOUND: 'Nie znaleziono pozycji na paragonie. Upewnij się, że paragon jest wyraźny.',
      PARSE_ERROR: 'Błąd przetwarzania danych. Spróbuj ponownie.',
    };

    return errorMessages[error.code] || error.message;
  }
}
