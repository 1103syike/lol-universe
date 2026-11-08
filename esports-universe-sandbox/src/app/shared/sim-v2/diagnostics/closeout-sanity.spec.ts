import { describe, expect, it } from 'vitest';
import type { Player } from '../../../core/models/player.model';
import { simulateGame } from '../../sim/match-engine';

function fakePlayer(id: string, position: Player['position'], teamId: string): Player {
  const attr = (n: number) => ({ current: n, potential: n, growthRate: 0 });
  return {
    id,
    gamertag: id,
    realName: id,
    teamId,
    position,
    nationality: 'TW',
    age: 20,
    form: 72,
    morale: 70,
    rarity: 'rare',
    fatigue: 0,
    attributes: {
      laning: attr(70),
      mechanics: attr(70),
      teamfighting: attr(70),
      gameSense: attr(70),
      consistency: attr(70),
      adaptability: attr(70),
    },
  } as Player;
}

function side(teamId: string) {
  return {
    teamId,
    coach: null,
    players: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      fakePlayer(`${teamId}_${position}`, position, teamId),
    ),
  };
}

function goldAt(
  series: Array<{ t: number; homeGold: number; awayGold: number }>,
  t: number,
): { home: number; away: number; diff: number } {
  let sample = series[0] ?? { t: 0, homeGold: 0, awayGold: 0 };
  for (const point of series) {
    if (point.t <= t) {
      sample = point;
    } else {
      break;
    }
  }
  return {
    home: sample.homeGold,
    away: sample.awayGold,
    diff: sample.homeGold - sample.awayGold,
  };
}

function shareLeadSeconds(
  series: Array<{ t: number; homeGold: number; awayGold: number }>,
  winnerIsHome: boolean,
): number {
  if (series.length < 2) {
    return 0;
  }
  let lead = 0;
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1];
    const next = series[i];
    const diff = prev.homeGold - prev.awayGold;
    const winnerLead = winnerIsHome ? diff > 300 : diff < -300;
    if (winnerLead) {
      lead += Math.max(0, next.t - prev.t);
    }
  }
  return lead;
}

describe('closeout sanity sample', () => {
  it('flags weird short closeouts / gold flip ends across many seeds', () => {
    const flags: string[] = [];
    const durations: number[] = [];
    const shortWhileBehind: string[] = [];
    const lateFlipEnds: string[] = [];
    const tinyLeadEnds: string[] = [];

    for (let seed = 1; seed <= 30; seed += 1) {
      let s = seed * 7919;
      const rng = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
      };
      const report = simulateGame({
        home: side('H'),
        away: side('A'),
        random: rng,
        dateIso: '2024-06-01',
      });
      const box = report.boxScore;
      const durationMin = box.durationSec / 60;
      durations.push(durationMin);
      const winnerHome = box.winnerTeamId === box.homeTeamId;
      const end = goldAt(box.goldSeries, box.durationSec);
      const mid = goldAt(box.goldSeries, Math.min(box.durationSec, 15 * 60));
      const t18 = goldAt(box.goldSeries, Math.min(box.durationSec, 18 * 60));
      const winnerLeadSec = shareLeadSeconds(box.goldSeries, winnerHome);
      const leadShare = winnerLeadSec / Math.max(1, box.durationSec);
      const endWinnerDiff = winnerHome ? end.diff : -end.diff;
      const midWinnerDiff = winnerHome ? mid.diff : -mid.diff;
      const t18WinnerDiff = winnerHome ? t18.diff : -t18.diff;

      const summary = `seed=${seed} ${durationMin.toFixed(1)}m endDiff=${Math.round(end.diff)} midDiff=${Math.round(mid.diff)} leadShare=${(leadShare * 100).toFixed(0)}% winner=${winnerHome ? 'H' : 'A'} K=${box.home.kills}-${box.away.kills}`;

      if (durationMin < 22 && midWinnerDiff < -1500) {
        shortWhileBehind.push(summary);
      }
      if (durationMin <= 24 && t18WinnerDiff < -2000 && endWinnerDiff > -500) {
        lateFlipEnds.push(summary);
      }
      if (durationMin < 23 && Math.abs(end.diff) < 1200 && midWinnerDiff < 800) {
        tinyLeadEnds.push(summary);
      }
      if (durationMin < 18) {
        flags.push(`too-short ${summary}`);
      }
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const under22 = durations.filter((d) => d < 22).length;
    const under25 = durations.filter((d) => d < 25).length;
    const over38 = durations.filter((d) => d > 38).length;

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          n: durations.length,
          avgMin: Number(avg.toFixed(2)),
          under22,
          under25,
          over38,
          shortWhileBehind,
          lateFlipEnds,
          tinyLeadEnds,
          flags,
          durations: durations.map((d) => Number(d.toFixed(1))),
        },
        null,
        2,
      ),
    );

    expect(avg).toBeGreaterThan(28);
    expect(under22).toBeLessThanOrEqual(2);
    expect(shortWhileBehind.length).toBeLessThanOrEqual(1);
    expect(lateFlipEnds.length).toBeLessThanOrEqual(2);
  }, 600_000);
});
