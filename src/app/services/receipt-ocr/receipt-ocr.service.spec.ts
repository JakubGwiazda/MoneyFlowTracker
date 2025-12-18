import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReceiptOcrService } from './receipt-ocr.service';
import { ImageCompressionService } from '../image-compression/image-compression.service';
import { AuthService } from '../authorization/auth.service';
import { OcrError } from '../../models/receipt';
import { environment } from '../../../environments/environment';

describe('ReceiptOcrService', () => {
  let service: ReceiptOcrService;
  let httpMock: HttpTestingController;
  let compressionService: jasmine.SpyObj<ImageCompressionService>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockEdgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/receipt-ocr`;

  beforeEach(() => {
    const compressionServiceMock = jasmine.createSpyObj('ImageCompressionService', [
      'validateImageBlob',
      'compressImage',
      'blobToBase64',
    ]);

    const authServiceMock = jasmine.createSpyObj('AuthService', ['getAccessToken']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ReceiptOcrService,
        { provide: ImageCompressionService, useValue: compressionServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(ReceiptOcrService);
    httpMock = TestBed.inject(HttpTestingController);
    compressionService = TestBed.inject(
      ImageCompressionService
    ) as jasmine.SpyObj<ImageCompressionService>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('processReceipt', () => {
    it('should successfully process receipt and return items', fakeAsync(() => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const mockBase64 = 'base64encodedimage';
      const mockToken = 'mock-auth-token';
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [
                  { name: 'Mleko', price: 3.99 },
                  { name: 'Chleb', price: 2.5 },
                ],
              }),
            },
          },
        ],
      };

      compressionService.validateImageBlob.and.returnValue({ valid: true });
      compressionService.compressImage.and.returnValue(Promise.resolve(mockBlob));
      compressionService.blobToBase64.and.returnValue(Promise.resolve(mockBase64));
      authService.getAccessToken.and.returnValue(Promise.resolve(mockToken));

      let result: any;
      service.processReceipt(mockBlob).then(r => (result = r));

      tick(); // Flush async operations

      const req = httpMock.expectOne(mockEdgeFunctionUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        image: mockBase64,
      });
      expect(req.request.headers.get('Authorization')).toBe(`Bearer ${mockToken}`);

      req.flush(mockResponse);
      flush(); // Flush remaining async operations

      expect(result.success).toBe(true);
      expect(result.items.length).toBe(2);
      expect(result.items[0]).toEqual({ name: 'Mleko', price: 3.99 });
      expect(result.items[1]).toEqual({ name: 'Chleb', price: 2.5 });
    }));

    it('should return error when image blob is invalid', async () => {
      const invalidBlob = new Blob([], { type: 'text/plain' });

      compressionService.validateImageBlob.and.returnValue({
        valid: false,
        reason: 'Not an image',
      });

      const result = await service.processReceipt(invalidBlob);

      expect(result.success).toBe(false);
      expect(result.items.length).toBe(0);
      expect(result.error).toBeTruthy();
    });

    it('should return error when not authenticated', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      compressionService.validateImageBlob.and.returnValue({ valid: true });
      compressionService.compressImage.and.returnValue(Promise.resolve(mockBlob));
      compressionService.blobToBase64.and.returnValue(Promise.resolve('base64'));
      authService.getAccessToken.and.returnValue(Promise.resolve(null));

      const result = await service.processReceipt(mockBlob);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Zaloguj się ponownie');
    });

    it('should handle timeout error', fakeAsync(() => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      compressionService.validateImageBlob.and.returnValue({ valid: true });
      compressionService.compressImage.and.returnValue(Promise.resolve(mockBlob));
      compressionService.blobToBase64.and.returnValue(Promise.resolve('base64'));
      authService.getAccessToken.and.returnValue(Promise.resolve('token'));

      let result: any;
      service.processReceipt(mockBlob).then(r => (result = r));

      tick(); // Flush async operations

      const req = httpMock.expectOne(mockEdgeFunctionUrl);
      // Simulate timeout by not responding
      req.flush(null, { status: 408, statusText: 'Request Timeout' });
      flush(); // Flush remaining async operations

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    }));

    it('should handle server error (500)', fakeAsync(() => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });

      compressionService.validateImageBlob.and.returnValue({ valid: true });
      compressionService.compressImage.and.returnValue(Promise.resolve(mockBlob));
      compressionService.blobToBase64.and.returnValue(Promise.resolve('base64'));
      authService.getAccessToken.and.returnValue(Promise.resolve('token'));

      let result: any;
      service.processReceipt(mockBlob).then(r => (result = r));

      tick(); // Flush async operations

      const req = httpMock.expectOne(mockEdgeFunctionUrl);
      req.flush(null, { status: 500, statusText: 'Internal Server Error' });
      flush(); // Flush remaining async operations

      expect(result.success).toBe(false);
      expect(result.error).toContain('Problem z serwerem');
    }));

    it('should handle no items found', fakeAsync(() => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({ items: [] }),
            },
          },
        ],
      };

      compressionService.validateImageBlob.and.returnValue({ valid: true });
      compressionService.compressImage.and.returnValue(Promise.resolve(mockBlob));
      compressionService.blobToBase64.and.returnValue(Promise.resolve('base64'));
      authService.getAccessToken.and.returnValue(Promise.resolve('token'));

      let result: any;
      service.processReceipt(mockBlob).then(r => (result = r));

      tick(); // Flush async operations

      const req = httpMock.expectOne(mockEdgeFunctionUrl);
      req.flush(mockResponse);
      flush(); // Flush remaining async operations

      expect(result.success).toBe(false);
      expect(result.error).toContain('Nie znaleziono pozycji');
    }));

    it('should filter out invalid items', fakeAsync(() => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: [
                  { name: 'Valid Item', price: 5.99 },
                  { name: '', price: 3.0 }, // Invalid: empty name
                  { name: 'Another Valid', price: 0 }, // Invalid: price = 0
                  { name: 'Good Item', price: 10.5 },
                ],
              }),
            },
          },
        ],
      };

      compressionService.validateImageBlob.and.returnValue({ valid: true });
      compressionService.compressImage.and.returnValue(Promise.resolve(mockBlob));
      compressionService.blobToBase64.and.returnValue(Promise.resolve('base64'));
      authService.getAccessToken.and.returnValue(Promise.resolve('token'));

      let result: any;
      service.processReceipt(mockBlob).then(r => (result = r));

      tick(); // Flush async operations

      const req = httpMock.expectOne(mockEdgeFunctionUrl);
      req.flush(mockResponse);
      flush(); // Flush remaining async operations

      expect(result.success).toBe(true);
      expect(result.items.length).toBe(2);
      expect(result.items[0].name).toBe('Valid Item');
      expect(result.items[1].name).toBe('Good Item');
    }));
  });
});
