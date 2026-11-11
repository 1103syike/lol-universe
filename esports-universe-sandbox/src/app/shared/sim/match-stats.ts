import type { PlayerPosition } from '../../core/models/player.model';

export type MatchClockSeconds = number;

export type TimelineEventType =
  | 'first-blood'
  | 'kill'
  | 'teamfight'
  | 'dragon'
  | 'dragon-soul'
  | 'baron'
  | 'elder'
  | 'tower'
  | 'inhibitor'
  | 'herald'
  | 'voidgrub'
  | 'surrender'
  | 'nexus'
  | 'mistake'
  | 'coach-call'
  | 'rotation'
  | 'income'
  | 'combat'
  | 'base-hold';

export type DragonType = 'ocean' | 'mountain' | 'infernal' | 'cloud' | 'hextech' | 'chemtech';

export type TimelineMarker = 'D1' | 'D2' | 'D3' | 'D4' | 'B' | 'E' | 'T' | 'K';

export type PlayPhaseId = 'early' | 'mid' | 'late';

export type KillContext =
  | 'lane'
  | 'gank'
  | 'skirmish'
  | 'teamfight'
  | 'dragon'
  | 'baron'
  | 'elder'
  | 'mistake';

export type FightLane = 'top' | 'mid' | 'bot' | 'river';

export type ObjectiveIntent = 'contest' | 'trade' | 'give-up';

export type ObjectiveMethod = 'direct' | 'fake-start' | 'engage-ambush' | 'vision-first';

export interface TimelineEventPayload {
  dragonType?: DragonType;
  towerLane?: 'top' | 'mid' | 'bot';
  towerTier?: 1 | 2 | 3 | 'nexus';
  goldDeltaHome?: number;
  goldDeltaAway?: number;
  killGold?: number;
  marker?: TimelineMarker;
  damageByPlayer?: Record<string, number>;
  playerGold?: Record<string, number>;
  playerCs?: Record<string, number>;
  playerVision?: Record<string, number>;
  assistGoldByPlayer?: Record<string, number>;
  killContext?: KillContext;
  fightLane?: FightLane;
  intensity?: 'poke' | 'skirmish' | 'gank' | 'teamfight';
  objectiveIntent?: ObjectiveIntent;
  opponentIntent?: ObjectiveIntent;
  objectiveMethod?: ObjectiveMethod;
  decisionReason?: string;
  decisionOutcome?: 'fight' | 'free-take' | 'trade-take' | 'defer';
  defenderTeamId?: string;
  endMethod?: 'siege' | 'backdoor' | 'timeout';
  pushStyle?: 'grouped' | 'split';
  structureHold?: boolean;
  recentCombat?: boolean;
  killVia?: string;
  viaMinion?: boolean;
  minionRole?: 'melee' | 'caster' | 'cannon' | 'super';
  minionSide?: 'blue' | 'red';
  monsterUnitKind?: string;
  monsterCampId?: string;
  structureKind?: string;
  structureSide?: 'blue' | 'red';
}

export interface TimelineEvent {
  id: string;
  t: MatchClockSeconds;
  type: TimelineEventType;
  phase: PlayPhaseId;
  teamId: string | null;
  actorPlayerId?: string;
  assistPlayerIds?: string[];
  victimPlayerId?: string;
  victimTeamId?: string;
  payload?: TimelineEventPayload;
  summary: string;
}

export interface GoldSample {
  t: MatchClockSeconds;
  homeGold: number;
  awayGold: number;
}

export type GoldSeries = GoldSample[];

export interface TeamMatchStats {
  teamId: string;
  kills: number;
  deaths: number;
  towers: number;
  dragons: number;
  dragonSoul: boolean;
  barons: number;
  elders: number;
  inhibitors: number;
  totalGold: number;
}

export interface PlayerMatchStats {
  playerId: string;
  teamId: string;
  gamertag: string;
  position: PlayerPosition;
  kills: number;
  deaths: number;
  assists: number;
  damageToChamps: number;
  gold: number;
  cs: number;
  visionScore: number;
  kda: number;
  kpPct: number;
  damagePct: number;
  goldPct: number;
  items: string[];
}

export interface MatchMapAbilityRank {
  slot: string;
  level: number;
  name: string;
  cooldownRemaining: number;
}

export interface MatchMapChampionFrame {
  playerId: string;
  teamId: string;
  side: 'blue' | 'red';
  position: PlayerPosition;
  championId: string;
  gamertag: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  mana?: number;
  maxMana?: number;
  gold: number;
  earnedGold: number;
  level: number;
  exp?: number;
  alive: boolean;
  kills: number;
  deaths: number;
  assists: number;
  damageToChamps: number;
  damageTaken: number;
  damageTakenFromChamps: number;
  cs: number;
  visionScore: number;
  items: string[];
  abilities?: MatchMapAbilityRank[];
  summonerSpells?: Array<{
    id: string;
    slot: string;
    cooldownRemaining: number;
  }>;
  recalling?: boolean;
  recallProgress?: number;
}

export interface MatchMapMinionFrame {
  id: string;
  side: 'blue' | 'red';
  lane: 'top' | 'mid' | 'bot';
  role: 'melee' | 'caster' | 'cannon' | 'super';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface MatchMapMonsterFrame {
  id: string;
  campId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface MatchMapStructureFrame {
  id: string;
  structureId: string;
  kind: string;
  side: 'blue' | 'red';
  lane: 'top' | 'mid' | 'bot' | null;
  x: number;
  y: number;
  alive: boolean;
  hp: number;
  maxHp: number;
}

export interface MatchMapWardFrame {
  id: string;
  side: 'blue' | 'red';
  wardKind: 'stealth' | 'control';
  x: number;
  y: number;
  sight: number;
  hp: number;
  maxHp: number;
  ownerId?: string;
  ownerGamertag?: string;
  ownerChampionId?: string;
}

export interface MatchMapFrame {
  t: number;
  champions: MatchMapChampionFrame[];
  minions: MatchMapMinionFrame[];
  monsters: MatchMapMonsterFrame[];
  structures: MatchMapStructureFrame[];
  wards?: MatchMapWardFrame[];
}

export interface MatchBoxScore {
  durationSec: MatchClockSeconds;
  winnerTeamId: string;
  homeTeamId: string;
  awayTeamId: string;
  goldSeries: GoldSeries;
  timeline: TimelineEvent[];
  home: TeamMatchStats;
  away: TeamMatchStats;
  players: PlayerMatchStats[];
  mapTrack?: MatchMapFrame[];
}

export interface PlayerRuntimeStats {
  playerId: string;
  teamId: string;
  gamertag: string;
  position: PlayerPosition;
  kills: number;
  deaths: number;
  assists: number;
  damageToChamps: number;
  gold: number;
  cs: number;
  visionScore: number;
  deadUntilSec: number;
  items: string[];
}

export interface MatchSimResult {
  homeTeamId: string;
  awayTeamId: string;
  durationSec: MatchClockSeconds;
  winnerTeamId: string;
  timeline: TimelineEvent[];
  goldSeries: GoldSeries;
  players: PlayerRuntimeStats[];
}
