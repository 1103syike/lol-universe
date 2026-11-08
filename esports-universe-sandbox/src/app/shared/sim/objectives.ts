import { PLAYER_POSITION_LABELS } from '../../core/models/player.model';
import { SIM_BALANCE } from './balance';
import { resolveFightDamage } from './damage';
import { combatPower } from './economy';
import {
  canOpenNexus,
  createFullSiegeStructures,
  createFullTowerGrid,
  gatherForObjective,
  inhibitorsDestroyedCount,
  lanesWithHighlandDown,
  nexusTowersStanding,
  type PlayerPresence,
  type SideSiegeStructures,
  type SideTowerGrid,
  type TowerLaneId,
} from './map-presence';
import type { KillContext, PlayerRuntimeStats, TimelineEvent } from './match-stats';
import type { PlayPhaseId } from './match-stats';
import type { MatchState } from './match-state';
import { liveEdgeBias } from './match-state';
import { aliveViews, countAlive } from './death-state';
import {
  OBJECTIVE_DEFER_SEC,
  decideObjective,
  type ContestableObjective,
  type ObjectiveDecision,
} from './objective-decision';
import { plateGoldAt } from './plates';
import {
  DRAGON_TYPES,
  createTimelineEvent,
  dragonMarker,
  formatClock,
} from './timeline';
import type { TeamProfile } from './team-profile';

export interface ObjectiveProgress {
  homeDragons: number;
  awayDragons: number;
  homeDragonSoul: boolean;
  awayDragonSoul: boolean;
  homeBarons: number;
  awayBarons: number;
  homeElders: number;
  awayElders: number;
  homeTowers: number;
  awayTowers: number;
  homeInhibitors: number;
  awayInhibitors: number;
  homeTowerPressure: number;
  awayTowerPressure: number;
  homeDefense: SideTowerGrid;
  awayDefense: SideTowerGrid;
  homeSiege: SideSiegeStructures;
  awaySiege: SideSiegeStructures;
  homeSiegeWavePressure: number;
  awaySiegeWavePressure: number;
  canRotateHome: boolean;
  canRotateAway: boolean;
  homeVoidgrubs: number;
  awayVoidgrubs: number;
  homeHeralds: number;
  awayHeralds: number;
  nextDragonAt: number;
  nextBaronAt: number;
  nextElderAt: number | null;
  nextVoidgrubAt: number | null;
  nextHeraldAt: number | null;
  voidgrubTaken: boolean;
  heraldTaken: boolean;
  soulTaken: boolean;
  heraldSmashHome: boolean;
  heraldSmashAway: boolean;
  homeStructureDestroyStamp: number | null;
  awayStructureDestroyStamp: number | null;
  homeNextInhibEligibleAt: number;
  awayNextInhibEligibleAt: number;
  homeNextNexusTowerEligibleAt: number;
  awayNextNexusTowerEligibleAt: number;
  homeNextNexusCloseEligibleAt: number;
  awayNextNexusCloseEligibleAt: number;
  lastTeamfightAt: number | null;
  lastBackdoorAttemptAt: number | null;
}

export function createObjectiveProgress(): ObjectiveProgress {
  return {
    homeDragons: 0,
    awayDragons: 0,
    homeDragonSoul: false,
    awayDragonSoul: false,
    homeBarons: 0,
    awayBarons: 0,
    homeElders: 0,
    awayElders: 0,
    homeTowers: 0,
    awayTowers: 0,
    homeInhibitors: 0,
    awayInhibitors: 0,
    homeTowerPressure: 0,
    awayTowerPressure: 0,
    homeDefense: createFullTowerGrid(),
    awayDefense: createFullTowerGrid(),
    homeSiege: createFullSiegeStructures(),
    awaySiege: createFullSiegeStructures(),
    homeSiegeWavePressure: 0,
    awaySiegeWavePressure: 0,
    canRotateHome: false,
    canRotateAway: false,
    homeVoidgrubs: 0,
    awayVoidgrubs: 0,
    homeHeralds: 0,
    awayHeralds: 0,
    nextDragonAt: SIM_BALANCE.dragonSpawnSec,
    nextBaronAt: SIM_BALANCE.baronSpawnSec,
    nextElderAt: null,
    nextVoidgrubAt: SIM_BALANCE.voidgrubSpawnSec,
    nextHeraldAt: SIM_BALANCE.heraldSpawnSec,
    voidgrubTaken: false,
    heraldTaken: false,
    soulTaken: false,
    heraldSmashHome: false,
    heraldSmashAway: false,
    homeStructureDestroyStamp: null,
    awayStructureDestroyStamp: null,
    homeNextInhibEligibleAt: 0,
    awayNextInhibEligibleAt: 0,
    homeNextNexusTowerEligibleAt: 0,
    awayNextNexusTowerEligibleAt: 0,
    homeNextNexusCloseEligibleAt: 0,
    awayNextNexusCloseEligibleAt: 0,
    lastTeamfightAt: null,
    lastBackdoorAttemptAt: null,
  };
}

type SiegeTarget =
  | { kind: 'lane-tower'; lane: TowerLaneId; tier: 1 | 2 | 3 }
  | { kind: 'inhibitor'; lane: TowerLaneId }
  | { kind: 'nexus-tower'; which: 'A' | 'B' };

function pickSiegeTarget(
  defense: SideTowerGrid,
  siege: SideSiegeStructures,
  random: () => number,
  options?: { allowInhibitor?: boolean },
): SiegeTarget | null {
  const lanes: TowerLaneId[] = ['top', 'mid', 'bot'];
  const outer = lanes.filter((lane) => defense[lane].outer);
  if (outer.length > 0) {
    return { kind: 'lane-tower', lane: outer[Math.floor(random() * outer.length)], tier: 1 };
  }
  const inner = lanes.filter((lane) => defense[lane].inner);
  if (inner.length > 0) {
    return { kind: 'lane-tower', lane: inner[Math.floor(random() * inner.length)], tier: 2 };
  }
  const highland = lanes.filter((lane) => defense[lane].base);
  if (highland.length > 0) {
    return { kind: 'lane-tower', lane: highland[Math.floor(random() * highland.length)], tier: 3 };
  }

  const allowInhibitor = options?.allowInhibitor !== false;
  const inhibOpen = inhibitorsDestroyedCount(siege) >= 1;
  if (inhibOpen) {
    if (siege.nexusTowerA) {
      return { kind: 'nexus-tower', which: 'A' };
    }
    if (siege.nexusTowerB) {
      return { kind: 'nexus-tower', which: 'B' };
    }
  }

  const inhibLanes = lanesWithHighlandDown(defense).filter(
    (lane) => siege.inhibitorsStanding[lane],
  );
  if (inhibLanes.length > 0) {
    if (!allowInhibitor) {
      return null;
    }
    return { kind: 'inhibitor', lane: inhibLanes[Math.floor(random() * inhibLanes.length)] };
  }

  return null;
}

function sideDestroyedThisStamp(
  progress: ObjectiveProgress,
  homeTakes: boolean,
  stamp: number,
): boolean {
  return homeTakes
    ? progress.homeStructureDestroyStamp === stamp
    : progress.awayStructureDestroyStamp === stamp;
}

function markSideDestroyedThisStamp(
  progress: ObjectiveProgress,
  homeTakes: boolean,
  stamp: number,
): void {
  if (homeTakes) {
    progress.homeStructureDestroyStamp = stamp;
    return;
  }
  progress.awayStructureDestroyStamp = stamp;
}

function nextInhibEligibleAt(progress: ObjectiveProgress, homeTakes: boolean): number {
  return homeTakes ? progress.homeNextInhibEligibleAt : progress.awayNextInhibEligibleAt;
}

function setNextInhibEligibleAt(
  progress: ObjectiveProgress,
  homeTakes: boolean,
  eligibleAt: number,
): void {
  if (homeTakes) {
    progress.homeNextInhibEligibleAt = eligibleAt;
    return;
  }
  progress.awayNextInhibEligibleAt = eligibleAt;
}

function nextNexusTowerEligibleAt(progress: ObjectiveProgress, homeTakes: boolean): number {
  return homeTakes
    ? progress.homeNextNexusTowerEligibleAt
    : progress.awayNextNexusTowerEligibleAt;
}

function setNextNexusTowerEligibleAt(
  progress: ObjectiveProgress,
  homeTakes: boolean,
  eligibleAt: number,
): void {
  if (homeTakes) {
    progress.homeNextNexusTowerEligibleAt = Math.max(
      progress.homeNextNexusTowerEligibleAt,
      eligibleAt,
    );
    return;
  }
  progress.awayNextNexusTowerEligibleAt = Math.max(
    progress.awayNextNexusTowerEligibleAt,
    eligibleAt,
  );
}

function nextNexusCloseEligibleAt(progress: ObjectiveProgress, attackingHome: boolean): number {
  return attackingHome
    ? progress.homeNextNexusCloseEligibleAt
    : progress.awayNextNexusCloseEligibleAt;
}

function setNextNexusCloseEligibleAt(
  progress: ObjectiveProgress,
  homeTakes: boolean,
  eligibleAt: number,
): void {
  if (homeTakes) {
    progress.homeNextNexusCloseEligibleAt = Math.max(
      progress.homeNextNexusCloseEligibleAt,
      eligibleAt,
    );
    return;
  }
  progress.awayNextNexusCloseEligibleAt = Math.max(
    progress.awayNextNexusCloseEligibleAt,
    eligibleAt,
  );
}

function applyLaneTowerDestruction(defense: SideTowerGrid, lane: TowerLaneId, tier: 1 | 2 | 3): void {
  if (tier === 1) {
    defense[lane].outer = false;
    return;
  }
  if (tier === 2) {
    defense[lane].inner = false;
    return;
  }
  defense[lane].base = false;
}

function laneLabel(lane: TowerLaneId): string {
  if (lane === 'top') return '上路';
  if (lane === 'mid') return '中路';
  return '下路';
}

function openRotation(progress: ObjectiveProgress): void {
  progress.canRotateHome = true;
  progress.canRotateAway = true;
}

function objectiveEdge(
  home: TeamProfile,
  away: TeamProfile,
  phase: PlayPhaseId,
  state: MatchState,
): number {
  const homeAvg =
    home.players.reduce((sum, view) => sum + combatPower(view, phase), 0) /
    Math.max(1, home.players.length);
  const awayAvg =
    away.players.reduce((sum, view) => sum + combatPower(view, phase), 0) /
    Math.max(1, away.players.length);
  const homeSkill = 80 + (homeAvg - 80) * SIM_BALANCE.playerSkillFightScale;
  const awaySkill = 80 + (awayAvg - 80) * SIM_BALANCE.playerSkillFightScale;
  const homeScore =
    homeSkill +
    home.style.resourceControl * 12 +
    home.style.teamfightExecute * 8 +
    liveEdgeBias(state, true);
  const awayScore =
    awaySkill +
    away.style.resourceControl * 12 +
    away.style.teamfightExecute * 8 +
    liveEdgeBias(state, false);
  return homeScore - awayScore;
}

function pickActor(
  profile: TeamProfile,
  phase: PlayPhaseId,
  random: () => number,
  players?: PlayerRuntimeStats[],
  t?: number,
): string {
  const pool =
    players && t !== undefined ? aliveViews(profile, players, t) : profile.players;
  const source = pool.length > 0 ? pool : profile.players;
  const ranked = [...source].sort(
    (left, right) => combatPower(right, phase) - combatPower(left, phase),
  );
  const top = ranked.slice(0, Math.min(3, ranked.length));
  return top[Math.floor(random() * top.length)]?.player.id ?? ranked[0].player.id;
}

function buildObjectiveContest(input: {
  t: number;
  kind: 'dragon' | 'dragon-soul' | 'baron' | 'elder';
  phase: PlayPhaseId;
  winner: TeamProfile;
  loser: TeamProfile;
  players: PlayerRuntimeStats[];
  homeTeamId: string;
  method: ObjectiveDecision['method'];
  random: () => number;
}): TimelineEvent[] {
  let contestChance =
    input.phase === 'early' ? 0.55 : input.phase === 'mid' ? 0.78 : 0.88;
  if (input.method === 'vision-first') {
    contestChance -= 0.22;
  } else if (input.method === 'fake-start') {
    contestChance -= 0.18;
  } else if (input.method === 'engage-ambush') {
    contestChance += 0.12;
  }
  if (input.random() > contestChance) {
    return [];
  }

  const context: KillContext =
    input.kind === 'baron' ? 'baron' : input.kind === 'elder' ? 'elder' : 'dragon';
  const label =
    context === 'baron' ? '巴龍團' : context === 'elder' ? '遠古龍團' : '小龍團';
  const methodHint =
    input.method === 'engage-ambush'
      ? '埋伏開團'
      : input.method === 'fake-start'
        ? '假開換位'
        : input.method === 'vision-first'
          ? '清視野後交戰'
          : '正面硬接';
  const aliveWinner = aliveViews(input.winner, input.players, input.t);
  const aliveLoser = aliveViews(input.loser, input.players, input.t);
  if (aliveWinner.length === 0 || aliveLoser.length === 0) {
    return [];
  }
  const pickCount = input.phase === 'early' ? 2 : input.phase === 'mid' ? 3 : 4;
  const rankedWinner = [...aliveWinner].sort(
    (left, right) => combatPower(right, input.phase) - combatPower(left, input.phase),
  );
  const rankedLoser = [...aliveLoser].sort(
    (left, right) => combatPower(right, input.phase) - combatPower(left, input.phase),
  );
  const winners = rankedWinner.slice(0, Math.min(pickCount, rankedWinner.length));
  const losers = rankedLoser.slice(0, Math.min(pickCount, rankedLoser.length));
  const events: TimelineEvent[] = [];
  const winnerIsHome = input.winner.teamId === input.homeTeamId;
  const intensity = input.phase === 'early' ? 'skirmish' : 'teamfight';
  const fightStamp = Math.max(1, input.t - 2);
  const fight = resolveFightDamage({
    phase: input.phase,
    intensity,
    homeParticipants: winnerIsHome ? winners : losers,
    awayParticipants: winnerIsHome ? losers : winners,
    homePressure: winnerIsHome ? 0.64 : 0.36,
    random: input.random,
  });
  events.push(
    createTimelineEvent({
      t: fightStamp,
      type: 'combat',
      teamId: input.winner.teamId,
      payload: {
        damageByPlayer: fight.damageByPlayer,
        goldDeltaHome: 0,
        goldDeltaAway: 0,
        killContext: context,
        intensity,
        fightLane: 'river',
      },
      summary: `${formatClock(fightStamp)} · ${label}輸出｜主隊 ${Math.round(fight.homeTotal)} / 客隊 ${Math.round(fight.awayTotal)}`,
    }),
  );

  if (input.phase !== 'early' || input.method === 'engage-ambush') {
    events.push(
      createTimelineEvent({
        t: fightStamp,
        type: 'teamfight',
        teamId: input.winner.teamId,
        payload: {
          marker: 'K',
          killContext: context,
          objectiveMethod: input.method ?? undefined,
        },
        summary: `${formatClock(fightStamp)} · ${label}｜${
          winnerIsHome ? '主隊' : '客隊'
        }以${methodHint}打出資源團優勢`,
      }),
    );
  }

  let killCount =
    input.phase === 'early' ? 1 : 1 + Math.floor(input.random() * Math.min(2, losers.length));
  if (input.method === 'engage-ambush') {
    killCount = Math.min(losers.length, killCount + 1);
  } else if (input.method === 'vision-first' || input.method === 'fake-start') {
    killCount = Math.max(1, killCount - 1);
  }
  killCount = Math.min(killCount, losers.length);
  for (let index = 0; index < killCount && index < losers.length; index += 1) {
    const killerView = winners[Math.min(index, winners.length - 1)];
    const victimView = losers[index];
    const killer = input.players.find((player) => player.playerId === killerView.player.id);
    const victim = input.players.find((player) => player.playerId === victimView.player.id);
    if (!killer || !victim) {
      continue;
    }
    const assists = winners
      .filter((view) => view.player.id !== killerView.player.id)
      .slice(0, input.phase === 'early' ? 1 : 2);
    const stamp = Math.max(1, input.t - 1 + index);
    const killGold = SIM_BALANCE.killGoldBase;
    events.push(
      createTimelineEvent({
        t: stamp,
        type: 'kill',
        teamId: input.winner.teamId,
        actorPlayerId: killer.playerId,
        assistPlayerIds: assists.map((view) => view.player.id),
        victimPlayerId: victim.playerId,
        victimTeamId: input.loser.teamId,
        payload: {
          killGold,
          goldDeltaHome: winnerIsHome ? killGold : 0,
          goldDeltaAway: winnerIsHome ? 0 : killGold,
          killContext: context,
          fightLane: 'river',
          intensity,
        },
        summary: `${formatClock(stamp)} · 擊殺｜${label}中，${PLAYER_POSITION_LABELS[killerView.player.position]} ${killer.gamertag} 擊殺 ${PLAYER_POSITION_LABELS[victimView.player.position]} ${victim.gamertag}`,
      }),
    );
  }

  return events;
}

function decisionPayload(decision: ObjectiveDecision, takerIsHome: boolean) {
  return {
    objectiveIntent: takerIsHome ? decision.home.intent : decision.away.intent,
    opponentIntent: takerIsHome ? decision.away.intent : decision.home.intent,
    objectiveMethod: decision.method ?? undefined,
    decisionReason: decision.reasonSummary,
    decisionOutcome: decision.outcome,
  };
}

function deferObjectiveClock(
  progress: ObjectiveProgress,
  kind: ContestableObjective,
  t: number,
): void {
  const next = t + OBJECTIVE_DEFER_SEC;
  if (kind === 'dragon') {
    progress.nextDragonAt = Math.max(progress.nextDragonAt, next);
    return;
  }
  if (kind === 'baron') {
    progress.nextBaronAt = Math.max(progress.nextBaronAt, next);
    return;
  }
  if (kind === 'elder' && progress.nextElderAt !== null) {
    progress.nextElderAt = Math.max(progress.nextElderAt, next);
    return;
  }
  if (kind === 'voidgrub' && progress.nextVoidgrubAt !== null) {
    progress.nextVoidgrubAt = Math.max(progress.nextVoidgrubAt, next);
    return;
  }
  if (kind === 'herald' && progress.nextHeraldAt !== null) {
    progress.nextHeraldAt = Math.max(progress.nextHeraldAt, next);
  }
}

function applyTradePressure(progress: ObjectiveProgress, traderIsHome: boolean): void {
  if (traderIsHome) {
    progress.homeTowerPressure += SIM_BALANCE.towerPressureNeed * 0.85;
    return;
  }
  progress.awayTowerPressure += SIM_BALANCE.towerPressureNeed * 0.85;
}

function tryDestroyTower(input: {
  t: number;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  progress: ObjectiveProgress;
  homeTakes: boolean;
  forced: boolean;
  reasonSuffix?: string;
  recentCombat?: boolean;
  random: () => number;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  if (input.t < SIM_BALANCE.minOuterTowerSec) {
    return events;
  }
  if (sideDestroyedThisStamp(input.progress, input.homeTakes, input.t)) {
    return events;
  }

  const defense = input.homeTakes ? input.progress.awayDefense : input.progress.homeDefense;
  const siege = input.homeTakes ? input.progress.awaySiege : input.progress.homeSiege;
  const defenderTeamId = input.homeTakes ? input.away.teamId : input.home.teamId;
  const attackerLabel = input.homeTakes ? '主隊' : '客隊';
  const defenderLabel = input.homeTakes ? '客隊' : '主隊';
  const winner = input.homeTakes ? input.home : input.away;
  const actorId = pickActor(winner, input.phase, input.random);
  const inhibReady =
    input.forced || input.t >= nextInhibEligibleAt(input.progress, input.homeTakes);
  const target = pickSiegeTarget(defense, siege, input.random, {
    allowInhibitor: inhibReady,
  });
  if (!target) {
    return events;
  }

  const lanePressure = input.homeTakes
    ? input.progress.homeTowerPressure
    : input.progress.awayTowerPressure;
  const wavePressure = input.homeTakes
    ? input.progress.homeSiegeWavePressure
    : input.progress.awaySiegeWavePressure;
  const laneNeed = input.forced
    ? SIM_BALANCE.towerPressureNeed * 0.55
    : SIM_BALANCE.towerPressureNeed;

  if (target.kind === 'lane-tower') {
    const towersTaken = input.homeTakes ? input.progress.homeTowers : input.progress.awayTowers;
    if (towersTaken >= 11 || lanePressure < laneNeed) {
      return events;
    }
    applyLaneTowerDestruction(defense, target.lane, target.tier);
    if (input.homeTakes) {
      input.progress.homeTowers += 1;
      input.progress.homeTowerPressure = 0;
      input.progress.heraldSmashHome = false;
    } else {
      input.progress.awayTowers += 1;
      input.progress.awayTowerPressure = 0;
      input.progress.heraldSmashAway = false;
    }
    markSideDestroyedThisStamp(input.progress, input.homeTakes, input.t);
    if (target.tier === 1) {
      openRotation(input.progress);
    }
    if (target.tier === 3) {
      if (input.homeTakes) {
        input.progress.homeSiegeWavePressure += SIM_BALANCE.siegeWavePressureGain;
      } else {
        input.progress.awaySiegeWavePressure += SIM_BALANCE.siegeWavePressureGain;
      }
    }
    const plateBonus = target.tier === 1 ? plateGoldAt(input.t) : 0;
    const gold = SIM_BALANCE.towerGold + plateBonus;
    const tierLabel = target.tier === 1 ? '外' : target.tier === 2 ? '內' : '高地';
    events.push(
      createTimelineEvent({
        t: input.t,
        type: 'tower',
        teamId: winner.teamId,
        actorPlayerId: actorId,
        payload: {
          towerLane: target.lane,
          towerTier: target.tier,
          defenderTeamId,
          goldDeltaHome: input.homeTakes ? gold : 0,
          goldDeltaAway: input.homeTakes ? 0 : gold,
          marker: 'T',
          pushStyle:
            input.recentCombat == null ? undefined : input.recentCombat ? 'grouped' : 'split',
          recentCombat: input.recentCombat,
        },
        summary: `${formatClock(input.t)} · 防禦塔｜${attackerLabel}摧毀${defenderLabel}${laneLabel(target.lane)}${tierLabel}塔${
          target.tier === 1 ? '，開放轉線選項' : ''
        }${input.reasonSuffix ?? ''}`,
      }),
    );
    return events;
  }

  if (target.kind === 'inhibitor') {
    if (lanePressure < laneNeed * 0.85 && !input.forced) {
      return events;
    }
    siege.inhibitorsStanding[target.lane] = false;
    if (input.homeTakes) {
      input.progress.homeInhibitors += 1;
      input.progress.homeTowerPressure = 0;
      input.progress.homeSiegeWavePressure += SIM_BALANCE.siegeWavePressureGain * 1.6;
    } else {
      input.progress.awayInhibitors += 1;
      input.progress.awayTowerPressure = 0;
      input.progress.awaySiegeWavePressure += SIM_BALANCE.siegeWavePressureGain * 1.6;
    }
    const towerGapAbs = Math.abs(input.progress.homeTowers - input.progress.awayTowers);
    const pace = stompPaceScale(towerGapAbs);
    setNextInhibEligibleAt(
      input.progress,
      input.homeTakes,
      input.t + SIM_BALANCE.inhibitorSiegeCooldownSec * pace,
    );
    setNextNexusTowerEligibleAt(
      input.progress,
      input.homeTakes,
      input.t + SIM_BALANCE.nexusTowerSiegeGapSec * pace,
    );
    markSideDestroyedThisStamp(input.progress, input.homeTakes, input.t);
    events.push(
      createTimelineEvent({
        t: input.t,
        type: 'inhibitor',
        teamId: winner.teamId,
        actorPlayerId: actorId,
        payload: {
          towerLane: target.lane,
          defenderTeamId,
          goldDeltaHome: input.homeTakes ? SIM_BALANCE.inhibitorGold : 0,
          goldDeltaAway: input.homeTakes ? 0 : SIM_BALANCE.inhibitorGold,
        },
        summary: `${formatClock(input.t)} · 兵營｜${attackerLabel}摧毀${defenderLabel}${laneLabel(target.lane)}兵營${input.reasonSuffix ?? ''}`,
      }),
    );
    return events;
  }

  if (input.t < nextNexusTowerEligibleAt(input.progress, input.homeTakes)) {
    return events;
  }
  if (wavePressure < SIM_BALANCE.siegeWavePressureNeedNexusTower && !input.forced) {
    return events;
  }
  if (target.which === 'A') {
    siege.nexusTowerA = false;
  } else {
    siege.nexusTowerB = false;
  }
  if (input.homeTakes) {
    input.progress.homeTowers += 1;
    input.progress.homeSiegeWavePressure = Math.max(
      0,
      input.progress.homeSiegeWavePressure - SIM_BALANCE.siegeWavePressureNeedNexusTower * 0.55,
    );
  } else {
    input.progress.awayTowers += 1;
    input.progress.awaySiegeWavePressure = Math.max(
      0,
      input.progress.awaySiegeWavePressure - SIM_BALANCE.siegeWavePressureNeedNexusTower * 0.55,
    );
  }
  const towerGapAbs = Math.abs(input.progress.homeTowers - input.progress.awayTowers);
  const pace = stompPaceScale(towerGapAbs);
  setNextNexusTowerEligibleAt(
    input.progress,
    input.homeTakes,
    input.t + SIM_BALANCE.nexusTowerSiegeGapSec * pace,
  );
  if (nexusTowersStanding(siege) === 0) {
    setNextNexusCloseEligibleAt(
      input.progress,
      input.homeTakes,
      input.t + SIM_BALANCE.nexusCloseGapSec * pace,
    );
  }
  markSideDestroyedThisStamp(input.progress, input.homeTakes, input.t);
  const remaining = nexusTowersStanding(siege);
  const gold = SIM_BALANCE.nexusTowerGold;
  events.push(
    createTimelineEvent({
      t: input.t,
      type: 'tower',
      teamId: winner.teamId,
      actorPlayerId: actorId,
      payload: {
        towerTier: 'nexus',
        defenderTeamId,
        goldDeltaHome: input.homeTakes ? gold : 0,
        goldDeltaAway: input.homeTakes ? 0 : gold,
        marker: 'T',
      },
      summary: `${formatClock(input.t)} · 防禦塔｜${attackerLabel}摧毀${defenderLabel}主堡防禦塔（還剩 ${remaining} 座）${input.reasonSuffix ?? ''}`,
    }),
  );
  return events;
}

function stompPaceScale(towerGapAbs: number): number {
  if (towerGapAbs >= SIM_BALANCE.stompTowerGapHard) {
    return SIM_BALANCE.stompSiegeGapScaleHard;
  }
  if (towerGapAbs >= SIM_BALANCE.stompTowerGapSoft) {
    return SIM_BALANCE.stompSiegeGapScaleSoft;
  }
  return 1;
}

function goldCrushTier(goldLeadAbs: number): 0 | 1 | 2 | 3 {
  if (goldLeadAbs >= SIM_BALANCE.stompGoldCrush) return 3;
  if (goldLeadAbs >= SIM_BALANCE.stompGoldHard) return 2;
  if (goldLeadAbs >= SIM_BALANCE.stompGoldSoft) return 1;
  return 0;
}

function gainSiegeWavePressure(input: {
  progress: ObjectiveProgress;
  home: TeamProfile;
  away: TeamProfile;
  homeFavored: number;
  goldCrushHome?: number;
  goldCrushAway?: number;
}): void {
  const homeBonus =
    input.progress.homeBarons * 0.18 +
    (input.progress.homeElders > 0 ? 0.2 : 0) +
    inhibitorsDestroyedCount(input.progress.awaySiege) * 0.12 +
    Math.max(0, input.homeFavored - 0.5) * 0.35 +
    Math.max(0, (input.goldCrushHome ?? 0) - 1) * 0.28;
  const awayBonus =
    input.progress.awayBarons * 0.18 +
    (input.progress.awayElders > 0 ? 0.2 : 0) +
    inhibitorsDestroyedCount(input.progress.homeSiege) * 0.12 +
    Math.max(0, 0.5 - input.homeFavored) * 0.35 +
    Math.max(0, (input.goldCrushAway ?? 0) - 1) * 0.28;
  input.progress.homeSiegeWavePressure +=
    SIM_BALANCE.siegeWavePressureGain *
    (0.55 + homeBonus + input.home.style.lanePressure * 0.25 + input.home.style.splitPush * 0.15);
  input.progress.awaySiegeWavePressure +=
    SIM_BALANCE.siegeWavePressureGain *
    (0.55 + awayBonus + input.away.style.lanePressure * 0.25 + input.away.style.splitPush * 0.15);
}

function sideCanCloseNexus(input: {
  t: number;
  progress: ObjectiveProgress;
  attackingHome: boolean;
}): boolean {
  const siege = input.attackingHome ? input.progress.awaySiege : input.progress.homeSiege;
  const wave = input.attackingHome
    ? input.progress.homeSiegeWavePressure
    : input.progress.awaySiegeWavePressure;
  return (
    canOpenNexus(siege) &&
    wave >= SIM_BALANCE.siegeWavePressureNeedNexus &&
    input.t >= nextNexusCloseEligibleAt(input.progress, input.attackingHome)
  );
}

function sideCanBackdoor(input: {
  t: number;
  progress: ObjectiveProgress;
  attackingHome: boolean;
  defenderDead: number;
}): boolean {
  if (input.t < SIM_BALANCE.backdoorMinMatchSec) {
    return false;
  }
  if (input.t >= SIM_BALANCE.maxMatchSeconds) {
    return false;
  }
  if (input.defenderDead < SIM_BALANCE.backdoorMinDead) {
    return false;
  }
  const lastFight = input.progress.lastTeamfightAt;
  if (
    lastFight == null ||
    input.t - lastFight > SIM_BALANCE.backdoorAfterFightSec
  ) {
    return false;
  }
  const lastAttempt = input.progress.lastBackdoorAttemptAt;
  if (
    lastAttempt != null &&
    input.t - lastAttempt < SIM_BALANCE.backdoorAttemptCooldownSec
  ) {
    return false;
  }
  const siege = input.attackingHome ? input.progress.awaySiege : input.progress.homeSiege;
  const wave = input.attackingHome
    ? input.progress.homeSiegeWavePressure
    : input.progress.awaySiegeWavePressure;
  return (
    inhibitorsDestroyedCount(siege) >= 1 &&
    nexusTowersStanding(siege) > 0 &&
    wave >= SIM_BALANCE.backdoorWavePressureNeed
  );
}

function clearSiegeForBackdoor(siege: SideSiegeStructures): void {
  siege.nexusTowerA = false;
  siege.nexusTowerB = false;
}

function backdoorChance(input: {
  attacker: TeamProfile;
  defenderDead: number;
}): number {
  const excessDead = Math.max(0, input.defenderDead - SIM_BALANCE.backdoorMinDead);
  return Math.min(
    SIM_BALANCE.backdoorChanceCap,
    SIM_BALANCE.backdoorChanceBase +
      excessDead * SIM_BALANCE.backdoorChancePerDead +
      input.attacker.style.splitPush * SIM_BALANCE.backdoorSplitPushBonus,
  );
}

function resolveTakenObjective(input: {
  t: number;
  phase: PlayPhaseId;
  kind: ContestableObjective;
  decision: ObjectiveDecision;
  homeTakes: boolean;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  progress: ObjectiveProgress;
  presence: PlayerPresence[];
  withFight: boolean;
  random: () => number;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const winner = input.homeTakes ? input.home : input.away;
  const loser = input.homeTakes ? input.away : input.home;
  const actorId = pickActor(
    winner,
    input.phase,
    input.random,
    input.players,
    input.t,
  );
  const payloadExtra = decisionPayload(input.decision, input.homeTakes);
  gatherForObjective(
    input.presence,
    winner.teamId,
    input.kind,
    winner.teamId === input.home.teamId,
  );
  if (input.withFight) {
    gatherForObjective(
      input.presence,
      loser.teamId,
      input.kind,
      loser.teamId === input.home.teamId,
    );
  }

  if (input.withFight) {
    const contestKind =
      input.kind === 'dragon'
        ? input.progress.homeDragons + input.progress.awayDragons + 1 >= 4
          ? 'dragon-soul'
          : 'dragon'
        : input.kind === 'baron'
          ? 'baron'
          : input.kind === 'elder'
            ? 'elder'
            : 'dragon';
    if (input.kind === 'dragon' || input.kind === 'baron' || input.kind === 'elder') {
      events.push(
        ...buildObjectiveContest({
          t: input.t,
          kind: contestKind,
          phase: input.phase,
          winner,
          loser,
          players: input.players,
          homeTeamId: input.home.teamId,
          method: input.decision.method,
          random: input.random,
        }),
      );
    }
  }

  if (input.kind === 'dragon') {
    if (input.homeTakes) {
      input.progress.homeDragons += 1;
    } else {
      input.progress.awayDragons += 1;
    }
    const totalDragons = input.progress.homeDragons + input.progress.awayDragons;
    const dragonType = DRAGON_TYPES[Math.floor(input.random() * DRAGON_TYPES.length)];
    const gold = SIM_BALANCE.dragonGold;
    const fightHint = input.withFight ? '（資源團換取）' : '（對方放棄／交換）';
    events.push(
      createTimelineEvent({
        t: input.t,
        type: totalDragons >= 4 ? 'dragon-soul' : 'dragon',
        teamId: winner.teamId,
        actorPlayerId: actorId,
        payload: {
          dragonType,
          goldDeltaHome: input.homeTakes ? gold : 0,
          goldDeltaAway: input.homeTakes ? 0 : gold,
          marker: dragonMarker(totalDragons),
          killContext: 'dragon',
          ...payloadExtra,
        },
        summary:
          totalDragons >= 4
            ? `${formatClock(input.t)} · 龍魂｜${input.homeTakes ? '主隊' : '客隊'}取得龍魂（${dragonType}）｜${input.decision.reasonSummary}`
            : `${formatClock(input.t)} · 小龍｜${input.homeTakes ? '主隊' : '客隊'}擊殺${dragonType}龍${fightHint}｜${input.decision.reasonSummary}`,
      }),
    );
    if (totalDragons >= 4) {
      input.progress.soulTaken = true;
      if (input.homeTakes) {
        input.progress.homeDragonSoul = true;
      } else {
        input.progress.awayDragonSoul = true;
      }
      input.progress.nextElderAt = input.t + SIM_BALANCE.elderAfterSoulSec;
    }
    input.progress.nextDragonAt = input.t + SIM_BALANCE.dragonRespawnSec;
    return events;
  }

  if (input.kind === 'elder') {
    if (input.homeTakes) {
      input.progress.homeElders += 1;
    } else {
      input.progress.awayElders += 1;
    }
    const gold = SIM_BALANCE.elderGold;
    events.push(
      createTimelineEvent({
        t: input.t,
        type: 'elder',
        teamId: winner.teamId,
        actorPlayerId: actorId,
        payload: {
          goldDeltaHome: input.homeTakes ? gold : 0,
          goldDeltaAway: input.homeTakes ? 0 : gold,
          marker: 'E',
          killContext: 'elder',
          ...payloadExtra,
        },
        summary: `${formatClock(input.t)} · 遠古巨龍｜${input.homeTakes ? '主隊' : '客隊'}擊殺遠古巨龍｜${input.decision.reasonSummary}`,
      }),
    );
    input.progress.nextElderAt = input.t + SIM_BALANCE.elderAfterSoulSec;
    return events;
  }

  if (input.kind === 'baron') {
    if (input.homeTakes) {
      input.progress.homeBarons += 1;
      input.progress.homeTowerPressure +=
        SIM_BALANCE.towerPressureNeed * SIM_BALANCE.baronTowerPressureBurst;
      input.progress.homeSiegeWavePressure += SIM_BALANCE.siegeWavePressureGain * 2.2;
    } else {
      input.progress.awayBarons += 1;
      input.progress.awayTowerPressure +=
        SIM_BALANCE.towerPressureNeed * SIM_BALANCE.baronTowerPressureBurst;
      input.progress.awaySiegeWavePressure += SIM_BALANCE.siegeWavePressureGain * 2.2;
    }
    const gold = SIM_BALANCE.baronGold;
    events.push(
      createTimelineEvent({
        t: input.t,
        type: 'baron',
        teamId: winner.teamId,
        actorPlayerId: actorId,
        payload: {
          goldDeltaHome: input.homeTakes ? gold : 0,
          goldDeltaAway: input.homeTakes ? 0 : gold,
          marker: 'B',
          killContext: 'baron',
          ...payloadExtra,
        },
        summary: `${formatClock(input.t)} · 巴龍｜${input.homeTakes ? '主隊' : '客隊'}擊殺巴龍｜${input.decision.reasonSummary}`,
      }),
    );
    input.progress.nextBaronAt = input.t + SIM_BALANCE.baronRespawnSec;
    return events;
  }

  if (input.kind === 'voidgrub') {
    if (input.homeTakes) {
      input.progress.homeVoidgrubs += 1;
    } else {
      input.progress.awayVoidgrubs += 1;
    }
    input.progress.voidgrubTaken = true;
    input.progress.nextVoidgrubAt = null;
    const gold = SIM_BALANCE.voidgrubGold;
    events.push(
      createTimelineEvent({
        t: input.t,
        type: 'voidgrub',
        teamId: winner.teamId,
        actorPlayerId: actorId,
        payload: {
          goldDeltaHome: input.homeTakes ? gold : 0,
          goldDeltaAway: input.homeTakes ? 0 : gold,
          marker: 'T',
          ...payloadExtra,
        },
        summary: `${formatClock(input.t)} · 虛空幼體｜${input.homeTakes ? '主隊' : '客隊'}拿下虛空幼體｜${input.decision.reasonSummary}`,
      }),
    );
    return events;
  }

  if (input.homeTakes) {
    input.progress.homeHeralds += 1;
    input.progress.heraldSmashHome = true;
    input.progress.homeTowerPressure += SIM_BALANCE.towerPressureNeed;
  } else {
    input.progress.awayHeralds += 1;
    input.progress.heraldSmashAway = true;
    input.progress.awayTowerPressure += SIM_BALANCE.towerPressureNeed;
  }
  input.progress.heraldTaken = true;
  input.progress.nextHeraldAt = null;
  const gold = SIM_BALANCE.heraldGold;
  events.push(
    createTimelineEvent({
      t: input.t,
      type: 'herald',
      teamId: winner.teamId,
      actorPlayerId: actorId,
      payload: {
        goldDeltaHome: input.homeTakes ? gold : 0,
        goldDeltaAway: input.homeTakes ? 0 : gold,
        marker: 'T',
        ...payloadExtra,
      },
      summary: `${formatClock(input.t)} · 預示者｜${input.homeTakes ? '主隊' : '客隊'}拿下預示者並準備撞塔｜${input.decision.reasonSummary}`,
    }),
  );
  return events;
}

function runObjectiveWindow(input: {
  t: number;
  phase: PlayPhaseId;
  kind: ContestableObjective;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  progress: ObjectiveProgress;
  presence: PlayerPresence[];
  state: MatchState;
  edge: number;
  random: () => number;
}): TimelineEvent[] {
  const decision = decideObjective({
    kind: input.kind,
    phase: input.phase,
    home: input.home,
    away: input.away,
    state: input.state,
    edge: input.edge,
    random: input.random,
  });

  if (decision.outcome === 'defer') {
    deferObjectiveClock(input.progress, input.kind, input.t);
    if (decision.traderIsHome !== null) {
      applyTradePressure(input.progress, decision.traderIsHome);
    }
    return [];
  }

  const homeTakes = decision.takerIsHome === true;
  const withFight = decision.outcome === 'fight';
  const events = resolveTakenObjective({
    t: input.t,
    phase: input.phase,
    kind: input.kind,
    decision,
    homeTakes,
    home: input.home,
    away: input.away,
    players: input.players,
    progress: input.progress,
    presence: input.presence,
    withFight,
    random: input.random,
  });

  if (decision.outcome === 'trade-take' && decision.traderIsHome !== null) {
    applyTradePressure(input.progress, decision.traderIsHome);
    events.push(
      ...tryDestroyTower({
        t: input.t,
        phase: input.phase,
        home: input.home,
        away: input.away,
        progress: input.progress,
        homeTakes: decision.traderIsHome,
        forced: true,
        reasonSuffix: '（物件交換）',
        random: input.random,
      }),
    );
  }

  if (
    decision.outcome === 'fight' &&
    decision.method === 'fake-start' &&
    decision.traderIsHome !== null
  ) {
    applyTradePressure(input.progress, decision.traderIsHome);
  }

  return events;
}

export function maybeTakeObjectives(input: {
  t: number;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  progress: ObjectiveProgress;
  presence: PlayerPresence[];
  state: MatchState;
  random: () => number;
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const edge = objectiveEdge(input.home, input.away, input.phase, input.state);
  const homeFavored = 1 / (1 + Math.exp(-edge / 20));

  if (input.t >= input.progress.nextDragonAt && input.progress.homeDragons + input.progress.awayDragons < 4) {
    events.push(
      ...runObjectiveWindow({
        ...input,
        kind: 'dragon',
        edge,
      }),
    );
  }

  if (input.progress.nextElderAt !== null && input.t >= input.progress.nextElderAt) {
    events.push(
      ...runObjectiveWindow({
        ...input,
        kind: 'elder',
        edge,
      }),
    );
  }

  if (input.t >= input.progress.nextBaronAt) {
    events.push(
      ...runObjectiveWindow({
        ...input,
        kind: 'baron',
        edge,
      }),
    );
  }

  if (
    input.progress.nextVoidgrubAt !== null &&
    input.t >= input.progress.nextVoidgrubAt &&
    !input.progress.voidgrubTaken
  ) {
    events.push(
      ...runObjectiveWindow({
        ...input,
        kind: 'voidgrub',
        edge,
      }),
    );
  }

  if (
    input.progress.nextHeraldAt !== null &&
    input.t >= input.progress.nextHeraldAt &&
    !input.progress.heraldTaken
  ) {
    events.push(
      ...runObjectiveWindow({
        ...input,
        kind: 'herald',
        edge,
      }),
    );
  }

  if (input.t >= SIM_BALANCE.minOuterTowerSec) {
    const leadHome = Math.max(0, homeFavored - 0.5);
    const leadAway = Math.max(0, 0.5 - homeFavored);
    const goldCrushHome = goldCrushTier(Math.max(0, input.state.goldGap));
    const goldCrushAway = goldCrushTier(Math.max(0, -input.state.goldGap));
    const towerGap = input.progress.homeTowers - input.progress.awayTowers;
    const pushHome =
      input.home.style.lanePressure * 0.55 +
      input.home.style.splitPush * 0.35 +
      leadHome * SIM_BALANCE.towerLeadPushScale +
      leadHome * leadHome * SIM_BALANCE.towerLeadPushQuadratic +
      Math.max(0, goldCrushHome - 1) * 0.42 +
      Math.max(0, towerGap - 2) * 0.05 +
      input.progress.homeBarons * SIM_BALANCE.towerBaronPushPerBaron;
    const pushAway =
      input.away.style.lanePressure * 0.55 +
      input.away.style.splitPush * 0.35 +
      leadAway * SIM_BALANCE.towerLeadPushScale +
      leadAway * leadAway * SIM_BALANCE.towerLeadPushQuadratic +
      Math.max(0, goldCrushAway - 1) * 0.42 +
      Math.max(0, -towerGap - 2) * 0.05 +
      input.progress.awayBarons * SIM_BALANCE.towerBaronPushPerBaron;
    input.progress.homeTowerPressure += SIM_BALANCE.towerPressureGain * (0.75 + pushHome);
    input.progress.awayTowerPressure += SIM_BALANCE.towerPressureGain * (0.75 + pushAway);
    gainSiegeWavePressure({
      progress: input.progress,
      home: input.home,
      away: input.away,
      homeFavored,
      goldCrushHome,
      goldCrushAway,
    });

    if (input.progress.heraldSmashHome) {
      events.push(
        ...tryDestroyTower({
          t: input.t,
          phase: input.phase,
          home: input.home,
          away: input.away,
          progress: input.progress,
          homeTakes: true,
          forced: true,
          reasonSuffix: '（預示者撞塔）',
          random: input.random,
        }),
      );
    }
    if (input.progress.heraldSmashAway) {
      events.push(
        ...tryDestroyTower({
          t: input.t,
          phase: input.phase,
          home: input.home,
          away: input.away,
          progress: input.progress,
          homeTakes: false,
          forced: true,
          reasonSuffix: '（預示者撞塔）',
          random: input.random,
        }),
      );
    }

    const leadAbs = Math.abs(homeFavored - 0.5);
    const towerChance =
      SIM_BALANCE.towerChanceBase +
      (input.phase === 'mid' ? 0.05 : 0) +
      (input.phase === 'late' ? 0.11 : 0) +
      leadAbs * 0.3 +
      Math.max(0, Math.max(goldCrushHome, goldCrushAway) - 1) * 0.07 +
      (input.progress.homeBarons + input.progress.awayBarons) * 0.02 +
      (inhibitorsDestroyedCount(input.progress.awaySiege) +
        inhibitorsDestroyedCount(input.progress.homeSiege)) *
        0.05;

    if (input.random() < towerChance) {
      const takeBias = Math.min(
        0.9,
        Math.max(
          0.1,
          0.5 +
            (homeFavored - 0.5) *
              (1.15 + Math.max(0, Math.max(goldCrushHome, goldCrushAway) - 1) * 0.35),
        ),
      );
      const homeTakes = input.random() < takeBias;
      events.push(
        ...tryDestroyTower({
          t: input.t,
          phase: input.phase,
          home: input.home,
          away: input.away,
          progress: input.progress,
          homeTakes,
          forced: false,
          random: input.random,
        }),
      );
    }

    if (goldCrushHome >= 2 && input.random() < 0.22 + goldCrushHome * 0.08) {
      events.push(
        ...tryDestroyTower({
          t: input.t,
          phase: input.phase,
          home: input.home,
          away: input.away,
          progress: input.progress,
          homeTakes: true,
          forced: false,
          reasonSuffix: '（優勢轉線拆塔）',
          random: input.random,
        }),
      );
    }
    if (goldCrushAway >= 2 && input.random() < 0.22 + goldCrushAway * 0.08) {
      events.push(
        ...tryDestroyTower({
          t: input.t,
          phase: input.phase,
          home: input.home,
          away: input.away,
          progress: input.progress,
          homeTakes: false,
          forced: false,
          reasonSuffix: '（優勢轉線拆塔）',
          random: input.random,
        }),
      );
    }

    if (input.phase === 'late' || input.phase === 'mid') {
      const homeSieging = inhibitorsDestroyedCount(input.progress.awaySiege) > 0;
      const awaySieging = inhibitorsDestroyedCount(input.progress.homeSiege) > 0;
      const siegeChanceBase = input.phase === 'late' ? 0.42 : 0.22;
      if (
        homeSieging &&
        input.random() < siegeChanceBase + Math.max(0, goldCrushHome - 1) * 0.1
      ) {
        events.push(
          ...tryDestroyTower({
            t: input.t,
            phase: input.phase,
            home: input.home,
            away: input.away,
            progress: input.progress,
            homeTakes: true,
            forced: false,
            reasonSuffix: '（超兵線推進）',
            random: input.random,
          }),
        );
      }
      if (
        awaySieging &&
        input.random() < siegeChanceBase + Math.max(0, goldCrushAway - 1) * 0.1
      ) {
        events.push(
          ...tryDestroyTower({
            t: input.t,
            phase: input.phase,
            home: input.home,
            away: input.away,
            progress: input.progress,
            homeTakes: false,
            forced: false,
            reasonSuffix: '（超兵線推進）',
            random: input.random,
          }),
        );
      }
    }
  }

  return events;
}

export function destroySiegeStructure(input: {
  t: number;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  progress: ObjectiveProgress;
  homeTakes: boolean;
  forced: boolean;
  reasonSuffix?: string;
  recentCombat?: boolean;
  random: () => number;
}): TimelineEvent[] {
  return tryDestroyTower(input);
}

export interface MatchEndProbe {
  end: TimelineEvent | null;
  hold: TimelineEvent | null;
}

export function maybeEndMatch(input: {
  t: number;
  stampT?: number;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  progress: ObjectiveProgress;
  random: () => number;
}): MatchEndProbe {
  const stamp = input.stampT ?? input.t;
  const homeGold = input.players
    .filter((player) => player.teamId === input.home.teamId)
    .reduce((sum, player) => sum + player.gold, 0);
  const awayGold = input.players
    .filter((player) => player.teamId === input.away.teamId)
    .reduce((sum, player) => sum + player.gold, 0);
  const goldGap = homeGold - awayGold;

  const homeCanClose = sideCanCloseNexus({
    t: stamp,
    progress: input.progress,
    attackingHome: true,
  });
  const awayCanClose = sideCanCloseNexus({
    t: stamp,
    progress: input.progress,
    attackingHome: false,
  });

  if (input.t >= SIM_BALANCE.minMatchSeconds) {
    const earlyWindow = input.t < 28 * 60;
    const goldNeed = earlyWindow ? 2800 : 700;
    const homeCloseChance =
      goldGap >= SIM_BALANCE.stompGoldCrush
        ? 0.92
        : goldGap >= SIM_BALANCE.stompGoldHard
          ? 0.72
          : earlyWindow
            ? 0.35 + Math.min(0.25, goldGap / 16000)
            : 0.52 + Math.min(0.3, goldGap / 12000);
    const awayCloseChance =
      -goldGap >= SIM_BALANCE.stompGoldCrush
        ? 0.92
        : -goldGap >= SIM_BALANCE.stompGoldHard
          ? 0.72
          : earlyWindow
            ? 0.35 + Math.min(0.25, -goldGap / 16000)
            : 0.52 + Math.min(0.3, -goldGap / 12000);
    if (homeCanClose && goldGap > goldNeed) {
      if (input.random() < homeCloseChance) {
        return {
          end: createTimelineEvent({
            t: stamp,
            type: 'nexus',
            teamId: input.home.teamId,
            payload: {
              defenderTeamId: input.away.teamId,
              towerTier: 'nexus',
              endMethod: 'siege',
            },
            summary: `${formatClock(stamp)} · 比賽結束｜主隊在拆除兵營與主堡雙塔後推掉主堡獲勝`,
          }),
          hold: null,
        };
      }
      return {
        end: null,
        hold: createTimelineEvent({
          t: stamp,
          type: 'base-hold',
          teamId: input.away.teamId,
          payload: { defenderTeamId: input.away.teamId, structureHold: true },
          summary: `${formatClock(stamp)} · 守家｜客隊擋下主隊的結束推進`,
        }),
      };
    }
    if (awayCanClose && -goldGap > goldNeed) {
      if (input.random() < awayCloseChance) {
        return {
          end: createTimelineEvent({
            t: stamp,
            type: 'nexus',
            teamId: input.away.teamId,
            payload: {
              defenderTeamId: input.home.teamId,
              towerTier: 'nexus',
              endMethod: 'siege',
            },
            summary: `${formatClock(stamp)} · 比賽結束｜客隊在拆除兵營與主堡雙塔後推掉主堡獲勝`,
          }),
          hold: null,
        };
      }
      return {
        end: null,
        hold: createTimelineEvent({
          t: stamp,
          type: 'base-hold',
          teamId: input.home.teamId,
          payload: { defenderTeamId: input.home.teamId, structureHold: true },
          summary: `${formatClock(stamp)} · 守家｜主隊擋下客隊的結束推進`,
        }),
      };
    }
  }

  const homeDefenderDead = 5 - countAlive(input.players, input.away.teamId, stamp);
  const awayDefenderDead = 5 - countAlive(input.players, input.home.teamId, stamp);
  const homeCanBackdoor =
    !homeCanClose &&
    sideCanBackdoor({
      t: stamp,
      progress: input.progress,
      attackingHome: true,
      defenderDead: homeDefenderDead,
    });
  const awayCanBackdoor =
    !awayCanClose &&
    sideCanBackdoor({
      t: stamp,
      progress: input.progress,
      attackingHome: false,
      defenderDead: awayDefenderDead,
    });
  if (homeCanBackdoor || awayCanBackdoor) {
    input.progress.lastBackdoorAttemptAt = stamp;
  }
  if (homeCanBackdoor) {
    if (
      input.random() <
      backdoorChance({ attacker: input.home, defenderDead: homeDefenderDead })
    ) {
      clearSiegeForBackdoor(input.progress.awaySiege);
      return {
        end: createTimelineEvent({
          t: stamp,
          type: 'nexus',
          teamId: input.home.teamId,
          payload: {
            defenderTeamId: input.away.teamId,
            towerTier: 'nexus',
            endMethod: 'backdoor',
          },
          summary: `${formatClock(stamp)} · 比賽結束｜主隊趁防守空檔偷掉主堡`,
        }),
        hold: null,
      };
    }
  }
  if (awayCanBackdoor) {
    if (
      input.random() <
      backdoorChance({ attacker: input.away, defenderDead: awayDefenderDead })
    ) {
      clearSiegeForBackdoor(input.progress.homeSiege);
      return {
        end: createTimelineEvent({
          t: stamp,
          type: 'nexus',
          teamId: input.away.teamId,
          payload: {
            defenderTeamId: input.home.teamId,
            towerTier: 'nexus',
            endMethod: 'backdoor',
          },
          summary: `${formatClock(stamp)} · 比賽結束｜客隊趁防守空檔偷掉主堡`,
        }),
        hold: null,
      };
    }
  }

  if (input.t >= SIM_BALANCE.maxMatchSeconds && (homeCanClose || awayCanClose)) {
    const winnerTeamId =
      homeCanClose && (!awayCanClose || goldGap >= 0)
        ? input.home.teamId
        : awayCanClose
          ? input.away.teamId
          : goldGap >= 0
            ? input.home.teamId
            : input.away.teamId;
    return {
      end: createTimelineEvent({
        t: stamp,
        type: 'nexus',
        teamId: winnerTeamId,
        payload: {
          defenderTeamId:
            winnerTeamId === input.home.teamId ? input.away.teamId : input.home.teamId,
          towerTier: 'nexus',
          endMethod: 'timeout',
        },
        summary: `${formatClock(stamp)} · 比賽結束｜時限後完成攻城，推掉主堡獲勝`,
      }),
      hold: null,
    };
  }

  return { end: null, hold: null };
}

export function forceSiegeBreakthrough(input: {
  t: number;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  progress: ObjectiveProgress;
  random: () => number;
}): TimelineEvent[] {
  const homeGold = input.players
    .filter((player) => player.teamId === input.home.teamId)
    .reduce((sum, player) => sum + player.gold, 0);
  const awayGold = input.players
    .filter((player) => player.teamId === input.away.teamId)
    .reduce((sum, player) => sum + player.gold, 0);
  const homeTakes = homeGold >= awayGold;
  if (homeTakes) {
    input.progress.homeTowerPressure += SIM_BALANCE.towerPressureNeed;
    input.progress.homeSiegeWavePressure += SIM_BALANCE.siegeWavePressureNeedNexus;
  } else {
    input.progress.awayTowerPressure += SIM_BALANCE.towerPressureNeed;
    input.progress.awaySiegeWavePressure += SIM_BALANCE.siegeWavePressureNeedNexus;
  }
  return tryDestroyTower({
    t: input.t,
    phase: input.phase,
    home: input.home,
    away: input.away,
    progress: input.progress,
    homeTakes,
    forced: true,
    reasonSuffix: '（時限攻城強推）',
    random: input.random,
  });
}
