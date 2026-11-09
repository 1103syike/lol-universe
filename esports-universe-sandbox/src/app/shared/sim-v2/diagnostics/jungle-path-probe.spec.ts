import { describe, it } from 'vitest';
import { auditRoleMacro, formatRoleMacroAudit } from './role-macro-audit';
import { simulateV2Match, type SimulateV2Input } from '../engine';

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
    maxDurationSec: 900,
  };
}

describe('jungle path probe', () => {
  it(
    'prints multi-seed jungle clear / activity',
    () => {
      const audit = auditRoleMacro([11, 22, 33, 44, 55, 66]);
      // eslint-disable-next-line no-console
      console.log(formatRoleMacroAudit(audit));

      for (const seed of [101, 202, 303, 404, 505]) {
        const result = simulateV2Match(input(seed));
        for (const jungler of result.state.champions.filter(
          (champ) => champ.positionLabel === 'JUNGLE',
        )) {
          const goldTop = Object.entries(jungler.goldBySource)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 8)
            .map(([key, value]) => `${key}:${Math.round(value)}`)
            .join(', ');
          // eslint-disable-next-line no-console
          console.log(
            `seed=${seed} ${jungler.side} ${jungler.championId} camps=${jungler.campKills} lv=${jungler.level} gold=${Math.round(jungler.earnedGold)} dmg=${Math.round(jungler.damageToChampions)} jg=${jungler.activitySec.jungle.toFixed(0)}s lane=${jungler.activitySec.lane.toFixed(0)}s fight=${jungler.activitySec.fight.toFixed(0)}s`,
          );
          // eslint-disable-next-line no-console
          console.log(`  goldBy ${goldTop}`);
        }
      }
    },
    120000,
  );
});
