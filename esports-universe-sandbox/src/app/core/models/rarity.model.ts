export const RARITIES = ['N', 'R', 'SR', 'SSR', 'UR'] as const;

export type Rarity = (typeof RARITIES)[number];

export const RARITY_LABELS: Record<Rarity, string> = {
  N: 'N',
  R: 'R',
  SR: 'SR',
  SSR: 'SSR',
  UR: 'UR',
};

export const RARITY_NAMES: Record<Rarity, string> = {
  N: '普通',
  R: '稀有',
  SR: '超稀有',
  SSR: '特級超稀有',
  UR: '頂級稀有',
};

export function isRarity(value: string): value is Rarity {
  return (RARITIES as readonly string[]).includes(value);
}

export function suggestRarityFromOvr(ovr: number): Rarity {
  if (ovr >= 108) {
    return 'UR';
  }
  if (ovr >= 96) {
    return 'SSR';
  }
  if (ovr >= 84) {
    return 'SR';
  }
  if (ovr >= 72) {
    return 'R';
  }
  return 'N';
}
