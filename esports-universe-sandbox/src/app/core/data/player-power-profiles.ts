import type { LeagueTier } from '../models/league.model';
import type { AttributeKey, Player, PlayerAttributes, PlayerPosition } from '../models/player.model';
import { ATTRIBUTE_KEYS } from '../models/player.model';
import type { Rarity } from '../models/rarity.model';
import { suggestRarityFromOvr } from '../models/rarity.model';
import type { Team } from '../models/team.model';
import { clampRating } from '../../shared/utils/rating-scale';
import { calculatePlayerOvr } from '../../shared/utils/player-ovr';

export const RETIRED_SEED_PLAYER_TAGS = new Set(['Wuji', 'Nestea']);

export const SEED_POWER_REVISION = 5;

type AttrBand = { current: number; potential?: number; growthRate?: number };
export type AttributeSeed = Partial<Record<AttributeKey, AttrBand>>;

export interface PlayerPowerProfile {
  form?: number;
  rarity?: Rarity;
  attributes: AttributeSeed;
}

type TeamPowerBand = {
  current: [number, number];
  potentialBonus: [number, number];
  growthRate: number;
  form: [number, number];
};

const TEAM_POWER: Record<string, TeamPowerBand> = {
  GT: { current: [90, 100], potentialBonus: [6, 14], growthRate: 1.5, form: [84, 94] },
  RM: { current: [90, 100], potentialBonus: [5, 12], growthRate: 1.35, form: [84, 94] },
  WS: { current: [88, 98], potentialBonus: [5, 12], growthRate: 1.3, form: [82, 92] },
  FEG: { current: [88, 98], potentialBonus: [5, 12], growthRate: 1.25, form: [82, 92] },
  JT: { current: [86, 96], potentialBonus: [5, 12], growthRate: 1.3, form: [82, 92] },
  PSG: { current: [84, 92], potentialBonus: [6, 12], growthRate: 1.3, form: [78, 88] },
  DCG: { current: [80, 88], potentialBonus: [6, 12], growthRate: 1.35, form: [76, 86] },
  MAD: { current: [80, 88], potentialBonus: [6, 12], growthRate: 1.35, form: [76, 86] },
  HKA: { current: [78, 86], potentialBonus: [6, 12], growthRate: 1.3, form: [74, 84] },
  ahq: { current: [78, 86], potentialBonus: [6, 12], growthRate: 1.3, form: [74, 84] },
  NVM: { current: [78, 86], potentialBonus: [6, 12], growthRate: 1.4, form: [74, 84] },
  ANK: { current: [77, 85], potentialBonus: [6, 12], growthRate: 1.4, form: [73, 83] },
  SMG: { current: [76, 84], potentialBonus: [6, 12], growthRate: 1.4, form: [72, 82] },
  TXO: { current: [76, 84], potentialBonus: [6, 12], growthRate: 1.4, form: [72, 82] },
  ONE: { current: [74, 82], potentialBonus: [6, 12], growthRate: 1.35, form: [70, 80] },
  BMG: { current: [73, 81], potentialBonus: [6, 12], growthRate: 1.35, form: [69, 79] },
  GRX: { current: [72, 80], potentialBonus: [6, 12], growthRate: 1.35, form: [68, 78] },
  BYG: { current: [72, 80], potentialBonus: [6, 12], growthRate: 1.35, form: [68, 78] },
  OCE: { current: [71, 79], potentialBonus: [6, 12], growthRate: 1.35, form: [67, 77] },
  MCX: { current: [71, 79], potentialBonus: [6, 12], growthRate: 1.35, form: [67, 77] },
};

const TCS_DEFAULT: TeamPowerBand = {
  current: [82, 92],
  potentialBonus: [6, 12],
  growthRate: 1.3,
  form: [76, 86],
};

const TCL_DEFAULT: TeamPowerBand = {
  current: [72, 82],
  potentialBonus: [6, 12],
  growthRate: 1.35,
  form: [68, 78],
};

function attrs(
  values: Record<AttributeKey, number>,
  pot = 6,
  growthRate?: number,
): AttributeSeed {
  const seed: AttributeSeed = {};
  for (const key of ATTRIBUTE_KEYS) {
    const current = values[key];
    seed[key] = {
      current,
      potential: clampRating(current + pot),
      ...(growthRate == null ? {} : { growthRate }),
    };
  }
  return seed;
}

export const PLAYER_POWER_PROFILES: Record<string, PlayerPowerProfile> = {
  Chilyz: {
    form: 99,
    rarity: 'UR',
    attributes: attrs({
      laning: 114,
      mechanics: 116,
      teamfighting: 112,
      gameSense: 115,
      consistency: 114,
      adaptability: 112,
    }),
  },
  Doris: {
    form: 97,
    rarity: 'UR',
    attributes: attrs({
      laning: 100,
      mechanics: 110,
      teamfighting: 114,
      gameSense: 116,
      consistency: 112,
      adaptability: 110,
    }),
  },
  Union: {
    form: 84,
    attributes: attrs({
      laning: 88,
      mechanics: 86,
      teamfighting: 87,
      gameSense: 85,
      consistency: 88,
      adaptability: 84,
    }),
  },
  vans: {
    form: 83,
    attributes: attrs({
      laning: 87,
      mechanics: 89,
      teamfighting: 86,
      gameSense: 84,
      consistency: 85,
      adaptability: 85,
    }),
  },
  Dodo: {
    form: 82,
    attributes: attrs({
      laning: 80,
      mechanics: 82,
      teamfighting: 88,
      gameSense: 89,
      consistency: 86,
      adaptability: 84,
    }),
  },
  River: {
    form: 90,
    rarity: 'SSR',
    attributes: attrs({
      laning: 90,
      mechanics: 94,
      teamfighting: 95,
      gameSense: 96,
      consistency: 92,
      adaptability: 93,
    }),
  },
  Forge: {
    form: 89,
    rarity: 'SSR',
    attributes: attrs({
      laning: 93,
      mechanics: 95,
      teamfighting: 92,
      gameSense: 91,
      consistency: 90,
      adaptability: 92,
    }),
  },
  Spear: {
    form: 82,
    attributes: attrs({
      laning: 86,
      mechanics: 84,
      teamfighting: 85,
      gameSense: 83,
      consistency: 85,
      adaptability: 82,
    }),
  },
  Bolt: {
    form: 81,
    attributes: attrs({
      laning: 84,
      mechanics: 86,
      teamfighting: 83,
      gameSense: 82,
      consistency: 84,
      adaptability: 83,
    }),
  },
  Wing: {
    form: 80,
    attributes: attrs({
      laning: 78,
      mechanics: 80,
      teamfighting: 86,
      gameSense: 87,
      consistency: 84,
      adaptability: 82,
    }),
  },
  Prism: {
    form: 86,
    rarity: 'SR',
    attributes: attrs({
      laning: 90,
      mechanics: 92,
      teamfighting: 88,
      gameSense: 86,
      consistency: 87,
      adaptability: 88,
    }),
  },
  Azhi: {
    form: 80,
    attributes: attrs({
      laning: 84,
      mechanics: 82,
      teamfighting: 81,
      gameSense: 80,
      consistency: 83,
      adaptability: 80,
    }),
  },
  Relic: {
    form: 79,
    attributes: attrs({
      laning: 80,
      mechanics: 82,
      teamfighting: 83,
      gameSense: 84,
      consistency: 81,
      adaptability: 82,
    }),
  },
  Apex: {
    form: 80,
    attributes: attrs({
      laning: 83,
      mechanics: 84,
      teamfighting: 82,
      gameSense: 81,
      consistency: 82,
      adaptability: 81,
    }),
  },
  Quartz: {
    form: 78,
    attributes: attrs({
      laning: 76,
      mechanics: 78,
      teamfighting: 84,
      gameSense: 85,
      consistency: 82,
      adaptability: 80,
    }),
  },
  Nuz: {
    form: 95,
    rarity: 'UR',
    attributes: attrs({
      laning: 100,
      mechanics: 106,
      teamfighting: 108,
      gameSense: 110,
      consistency: 104,
      adaptability: 106,
    }),
  },
  Cassini: {
    form: 90,
    rarity: 'SSR',
    attributes: attrs({
      laning: 96,
      mechanics: 98,
      teamfighting: 95,
      gameSense: 94,
      consistency: 93,
      adaptability: 94,
    }),
  },
  Unicials: {
    form: 89,
    rarity: 'SSR',
    attributes: attrs({
      laning: 96,
      mechanics: 92,
      teamfighting: 94,
      gameSense: 93,
      consistency: 95,
      adaptability: 90,
    }),
  },
  Lanyz: {
    form: 88,
    rarity: 'SR',
    attributes: attrs({
      laning: 90,
      mechanics: 94,
      teamfighting: 96,
      gameSense: 92,
      consistency: 91,
      adaptability: 93,
    }),
  },
  Shields: {
    form: 84,
    attributes: attrs({
      laning: 82,
      mechanics: 84,
      teamfighting: 90,
      gameSense: 91,
      consistency: 88,
      adaptability: 86,
    }),
  },
  Gemini: {
    form: 88,
    rarity: 'SR',
    attributes: attrs({
      laning: 88,
      mechanics: 92,
      teamfighting: 93,
      gameSense: 94,
      consistency: 90,
      adaptability: 91,
    }),
  },
  Koala: {
    form: 87,
    rarity: 'SR',
    attributes: attrs({
      laning: 84,
      mechanics: 86,
      teamfighting: 94,
      gameSense: 95,
      consistency: 91,
      adaptability: 90,
    }),
  },
  Rock: {
    form: 80,
    attributes: attrs({
      laning: 84,
      mechanics: 82,
      teamfighting: 81,
      gameSense: 80,
      consistency: 83,
      adaptability: 80,
    }),
  },
  Pulse: {
    form: 79,
    attributes: attrs({
      laning: 82,
      mechanics: 83,
      teamfighting: 81,
      gameSense: 80,
      consistency: 81,
      adaptability: 82,
    }),
  },
  Bruce: {
    form: 80,
    attributes: attrs({
      laning: 83,
      mechanics: 85,
      teamfighting: 82,
      gameSense: 80,
      consistency: 82,
      adaptability: 81,
    }),
  },
  MnM: {
    form: 88,
    rarity: 'SR',
    attributes: attrs({
      laning: 91,
      mechanics: 94,
      teamfighting: 90,
      gameSense: 87,
      consistency: 88,
      adaptability: 89,
    }),
  },
  Zoom: {
    form: 80,
    attributes: attrs({
      laning: 84,
      mechanics: 82,
      teamfighting: 81,
      gameSense: 80,
      consistency: 82,
      adaptability: 80,
    }),
  },
  Lark: {
    form: 79,
    attributes: attrs({
      laning: 80,
      mechanics: 82,
      teamfighting: 83,
      gameSense: 84,
      consistency: 81,
      adaptability: 82,
    }),
  },
  Moon: {
    form: 79,
    attributes: attrs({
      laning: 82,
      mechanics: 83,
      teamfighting: 81,
      gameSense: 80,
      consistency: 81,
      adaptability: 81,
    }),
  },
  Kaix: {
    form: 78,
    attributes: attrs({
      laning: 76,
      mechanics: 78,
      teamfighting: 84,
      gameSense: 85,
      consistency: 82,
      adaptability: 80,
    }),
  },
  Mission: {
    form: 88,
    rarity: 'SR',
    attributes: attrs({
      laning: 92,
      mechanics: 94,
      teamfighting: 91,
      gameSense: 90,
      consistency: 89,
      adaptability: 90,
    }),
  },
  Pika: {
    form: 80,
    attributes: attrs({
      laning: 84,
      mechanics: 82,
      teamfighting: 81,
      gameSense: 80,
      consistency: 83,
      adaptability: 80,
    }),
  },
  Burrow: {
    form: 79,
    attributes: attrs({
      laning: 80,
      mechanics: 82,
      teamfighting: 83,
      gameSense: 84,
      consistency: 81,
      adaptability: 82,
    }),
  },
  Atlen: {
    form: 80,
    attributes: attrs({
      laning: 83,
      mechanics: 85,
      teamfighting: 82,
      gameSense: 80,
      consistency: 82,
      adaptability: 81,
    }),
  },
  Deep: {
    form: 78,
    attributes: attrs({
      laning: 76,
      mechanics: 78,
      teamfighting: 84,
      gameSense: 85,
      consistency: 82,
      adaptability: 80,
    }),
  },
  Kinko: {
    form: 93,
    rarity: 'SSR',
    attributes: attrs({
      laning: 104,
      mechanics: 102,
      teamfighting: 100,
      gameSense: 96,
      consistency: 98,
      adaptability: 100,
    }),
  },
  Quan: {
    form: 92,
    rarity: 'SSR',
    attributes: attrs({
      laning: 94,
      mechanics: 102,
      teamfighting: 104,
      gameSense: 103,
      consistency: 96,
      adaptability: 101,
    }),
  },
  Meiji: {
    form: 85,
    attributes: attrs({
      laning: 88,
      mechanics: 86,
      teamfighting: 90,
      gameSense: 91,
      consistency: 92,
      adaptability: 86,
    }),
  },
  Yan: {
    form: 94,
    rarity: 'UR',
    attributes: attrs({
      laning: 102,
      mechanics: 106,
      teamfighting: 104,
      gameSense: 98,
      consistency: 100,
      adaptability: 101,
    }),
  },
  Bien: {
    form: 88,
    rarity: 'SR',
    attributes: attrs({
      laning: 86,
      mechanics: 88,
      teamfighting: 94,
      gameSense: 96,
      consistency: 92,
      adaptability: 90,
    }),
  },
  Hoshi: {
    form: 96,
    rarity: 'UR',
    attributes: attrs({
      laning: 116,
      mechanics: 114,
      teamfighting: 110,
      gameSense: 104,
      consistency: 98,
      adaptability: 106,
    }),
  },
  Chiayi: {
    form: 98,
    rarity: 'UR',
    attributes: attrs({
      laning: 116,
      mechanics: 120,
      teamfighting: 114,
      gameSense: 108,
      consistency: 110,
      adaptability: 112,
    }),
  },
  Angle: {
    form: 84,
    rarity: 'SR',
    attributes: attrs(
      {
        laning: 88,
        mechanics: 104,
        teamfighting: 96,
        gameSense: 98,
        consistency: 74,
        adaptability: 100,
      },
      10,
      2,
    ),
  },
  Ssign: {
    form: 84,
    attributes: attrs({
      laning: 88,
      mechanics: 90,
      teamfighting: 87,
      gameSense: 86,
      consistency: 92,
      adaptability: 88,
    }),
  },
  Yuwen: {
    form: 80,
    attributes: attrs({
      laning: 78,
      mechanics: 80,
      teamfighting: 86,
      gameSense: 88,
      consistency: 90,
      adaptability: 82,
    }),
  },
  Diya: {
    form: 92,
    rarity: 'SSR',
    attributes: attrs(
      {
        laning: 100,
        mechanics: 98,
        teamfighting: 96,
        gameSense: 95,
        consistency: 93,
        adaptability: 98,
      },
      10,
      1.8,
    ),
  },
  Luke: {
    form: 68,
    attributes: attrs({
      laning: 70,
      mechanics: 72,
      teamfighting: 68,
      gameSense: 66,
      consistency: 64,
      adaptability: 70,
    }),
  },
  Nicky: {
    form: 87,
    attributes: attrs({
      laning: 92,
      mechanics: 93,
      teamfighting: 90,
      gameSense: 89,
      consistency: 91,
      adaptability: 90,
    }),
  },
  Amity: {
    form: 98,
    rarity: 'UR',
    attributes: attrs({
      laning: 116,
      mechanics: 120,
      teamfighting: 114,
      gameSense: 108,
      consistency: 112,
      adaptability: 110,
    }),
  },
  Effort: {
    form: 93,
    rarity: 'SSR',
    attributes: attrs({
      laning: 92,
      mechanics: 94,
      teamfighting: 102,
      gameSense: 104,
      consistency: 100,
      adaptability: 98,
    }),
  },
};

type RosterTier = 'star' | 'starter' | 'role' | 'liability';

function hashTag(tag: string): number {
  let value = 0;
  for (let index = 0; index < tag.length; index += 1) {
    value = (value * 31 + tag.charCodeAt(index)) >>> 0;
  }
  return value;
}

function pickInRange(seed: number, range: [number, number], salt: number): number {
  const span = range[1] - range[0];
  const unit = ((seed >>> (salt % 16)) + salt * 17) % 1000;
  return clampRating(range[0] + (unit % (span + 1)));
}

function teamBand(teamAbbr: string, leagueTier: LeagueTier): TeamPowerBand {
  return TEAM_POWER[teamAbbr] ?? (leagueTier === 'TCS' ? TCS_DEFAULT : TCL_DEFAULT);
}

function rosterTier(seed: number): RosterTier {
  const roll = seed % 100;
  if (roll < 18) {
    return 'star';
  }
  if (roll < 54) {
    return 'starter';
  }
  if (roll < 82) {
    return 'role';
  }
  return 'liability';
}

function rosterOffset(tier: RosterTier, seed: number, position: PlayerPosition): number {
  let offset = 0;
  if (tier === 'star') {
    offset = 9 + (seed % 5);
  } else if (tier === 'starter') {
    offset = 1 + (seed % 4);
  } else if (tier === 'role') {
    offset = -3 - (seed % 4);
  } else {
    offset = -9 - (seed % 6);
  }

  if (position === 'MID' || position === 'BOT') {
    offset += 1;
  } else if (position === 'SUPPORT') {
    offset -= 1;
  }
  return offset;
}

function roleAttrNudge(position: PlayerPosition, key: AttributeKey): number {
  if (position === 'TOP') {
    if (key === 'laning') return 3;
    if (key === 'consistency') return 2;
    if (key === 'adaptability') return -2;
  }
  if (position === 'JUNGLE') {
    if (key === 'gameSense') return 3;
    if (key === 'adaptability') return 2;
    if (key === 'laning') return -2;
  }
  if (position === 'MID') {
    if (key === 'mechanics') return 3;
    if (key === 'laning') return 2;
    if (key === 'consistency') return -2;
  }
  if (position === 'BOT') {
    if (key === 'mechanics') return 3;
    if (key === 'laning') return 2;
    if (key === 'gameSense') return -2;
  }
  if (position === 'SUPPORT') {
    if (key === 'gameSense') return 3;
    if (key === 'teamfighting') return 2;
    if (key === 'laning') return -3;
    if (key === 'mechanics') return -2;
  }
  return 0;
}

export function buildAttributesFromSeed(seed: AttributeSeed, fallbackGrowth = 1): PlayerAttributes {
  const attributes = {} as PlayerAttributes;
  for (const key of ATTRIBUTE_KEYS) {
    const band = seed[key];
    const current = clampRating(band?.current ?? 70);
    attributes[key] = {
      current,
      potential: clampRating(band?.potential ?? current + 8),
      growthRate: band?.growthRate ?? fallbackGrowth,
    };
  }
  return attributes;
}

export function resolvePlayerPower(input: {
  gamertag: string;
  position: PlayerPosition;
  teamAbbr: string;
  leagueTier: LeagueTier;
  seedAttributes?: AttributeSeed;
  seedForm?: number;
  seedRarity?: Rarity;
}): { attributes: PlayerAttributes; form: number; rarity: Rarity } {
  const named = PLAYER_POWER_PROFILES[input.gamertag];
  const seed = input.seedAttributes ?? named?.attributes;
  if (seed) {
    const attributes = buildAttributesFromSeed(seed);
    const form = clampRating(input.seedForm ?? named?.form ?? 80);
    const rarity =
      input.seedRarity ?? named?.rarity ?? suggestRarityFromOvr(calculatePlayerOvr(attributes, input.position));
    return { attributes, form, rarity };
  }

  const band = teamBand(input.teamAbbr, input.leagueTier);
  const seedNum = hashTag(input.gamertag);
  const tier = rosterTier(seedNum);
  const center = Math.round((band.current[0] + band.current[1]) / 2)
    + rosterOffset(tier, seedNum, input.position);
  const floor = clampRating(band.current[0] - 12);
  const ceiling = clampRating(band.current[1] + 10);
  const attributes = {} as PlayerAttributes;

  ATTRIBUTE_KEYS.forEach((key, index) => {
    const wobble = ((seedNum >>> ((index + 3) % 16)) + index * 19) % 15 - 7;
    const current = clampRating(
      Math.min(ceiling, Math.max(floor, center + wobble + roleAttrNudge(input.position, key))),
    );
    const bonus = pickInRange(seedNum, band.potentialBonus, index + 9)
      + (tier === 'star' ? 2 : tier === 'liability' ? -1 : 0);
    attributes[key] = {
      current,
      potential: clampRating(current + Math.max(3, bonus)),
      growthRate: band.growthRate + (tier === 'liability' ? 0.2 : tier === 'star' ? -0.05 : 0),
    };
  });

  const formBias = tier === 'star' ? 4 : tier === 'liability' ? -5 : 0;
  const form = input.seedForm
    ?? clampRating(pickInRange(seedNum, band.form, 21) + formBias);
  const rarity =
    input.seedRarity ?? suggestRarityFromOvr(calculatePlayerOvr(attributes, input.position));
  return { attributes, form, rarity };
}

export function applySeedPlayerDefaults(
  players: readonly Player[],
  teams: readonly Team[],
  options?: { syncPower?: boolean },
): { players: Player[]; teams: Team[] } {
  const syncPower = options?.syncPower ?? false;
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const nextPlayers: Player[] = [];

  for (const player of players) {
    if (RETIRED_SEED_PLAYER_TAGS.has(player.gamertag)) {
      continue;
    }

    const team = player.teamId ? teamById.get(player.teamId) ?? null : null;
    if (!syncPower || !team) {
      nextPlayers.push(player);
      continue;
    }

    const power = resolvePlayerPower({
      gamertag: player.gamertag,
      position: player.position,
      teamAbbr: team.abbreviation,
      leagueTier: team.leagueTier,
    });

    nextPlayers.push({
      ...player,
      attributes: power.attributes,
      form: power.form,
      rarity: power.rarity,
    });
  }

  const idsByTeam = new Map<string, string[]>();
  for (const player of nextPlayers) {
    if (!player.teamId) {
      continue;
    }
    const list = idsByTeam.get(player.teamId) ?? [];
    list.push(player.id);
    idsByTeam.set(player.teamId, list);
  }

  const nextTeams = teams.map((team) => ({
    ...team,
    playerIds: idsByTeam.get(team.id) ?? [],
  }));

  return { players: nextPlayers, teams: nextTeams };
}
