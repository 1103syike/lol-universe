import type { AbilitySlot, CampId, EntityId, ItemId, LaneId, TeamSide } from '../types/ids';
import type { Vec2 } from '../version/version-pack';

export interface StatusEffect {
  id: string;
  kind: string;
  remainingSec: number;
  magnitude: number;
}

export interface AbilityRuntime {
  slot: AbilitySlot;
  level: number;
  cooldownUntil: number;
}

export interface ChampionEntity {
  id: EntityId;
  kind: 'champion';
  teamId: string;
  side: TeamSide;
  playerId: string;
  gamertag: string;
  positionLabel: string;
  assignedLane: LaneId;
  championId: string;
  position: Vec2;
  path: Vec2[];
  moving: boolean;
  level: number;
  exp: number;
  gold: number;
  earnedGold: number;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  ad: number;
  ap: number;
  armor: number;
  mr: number;
  moveSpeed: number;
  attackRange: number;
  attackSpeed: number;
  nextAttackAt: number;
  alive: boolean;
  respawnAt: number;
  items: ItemId[];
  shopPlan: string[] | null;
  abilities: AbilityRuntime[];
  statuses: StatusEffect[];
  cs: number;
  kills: number;
  deaths: number;
  assists: number;
  damageDealt: number;
  damageToChampions: number;
  damageTaken: number;
  healingDone: number;
  visionScore: number;
  currentAction: string;
  recallPhase: 'none' | 'moving_home' | 'at_base';
  recallChannelUntil: number;
  recallHpSnapshot: number;
  recallCount: number;
  activitySec: {
    lane: number;
    jungle: number;
    fight: number;
    recallTravel: number;
    recallBase: number;
    other: number;
  };
  campKills: number;
  goldBySource: Record<string, number>;
  expBySource: Record<string, number>;
  levelSamples: Array<{ t: number; level: number }>;
  threatTable: Record<string, { amount: number; at: number }>;
  knownEnemyPositions: Record<string, { position: Vec2; seenAt: number }>;
  skills: {
    laning: number;
    mechanics: number;
    teamfighting: number;
    gameSense: number;
    consistency: number;
    adaptability: number;
  };
}

export interface MinionEntity {
  id: EntityId;
  kind: 'minion';
  side: TeamSide;
  lane: LaneId;
  role: 'melee' | 'caster' | 'cannon' | 'super';
  position: Vec2;
  pathIndex: number;
  hp: number;
  maxHp: number;
  ad: number;
  moveSpeed: number;
  attackRange: number;
  nextAttackAt: number;
  alive: boolean;
  gold: number;
  targetId: EntityId | null;
}

export interface MonsterEntity {
  id: EntityId;
  kind: 'monster';
  campId: CampId;
  position: Vec2;
  hp: number;
  maxHp: number;
  ad: number;
  alive: boolean;
  gold: number;
  exp: number;
  aggroTargetId: EntityId | null;
  nextAttackAt: number;
  respawnAt: number;
}

export interface StructureEntity {
  id: EntityId;
  kind: 'structure';
  structureId: string;
  structureKind: string;
  side: TeamSide;
  lane?: LaneId;
  position: Vec2;
  hp: number;
  maxHp: number;
  ad: number;
  range: number;
  gold: number;
  alive: boolean;
  nextAttackAt: number;
}

export type WorldEntity = ChampionEntity | MinionEntity | MonsterEntity | StructureEntity;
