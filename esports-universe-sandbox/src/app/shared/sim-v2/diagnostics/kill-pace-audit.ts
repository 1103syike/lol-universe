import { simulateV2Match, type SimulateV2Input } from '../engine';
import { expectedKillsAt, matchKillTotal } from '../combat/kill-pace';

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

function input(seed: number, maxDurationSec = 2700): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec,
  };
}

export interface KillPaceRow {
  seed: number;
  durationSec: number;
  endReason: string;
  kills: number;
  expected: number;
  overpace: number;
  earlyKills: number;
  goldGap: number;
  killGap: number;
}

export function auditKillPace(seeds: readonly number[] = [91001, 42, 1000, 1100, 1200]): KillPaceRow[] {
  return seeds.map((seed) => {
    const { state, replay } = simulateV2Match(input(seed));
    const kills = matchKillTotal(state);
    const durationSec = Math.round(state.scheduler.time);
    const expected = expectedKillsAt(durationSec);
    const earlyKills = replay.events.filter(
      (event) => event.type === 'death' && (event.t ?? 0) < 600,
    ).length;
    const blueKills = state.champions
      .filter((champ) => champ.side === 'blue')
      .reduce((sum, champ) => sum + champ.kills, 0);
    const redKills = state.champions
      .filter((champ) => champ.side === 'red')
      .reduce((sum, champ) => sum + champ.kills, 0);
    const blueGold = state.champions
      .filter((champ) => champ.side === 'blue')
      .reduce((sum, champ) => sum + champ.earnedGold, 0);
    const redGold = state.champions
      .filter((champ) => champ.side === 'red')
      .reduce((sum, champ) => sum + champ.earnedGold, 0);
    return {
      seed,
      durationSec,
      endReason: state.endReason ?? 'unknown',
      kills,
      expected: Number(expected.toFixed(1)),
      overpace: Number((kills / Math.max(1, expected)).toFixed(2)),
      earlyKills,
      goldGap: Math.round(Math.abs(blueGold - redGold)),
      killGap: Math.abs(blueKills - redKills),
    };
  });
}

export function formatKillPace(rows: KillPaceRow[]): string {
  const lines = [
    'seed | dur | end | kills | expected | overpace | early10m | killGap | goldGap',
    ...rows.map(
      (row) =>
        `${row.seed} | ${row.durationSec}s | ${row.endReason} | ${row.kills} | ${row.expected} | ${row.overpace}x | ${row.earlyKills} | ${row.killGap} | ${row.goldGap}`,
    ),
  ];
  const avgOver =
    rows.reduce((sum, row) => sum + row.overpace, 0) / Math.max(1, rows.length);
  const avgKills =
    rows.reduce((sum, row) => sum + row.kills, 0) / Math.max(1, rows.length);
  lines.push(
    `avg kills=${avgKills.toFixed(1)} avg overpace=${avgOver.toFixed(2)}x (target ~0.85-1.25)`,
  );
  return lines.join('\n');
}
