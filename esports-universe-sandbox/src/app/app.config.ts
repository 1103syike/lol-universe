import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { LocalStorageAdapter } from './core/storage/local-storage.adapter';
import { StorageAdapter } from './core/storage/storage.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    { provide: StorageAdapter, useClass: LocalStorageAdapter },
  ],
};
