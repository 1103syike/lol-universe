import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_KEYS, type Player, type PlayerPosition } from '../../../core/models/player.model';
import type { Coach } from '../../../core/models/coach.model';
import { buildV2Input } from './from-legacy-input';
import { simulateV2Match } from '../engine';

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
    id: `${teamId}-c`,
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
    specialties: ['teamfighting'],
    contract: { startDate: '2021-01-01', endDate: '2022-01-01', annualSalary: 1 },
    careerRecords: [],
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
  };
}

describe('sim hang probe', () => {
  it('full match eventually ends without freezing', () => {
    let cursor = 17;
    const random = () => {
      cursor = (cursor * 1103515245 + 12345) % 2147483648;
      return cursor / 2147483648;
    };
    const positions = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const;
    const input = buildV2Input(
      {
        home: {
          teamId: 'home',
          players: positions.map((position) => player(`h-${position}`, 'home', position)),
          coach: coach('home'),
        },
        away: {
          teamId: 'away',
          players: positions.map((position) => player(`a-${position}`, 'away', position)),
          coach: coach('away'),
        },
        dateIso: '2021-02-03',
        random,
      },
      7,
    );
    const { state } = simulateV2Match(input);
    expect(state.ended).toBe(true);
    expect(state.scheduler.time).toBeLessThanOrEqual(3600);
  }, 180_000);
});
