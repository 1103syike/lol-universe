import { describe, expect, it } from 'vitest';
import type { Coach } from '../../core/models/coach.model';
import type { Player, PlayerPosition } from '../../core/models/player.model';
import type { MatchArchetypeId } from './match-archetype';
import { simulateGame } from './match-engine';

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function attrs(level: number) {
  return {
    laning: { current: level, potential: level + 5, growthRate: 1 },
    mechanics: { current: level, potential: level + 5, growthRate: 1 },
    teamfighting: { current: level, potential: level + 5, growthRate: 1 },
    gameSense: { current: level, potential: level + 5, growthRate: 1 },
    consistency: { current: level, potential: level + 5, growthRate: 1 },
    adaptability: { current: level, potential: level + 5, growthRate: 1 },
  };
}

function makePlayer(
  id: string,
  teamId: string,
  gamertag: string,
  position: PlayerPosition,
  level: number,
): Player {
  return {
    id,
    displayName: gamertag,
    gamertag,
    nationality: 'TW',
    position,
    teamId,
    birthday: '2000-01-01',
    rarity: 'SR',
    attributes: attrs(level),
    form: level,
    contract: {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      annualSalary: 1000000,
    },
    careerRecords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeCoach(id: string, teamId: string, level = 80): Coach {
  return {
    id,
    displayName: 'Coach',
    gamertag: 'Coach',
    nationality: 'TW',
    teamId,
    birthday: '1990-01-01',
    rarity: 'SR',
    attributes: {
      draftStrategy: level,
      metaAdaptation: level,
      tacticalPlanning: level,
      teamIntegration: level,
      inGameLeadership: level,
      playerDevelopment: level,
    },
    specialties: ['teamfighting', 'gameSense'],
    contract: {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      annualSalary: 1000000,
    },
    careerRecords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function side(teamId: string, level: number) {
  const roles: PlayerPosition[] = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
  return {
    teamId,
    coach: makeCoach(`c-${teamId}`, teamId, level),
    players: roles.map((position, index) =>
      makePlayer(
        `p-${teamId}-${index}`,
        teamId,
        `${teamId}-${position}`,
        position,
        level + (index - 2) * 2,
      ),
    ),
  };
}

const CONFLICTS: Array<[MatchArchetypeId, MatchArchetypeId]> = [
  ['stomp', 'comeback'],
  ['stomp', 'epic-battle'],
  ['stomp', 'narrow-victory'],
  ['stomp', 'late-snowball'],
  ['comeback', 'late-snowball'],
  ['bloodbath', 'macro-game'],
  ['perfect-game', 'comeback'],
  ['perfect-game', 'narrow-victory'],
  ['perfect-game', 'late-snowball'],
];

describe('match archetype 100-game sample', () => {
  it('抽樣 100 場並檢查矛盾標籤', () => {
    const primaryCounts: Record<string, number> = {};
    const secondaryCounts: Record<string, number> = {};
    let nonePrimary = 0;
    let conflictCount = 0;

    for (let index = 0; index < 100; index += 1) {
      const random = mulberry32(1000 + index * 97);
      const homeLevel = 70 + Math.floor(random() * 35);
      const awayLevel = 70 + Math.floor(random() * 35);
      const report = simulateGame({
        home: side('home', homeLevel),
        away: side('away', awayLevel),
        random,
      });
      const archetypes = report.archetypes;
      expect(archetypes).toBeTruthy();
      const primary = archetypes.primaryArchetype?.id ?? null;
      if (!primary) {
        nonePrimary += 1;
      } else {
        primaryCounts[primary] = (primaryCounts[primary] ?? 0) + 1;
      }
      const ids = [
        ...(primary ? [primary] : []),
        ...archetypes.secondaryTags.map((tag) => tag.id),
      ];
      for (const id of archetypes.secondaryTags.map((tag) => tag.id)) {
        secondaryCounts[id] = (secondaryCounts[id] ?? 0) + 1;
      }
      if (CONFLICTS.some(([left, right]) => ids.includes(left) && ids.includes(right))) {
        conflictCount += 1;
      }
    }

    const summary = {
      games: 100,
      nonePrimary,
      nonePrimaryRate: nonePrimary / 100,
      primaryCounts,
      secondaryCounts,
      conflictCount,
    };
    void import('fs').then((fs) => {
      fs.writeFileSync('docs/match-archetype-sample-100.json', `${JSON.stringify(summary, null, 2)}\n`);
    });
    expect(conflictCount).toBe(0);
    expect(nonePrimary).toBeGreaterThan(0);
    expect(summary.games).toBe(100);
  });
});
