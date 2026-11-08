import type { PlayerPosition } from '../../core/models/player.model';
import type { TeamProfile } from './team-profile';

export type MapLocale =
  | 'top-lane'
  | 'mid-lane'
  | 'bot-lane'
  | 'blue-jungle'
  | 'red-jungle'
  | 'river'
  | 'baron-pit'
  | 'dragon-pit'
  | 'base'
  | 'highland';

export type MapTask =
  | 'laning'
  | 'farming-jungle'
  | 'invade'
  | 'gank'
  | 'roam'
  | 'wave-clear'
  | 'side-push'
  | 'vision'
  | 'objective'
  | 'siege'
  | 'recall';

export type MapModeId = 'laning' | 'transition' | 'objective' | 'siege';

export interface PlayerPresence {
  playerId: string;
  teamId: string;
  position: PlayerPosition;
  locale: MapLocale;
  task: MapTask;
}

export interface MapModeFlags {
  laning: boolean;
  transition: boolean;
  objective: boolean;
  siege: boolean;
}

export type TowerLaneId = 'top' | 'mid' | 'bot';

export interface LaneTowerRow {
  outer: boolean;
  inner: boolean;
  base: boolean;
}

export type SideTowerGrid = Record<TowerLaneId, LaneTowerRow>;

export interface SideSiegeStructures {
  inhibitorsStanding: Record<TowerLaneId, boolean>;
  nexusTowerA: boolean;
  nexusTowerB: boolean;
}

export function createFullTowerGrid(): SideTowerGrid {
  return {
    top: { outer: true, inner: true, base: true },
    mid: { outer: true, inner: true, base: true },
    bot: { outer: true, inner: true, base: true },
  };
}

export function createFullSiegeStructures(): SideSiegeStructures {
  return {
    inhibitorsStanding: { top: true, mid: true, bot: true },
    nexusTowerA: true,
    nexusTowerB: true,
  };
}

export function countStandingTowers(grid: SideTowerGrid): number {
  let total = 0;
  for (const lane of Object.values(grid)) {
    if (lane.outer) total += 1;
    if (lane.inner) total += 1;
    if (lane.base) total += 1;
  }
  return total;
}

export function anyOuterDown(grid: SideTowerGrid): boolean {
  return !grid.top.outer || !grid.mid.outer || !grid.bot.outer;
}

export function inhibitorsDestroyedCount(siege: SideSiegeStructures): number {
  let total = 0;
  if (!siege.inhibitorsStanding.top) total += 1;
  if (!siege.inhibitorsStanding.mid) total += 1;
  if (!siege.inhibitorsStanding.bot) total += 1;
  return total;
}

export function nexusTowersStanding(siege: SideSiegeStructures): number {
  return (siege.nexusTowerA ? 1 : 0) + (siege.nexusTowerB ? 1 : 0);
}

export function canOpenNexus(siege: SideSiegeStructures): boolean {
  return inhibitorsDestroyedCount(siege) >= 1 && nexusTowersStanding(siege) === 0;
}

export function lanesWithHighlandDown(defense: SideTowerGrid): TowerLaneId[] {
  return (['top', 'mid', 'bot'] as TowerLaneId[]).filter((lane) => !defense[lane].base);
}

function localeForPosition(position: PlayerPosition, isHome: boolean): MapLocale {
  if (position === 'TOP') return 'top-lane';
  if (position === 'MID') return 'mid-lane';
  if (position === 'BOT' || position === 'SUPPORT') return 'bot-lane';
  return isHome ? 'blue-jungle' : 'red-jungle';
}

function taskForPosition(position: PlayerPosition): MapTask {
  if (position === 'JUNGLE') return 'farming-jungle';
  if (position === 'SUPPORT') return 'laning';
  return 'laning';
}

export function createLaningPresence(home: TeamProfile, away: TeamProfile): PlayerPresence[] {
  return [
    ...home.players.map((view) => ({
      playerId: view.player.id,
      teamId: home.teamId,
      position: view.player.position,
      locale: localeForPosition(view.player.position, true),
      task: taskForPosition(view.player.position),
    })),
    ...away.players.map((view) => ({
      playerId: view.player.id,
      teamId: away.teamId,
      position: view.player.position,
      locale: localeForPosition(view.player.position, false),
      task: taskForPosition(view.player.position),
    })),
  ];
}

export function deriveMapModes(input: {
  t: number;
  canRotate: boolean;
  nextDragonAt: number;
  nextBaronAt: number;
  nextVoidgrubAt: number | null;
  nextHeraldAt: number | null;
  nextElderAt: number | null;
  homeOuterDown: boolean;
  awayOuterDown: boolean;
  homeTowersTaken: number;
  awayTowersTaken: number;
}): MapModeFlags {
  const nearObjectiveWindow = 90;
  const objectiveSoon =
    (input.nextVoidgrubAt !== null && Math.abs(input.t - input.nextVoidgrubAt) <= nearObjectiveWindow) ||
    (input.nextHeraldAt !== null && Math.abs(input.t - input.nextHeraldAt) <= nearObjectiveWindow) ||
    Math.abs(input.t - input.nextDragonAt) <= nearObjectiveWindow ||
    (input.t >= input.nextBaronAt - nearObjectiveWindow && input.t + 120 >= input.nextBaronAt) ||
    (input.nextElderAt !== null && Math.abs(input.t - input.nextElderAt) <= nearObjectiveWindow);

  const towersTaken = input.homeTowersTaken + input.awayTowersTaken;
  return {
    laning: !input.homeOuterDown && !input.awayOuterDown ? true : input.t < 18 * 60,
    transition: input.canRotate,
    objective: objectiveSoon || input.t >= 5 * 60,
    siege: towersTaken >= 6 || input.t >= 28 * 60,
  };
}

export type FightLocaleGroup = 'top' | 'mid' | 'bot' | 'river' | 'jungle' | 'base';

export function localeGroup(locale: MapLocale): FightLocaleGroup {
  if (locale === 'top-lane') return 'top';
  if (locale === 'mid-lane') return 'mid';
  if (locale === 'bot-lane') return 'bot';
  if (locale === 'baron-pit' || locale === 'dragon-pit' || locale === 'river') return 'river';
  if (locale === 'blue-jungle' || locale === 'red-jungle') return 'jungle';
  return 'base';
}

export function localesCompatible(left: MapLocale, right: MapLocale): boolean {
  const a = localeGroup(left);
  const b = localeGroup(right);
  if (a === b) {
    return true;
  }
  if (
    (a === 'jungle' && b === 'river') ||
    (b === 'jungle' && a === 'river')
  ) {
    return true;
  }
  if (
    (a === 'river' && (b === 'mid' || b === 'bot' || b === 'top')) ||
    (b === 'river' && (a === 'mid' || a === 'bot' || a === 'top'))
  ) {
    return true;
  }
  return false;
}

export function presenceOf(
  presence: PlayerPresence[],
  playerId: string,
): PlayerPresence | undefined {
  return presence.find((item) => item.playerId === playerId);
}

function setPresence(
  list: PlayerPresence[],
  playerId: string,
  locale: MapLocale,
  task: MapTask,
): void {
  const row = list.find((item) => item.playerId === playerId);
  if (!row) {
    return;
  }
  row.locale = locale;
  row.task = task;
}

function teamRows(presence: PlayerPresence[], teamId: string): PlayerPresence[] {
  return presence.filter((item) => item.teamId === teamId);
}

function findByPosition(
  rows: PlayerPresence[],
  position: PlayerPosition,
): PlayerPresence | undefined {
  return rows.find((item) => item.position === position);
}

export type RotationPatternId = 'bot-to-mid' | 'top-split' | 'mid-group' | 'dragon-setup' | 'baron-setup';

export interface RotationDecision {
  teamId: string;
  pattern: RotationPatternId;
  summary: string;
}

function outerDownLanes(defense: SideTowerGrid): TowerLaneId[] {
  const lanes: TowerLaneId[] = [];
  if (!defense.top.outer) lanes.push('top');
  if (!defense.mid.outer) lanes.push('mid');
  if (!defense.bot.outer) lanes.push('bot');
  return lanes;
}

function applyPattern(
  presence: PlayerPresence[],
  teamId: string,
  pattern: RotationPatternId,
  isHome: boolean,
): void {
  const rows = teamRows(presence, teamId);
  const top = findByPosition(rows, 'TOP');
  const mid = findByPosition(rows, 'MID');
  const bot = findByPosition(rows, 'BOT');
  const support = findByPosition(rows, 'SUPPORT');
  const jungle = findByPosition(rows, 'JUNGLE');

  if (pattern === 'bot-to-mid') {
    if (bot) setPresence(presence, bot.playerId, 'mid-lane', 'wave-clear');
    if (support) setPresence(presence, support.playerId, 'mid-lane', 'vision');
    if (mid) setPresence(presence, mid.playerId, 'mid-lane', 'roam');
    if (top) setPresence(presence, top.playerId, 'top-lane', 'side-push');
    if (jungle) setPresence(presence, jungle.playerId, 'river', 'vision');
    return;
  }
  if (pattern === 'top-split') {
    if (top) setPresence(presence, top.playerId, 'top-lane', 'side-push');
    if (bot) setPresence(presence, bot.playerId, 'bot-lane', 'wave-clear');
    if (support) setPresence(presence, support.playerId, 'river', 'vision');
    if (mid) setPresence(presence, mid.playerId, 'mid-lane', 'wave-clear');
    if (jungle) {
      setPresence(
        presence,
        jungle.playerId,
        isHome ? 'blue-jungle' : 'red-jungle',
        'farming-jungle',
      );
    }
    return;
  }
  if (pattern === 'mid-group') {
    if (mid) setPresence(presence, mid.playerId, 'mid-lane', 'wave-clear');
    if (bot) setPresence(presence, bot.playerId, 'mid-lane', 'wave-clear');
    if (support) setPresence(presence, support.playerId, 'river', 'vision');
    if (jungle) setPresence(presence, jungle.playerId, 'river', 'objective');
    if (top) setPresence(presence, top.playerId, 'top-lane', 'side-push');
    return;
  }
  if (pattern === 'dragon-setup') {
    if (bot) setPresence(presence, bot.playerId, 'dragon-pit', 'objective');
    if (support) setPresence(presence, support.playerId, 'dragon-pit', 'vision');
    if (jungle) setPresence(presence, jungle.playerId, 'dragon-pit', 'objective');
    if (mid) setPresence(presence, mid.playerId, 'river', 'roam');
    if (top) setPresence(presence, top.playerId, 'top-lane', 'side-push');
    return;
  }
  if (bot) setPresence(presence, bot.playerId, 'mid-lane', 'wave-clear');
  if (support) setPresence(presence, support.playerId, 'baron-pit', 'vision');
  if (jungle) setPresence(presence, jungle.playerId, 'baron-pit', 'objective');
  if (mid) setPresence(presence, mid.playerId, 'baron-pit', 'objective');
  if (top) setPresence(presence, top.playerId, 'top-lane', 'side-push');
}

export function maybeApplyRotations(input: {
  presence: PlayerPresence[];
  home: TeamProfile;
  away: TeamProfile;
  canRotateHome: boolean;
  canRotateAway: boolean;
  homeDefense: SideTowerGrid;
  awayDefense: SideTowerGrid;
  modes: MapModeFlags;
  t: number;
  nextDragonAt: number;
  nextBaronAt: number;
  random: () => number;
}): RotationDecision[] {
  const decisions: RotationDecision[] = [];
  const sides: Array<{
    profile: TeamProfile;
    canRotate: boolean;
    ownDefense: SideTowerGrid;
    enemyDefense: SideTowerGrid;
  }> = [
    {
      profile: input.home,
      canRotate: input.canRotateHome,
      ownDefense: input.homeDefense,
      enemyDefense: input.awayDefense,
    },
    {
      profile: input.away,
      canRotate: input.canRotateAway,
      ownDefense: input.awayDefense,
      enemyDefense: input.homeDefense,
    },
  ];

  for (const side of sides) {
    if (!side.canRotate) {
      continue;
    }
    const alreadyRotated = teamRows(input.presence, side.profile.teamId).some(
      (row) =>
        (row.position === 'BOT' || row.position === 'SUPPORT') &&
        row.locale !== 'bot-lane' &&
        row.task !== 'laning',
    );
    if (alreadyRotated && input.random() > 0.06) {
      continue;
    }

    let pattern: RotationPatternId | null = null;
    let summary = '';
    const smashedEnemy = outerDownLanes(side.enemyDefense);
    const lostOwn = outerDownLanes(side.ownDefense);
    const nearDragon = Math.abs(input.t - input.nextDragonAt) <= 75;
    const nearBaron = input.t >= input.nextBaronAt - 90;

    if (input.modes.objective && nearBaron && input.random() < 0.55) {
      pattern = 'baron-setup';
      summary = '將中野輔往巴龍坑佈置，邊線持續牽制';
    } else if (input.modes.objective && nearDragon && input.random() < 0.5) {
      pattern = 'dragon-setup';
      summary = '下半部集合佈置小龍視野，上路維持牽制';
    } else if (smashedEnemy.includes('bot') || lostOwn.includes('bot')) {
      if (side.profile.style.splitPush > 0.62 && input.random() < 0.35) {
        pattern = 'top-split';
        summary = '下路外塔異動後改走分推，上路持續施壓';
      } else {
        pattern = 'bot-to-mid';
        summary = '下路外塔異動後，ADC 與輔助轉往中路收線';
      }
    } else if (smashedEnemy.includes('mid') || lostOwn.includes('mid')) {
      pattern = 'mid-group';
      summary = '中路外塔異動後，隊伍重心改往中路與河道';
    } else if (smashedEnemy.includes('top') || lostOwn.includes('top')) {
      pattern = side.profile.style.splitPush > 0.55 ? 'top-split' : 'mid-group';
      summary =
        pattern === 'top-split'
          ? '上路外塔異動後維持邊線分推換資源'
          : '上路外塔異動後主力改集中中下半圖';
    } else if (input.random() < 0.12) {
      pattern = 'mid-group';
      summary = '把握轉線窗口，中路集合尋找視野與節奏';
    }

    if (!pattern) {
      continue;
    }

    applyPattern(
      input.presence,
      side.profile.teamId,
      pattern,
      side.profile.teamId === input.home.teamId,
    );
    decisions.push({
      teamId: side.profile.teamId,
      pattern,
      summary,
    });
  }

  return decisions;
}

export function gatherForObjective(
  presence: PlayerPresence[],
  teamId: string,
  kind: 'dragon' | 'baron' | 'elder' | 'voidgrub' | 'herald',
  isHome: boolean,
): void {
  const pit: MapLocale =
    kind === 'baron' || kind === 'herald' ? 'baron-pit' : kind === 'elder' || kind === 'dragon' || kind === 'voidgrub'
      ? 'dragon-pit'
      : 'river';
  for (const row of teamRows(presence, teamId)) {
    if (row.position === 'TOP' && (kind === 'dragon' || kind === 'voidgrub')) {
      setPresence(presence, row.playerId, 'top-lane', 'side-push');
      continue;
    }
    if (row.position === 'JUNGLE' || row.position === 'SUPPORT' || row.position === 'MID') {
      setPresence(presence, row.playerId, pit, 'objective');
      continue;
    }
    if (row.position === 'BOT') {
      setPresence(presence, row.playerId, pit === 'dragon-pit' ? 'dragon-pit' : 'mid-lane', 'objective');
      continue;
    }
    setPresence(
      presence,
      row.playerId,
      isHome ? 'blue-jungle' : 'red-jungle',
      'objective',
    );
  }
}
