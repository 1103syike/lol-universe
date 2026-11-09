import type { GameState } from '../state/game-state';

export type ReplayEventType =
  | 'move_order'
  | 'position'
  | 'attack'
  | 'ability'
  | 'summoner'
  | 'damage'
  | 'heal'
  | 'death'
  | 'respawn'
  | 'gold'
  | 'exp'
  | 'level_up'
  | 'item_buy'
  | 'minion_spawn'
  | 'minion_death'
  | 'camp_kill'
  | 'structure_damage'
  | 'structure_kill'
  | 'objective'
  | 'ai_decision'
  | 'ward_place'
  | 'ward_clear'
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

export interface ReplayAbilityRank {
  slot: string;
  level: number;
  name: string;
  cooldownRemaining: number;
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
    mana: number;
    maxMana: number;
    gold: number;
    earnedGold: number;
    level: number;
    exp: number;
    alive: boolean;
    kills: number;
    deaths: number;
    assists: number;
    damageToChamps: number;
    damageTaken: number;
    damageTakenFromChamps: number;
    cs: number;
    items: string[];
    abilities: ReplayAbilityRank[];
    summonerSpells: Array<{
      id: string;
      slot: string;
      cooldownRemaining: number;
    }>;
    recalling: boolean;
    recallProgress: number;
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
  wards: Array<{
    id: string;
    side: 'blue' | 'red';
    wardKind: 'stealth' | 'control';
    x: number;
    y: number;
    sight: number;
    ownerId: string;
    ownerGamertag: string;
    ownerChampionId: string;
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
      champions: state.champions.map((champ) => {
        const recalling = champ.recallPhase === 'moving_home';
        const duration = Math.max(0.001, champ.recallChannelDuration || 8);
        const remaining = Math.max(0, champ.recallChannelUntil - state.scheduler.time);
        const recallProgress = recalling
          ? Math.max(0, Math.min(1, 1 - remaining / duration))
          : 0;
        const def = state.lockedPack.champions[champ.championId];
        const abilities = champ.abilities
          .filter((ability) => ability.slot !== 'P')
          .map((ability) => {
            const abilityDef = def?.abilities.find((item) => item.slot === ability.slot);
            return {
              slot: ability.slot,
              level: ability.level,
              name: abilityDef?.name ?? `${champ.championId} ${ability.slot}`,
              cooldownRemaining: Math.max(0, ability.cooldownUntil - state.scheduler.time),
            };
          });
        return {
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
          mana: champ.mana,
          maxMana: champ.maxMana,
          gold: champ.gold,
          earnedGold: champ.earnedGold,
          level: champ.level,
          exp: champ.exp,
          alive: champ.alive,
          kills: champ.kills,
          deaths: champ.deaths,
          assists: champ.assists,
          damageToChamps: champ.damageToChampions,
          damageTaken: champ.damageTaken,
          damageTakenFromChamps: champ.damageTakenFromChampions,
          cs: champ.cs,
          items: [...champ.items],
          abilities,
          summonerSpells: champ.summonerSpells.map((spell) => ({
            id: spell.id,
            slot: spell.slot,
            cooldownRemaining: Math.max(0, spell.cooldownUntil - state.scheduler.time),
          })),
          recalling,
          recallProgress,
        };
      }),
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
      wards: state.wards
        .filter((ward) => ward.alive)
        .map((ward) => {
          const owner = state.champions.find((champ) => champ.id === ward.ownerId);
          return {
            id: ward.id,
            side: ward.side,
            wardKind: ward.wardKind,
            x: ward.position.x,
            y: ward.position.y,
            sight: ward.sight,
            ownerId: ward.ownerId,
            ownerGamertag: owner?.gamertag ?? '',
            ownerChampionId: owner?.championId ?? '',
          };
        }),
      structuresAlive: state.structures.filter((s) => s.alive).map((s) => s.id),
    });
    this.record(state, { type: 'snapshot' });
  }

  finish(winnerTeamId: string | null): ReplayDocument {
    this.doc.winnerTeamId = winnerTeamId;
    return this.doc;
  }
}
