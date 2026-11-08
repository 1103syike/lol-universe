import type { GameState } from '../state/game-state';

export type ReplayEventType =
  | 'move_order'
  | 'position'
  | 'attack'
  | 'ability'
  | 'damage'
  | 'heal'
  | 'death'
  | 'respawn'
  | 'gold'
  | 'exp'
  | 'item_buy'
  | 'minion_spawn'
  | 'minion_death'
  | 'camp_kill'
  | 'structure_damage'
  | 'structure_kill'
  | 'objective'
  | 'ai_decision'
  | 'match_end'
  | 'snapshot';

export interface ReplayEvent {
  t: number;
  type: ReplayEventType;
  actorId?: string;
  targetId?: string;
  teamId?: string;
  amount?: number;
  x?: number;
  y?: number;
  payload?: Record<string, unknown>;
}

export interface ReplaySnapshot {
  t: number;
  champions: Array<{
    id: string;
    playerId: string;
    teamId: string;
    side: 'blue' | 'red';
    positionLabel: string;
    championId: string;
    gamertag: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    gold: number;
    level: number;
    alive: boolean;
    items: string[];
  }>;
  minions: Array<{
    id: string;
    side: 'blue' | 'red';
    lane: 'top' | 'mid' | 'bot';
    role: 'melee' | 'caster' | 'cannon' | 'super';
    x: number;
    y: number;
  }>;
  monsters: Array<{
    id: string;
    campId: string;
    x: number;
    y: number;
  }>;
  structures: Array<{
    id: string;
    structureId: string;
    kind: string;
    side: 'blue' | 'red';
    lane: 'top' | 'mid' | 'bot' | null;
    x: number;
    y: number;
    alive: boolean;
  }>;
  structuresAlive: string[];
}

export interface ReplayDocument {
  matchId: string;
  versionId: string;
  seed: string | number;
  blueTeamId: string;
  redTeamId: string;
  events: ReplayEvent[];
  snapshots: ReplaySnapshot[];
  winnerTeamId: string | null;
}

export class ReplayRecorder {
  readonly doc: ReplayDocument;

  constructor(
    matchId: string,
    versionId: string,
    seed: string | number,
    blueTeamId: string,
    redTeamId: string,
  ) {
    this.doc = {
      matchId,
      versionId,
      seed,
      blueTeamId,
      redTeamId,
      events: [],
      snapshots: [],
      winnerTeamId: null,
    };
  }

  record(state: GameState, event: Omit<ReplayEvent, 't'>): void {
    this.doc.events.push({ ...event, t: state.scheduler.time });
  }

  snapshot(state: GameState): void {
    this.doc.snapshots.push({
      t: state.scheduler.time,
      champions: state.champions.map((champ) => ({
        id: champ.id,
        playerId: champ.playerId,
        teamId: champ.teamId,
        side: champ.side,
        positionLabel: champ.positionLabel,
        championId: champ.championId,
        gamertag: champ.gamertag,
        x: champ.position.x,
        y: champ.position.y,
        hp: champ.hp,
        maxHp: champ.maxHp,
        gold: champ.gold,
        level: champ.level,
        alive: champ.alive,
        items: [...champ.items],
      })),
      minions: state.minions
        .filter((minion) => minion.alive)
        .map((minion) => ({
          id: minion.id,
          side: minion.side,
          lane: minion.lane,
          role: minion.role,
          x: minion.position.x,
          y: minion.position.y,
        })),
      monsters: state.monsters
        .filter((monster) => monster.alive)
        .map((monster) => ({
          id: monster.id,
          campId: monster.campId,
          x: monster.position.x,
          y: monster.position.y,
        })),
      structures: state.structures.map((structure) => ({
        id: structure.id,
        structureId: structure.structureId,
        kind: structure.structureKind,
        side: structure.side,
        lane: structure.lane ?? null,
        x: structure.position.x,
        y: structure.position.y,
        alive: structure.alive,
      })),
      structuresAlive: state.structures.filter((s) => s.alive).map((s) => s.id),
    });
    this.record(state, { type: 'snapshot' });
  }

  finish(winnerTeamId: string | null): ReplayDocument {
    this.doc.winnerTeamId = winnerTeamId;
    return this.doc;
  }
}
