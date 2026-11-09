import { dist } from '../map/pathfinding';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, WardEntity, WardKind } from '../state/entities';
import { allocEntityId, type GameState } from '../state/game-state';
import type { TeamSide } from '../types/ids';
import type { Vec2 } from '../version/version-pack';

export type { WardEntity, WardKind };

export const CHAMPION_SIGHT = 1350;
export const TOWER_SIGHT = 1350;
export const INHIBITOR_SIGHT = 0;
export const NEXUS_SIGHT = 0;
export const FOUNTAIN_SIGHT = 1350;
export const MINION_SIGHT = 1200;
export const SUPER_MINION_SIGHT = 1350;
export const STEALTH_WARD_SIGHT = 900;
export const CONTROL_WARD_SIGHT = 900;
export const SCUTTLE_SHRINE_SIGHT = 525;
export const SCUTTLE_SHRINE_DURATION = 90;
export const WARD_ICON_STEALTH = '/items/tiles/3340.png';
export const WARD_ICON_CONTROL = '/items/tiles/2055.png';
const STEALTH_WARD_DURATION = 120;
const CONTROL_WARD_DURATION = 99999;
const STEALTH_CHARGE_MAX = 2;
const STEALTH_CHARGE_SEC = 150;
const CONTROL_WARD_COST = 75;
const MEMORY_SHARE_AGE = 14;
const TEAM_STEALTH_CAP = 3;
const TEAM_CONTROL_CAP = 2;
const PLAYER_CONTROL_CAP = 1;
const ORACLE_CLEAR_RADIUS = 750;

const PLACE_CHANCE: Record<string, number> = {
  SUPPORT: 0.42,
  JUNGLE: 0.18,
  MID: 0.08,
  BOT: 0.05,
  TOP: 0.04,
};

const CONTROL_BUY_CHANCE: Record<string, number> = {
  SUPPORT: 0.85,
  JUNGLE: 0.55,
  MID: 0.22,
  TOP: 0.18,
  BOT: 0.12,
};

export function bootstrapVision(state: GameState): void {
  for (const champion of state.champions) {
    champion.wardStock = STEALTH_CHARGE_MAX;
    champion.nextWardChargeAt = 0;
    champion.controlWardReady =
      champion.positionLabel === 'SUPPORT' || champion.positionLabel === 'JUNGLE';
    champion.wardsPlaced = 0;
  }
  state.wards = [];
}

function tickWardCharges(state: GameState): void {
  const t = state.scheduler.time;
  for (const champion of state.champions) {
    if (champion.wardStock >= STEALTH_CHARGE_MAX) {
      continue;
    }
    if (champion.nextWardChargeAt <= 0) {
      champion.nextWardChargeAt = t + STEALTH_CHARGE_SEC;
      continue;
    }
    if (t >= champion.nextWardChargeAt) {
      champion.wardStock = Math.min(STEALTH_CHARGE_MAX, champion.wardStock + 1);
      champion.nextWardChargeAt =
        champion.wardStock >= STEALTH_CHARGE_MAX ? 0 : t + STEALTH_CHARGE_SEC;
    }
  }
}

function shareSight(
  state: GameState,
  side: TeamSide,
  enemy: ChampionEntity,
  seenAt: number,
): void {
  for (const ally of state.champions) {
    if (ally.side !== side) {
      continue;
    }
    ally.knownEnemyPositions[enemy.id] = {
      position: { ...enemy.position },
      seenAt,
    };
  }
}

function structureSightRadius(structureKind: string): number {
  if (structureKind === 'inhibitor') {
    return INHIBITOR_SIGHT;
  }
  if (structureKind === 'nexus') {
    return NEXUS_SIGHT;
  }
  if (structureKind.includes('tower')) {
    return TOWER_SIGHT;
  }
  return 0;
}

function pointVisibleToSide(state: GameState, side: TeamSide, point: Vec2): boolean {
  for (const champ of state.champions) {
    if (!champ.alive || champ.side !== side) {
      continue;
    }
    if (dist(champ.position, point) <= CHAMPION_SIGHT) {
      return true;
    }
  }
  const fountain =
    side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
  if (dist(fountain, point) <= FOUNTAIN_SIGHT) {
    return true;
  }
  for (const structure of state.structures) {
    if (!structure.alive || structure.side !== side) {
      continue;
    }
    const sight = structureSightRadius(structure.structureKind);
    if (sight > 0 && dist(structure.position, point) <= sight) {
      return true;
    }
  }
  for (const minion of state.minions) {
    if (!minion.alive || minion.side !== side) {
      continue;
    }
    const sight = minion.role === 'super' ? SUPER_MINION_SIGHT : MINION_SIGHT;
    if (dist(minion.position, point) <= sight) {
      return true;
    }
  }
  for (const ward of state.wards) {
    if (!ward.alive || ward.side !== side) {
      continue;
    }
    if (dist(ward.position, point) <= ward.sight) {
      return true;
    }
  }
  return false;
}

export function teamHasVisionOfPoint(
  state: GameState,
  side: TeamSide,
  point: Vec2,
): boolean {
  return pointVisibleToSide(state, side, point);
}

export function teamSeesChampion(
  state: GameState,
  side: TeamSide,
  enemy: ChampionEntity,
): boolean {
  if (!enemy.alive || enemy.side === side) {
    return false;
  }
  return pointVisibleToSide(state, side, enemy.position);
}

export function teamVisionPressure(
  state: GameState,
  side: TeamSide,
  point: Vec2,
  radius = 1400,
): number {
  let score = 0;
  for (const ward of state.wards) {
    if (!ward.alive || ward.side !== side) {
      continue;
    }
    const cover = Math.min(radius, ward.sight);
    if (dist(ward.position, point) <= cover) {
      score += ward.wardKind === 'control' ? 1.4 : 1;
    }
  }
  for (const champ of state.champions) {
    if (!champ.alive || champ.side !== side) {
      continue;
    }
    if (dist(champ.position, point) <= Math.min(radius, CHAMPION_SIGHT)) {
      score += 0.7;
    }
  }
  for (const structure of state.structures) {
    if (!structure.alive || structure.side !== side || structure.ad <= 0) {
      continue;
    }
    if (dist(structure.position, point) <= Math.min(radius, TOWER_SIGHT)) {
      score += 0.45;
    }
  }
  return score;
}

function countTeamWards(state: GameState, side: TeamSide, kind?: WardKind): number {
  return state.wards.filter(
    (ward) =>
      ward.alive &&
      ward.side === side &&
      (kind == null || ward.wardKind === kind),
  ).length;
}

export function updateVision(state: GameState): void {
  const t = state.scheduler.time;
  tickWardCharges(state);
  for (let i = state.wards.length - 1; i >= 0; i -= 1) {
    const ward = state.wards[i];
    if (!ward.alive || t >= ward.expiresAt || ward.hp <= 0) {
      ward.alive = false;
      state.wards.splice(i, 1);
    }
  }

  for (const enemy of state.champions) {
    if (!enemy.alive) {
      continue;
    }
    for (const side of ['blue', 'red'] as const) {
      if (enemy.side === side) {
        continue;
      }
      if (pointVisibleToSide(state, side, enemy.position)) {
        shareSight(state, side, enemy, t);
        for (const viewer of state.champions) {
          if (viewer.side === side && viewer.alive) {
            viewer.visionScore += 0.008;
          }
        }
      }
    }
  }

  for (const ward of state.wards) {
    if (!ward.alive || ward.wardKind === 'control') {
      continue;
    }
    const revealed = state.champions.some(
      (champ) =>
        champ.alive &&
        champ.side !== ward.side &&
        dist(champ.position, ward.position) <= CHAMPION_SIGHT * 0.55,
    );
    if (revealed) {
      ward.hp -= 0.35;
    }
  }
}

function campPos(state: GameState, campId: string, fallback: Vec2): Vec2 {
  const camp = state.lockedPack.monsters.find((item) => item.id === campId);
  return camp ? { ...camp.position } : fallback;
}

function wardSpotsFor(state: GameState, champion: ChampionEntity): Vec2[] {
  const dragon = state.lockedPack.objectives.dragonPosition;
  const baron = state.lockedPack.objectives.baronPosition;
  const scuttleTop = campPos(state, 'scuttle_top', { x: 4800, y: 9800 });
  const scuttleBot = campPos(state, 'scuttle_bot', { x: 10800, y: 5700 });
  const bushes = state.lockedPack.map.bushes;
  const blueTri = bushes[4] ?? { x: 2800, y: 11200 };
  const redTri = bushes[5] ?? { x: 12000, y: 4200 };
  const riverMid = { x: 7500, y: 7500 };
  const pixel = bushes[2] ?? { x: 9200, y: 5200 };

  if (champion.positionLabel === 'SUPPORT' || champion.positionLabel === 'BOT') {
    return champion.side === 'blue'
      ? [scuttleBot, { x: dragon.x - 400, y: dragon.y + 200 }, riverMid, blueTri, pixel]
      : [scuttleBot, { x: dragon.x + 350, y: dragon.y - 250 }, riverMid, redTri, pixel];
  }
  if (champion.positionLabel === 'JUNGLE') {
    return [
      scuttleTop,
      scuttleBot,
      { x: dragon.x - 250, y: dragon.y + 150 },
      { x: baron.x + 250, y: baron.y - 150 },
      riverMid,
    ];
  }
  if (champion.positionLabel === 'MID') {
    return [riverMid, scuttleTop, scuttleBot, pixel];
  }
  if (champion.positionLabel === 'TOP') {
    return champion.side === 'blue'
      ? [scuttleTop, { x: baron.x - 300, y: baron.y - 200 }, blueTri]
      : [scuttleTop, { x: baron.x + 300, y: baron.y + 200 }, redTri];
  }
  return [riverMid];
}

function allyWardNear(state: GameState, side: TeamSide, point: Vec2, radius = 700): boolean {
  return state.wards.some(
    (ward) => ward.alive && ward.side === side && dist(ward.position, point) <= radius,
  );
}

export function maybeBuyControlWard(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (champion.controlWardReady) {
    return false;
  }
  if (champion.gold < CONTROL_WARD_COST) {
    return false;
  }
  if (countTeamWards(state, champion.side, 'control') >= TEAM_CONTROL_CAP) {
    return false;
  }
  const chance = CONTROL_BUY_CHANCE[champion.positionLabel] ?? 0.1;
  if (state.rng() > chance) {
    return false;
  }
  champion.gold -= CONTROL_WARD_COST;
  champion.controlWardReady = true;
  recorder?.record(state, {
    type: 'item_buy',
    actorId: champion.id,
    teamId: champion.teamId,
    amount: CONTROL_WARD_COST,
    payload: { itemId: 'ControlWard' },
  });
  return true;
}

export function spawnScuttleShrine(
  state: GameState,
  champion: ChampionEntity,
  position: Vec2,
  recorder?: ReplayRecorder,
): void {
  const shrine: WardEntity = {
    id: allocEntityId(state, 'shrine'),
    kind: 'ward',
    wardKind: 'stealth',
    side: champion.side,
    ownerId: champion.id,
    position: { ...position },
    sight: SCUTTLE_SHRINE_SIGHT,
    hp: 99,
    maxHp: 99,
    expiresAt: state.scheduler.time + SCUTTLE_SHRINE_DURATION,
    alive: true,
  };
  state.wards.push(shrine);
  champion.visionScore += 0.6;
  recorder?.record(state, {
    type: 'ward_place',
    actorId: champion.id,
    teamId: champion.teamId,
    x: position.x,
    y: position.y,
    payload: { wardKind: 'shrine', wardId: shrine.id },
  });
}

export function placeWard(
  state: GameState,
  champion: ChampionEntity,
  position: Vec2,
  wardKind: WardKind,
  recorder?: ReplayRecorder,
): boolean {
  if (!champion.alive) {
    return false;
  }
  if (wardKind === 'stealth') {
    if (champion.wardStock <= 0) {
      return false;
    }
    if (countTeamWards(state, champion.side, 'stealth') >= TEAM_STEALTH_CAP) {
      return false;
    }
    champion.wardStock -= 1;
    if (champion.nextWardChargeAt <= 0) {
      champion.nextWardChargeAt = state.scheduler.time + STEALTH_CHARGE_SEC;
    }
  } else {
    if (!champion.controlWardReady) {
      return false;
    }
    const ownControl = state.wards.filter(
      (ward) =>
        ward.alive &&
        ward.wardKind === 'control' &&
        ward.ownerId === champion.id,
    ).length;
    if (ownControl >= PLAYER_CONTROL_CAP) {
      return false;
    }
    if (countTeamWards(state, champion.side, 'control') >= TEAM_CONTROL_CAP) {
      return false;
    }
    champion.controlWardReady = false;
  }

  const ward: WardEntity = {
    id: allocEntityId(state, 'ward'),
    kind: 'ward',
    wardKind,
    side: champion.side,
    ownerId: champion.id,
    position: { ...position },
    sight: wardKind === 'control' ? CONTROL_WARD_SIGHT : STEALTH_WARD_SIGHT,
    hp: wardKind === 'control' ? 4 : 3,
    maxHp: wardKind === 'control' ? 4 : 3,
    expiresAt:
      state.scheduler.time +
      (wardKind === 'control' ? CONTROL_WARD_DURATION : STEALTH_WARD_DURATION),
    alive: true,
  };
  state.wards.push(ward);
  champion.wardsPlaced += 1;
  champion.visionScore += wardKind === 'control' ? 1.2 : 0.8;
  recorder?.record(state, {
    type: 'ward_place',
    actorId: champion.id,
    teamId: champion.teamId,
    x: position.x,
    y: position.y,
    payload: { wardKind, wardId: ward.id },
  });
  return true;
}

export function maybeActOnVision(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (!champion.alive || champion.recallPhase !== 'none') {
    return false;
  }
  const t = state.scheduler.time;
  if (t < 70) {
    return false;
  }

  const canSweep =
    champion.positionLabel === 'SUPPORT' ||
    champion.positionLabel === 'JUNGLE' ||
    (champion.positionLabel === 'MID' && t > 600);
  const clearRange =
    champion.positionLabel === 'JUNGLE' || champion.positionLabel === 'SUPPORT'
      ? ORACLE_CLEAR_RADIUS
      : champion.attackRange + 80;
  const enemyWard = state.wards.find(
    (ward) =>
      ward.alive &&
      ward.side !== champion.side &&
      dist(champion.position, ward.position) <= clearRange,
  );
  if (enemyWard && canSweep) {
    const clearPower =
      champion.positionLabel === 'SUPPORT' || champion.positionLabel === 'JUNGLE' ? 1.6 : 1.1;
    enemyWard.hp -= clearPower;
    champion.visionScore += 0.35;
    if (enemyWard.hp <= 0) {
      enemyWard.alive = false;
      recorder?.record(state, {
        type: 'ward_clear',
        actorId: champion.id,
        targetId: enemyWard.id,
        teamId: champion.teamId,
        payload: { wardKind: enemyWard.wardKind, via: 'sweep' },
      });
    }
    return true;
  }

  const wantsControl =
    champion.controlWardReady &&
    (champion.positionLabel === 'SUPPORT' ||
      champion.positionLabel === 'JUNGLE' ||
      (champion.positionLabel === 'MID' && t > 480)) &&
    t > 150;
  const spots = wardSpotsFor(state, champion);
  let best: Vec2 | null = null;
  let bestScore = 0;
  for (const spot of spots) {
    if (allyWardNear(state, champion.side, spot, 780)) {
      continue;
    }
    const gap = dist(champion.position, spot);
    if (gap > 620) {
      continue;
    }
    const pressure = teamVisionPressure(state, champion.side, spot, 1200);
    const score = 14 - pressure * 3 - gap / 140;
    if (score > bestScore) {
      best = spot;
      bestScore = score;
    }
  }
  if (!best || bestScore < 3.5) {
    return false;
  }

  const roleBias = PLACE_CHANCE[champion.positionLabel] ?? 0.03;
  if (state.rng() > roleBias) {
    return false;
  }

  if (wantsControl && (bestScore >= 6 || t > 540)) {
    return placeWard(state, champion, best, 'control', recorder);
  }
  if (champion.wardStock > 0) {
    return placeWard(state, champion, best, 'stealth', recorder);
  }
  return false;
}

export function knownEnemies(champion: ChampionEntity, now: number, maxAge = 8): string[] {
  return Object.entries(champion.knownEnemyPositions)
    .filter(([, info]) => now - info.seenAt <= maxAge)
    .map(([id]) => id);
}

export function recentlySeenEnemyNear(
  state: GameState,
  champion: ChampionEntity,
  point: Vec2,
  radius = 1400,
  maxAge = MEMORY_SHARE_AGE,
): boolean {
  if (teamHasVisionOfPoint(state, champion.side, point)) {
    return state.champions.some(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(enemy.position, point) <= radius,
    );
  }
  const now = state.scheduler.time;
  for (const [enemyId, info] of Object.entries(champion.knownEnemyPositions)) {
    if (now - info.seenAt > maxAge) {
      continue;
    }
    if (dist(info.position, point) <= radius) {
      const stillAlive = state.champions.some(
        (enemy) => enemy.id === enemyId && enemy.alive && enemy.side !== champion.side,
      );
      if (stillAlive) {
        return true;
      }
    }
  }
  return false;
}

export function invadeVisionRisk(
  state: GameState,
  champion: ChampionEntity,
  point: Vec2,
): number {
  const vision = teamVisionPressure(state, champion.side, point, 1500);
  const seen = recentlySeenEnemyNear(state, champion, point, 1500, 10);
  let risk = 0;
  if (vision < 0.8) {
    risk += 1.2;
  } else if (vision < 1.6) {
    risk += 0.55;
  }
  if (!seen) {
    risk += 0.9;
  }
  if (teamHasVisionOfPoint(state, champion.side === 'blue' ? 'red' : 'blue', point)) {
    risk += 0.7;
  }
  return risk;
}

function allyJungleCamps(state: GameState, side: TeamSide): Vec2[] {
  return state.lockedPack.monsters
    .filter(
      (camp) =>
        camp.side === side &&
        camp.id !== 'dragon' &&
        camp.id !== 'baron' &&
        camp.id !== 'herald',
    )
    .map((camp) => camp.position);
}

export function findJungleInvadeThreat(
  state: GameState,
  champion: ChampionEntity,
  maxAge = 12,
): { enemy: ChampionEntity; point: Vec2 } | null {
  const now = state.scheduler.time;
  const camps = allyJungleCamps(state, champion.side);
  if (camps.length === 0) {
    return null;
  }
  let best: { enemy: ChampionEntity; point: Vec2; score: number } | null = null;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side) {
      continue;
    }
    const known = champion.knownEnemyPositions[enemy.id];
    const liveSeen = teamSeesChampion(state, champion.side, enemy);
    if (!liveSeen && (!known || now - known.seenAt > maxAge)) {
      continue;
    }
    const point = liveSeen ? enemy.position : known.position;
    let nearestCampDist = Number.POSITIVE_INFINITY;
    for (const camp of camps) {
      nearestCampDist = Math.min(nearestCampDist, dist(point, camp));
    }
    if (nearestCampDist > 1500) {
      continue;
    }
    const score =
      (enemy.positionLabel === 'JUNGLE' ? 40 : 18) +
      (1500 - nearestCampDist) / 40 +
      (liveSeen ? 12 : 0);
    if (!best || score > best.score) {
      best = { enemy, point, score };
    }
  }
  return best ? { enemy: best.enemy, point: best.point } : null;
}

export function canCoverVisionThreat(
  state: GameState,
  champion: ChampionEntity,
  threatPoint: Vec2,
): boolean {
  if (!champion.alive || champion.recallPhase !== 'none') {
    return false;
  }
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  if (hpRatio < 0.38) {
    return false;
  }
  const gap = dist(champion.position, threatPoint);
  if (champion.positionLabel === 'SUPPORT') {
    return gap < 4200 && hpRatio > 0.45;
  }
  if (champion.positionLabel === 'JUNGLE') {
    return gap < 3800;
  }
  if (champion.positionLabel === 'MID') {
    return gap < 3200 && hpRatio > 0.55;
  }
  if (champion.positionLabel === 'TOP') {
    return gap < 2800 && hpRatio > 0.6 && state.scheduler.time > 480;
  }
  if (champion.positionLabel === 'BOT') {
    return gap < 2600 && hpRatio > 0.62 && state.scheduler.time > 600;
  }
  return false;
}

export function visionCoverScore(
  state: GameState,
  champion: ChampionEntity,
  threat: { enemy: ChampionEntity; point: Vec2 },
): number {
  if (!canCoverVisionThreat(state, champion, threat.point)) {
    return 0;
  }
  const gap = dist(champion.position, threat.point);
  const role =
    champion.positionLabel === 'SUPPORT'
      ? 34
      : champion.positionLabel === 'JUNGLE'
        ? 28
        : champion.positionLabel === 'MID'
          ? 22
          : 12;
  const enemyNear = state.champions.filter(
    (enemy) =>
      enemy.alive &&
      enemy.side !== champion.side &&
      dist(enemy.position, threat.point) < 1200,
  ).length;
  const allyNear = state.champions.filter(
    (ally) =>
      ally.alive &&
      ally.side === champion.side &&
      ally.id !== champion.id &&
      dist(ally.position, threat.point) < 1400,
  ).length;
  let score = role + (3600 - gap) / 90 + allyNear * 6;
  if (enemyNear >= 2 && allyNear === 0) {
    score *= 0.35;
  }
  if (threat.enemy.positionLabel === 'JUNGLE') {
    score += 10;
  }
  return score;
}
