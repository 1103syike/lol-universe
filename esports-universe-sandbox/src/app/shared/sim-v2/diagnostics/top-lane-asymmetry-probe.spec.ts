import { describe, it } from 'vitest';

import { simulateV2Match, type SimulateV2Input } from '../engine';

const SEEDS = [101, 303, 505, 808] as const;
const AT_SEC = 900;

function baseRoster(
  side: 'blue' | 'red',
  topId: string,
  rest: { jg: string; mid: string; bot: string; sup: string },
) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? topId
        : position === 'JUNGLE'
          ? rest.jg
          : position === 'MID'
            ? rest.mid
            : position === 'BOT'
              ? rest.bot
              : rest.sup,
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function runCase(
  label: string,
  blueTop: string,
  redTop: string,
): void {
  const lines: string[] = [`=== ${label} ===`];
  for (const seed of SEEDS) {
    const input: SimulateV2Input = {
      versionId: 'demo-a',
      seed,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: baseRoster('blue', blueTop, {
        jg: 'LeeSin',
        mid: 'Ahri',
        bot: 'Jinx',
        sup: 'Nautilus',
      }),
      red: baseRoster('red', redTop, {
        jg: 'Viego',
        mid: 'Syndra',
        bot: 'Ashe',
        sup: 'Thresh',
      }),
      maxDurationSec: AT_SEC,
    };
    const { state, replay } = simulateV2Match(input);
    const blue = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'TOP',
    )!;
    const red = state.champions.find(
      (champ) => champ.side === 'red' && champ.positionLabel === 'TOP',
    )!;
    const topIds = new Set([blue.id, red.id]);
    const kills = replay.events
      .filter(
        (event) =>
          event.type === 'death' &&
          event.targetId &&
          topIds.has(event.targetId) &&
          (event.t ?? 0) <= AT_SEC,
      )
      .map((event) => {
        const victim = state.champions.find((champ) => champ.id === event.targetId);
        const killer = state.champions.find((champ) => champ.id === event.actorId);
        return `${Math.floor((event.t ?? 0) / 60)}:${String(Math.floor((event.t ?? 0) % 60)).padStart(2, '0')} ${killer?.championId ?? event.actorId}->${victim?.championId ?? event.targetId}`;
      });
    lines.push(
      [
        `seed=${seed}`,
        `blue ${blue.championId} ${blue.kills}/${blue.deaths} g=${Math.round(blue.earnedGold)} cs=${Math.round(blue.cs)}`,
        `red ${red.championId} ${red.kills}/${red.deaths} g=${Math.round(red.earnedGold)} cs=${Math.round(red.cs)}`,
        `gd=${Math.round(blue.earnedGold - red.earnedGold)}`,
        `kills=[${kills.join(', ')}]`,
      ].join(' | '),
    );
  }
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
}

describe('top lane asymmetry probe', () => {
  it('compares side swap and mirror tops at 15:00', () => {
    runCase('Aatrox(blue) vs Camille(red) baseline', 'Aatrox', 'Camille');
    runCase('Camille(blue) vs Aatrox(red) side-swap heroes', 'Camille', 'Aatrox');
    runCase('Aatrox vs Aatrox mirror', 'Aatrox', 'Aatrox');
    runCase('Camille vs Camille mirror', 'Camille', 'Camille');
    runCase('Garen vs Darius control', 'Garen', 'Darius');
  }, 300_000);
});
