import { describe, expect, it } from 'vitest';
import type { Player, PlayerPosition } from '../../core/models/player.model';
import { resolveFightDamage } from './damage';
import type { SimPlayerView } from './team-profile';

function view(id: string, position: PlayerPosition, level: number): SimPlayerView {
  const player = {
    id,
    displayName: id,
    gamertag: id,
    nationality: 'TW',
    position,
    teamId: 't',
    birthday: '2000-01-01',
    rarity: 'SR',
    attributes: {
      laning: { current: level, potential: level, growthRate: 1 },
      mechanics: { current: level, potential: level, growthRate: 1 },
      teamfighting: { current: level, potential: level, growthRate: 1 },
      gameSense: { current: level, potential: level, growthRate: 1 },
      consistency: { current: level, potential: level, growthRate: 1 },
      adaptability: { current: level, potential: level, growthRate: 1 },
    },
    form: level,
    contract: { startDate: '2026-01-01', endDate: '2026-12-31', annualSalary: 1 },
    careerRecords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as Player;
  return {
    player,
    effective: {
      laning: level,
      mechanics: level,
      teamfighting: level,
      gameSense: level,
      consistency: level,
      adaptability: level,
    },
    archetype: 'balanced',
  };
}

describe('resolveFightDamage', () => {
  it('雙方都會拿到傷害，且輸方保有下限', () => {
    let seed = 1;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const home = [
      view('h1', 'MID', 90),
      view('h2', 'BOT', 92),
      view('h3', 'SUPPORT', 80),
    ];
    const away = [
      view('a1', 'MID', 70),
      view('a2', 'BOT', 68),
      view('a3', 'SUPPORT', 66),
    ];
    const result = resolveFightDamage({
      phase: 'mid',
      intensity: 'teamfight',
      homeParticipants: home,
      awayParticipants: away,
      homePressure: 0.85,
      random,
    });
    expect(result.homeTotal).toBeGreaterThan(0);
    expect(result.awayTotal).toBeGreaterThan(0);
    expect(result.awayTotal / result.homeTotal).toBeGreaterThan(0.3);
    const homeSum = home.reduce((sum, item) => sum + (result.damageByPlayer[item.player.id] ?? 0), 0);
    const awaySum = away.reduce((sum, item) => sum + (result.damageByPlayer[item.player.id] ?? 0), 0);
    expect(homeSum).toBe(result.homeTotal);
    expect(awaySum).toBe(result.awayTotal);
  });

  it('勢均力敵時雙方傷害接近五五', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xffffffff;
    };
    const home = [view('h1', 'MID', 80), view('h2', 'BOT', 80)];
    const away = [view('a1', 'MID', 80), view('a2', 'BOT', 80)];
    let homeSum = 0;
    let awaySum = 0;
    for (let index = 0; index < 40; index += 1) {
      const result = resolveFightDamage({
        phase: 'mid',
        intensity: 'skirmish',
        homeParticipants: home,
        awayParticipants: away,
        homePressure: 0.5,
        random,
      });
      homeSum += result.homeTotal;
      awaySum += result.awayTotal;
    }
    const share = homeSum / Math.max(1, homeSum + awaySum);
    expect(share).toBeGreaterThan(0.45);
    expect(share).toBeLessThan(0.55);
  });
});
