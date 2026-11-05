export abstract class StorageAdapter {
  abstract getItem<T>(key: string): T | null;
  abstract setItem<T>(key: string, value: T): void;
  abstract removeItem(key: string): void;
}
