import { describe, expect, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import { runV2DiagMatch } from './pro-feel-audit';

function roster(side: 'blue' | 'red') {
  const prefix = side;
  return [
    {
      playerId: `${prefix}_top`,
      gamertag: `${prefix}_top`,
      position: 'TOP' as const,
      championId: 'Garen',
      laning: 72,
      mechanics: 65,
      teamfighting: 60,
      gameSense: 68,
      consistency: 70,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_jg`,
      gamertag: `${prefix}_jg`,
      position: 'JUNGLE' as const,
      championId: 'LeeSin',
      laning: 55,
      mechanics: 80,
      teamfighting: 70,
      gameSense: 75,
      consistency: 60,
      adaptability: 70,
    },
    {
      playerId: `${prefix}_mid`,
      gamertag: `${prefix}_mid`,
      position: 'MID' as const,
      championId: 'Annie',
      laning: 72,
      mechanics: 70,
      teamfighting: 75,
      gameSense: 70,
      consistency: 65,
      adaptability: 65,
    },
    {
      playerId: `${prefix}_bot`,
      gamertag: `${prefix}_bot`,
      position: 'BOT' as const,
      championId: 'Ashe',
      laning: 68,
      mechanics: 72,
      teamfighting: 70,
      gameSense: 66,
      consistency: 68,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_sup`,
      gamertag: `${prefix}_sup`,
      position: 'SUPPORT' as const,
      championId: 'Thresh',
      laning: 60,
      mechanics: 70,
      teamfighting: 72,
      gameSense: 78,
      consistency: 70,
      adaptability: 65,
    },
  ];
}

function input(seed: number): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1200,
  };
}

describe('V2 P0 growth and recall loop', () => {
  it('earns CS, camp kills, levels, and item buys from real events', () => {
    const result = simulateV2Match(input(42));
    const laners = result.state.champions.filter((champ) =>
      ['TOP', 'MID', 'BOT'].includes(champ.positionLabel),
    );
    const junglers = result.state.champions.filter((champ) => champ.positionLabel === 'JUNGLE');
    const totalCs = result.state.champions.reduce((sum, champ) => sum + champ.cs, 0);
    const totalCamps = result.state.champions.reduce((sum, champ) => sum + champ.campKills, 0);
    const avgLevel = mean(result.state.champions.map((champ) => champ.level));
    const itemBuys = result.replay.events.filter((event) => event.type === 'item_buy').length;
    const csGold = result.state.champions.reduce(
      (sum, champ) => sum + (champ.goldBySource['cs'] ?? 0),
      0,
    );
    const campGold = result.state.champions.reduce(
      (sum, champ) => sum + (champ.goldBySource['camp'] ?? 0),
      0,
    );
    const laneTime = result.state.champions.reduce((sum, champ) => sum + champ.activitySec.lane, 0);
    const recallBase = result.state.champions.reduce(
      (sum, champ) => sum + champ.activitySec.recallBase,
      0,
    );
    const recallTravel = result.state.champions.reduce(
      (sum, champ) => sum + champ.activitySec.recallTravel,
      0,
    );
    const aliveTime = laneTime + recallBase + recallTravel;

    expect(totalCs).toBeGreaterThan(40);
    expect(laners.some((champ) => champ.cs > 8)).toBe(true);
    expect(totalCamps).toBeGreaterThan(4);
    expect(junglers.some((champ) => champ.campKills > 0)).toBe(true);
    expect(junglers.some((champ) => champ.level >= 3)).toBe(true);
    expect(avgLevel).toBeGreaterThan(3);
    expect(itemBuys).toBeGreaterThan(5);
    expect(csGold + campGold).toBeGreaterThan(500);
    expect(laneTime + recallTravel).toBeGreaterThan(0);
    expect(aliveTime).toBeGreaterThan(0);
    for (const champ of result.state.champions) {
      expect(champ.levelSamples.length).toBeGreaterThan(1);
    }
  }, 120_000);

  it('even bucket keeps growth above pre-P0 floor', () => {
    const diag = runV2DiagMatch('even', 1000);
    expect(mean(diag.levelsAtEnd)).toBeGreaterThanOrEqual(3.5);
    expect(diag.minionLastHitsApprox).toBeGreaterThan(40);
    expect(diag.campKills).toBeGreaterThan(2);
    expect(
      diag.activityShare.lane + diag.activityShare.jungle + diag.activityShare.fight,
    ).toBeGreaterThan(0.2);
    expect(diag.itemBuys).toBeGreaterThan(3);
  }, 180_000);
});

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
