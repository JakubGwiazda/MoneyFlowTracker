import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ClassificationService } from './classification.service';
import { RateLimiterService } from './rate-limiter.service';
import { environment } from '../../environments/environment';
import { CategoryDto } from '../../types';
import { OpenRouterResponse, ClassificationError } from '../models/openrouter';
import { supabaseClient } from 'src/db/supabase.client';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

describe('ClassificationService', () => {
  let service: ClassificationService;
  let httpMock: HttpTestingController;
  let rateLimiter: RateLimiterService;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const edgeFunctionUrl = `${environment.supabaseUrl}/functions/v1/openrouter_integration`;

  const mockCategories: CategoryDto[] = [
    {
      id: 'cat-1',
      name: 'Transport',
      parent_id: null,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      user_id: 'user-1',
    },
    {
      id: 'cat-2',
      name: 'Jedzenie',
      parent_id: null,
      is_active: true,
      created_at: '2025-01-01T00:00:00Z',
      user_id: 'user-1',
    },
  ];
  beforeEach(() => {
    authServiceSpy = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['getAccessToken', 'isAuthenticated', 'signIn', 'signOut'], // wszystkie metody które używasz
      ['authState'] // osobno property getters
    );

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ClassificationService,
        RateLimiterService,
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    service = TestBed.inject(ClassificationService);
    httpMock = TestBed.inject(HttpTestingController);
    rateLimiter = TestBed.inject(RateLimiterService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('classifyExpense - Success Scenario (TC-AI-001)', () => {
    it('should successfully classify expense to existing category with confidence >= 0.7', fakeAsync(() => {
      const description = 'Tankowanie BP 95';
      const mockSession = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: { id: 'user-1' },
      };

      // Mock Supabase session
      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: mockSession as any },
          error: null,
        })
      );

      // Mock API response from OpenRouter
      const mockApiResponse: OpenRouterResponse = {
        id: 'chatcmpl-123',
        model: 'openai/gpt-4o-mini',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                categoryId: 'cat-1',
                categoryName: 'Transport',
                confidence: 0.85,
                isNewCategory: false,
                newCategoryName: '',
                reasoning: 'Tankowanie jednoznacznie wskazuje na wydatek transportowy',
              }),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 50,
          total_tokens: 200,
        },
      };

      let result: any = null;
      let error: any = null;

      // Execute classification
      service.classifyExpense(description, mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      // Expect HTTP POST to edge function
      const req = httpMock.expectOne(edgeFunctionUrl);
      expect(req.request.method).toBe('POST');

      // Verify request headers
      expect(req.request.headers.get('Content-Type')).toBe('application/json');
      expect(req.request.headers.get('Authorization')).toBe('Bearer mock-access-token');

      // Verify request payload
      const payload = req.request.body;
      expect(payload.model).toBe('openai/gpt-4o-mini');
      expect(payload.messages).toBeDefined();
      expect(payload.messages.length).toBe(2);
      expect(payload.messages[0].role).toBe('system');
      expect(payload.messages[1].role).toBe('user');
      expect(payload.messages[1].content).toContain(description);
      expect(payload.response_format).toBeDefined();
      expect(payload.response_format.type).toBe('json_schema');
      expect(payload.temperature).toBe(0.2);

      // Respond with mock data
      req.flush(mockApiResponse);
      tick();

      // Verify result structure
      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result.categoryId).toBe('cat-1');
      expect(result.categoryName).toBe('Transport');
      expect(result.confidence).toBe(0.85);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.isNewCategory).toBe(false);
      expect(result.reasoning).toContain('transportowy');

      // Verify category was enriched with full data
      const category = mockCategories.find(c => c.id === result.categoryId);
      expect(category).toBeDefined();
      expect(category?.name).toBe(result.categoryName);
    }));

    it('should correctly parse model response and enrich with category data', fakeAsync(() => {
      const description = 'Pizza w Dominium';
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-1' },
      };

      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: mockSession as any },
          error: null,
        })
      );

      const mockApiResponse: OpenRouterResponse = {
        id: 'chatcmpl-456',
        model: 'openai/gpt-4o-mini',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                categoryId: 'cat-2',
                categoryName: 'Jedzenie',
                confidence: 0.92,
                isNewCategory: false,
                newCategoryName: '',
                reasoning: 'Pizza jest wydatkiem na jedzenie',
              }),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 50,
          total_tokens: 200,
        },
      };

      let result: any = null;
      let error: any = null;

      service.classifyExpense(description, mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      const req = httpMock.expectOne(edgeFunctionUrl);
      req.flush(mockApiResponse);
      tick();

      expect(error).toBeNull();
      expect(result).toBeDefined();

      // Verify parsing
      expect(result.categoryId).toBe('cat-2');
      expect(result.categoryName).toBe('Jedzenie');

      // Verify enrichment - category name should match from categories list
      const matchedCategory = mockCategories.find(c => c.id === result.categoryId);
      expect(matchedCategory).toBeDefined();
      if (matchedCategory) {
        expect(result.categoryName).toBe(matchedCategory.name);
      }
    }));

    it('should validate confidence score is within 0-1 range', fakeAsync(() => {
      const description = 'Test expense';
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-1' },
      };

      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: mockSession as any },
          error: null,
        })
      );

      const mockApiResponse: OpenRouterResponse = {
        id: 'chatcmpl-789',
        model: 'openai/gpt-4o-mini',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                categoryId: 'cat-1',
                categoryName: 'Transport',
                confidence: 0.75,
                isNewCategory: false,
                newCategoryName: '',
                reasoning: 'Test',
              }),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 30,
          total_tokens: 130,
        },
      };

      let result: any = null;
      let error: any = null;

      service.classifyExpense(description, mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      const req = httpMock.expectOne(edgeFunctionUrl);
      req.flush(mockApiResponse);
      tick();

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }));

    it('should handle response with new category proposal (confidence < 0.7)', fakeAsync(() => {
      const description = 'Zakup drona DJI Mavic';
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-1' },
      };

      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: mockSession as any },
          error: null,
        })
      );

      const mockApiResponse: OpenRouterResponse = {
        id: 'chatcmpl-999',
        model: 'openai/gpt-4o-mini',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                categoryId: null,
                categoryName: 'Elektronika',
                confidence: 0.65,
                isNewCategory: true,
                newCategoryName: 'Elektronika',
                reasoning: 'Dron to sprzęt elektroniczny, propozycja nowej kategorii',
              }),
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 60,
          total_tokens: 210,
        },
      };

      let result: any = null;
      let error: any = null;

      service.classifyExpense(description, mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      const req = httpMock.expectOne(edgeFunctionUrl);
      req.flush(mockApiResponse);
      tick();

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(result.isNewCategory).toBe(true);
      expect(result.categoryId).toBeNull();
      expect(result.newCategoryName).toBe('Elektronika');
      expect(result.confidence).toBeLessThan(0.7);
      expect(result.reasoning).toBeDefined();
    }));
  });

  describe('Input Validation', () => {
    it('should throw error for empty description', () => {
      expect(() => {
        service.classifyExpense('', mockCategories).subscribe();
      }).toThrow(
        jasmine.objectContaining({
          message: 'Opis wydatku jest wymagany',
          code: 'VALIDATION_ERROR',
        })
      );
    });

    it('should throw error for description exceeding 500 characters', () => {
      const longDescription = 'a'.repeat(501);

      expect(() => {
        service.classifyExpense(longDescription, mockCategories).subscribe();
      }).toThrow(
        jasmine.objectContaining({
          message: 'Opis wydatku jest zbyt długi (maksymalnie 500 znaków)',
          code: 'VALIDATION_ERROR',
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limiter and throw error when limit exceeded', fakeAsync(() => {
      spyOn(rateLimiter, 'canMakeRequest').and.returnValue(false);
      spyOn(rateLimiter, 'getTimeUntilNextRequest').and.returnValue(45000);

      let result: any = null;
      let error: ClassificationError | null = null;

      service.classifyExpense('Test expense', mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      tick();

      expect(result).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.code).toBe('RATE_LIMIT_ERROR');
      expect(error!.message).toContain('Przekroczono limit zapytań');
      expect(error!.message).toContain('45 sekund');
    }));

    it('should record request after successful API call', fakeAsync(() => {
      const description = 'Test expense';
      const mockSession = {
        access_token: 'mock-token',
        user: { id: 'user-1' },
      };

      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: mockSession as any },
          error: null,
        })
      );

      spyOn(rateLimiter, 'recordRequest');

      const mockApiResponse: OpenRouterResponse = {
        id: 'chatcmpl-test',
        model: 'openai/gpt-4o-mini',
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                categoryId: 'cat-1',
                categoryName: 'Transport',
                confidence: 0.8,
                isNewCategory: false,
                newCategoryName: '',
                reasoning: 'Test',
              }),
            },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 },
      };

      let result: any = null;
      let error: any = null;

      service.classifyExpense(description, mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      const req = httpMock.expectOne(edgeFunctionUrl);
      req.flush(mockApiResponse);
      tick();

      expect(error).toBeNull();
      expect(result).toBeDefined();
      expect(rateLimiter.recordRequest).toHaveBeenCalledWith('classification');
    }));
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', fakeAsync(() => {
      spyOn(supabaseClient.auth, 'getSession').and.returnValue(
        Promise.resolve({
          data: { session: null },
          error: { message: 'No session' } as any,
        })
      );

      let result: any = null;
      let error: ClassificationError | null = null;

      service.classifyExpense('Test', mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      tick();

      expect(result).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.code).toBe('AUTH_ERROR');
      expect(error!.message).toContain('Nie jesteś zalogowany');
    }));

    it('should handle HTTP 429 rate limit error from API', fakeAsync(() => {
      // Mock getAccessToken to return a valid token
      authServiceSpy.getAccessToken.and.returnValue(Promise.resolve('mock-token'));

      let result: any = null;
      let error: ClassificationError | null = null;

      service.classifyExpense('Test', mockCategories).subscribe({
        next: res => (result = res),
        error: err => (error = err),
      });

      const req = httpMock.expectOne(edgeFunctionUrl);
      req.flush({ error: 'Too many requests' }, { status: 429, statusText: 'Too Many Requests' });
      tick();

      expect(result).toBeNull();
      expect(error).not.toBeNull();
      expect(error!.code).toBe('RATE_LIMIT_ERROR');
      expect(error!.message).toContain('Przekroczono limit zapytań do API');
    }));

    it('should handle timeout error', fakeAsync(() => {
      // access token ok
      authServiceSpy.getAccessToken.and.returnValue(Promise.resolve('mock-token'));

      let resultError: ClassificationError | null = null;

      service.classifyExpense('Test', mockCategories).subscribe({
        next: () => fail('Expected timeout error'),
        error: err => (resultError = err),
      });

      const req = httpMock.expectOne(edgeFunctionUrl);

      // --- NIE WYWOŁUJEMY flush() ---
      // Pozwalamy timeoutowi RxJS zadziałać naturalnie

      tick(service['defaultTimeout'] + 1);

      expect(resultError).not.toBeNull();
      expect(resultError!.code).toBe('TIMEOUT_ERROR');
      expect(resultError!.message).toContain('Zapytanie trwało zbyt długo');
    }));

    describe('validateClassification', () => {
      it('should validate correct classification result', () => {
        const result = {
          categoryId: 'cat-1',
          categoryName: 'Transport',
          confidence: 0.8,
          isNewCategory: false,
          newCategoryName: '',
          reasoning: 'Test reasoning',
        };

        const validation = service.validateClassification(result);
        expect(validation.isValid).toBe(true);
        expect(validation.errors.length).toBe(0);
      });

      it('should reject result with missing category name', () => {
        const result = {
          categoryId: 'cat-1',
          categoryName: '',
          confidence: 0.8,
          isNewCategory: false,
          newCategoryName: '',
          reasoning: 'Test',
        };

        const validation = service.validateClassification(result);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Nazwa kategorii jest wymagana');
      });

      it('should reject result with invalid confidence score', () => {
        const result = {
          categoryId: 'cat-1',
          categoryName: 'Transport',
          confidence: 1.5,
          isNewCategory: false,
          newCategoryName: '',
          reasoning: 'Test',
        };

        const validation = service.validateClassification(result);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('Pewność musi być liczbą z zakresu 0-1');
      });

      it('should reject existing category without categoryId', () => {
        const result = {
          categoryId: null,
          categoryName: 'Transport',
          confidence: 0.8,
          isNewCategory: false,
          newCategoryName: '',
          reasoning: 'Test',
        };

        const validation = service.validateClassification(result);
        expect(validation.isValid).toBe(false);
        expect(validation.errors).toContain('categoryId jest wymagane dla istniejącej kategorii');
      });
    });
  });
});
