import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RateLimiterService {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests = 10;
  private readonly timeWindow = 60000; // 1 minuta

  canMakeRequest(key: string = 'default'): boolean {
    const now = Date.now();
    const requests = this.getRequests(key);
    
    // Usuń stare requesty
    const validRequests = requests.filter(time => now - time < this.timeWindow);
    this.requests.set(key, validRequests);
    
    return validRequests.length < this.maxRequests;
  }

  recordRequest(key: string = 'default'): void {
    const requests = this.getRequests(key);
    requests.push(Date.now());
    this.requests.set(key, requests);
  }

  getTimeUntilNextRequest(key: string = 'default'): number {
    if (this.canMakeRequest(key)) return 0;
    
    const requests = this.getRequests(key);
    const oldestRequest = Math.min(...requests);
    return this.timeWindow - (Date.now() - oldestRequest);
  }

  getRemainingRequests(key: string = 'default'): number {
    const now = Date.now();
    const requests = this.getRequests(key);
    const validRequests = requests.filter(time => now - time < this.timeWindow);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }

  private getRequests(key: string): number[] {
    return this.requests.get(key) || [];
  }

  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}
