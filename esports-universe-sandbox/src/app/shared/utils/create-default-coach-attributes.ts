import type { CoachAttributes } from '../../core/models/coach.model';
import { COACH_ATTRIBUTE_KEYS } from '../../core/models/coach.model';
import { clampRating } from './create-default-attributes';

export function createDefaultCoachAttributes(base = 70): CoachAttributes {
  const attributes = {} as CoachAttributes;

  for (const key of COACH_ATTRIBUTE_KEYS) {
    attributes[key] = clampRating(base);
  }

  return attributes;
}
