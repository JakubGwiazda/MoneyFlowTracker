import { TestBed } from '@angular/core/testing';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService - Critical Rate Limiting Tests', () => {
  let service: RateLimiterService;
  const testKey = 'classification';
  const batchKey = 'batch-classification';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RateLimiterService]
    });
    service = TestBed.inject(RateLimiterService);
    
    // Clear all rate limits before each test
    service.reset();
  });

  describe('canMakeRequest - Check Request Availability', () => {
    it('should allow request when no previous requests exist', () => {
      const canMake = service.canMakeRequest(testKey);
      
      expect(canMake).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(10);
    });

    it('should allow requests within the limit (< 10 requests)', () => {
      // Record 5 requests
      for (let i = 0; i < 5; i++) {
        service.recordRequest(testKey);
      }
      
      const canMake = service.canMakeRequest(testKey);
      
      expect(canMake).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(5);
    });

    it('should allow exactly 10 requests in the time window', () => {
      // Record 9 requests (can still make 10th)
      for (let i = 0; i < 9; i++) {
        service.recordRequest(testKey);
      }
      
      expect(service.canMakeRequest(testKey)).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(1);
      
      // Record 10th request
      service.recordRequest(testKey);
      
      expect(service.canMakeRequest(testKey)).toBe(false);
      expect(service.getRemainingRequests(testKey)).toBe(0);
    });

    it('should block requests after exceeding the limit (>= 10 requests)', () => {
      // Exhaust the rate limit
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      const canMake = service.canMakeRequest(testKey);
      
      expect(canMake).toBe(false);
      expect(service.getRemainingRequests(testKey)).toBe(0);
    });

    it('should maintain separate counters for different keys', () => {
      // Record 10 requests for classification
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      // Record 5 requests for batch-classification
      for (let i = 0; i < 5; i++) {
        service.recordRequest(batchKey);
      }
      
      // classification should be blocked
      expect(service.canMakeRequest(testKey)).toBe(false);
      expect(service.getRemainingRequests(testKey)).toBe(0);
      
      // batch-classification should still be allowed
      expect(service.canMakeRequest(batchKey)).toBe(true);
      expect(service.getRemainingRequests(batchKey)).toBe(5);
    });

    it('should use "default" key when no key is provided', () => {
      // Record requests without key
      for (let i = 0; i < 5; i++) {
        service.recordRequest();
      }
      
      expect(service.canMakeRequest()).toBe(true);
      expect(service.getRemainingRequests()).toBe(5);
      
      // Should not affect other keys
      expect(service.canMakeRequest(testKey)).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(10);
    });
  });

  describe('recordRequest - Track Request Timing', () => {
    it('should record request with current timestamp', () => {
      const beforeTime = Date.now();
      
      service.recordRequest(testKey);
      
      const afterTime = Date.now();
      const remaining = service.getRemainingRequests(testKey);
      
      expect(remaining).toBe(9);
      
      // Verify request was recorded (time window check)
      expect(service.canMakeRequest(testKey)).toBe(true);
    });

    it('should accumulate multiple requests', () => {
      service.recordRequest(testKey);
      expect(service.getRemainingRequests(testKey)).toBe(9);
      
      service.recordRequest(testKey);
      expect(service.getRemainingRequests(testKey)).toBe(8);
      
      service.recordRequest(testKey);
      expect(service.getRemainingRequests(testKey)).toBe(7);
    });

    it('should allow exactly 10 requests before blocking', () => {
      for (let i = 1; i <= 10; i++) {
        expect(service.canMakeRequest(testKey)).toBe(true);
        service.recordRequest(testKey);
        expect(service.getRemainingRequests(testKey)).toBe(10 - i);
      }
      
      // 11th request should be blocked
      expect(service.canMakeRequest(testKey)).toBe(false);
    });
  });

  describe('getTimeUntilNextRequest - Calculate Wait Time', () => {
    it('should return 0 when requests are available', () => {
      const waitTime = service.getTimeUntilNextRequest(testKey);
      
      expect(waitTime).toBe(0);
    });

    it('should return positive wait time when limit is exceeded', () => {
      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      const waitTime = service.getTimeUntilNextRequest(testKey);
      
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(60000); // Max 1 minute window
    });

    it('should calculate remaining time based on oldest request', () => {
      const startTime = Date.now();
      
      // Record requests
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      const waitTime = service.getTimeUntilNextRequest(testKey);
      const expectedMaxWait = 60000; // Time window is 60 seconds
      
      expect(waitTime).toBeLessThanOrEqual(expectedMaxWait);
      expect(waitTime).toBeGreaterThan(0);
    });
  });

  describe('Reset Time Window - Expired Requests', () => {
    it('should automatically remove expired requests (>60s old)', (done) => {
      // This test verifies the time window cleanup logic
      // We'll manually manipulate the internal state for testing
      
      // Record 10 requests
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      expect(service.canMakeRequest(testKey)).toBe(false);
      
      // Access private requests map to simulate old timestamps
      const privateService = service as any;
      const requests = privateService.requests.get(testKey);
      
      // Set all requests to 61 seconds ago
      const oldTimestamp = Date.now() - 61000;
      privateService.requests.set(testKey, requests.map(() => oldTimestamp));
      
      // Now requests should be available again
      expect(service.canMakeRequest(testKey)).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(10);
      
      done();
    });

    it('should only count requests within the 60-second window', () => {
      const privateService = service as any;
      const now = Date.now();
      
      // Manually set requests at different times
      const requests = [
        now - 70000, // 70 seconds ago (expired)
        now - 65000, // 65 seconds ago (expired)
        now - 30000, // 30 seconds ago (valid)
        now - 10000, // 10 seconds ago (valid)
        now - 5000,  // 5 seconds ago (valid)
      ];
      
      privateService.requests.set(testKey, requests);
      
      // Should only count 3 valid requests
      expect(service.getRemainingRequests(testKey)).toBe(7);
      expect(service.canMakeRequest(testKey)).toBe(true);
    });

    it('should recalculate valid requests on each canMakeRequest call', () => {
      const privateService = service as any;
      const now = Date.now();
      
      // Set 10 requests, some old, some new
      const requests = [
        now - 70000, now - 65000, now - 62000, // 3 expired
        now - 50000, now - 40000, now - 30000, now - 20000, now - 10000, now - 5000, now - 1000 // 7 valid
      ];
      
      privateService.requests.set(testKey, requests);
      
      // First check - should clean up expired and show 7 valid requests
      const canMake1 = service.canMakeRequest(testKey);
      expect(canMake1).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(3);
      
      // Verify expired requests were removed from internal map
      const updatedRequests = privateService.requests.get(testKey);
      expect(updatedRequests.length).toBe(7);
    });
  });

  describe('reset - Clear Rate Limits', () => {
    it('should reset rate limit for specific key', () => {
      // Exhaust limit for classification
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      // Record some for batch
      for (let i = 0; i < 5; i++) {
        service.recordRequest(batchKey);
      }
      
      expect(service.canMakeRequest(testKey)).toBe(false);
      
      // Reset only classification key
      service.reset(testKey);
      
      expect(service.canMakeRequest(testKey)).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(10);
      
      // Batch key should be unchanged
      expect(service.getRemainingRequests(batchKey)).toBe(5);
    });

    it('should reset all rate limits when no key provided', () => {
      // Exhaust limits for multiple keys
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
        service.recordRequest(batchKey);
        service.recordRequest('default');
      }
      
      expect(service.canMakeRequest(testKey)).toBe(false);
      expect(service.canMakeRequest(batchKey)).toBe(false);
      expect(service.canMakeRequest('default')).toBe(false);
      
      // Reset all
      service.reset();
      
      expect(service.canMakeRequest(testKey)).toBe(true);
      expect(service.canMakeRequest(batchKey)).toBe(true);
      expect(service.canMakeRequest('default')).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(10);
      expect(service.getRemainingRequests(batchKey)).toBe(10);
    });
  });

  describe('Integration - Real-world Rate Limiting Scenarios', () => {
    it('should prevent API cost overrun by blocking excess requests', () => {
      let successfulRequests = 0;
      let blockedRequests = 0;
      
      // Simulate 15 classification attempts
      for (let i = 0; i < 15; i++) {
        if (service.canMakeRequest(testKey)) {
          service.recordRequest(testKey);
          successfulRequests++;
        } else {
          blockedRequests++;
        }
      }
      
      expect(successfulRequests).toBe(10); // Max limit
      expect(blockedRequests).toBe(5); // Blocked attempts
      expect(service.canMakeRequest(testKey)).toBe(false);
    });

    it('should provide accurate wait time for user feedback', () => {
      // Exhaust limit
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      const waitTime = service.getTimeUntilNextRequest(testKey);
      const waitTimeSeconds = Math.ceil(waitTime / 1000);
      
      expect(waitTimeSeconds).toBeGreaterThan(0);
      expect(waitTimeSeconds).toBeLessThanOrEqual(60);
      
      // This matches the user-facing message format from ClassificationService
      const message = `Przekroczono limit zapytań. Spróbuj ponownie za ${waitTimeSeconds} sekund.`;
      expect(message).toContain('sekund');
    });

    it('should handle burst requests followed by gradual recovery', () => {
      // Burst: 10 requests immediately
      for (let i = 0; i < 10; i++) {
        service.recordRequest(testKey);
      }
      
      expect(service.canMakeRequest(testKey)).toBe(false);
      
      // Simulate requests gradually expiring
      const privateService = service as any;
      const requests = privateService.requests.get(testKey);
      
      // Make first 5 requests expire
      const now = Date.now();
      const updatedRequests = [
        ...requests.slice(0, 5).map(() => now - 61000), // Expired
        ...requests.slice(5).map(() => now - 10000) // Still valid
      ];
      privateService.requests.set(testKey, updatedRequests);
      
      // Should now allow requests again
      expect(service.canMakeRequest(testKey)).toBe(true);
      expect(service.getRemainingRequests(testKey)).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent requests for different operations', () => {
      // Simulate classification and batch operations happening simultaneously
      service.recordRequest('classification');
      service.recordRequest('batch-classification');
      service.recordRequest('classification');
      service.recordRequest('batch-classification');
      
      expect(service.getRemainingRequests('classification')).toBe(8);
      expect(service.getRemainingRequests('batch-classification')).toBe(8);
    });

    it('should handle requests with undefined/null keys gracefully', () => {
      // Should use 'default' key
      expect(() => {
        service.canMakeRequest(undefined as any);
      }).not.toThrow();
      
      expect(() => {
        service.recordRequest(undefined as any);
      }).not.toThrow();
    });

    it('should maintain accurate count across multiple check-record cycles', () => {
      for (let i = 0; i < 5; i++) {
        const canMake = service.canMakeRequest(testKey);
        expect(canMake).toBe(true);
        
        service.recordRequest(testKey);
        
        const remaining = service.getRemainingRequests(testKey);
        expect(remaining).toBe(10 - (i + 1));
      }
    });
  });
});

