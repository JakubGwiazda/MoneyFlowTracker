import { TestBed } from '@angular/core/testing';
import { ImageCompressionService } from './image-compression.service';
import { CompressionError, IMAGE_CONFIG } from '../../models/receipt';

describe('ImageCompressionService', () => {
  let service: ImageCompressionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageCompressionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateImageBlob', () => {
    it('should return valid for correct image blob', () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const result = service.validateImageBlob(blob);

      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return invalid for null blob', () => {
      const result = service.validateImageBlob(null as any);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Blob is null or undefined');
    });

    it('should return invalid for empty blob', () => {
      const blob = new Blob([], { type: 'image/jpeg' });
      const result = service.validateImageBlob(blob);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Blob is empty');
    });

    it('should return invalid for non-image blob', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const result = service.validateImageBlob(blob);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Blob is not an image');
    });
  });

  describe('compressImage', () => {
    it('should throw error for empty blob', async () => {
      const emptyBlob = new Blob([], { type: 'image/jpeg' });

      await expectAsync(service.compressImage(emptyBlob)).toBeRejectedWithError(CompressionError);

      try {
        await service.compressImage(emptyBlob);
        fail('Should have thrown CompressionError');
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError);
        expect((error as CompressionError).code).toBe('EMPTY_BLOB');
      }
    });

    it('should return original blob if already small enough', async () => {
      // Create small blob (less than max size)
      const smallBlob = new Blob(['small image data'], { type: 'image/jpeg' });

      const result = await service.compressImage(smallBlob);

      expect(result).toBe(smallBlob);
      expect(result.size).toBeLessThanOrEqual(IMAGE_CONFIG.maxSizeBytes);
    });
  });

  describe('blobToBase64', () => {
    it('should convert blob to base64 string', async () => {
      const testData = 'test image data';
      const blob = new Blob([testData], { type: 'image/jpeg' });

      const result = await service.blobToBase64(blob);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Base64 should not contain data URL prefix
      expect(result).not.toContain('data:');
      expect(result).not.toContain('base64,');
    });

    it('should handle FileReader error', async () => {
      const blob = new Blob(['test'], { type: 'image/jpeg' });

      // Mock FileReader to simulate error
      const originalFileReader = window.FileReader;
      (window as any).FileReader = class {
        readAsDataURL() {
          setTimeout(() => this.onerror?.(new Event('error')), 0);
        }
        onerror: ((event: Event) => void) | null = null;
        onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
      };

      await expectAsync(service.blobToBase64(blob)).toBeRejectedWithError(CompressionError);

      try {
        await service.blobToBase64(blob);
        fail('Should have thrown CompressionError');
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError);
        expect((error as CompressionError).code).toBe('BASE64_ERROR');
      }

      window.FileReader = originalFileReader;
    });
  });

  describe('base64ToBlob', () => {
    it('should convert base64 string to blob', async () => {
      // Create a valid base64 string (represents "test")
      const base64 = btoa('test');

      const result = await service.base64ToBlob(base64, 'image/jpeg');

      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('image/jpeg');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should throw error for invalid base64', async () => {
      const invalidBase64 = 'not valid base64!!!';

      await expectAsync(service.base64ToBlob(invalidBase64)).toBeRejectedWithError(
        CompressionError
      );

      try {
        await service.base64ToBlob(invalidBase64);
        fail('Should have thrown CompressionError');
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError);
        expect((error as CompressionError).code).toBe('BASE64_ERROR');
      }
    });

    it('should use default mime type if not provided', async () => {
      const base64 = btoa('test');

      const result = await service.base64ToBlob(base64);

      expect(result.type).toBe('image/jpeg');
    });
  });

  describe('getImageDimensions', () => {
    it('should get dimensions of valid image', async () => {
      // Create a minimal 1x1 PNG blob
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      ctx?.fillRect(0, 0, 100, 50);

      const blob = await new Promise<Blob>(resolve => {
        canvas.toBlob(b => resolve(b!), 'image/png');
      });

      const dimensions = await service.getImageDimensions(blob);

      expect(dimensions.width).toBe(100);
      expect(dimensions.height).toBe(50);
    });

    it('should throw error for invalid image blob', async () => {
      const invalidBlob = new Blob(['not an image'], { type: 'text/plain' });

      await expectAsync(service.getImageDimensions(invalidBlob)).toBeRejectedWithError(
        CompressionError
      );

      try {
        await service.getImageDimensions(invalidBlob);
        fail('Should have thrown CompressionError');
      } catch (error) {
        expect(error).toBeInstanceOf(CompressionError);
        expect((error as CompressionError).code).toBe('IMAGE_LOAD_ERROR');
      }
    });
  });
});
