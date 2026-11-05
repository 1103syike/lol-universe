import { Injectable } from '@angular/core';
import { StorageAdapter } from './storage.adapter';

@Injectable()
export class LocalStorageAdapter extends StorageAdapter {
  getItem<T>(key: string): T | null {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
}
