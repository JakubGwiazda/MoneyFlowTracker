/**
 * Standardowy format żądania OCR
 * Niezależny od providera
 */
export interface OcrRequest {
  image: string; // Base64 encoded image
  userId?: string; // ID użytkownika (do logowania)
  options?: OcrOptions; // Opcjonalne ustawienia
}

/**
 * Opcje przetwarzania OCR
 */
export interface OcrOptions {
  async?: boolean; // Przetwarzanie asynchroniczne
  extractVendor?: boolean; // Czy wyciągać dane sprzedawcy
  extractTotal?: boolean; // Czy wyciągać sumę
  extractDate?: boolean; // Czy wyciągać datę
  language?: string; // Język paragonu (domyślnie 'pl')
}

/**
 * ExpenseToAdd - unified type for expenses being added
 * Used for both manual entry and OCR-extracted items
 */
export interface ExpenseToAdd {
  name: string;
  amount: number;
  expense_date: string;
  quantity?: number;
  unit?: string;
}

/**
 * Metadane z paragonu (opcjonalne)
 */
export interface OcrMetadata {
  vendor?: VendorInfo; // Informacje o sprzedawcy
  total?: number; // Suma z paragonu
  subtotal?: number; // Suma bez VAT
  tax?: number; // VAT
  date?: string; // Data paragonu (ISO 8601)
  currency?: string; // Waluta (PLN, EUR, etc.)
  confidence?: number; // Pewność rozpoznania (0-1)
}

/**
 * Informacje o sprzedawcy
 */
export interface VendorInfo {
  name?: string;
  address?: string;
  taxId?: string; // NIP / VAT number
  phone?: string;
}

/**
 * Konfiguracja providera
 */
export interface OcrProviderConfig {
  apiKey?: string;
  endpoint?: string;
  timeout?: number;
  retries?: number;
  clientId?: string;
  clientName?: string;
}

/**
 * Standardowy format odpowiedzi OCR
 * Zwracany przez wszystkich providerów
 */
export interface OcrResponse {
  items: ExpenseToAdd[];
}
