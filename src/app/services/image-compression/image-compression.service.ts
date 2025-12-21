import { Injectable } from '@angular/core';
import imageCompression from 'browser-image-compression';
import { CompressionError, IMAGE_CONFIG } from '../../models/receipt';

/**
 * ImageCompressionService
 * Handles client-side image compression and blob/base64 conversions
 */
@Injectable({ providedIn: 'root' })
export class ImageCompressionService {
  /**
   * Compress image to optimal size for OCR processing
   * @param imageBlob Source image blob
   * @returns Compressed image blob
   */
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

  /**
   * Convert Blob to base64 string
   * @param blob Image blob
   * @returns Base64 string (without data URL prefix)
   */
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

  /**
   * Convert base64 string to Blob
   * @param base64 Base64 string (without data URL prefix)
   * @param mimeType MIME type of the blob
   * @returns Blob instance
   */
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

  /**
   * Get dimensions of image blob
   * @param blob Image blob
   * @returns Image dimensions
   */
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

  /**
   * Validate image blob before processing
   * @param blob Image blob
   * @returns Validation result with details
   */
  validateImageBlob(blob: Blob): { valid: boolean; reason?: string } {
    if (!blob) {
      return { valid: false, reason: 'Blob is null or undefined' };
    }

    if (blob.size === 0) {
      return { valid: false, reason: 'Blob is empty' };
    }

    if (!blob.type.startsWith('image/')) {
      return { valid: false, reason: 'Blob is not an image' };
    }

    return { valid: true };
  }
}
