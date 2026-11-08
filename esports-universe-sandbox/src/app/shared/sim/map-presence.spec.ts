import { describe, expect, it } from 'vitest';
import {
  createLaningPresence,
  deriveMapModes,
  createFullTowerGrid,
  anyOuterDown,
  maybeApplyRotations,
  localesCompatible,
} from './map-presence';
import { createObjectiveProgress } from './objectives';
import { plateGoldAt } from './plates';
import { SIM_BALANCE } from './balance';
import type { TeamProfile } from './team-profile';
import type { SimPlayerView } from './team-profile';
import type { Player } from '../../core/models/player.model';

function fakeView(id: string, position: Player['position']): SimPlayerView {
  return {
    player: {
      id,
      gamertag: id,
      position,
      teamId: 't',
    } as Player,
    effective: {
      laning: 80,
      mechanics: 80,
      teamfighting: 80,
      consistency: 80,
      gameSense: 80,
      adaptability: 80,
    },
    formFactor: 1,
    archetype: 'balanced',
  };
}

describe('map presence phase A', () => {
  it('初始對線配置：上中下對線、打野在野區', () => {
    const home = {
      teamId: 'home',
      players: [
        fakeView('h1', 'TOP'),
        fakeView('h2', 'JUNGLE'),
        fakeView('h3', 'MID'),
        fakeView('h4', 'BOT'),
        fakeView('h5', 'SUPPORT'),
      ],
    } as TeamProfile;
    const away = {
      teamId: 'away',
      players: [
        fakeView('a1', 'TOP'),
        fakeView('a2', 'JUNGLE'),
        fakeView('a3', 'MID'),
        fakeView('a4', 'BOT'),
        fakeView('a5', 'SUPPORT'),
      ],
    } as TeamProfile;
    const presence = createLaningPresence(home, away);
    expect(presence).toHaveLength(10);
    expect(presence.find((item) => item.playerId === 'h1')?.locale).toBe('top-lane');
    expect(presence.find((item) => item.playerId === 'h2')?.locale).toBe('blue-jungle');
    expect(presence.find((item) => item.playerId === 'a2')?.locale).toBe('red-jungle');
    expect(presence.find((item) => item.playerId === 'h4')?.task).toBe('laning');
  });

  it('外塔掉落後 modes.transition 為 true', () => {
    const modes = deriveMapModes({
      t: 12 * 60,
      canRotate: true,
      nextDragonAt: 15 * 60,
      nextBaronAt: 20 * 60,
      nextVoidgrubAt: null,
      nextHeraldAt: 15 * 60,
      nextElderAt: null,
      homeOuterDown: true,
      awayOuterDown: false,
      homeTowersTaken: 1,
      awayTowersTaken: 0,
    });
    expect(modes.transition).toBe(true);
  });

  it('progress 初始含幼體／預示者時鐘與完整塔列', () => {
    const progress = createObjectiveProgress();
    expect(progress.nextVoidgrubAt).toBe(SIM_BALANCE.voidgrubSpawnSec);
    expect(progress.nextHeraldAt).toBe(SIM_BALANCE.heraldSpawnSec);
    expect(progress.nextBaronAt).toBe(SIM_BALANCE.baronSpawnSec);
    expect(progress.canRotateHome).toBe(false);
    expect(anyOuterDown(progress.homeDefense)).toBe(false);
    expect(createFullTowerGrid().mid.outer).toBe(true);
  });

  it('鍍層隨時間衰減而非 14 分歸零', () => {
    const early = plateGoldAt(8 * 60);
    const late = plateGoldAt(20 * 60);
    expect(early).toBeGreaterThan(late);
    expect(late).toBeGreaterThanOrEqual(SIM_BALANCE.plateGoldFloor);
    expect(plateGoldAt(30 * 60)).toBeGreaterThan(0);
  });

  it('外塔掉後可轉線：下路組合可改到中路', () => {
    const home = {
      teamId: 'home',
      players: [
        fakeView('h1', 'TOP'),
        fakeView('h2', 'JUNGLE'),
        fakeView('h3', 'MID'),
        fakeView('h4', 'BOT'),
        fakeView('h5', 'SUPPORT'),
      ],
      style: {
        earlyAggression: 0.5,
        lanePressure: 0.5,
        jungleMidSync: 0.5,
        resourceControl: 0.5,
        teamfightExecute: 0.5,
        lateScaling: 0.5,
        splitPush: 0.3,
        balanced: 0.5,
      },
    } as TeamProfile;
    const away = {
      teamId: 'away',
      players: [
        fakeView('a1', 'TOP'),
        fakeView('a2', 'JUNGLE'),
        fakeView('a3', 'MID'),
        fakeView('a4', 'BOT'),
        fakeView('a5', 'SUPPORT'),
      ],
      style: { ...home.style },
    } as TeamProfile;
    const presence = createLaningPresence(home, away);
    const awayDefense = createFullTowerGrid();
    awayDefense.bot.outer = false;
    const decisions = maybeApplyRotations({
      presence,
      home,
      away,
      canRotateHome: true,
      canRotateAway: false,
      homeDefense: createFullTowerGrid(),
      awayDefense,
      modes: {
        laning: true,
        transition: true,
        objective: true,
        siege: false,
      },
      t: 16 * 60,
      nextDragonAt: 20 * 60,
      nextBaronAt: 25 * 60,
      random: () => 0.1,
    });
    expect(decisions.length).toBeGreaterThan(0);
    expect(presence.find((row) => row.playerId === 'h4')?.locale).toBe('mid-lane');
    expect(presence.find((row) => row.playerId === 'h5')?.locale).toBe('mid-lane');
  });

  it('locale 相容：打野經河道介入，不無條件跨線', () => {
    expect(localesCompatible('blue-jungle', 'river')).toBe(true);
    expect(localesCompatible('blue-jungle', 'baron-pit')).toBe(true);
    expect(localesCompatible('blue-jungle', 'mid-lane')).toBe(false);
    expect(localesCompatible('top-lane', 'bot-lane')).toBe(false);
    expect(localesCompatible('river', 'mid-lane')).toBe(true);
  });
});
