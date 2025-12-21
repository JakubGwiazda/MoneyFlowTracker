import type { IOcrProvider } from './ocr-provider.interface.ts';
import type { OcrRequest, OcrResponse, OcrProviderConfig } from '../types/ocr.types.ts';

/**
 * Abstrakcyjna klasa bazowa dla wszystkich providerów
 * Implementuje wspólną logikę (logging, error handling)
 */
export abstract class BaseOcrProvider implements IOcrProvider {
  protected config: OcrProviderConfig;

  constructor(config: OcrProviderConfig) {
    this.config = config;
    this.validateConfig();
  }

  abstract processReceipt(request: OcrRequest): Promise<OcrResponse>;
  abstract getProviderName(): string;

  /**
   * Domyślna walidacja - sprawdza obecność API key
   * Może być nadpisana przez konkretne implementacje
   */
  validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`${this.getProviderName()}: API key is required`);
    }
  }

  getConfig(): OcrProviderConfig {
    return this.config;
  }

  /**
   * Helper do logowania
   */
  protected log(message: string, data?: any): void {
    console.log(`[${this.getProviderName()}] ${message}`, data || '');
  }

  /**
   * Helper do obsługi błędów
   */
  protected handleError(error: any, context: string): never {
    this.log(`Error in ${context}:`, error);
    throw new Error(`${this.getProviderName()} error: ${error.message || error}`);
  }
}

