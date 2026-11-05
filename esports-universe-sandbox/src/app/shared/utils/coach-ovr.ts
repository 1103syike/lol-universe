import type { CoachAttributes } from '../../core/models/coach.model';
import { COACH_ATTRIBUTE_KEYS } from '../../core/models/coach.model';

export function calculateCoachOvr(attributes: CoachAttributes): number {
  const total = COACH_ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributes[key], 0);
  return Math.round(total / COACH_ATTRIBUTE_KEYS.length);
}
