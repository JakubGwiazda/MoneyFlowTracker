import type { OcrRequest, OcrResponse, OcrProviderConfig } from '../types/ocr.types.ts';

/**
 * Interfejs dla wszystkich providerów OCR
 * Implementuje Strategy Pattern
 */
export interface IOcrProvider {
  /**
   * Główna metoda przetwarzająca obraz paragonu
   * @param request Żądanie OCR ze standardowym formatem
   * @returns Odpowiedź OCR ze standardowym formatem
   * @throws Error jeśli przetwarzanie się nie powiedzie
   */
  processReceipt(request: OcrRequest): Promise<OcrResponse>;

  /**
   * Walidacja konfiguracji providera
   * Sprawdza czy wszystkie wymagane zmienne środowiskowe są ustawione
   * @throws Error jeśli konfiguracja jest nieprawidłowa
   */
  validateConfig(): void;

  /**
   * Zwraca nazwę providera (do logowania i debugowania)
   */
  getProviderName(): string;

  /**
   * Zwraca konfigurację providera
   */
  getConfig(): OcrProviderConfig;
}

