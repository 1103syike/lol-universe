import { dist } from '../map/pathfinding';
import { assessChampionLaneWave, assessLaneWave } from '../minion/wave-state';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId, TeamSide } from '../types/ids';
import { teamHasVisionOfPoint, teamVisionPressure } from '../vision/vision';

export interface LaneMatchupRead {
  deficit: number;
  pressure: number;
  expose: number;
  ahead: number;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smooth01(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function lanePathProgress(
  state: GameState,
  lane: LaneId,
  point: { x: number; y: number },
): number {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return 0.5;
  }
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i += 1) {
    const gap = dist(path[i], point);
    if (gap < bestDist) {
      bestDist = gap;
      best = i;
    }
  }
  return best / Math.max(1, path.length - 1);
}

export function homeLaneOfChampion(champion: ChampionEntity): LaneId {
  if (champion.assignedLane) {
    return champion.assignedLane;
  }
  if (champion.positionLabel === 'TOP') {
    return 'top';
  }
  if (champion.positionLabel === 'BOT' || champion.positionLabel === 'SUPPORT') {
    return 'bot';
  }
  return 'mid';
}

export function laneOpponent(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId = homeLaneOfChampion(champion),
): ChampionEntity | null {
  let best: ChampionEntity | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side) {
      continue;
    }
    if (enemy.positionLabel === 'JUNGLE') {
      continue;
    }
    const enemyLane = homeLaneOfChampion(enemy);
    const sameLane = enemyLane === lane;
    const gap = dist(champion.position, enemy.position);
    if (!sameLane && gap > 1800) {
      continue;
    }
    const score = (sameLane ? 0 : 900) + gap;
    if (score < bestScore) {
      bestScore = score;
      best = enemy;
    }
  }
  return best;
}

function roamThreatNear(
  state: GameState,
  champion: ChampionEntity,
  point: { x: number; y: number },
): number {
  let threat = 0;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side) {
      continue;
    }
    if (enemy.positionLabel !== 'JUNGLE' && enemy.positionLabel !== 'MID') {
      continue;
    }
    const gap = dist(enemy.position, point);
    if (gap < 2200) {
      threat += enemy.positionLabel === 'JUNGLE' ? 0.55 : 0.35;
    } else if (gap < 3200) {
      threat += enemy.positionLabel === 'JUNGLE' ? 0.28 : 0.16;
    }
  }
  return clamp01(threat);
}

export function laneMatchupRead(
  state: GameState,
  champion: ChampionEntity,
  lane: LaneId = homeLaneOfChampion(champion),
): LaneMatchupRead {
  if (champion.positionLabel === 'JUNGLE') {
    return { deficit: 0, pressure: 0, expose: 0, ahead: 0 };
  }

  const enemy = laneOpponent(state, champion, lane);
  const deathDeficit = Math.max(0, champion.deaths - champion.kills);
  const levelGap = enemy ? Math.max(0, enemy.level - champion.level) : 0;
  const goldGap = enemy ? Math.max(0, enemy.earnedGold - champion.earnedGold) : 0;
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  const enemyHp = enemy ? enemy.hp / Math.max(1, enemy.maxHp) : 1;
  const hpGap = Math.max(0, enemyHp - hpRatio);

  const deficit = smooth01(
    deathDeficit / 3.2 +
      levelGap / 2.6 +
      goldGap / 2200 +
      hpGap * 0.35 +
      (enemy && enemy.level >= champion.level + 1 && goldGap >= 600 ? 0.12 : 0),
  );

  const goldLead = enemy ? Math.max(0, champion.earnedGold - enemy.earnedGold) : 0;
  const levelLead = enemy ? Math.max(0, champion.level - enemy.level) : 0;
  const killLead = Math.max(0, champion.kills - champion.deaths);
  const ahead = smooth01(goldLead / 1800 + levelLead / 2.4 + killLead / 3 + Math.max(0, hpRatio - enemyHp) * 0.4);

  const wave = assessChampionLaneWave(state, champion, lane);
  const clash = wave.clashProgress ?? wave.ownOuterProgress;
  const riverBias =
    champion.side === 'blue'
      ? clamp01((clash - wave.ownOuterProgress) / Math.max(0.08, wave.enemyOuterProgress - wave.ownOuterProgress))
      : clamp01((wave.ownOuterProgress - clash) / Math.max(0.08, wave.ownOuterProgress - wave.enemyOuterProgress));
  const pressure = smooth01(
    riverBias * 0.55 +
      clamp01((wave.allyAdvantage + 1.2) / 4) * 0.35 +
      (wave.isCrashingOuter ? 0.28 : 0) +
      (wave.zone === 'enemy' ? 0.22 : wave.zone === 'river' ? 0.12 : 0) +
      ahead * 0.2,
  );

  const selfProgress = lanePathProgress(state, lane, champion.position);
  const deepPastOwn =
    champion.side === 'blue'
      ? clamp01((selfProgress - wave.ownOuterProgress) / 0.22)
      : clamp01((wave.ownOuterProgress - selfProgress) / 0.22);
  const towardEnemy =
    champion.side === 'blue'
      ? clamp01((selfProgress - 0.42) / 0.28)
      : clamp01((0.58 - selfProgress) / 0.28);
  const vision = teamVisionPressure(state, champion.side, champion.position, 1500);
  const fog = teamHasVisionOfPoint(state, champion.side, champion.position) ? 0 : 0.35;
  const roam = roamThreatNear(state, champion, champion.position);
  const expose = smooth01(
    deepPastOwn * 0.45 +
      towardEnemy * 0.35 +
      clamp01(1.1 - vision * 0.35) * 0.25 +
      fog +
      roam * 0.55 +
      (wave.zone === 'enemy' ? 0.18 : 0) -
      ahead * 0.12,
  );

  return {
    deficit,
    pressure,
    expose: clamp01(expose),
    ahead,
  };
}

export function laneDistress(state: GameState, side: TeamSide, lane: LaneId): number {
  const laners = state.champions.filter((champ) => {
    if (!champ.alive || champ.side !== side || champ.positionLabel === 'JUNGLE') {
      return false;
    }
    const assigned = champ.assignedLane ?? homeLaneOfChampion(champ);
    return assigned === lane;
  });
  if (laners.length === 0) {
    const wave = assessLaneWave(state, side, lane);
    return wave.isCrashingOuter && wave.zone === 'own' ? 0.55 : 0;
  }
  let worst = 0;
  for (const laner of laners) {
    const read = laneMatchupRead(state, laner, lane);
    const wave = assessChampionLaneWave(state, laner, lane);
    const crashBoost =
      wave.isCrashingOuter && wave.zone === 'own' ? 0.35 : 0;
    worst = Math.max(worst, Math.min(1, read.deficit + crashBoost));
  }
  return worst;
}

export function sameMapHalf(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  const aTop = a.y >= 7500;
  const bTop = b.y >= 7500;
  if (aTop === bTop) {
    return true;
  }
  const aDiag = a.x + a.y >= 15000;
  const bDiag = b.x + b.y >= 15000;
  return aDiag === bDiag;
}

export function allySaveUrgency(
  state: GameState,
  jungler: ChampionEntity,
  lane: LaneId,
): number {
  if (jungler.positionLabel !== 'JUNGLE') {
    return 0;
  }
  const distress = laneDistress(state, jungler.side, lane);
  const allies = state.champions.filter((champ) => {
    if (!champ.alive || champ.side !== jungler.side || champ.positionLabel === 'JUNGLE') {
      return false;
    }
    const assigned = champ.assignedLane ?? homeLaneOfChampion(champ);
    return assigned === lane;
  });
  if (allies.length === 0) {
    return distress * 0.7;
  }
  let best = 0;
  for (const ally of allies) {
    const hpRatio = ally.hp / Math.max(1, ally.maxHp);
    const underFire = Object.values(ally.threatTable).some(
      (threat) => state.scheduler.time - threat.at <= 2.5 && threat.amount > 0,
    );
    const gap = dist(jungler.position, ally.position);
    const reach = gap <= 4200 ? 1 : gap <= 5200 ? 0.55 : 0.15;
    const urgency =
      distress * 0.55 +
      (1 - hpRatio) * 0.35 +
      (underFire ? 0.25 : 0) +
      (sameMapHalf(jungler.position, ally.position) ? 0.12 : 0);
    best = Math.max(best, clamp01(urgency) * reach);
  }
  return clamp01(best);
}

export function championGankDangerIndex(
  state: GameState,
  target: ChampionEntity,
  lane: LaneId = homeLaneOfChampion(target),
): number {
  if (!target.alive || target.positionLabel === 'JUNGLE') {
    return 0;
  }
  const hpRatio = target.hp / Math.max(1, target.maxHp);
  const progress = lanePathProgress(state, lane, target.position);
  const overextend =
    target.side === 'blue'
      ? clamp01((progress - 0.36) / 0.44)
      : clamp01((0.64 - progress) / 0.44);
  const lowHp = clamp01((0.78 - hpRatio) / 0.58);
  const wave = assessChampionLaneWave(state, target, lane);
  const zonePush =
    wave.zone === 'enemy' ? 0.28 : wave.zone === 'river' ? 0.12 : 0;
  let alliesNear = 0;
  for (const ally of state.champions) {
    if (!ally.alive || ally.side !== target.side || ally.id === target.id) {
      continue;
    }
    if (dist(ally.position, target.position) <= 1350) {
      alliesNear += 1;
    }
  }
  const alone = alliesNear <= 0 ? 0.18 : alliesNear === 1 ? 0.06 : 0;
  const read = laneMatchupRead(state, target, lane);
  return clamp01(
    overextend * 0.52 +
      lowHp * 0.48 +
      zonePush +
      alone +
      read.expose * 0.22 +
      (overextend > 0.55 && lowHp > 0.35 ? 0.12 : 0),
  );
}

export function standProgressBias(read: LaneMatchupRead): number {
  const safePull = read.deficit * 0.1 + read.expose * 0.05;
  const pressPush = read.ahead * read.pressure * 0.055;
  return pressPush - safePull;
}

export function tradeCommitFactor(read: LaneMatchupRead): number {
  return clamp01(1 - read.deficit * 1.05 - read.expose * 0.18);
}

export function shoveCommitFactor(read: LaneMatchupRead): number {
  const boost = 1 + read.ahead * read.pressure * 0.45;
  const cut = 1 - read.deficit * 0.7 - read.expose * 0.55;
  return Math.max(0.12, boost * Math.max(0.15, cut));
}

export function disengageHpBoost(read: LaneMatchupRead): number {
  return read.deficit * 0.14 + read.expose * 0.05;
}

export function hardContactCommitFactor(read: LaneMatchupRead): number {
  return clamp01(1 - read.deficit * 1.15 - (1 - read.ahead) * 0.08);
}
