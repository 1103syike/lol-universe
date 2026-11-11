import { describe, expect, it } from 'vitest';

import { simulateV2Match, type SimulateV2Input } from '../engine';

const ROLES = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;
type Role = (typeof ROLES)[number];

const SEEDS = [101, 202, 303, 404] as const;
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

function pct(n: number, total: number): string {
  return `${((n / Math.max(1, total)) * 100).toFixed(1)}%`;
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

describe('soft CS probe', () => {
  it('breaks down minion_death via and credit gap vs attackRange', { timeout: 120_000 }, () => {
    const viaCounts = new Map<string, number>();
    const roleVia = new Map<string, Map<string, number>>();
    const gapsByVia = new Map<string, number[]>();
    const outOfRangeByVia = new Map<string, number>();
    const farSamples: string[] = [];

    for (const seed of SEEDS) {
      const { replay, state } = simulateV2Match(input(seed));
      const byId = new Map(state.champions.map((champ) => [champ.id, champ]));
      for (const event of replay.events) {
        if (event.type !== 'minion_death' || event.t > AT_SEC) {
          continue;
        }
        const via = String(event.payload?.['via'] ?? 'unknown');
        viaCounts.set(via, (viaCounts.get(via) ?? 0) + 1);
        const actor = event.actorId ? byId.get(event.actorId) : undefined;
        const role = actor?.positionLabel ?? 'unknown';
        if (!roleVia.has(role)) {
          roleVia.set(role, new Map());
        }
        const map = roleVia.get(role)!;
        map.set(via, (map.get(via) ?? 0) + 1);

        const gap = Number(event.payload?.['gap'] ?? NaN);
        const attackRange = Number(event.payload?.['attackRange'] ?? NaN);
        if (!Number.isFinite(gap)) {
          continue;
        }
        if (!gapsByVia.has(via)) {
          gapsByVia.set(via, []);
        }
        gapsByVia.get(via)!.push(gap);
        if (Number.isFinite(attackRange) && gap > attackRange + 150) {
          outOfRangeByVia.set(via, (outOfRangeByVia.get(via) ?? 0) + 1);
          if (
            (via === 'soft_lasthit' || via === 'lane_owner') &&
            gap > 900 &&
            farSamples.length < 12
          ) {
            farSamples.push(
              `seed=${seed} t=${event.t.toFixed(0)} ${role}:${actor?.championId ?? '?'} via=${via} gap=${gap} range=${attackRange}`,
            );
          }
        }
      }
    }

    const total = [...viaCounts.values()].reduce((sum, n) => sum + n, 0);
    const lines = [
      `seeds=${SEEDS.join(',')} t<=${AT_SEC}s creditedMinionDeaths=${total}`,
      'via totals:',
      ...[...viaCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([via, n]) => {
          const gaps = gapsByVia.get(via) ?? [];
          const oor = outOfRangeByVia.get(via) ?? 0;
          return `  ${via}: ${n} (${pct(n, total)}) meanGap=${gaps.length ? Math.round(mean(gaps)) : '-'} outOfAaRange=${oor}`;
        }),
      'via by role:',
    ];
    for (const role of ROLES) {
      const map = roleVia.get(role);
      if (!map) {
        continue;
      }
      const roleTotal = [...map.values()].reduce((sum, n) => sum + n, 0);
      const parts = [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([via, n]) => `${via}=${n}`)
        .join(' ');
      lines.push(`  ${role} n=${roleTotal} ${parts}`);
    }
    if (farSamples.length > 0) {
      lines.push('far soft/owner samples (>1500):');
      lines.push(...farSamples.map((row) => `  ${row}`));
    }

    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    const soft = viaCounts.get('soft_lasthit') ?? 0;
    const owner = viaCounts.get('lane_owner') ?? 0;
    const auto = viaCounts.get('auto') ?? 0;
    const softGaps = gapsByVia.get('soft_lasthit') ?? [];
    const ownerGaps = gapsByVia.get('lane_owner') ?? [];
    const softMean = mean(softGaps.length ? softGaps : [0]);
    const ownerMean = mean(ownerGaps.length ? ownerGaps : [0]);
    const softOor = (outOfRangeByVia.get('soft_lasthit') ?? 0) / Math.max(1, soft);
    const ownerOor = (outOfRangeByVia.get('lane_owner') ?? 0) / Math.max(1, owner);
    // eslint-disable-next-line no-console
    console.log(
      `assert auto=${auto} softMean=${softMean.toFixed(1)} ownerMean=${ownerMean.toFixed(1)} softOor=${softOor.toFixed(3)} ownerOor=${ownerOor.toFixed(3)} far=${farSamples.length}`,
    );
    expect(auto).toBeGreaterThan(0);
    expect(softMean).toBeLessThan(550);
    expect(ownerMean).toBeLessThan(550);
    expect(ownerOor).toBeLessThan(0.05);
    expect(softOor).toBeLessThan(0.05);
    expect(farSamples.length).toBe(0);
  });
});

