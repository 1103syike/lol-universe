import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_KEYS, type Player, type PlayerPosition } from '../../core/models/player.model';
import type { Coach } from '../../core/models/coach.model';
import { runClassicDraft } from './draft';
import { hasChampionMetaEntry, resolvePatchMeta, resolvePatchVersion } from './resolve-patch';
import { buildTeamProfile } from './team-profile';

function player(id: string, teamId: string, position: PlayerPosition): Player {
  const attributes = {} as Player['attributes'];
  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] = { current: 72, potential: 80, growthRate: 1 };
  }
  return {
    id,
    displayName: id,
    gamertag: id,
    nationality: 'KR',
    position,
    teamId,
    birthday: '1998-01-01',
    rarity: 'gold',
    attributes,
    form: 80,
    contract: { startDate: '2021-01-01', endDate: '2022-01-01', annualSalary: 1 },
    careerRecords: [],
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
  };
}

function coach(teamId: string): Coach {
  return {
    id: `${teamId}-coach`,
    displayName: 'C',
    gamertag: 'C',
    nationality: 'KR',
    teamId,
    birthday: '1988-01-01',
    rarity: 'gold',
    attributes: {
      draftStrategy: 85,
      metaAdaptation: 90,
      tacticalPlanning: 80,
      teamIntegration: 80,
      inGameLeadership: 80,
      playerDevelopment: 70,
    },
    specialties: ['teamfighting', 'gameSense'],
    contract: { startDate: '2021-01-01', endDate: '2022-01-01', annualSalary: 1 },
    careerRecords: [],
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
  };
}

function side(teamId: string) {
  const players = (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
    player(`${teamId}-${position}`, teamId, position),
  );
  return buildTeamProfile(teamId, players, coach(teamId), () => 0.4, 1);
}

describe('draft meta fidelity', () => {
  it('prefers 2021 spring LCK meta favorites without hard-excluding off-meta', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const meta = resolvePatchMeta(patch);
    expect(hasChampionMetaEntry(meta, 'Samira')).toBe(true);
    expect(hasChampionMetaEntry(meta, 'Taric')).toBe(false);

    const seen = new Map<string, number>();
    let inMetaPicks = 0;
    let totalPicks = 0;
    for (let seed = 0; seed < 40; seed += 1) {
      let cursor = seed + 1;
      const random = () => {
        cursor = (cursor * 1103515245 + 12345) % 2147483648;
        return cursor / 2147483648;
      };
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random,
      });
      expect(draft.home.picks.length).toBe(5);
      expect(draft.away.picks.length).toBe(5);
      for (const pick of [...draft.home.picks, ...draft.away.picks]) {
        expect(pick.championId).not.toBe('Taric');
        totalPicks += 1;
        if (hasChampionMetaEntry(meta, pick.championId)) {
          inMetaPicks += 1;
        }
        seen.set(pick.championId, (seen.get(pick.championId) ?? 0) + 1);
      }
    }
    expect(inMetaPicks / Math.max(1, totalPicks)).toBeGreaterThan(0.75);
    expect(seen.size).toBeGreaterThan(12);
    const topHeavy = [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);
    expect(
      topHeavy.some((id) =>
        [
          'Gnar',
          'Kaisa',
          'Renekton',
          'Rell',
          'Udyr',
          'Alistar',
          'Orianna',
          'Syndra',
          'Samira',
        ].includes(id),
      ),
    ).toBe(true);
  });
});
