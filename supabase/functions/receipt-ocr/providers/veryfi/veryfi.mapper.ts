import type { OcrResponse, ExpenseToAdd, OcrMetadata } from '../../types/ocr.types.ts';
import type { VeryfiResponse, VeryfiLineItem } from './veryfi.types.ts';

/**
 * Mapuje odpowiedź Veryfi na standardowy format OcrResponse
 */
export function mapVeryfiResponse(veryfiData: VeryfiResponse, providerName: string): OcrResponse {
  // Get current date in ISO format for expense_date
  const expense_date = new Date().toISOString().slice(0, 10);

  // Mapuj pozycje
  const items: ExpenseToAdd[] = (veryfiData.line_items || []).map((item: VeryfiLineItem) => ({
    name: item.description || 'Unknown',
    amount: item.total || 0,
    expense_date,
    quantity: item.quantity,
    unit: item.unit_of_measure,
  }));

  return {
    items,
  };
}

/**
 * Oblicza średnią pewność rozpoznania (jeśli Veryfi zwraca confidence scores)
 */
function calculateAverageConfidence(data: VeryfiResponse): number {
  // Veryfi zwraca confidence na poziomie dokumentu
  if (data.confidence !== undefined) {
    return data.confidence;
  }

  // Fallback - zakładamy wysoką pewność dla Veryfi (wyspecjalizowane narzędzie)
  return 0.9;
}
