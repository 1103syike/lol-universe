export const STORAGE_KEYS = {
  universeStore: 'eus.universe-store',
  universeData: (universeId: string) => `eus.universe.${universeId}`,
} as const;
