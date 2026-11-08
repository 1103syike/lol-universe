import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { StorageAdapter } from './storage.adapter';

interface StorageEntry {
  id: string;
  value: unknown;
}

const API_ENTRIES = '/api/entries';
const MIGRATED_FLAG = 'eus.json-server.migrated';

@Injectable()
export class JsonServerStorageAdapter extends StorageAdapter {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, unknown>();
  private readonly knownIds = new Set<string>();
  private ready = false;

  async hydrate(): Promise<void> {
    if (this.ready) {
      return;
    }
    this.cache.clear();
    this.knownIds.clear();
    try {
      const entries = await firstValueFrom(this.http.get<StorageEntry[]>(API_ENTRIES));
      for (const entry of entries) {
        this.cache.set(entry.id, entry.value);
        this.knownIds.add(entry.id);
      }
      if (entries.length === 0) {
        await this.importFromLocalStorage();
      }
    } catch {
      await this.importFromLocalStorage();
    }
    this.ready = true;
  }

  getItem<T>(key: string): T | null {
    if (!this.cache.has(key)) {
      return null;
    }
    return this.cache.get(key) as T;
  }

  setItem<T>(key: string, value: T): void {
    this.cache.set(key, value);
    this.persist(key, value);
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    if (!this.knownIds.has(key)) {
      return;
    }
    this.knownIds.delete(key);
    void firstValueFrom(this.http.delete(`${API_ENTRIES}/${encodeURIComponent(key)}`)).catch(() => undefined);
  }

  private persist(key: string, value: unknown): void {
    const body: StorageEntry = { id: key, value };
    const url = `${API_ENTRIES}/${encodeURIComponent(key)}`;
    const write$ = this.knownIds.has(key)
      ? this.http.put(url, body)
      : this.http.post(API_ENTRIES, body);
    this.knownIds.add(key);
    void firstValueFrom(write$).catch(() =>
      firstValueFrom(this.http.put(url, body)).catch(() => undefined),
    );
  }

  private async importFromLocalStorage(): Promise<void> {
    if (typeof localStorage === 'undefined' || localStorage.getItem(MIGRATED_FLAG) === '1') {
      return;
    }
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('eus.') && key !== MIGRATED_FLAG) {
        keys.push(key);
      }
    }
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw === null) {
        continue;
      }
      try {
        const value = JSON.parse(raw) as unknown;
        this.cache.set(key, value);
        const body: StorageEntry = { id: key, value };
        await firstValueFrom(this.http.post(API_ENTRIES, body));
        this.knownIds.add(key);
      } catch {
        continue;
      }
    }
    localStorage.setItem(MIGRATED_FLAG, '1');
  }
}
