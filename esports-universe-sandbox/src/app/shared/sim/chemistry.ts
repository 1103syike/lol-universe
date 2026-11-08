import type { Coach } from '../../core/models/coach.model';
import type { Player, PlayerPosition } from '../../core/models/player.model';
import { SIM_BALANCE } from './balance';

const SYNERGY_PAIRS: Array<readonly [PlayerPosition, PlayerPosition]> = [
  ['BOT', 'SUPPORT'],
  ['JUNGLE', 'MID'],
  ['TOP', 'JUNGLE'],
  ['MID', 'BOT'],
];

function hasPair(roster: readonly Player[], left: PlayerPosition, right: PlayerPosition): boolean {
  return roster.some((player) => player.position === left) && roster.some((player) => player.position === right);
}

function pairScore(roster: readonly Player[], left: PlayerPosition, right: PlayerPosition): number {
  const a = roster.find((player) => player.position === left);
  const b = roster.find((player) => player.position === right);
  if (!a || !b) {
    return 0;
  }
  const sense = (a.attributes.gameSense.current + b.attributes.gameSense.current) / 240;
  const stable = (a.attributes.consistency.current + b.attributes.consistency.current) / 240;
  const clash =
    Math.abs(a.attributes.mechanics.current - b.attributes.mechanics.current) / 120 +
    Math.abs(a.attributes.laning.current - b.attributes.adaptability.current) / 180;
  return sense * 0.45 + stable * 0.35 - clash * 0.35;
}

export function calculateChemistry(roster: readonly Player[], coach: Coach | null): number {
  let score = SIM_BALANCE.chemistryBase;
  for (const [left, right] of SYNERGY_PAIRS) {
    if (!hasPair(roster, left, right)) {
      continue;
    }
    const value = pairScore(roster, left, right);
    if (value >= 0.08) {
      score += SIM_BALANCE.chemistryPairBonus * Math.min(1, value * 2);
    } else if (value <= -0.05) {
      score -= SIM_BALANCE.chemistryConflictPenalty * Math.min(1, Math.abs(value) * 2);
    }
  }

  if (coach) {
    const integration = coach.attributes.teamIntegration / 120;
    score += (integration - 0.5) * SIM_BALANCE.coachIntegrationWeight;
  }

  const archetypes = roster.map((player) => {
    const aggression = (player.attributes.laning.current + player.attributes.mechanics.current) / 2;
    const teamfight = (player.attributes.teamfighting.current + player.attributes.gameSense.current) / 2;
    return aggression - teamfight;
  });
  if (archetypes.length >= 3) {
    const mean = archetypes.reduce((sum, value) => sum + value, 0) / archetypes.length;
    const variance = archetypes.reduce((sum, value) => sum + (value - mean) ** 2, 0) / archetypes.length;
    if (variance > 900) {
      score -= SIM_BALANCE.chemistryConflictPenalty * 0.8;
    }
  }

  return Math.min(1.12, Math.max(0.75, score));
}
