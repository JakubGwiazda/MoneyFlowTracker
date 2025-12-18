# PRD: Funkcjonalność Dodawania Wydatków ze Zdjęć Paragonów

## 1. Overview

### 1.1. Opis Funkcjonalności

Rozszerzenie aplikacji MoneyFlowTracker o możliwość automatycznego dodawania wydatków poprzez zrobienie zdjęcia paragonu. System wykorzystuje OCR do ekstrakcji pozycji zakupowych (nazwa + cena) i automatyczną klasyfikację AI.

### 1.2. Problem Użytkownika

Manualne przepisywanie pozycji z paragonów jest czasochłonne i podatne na błędy. Użytkownicy chcą szybszego sposobu na dodanie wielu wydatków jednocześnie.

### 1.3. Zakres MVP

- ~60 paragonów miesięcznie na użytkownika
- PWA z dostępem do kamery (bez trybu offline)
- Rozszerzenie istniejącej integracji z OpenRouter
- Brak przechowywania zdjęć (usuwane po przetworzeniu)

---

## 2. Decisions & Requirements

### 2.1. Kluczowe Decyzje Architektoniczne

1. **Technologia OCR i Analiza**: Rozszerzenie istniejącej integracji z OpenRouter o możliwości vision/OCR (np. GPT-4 Vision) jako rozwiązanie efektywne kosztowo dla ~60 paragonów miesięcznie.

2. **Storage zdjęć**: Brak przechowywania - zdjęcia są usuwane natychmiast po przetworzeniu i ekstrakcji danych.

3. **User Flow**: Użytkownik robi zdjęcie → analiza OCR → ekran review z edytowalnymi pozycjami → możliwość usunięcia niepotrzebnych pozycji → batch klasyfikacja wszystkich pozycji → zapis wydatków.

4. **Platforma**: Progressive Web App (PWA) z dostępem do kamery przez przeglądarkę. Bez trybu offline. Potencjalna migracja do Capacitor w przyszłości.

5. **Model danych**: Jedno zdjęcie = wiele osobnych wydatków (expenses). Każda pozycja z paragonu to osobny rekord w bazie bez dodatkowych powiązań grupujących.

6. **Zakres danych OCR**: Ekstrakcja tylko nazwy produktu i ceny. Data zakupu przypisywana automatycznie w momencie tworzenia wydatku (ignorowana data z paragonu).

7. **Architektura UI**: Rozszerzenie istniejącego `AddExpenseDialog` o opcję dodawania pozycji ze zdjęcia, z opcjonalną miniaturką przed wysłaniem do weryfikacji ostrości zdjęcia.

8. **Klasyfikacja**: Wykorzystanie istniejącej logiki batch klasyfikacji - wszystkie pozycje z paragonu klasyfikowane jednocześnie.

9. **Edycja pozycji**: Analogiczny interfejs do manualnego dodawania - użytkownik może usuwać wybrane pozycje przed klasyfikacją.

10. **Brak audytu**: Rezygnacja z historii/audytu przetwarzania zdjęć na MVP - dodanie tylko w razie problemów z dokładnością OCR.

### 2.2. Matched Recommendations

1. **Minimalistyczne MVP**: Skupienie się na core functionality - zdjęcie → OCR → review → klasyfikacja → zapis, bez dodatkowych feature'ów.

2. **Reużycie istniejącej architektury**: Maksymalne wykorzystanie obecnych komponentów (`AddExpenseDialog`, logika batch klasyfikacji) zamiast budowania od zera.

3. **Cost-effective approach**: Pojedyncza integracja (OpenRouter) dla zarówno OCR jak i klasyfikacji minimalizuje koszty i złożoność.

4. **Progressive enhancement**: Start od PWA z możliwością późniejszej migracji do native (Capacitor) - iteracyjne podejście.

5. **User control**: Użytkownik ma pełną kontrolę nad danymi przed zapisem - może edytować, usuwać pozycje, weryfikować przed klasyfikacją.

6. **Error resilience**: Jasna komunikacja błędów (nieudane OCR) z możliwością powrotu do manualnego dodawania.

7. **Performance optimization**: Client-side kompresja zdjęć, timeouty, loadery - zapewnienie responsywności aplikacji.

---

## 3. Functional Requirements

### FR-1: Capture Receipt Image

**Priority**: MUST HAVE

**Description**: Użytkownik może otworzyć kamerę urządzenia z poziomu dialog'u dodawania wydatków.

**Acceptance Criteria**:

- Przycisk "Dodaj ze zdjęcia" w `AddExpenseDialog`
- Otwarcie native camera interface przez Media Devices API
- Opcjonalny preview zdjęcia przed wysłaniem do analizy (weryfikacja ostrości)
- Client-side kompresja zdjęcia do optymalnego rozmiaru (max 2MB, 1920x1080px)
- Możliwość ponownego zrobienia zdjęcia

### FR-2: OCR Processing

**Priority**: MUST HAVE

**Description**: Wysłanie zdjęcia do OpenRouter API i ekstrakcja strukturalizowanych danych.

**Acceptance Criteria**:

- Wysłanie skompresowanego zdjęcia do OpenRouter API z vision capabilities
- Ekstrakcja strukturalizowanych danych: nazwa produktu + cena dla każdej pozycji
- Timeout dla operacji OCR: 30 sekund
- Error handling przy nieudanej analizie
- Progress indicator podczas przetwarzania
- Natychmiastowe usunięcie zdjęcia po otrzymaniu odpowiedzi

### FR-3: Review & Edit Interface

**Priority**: MUST HAVE

**Description**: Wyświetlenie listy rozpoznanych pozycji w edytowalnej formie.

**Acceptance Criteria**:

- Wyświetlenie listy rozpoznanych pozycji (nazwa + cena) w edytowalnej tabeli/liście
- Możliwość usunięcia wybranych pozycji przed zapisem
- Możliwość edycji nazwy i ceny każdej pozycji inline
- Automatyczne przypisanie daty bieżącej do wszystkich pozycji
- Walidacja: cena musi być > 0, nazwa nie może być pusta
- Przycisk "Klasyfikuj wszystkie"

### FR-4: Batch Classification

**Priority**: MUST HAVE

**Description**: Wykorzystanie istniejącej logiki batch klasyfikacji dla wszystkich pozycji z paragonu.

**Acceptance Criteria**:

- Wysłanie wszystkich pozycji jednocześnie do AI (OpenRouter)
- Progress indicator podczas klasyfikacji
- Przypisanie kategorii do każdej pozycji automatycznie
- Możliwość ręcznej korekty kategorii przed zapisem
- Wykorzystanie istniejących serwisów klasyfikacji

### FR-5: Bulk Save

**Priority**: MUST HAVE

**Description**: Zapis wszystkich pozycji jako osobne wydatki w systemie.

**Acceptance Criteria**:

- Zapis wszystkich pozycji jako osobne expenses w Supabase
- Brak dodatkowych pól grupujących pozycje z jednego paragonu
- Standardowa walidacja i zapis przez istniejące serwisy
- Success feedback po zapisie
- Error handling przy błędzie zapisu (rollback lub partial save z komunikatem)

---

## 4. User Stories

### US-1: Szybkie Dodanie Wydatków z Paragonu

**Priority**: MUST HAVE

```
JAKO użytkownik aplikacji
CHCĘ zrobić zdjęcie paragonu aparatem telefonu
ABY szybko dodać wszystkie pozycje zakupowe bez ręcznego przepisywania
```

**Kryteria akceptacji:**

- Użytkownik może uruchomić kamerę z dialog'u dodawania wydatków
- Po zrobieniu zdjęcia widzi listę rozpoznanych pozycji
- Może edytować lub usunąć pozycje przed zapisem
- Wszystkie pozycje są automatycznie klasyfikowane
- Pozycje zapisują się jako osobne wydatki w systemie

**Definition of Done:**

- E2E testy pokrywają cały flow
- Dokumentacja użytkownika zaktualizowana
- Performance test dla standardowego paragonu (5-10 pozycji)

### US-2: Weryfikacja Jakości Zdjęcia

**Priority**: SHOULD HAVE

```
JAKO użytkownik
CHCĘ zobaczyć preview zdjęcia przed wysłaniem
ABY upewnić się że paragon jest wyraźny i da się odczytać
```

**Kryteria akceptacji:**

- Po zrobieniu zdjęcia użytkownik widzi miniaturkę/preview
- Może zaakceptować lub zrobić nowe zdjęcie
- Jest informacja o optymalnych warunkach (oświetlenie, ostrość)

### US-3: Obsługa Błędów OCR

**Priority**: MUST HAVE

```
JAKO użytkownik
GDY OCR nie rozpozna danych z paragonu
CHCĘ otrzymać jasną informację i możliwość ponowienia lub manualnego dodania
ABY nie stracić czasu i móc kontynuować pracę
```

**Kryteria akceptacji:**

- Jasny komunikat błędu przy nieudanej analizie
- Możliwość ponowienia zdjęcia
- Możliwość przejścia do manualnego dodawania
- Logowanie błędów dla debugowania

---

## 5. User Flows

### 5.1. Happy Path

1. Użytkownik klika "Dodaj wydatek" na stronie wydatków
2. W dialog'u wybiera opcję "Dodaj ze zdjęcia"
3. Otwiera się kamera urządzenia
4. Robi zdjęcie paragonu
5. (Opcjonalnie) Widzi preview i akceptuje
6. Widzi loader "Analizuję paragon..."
7. System wyświetla listę rozpoznanych pozycji (nazwa + cena)
8. Użytkownik przegląda listę, może usunąć niepotrzebne pozycje
9. Klika "Klasyfikuj wszystkie"
10. Widzi loader "Klasyfikuję wydatki..."
11. System automatycznie przypisuje kategorie
12. Użytkownik przegląda i może poprawić kategorie
13. Klika "Zapisz"
14. Wszystkie pozycje zapisują się jako osobne wydatki
15. Dialog zamyka się, lista wydatków odświeża się

### 5.2. Alternative Path - Błąd OCR

1-6. Jak w happy path 7. System wyświetla błąd: "Nie udało się odczytać danych ze zdjęcia. Upewnij się, że paragon jest wyraźny i dobrze oświetlony." 8. Użytkownik ma opcje: "Spróbuj ponownie" lub "Dodaj ręcznie"

### 5.3. Alternative Path - Timeout

1-6. Jak w happy path 7. Po 30 sekundach: "Analiza trwa zbyt długo. Spróbuj ponownie lub dodaj wydatki ręcznie." 8. Użytkownik może ponowić lub przejść do manualnego dodawania

### 5.4. Alternative Path - No Items Found

1-7. Jak w happy path 8. System wyświetla: "Nie znaleziono pozycji na paragonie. Sprawdź zdjęcie i spróbuj ponownie." 9. Opcje: "Spróbuj ponownie" lub "Dodaj ręcznie"

---

## 6. Technical Architecture

### 6.1. Tech Stack

- **Frontend**: Angular 20 + Signals
- **UI Components**: Angular Material
- **Camera Access**: Media Devices API (PWA)
- **Image Processing**: Canvas API lub browser-image-compression
- **OCR**: OpenRouter API z vision model (GPT-4 Vision lub podobny)
- **Classification**: Istniejąca integracja OpenRouter
- **Database**: Supabase (bez storage zdjęć)

### 6.2. Component Architecture

```
AddExpenseDialog (rozszerzony)
├── Mode selector: "Manual" | "From Receipt"
├── CameraCapture (nowy komponent)
│   ├── Camera preview
│   ├── Capture button
│   ├── Image preview/retry
│   └── Compress & upload
├── ReceiptItemsList (nowy komponent)
│   ├── Editable list of items
│   ├── Remove items functionality
│   ├── Edit name/price inline
│   └── Validation
├── BatchClassification (istniejąca logika)
│   ├── Classify all button
│   ├── Progress indicator
│   └── Category assignment
└── ExpensesList (istniejący komponent)
    ├── Review expenses
    ├── Edit categories
    └── Bulk save
```

### 6.3. New Services

#### ReceiptOcrService

```typescript
interface ReceiptItem {
  name: string;
  price: number;
}

interface OcrResult {
  success: boolean;
  items: ReceiptItem[];
  error?: string;
}

class ReceiptOcrService {
  // Capture image z kamery
  captureImage(): Promise<Blob>;

  // Kompresja obrazu
  compressImage(image: Blob, options: CompressionOptions): Promise<Blob>;

  // Walidacja jakości obrazu (opcjonalna)
  validateImageQuality(image: Blob): Promise<boolean>;

  // Wysłanie do OpenRouter i parsowanie odpowiedzi
  processReceipt(image: Blob): Promise<OcrResult>;

  // Helper do konwersji blob -> base64
  blobToBase64(blob: Blob): Promise<string>;
}
```

#### CameraService

```typescript
class CameraService {
  // Sprawdzenie dostępności kamery
  isCameraAvailable(): Promise<boolean>;

  // Request camera permissions
  requestCameraPermission(): Promise<boolean>;

  // Otwarcie stream kamery
  openCameraStream(): Promise<MediaStream>;

  // Zamknięcie stream
  closeCameraStream(stream: MediaStream): void;

  // Capture frame jako blob
  captureFrame(stream: MediaStream): Promise<Blob>;
}
```

### 6.4. Existing Services to Extend

#### ClassificationService

- Dodać metodę `classifyReceiptItems(items: ReceiptItem[]): Promise<ClassifiedExpense[]>`
- Reużyć istniejącą logikę batch classification

#### ExpenseManagementService

- Dodać metodę `bulkCreateFromReceipt(expenses: ClassifiedExpense[]): Promise<void>`
- Reużyć istniejącą logikę zapisu

### 6.5. Data Flow

```
1. User captures image
   ↓
2. CameraService.captureFrame()
   ↓
3. ReceiptOcrService.compressImage()
   ↓
4. ReceiptOcrService.processReceipt()
   ↓ (HTTP POST to OpenRouter)
5. OpenRouter Vision API
   ↓ (JSON response)
6. Parse to ReceiptItem[]
   ↓
7. Display in ReceiptItemsList
   ↓ (User reviews/edits)
8. ClassificationService.classifyReceiptItems()
   ↓ (HTTP POST to OpenRouter)
9. OpenRouter Classification API
   ↓ (Categories assigned)
10. Display in ExpensesList
   ↓ (User reviews)
11. ExpenseManagementService.bulkCreateFromReceipt()
   ↓ (Bulk INSERT to Supabase)
12. Success feedback & refresh
```

### 6.6. API Integration

#### OpenRouter Vision Endpoint

```typescript
POST https://openrouter.ai/api/v1/chat/completions

Request:
{
  "model": "anthropic/claude-3.5-sonnet", // lub "openai/gpt-4-vision-preview"
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Extract all items from this receipt. For each item, provide the name and price. Return as JSON array with fields: name, price."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,{base64_image}"
          }
        }
      ]
    }
  ],
  "response_format": { "type": "json_object" }
}

Response:
{
  "choices": [
    {
      "message": {
        "content": "{\"items\": [{\"name\": \"Mleko 2%\", \"price\": 3.99}, ...]}"
      }
    }
  ]
}
```

---

## 7. UI/UX Specifications

### 7.1. AddExpenseDialog - Modified

**New Elements:**

- Tab/Toggle switch: "Manual" | "From Receipt"
- "From Receipt" mode shows camera interface
- Smooth transition between modes

### 7.2. Camera Interface

**Layout:**

- Full-screen camera preview (lub large modal)
- Capture button (Material FAB) centered at bottom
- Close/Cancel button top-left
- Tips overlay: "Upewnij się, że paragon jest wyraźny i dobrze oświetlony"

**Image Preview (po zrobieniu zdjęcia):**

- Thumbnail of captured image
- "Użyj tego zdjęcia" (primary action)
- "Zrób nowe zdjęcie" (secondary action)

### 7.3. Receipt Items List

**Layout:**

- Material table lub list z pozycjami
- Columns: Name (editable) | Price (editable) | Actions (delete)
- Empty state: "Nie znaleziono pozycji na paragonie"
- Loading state: Skeleton loader + "Analizuję paragon..."

**Interactions:**

- Click on name/price to edit inline
- Delete button (icon) dla każdej pozycji
- Select all / Deselect all (opcjonalnie)
- "Klasyfikuj wszystkie" button (primary) at bottom

### 7.4. Loading States

**OCR Processing:**

```
[Loader animation]
Analizuję paragon...
Może to potrwać do 30 sekund
```

**Batch Classification:**

```
[Progress bar]
Klasyfikuję wydatki... (3/10)
```

### 7.5. Error Messages

**OCR Failed:**

```
[Error icon]
Nie udało się odczytać danych ze zdjęcia
Upewnij się, że paragon jest wyraźny i dobrze oświetlony

[Spróbuj ponownie] [Dodaj ręcznie]
```

**Timeout:**

```
[Warning icon]
Analiza trwa zbyt długo
Spróbuj ponownie lub dodaj wydatki ręcznie

[Spróbuj ponownie] [Dodaj ręcznie]
```

**No Items Found:**

```
[Info icon]
Nie znaleziono pozycji na paragonie
Sprawdź zdjęcie i spróbuj ponownie

[Spróbuj ponownie] [Dodaj ręcznie]
```

### 7.6. Success Feedback

```
[Success snackbar]
✓ Dodano 8 wydatków z paragonu
```


## 9. Technical Specifications

### 9.1. Image Optimization Parameters

```typescript
const IMAGE_CONFIG = {
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.85, // JPEG quality
  format: 'image/jpeg',
};
```

### 9.2. Timeout Configuration

```typescript
const TIMEOUT_CONFIG = {
  ocrProcessing: 30000, // 30 sekund
  classification: 15000, // 15 sekund (istniejący)
  totalMaxWait: 45000, // 45 sekund total
};
```

### 9.3. OpenRouter Configuration

```typescript
const OPENROUTER_CONFIG = {
  visionModel: 'anthropic/claude-3.5-sonnet', // lub 'openai/gpt-4-vision-preview'
  classificationModel: 'anthropic/claude-3.5-sonnet', // istniejący
  maxTokens: 1000,
  temperature: 0.1, // low temperature dla consistency
};
```

### 9.4. Error Codes

```typescript
enum OcrErrorCode {
  CAMERA_NOT_AVAILABLE = 'CAMERA_NOT_AVAILABLE',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  COMPRESSION_FAILED = 'COMPRESSION_FAILED',
  OCR_TIMEOUT = 'OCR_TIMEOUT',
  OCR_API_ERROR = 'OCR_API_ERROR',
  NO_ITEMS_FOUND = 'NO_ITEMS_FOUND',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
}
```

## 11. Scope Definition

### 11.1. In Scope (MVP)

✅ **Core Functionality:**

- PWA camera access
- Image capture & preview
- Client-side compression
- OCR via OpenRouter vision
- Extraction: nazwa + cena
- Review & edit interface
- Batch classification
- Bulk save
- Basic error handling
- Loading states

✅ **Non-Functional:**

- 30s timeout dla OCR
- 2MB max image size
- > 85% OCR accuracy target
- <$3 monthly cost (60 paragonów)

### 11.2. Out of Scope (Future Iterations)

❌ **Features:**

- Offline mode
- Ilość/waga produktów
- Data z paragonu
- Nazwa sklepu/lokalizacja
- Grupowanie pozycji z jednego paragonu
- Audyt/historia zdjęć
- Zwroty/korekty paragonów
- Multi-receipt batch processing
- Native mobile app (Capacitor)
- Advanced image quality validation

❌ **Optimizations:**

- Client-side OCR fallback
- Image quality AI pre-check
- Auto-retry mechanism
- Caching wyników OCR
- Advanced compression algorithms


---

## 13. Dependencies

### 13.1. External Dependencies

- **OpenRouter API**: Vision model availability & pricing stability
- **Browser APIs**: Media Devices API support (camera access)
- **Supabase**: Database availability & performance

### 13.2. Internal Dependencies

- **ClassificationService**: Existing batch classification logic
- **ExpenseManagementService**: Existing expense creation logic
- **AddExpenseDialog**: Current dialog structure & validation


---

## 14. Open Questions & Decisions Needed

### 14.1. Requires Research

1. **Model Selection**: Który model OpenRouter ma najlepszy stosunek accuracy/cost dla OCR paragonów?
   - Opcje: GPT-4 Vision, Claude 3.5 Sonnet z vision, inne?
   - Action: Pilot testing z przykładowymi paragonami

2. **Structured Output**: Czy wybrany model wspiera structured JSON output czy trzeba parsować tekst?
   - Action: API documentation review + testing

3. **Browser Compatibility**: Które przeglądarki mobilne wspierają Media Devices API?
   - Action: Compatibility matrix, feature detection implementation

4. **Image Quality Validation**: Czy implementować client-side pre-validation (blur, brightness)?
   - Pros: Zaoszczędzi koszty API
   - Cons: Dodatkowa złożoność
   - Action: Cost/benefit analysis

### 14.2. Product Decisions

5. **Multi-language Support**: Czy paragony mogą być w różnych językach?
   - Current assumption: tylko polski
   - Decision needed: nie

6. **VAT/Tax Handling**: Czy rozpoznawać i zapisywać VAT z paragonów?
   - Current: out of scope
   - Decision needed: nie

7. **Rate Limiting**: Czy limitować liczbę skanów na dzień/miesiąc?
   - Pros: Kontrola kosztów, zapobieganie nadużyciom
   - Cons: Może frustrować power users
   - Decision needed: żaden


---


## 16. Post-Launch Plan


### 16.2. Iteration Criteria

**Trigger for v1.1:**

- If OCR accuracy <80% → investigate model or prompt improvements
- If API costs >$0.10/receipt → optimize image compression or model selection
- If adoption rate <20% → UX improvements or user education
- If timeout rate >10% → infrastructure or optimization improvements

### 16.3. Future Enhancements (Backlog)

**High Priority:**

- Ilość/waga produktów (jeśli user feedback wskazuje potrzebę)
- Image quality validation (jeśli costs są problemem)
- Auto-retry mechanism (jeśli timeout rate wysoki)

**Medium Priority:**

- Grupowanie pozycji z jednego paragonu (visual grouping)
- Data z paragonu (override auto-date)
- Nazwa sklepu/lokalizacja (location tagging)
- Multi-receipt batch (productivity boost)

**Low Priority:**

- Native mobile app (Capacitor migration)
- Offline mode
- Advanced analytics (spending by store, etc.)
- Export receipts (PDF, image archive)

