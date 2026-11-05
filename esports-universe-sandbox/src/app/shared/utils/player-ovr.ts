import type { AttributeKey, PlayerAttributes, PlayerPosition } from '../../core/models/player.model';
import { ATTRIBUTE_KEYS } from '../../core/models/player.model';

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

  return Math.round(total);
}

export function calculateOverallPotential(attributes: PlayerAttributes): number {
  const sum = ATTRIBUTE_KEYS.reduce((acc, key) => acc + attributes[key].potential, 0);
  return Math.round(sum / ATTRIBUTE_KEYS.length);
}
