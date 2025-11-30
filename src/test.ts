import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

// Mock Navigator LockManager to prevent LockManager errors in tests
Object.defineProperty(navigator, 'locks', {
  value: {
    request: jasmine.createSpy('request').and.returnValue(Promise.resolve()),
    query: jasmine.createSpy('query').and.returnValue(Promise.resolve({ held: [], pending: [] })),
  },
  writable: true,
});

type SpecsContext = {
  keys(): string[];
  <T>(id: string): T;
};

type WebpackContextFactory = (
  request: string,
  options?: {
    recursive?: boolean;
    regExp?: RegExp;
    mode?: 'sync' | 'lazy' | 'eager' | 'weak';
  }
) => SpecsContext;

declare global {
  interface ImportMeta {
    webpackContext?: WebpackContextFactory;
  }
}

// Import all spec files explicitly to avoid bundler issues
import './lib/services/auth.service.spec.ts';
import './lib/services/classification.service.spec.ts';
import './lib/services/expenses.service.spec.ts';
import './lib/services/rate-limiter.service.spec.ts';
import './lib/validators/expenses.spec.ts';

getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
