import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { JsonServerStorageAdapter } from './core/storage/json-server-storage.adapter';
import { StorageAdapter } from './core/storage/storage.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes, withComponentInputBinding()),
    JsonServerStorageAdapter,
    { provide: StorageAdapter, useExisting: JsonServerStorageAdapter },
    provideAppInitializer(() => inject(JsonServerStorageAdapter).hydrate()),
  ],
};
