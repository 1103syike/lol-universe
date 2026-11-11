import { describe, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import { resolveShopPrefer } from '../economy/shop-builds';

const SEEDS = [101, 303, 505, 808] as const;

function roster(side: 'blue' | 'red', topId: string) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? topId
        : position === 'JUNGLE'
          ? side === 'blue'
            ? 'LeeSin'
            : 'Viego'
          : position === 'MID'
            ? side === 'blue'
              ? 'Ahri'
              : 'Syndra'
            : position === 'BOT'
              ? side === 'blue'
                ? 'Jinx'
                : 'Ashe'
              : side === 'blue'
                ? 'Nautilus'
                : 'Thresh',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

describe('Camille vs Gragas probe', () => {
  it('prints 15m top stats and shop plans', () => {
    const lines = [
      `Camille plan: ${resolveShopPrefer({ championId: 'Camille', position: 'TOP', ownedItems: [] }).join(' > ')}`,
      `Gragas plan: ${resolveShopPrefer({ championId: 'Gragas', position: 'TOP', ownedItems: [] }).join(' > ')}`,
    ];
    for (const seed of SEEDS) {
      for (const [blueTop, redTop] of [
        ['Camille', 'Garen'],
        ['Garen', 'Camille'],
      ] as const) {
        const input: SimulateV2Input = {
          versionId: 'demo-a',
          seed,
          blueTeamId: 'blue',
          redTeamId: 'red',
          blue: roster('blue', blueTop),
          red: roster('red', redTop),
          maxDurationSec: 900,
        };
        const { state } = simulateV2Match(input);
        const blue = state.champions.find(
          (champ) => champ.side === 'blue' && champ.positionLabel === 'TOP',
        )!;
        const red = state.champions.find(
          (champ) => champ.side === 'red' && champ.positionLabel === 'TOP',
        )!;
        lines.push(
          [
            `seed=${seed}`,
            `blue ${blue.championId} ${blue.kills}/${blue.deaths} g=${Math.round(blue.earnedGold)} items=${blue.items.join(',')}`,
            `red ${red.championId} ${red.kills}/${red.deaths} g=${Math.round(red.earnedGold)} items=${red.items.join(',')}`,
            `gd=${Math.round(blue.earnedGold - red.earnedGold)}`,
          ].join(' | '),
        );
      }
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
  }, 300_000);
});
