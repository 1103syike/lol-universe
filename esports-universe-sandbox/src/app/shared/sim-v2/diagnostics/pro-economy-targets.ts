import { LCK_ROLE_CURVE } from './lck-role-curve';

export const PRO_ECONOMY_SEEDS = [1000, 1100, 1200] as const;
export const PRO_ECONOMY_MAX_DURATION_SEC = 1800;

export const PRO_GPM = {
  TOP: { min: 320, max: 480 },
  JUNGLE: { min: 280, max: 430 },
  MID: { min: 340, max: 520 },
  BOT: { min: 380, max: 560 },
  SUPPORT: { min: 230, max: 330 },
} as const;

export const PRO_CSM = {
  TOP: { min: 7.2, max: 11 },
  JUNGLE: { min: 5.0, max: 9.5 },
  MID: { min: 7.8, max: 11.2 },
  BOT: { min: 8.5, max: 12 },
  SUPPORT: { min: 0.4, max: 1.6 },
} as const;

export const PRO_DPM = {
  TOP: { min: 280, max: 820 },
  JUNGLE: { min: 280, max: 720 },
  MID: { min: 380, max: 900 },
  BOT: { min: 480, max: 980 },
  SUPPORT: { min: 120, max: 420 },
} as const;

export const PRO_DTPM = {
  TOP: { min: 500, max: 1400 },
  JUNGLE: { min: 400, max: 1200 },
  MID: { min: 400, max: 1100 },
  BOT: { min: 280, max: 900 },
  SUPPORT: { min: 220, max: 1000 },
} as const;

export const PRO_SUPPORT_VS_CARRY_GPM_RATIO = 0.8;
export const PRO_SUPPORT_GPM_GAP = 20;
export const PRO_JUNGLE_LANE_CS_SHARE_MAX = 0.35;
export const PRO_LEGENDARIES_PER_GAME_MIN = 4;

export const PRO_LCK_AVG = LCK_ROLE_CURVE;

export const PRO_LEGENDARY_ITEMS = [
  'InfinityEdge',
  "RabadonsDeathcap",
  'LudensCompanion',
  'LocketoftheIronSolari',
  "MikaelsBlessing",
  'KnightsVow',
  'SteraksGage',
  'Tiamat',
  'LordDominiksRegards',
  'BlackCleaver',
  'CelestialOpposition',
  'DreamMaker',
  'Bloodsong',
  'ZazZaksRealmspike',
] as const;
