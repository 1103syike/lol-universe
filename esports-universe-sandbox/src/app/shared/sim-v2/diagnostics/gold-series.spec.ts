import { describe, expect, it } from 'vitest';
import { toMatchReport } from '../adapter/to-match-report';
import { simulateV2Match } from '../engine';

function roster(side: string) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position: position as 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT',
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

describe('gold series continuity', () => {
  it('keeps end-game samples dense and matched to box totals', () => {
    const result = simulateV2Match({
      versionId: 'demo-a',
      seed: 1100,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue'),
      red: roster('red'),
      maxDurationSec: 1800,
    });
    const report = toMatchReport(result);
    const series = report.boxScore.goldSeries;
    expect(series.length).toBeGreaterThan(20);
    expect(series[0].t).toBeLessThanOrEqual(1);

    let maxGap = 0;
    for (let i = 1; i < series.length; i += 1) {
      maxGap = Math.max(maxGap, series[i].t - series[i - 1].t);
    }
    expect(maxGap).toBeLessThanOrEqual(20);

    const last = series[series.length - 1];
    expect(Math.abs(last.t - report.boxScore.durationSec)).toBeLessThanOrEqual(1.5);
    expect(last.homeGold).toBe(report.boxScore.home.totalGold);
    expect(last.awayGold).toBe(report.boxScore.away.totalGold);
  }, 60_000);
});
