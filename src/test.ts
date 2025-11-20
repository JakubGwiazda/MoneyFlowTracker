import 'zone.js/testing';

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting,
} from '@angular/platform-browser-dynamic/testing';

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
  },
) => SpecsContext;

declare global {
  interface ImportMeta {
    webpackContext?: WebpackContextFactory;
  }
}

declare const require: {
  context(
    path: string,
    deep?: boolean,
    filter?: RegExp,
  ): SpecsContext;
} | undefined;

getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

const loadSpecs = (): void => {
  if (import.meta.webpackContext) {
    const context = import.meta.webpackContext('./', {
      recursive: true,
      regExp: /\.spec\.ts$/,
      mode: 'sync',
    });
    context.keys().forEach(context);
    return;
  }

  if (require?.context) {
    const context = require.context('./', true, /\.spec\.ts$/);
    context.keys().forEach(context);
    return;
  }

  throw new Error('Unable to locate a spec loader for the current bundler.');
};

loadSpecs();

