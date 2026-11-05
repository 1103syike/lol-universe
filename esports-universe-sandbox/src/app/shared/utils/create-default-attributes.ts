import type { AttributeKey, PlayerAttributes } from '../../core/models/player.model';
import { ATTRIBUTE_KEYS } from '../../core/models/player.model';

export function createDefaultAttributes(base = 70): PlayerAttributes {
  const attributes = {} as PlayerAttributes;

  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] = {
      current: clampRating(base),
      potential: clampRating(base + 10),
      growthRate: 1,
    };
  }

  return attributes;
}

export function clampRating(value: number): number {
  return Math.min(99, Math.max(0, Math.round(value)));
}

export function clampGrowthRate(value: number): number {
  return Math.min(5, Math.max(-5, Math.round(value)));
}

export function isAttributeKey(value: string): value is AttributeKey {
  return (ATTRIBUTE_KEYS as readonly string[]).includes(value);
}
