import type { PlayerPosition } from '../../../core/models/player.model';
import { allocEntityId, type GameState } from '../state/game-state';
import type { ChampionEntity } from '../state/entities';
import type { LaneId, TeamSide } from '../types/ids';
import { buildLaneApproaches } from '../version/build-map';
import type { Vec2 } from '../version/version-pack';

function laneFromPosition(position: PlayerPosition): LaneId {
  if (position === 'TOP') {
    return 'top';
  }
  if (position === 'BOT' || position === 'SUPPORT') {
    return 'bot';
  }
  return 'mid';
}

export interface V2RosterPlayer {
  playerId: string;
  gamertag: string;
  position: PlayerPosition;
  championId: string;
  laning: number;
  mechanics: number;
  teamfighting: number;
  gameSense: number;
  consistency: number;
  adaptability: number;
}

export const LANE_APPROACH: Record<string, { blue: Vec2; red: Vec2 }> = buildLaneApproaches();

const FOUNTAIN_OFFSET: Record<string, Vec2> = {
  TOP: { x: -80, y: 120 },
  JUNGLE: { x: 40, y: 160 },
  MID: { x: 0, y: 0 },
  BOT: { x: 120, y: -40 },
  SUPPORT: { x: 160, y: 40 },
};

function fountainSpawn(state: GameState, side: TeamSide, position: PlayerPosition): Vec2 {
  const base =
    side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
  const offset = FOUNTAIN_OFFSET[position] ?? { x: 0, y: 0 };
  const sign = side === 'blue' ? 1 : -1;
  return {
    x: base.x + offset.x * sign,
    y: base.y + offset.y * sign,
  };
}

export function laneApproachOf(side: TeamSide, position: PlayerPosition): Vec2 {
  const spot = LANE_APPROACH[position] ?? LANE_APPROACH['MID'];
  return side === 'blue' ? { ...spot.blue } : { ...spot.red };
}

export function spawnChampion(
  state: GameState,
  side: TeamSide,
  teamId: string,
  player: V2RosterPlayer,
): ChampionEntity {
  const def = state.lockedPack.champions[player.championId];
  if (!def) {
    throw new Error(`Champion not in version pack: ${player.championId}`);
  }
  const position = fountainSpawn(state, side, player.position);
  const entity: ChampionEntity = {
    id: allocEntityId(state, 'champ'),
    kind: 'champion',
    teamId,
    side,
    playerId: player.playerId,
    gamertag: player.gamertag,
    positionLabel: player.position,
    assignedLane: laneFromPosition(player.position),
    championId: player.championId,
    position: { ...position },
    path: [],
    moving: false,
    level: 1,
    exp: 0,
    gold: state.lockedPack.economy.startingGold,
    earnedGold: state.lockedPack.economy.startingGold,
    hp: def.baseHp,
    maxHp: def.baseHp,
    mana: def.baseMana,
    maxMana: Math.max(def.baseMana, 1),
    ad: def.baseAd,
    ap: 0,
    armor: def.baseArmor,
    mr: def.baseMr,
    moveSpeed: def.moveSpeed,
    attackRange: def.attackRange,
    attackSpeed: def.attackSpeed,
    nextAttackAt: 0,
    alive: true,
    respawnAt: 0,
    items: [],
    shopPlan: null,
    abilities: def.abilities.map((ability) => ({
      slot: ability.slot,
      level: ability.slot === 'P' ? 1 : 0,
      cooldownUntil: 0,
    })),
    statuses: [],
    cs: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    damageDealt: 0,
    damageToChampions: 0,
    damageTaken: 0,
    healingDone: 0,
    visionScore: 0,
    currentAction: 'idle',
    recallPhase: 'none',
    recallChannelUntil: 0,
    recallHpSnapshot: 0,
    recallCount: 0,
    activitySec: {
      lane: 0,
      jungle: 0,
      fight: 0,
      recallTravel: 0,
      recallBase: 0,
      other: 0,
    },
    campKills: 0,
    goldBySource: {},
    expBySource: {},
    levelSamples: [{ t: 0, level: 1 }],
    threatTable: {},
    knownEnemyPositions: {},
    skills: {
      laning: player.laning,
      mechanics: player.mechanics,
      teamfighting: player.teamfighting,
      gameSense: player.gameSense,
      consistency: player.consistency,
      adaptability: player.adaptability,
    },
  };
  state.champions.push(entity);
  return entity;
}
