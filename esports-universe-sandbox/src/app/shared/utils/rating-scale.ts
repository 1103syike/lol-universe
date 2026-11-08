export const RATING_MAX = 120;
export const LEGACY_RATING_MAX = 99;

export const RATING_GRADES = ['SS', 'S', 'A', 'B', 'C', 'D', 'E'] as const;

export type RatingGrade = (typeof RATING_GRADES)[number];

export function clampRating(value: number): number {
  return Math.min(RATING_MAX, Math.max(0, Math.round(value)));
}

export function ratingToGrade(rating: number): RatingGrade {
  const value = clampRating(rating);
  if (value >= 114) {
    return 'SS';
  }
  if (value >= 102) {
    return 'S';
  }
  if (value >= 90) {
    return 'A';
  }
  if (value >= 78) {
    return 'B';
  }
  if (value >= 66) {
    return 'C';
  }
  if (value >= 54) {
    return 'D';
  }
  return 'E';
}

export function scaleLegacyRating(value: number): number {
  return clampRating((Number(value) * RATING_MAX) / LEGACY_RATING_MAX);
}

export function ratingToStars(rating: number): number {
  const value = clampRating(rating);
  if (value >= 100) {
    return 5;
  }
  if (value >= 80) {
    return 4;
  }
  if (value >= 60) {
    return 3;
  }
  if (value >= 40) {
    return 2;
  }
  if (value >= 1) {
    return 1;
  }
  return 0;
}

export function formatStars(filled: number, max = 5): string {
  const safe = Math.min(max, Math.max(0, filled));
  return `${'★'.repeat(safe)}${'☆'.repeat(max - safe)}`;
}
