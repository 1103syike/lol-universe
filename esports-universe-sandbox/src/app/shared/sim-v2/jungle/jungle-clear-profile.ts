import type { ChampionEntity } from '../state/entities';
import { hasSummoner } from '../combat/summoner-spells';

export function hasJungleCompanion(champion: ChampionEntity): boolean {
  return champion.positionLabel === 'JUNGLE' && hasSummoner(champion, 'Smite');
}

export function junglePetHitDamage(champion: ChampionEntity): number {
  if (!hasJungleCompanion(champion)) {
    return 0;
  }
  return 34 + champion.level * 13 + champion.ad * 0.26 + champion.ap * 0.15;
}

export function jungleMonsterDamageMult(champion: ChampionEntity): number {
  if (!hasJungleCompanion(champion)) {
    return 1;
  }
  const earlyBoost = Math.max(0, (7 - champion.level) * 0.035);
  return 1.24 + earlyBoost + Math.min(0.1, champion.level * 0.008);
}

export function expectedJungleCampsByTime(tSec: number): number {
  if (tSec <= 55) {
    return 0;
  }
  const afterSpawn = tSec - 55;
  if (afterSpawn <= 180) {
    return Math.min(6, 0.4 + afterSpawn / 36);
  }
  if (afterSpawn <= 480) {
    return 5.4 + (afterSpawn - 180) / 48;
  }
  if (afterSpawn <= 900) {
    return 11.65 + (afterSpawn - 480) / 52;
  }
  return Math.min(48, 19.7 + (afterSpawn - 900) / 58);
}

export function jungleFarmPace(champion: ChampionEntity, tSec: number): number {
  const expected = expectedJungleCampsByTime(tSec);
  return champion.campKills / Math.max(0.8, expected);
}

export function jungleFarmSlack(champion: ChampionEntity, tSec: number): number {
  return Math.max(0, expectedJungleCampsByTime(tSec) - champion.campKills);
}

export function jungleFarmBehindAmount(pace: number): number {
  return Math.max(0, Math.min(1.4, 1 - pace));
}

export function jungleFarmAheadAmount(pace: number): number {
  return Math.max(0, Math.min(1.2, pace - 1));
}
