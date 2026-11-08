import type { PlayerPosition } from './player.model';

export const STATS_COMPETITIONS = ['TCS', 'TCL', 'MSI'] as const;

export type StatsCompetition = (typeof STATS_COMPETITIONS)[number];

export const STATS_COMPETITION_LABELS: Record<StatsCompetition, string> = {
  TCS: 'TCS',
  TCL: 'TCL',
  MSI: 'MSI',
};

export const STATS_SPLITS = ['spring', 'summer'] as const;

export type StatsSplit = (typeof STATS_SPLITS)[number];

export const STATS_SPLIT_LABELS: Record<StatsSplit, string> = {
  spring: '春季',
  summer: '夏季',
};

export type StatsViewMode = 'players' | 'champions';

export type StatsPeriodId = 'career' | string;

export interface StatsPeriodOption {
  id: StatsPeriodId;
  label: string;
  kind: 'career' | 'season' | 'msi';
  year?: number;
  split?: StatsSplit;
}

export interface PlayerStatsRow {
  rank: number;
  playerId: string;
  gamertag: string;
  teamId: string;
  abbreviation: string;
  teamName: string;
  logoUrl: string | null;
  position: PlayerPosition;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  kpPct: number;
  csm: number;
  dpm: number;
  gpm: number;
  vspm: number;
}

export interface ChampionStatsRow {
  rank: number;
  championId: string;
  championNameZh: string;
  picks: number;
  bans: number;
  presence: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  csm: number;
  dpm: number;
  gpm: number;
}
