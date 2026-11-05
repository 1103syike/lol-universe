export const PLAYER_POSITIONS = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  TOP: '上路',
  JUNGLE: '打野',
  MID: '中路',
  BOT: '下路',
  SUPPORT: '輔助',
};

export const PLAYER_NATIONALITIES = ['CN', 'TW', 'KR', 'EU', 'US', 'CA'] as const;

export type PlayerNationality = (typeof PLAYER_NATIONALITIES)[number];

export const PLAYER_NATIONALITY_OPTIONS: ReadonlyArray<{
  code: PlayerNationality;
  name: string;
}> = [
  { code: 'CN', name: '中國' },
  { code: 'TW', name: '台灣' },
  { code: 'KR', name: '韓國' },
  { code: 'EU', name: '歐盟' },
  { code: 'US', name: '美國' },
  { code: 'CA', name: '加拿大' },
];

export const PLAYER_NATIONALITY_LABELS: Record<PlayerNationality, string> = {
  CN: '中國',
  TW: '台灣',
  KR: '韓國',
  EU: '歐盟',
  US: '美國',
  CA: '加拿大',
};

export const ATTRIBUTE_KEYS = [
  'laning',
  'mechanics',
  'teamfighting',
  'gameSense',
  'consistency',
  'adaptability',
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  laning: '對線',
  mechanics: '操作',
  teamfighting: '團戰',
  gameSense: '意識',
  consistency: '穩定性',
  adaptability: '適應力',
};

export type GrowthTrend = 'rising' | 'stable' | 'declining';

export interface AttributeRating {
  current: number;
  potential: number;
  growthRate: number;
}

export type PlayerAttributes = Record<AttributeKey, AttributeRating>;

export interface PlayerContract {
  startDate: string;
  endDate: string;
  annualSalary: number;
}

export interface CareerSeasonRecord {
  id: string;
  seasonLabel: string;
  teamName: string;
  games: number;
  wins: number;
  losses: number;
}

export interface Player {
  id: string;
  displayName: string;
  gamertag: string;
  nationality: PlayerNationality;
  position: PlayerPosition;
  teamId: string | null;
  birthday: string;
  attributes: PlayerAttributes;
  form: number;
  contract: PlayerContract;
  careerRecords: CareerSeasonRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PlayerInput {
  displayName: string;
  gamertag: string;
  nationality: PlayerNationality;
  position: PlayerPosition;
  teamId: string | null;
  birthday: string;
  attributes: PlayerAttributes;
  form: number;
  contract: PlayerContract;
}

export function isPlayerNationality(value: string): value is PlayerNationality {
  return (PLAYER_NATIONALITIES as readonly string[]).includes(value);
}

export function nationalityLabel(code: string): string {
  if (isPlayerNationality(code)) {
    return PLAYER_NATIONALITY_LABELS[code];
  }
  return code;
}

export function nationalityName(code: string): string {
  return PLAYER_NATIONALITY_OPTIONS.find((option) => option.code === code)?.name ?? code;
}

const POSITION_SORT_ORDER: Record<PlayerPosition, number> = {
  TOP: 0,
  JUNGLE: 1,
  MID: 2,
  BOT: 3,
  SUPPORT: 4,
};

export function comparePlayersByRole(
  left: { position: PlayerPosition; gamertag: string },
  right: { position: PlayerPosition; gamertag: string },
): number {
  const byRole = POSITION_SORT_ORDER[left.position] - POSITION_SORT_ORDER[right.position];
  if (byRole !== 0) {
    return byRole;
  }
  return left.gamertag.localeCompare(right.gamertag, 'zh-Hant');
}
