import type { CompIntent } from '../../core/models/patch.model';
import type { AttributeKey, PlayerPosition } from '../../core/models/player.model';
import type { DraftBanEntry, DraftPickEntry, DraftStep } from './draft';
import type { MatchArchetypeResult } from './match-archetype';
import type { MatchBoxScore } from './match-stats';

export const MATCH_PHASES = ['draft', 'early', 'mid', 'late'] as const;

export type MatchPhaseId = (typeof MATCH_PHASES)[number];

export interface MatchPhaseReport {
  id: MatchPhaseId;
  edge: number;
  leaderTeamId: string | null;
  notes: string[];
}

export type MatchEventKind =
  | 'mistake'
  | 'coach-comeback'
  | 'clutch-teamfight'
  | 'clutch-adapt'
  | 'split-push'
  | 'style-swing'
  | 'close-out-variance';

export interface MatchEvent {
  kind: MatchEventKind;
  phase: MatchPhaseId;
  teamId: string | null;
  beneficiaryTeamId: string | null;
  playerId?: string;
  gamertag?: string;
  text: string;
  impact: number;
}

export interface MatchTurningPoint {
  phase: MatchPhaseId;
  kind: MatchEventKind;
  beneficiaryTeamId: string;
  summary: string;
  playerId?: string;
  gamertag?: string;
}

export interface MatchKeyPlayer {
  teamId: string;
  playerId: string;
  gamertag: string;
  position: PlayerPosition;
  phase: MatchPhaseId;
  reasonKey: string;
  score: number;
  contribution: string;
}

export interface TeamStylePresentation {
  primary: string[];
  secondary: string[];
}

export interface MatchDraftSideReport {
  teamId: string;
  intent: CompIntent;
  power: number;
  picks: DraftPickEntry[];
}

export interface MatchDraftReport {
  patchId: string;
  patchLabel: string;
  riotPatch: string;
  blueTeamId: string;
  redTeamId: string;
  bans: DraftBanEntry[];
  home: MatchDraftSideReport;
  away: MatchDraftSideReport;
  steps?: DraftStep[];
}

export interface MatchReport {
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId: string;
  phases: MatchPhaseReport[];
  keyPlayers: MatchKeyPlayer[];
  mvp: MatchKeyPlayer | null;
  events: MatchEvent[];
  turningPoints: MatchTurningPoint[];
  coachNotes: string[];
  styleNotes: string[];
  swingPhase: MatchPhaseId | null;
  primaryReason: string;
  advantageSummary: string;
  decisiveSummary: string;
  homeStyles: TeamStylePresentation;
  awayStyles: TeamStylePresentation;
  isUpset: boolean;
  archetypes: MatchArchetypeResult;
  boxScore: MatchBoxScore;
  draft: MatchDraftReport;
}

export type PlayerArchetype = 'aggressive' | 'teamfight' | 'stable' | 'balanced';

export const STYLE_AXIS_KEYS = [
  'earlyAggression',
  'lanePressure',
  'jungleMidSync',
  'resourceControl',
  'teamfightExecute',
  'lateScaling',
  'splitPush',
  'balanced',
] as const;

export type StyleAxisKey = (typeof STYLE_AXIS_KEYS)[number];

export type TeamStyleAxes = Record<StyleAxisKey, number>;

export const STYLE_AXIS_LABELS: Record<StyleAxisKey, string> = {
  earlyAggression: '前期進攻',
  lanePressure: '對線壓制',
  jungleMidSync: '中野聯動',
  resourceControl: '資源控制',
  teamfightExecute: '團戰營運',
  lateScaling: '後期發育',
  splitPush: '四一分推',
  balanced: '全面均衡',
};

export const PHASE_LABELS: Record<MatchPhaseId, string> = {
  draft: 'BP',
  early: '前期',
  mid: '中期',
  late: '後期',
};

export const REASON_LABELS: Record<string, string> = {
  'draft-edge': 'BP 與賽前部署取得優勢',
  'early-pressure': '前期對線與進攻壓制奏效',
  'mid-control': '中期資源與節奏掌控較佳',
  'late-teamfight': '後期團戰執行力決定勝負',
  'late-split': '邊線分推打開勝利條件',
  'comeback-coach': '落後時臨場指揮止血逆轉',
  'style-counter': '風格克制在關鍵階段發揮',
  'mistake-swing': '對手重大失誤造成局勢翻轉',
  'even-close': '雙方接近，關鍵局細微差距定勝負',
};

export type EffectiveAttributes = Record<AttributeKey, number>;
