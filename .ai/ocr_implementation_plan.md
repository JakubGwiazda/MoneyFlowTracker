# Plan Implementacji Funkcjonalności OCR dla MoneyFlowTracker

## 1. Przegląd Architektury

### 1.1. Stack Technologiczny

- **Frontend**: Angular 20 + TypeScript 5 + Angular Material + Signals
- **Backend**: Supabase Edge Functions
- **AI/OCR**: OpenRouter API (GPT-4 Vision / Claude 3.5 Sonnet)
- **Camera Access**: Media Devices API (PWA)
- **Image Processing**: browser-image-compression library

### 1.2. Komponenty Systemu

```
┌─────────────────────────────────────────────────────────────────┐
│                        Angular Frontend                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  AddExpenseDialog (rozszerzony)                                 │
│  ├── Mode Toggle: "Manual" | "From Receipt"                    │
│  ├── CameraCapture Component (nowy)                             │
│  │   ├── Camera preview                                         │
│  │   ├── Image capture & preview                                │
│  │   └── CameraService                                          │
│  ├── ReceiptItemsList Component (nowy)                          │
│  │   ├── Editable items list                                    │
│  │   ├── Inline validation                                      │
│  │   └── Delete items                                           │
│  └── Existing: Classification + Save                            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         Services Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  New Services:                                                  │
│  ├── CameraService (camera access & permissions)               │
│  ├── ImageCompressionService (client-side compression)          │
│  └── ReceiptOcrService (OCR orchestration)                      │
│                                                                 │
│  Existing Services (reuse):                                     │
│  ├── ClassificationService (batch classification)              │
│  ├── ExpenseManagementService (bulk create)                    │
│  └── ExpensesFacadeService (orchestration)                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ HTTPS + Auth Token
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Supabase Edge Function                        │
│                  openrouter_integration (rozszerzona)           │
├─────────────────────────────────────────────────────────────────┤
│  ├── Auth verification                                          │
│  ├── Request validation                                         │
│  ├── Vision API support (NEW)                                   │
│  │   └── Image (base64) + text prompts                         │
│  └── Classification API (existing)                              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               │ OpenRouter API Key
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OpenRouter API                            │
│  ├── Vision Models (GPT-4V / Claude 3.5 Sonnet)                │
│  └── Text Models (classification)                               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3. Data Flow

```
User Flow:
1. Click "Dodaj ze zdjęcia"
2. Camera opens → Capture image
3. Preview & confirm
4. OCR processing (30s timeout)
5. Display editable items list
6. User reviews/edits/deletes items
7. Click "Klasyfikuj wszystkie"
8. Batch classification (existing logic)
9. User reviews categories
10. Click "Zapisz"
11. Bulk save to Supabase
12. Success feedback

Technical Flow:
User → CameraService → ImageCompressionService → ReceiptOcrService
     → Edge Function (Vision) → OpenRouter (OCR)
     → Parse items → ReceiptItemsList
     → ClassificationService → Edge Function (Text) → OpenRouter (Classification)
     → ExpenseManagementService → Supabase
```

---

## 2. Szczegółowa Analiza Komponentów

### 2.1. CameraService

**Cel**: Zarządzanie dostępem do kamery urządzenia, stream'ami wideo i capture'owaniem frame'ów.

**Funkcjonalności**:

1. Sprawdzanie dostępności kamery
2. Żądanie uprawnień do kamery
3. Otwieranie i zamykanie stream'u kamery
4. Capture frame jako Blob

**Wyzwania**:

1. **Browser compatibility**: Nie wszystkie przeglądarki wspierają Media Devices API
   - Rozwiązanie: Feature detection + fallback komunikat
2. **Permissions handling**: Różne przeglądarki różnie obsługują uprawnienia
   - Rozwiązanie: Try-catch + clear user messaging
3. **Memory leaks**: Nie zamknięte stream'y mogą powodować wycieki pamięci
   - Rozwiązanie: Proper cleanup w ngOnDestroy + finalize operators

**Implementacja**:

```typescript
// src/app/services/camera/camera.service.ts

@Injectable({ providedIn: 'root' })
export class CameraService {
  private activeStream = signal<MediaStream | null>(null);

  // Check if camera is available
  async isCameraAvailable(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      return false;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch {
      return false;
    }
  }

  // Request camera permission and open stream
  async openCameraStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (this.activeStream()) {
      throw new CameraError('Camera stream already active', 'STREAM_ACTIVE');
    }

    const defaultConstraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment', // Back camera for mobile
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);

      this.activeStream.set(stream);
      return stream;
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new CameraError('Camera permission denied', 'PERMISSION_DENIED', error);
      } else if (error.name === 'NotFoundError') {
        throw new CameraError('No camera found', 'CAMERA_NOT_FOUND', error);
      } else {
        throw new CameraError('Failed to access camera', 'CAMERA_ERROR', error);
      }
    }
  }

  // Capture current frame as Blob
  captureFrame(stream: MediaStream): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        video.onloadedmetadata = () => {
          // Create canvas for capture
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new CameraError('Failed to get canvas context', 'CANVAS_ERROR'));
            return;
          }

          // Draw current frame
          ctx.drawImage(video, 0, 0);

          // Convert to blob
          canvas.toBlob(
            blob => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new CameraError('Failed to convert canvas to blob', 'BLOB_ERROR'));
              }
            },
            'image/jpeg',
            0.95
          );
        };
      } catch (error) {
        reject(new CameraError('Failed to capture frame', 'CAPTURE_ERROR', error));
      }
    });
  }

  // Close active camera stream
  closeCameraStream(): void {
    const stream = this.activeStream();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      this.activeStream.set(null);
    }
  }
}

// Error handling
export type CameraErrorCode =
  | 'CAMERA_NOT_AVAILABLE'
  | 'PERMISSION_DENIED'
  | 'CAMERA_NOT_FOUND'
  | 'STREAM_ACTIVE'
  | 'CAMERA_ERROR'
  | 'CANVAS_ERROR'
  | 'BLOB_ERROR'
  | 'CAPTURE_ERROR';

export class CameraError extends Error {
  constructor(
    message: string,
    public code: CameraErrorCode,
    public originalError?: any
  ) {
    super(message);
    this.name = 'CameraError';
  }
}
```

---

### 2.2. ImageCompressionService

**Cel**: Client-side kompresja obrazów do optymalnego rozmiaru przed wysłaniem do API.

**Funkcjonalności**:

1. Kompresja JPEG z konfigurowalnymi parametrami
2. Walidacja rozmiaru przed i po kompresji
3. Konwersja Blob ↔ base64

**Wyzwania**:

1. **Quality vs Size tradeoff**: Za duża kompresja obniża jakość OCR
   - Rozwiązanie: Quality 0.85, max 2MB (z testów)
2. **Large images**: Kompresja bardzo dużych obrazów może blokować UI
   - Rozwiązanie: Use Web Worker lub async z yield
3. **Browser support**: Różne przeglądarki mogą mieć różne możliwości kompresji
   - Rozwiązanie: Use library (browser-image-compression)

**Implementacja**:

```typescript
// src/app/services/image-compression/image-compression.service.ts

import imageCompression from 'browser-image-compression';

export const IMAGE_CONFIG = {
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  maxWidthOrHeight: 1920,
  quality: 0.85,
  fileType: 'image/jpeg' as const,
} as const;

@Injectable({ providedIn: 'root' })
export class ImageCompressionService {
  async compressImage(imageBlob: Blob): Promise<Blob> {
    // Validate input
    if (!imageBlob || imageBlob.size === 0) {
      throw new CompressionError('Empty image blob', 'EMPTY_BLOB');
    }

    // Check if already small enough
    if (imageBlob.size <= IMAGE_CONFIG.maxSizeBytes) {
      return imageBlob;
    }

    try {
      const options = {
        maxSizeMB: IMAGE_CONFIG.maxSizeBytes / (1024 * 1024),
        maxWidthOrHeight: IMAGE_CONFIG.maxWidthOrHeight,
        useWebWorker: true,
        fileType: IMAGE_CONFIG.fileType,
        initialQuality: IMAGE_CONFIG.quality,
      };

      const compressedBlob = await imageCompression(imageBlob as File, options);

      // Final size check
      if (compressedBlob.size > IMAGE_CONFIG.maxSizeBytes) {
        throw new CompressionError(
          `Compressed image still too large: ${compressedBlob.size} bytes`,
          'SIZE_EXCEEDED'
        );
      }

      return compressedBlob;
    } catch (error: any) {
      if (error instanceof CompressionError) {
        throw error;
      }
      throw new CompressionError('Image compression failed', 'COMPRESSION_FAILED', error);
    }
  }

  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () =>
        reject(new CompressionError('Failed to convert blob to base64', 'BASE64_ERROR'));
      reader.readAsDataURL(blob);
    });
  }

  async base64ToBlob(base64: string, mimeType: string = 'image/jpeg'): Promise<Blob> {
    try {
      const byteString = atob(base64);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }

      return new Blob([arrayBuffer], { type: mimeType });
    } catch (error) {
      throw new CompressionError('Failed to convert base64 to blob', 'BASE64_ERROR', error);
    }
  }

  getImageDimensions(blob: Blob): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new CompressionError('Failed to load image', 'IMAGE_LOAD_ERROR'));
      };

      img.src = url;
    });
  }
}

export type CompressionErrorCode =
  | 'EMPTY_BLOB'
  | 'SIZE_EXCEEDED'
  | 'COMPRESSION_FAILED'
  | 'BASE64_ERROR'
  | 'IMAGE_LOAD_ERROR';

export class CompressionError extends Error {
  constructor(
    message: string,
    public code: CompressionErrorCode,
    public originalError?: any
  ) {
    super(message);
    this.name = 'CompressionError';
  }
}
```

---

### 2.3. ReceiptOcrService

**Cel**: Orkiestracja całego procesu OCR - kompresja, wysyłanie do API, parsowanie odpowiedzi.

**Funkcjonalności**:

1. Przetwarzanie zdjęcia paragonu → structured data
2. Walidacja i parsowanie odpowiedzi OCR
3. Timeout handling (30s)
4. Error handling i retry logic

**Wyzwania**:

1. **Vision API format**: Różne modele wymagają różnych formatów
   - Rozwiązanie: Unified format dla OpenRouter (base64 w content)
2. **Structured output**: Zapewnienie JSON response
   - Rozwiązanie: Use response_format z json_schema
3. **Timeout management**: 30s może nie wystarczyć dla dużych obrazów
   - Rozwiązanie: Kompresja + explicit timeout w HTTP
4. **Response parsing**: Model może zwrócić nieprawidłowy JSON
   - Rozwiązanie: Walidacja z fallback error handling

**Kluczowe elementy OpenRouter Vision Request**:

```typescript
// Request format dla Vision OCR
{
  model: 'anthropic/claude-3.5-sonnet', // lub 'openai/gpt-4-vision-preview'
  messages: [
    {
      role: 'system',
      content: `Jesteś ekspertem w rozpoznawaniu paragonów fiskalnych.
        Twoim zadaniem jest wyekstraktowanie wszystkich pozycji zakupowych z obrazu paragonu.

        ZASADY:
        1. Dla każdej pozycji wyciągnij nazwę produktu i cenę
        2. Ignoruj nagłówki, stopki, sumy częściowe, VAT
        3. Zwróć tylko listę produktów z cenami
        4. Jeśli nazwa jest skrócona, spróbuj ją rozwinąć do pełnej nazwy
        5. Ceny zawsze jako liczby (bez "zł", "PLN")

        Format odpowiedzi: JSON z tablicą items, gdzie każdy item ma: name (string) i price (number)`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Wyekstraktuj wszystkie pozycje z tego paragonu.'
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${base64Image}`
          }
        }
      ]
    }
  ],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'receipt_items',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nazwa produktu' },
                price: { type: 'number', minimum: 0, description: 'Cena produktu' }
              },
              required: ['name', 'price'],
              additionalProperties: false
            }
          }
        },
        required: ['items'],
        additionalProperties: false
      }
    }
  },
  temperature: 0.1, // Low temp for accuracy
  max_tokens: 1000
}
```

**Implementacja**:

```typescript
// src/app/services/receipt-ocr/receipt-ocr.service.ts

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface OcrResult {
  success: boolean;
  items: ReceiptItem[];
  error?: string;
}

const OCR_TIMEOUT = 30000; // 30 seconds

@Injectable({ providedIn: 'root' })
export class ReceiptOcrService {
  private readonly http = inject(HttpClient);
  private readonly compressionService = inject(ImageCompressionService);
  private readonly authService = inject(AuthService);

  private readonly edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/openrouter_integration`;

  async processReceipt(imageBlob: Blob): Promise<OcrResult> {
    try {
      // 1. Compress image
      const compressedBlob = await this.compressionService.compressImage(imageBlob);

      // 2. Convert to base64
      const base64Image = await this.compressionService.blobToBase64(compressedBlob);

      // 3. Build request payload
      const payload = {
        type: 'ocr',
        image: base64Image,
      };

      // 4. Get auth token
      const token = await this.authService.getAccessToken();
      if (!token) {
        throw new OcrError('Not authenticated', 'AUTH_ERROR');
      }

      // 5. Call edge function with timeout
      const response = await lastValueFrom(
        this.http
          .post<any>(this.edgeFunctionUrl, payload, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .pipe(
            timeout(OCR_TIMEOUT),
            catchError(error => this.handleOcrError(error))
          )
      );

      // 6. Parse and validate response
      const items = this.parseOcrResponse(response);

      return {
        success: true,
        items,
      };
    } catch (error: any) {
      if (error instanceof OcrError) {
        return {
          success: false,
          items: [],
          error: error.message,
        };
      }

      return {
        success: false,
        items: [],
        error: 'Nieoczekiwany błąd podczas przetwarzania paragonu',
      };
    }
  }

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

  private handleOcrError(error: any): Observable<never> {
    if (error instanceof TimeoutError) {
      throw new OcrError('OCR processing timeout', 'OCR_TIMEOUT', error);
    }

    if (error.status === 401 || error.status === 403) {
      throw new OcrError('Authentication failed', 'AUTH_ERROR', error);
    }

    if (error.status >= 500) {
      throw new OcrError('Server error', 'SERVER_ERROR', error);
    }

    throw new OcrError('OCR API error', 'OCR_API_ERROR', error);
  }
}

export type OcrErrorCode =
  | 'AUTH_ERROR'
  | 'OCR_TIMEOUT'
  | 'OCR_API_ERROR'
  | 'SERVER_ERROR'
  | 'INVALID_RESPONSE'
  | 'NO_ITEMS_FOUND'
  | 'PARSE_ERROR';

export class OcrError extends Error {
  constructor(
    message: string,
    public code: OcrErrorCode,
    public originalError?: any
  ) {
    super(message);
    this.name = 'OcrError';
  }
}
```

---

## 3. Rozszerzenie Edge Function

**Lokalizacja**: `supabase/functions/openrouter_integration/index.ts`

**Zmiany**:

1. Dodać obsługę `type: 'ocr'` w payloadzie
2. Obsługa image w content (base64)
3. Rozszerzony response format dla vision

**Implementacja**:

```typescript
// supabase/functions/openrouter_integration/index.ts

// Add new helper for building OCR messages
function buildOcrMessages(imageBase64: string): any[] {
  const systemPrompt = `Jesteś ekspertem w rozpoznawaniu paragonów fiskalnych.
Twoim zadaniem jest wyekstraktowanie wszystkich pozycji zakupowych z obrazu paragonu.

ZASADY:
1. Dla każdej pozycji wyciągnij nazwę produktu i cenę
2. Ignoruj nagłówki, stopki, sumy częściowe, VAT
3. Zwróć tylko listę produktów z cenami
4. Jeśli nazwa jest skrócona, spróbuj ją rozwinąć do pełnej nazwy
5. Ceny zawsze jako liczby (bez "zł", "PLN")

Format odpowiedzi: JSON z tablicą items, gdzie każdy item ma: name (string) i price (number)`;

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Wyekstraktuj wszystkie pozycje z tego paragonu.',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ],
    },
  ];
}

function buildOcrResponseFormat(): any {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'receipt_items',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Nazwa produktu' },
                price: { type: 'number', minimum: 0, description: 'Cena produktu' },
              },
              required: ['name', 'price'],
              additionalProperties: false,
            },
          },
        },
        required: ['items'],
        additionalProperties: false,
      },
    },
  };
}

// In main serve function, extend validation:
serve(async req => {
  // ... existing CORS and auth code ...

  const payload = await req.json();

  // Extended validation
  if (!payload.type) {
    return new Response(JSON.stringify({ error: 'Invalid request: type required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Handle OCR type
  if (payload.type === 'ocr') {
    if (!payload.image || typeof payload.image !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: image (base64) required for OCR' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const messages = buildOcrMessages(payload.image);
    const responseFormat = buildOcrResponseFormat();

    // Call OpenRouter with vision model
    const openRouterResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('SUPA_URL') ?? '',
        'X-Title': 'MoneyFlowTracker',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // Vision model
        messages: messages,
        response_format: responseFormat,
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      console.error('OpenRouter OCR error:', errorText);
      return new Response(JSON.stringify({ error: 'OpenRouter OCR error', details: errorText }), {
        status: openRouterResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await openRouterResponse.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ... existing classification logic for 'single' and 'batch' types ...
});
```

---

## 4. UI Components

### 4.1. CameraCaptureComponent

**Cel**: Standalone component dla camera interface z preview i capture.

**Template Key Features**:

- Video preview z live stream
- Capture button (Material FAB)
- Image preview po capture
- Retry/Accept buttons

**Implementacja**:

```typescript
// src/app/components/expenses/dialogs/camera-capture/camera-capture.component.ts

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="camera-container">
      @if (!capturedImage()) {
        <!-- Camera Preview -->
        <div class="camera-preview">
          <video #videoElement autoplay playsinline></video>
          <div class="camera-tip">Upewnij się, że paragon jest wyraźny i dobrze oświetlony</div>
        </div>

        <!-- Capture Button -->
        <button
          mat-fab
          color="primary"
          class="capture-btn"
          (click)="captureImage()"
          [disabled]="!cameraActive()">
          <mat-icon>camera</mat-icon>
        </button>
      } @else {
        <!-- Image Preview -->
        <div class="image-preview">
          <img [src]="capturedImageUrl()" alt="Captured receipt" />
        </div>

        <!-- Action Buttons -->
        <div class="preview-actions">
          <button mat-raised-button (click)="retakePhoto()">
            <mat-icon>refresh</mat-icon>
            Zrób nowe zdjęcie
          </button>
          <button
            mat-raised-button
            color="primary"
            (click)="confirmImage()"
            [disabled]="isProcessing()">
            @if (isProcessing()) {
              <mat-spinner diameter="20"></mat-spinner>
            }
            Użyj tego zdjęcia
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .camera-container {
        position: relative;
        width: 100%;
        height: 500px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #000;
      }

      .camera-preview {
        position: relative;
        width: 100%;
        height: 100%;
      }

      video {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .camera-tip {
        position: absolute;
        bottom: 80px;
        left: 0;
        right: 0;
        text-align: center;
        color: white;
        padding: 12px;
        background: rgba(0, 0, 0, 0.6);
        font-size: 14px;
      }

      .capture-btn {
        position: absolute;
        bottom: 20px;
      }

      .image-preview {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .image-preview img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
      }

      .preview-actions {
        position: absolute;
        bottom: 20px;
        display: flex;
        gap: 16px;
      }
    `,
  ],
})
export class CameraCaptureComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @Output() imageCaptured = new EventEmitter<Blob>();
  @Output() processingError = new EventEmitter<string>();

  private readonly cameraService = inject(CameraService);
  private readonly compressionService = inject(ImageCompressionService);

  readonly cameraActive = signal(false);
  readonly capturedImage = signal<Blob | null>(null);
  readonly capturedImageUrl = signal<string | null>(null);
  readonly isProcessing = signal(false);

  private stream: MediaStream | null = null;

  async ngOnInit() {
    try {
      const available = await this.cameraService.isCameraAvailable();
      if (!available) {
        this.processingError.emit('Kamera nie jest dostępna na tym urządzeniu');
        return;
      }

      this.stream = await this.cameraService.openCameraStream();
      this.videoElement.nativeElement.srcObject = this.stream;
      this.cameraActive.set(true);
    } catch (error: any) {
      if (error instanceof CameraError) {
        if (error.code === 'PERMISSION_DENIED') {
          this.processingError.emit(
            'Brak dostępu do kamery. Sprawdź uprawnienia w ustawieniach przeglądarki.'
          );
        } else {
          this.processingError.emit('Nie udało się uruchomić kamery');
        }
      }
    }
  }

  async captureImage() {
    if (!this.stream) return;

    try {
      const blob = await this.cameraService.captureFrame(this.stream);
      this.capturedImage.set(blob);
      this.capturedImageUrl.set(URL.createObjectURL(blob));

      // Stop camera stream after capture
      this.cameraService.closeCameraStream();
      this.cameraActive.set(false);
    } catch (error) {
      this.processingError.emit('Nie udało się zrobić zdjęcia');
    }
  }

  retakePhoto() {
    const url = this.capturedImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }

    this.capturedImage.set(null);
    this.capturedImageUrl.set(null);

    // Restart camera
    this.ngOnInit();
  }

  async confirmImage() {
    const image = this.capturedImage();
    if (!image) return;

    this.isProcessing.set(true);

    try {
      // Compress before emitting
      const compressed = await this.compressionService.compressImage(image);
      this.imageCaptured.emit(compressed);
    } catch (error: any) {
      this.processingError.emit('Nie udało się przetworzyć zdjęcia');
    } finally {
      this.isProcessing.set(false);
    }
  }

  ngOnDestroy() {
    this.cameraService.closeCameraStream();

    const url = this.capturedImageUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
```

### 4.2. ReceiptItemsListComponent

**Cel**: Edytowalna lista rozpoznanych pozycji z paragonu.

**Template Key Features**:

- Material table z inline editing
- Delete button per row
- Validation feedback
- Empty state

**Implementacja**:

```typescript
// src/app/components/expenses/dialogs/receipt-items-list/receipt-items-list.component.ts

export interface EditableReceiptItem {
  name: string;
  price: number;
  isEditing: boolean;
}

@Component({
  selector: 'app-receipt-items-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  template: `
    <div class="receipt-items-container">
      <div class="header">
        <h3>Rozpoznane pozycje ({{ items().length }})</h3>
        <p class="subtitle">Sprawdź i popraw rozpoznane pozycje przed klasyfikacją</p>
      </div>

      @if (items().length === 0) {
        <div class="empty-state">
          <mat-icon>receipt_long</mat-icon>
          <p>Nie znaleziono pozycji na paragonie</p>
        </div>
      } @else {
        <table mat-table [dataSource]="items()" class="items-table">
          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>Nazwa</th>
            <td mat-cell *matCellDef="let item; let i = index">
              @if (item.isEditing) {
                <mat-form-field appearance="outline" class="inline-edit">
                  <input
                    matInput
                    [(ngModel)]="item.name"
                    (blur)="finishEditing(i)"
                    (keyup.enter)="finishEditing(i)" />
                </mat-form-field>
              } @else {
                <span (click)="startEditing(i)" class="editable-cell">
                  {{ item.name }}
                </span>
              }
            </td>
          </ng-container>

          <!-- Price Column -->
          <ng-container matColumnDef="price">
            <th mat-header-cell *matHeaderCellDef>Cena</th>
            <td mat-cell *matCellDef="let item; let i = index">
              @if (item.isEditing) {
                <mat-form-field appearance="outline" class="inline-edit">
                  <input
                    matInput
                    type="number"
                    step="0.01"
                    [(ngModel)]="item.price"
                    (blur)="finishEditing(i)"
                    (keyup.enter)="finishEditing(i)" />
                  <span matSuffix>zł</span>
                </mat-form-field>
              } @else {
                <span (click)="startEditing(i)" class="editable-cell">
                  {{ item.price | currency: 'PLN' }}
                </span>
              }
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Akcje</th>
            <td mat-cell *matCellDef="let item; let i = index">
              <button
                mat-icon-button
                color="warn"
                (click)="removeItem(i)"
                [disabled]="items().length === 1">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>

        <div class="actions">
          <button
            mat-raised-button
            color="primary"
            (click)="classifyAll()"
            [disabled]="items().length === 0">
            Klasyfikuj wszystkie ({{ items().length }})
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .receipt-items-container {
        padding: 16px;
      }

      .header {
        margin-bottom: 16px;
      }

      .subtitle {
        color: rgba(0, 0, 0, 0.6);
        font-size: 14px;
        margin: 4px 0 0 0;
      }

      .empty-state {
        text-align: center;
        padding: 48px 16px;
        color: rgba(0, 0, 0, 0.6);
      }

      .empty-state mat-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
      }

      .items-table {
        width: 100%;
      }

      .editable-cell {
        cursor: pointer;
        display: block;
        padding: 8px;
        border-radius: 4px;
      }

      .editable-cell:hover {
        background: rgba(0, 0, 0, 0.04);
      }

      .inline-edit {
        width: 100%;
        margin: 0;
      }

      .actions {
        margin-top: 24px;
        text-align: right;
      }
    `,
  ],
})
export class ReceiptItemsListComponent {
  @Input() set receiptItems(items: ReceiptItem[]) {
    this.items.set(items.map(item => ({ ...item, isEditing: false })));
  }

  @Output() itemsChanged = new EventEmitter<ReceiptItem[]>();
  @Output() classifyRequested = new EventEmitter<ReceiptItem[]>();

  readonly items = signal<EditableReceiptItem[]>([]);
  readonly displayedColumns = ['name', 'price', 'actions'];

  startEditing(index: number) {
    this.items.update(items => {
      const updated = [...items];
      updated[index].isEditing = true;
      return updated;
    });
  }

  finishEditing(index: number) {
    this.items.update(items => {
      const updated = [...items];

      // Validate
      const item = updated[index];
      item.name = item.name.trim();
      if (item.name === '') {
        item.name = 'Produkt';
      }
      if (item.price <= 0) {
        item.price = 0.01;
      }

      item.isEditing = false;
      return updated;
    });

    this.emitChanges();
  }

  removeItem(index: number) {
    this.items.update(items => items.filter((_, i) => i !== index));
    this.emitChanges();
  }

  classifyAll() {
    const items = this.items().map(({ name, price }) => ({ name, price }));
    this.classifyRequested.emit(items);
  }

  private emitChanges() {
    const items = this.items().map(({ name, price }) => ({ name, price }));
    this.itemsChanged.emit(items);
  }
}
```

---

### 4.3. Rozszerzenie AddExpenseDialogComponent

**Zmiany**:

1. Dodać mode toggle: "Manual" | "From Receipt"
2. Integracja z CameraCaptureComponent
3. Integracja z ReceiptItemsListComponent
4. State management dla OCR flow

**Implementacja**:

```typescript
// src/app/components/expenses/dialogs/add-expense/add-expense-dialog.component.ts

export type ExpenseMode = 'manual' | 'from-receipt';

@Component({
  // ... existing imports + new:
  imports: [
    // ... existing imports
    MatTabsModule,
    CameraCaptureComponent,
    ReceiptItemsListComponent,
  ],
})
export class AddExpenseDialogComponent {
  // Existing code...

  // New signals for OCR flow
  readonly mode = signal<ExpenseMode>('manual');
  readonly ocrInProgress = signal(false);
  readonly ocrError = signal<string | null>(null);
  readonly receiptItems = signal<ReceiptItem[]>([]);

  private readonly receiptOcrService = inject(ReceiptOcrService);

  switchMode(mode: ExpenseMode) {
    this.mode.set(mode);
    this.ocrError.set(null);
  }

  async onImageCaptured(imageBlob: Blob) {
    this.ocrInProgress.set(true);
    this.ocrError.set(null);

    try {
      const result = await this.receiptOcrService.processReceipt(imageBlob);

      if (!result.success) {
        this.ocrError.set(result.error || 'Nie udało się przetworzyć paragonu');
        return;
      }

      if (result.items.length === 0) {
        this.ocrError.set(
          'Nie znaleziono pozycji na paragonie. Spróbuj ponownie lub dodaj ręcznie.'
        );
        return;
      }

      // Convert to expenses with current date
      const expenses = result.items.map(item => ({
        name: item.name,
        amount: item.price,
        expense_date: this.toIsoDate(new Date()),
      }));

      this.expensesList.set(expenses);
      this.receiptItems.set(result.items);
    } catch (error: any) {
      this.ocrError.set('Nieoczekiwany błąd podczas przetwarzania paragonu');
      console.error('OCR error:', error);
    } finally {
      this.ocrInProgress.set(false);
    }
  }

  onReceiptItemsChanged(items: ReceiptItem[]) {
    // Update expenses list when items are edited
    const expenses = items.map(item => ({
      name: item.name,
      amount: item.price,
      expense_date: this.toIsoDate(new Date()),
    }));

    this.expensesList.set(expenses);
  }

  async onClassifyReceiptItems(items: ReceiptItem[]) {
    // Convert to expenses and classify
    const expenses = items.map(item => ({
      name: item.name,
      amount: item.price,
      expense_date: this.toIsoDate(new Date()),
    }));

    this.expensesList.set(expenses);
    await this.onSave();
  }

  retryOcr() {
    this.ocrError.set(null);
    this.receiptItems.set([]);
    // Camera will restart automatically
  }

  // Existing code...
}
```

**Template Changes**:

```html
<!-- add-expense.html -->

<h2 mat-dialog-title>Dodaj wydatki</h2>

<mat-dialog-content>
  <!-- Mode Toggle -->
  <mat-tab-group [(selectedIndex)]="modeIndex" (selectedIndexChange)="onModeChange($event)">
    <mat-tab label="Ręcznie">
      <!-- Existing manual form -->
      <div class="manual-form">
        <!-- ... existing form fields ... -->
      </div>
    </mat-tab>

    <mat-tab label="Ze zdjęcia">
      <div class="ocr-container">
        @if (ocrError()) {
        <!-- Error State -->
        <div class="error-state">
          <mat-icon color="warn">error</mat-icon>
          <p>{{ ocrError() }}</p>
          <div class="error-actions">
            <button mat-raised-button (click)="retryOcr()">Spróbuj ponownie</button>
            <button mat-button (click)="switchMode('manual')">Dodaj ręcznie</button>
          </div>
        </div>
        } @else if (receiptItems().length === 0) {
        <!-- Camera Capture -->
        @if (ocrInProgress()) {
        <div class="processing-state">
          <mat-spinner></mat-spinner>
          <p>Analizuję paragon...</p>
          <p class="subtitle">Może to potrwać do 30 sekund</p>
        </div>
        } @else {
        <app-camera-capture
          (imageCaptured)="onImageCaptured($event)"
          (processingError)="ocrError.set($event)" />
        } } @else {
        <!-- Receipt Items List -->
        <app-receipt-items-list
          [receiptItems]="receiptItems()"
          (itemsChanged)="onReceiptItemsChanged($event)"
          (classifyRequested)="onClassifyReceiptItems($event)" />
        }
      </div>
    </mat-tab>
  </mat-tab-group>

  <!-- Existing expenses list (shown in both modes) -->
  @if (expensesList().length > 0) {
  <div class="expenses-list">
    <!-- ... existing table ... -->
  </div>
  }
</mat-dialog-content>

<mat-dialog-actions>
  <button mat-button (click)="dialogRef.close()">Anuluj</button>
  <button mat-raised-button color="primary" (click)="onSave()" [disabled]="disableSaveBtn()">
    @if (isClassifying()) {
    <mat-spinner diameter="20"></mat-spinner>
    Klasyfikuję... } @else { Zapisz ({{ expensesList().length }}) }
  </button>
</mat-dialog-actions>
```

---

## 5. Obsługa Błędów

### 5.1. Scenariusze Błędów

| Kod błędu            | Opis                    | User Message                                   | Recovery Action                        |
| -------------------- | ----------------------- | ---------------------------------------------- | -------------------------------------- |
| CAMERA_NOT_AVAILABLE | Brak kamery             | "Kamera nie jest dostępna"                     | Ukryj tab "Ze zdjęcia"                 |
| PERMISSION_DENIED    | Brak uprawnień          | "Brak dostępu do kamery. Sprawdź uprawnienia." | Instrukcje + "Dodaj ręcznie"           |
| IMAGE_TOO_LARGE      | Zbyt duże zdjęcie       | "Zdjęcie jest zbyt duże"                       | "Spróbuj ponownie"                     |
| COMPRESSION_FAILED   | Błąd kompresji          | "Nie udało się przetworzyć zdjęcia"            | "Spróbuj ponownie"                     |
| OCR_TIMEOUT          | Timeout 30s             | "Analiza trwa zbyt długo"                      | "Spróbuj ponownie" lub "Dodaj ręcznie" |
| OCR_API_ERROR        | Błąd API                | "Nie udało się przetworzyć paragonu"           | "Spróbuj ponownie"                     |
| NO_ITEMS_FOUND       | Brak pozycji            | "Nie znaleziono pozycji na paragonie"          | "Spróbuj ponownie" lub "Dodaj ręcznie" |
| INVALID_RESPONSE     | Nieprawidłowa odpowiedź | "Błąd przetwarzania danych"                    | "Spróbuj ponownie"                     |
| AUTH_ERROR           | Brak autentykacji       | "Sesja wygasła. Zaloguj się ponownie."         | Redirect do logowania                  |

### 5.2. Error Handling Strategy

1. **Network Errors**: Retry with exponential backoff (max 3 attempts)
2. **Timeout Errors**: Show remaining time + option to cancel
3. **Auth Errors**: Redirect to login, preserve state in session storage
4. **Validation Errors**: Inline validation + clear error messages
5. **API Errors**: Log to console + generic user message

---

## 6. Kwestie Bezpieczeństwa

### 6.1. Data Privacy

- **Brak storage zdjęć**: Zdjęcia usuwane natychmiast po przetworzeniu
- **HTTPS only**: Wszystkie requesty przez szyfrowane połączenie
- **Token validation**: Każdy request wymaga ważnego auth tokenu
- **No logging**: Zdjęcia nie są logowane ani przechowywane w logach

### 6.2. Input Validation

- **Image size limit**: Max 2MB after compression
- **Image format**: Only JPEG
- **Auth token**: Validated on every request
- **Response validation**: JSON schema validation dla OCR response

### 6.3. Rate Limiting

- **Use existing RateLimiterService**
- **OCR limit**: Same as classification (reuse quota)
- **Fallback**: Clear error message + retry time

---

## 7. Plan Wdrożenia Krok po Kroku

### Faza 1: Setup & Infrastructure (Dzień 1-2)

1. **Install Dependencies**

```bash
npm install browser-image-compression --save
```

2. **Create Service Files**

```
src/app/services/
├── camera/
│   ├── camera.service.ts
│   └── camera.service.spec.ts
├── image-compression/
│   ├── image-compression.service.ts
│   └── image-compression.service.spec.ts
└── receipt-ocr/
    ├── receipt-ocr.service.ts
    └── receipt-ocr.service.spec.ts
```

3. **Create Models**

```typescript
// src/app/models/receipt.ts
export interface ReceiptItem {
  name: string;
  price: number;
}
export interface OcrResult {
  success: boolean;
  items: ReceiptItem[];
  error?: string;
}
// ... error types
```

4. **Update OpenRouter Models**

```typescript
// src/app/models/openrouter.ts
// Add image content type to Message interface
export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | MessageContent[];
}
```

## 8. Testy Akceptacyjne

### Test Case 1: Happy Path

1. Click "Dodaj wydatek"
2. Switch to "Ze zdjęcia" tab
3. Allow camera permissions
4. Capture receipt image
5. Confirm image
6. Verify items list populated
7. Edit one item name
8. Delete one item
9. Click "Klasyfikuj wszystkie"
10. Verify categories assigned
11. Click "Zapisz"
12. Verify expenses saved in table

**Expected**: All steps complete without errors, expenses visible in main table.

### Test Case 2: OCR Timeout

1. Capture very large/complex receipt
2. Wait for timeout (30s)
3. Verify timeout error message displayed
4. Click "Spróbuj ponownie"
5. Verify camera reopens

**Expected**: Clear timeout message, smooth retry flow.

### Test Case 3: Permission Denied

1. Click "Ze zdjęcia" tab
2. Deny camera permission
3. Verify error message with instructions
4. Click "Dodaj ręcznie"
5. Verify switched to manual mode

**Expected**: Clear instructions, easy fallback to manual.

### Test Case 4: No Items Found

1. Capture blank/invalid image
2. Verify "No items found" message
3. Options: retry or manual
4. Click retry, capture valid receipt
5. Verify items populated

**Expected**: Clear error, easy recovery.

---

## 9. Metryki Sukcesu

### Technical Metrics

- **OCR Accuracy**: > 85% items correctly recognized
- **Processing Time**: < 30s average
- **Error Rate**: < 10% OCR failures
- **Compression Ratio**: Original size → < 2MB (99% success)

### Business Metrics

- **Adoption Rate**: > 20% users try OCR feature
- **Usage Rate**: > 5% of expenses added via OCR
- **Cost per Receipt**: < $0.05 (target: $3 / 60 receipts)
- **User Satisfaction**: Positive feedback on UX

### Monitoring Queries

```typescript
// Track OCR usage
SELECT
  COUNT(*) as ocr_attempts,
  SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as successful,
  AVG(processing_time_ms) as avg_time
FROM ocr_logs
WHERE created_at > NOW() - INTERVAL '7 days';

// Track API costs
SELECT
  SUM(tokens_used) as total_tokens,
  SUM(tokens_used) * 0.0001 as estimated_cost
FROM openrouter_usage
WHERE request_type = 'ocr'
  AND created_at > NOW() - INTERVAL '30 days';
```
