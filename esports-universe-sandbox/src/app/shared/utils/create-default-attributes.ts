import type { AttributeKey, PlayerAttributes } from '../../core/models/player.model';
import { ATTRIBUTE_KEYS } from '../../core/models/player.model';
import { clampRating } from './rating-scale';

export { clampRating, RATING_MAX } from './rating-scale';

export function createDefaultAttributes(base = 85): PlayerAttributes {
  const attributes = {} as PlayerAttributes;

  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] = {
      current: clampRating(base),
      potential: clampRating(base + 12),
      growthRate: 1,
    };
  }

  return attributes;
}

export function clampGrowthRate(value: number): number {
  return Math.min(5, Math.max(-5, Math.round(value)));
}

export function isAttributeKey(value: string): value is AttributeKey {
  return (ATTRIBUTE_KEYS as readonly string[]).includes(value);
}
