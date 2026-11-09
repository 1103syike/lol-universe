import { describe, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import { XP_PER_LEVEL } from '../../sim/xp-curve';

function roster(side: 'blue' | 'red', junglerId: string) {
  const prefix = side;
  return [
    {
      playerId: `${prefix}_top`,
      gamertag: `${prefix}_top`,
      position: 'TOP' as const,
      championId: 'Garen',
      laning: 70,
      mechanics: 65,
      teamfighting: 60,
      gameSense: 65,
      consistency: 70,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_jg`,
      gamertag: `${prefix}_jg`,
      position: 'JUNGLE' as const,
      championId: junglerId,
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
      championId: 'Orianna',
      laning: 70,
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
      championId: 'Jinx',
      laning: 70,
      mechanics: 72,
      teamfighting: 70,
      gameSense: 65,
      consistency: 65,
      adaptability: 60,
    },
    {
      playerId: `${prefix}_sup`,
      gamertag: `${prefix}_sup`,
      position: 'SUPPORT' as const,
      championId: 'Thresh',
      laning: 55,
      mechanics: 60,
      teamfighting: 70,
      gameSense: 75,
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
    blue: roster('blue', 'LeeSin'),
    red: roster('red', 'Viego'),
    maxDurationSec: 1200,
  };
}

function expectedLevel(exp: number): number {
  let level = 1;
  while (level < XP_PER_LEVEL.length && exp >= XP_PER_LEVEL[level]) {
    level += 1;
  }
  return level;
}

describe('jungle economy probe', () => {
  it(
    'prints gold/xp breakdown for junglers across seeds',
    () => {
      for (const seed of [11, 22, 33, 44, 55, 66, 77, 88]) {
        const result = simulateV2Match(input(seed));
        const duration = Math.round(result.state.scheduler.time);
        for (const role of ['JUNGLE', 'MID', 'TOP'] as const) {
          for (const champ of result.state.champions.filter((c) => c.positionLabel === role)) {
            const goldSrc = Object.entries(champ.goldBySource)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => `${k}:${Math.round(v)}`)
              .join(', ');
            const expSrc = Object.entries(champ.expBySource)
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => `${k}:${Math.round(v)}`)
              .join(', ');
            const itemCount = champ.items.length;
            // eslint-disable-next-line no-console
            console.log(
              `seed=${seed} t=${duration}s ${champ.side} ${role} ${champ.championId} lv=${champ.level}(exp=${Math.round(champ.exp)} expectLv=${expectedLevel(champ.exp)}) pocket=${Math.round(champ.gold)} earned=${Math.round(champ.earnedGold)} items=${itemCount} camps=${champ.campKills} cs=${champ.cs}`,
            );
            // eslint-disable-next-line no-console
            console.log(`  goldBy ${goldSrc}`);
            // eslint-disable-next-line no-console
            console.log(`  expBy ${expSrc || '(none)'}`);
          }
        }
      }
    },
    180000,
  );
});
