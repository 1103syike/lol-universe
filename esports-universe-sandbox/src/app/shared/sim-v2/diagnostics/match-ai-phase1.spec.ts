import { describe, expect, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';

function roster(side: 'blue' | 'red') {
  const prefix = side;
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${prefix}_${position}`,
    gamertag: `${prefix}_${position}`,
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

function pairDistanceAvg(champs: Array<{ x: number; y: number; alive: boolean }>): number | null {
  const alive = champs.filter((champ) => champ.alive);
  if (alive.length < 2) {
    return null;
  }
  let sum = 0;
  let count = 0;
  for (let i = 0; i < alive.length; i += 1) {
    for (let j = i + 1; j < alive.length; j += 1) {
      sum += Math.hypot(alive[i].x - alive[j].x, alive[i].y - alive[j].y);
      count += 1;
    }
  }
  return sum / count;
}

function decisionPct(
  decisions: Array<{ t?: number; payload?: Record<string, unknown> }>,
  from: number,
  to: number,
): Record<string, number> {
  const slice = decisions.filter((event) => (event.t ?? 0) >= from && (event.t ?? 0) < to);
  const bag: Record<string, number> = {};
  for (const event of slice) {
    const action = String(event.payload?.['action'] ?? '?');
    bag[action] = (bag[action] ?? 0) + 1;
  }
  const total = slice.length || 1;
  return Object.fromEntries(
    Object.entries(bag).map(([key, value]) => [key, value / total]),
  );
}

describe('match-ai phase1+2 guards', () => {
  it('seed 91001: recall lock, spread, and objective/siege team plays appear', () => {
    const input: SimulateV2Input = {
      versionId: 'demo-a',
      seed: 91001,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue'),
      red: roster('red'),
      maxDurationSec: 2700,
    };
    const { state, replay } = simulateV2Match(input);

    const decisions = replay.events.filter((event) => event.type === 'ai_decision');
    const late = decisions.filter((event) => (event.t ?? 0) >= 1500);
    const lateRecall = late.filter((event) => event.payload?.['action'] === 'recall').length;
    const lateRecallPct = late.length > 0 ? lateRecall / late.length : 0;

    const activityTotal = state.champions.reduce((sum, champ) => {
      return (
        sum +
        champ.activitySec.lane +
        champ.activitySec.jungle +
        champ.activitySec.fight +
        champ.activitySec.recallTravel +
        champ.activitySec.recallBase +
        champ.activitySec.other
      );
    }, 0);
    const recallBasePct =
      state.champions.reduce((sum, champ) => sum + champ.activitySec.recallBase, 0) /
      Math.max(1, activityTotal);

    const snap900 = replay.snapshots.find((snap) => snap.t === 900);
    const blue900 = (snap900?.champions ?? [])
      .filter((champ) => champ.side === 'blue')
      .map((champ) => ({ x: champ.x, y: champ.y, alive: champ.alive }));
    const blueSpread900 = pairDistanceAvg(blue900);

    const mid = decisionPct(decisions, 540, 1500);
    const hasMacroPlay =
      (mid['objective'] ?? 0) + (mid['siege'] ?? 0) + (mid['defend'] ?? 0) > 0.08;
    expect(hasMacroPlay).toBe(true);
    expect(mid['defend'] ?? 0).toBeLessThan(0.4);

    expect(lateRecallPct).toBeLessThan(0.45);
    expect(recallBasePct).toBeLessThan(0.35);
    if (blueSpread900 !== null) {
      expect(blueSpread900).toBeGreaterThan(1600);
    }
  });
});
