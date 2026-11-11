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
  | 'camp_clear'
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
    visionScore: number;
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
    hp: number;
    maxHp: number;
  }>;
  monsters: Array<{
    id: string;
    campId: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
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
    hp: number;
    maxHp: number;
  }>;
  wards: Array<{
    id: string;
    side: 'blue' | 'red';
    wardKind: 'stealth' | 'control';
    x: number;
    y: number;
    sight: number;
    hp: number;
    maxHp: number;
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

const abilityNameCache = new Map<string, Map<string, string>>();

function abilityName(
  state: GameState,
  championId: string,
  slot: string,
): string {
  let byChamp = abilityNameCache.get(championId);
  if (!byChamp) {
    byChamp = new Map();
    abilityNameCache.set(championId, byChamp);
  }
  const hit = byChamp.get(slot);
  if (hit) {
    return hit;
  }
  const def = state.lockedPack.champions[championId];
  const name =
    def?.abilities.find((item) => item.slot === slot)?.name ?? `${championId} ${slot}`;
  byChamp.set(slot, name);
  return name;
}

export function snapshotIntervalSec(t: number): number {
  if (t < 900) {
    return 1;
  }
  if (t < 1800) {
    return 2;
  }
  return 2.5;
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
    const t = state.scheduler.time;
    const ownerById = new Map<string, { gamertag: string; championId: string }>();
    for (const champ of state.champions) {
      ownerById.set(champ.id, {
        gamertag: champ.gamertag,
        championId: champ.championId,
      });
    }

    const champions = new Array(state.champions.length);
    for (let i = 0; i < state.champions.length; i += 1) {
      const champ = state.champions[i];
      const recalling =
        champ.recallPhase === 'moving_home' &&
        champ.currentAction !== 'teleport' &&
        !champ.teleportDestination;
      const duration = Math.max(0.001, champ.recallChannelDuration || 8);
      const remaining = Math.max(0, champ.recallChannelUntil - t);
      const recallProgress = recalling
        ? Math.max(0, Math.min(1, 1 - remaining / duration))
        : 0;
      const abilities: ReplayAbilityRank[] = [];
      for (const ability of champ.abilities) {
        if (ability.slot === 'P') {
          continue;
        }
        abilities.push({
          slot: ability.slot,
          level: ability.level,
          name: abilityName(state, champ.championId, ability.slot),
          cooldownRemaining: Math.max(0, ability.cooldownUntil - t),
        });
      }
      const summonerSpells = new Array(champ.summonerSpells.length);
      for (let s = 0; s < champ.summonerSpells.length; s += 1) {
        const spell = champ.summonerSpells[s];
        summonerSpells[s] = {
          id: spell.id,
          slot: spell.slot,
          cooldownRemaining: Math.max(0, spell.cooldownUntil - t),
        };
      }
      champions[i] = {
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
        visionScore: champ.visionScore,
        items: champ.items.slice(),
        abilities,
        summonerSpells,
        recalling,
        recallProgress,
      };
    }

    const minions: ReplaySnapshot['minions'] = [];
    for (const minion of state.minions) {
      if (!minion.alive) {
        continue;
      }
      minions.push({
        id: minion.id,
        side: minion.side,
        lane: minion.lane,
        role: minion.role,
        x: minion.position.x,
        y: minion.position.y,
        hp: Math.max(0, Math.round(minion.hp)),
        maxHp: Math.max(1, Math.round(minion.maxHp)),
      });
    }

    const monsters: ReplaySnapshot['monsters'] = [];
    for (const monster of state.monsters) {
      if (!monster.alive) {
        continue;
      }
      monsters.push({
        id: monster.id,
        campId: monster.campId,
        x: monster.position.x,
        y: monster.position.y,
        hp: Math.max(0, Math.round(monster.hp)),
        maxHp: Math.max(1, Math.round(monster.maxHp)),
      });
    }

    const structuresAlive: string[] = [];
    const structures = new Array(state.structures.length);
    for (let i = 0; i < state.structures.length; i += 1) {
      const structure = state.structures[i];
      if (structure.alive) {
        structuresAlive.push(structure.id);
      }
      structures[i] = {
        id: structure.id,
        structureId: structure.structureId,
        kind: structure.structureKind,
        side: structure.side,
        lane: structure.lane ?? null,
        x: structure.position.x,
        y: structure.position.y,
        alive: structure.alive,
        hp: Math.max(0, Math.round(structure.hp)),
        maxHp: Math.max(1, Math.round(structure.maxHp)),
      };
    }

    const wards: ReplaySnapshot['wards'] = [];
    for (const ward of state.wards) {
      if (!ward.alive) {
        continue;
      }
      const owner = ownerById.get(ward.ownerId);
      wards.push({
        id: ward.id,
        side: ward.side,
        wardKind: ward.wardKind,
        x: ward.position.x,
        y: ward.position.y,
        sight: ward.sight,
        hp: Math.max(0, Math.round(ward.hp)),
        maxHp: Math.max(1, Math.round(ward.maxHp)),
        ownerId: ward.ownerId,
        ownerGamertag: owner?.gamertag ?? '',
        ownerChampionId: owner?.championId ?? '',
      });
    }

    this.doc.snapshots.push({
      t,
      champions,
      minions,
      monsters,
      structures,
      wards,
      structuresAlive,
    });
    this.record(state, { type: 'snapshot' });
  }

  finish(winnerTeamId: string | null): ReplayDocument {
    this.doc.winnerTeamId = winnerTeamId;
    return this.doc;
  }
}
