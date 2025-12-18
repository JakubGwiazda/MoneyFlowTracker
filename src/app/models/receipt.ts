/**
 * Receipt OCR Models
 * Data structures for receipt processing and OCR functionality
 */

export interface ReceiptItem {
  name: string;
  price: number;
}

export interface OcrResult {
  success: boolean;
  items: ReceiptItem[];
  error?: string;
}

// Error types for Camera Service
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

// Error types for Image Compression Service
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

// Error types for OCR Service
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

// Configuration constants
export const IMAGE_CONFIG = {
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  maxWidthOrHeight: 1920,
  quality: 0.85,
  fileType: 'image/jpeg' as const,
} as const;

export const OCR_TIMEOUT = 30000; // 30 seconds
