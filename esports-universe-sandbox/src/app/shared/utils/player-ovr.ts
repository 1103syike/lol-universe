import type { CoachAttributes } from '../../core/models/coach.model';
import { COACH_ATTRIBUTE_KEYS } from '../../core/models/coach.model';
import type { AttributeKey, Player, PlayerAttributes, PlayerPosition } from '../../core/models/player.model';
import { ATTRIBUTE_KEYS, PLAYER_POSITIONS } from '../../core/models/player.model';
import { clampRating } from './rating-scale';

const OVR_WEIGHTS: Record<PlayerPosition, Record<AttributeKey, number>> = {
  TOP: {
    laning: 0.25,
    mechanics: 0.2,
    teamfighting: 0.2,
    gameSense: 0.15,
    consistency: 0.1,
    adaptability: 0.1,
  },
  JUNGLE: {
    laning: 0.1,
    mechanics: 0.15,
    teamfighting: 0.2,
    gameSense: 0.25,
    consistency: 0.15,
    adaptability: 0.15,
  },
  MID: {
    laning: 0.2,
    mechanics: 0.25,
    teamfighting: 0.2,
    gameSense: 0.15,
    consistency: 0.1,
    adaptability: 0.1,
  },
  BOT: {
    laning: 0.2,
    mechanics: 0.25,
    teamfighting: 0.2,
    gameSense: 0.1,
    consistency: 0.15,
    adaptability: 0.1,
  },
  SUPPORT: {
    laning: 0.1,
    mechanics: 0.15,
    teamfighting: 0.2,
    gameSense: 0.25,
    consistency: 0.15,
    adaptability: 0.15,
  },
};

export function calculatePlayerOvr(attributes: PlayerAttributes, position: PlayerPosition): number {
  const weights = OVR_WEIGHTS[position];
  let total = 0;

  for (const key of ATTRIBUTE_KEYS) {
    total += attributes[key].current * weights[key];
  }

  return clampRating(total);
}

export function calculateOverallPotential(attributes: PlayerAttributes): number {
  const sum = ATTRIBUTE_KEYS.reduce((acc, key) => acc + attributes[key].potential, 0);
  return clampRating(sum / ATTRIBUTE_KEYS.length);
}

export function calculateCoachOvr(attributes: CoachAttributes): number {
  const sum = COACH_ATTRIBUTE_KEYS.reduce((acc, key) => acc + attributes[key], 0);
  return clampRating(sum / COACH_ATTRIBUTE_KEYS.length);
}

export function calculateTeamOvr(players: readonly Player[]): number {
  if (players.length === 0) {
    return 0;
  }

  const starterOvrs: number[] = [];
  for (const position of PLAYER_POSITIONS) {
    const atRole = players.filter((player) => player.position === position);
    if (atRole.length === 0) {
      continue;
    }
    let best = 0;
    for (const player of atRole) {
      const ovr = calculatePlayerOvr(player.attributes, player.position);
      if (ovr > best) {
        best = ovr;
      }
    }
    starterOvrs.push(best);
  }

  if (starterOvrs.length === 0) {
    const total = players.reduce(
      (sum, player) => sum + calculatePlayerOvr(player.attributes, player.position),
      0,
    );
    return clampRating(total / players.length);
  }

  const total = starterOvrs.reduce((sum, ovr) => sum + ovr, 0);
  return clampRating(total / starterOvrs.length);
}
