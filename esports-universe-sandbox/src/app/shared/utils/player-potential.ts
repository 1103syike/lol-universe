import type { GrowthTrend } from '../../core/models/player.model';

export function potentialToStars(potential: number): number {
  if (potential >= 90) {
    return 5;
  }
  if (potential >= 80) {
    return 4;
  }
  if (potential >= 70) {
    return 3;
  }
  if (potential >= 60) {
    return 2;
  }
  return 1;
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
