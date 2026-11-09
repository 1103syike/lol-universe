import { describe, expect, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import {
  LCK_CURVE_SOURCE,
  LCK_ROLE_CURVE,
  meanNearLck,
  SIM_MEAN_TOLERANCE,
} from './lck-role-curve';
import {
  PRO_CSM,
  PRO_DPM,
  PRO_DTPM,
  PRO_ECONOMY_MAX_DURATION_SEC,
  PRO_ECONOMY_SEEDS,
  PRO_GPM,
  PRO_JUNGLE_LANE_CS_SHARE_MAX,
  PRO_LEGENDARIES_PER_GAME_MIN,
  PRO_LEGENDARY_ITEMS,
  PRO_SUPPORT_GPM_GAP,
  PRO_SUPPORT_VS_CARRY_GPM_RATIO,
} from './pro-economy-targets';

function roster(side: 'blue' | 'red') {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

describe('V2 economy acceptance (LCK curve)', () => {
  it(`passes GPM/CSM near LCK averages with extreme room (${LCK_CURVE_SOURCE})`, () => {
    const gpm: Record<string, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const csm: Record<string, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const dpm: Record<string, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const dtpm: Record<string, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const jungleLaneShare: number[] = [];
    let legendaryCount = 0;

    for (const seed of PRO_ECONOMY_SEEDS) {
      const input: SimulateV2Input = {
        versionId: 'demo-a',
        seed,
        blueTeamId: 'blue',
        redTeamId: 'red',
        blue: roster('blue'),
        red: roster('red'),
        maxDurationSec: PRO_ECONOMY_MAX_DURATION_SEC,
      };
      const { state } = simulateV2Match(input);
      const minutes = Math.max(1, state.scheduler.time / 60);

      for (const champ of state.champions) {
        gpm[champ.positionLabel].push(champ.earnedGold / minutes);
        csm[champ.positionLabel].push(champ.cs / minutes);
        dpm[champ.positionLabel].push(champ.damageToChampions / minutes);
        dtpm[champ.positionLabel].push(champ.damageTaken / minutes);
        legendaryCount += champ.items.filter((itemId) =>
          (PRO_LEGENDARY_ITEMS as readonly string[]).includes(itemId),
        ).length;
        if (champ.positionLabel === 'JUNGLE') {
          const campCs = champ.campKills * 4;
          jungleLaneShare.push(champ.cs <= 0 ? 0 : Math.max(0, champ.cs - campCs) / champ.cs);
        }
      }
    }

    const roles = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;
    const summary: Record<string, unknown> = {};
    for (const role of roles) {
      summary[role] = {
        gpm: Math.round(mean(gpm[role])),
        csm: Number(mean(csm[role]).toFixed(2)),
        dpm: Math.round(mean(dpm[role])),
        dtpm: Math.round(mean(dtpm[role])),
        lck: LCK_ROLE_CURVE[role],
      };
    }
    console.log(summary);

    const topGpm = mean(gpm.TOP);
    const midGpm = mean(gpm.MID);
    const botGpm = mean(gpm.BOT);
    const jungleGpm = mean(gpm.JUNGLE);
    const supportGpm = mean(gpm.SUPPORT);
    const carryGpm = (midGpm + botGpm) / 2;
    const legendariesPerGame = legendaryCount / PRO_ECONOMY_SEEDS.length;

    expect(topGpm).toBeGreaterThanOrEqual(PRO_GPM.TOP.min);
    expect(topGpm).toBeLessThanOrEqual(PRO_GPM.TOP.max);
    expect(midGpm).toBeGreaterThanOrEqual(PRO_GPM.MID.min);
    expect(midGpm).toBeLessThanOrEqual(PRO_GPM.MID.max);
    expect(botGpm).toBeGreaterThanOrEqual(PRO_GPM.BOT.min);
    expect(botGpm).toBeLessThanOrEqual(PRO_GPM.BOT.max);
    expect(jungleGpm).toBeGreaterThanOrEqual(PRO_GPM.JUNGLE.min);
    expect(jungleGpm).toBeLessThanOrEqual(PRO_GPM.JUNGLE.max);
    expect(supportGpm).toBeGreaterThanOrEqual(PRO_GPM.SUPPORT.min);
    expect(supportGpm).toBeLessThanOrEqual(PRO_GPM.SUPPORT.max);

    expect(supportGpm).toBeLessThan(carryGpm * PRO_SUPPORT_VS_CARRY_GPM_RATIO);
    expect(botGpm).toBeGreaterThan(supportGpm + PRO_SUPPORT_GPM_GAP);
    expect(midGpm).toBeGreaterThan(supportGpm + PRO_SUPPORT_GPM_GAP);
    expect(jungleGpm).toBeLessThanOrEqual(Math.max(midGpm, botGpm));

    for (const role of roles) {
      const roleCsm = mean(csm[role]);
      expect(roleCsm).toBeGreaterThanOrEqual(PRO_CSM[role].min);
      expect(roleCsm).toBeLessThanOrEqual(PRO_CSM[role].max);
      expect(meanNearLck(roleCsm, LCK_ROLE_CURVE[role].csm, SIM_MEAN_TOLERANCE.csm)).toBe(true);

      const roleGpm = mean(gpm[role]);
      expect(meanNearLck(roleGpm, LCK_ROLE_CURVE[role].gpm, SIM_MEAN_TOLERANCE.gpm)).toBe(true);

      const roleDpm = mean(dpm[role]);
      expect(roleDpm).toBeGreaterThanOrEqual(PRO_DPM[role].min);
      expect(roleDpm).toBeLessThanOrEqual(PRO_DPM[role].max);

      const roleDtpm = mean(dtpm[role]);
      expect(roleDtpm).toBeGreaterThanOrEqual(PRO_DTPM[role].min);
      expect(roleDtpm).toBeLessThanOrEqual(PRO_DTPM[role].max);
    }

    expect(mean(jungleLaneShare)).toBeLessThan(PRO_JUNGLE_LANE_CS_SHARE_MAX);
    expect(legendariesPerGame).toBeGreaterThanOrEqual(PRO_LEGENDARIES_PER_GAME_MIN);
  }, 90000);
});
