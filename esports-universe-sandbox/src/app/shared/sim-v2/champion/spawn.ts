import { assignSummonerSlots, pickSummonerPair } from '../../../core/data/summoner-spells';
import type { PlayerPosition } from '../../../core/models/player.model';
import { setForm } from '../combat/form-kits';
import { recomputeItemStats } from '../economy/economy';
import { allocEntityId, type GameState } from '../state/game-state';
import type { ChampionEntity } from '../state/entities';
import type { ItemId, LaneId, TeamSide } from '../types/ids';
import { buildLaneApproaches } from '../version/build-map';
import type { Vec2 } from '../version/version-pack';

const FORM_START: Record<string, { form: 'a' | 'b'; ranges: { a: number; b: number } }> = {
  Jayce: { form: 'a', ranges: { a: 125, b: 500 } },
  Nidalee: { form: 'a', ranges: { a: 525, b: 125 } },
  Elise: { form: 'a', ranges: { a: 550, b: 125 } },
  Gnar: { form: 'a', ranges: { a: 400, b: 150 } },
};

const WORLD_ATLAS_COST = 400;
const SHARED_RICHES_FIRST_CHARGE_SEC = 65;

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
  const startGold = state.lockedPack.economy.startingGold;
  const startsWithAtlas =
    player.position === 'SUPPORT' && !!state.lockedPack.items['WorldAtlas'];
  const pocketGold = startsWithAtlas ? Math.max(0, startGold - WORLD_ATLAS_COST) : startGold;
  const startItems: ItemId[] = startsWithAtlas ? ['WorldAtlas'] : [];
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
    gold: pocketGold,
    earnedGold: startGold,
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
    nextSmiteAt: 0,
    alive: true,
    respawnAt: 0,
    items: startItems,
    shopPlan: null,
    abilities: def.abilities.map((ability) => ({
      slot: ability.slot,
      level: ability.slot === 'P' ? 1 : 0,
      cooldownUntil: 0,
    })),
    summonerSpells: assignSummonerSlots(
      pickSummonerPair(player.position, player.championId),
    ).map((spell) => ({
      id: spell.id,
      slot: spell.slot,
      cooldownUntil: 0,
    })),
    teleportDestination: null,
    statuses: [],
    cs: 0,
    supportSharedRichesCharges: 0,
    supportSharedRichesNextAt: startsWithAtlas ? SHARED_RICHES_FIRST_CHARGE_SEC : 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    damageDealt: 0,
    damageToChampions: 0,
    damageTaken: 0,
    damageTakenFromChampions: 0,
    healingDone: 0,
    visionScore: 0,
    wardStock: 2,
    nextWardChargeAt: 0,
    controlWardReady: player.position === 'SUPPORT' || player.position === 'JUNGLE',
    wardsPlaced: 0,
    currentAction: 'idle',
    recallPhase: 'none',
    recallChannelUntil: 0,
    recallChannelDuration: 0,
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
    junglePetFirstLargeClaimed: false,
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
  const formStart = FORM_START[player.championId];
  if (formStart) {
    setForm(entity, formStart.form, formStart.ranges, player.championId);
  }
  if (startsWithAtlas) {
    recomputeItemStats(state, entity);
  }
  return entity;
}
