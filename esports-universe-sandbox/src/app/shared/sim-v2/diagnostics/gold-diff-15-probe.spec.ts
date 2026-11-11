import { describe, it } from 'vitest';

import { simulateV2Match, type SimulateV2Input } from '../engine';

const ROLES = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;
type Role = (typeof ROLES)[number];

const SEEDS = [101, 202, 303, 404, 505, 606, 707, 808] as const;
const AT_SEC = 900;

function roster(side: 'blue' | 'red', bots: Record<Role, string>) {
  return ROLES.map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: bots[position],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function input(seed: number): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', {
      TOP: 'Aatrox',
      JUNGLE: 'LeeSin',
      MID: 'Ahri',
      BOT: 'Jinx',
      SUPPORT: 'Nautilus',
    }),
    red: roster('red', {
      TOP: 'Camille',
      JUNGLE: 'Viego',
      MID: 'Syndra',
      BOT: 'Ashe',
      SUPPORT: 'Thresh',
    }),
    maxDurationSec: AT_SEC,
  };
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index]!;
}

describe('gold diff @15 probe', () => {
  it('breaks down top-lane gold sources and deaths at 15:00', () => {
    const lines: string[] = [];
    for (const seed of SEEDS) {
      const { state } = simulateV2Match(input(seed));
      const tops = state.champions.filter((champ) => champ.positionLabel === 'TOP');
      for (const champ of tops) {
        const src = champ.goldBySource;
        lines.push(
          [
            `seed=${seed}`,
            `${champ.side}:${champ.championId}`,
            `gold=${Math.round(champ.earnedGold)}`,
            `cs=${Math.round(champ.cs)}`,
            `kda=${champ.kills}/${champ.deaths}/${champ.assists}`,
            `csG=${Math.round(src['cs'] ?? 0)}`,
            `killG=${Math.round(src['kill'] ?? 0)}`,
            `assistG=${Math.round(src['assist'] ?? 0)}`,
            `campG=${Math.round(src['camp'] ?? 0)}`,
            `objG=${Math.round(src['objective'] ?? 0)}`,
            `passiveG=${Math.round(src['passive'] ?? 0)}`,
            `plate?=${Math.round((src['plate'] ?? 0) + (src['turret_plating'] ?? 0) + (src['tower'] ?? 0))}`,
            `sources=${JSON.stringify(src)}`,
          ].join(' '),
        );
      }
    }
    // eslint-disable-next-line no-console
    console.log(['=== TOP @15 gold sources ===', ...lines].join('\n'));
  }, 180_000);

  it('prints role gold and matchup diffs at 15:00 vs live benchmarks', () => {
    const absGold: Record<Role, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const absCs: Record<Role, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const roleDiff: Record<Role, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const absRoleDiff: Record<Role, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };
    const teamDiff: number[] = [];
    const lines: string[] = [];

    for (const seed of SEEDS) {
      const { state } = simulateV2Match(input(seed));
      const byRole = (side: 'blue' | 'red', role: Role) =>
        state.champions.find((champ) => champ.side === side && champ.positionLabel === role)!;

      let blueTeam = 0;
      let redTeam = 0;
      const row: string[] = [`seed=${seed}`];
      for (const role of ROLES) {
        const blue = byRole('blue', role);
        const red = byRole('red', role);
        const diff = blue.earnedGold - red.earnedGold;
        absGold[role].push(blue.earnedGold, red.earnedGold);
        absCs[role].push(blue.cs, red.cs);
        roleDiff[role].push(diff);
        absRoleDiff[role].push(Math.abs(diff));
        blueTeam += blue.earnedGold;
        redTeam += red.earnedGold;
        row.push(
          `${role}:${Math.round(blue.earnedGold)}/${Math.round(red.earnedGold)}(d${Math.round(diff)}) cs ${Math.round(blue.cs)}/${Math.round(red.cs)}`,
        );
      }
      teamDiff.push(blueTeam - redTeam);
      row.push(`team d${Math.round(blueTeam - redTeam)}`);
      lines.push(row.join(' | '));
    }

    const summary = ROLES.map((role) => {
      const goldMean = mean(absGold[role]);
      const csMean = mean(absCs[role]);
      return {
        role,
        gold15: Math.round(goldMean),
        gpm: Math.round(goldMean / 15),
        cs15: Number(csMean.toFixed(1)),
        csm: Number((csMean / 15).toFixed(2)),
        meanDiff: Math.round(mean(roleDiff[role])),
        meanAbsDiff: Math.round(mean(absRoleDiff[role])),
        p50AbsDiff: Math.round(percentile(absRoleDiff[role], 0.5)),
        p90AbsDiff: Math.round(percentile(absRoleDiff[role], 0.9)),
      };
    });

    // eslint-disable-next-line no-console
    console.log(
      [
        '=== gold/cs @15 by role ===',
        'live ballpark: laners ~4500-6000g @15; even |GD| ~200-800; lane stomp 1000+; support much lower',
        ...summary.map((row) => JSON.stringify(row)),
        `team meanDiff=${Math.round(mean(teamDiff))} meanAbs=${Math.round(mean(teamDiff.map((v) => Math.abs(v))))} p90Abs=${Math.round(percentile(teamDiff.map((v) => Math.abs(v)), 0.9))}`,
        '--- per seed ---',
        ...lines,
      ].join('\n'),
    );
  }, 180_000);
});
