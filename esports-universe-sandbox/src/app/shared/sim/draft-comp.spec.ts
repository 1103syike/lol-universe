import { describe, expect, it } from 'vitest';
import { getChampionKit } from '../../core/data/champion-kits';
import type { Coach } from '../../core/models/coach.model';
import { ATTRIBUTE_KEYS, type Player, type PlayerPosition } from '../../core/models/player.model';
import { runClassicDraft } from './draft';
import { resolvePatchMeta, resolvePatchVersion } from './resolve-patch';
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

function mulberry(seed: number): () => number {
  let cursor = seed + 1;
  return () => {
    cursor = (cursor * 1103515245 + 12345) % 2147483648;
    return cursor / 2147483648;
  };
}

describe('draft composition soft needs', () => {
  it('keeps hollow no-frontline no-engage comps rare across many seeds', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const meta = resolvePatchMeta(patch);
    let hollow = 0;
    let primaryRoleHits = 0;
    let totalPicks = 0;
    const samples = 48;

    for (let seed = 0; seed < samples; seed += 1) {
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random: mulberry(seed * 17 + 3),
      });
      for (const team of [draft.home, draft.away]) {
        let frontline = 0;
        let highEngage = 0;
        for (const pick of team.picks) {
          totalPicks += 1;
          const kit = getChampionKit(pick.championId)!;
          if (kit.positions[0] === pick.position) {
            primaryRoleHits += 1;
          }
          if (kit.combatClass === 'tank' || kit.combatClass === 'fighter') {
            frontline += 1;
          }
          if (kit.style.engage >= 70) {
            highEngage += 1;
          }
        }
        if (frontline === 0 && highEngage === 0) {
          hollow += 1;
        }
      }
    }

    expect(hollow / (samples * 2)).toBeLessThan(0.2);
    expect(primaryRoleHits / Math.max(1, totalPicks)).toBeGreaterThan(0.55);
  });

  it('still fills all five roles when a lane meta pool is exhausted', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const meta = resolvePatchMeta(patch);
    let incomplete = 0;
    for (let seed = 0; seed < 60; seed += 1) {
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random: mulberry(seed * 31 + 9),
      });
      if (draft.home.picks.length < 5 || draft.away.picks.length < 5) {
        incomplete += 1;
      }
      const homePositions = new Set(draft.home.picks.map((pick) => pick.position));
      const awayPositions = new Set(draft.away.picks.map((pick) => pick.position));
      expect(homePositions.size).toBe(5);
      expect(awayPositions.size).toBe(5);
    }
    expect(incomplete).toBe(0);
  });
});

