import { describe, expect, it } from 'vitest';
import {
  canOpenNexus,
  createFullSiegeStructures,
  createFullTowerGrid,
  inhibitorsDestroyedCount,
  nexusTowersStanding,
} from './map-presence';
import {
  createObjectiveProgress,
  destroySiegeStructure,
  forceSiegeBreakthrough,
  maybeEndMatch,
} from './objectives';
import type { TeamProfile } from './team-profile';
import type { Player } from '../../core/models/player.model';
import type { SimPlayerView } from './team-profile';
import type { PlayerRuntimeStats } from './match-stats';
import { SIM_BALANCE } from './balance';

function fakeView(id: string, teamId: string, position: Player['position']): SimPlayerView {
  return {
    player: { id, gamertag: id, position, teamId } as Player,
    effective: {
      laning: 80,
      mechanics: 80,
      teamfighting: 80,
      consistency: 80,
      gameSense: 80,
      adaptability: 80,
    },
    archetype: 'balanced',
  };
}

function profile(teamId: string, stylePatch: Partial<TeamProfile['style']> = {}): TeamProfile {
  return {
    teamId,
    players: [
      fakeView(`${teamId}-1`, teamId, 'TOP'),
      fakeView(`${teamId}-2`, teamId, 'JUNGLE'),
      fakeView(`${teamId}-3`, teamId, 'MID'),
      fakeView(`${teamId}-4`, teamId, 'BOT'),
      fakeView(`${teamId}-5`, teamId, 'SUPPORT'),
    ],
    byPosition: {},
    style: {
      earlyAggression: 0.5,
      lanePressure: 0.6,
      jungleMidSync: 0.5,
      resourceControl: 0.5,
      teamfightExecute: 0.5,
      lateScaling: 0.5,
      splitPush: 0.5,
      balanced: 0.5,
      ...stylePatch,
    },
    styleLabels: { primary: [], secondary: [] },
    chemistry: 1,
    coach: null,
  };
}

function richPlayers(homeId: string, awayId: string): PlayerRuntimeStats[] {
  return [
    ...[1, 2, 3, 4, 5].map((index) => ({
      playerId: `h${index}`,
      teamId: homeId,
      gamertag: `h${index}`,
      position: 'TOP' as const,
      kills: 2,
      deaths: 0,
      assists: 1,
      gold: 12000,
      cs: 200,
      visionScore: 20,
      damageToChamps: 10000,
      deadUntilSec: 0,
      items: [],
    })),
    ...[1, 2, 3, 4, 5].map((index) => ({
      playerId: `a${index}`,
      teamId: awayId,
      gamertag: `a${index}`,
      position: 'TOP' as const,
      kills: 0,
      deaths: 2,
      assists: 0,
      gold: 7000,
      cs: 160,
      visionScore: 12,
      damageToChamps: 6000,
      deadUntilSec: 0,
      items: [],
    })),
  ];
}

describe('siege P0/P1/P2', () => {
  it('主堡開啟需要至少一座兵營且兩座主堡塔皆倒', () => {
    const siege = createFullSiegeStructures();
    expect(canOpenNexus(siege)).toBe(false);
    siege.inhibitorsStanding.mid = false;
    expect(inhibitorsDestroyedCount(siege)).toBe(1);
    expect(canOpenNexus(siege)).toBe(false);
    siege.nexusTowerA = false;
    expect(canOpenNexus(siege)).toBe(false);
    siege.nexusTowerB = false;
    expect(nexusTowersStanding(siege)).toBe(0);
    expect(canOpenNexus(siege)).toBe(true);
  });

  it('未完成攻城鏈時 maybeEndMatch 不產生 nexus', () => {
    const home = profile('home');
    const away = profile('away');
    const progress = createObjectiveProgress();
    progress.homeTowers = 8;
    progress.homeBarons = 1;
    progress.homeSiegeWavePressure = 5;
    const event = maybeEndMatch({
      t: 30 * 60,
      home,
      away,
      players: richPlayers('home', 'away'),
      progress,
      random: () => 0.01,
    });
    expect(event.end).toBeNull();
  });

  it('兵營已破但主堡塔仍在時可偷家結束', () => {
    const home = profile('home', { splitPush: 0.9 });
    const away = profile('away');
    const progress = createObjectiveProgress();
    progress.awayDefense.mid.outer = false;
    progress.awayDefense.mid.inner = false;
    progress.awayDefense.mid.base = false;
    progress.awaySiege.inhibitorsStanding.mid = false;
    progress.awaySiege.nexusTowerA = true;
    progress.awaySiege.nexusTowerB = true;
    progress.homeInhibitors = 1;
    progress.homeSiegeWavePressure = 1.3;
    progress.lastTeamfightAt = 30 * 60 - 10;
    const players = richPlayers('home', 'away').map((player) =>
      player.teamId === 'away' ? { ...player, deadUntilSec: 40 * 60 } : player,
    );
    const event = maybeEndMatch({
      t: 30 * 60,
      home,
      away,
      players,
      progress,
      random: () => 0.01,
    });
    expect(event.end?.type).toBe('nexus');
    expect(event.end?.payload?.endMethod).toBe('backdoor');
    expect(progress.awaySiege.nexusTowerA).toBe(false);
    expect(progress.awaySiege.nexusTowerB).toBe(false);
  });

  it('防守未大崩或超時強制結束時不會偷家', () => {
    const home = profile('home', { splitPush: 0.9 });
    const away = profile('away');
    const progress = createObjectiveProgress();
    progress.awaySiege.inhibitorsStanding.mid = false;
    progress.awaySiege.nexusTowerA = true;
    progress.awaySiege.nexusTowerB = true;
    progress.homeInhibitors = 1;
    progress.homeSiegeWavePressure = 2;
    progress.lastTeamfightAt = 40 * 60;
    const aliveDefenders = richPlayers('home', 'away');
    const noWipe = maybeEndMatch({
      t: 30 * 60,
      home,
      away,
      players: aliveDefenders,
      progress,
      random: () => 0.01,
    });
    expect(noWipe.end).toBeNull();

    const wiped = richPlayers('home', 'away').map((player) =>
      player.teamId === 'away' ? { ...player, deadUntilSec: 50 * 60 } : player,
    );
    const forced = maybeEndMatch({
      t: SIM_BALANCE.maxMatchSeconds,
      home,
      away,
      players: wiped,
      progress: { ...progress, lastTeamfightAt: SIM_BALANCE.maxMatchSeconds - 5 },
      random: () => 0,
    });
    expect(forced.end?.payload?.endMethod).not.toBe('backdoor');
  });

  it('兵營＋主堡雙塔＋兵線壓力足夠時允許 nexus', () => {
    const home = profile('home');
    const away = profile('away');
    const progress = createObjectiveProgress();
    progress.awayDefense = createFullTowerGrid();
    progress.awayDefense.mid.outer = false;
    progress.awayDefense.mid.inner = false;
    progress.awayDefense.mid.base = false;
    progress.awaySiege.inhibitorsStanding.mid = false;
    progress.awaySiege.nexusTowerA = false;
    progress.awaySiege.nexusTowerB = false;
    progress.homeInhibitors = 1;
    progress.homeTowers = 11;
    progress.homeSiegeWavePressure = 2;
    progress.homeNextNexusCloseEligibleAt = 30 * 60;
    const event = maybeEndMatch({
      t: 30 * 60,
      home,
      away,
      players: richPlayers('home', 'away'),
      progress,
      random: () => 0.01,
    });
    expect(event.end?.type).toBe('nexus');
    expect(event.end?.teamId).toBe('home');
    expect(event.end?.payload?.defenderTeamId).toBe('away');
    expect(event.end?.payload?.endMethod).toBe('siege');
  });

  it('P0：同 stamp 同方最多摧毀一座建築', () => {
    const home = profile('home');
    const away = profile('away');
    const progress = createObjectiveProgress();
    for (const lane of ['top', 'mid', 'bot'] as const) {
      progress.awayDefense[lane].outer = false;
      progress.awayDefense[lane].inner = false;
      progress.awayDefense[lane].base = false;
    }
    progress.homeTowerPressure = 5;
    progress.awayTowerPressure = 5;
    const stamp = 30 * 60;
    const first = destroySiegeStructure({
      t: stamp,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: true,
      random: () => 0,
    });
    const second = destroySiegeStructure({
      t: stamp,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: true,
      random: () => 0,
    });
    const awayDestroy = destroySiegeStructure({
      t: stamp,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: false,
      forced: true,
      random: () => 0,
    });
    expect(first.length).toBe(1);
    expect(second.length).toBe(0);
    expect(awayDestroy.length).toBe(1);
  });

  it('P1：首兵營後冷卻內不再拆第二兵營，間隔後優先打主堡塔', () => {
    const home = profile('home');
    const away = profile('away');
    const progress = createObjectiveProgress();
    for (const lane of ['top', 'mid', 'bot'] as const) {
      progress.awayDefense[lane].outer = false;
      progress.awayDefense[lane].inner = false;
      progress.awayDefense[lane].base = false;
    }
    progress.homeTowerPressure = 5;
    progress.homeSiegeWavePressure = 5;
    const firstAt = 32 * 60;
    const first = destroySiegeStructure({
      t: firstAt,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: false,
      random: () => 0,
    });
    expect(first[0]?.type).toBe('inhibitor');
    expect(progress.homeTowerPressure).toBe(0);
    expect(progress.homeNextInhibEligibleAt).toBe(
      firstAt + SIM_BALANCE.inhibitorSiegeCooldownSec,
    );
    expect(progress.homeNextNexusTowerEligibleAt).toBe(
      firstAt + SIM_BALANCE.nexusTowerSiegeGapSec,
    );

    progress.homeTowerPressure = 5;
    progress.homeSiegeWavePressure = 5;
    const duringGap = destroySiegeStructure({
      t: firstAt + 10,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: false,
      random: () => 0,
    });
    expect(duringGap.length).toBe(0);

    progress.homeTowerPressure = 5;
    progress.homeSiegeWavePressure = 5;
    const nexusTower = destroySiegeStructure({
      t: firstAt + SIM_BALANCE.nexusTowerSiegeGapSec,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: false,
      random: () => 0,
    });
    expect(nexusTower[0]?.type).toBe('tower');
    expect(nexusTower[0]?.payload?.towerTier).toBe('nexus');
    const inhibCount =
      Number(!progress.awaySiege.inhibitorsStanding.top) +
      Number(!progress.awaySiege.inhibitorsStanding.mid) +
      Number(!progress.awaySiege.inhibitorsStanding.bot);
    expect(inhibCount).toBe(1);
  });

  it('P2：末兵營後需間隔才能拆主堡塔，雙塔後需間隔才能結束', () => {
    const home = profile('home');
    const away = profile('away');
    const progress = createObjectiveProgress();
    for (const lane of ['top', 'mid', 'bot'] as const) {
      progress.awayDefense[lane].outer = false;
      progress.awayDefense[lane].inner = false;
      progress.awayDefense[lane].base = false;
      progress.awaySiege.inhibitorsStanding[lane] = false;
    }
    progress.homeInhibitors = 3;
    progress.homeTowerPressure = 5;
    progress.homeSiegeWavePressure = 5;
    progress.homeNextNexusTowerEligibleAt = 40 * 60 + SIM_BALANCE.nexusTowerSiegeGapSec;

    const tooSoon = destroySiegeStructure({
      t: 40 * 60 + 10,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: true,
      random: () => 0,
    });
    expect(tooSoon.length).toBe(0);

    const firstTower = destroySiegeStructure({
      t: progress.homeNextNexusTowerEligibleAt,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: true,
      random: () => 0,
    });
    expect(firstTower[0]?.payload?.towerTier).toBe('nexus');

    const secondAt = progress.homeNextNexusTowerEligibleAt;
    const secondTower = destroySiegeStructure({
      t: secondAt,
      phase: 'late',
      home,
      away,
      progress,
      homeTakes: true,
      forced: true,
      random: () => 0,
    });
    expect(secondTower[0]?.payload?.towerTier).toBe('nexus');
    expect(progress.homeNextNexusCloseEligibleAt).toBe(
      secondAt + SIM_BALANCE.nexusCloseGapSec,
    );

    const earlyEnd = maybeEndMatch({
      t: secondAt + 5,
      home,
      away,
      players: richPlayers('home', 'away'),
      progress,
      random: () => 0.01,
    });
    expect(earlyEnd.end).toBeNull();

    const lateEnd = maybeEndMatch({
      t: progress.homeNextNexusCloseEligibleAt,
      home,
      away,
      players: richPlayers('home', 'away'),
      progress,
      random: () => 0.01,
    });
    expect(lateEnd.end?.type).toBe('nexus');
  });

  it('P2：forceSiegeBreakthrough 每次最多摧毀一座', () => {
    const home = profile('home');
    const away = profile('away');
    const progress = createObjectiveProgress();
    for (const lane of ['top', 'mid', 'bot'] as const) {
      progress.awayDefense[lane].outer = false;
      progress.awayDefense[lane].inner = false;
      progress.awayDefense[lane].base = false;
    }
    const events = forceSiegeBreakthrough({
      t: 46 * 60,
      phase: 'late',
      home,
      away,
      players: richPlayers('home', 'away'),
      progress,
      random: () => 0,
    });
    expect(events.length).toBe(1);
  });
});
