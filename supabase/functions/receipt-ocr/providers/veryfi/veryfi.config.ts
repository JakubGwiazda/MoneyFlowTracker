/**
 * Konfiguracja Veryfi OCR Provider
 */

/**
 * Endpoint API Veryfi
 */
export const VERYFI_API_ENDPOINT = 'https://api.veryfi.com/api/v8/partner/documents';

/**
 * Domyślne opcje dla Veryfi OCR
 */
export const DEFAULT_VERYFI_OPTIONS = {
  boost_mode: true, // Szybsze przetwarzanie
  confidence_details: true, // Zwróć poziom pewności
  parse_address: true, // Parsuj adres sprzedawcy
  categories: [], // Można dodać kategoryzację
};

/**
 * Timeout dla requestów Veryfi (ms)
 */
export const VERYFI_TIMEOUT = 30000; // 30 sekund

