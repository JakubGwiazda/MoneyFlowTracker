/**
 * Typy specyficzne dla Veryfi API
 * Na podstawie dokumentacji: https://docs.veryfi.com/api/receipts-invoices/process-a-document/
 */

export interface VeryfiResponse {
  line_items: VeryfiLineItem[];
  vendor?: VeryfiVendor;
  total?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  currency_code?: string;
  confidence?: number;
  // ... pozostałe 50+ pól z dokumentacji Veryfi
}

export interface VeryfiLineItem {
  description?: string;
  full_description?: string;
  total?: number;
  quantity?: number;
  unit_of_measure?: string;
  price?: number;
}

export interface VeryfiVendor {
  name?: string;
  address?: string;
  phone_number?: string;
  vat_number?: string;
  reg_number?: string;
  category?: string;
  // ... więcej pól
}

export interface VeryfiRequest {
  file_data?: string; // Base64 image
  file_url?: string; // URL to image
  boost_mode?: boolean;
  async?: boolean;
  categories?: string[];
  confidence_details?: boolean;
  parse_address?: boolean;
  // ... więcej opcji
}

/**
 * Veryfi Error Response
 */
export interface VeryfiError {
  status: string;
  error: string;
  message?: string;
}

