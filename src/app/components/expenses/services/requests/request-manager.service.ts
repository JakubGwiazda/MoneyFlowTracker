import { Injectable } from '@angular/core';

/**
 * Service for managing AbortControllers for HTTP requests.
 * Prevents memory leaks and race conditions.
 */
@Injectable({ providedIn: 'root' })
export class RequestManagerService {
  private readonly activeRequests = new Map<string, AbortController>();

  /**
   * Creates and registers a new AbortController for a request
   */
  createRequest(key: string): AbortController {
    // Abort any existing request with this key
    this.abortRequest(key);

    const controller = new AbortController();
    this.activeRequests.set(key, controller);
    return controller;
  }

  /**
   * Aborts a specific request
   */
  abortRequest(key: string): void {
    const controller = this.activeRequests.get(key);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(key);
    }
  }

  /**
   * Checks if a request was aborted
   */
  isAborted(key: string): boolean {
    const controller = this.activeRequests.get(key);
    return controller?.signal.aborted ?? false;
  }

  /**
   * Cleans up a completed request
   */
  cleanupRequest(key: string): void {
    this.activeRequests.delete(key);
  }

  /**
   * Aborts all active requests
   */
  abortAll(): void {
    for (const [key, controller] of this.activeRequests.entries()) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Gets the number of active requests
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}
