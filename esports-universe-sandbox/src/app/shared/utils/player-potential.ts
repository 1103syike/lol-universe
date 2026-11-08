import type { GrowthTrend } from '../../core/models/player.model';
import { formatStars, ratingToStars } from './rating-scale';

export function potentialToStars(potential: number): number {
  return ratingToStars(potential);
}

export function currentToStars(current: number): number {
  return ratingToStars(current);
}

export function starsDisplay(rating: number): string {
  return formatStars(ratingToStars(rating));
}

export function growthRateToTrend(growthRate: number): GrowthTrend {
  if (growthRate > 0) {
    return 'rising';
  }
  if (growthRate < 0) {
    return 'declining';
  }
  return 'stable';
}

export function trendSymbol(trend: GrowthTrend): string {
  if (trend === 'rising') {
    return '↑';
  }
  if (trend === 'declining') {
    return '↓';
  }
  return '→';
}
