import { describe, expect, it } from 'vitest';
import {
  classifyMatchArchetypes,
  type MatchArchetypeId,
} from './match-archetype';
import type { MatchBoxScore, TimelineEvent } from './match-stats';

function event(
  partial: Partial<TimelineEvent> & Pick<TimelineEvent, 't' | 'type'>,
): TimelineEvent {
  return {
    id: partial.id ?? `ev-${partial.t}-${partial.type}`,
    phase: partial.phase ?? (partial.t < 14 * 60 ? 'early' : partial.t < 25 * 60 ? 'mid' : 'late'),
    teamId: partial.teamId ?? 'home',
    summary: partial.summary ?? `${partial.type}`,
    payload: partial.payload,
    actorPlayerId: partial.actorPlayerId,
    victimPlayerId: partial.victimPlayerId,
    ...partial,
  };
}

function goldSeries(points: Array<[number, number, number]>) {
  return points.map(([t, homeGold, awayGold]) => ({ t, homeGold, awayGold }));
}

function emptyTeam(teamId: string, patch: Partial<MatchBoxScore['home']> = {}) {
  return {
    teamId,
    kills: 0,
    deaths: 0,
    towers: 0,
    dragons: 0,
    dragonSoul: false,
    barons: 0,
    elders: 0,
    inhibitors: 0,
    totalGold: 0,
    ...patch,
  };
}

function box(
  partial: Omit<Partial<MatchBoxScore>, 'home' | 'away'> &
    Pick<MatchBoxScore, 'goldSeries' | 'timeline'> & {
      home?: Partial<MatchBoxScore['home']>;
      away?: Partial<MatchBoxScore['away']>;
    },
): MatchBoxScore {
  const durationSec = partial.durationSec ?? partial.goldSeries[partial.goldSeries.length - 1]?.t ?? 30 * 60;
  const homeGold = partial.goldSeries[partial.goldSeries.length - 1]?.homeGold ?? 0;
  const awayGold = partial.goldSeries[partial.goldSeries.length - 1]?.awayGold ?? 0;
  return {
    homeTeamId: 'home',
    awayTeamId: 'away',
    winnerTeamId: partial.winnerTeamId ?? 'home',
    durationSec,
    home: emptyTeam('home', { totalGold: homeGold, ...(partial.home ?? {}) }),
    away: emptyTeam('away', { totalGold: awayGold, ...(partial.away ?? {}) }),
    players: partial.players ?? [],
    goldSeries: partial.goldSeries,
    timeline: partial.timeline,
  };
}

function idsOf(result: ReturnType<typeof classifyMatchArchetypes>): MatchArchetypeId[] {
  return [
    ...(result.primaryArchetype ? [result.primaryArchetype.id] : []),
    ...result.secondaryTags.map((tag) => tag.id),
  ];
}

describe('classifyMatchArchetypes', () => {
  it('前期大幅落後後期逆轉 → comeback', () => {
    const result = classifyMatchArchetypes({
      box: box({
        winnerTeamId: 'home',
        home: { kills: 18, deaths: 12, towers: 8 },
        away: { kills: 12, deaths: 18, towers: 4 },
        goldSeries: goldSeries([
          [0, 500, 500],
          [10 * 60, 8000, 12500],
          [18 * 60, 14000, 19000],
          [28 * 60, 26000, 24000],
          [32 * 60, 31000, 27000],
        ]),
        timeline: [
          event({ t: 32 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } }),
        ],
      }),
      homeLabel: 'NVM',
      awayLabel: 'JT',
    });
    expect(result.primaryArchetype?.id).toBe('comeback');
    expect(result.primaryArchetype?.reason).toContain('NVM');
  });

  it('雙方經濟長期接近反覆交換 → epic-battle', () => {
    const series = goldSeries([
      [0, 500, 500],
      [8 * 60, 7000, 6000],
      [12 * 60, 9000, 10500],
      [16 * 60, 13000, 11800],
      [20 * 60, 15000, 16500],
      [24 * 60, 19500, 18000],
      [28 * 60, 21000, 22500],
      [32 * 60, 25500, 24000],
      [36 * 60, 27500, 26800],
      [40 * 60, 31000, 30200],
      [42 * 60, 33500, 32800],
    ]);
    const timeline = [
      event({ t: 16 * 60, type: 'teamfight', teamId: 'home' }),
      event({ t: 20 * 60, type: 'teamfight', teamId: 'away' }),
      event({ t: 24 * 60, type: 'teamfight', teamId: 'home' }),
      event({ t: 28 * 60, type: 'teamfight', teamId: 'away' }),
      event({ t: 33 * 60, type: 'teamfight', teamId: 'home' }),
      event({ t: 42 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } }),
    ];
    const result = classifyMatchArchetypes({
      box: box({
        durationSec: 42 * 60,
        goldSeries: series,
        timeline,
        home: { kills: 20, deaths: 18, towers: 7 },
        away: { kills: 18, deaths: 20, towers: 6 },
      }),
    });
    expect(idsOf(result)).toContain('epic-battle');
  });

  it('早期大幅領先並持續壓制 → stomp', () => {
    const result = classifyMatchArchetypes({
      box: box({
        goldSeries: goldSeries([
          [0, 500, 500],
          [8 * 60, 9000, 5200],
          [14 * 60, 15000, 9000],
          [22 * 60, 23000, 14000],
          [26 * 60, 28000, 17000],
        ]),
        timeline: [event({ t: 26 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } })],
        home: { kills: 22, deaths: 4, towers: 9 },
        away: { kills: 4, deaths: 22, towers: 2 },
      }),
    });
    expect(result.primaryArchetype?.id).toBe('stomp');
  });

  it('前中期接近終局拉開 → late-snowball', () => {
    const result = classifyMatchArchetypes({
      box: box({
        durationSec: 30 * 60,
        goldSeries: goldSeries([
          [0, 500, 500],
          [10 * 60, 9000, 8800],
          [14 * 60, 13000, 12500],
          [20 * 60, 18000, 19000],
          [25 * 60, 22000, 26000],
          [30 * 60, 25000, 34000],
        ]),
        timeline: [event({ t: 30 * 60, type: 'nexus', teamId: 'away', payload: { endMethod: 'siege' } })],
        winnerTeamId: 'away',
        home: { kills: 10, deaths: 16, towers: 3 },
        away: { kills: 16, deaths: 10, towers: 9 },
      }),
    });
    expect(result.primaryArchetype?.id).toBe('late-snowball');
  });

  it('低擊殺資源控制 → macro-game', () => {
    const result = classifyMatchArchetypes({
      box: box({
        durationSec: 34 * 60,
        goldSeries: goldSeries([
          [0, 500, 500],
          [14 * 60, 12000, 11000],
          [25 * 60, 21000, 19000],
          [34 * 60, 29000, 25500],
        ]),
        timeline: [
          event({ t: 12 * 60, type: 'tower', teamId: 'home', payload: { towerLane: 'top', towerTier: 1 } }),
          event({ t: 16 * 60, type: 'tower', teamId: 'home', payload: { towerLane: 'mid', towerTier: 1 } }),
          event({ t: 20 * 60, type: 'tower', teamId: 'home', payload: { towerLane: 'bot', towerTier: 1 } }),
          event({ t: 24 * 60, type: 'dragon', teamId: 'home' }),
          event({ t: 28 * 60, type: 'tower', teamId: 'home', payload: { towerLane: 'top', towerTier: 2 } }),
          event({ t: 30 * 60, type: 'tower', teamId: 'home', payload: { towerLane: 'mid', towerTier: 2 } }),
          event({ t: 32 * 60, type: 'tower', teamId: 'home', payload: { towerLane: 'bot', towerTier: 2 } }),
          event({ t: 34 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } }),
        ],
        home: { kills: 8, deaths: 6, towers: 8 },
        away: { kills: 6, deaths: 8, towers: 3 },
      }),
    });
    expect(idsOf(result)).toContain('macro-game');
  });

  it('高擊殺高交戰 → bloodbath', () => {
    const fights = Array.from({ length: 10 }, (_, index) =>
      event({ t: (12 + index * 2) * 60, type: 'teamfight', teamId: index % 2 === 0 ? 'home' : 'away' }),
    );
    const result = classifyMatchArchetypes({
      box: box({
        durationSec: 30 * 60,
        goldSeries: goldSeries([
          [0, 500, 500],
          [15 * 60, 16000, 15500],
          [30 * 60, 30000, 28000],
        ]),
        timeline: [
          ...fights,
          event({ t: 30 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } }),
        ],
        home: { kills: 28, deaths: 24, towers: 7 },
        away: { kills: 24, deaths: 28, towers: 5 },
      }),
    });
    expect(idsOf(result)).toContain('bloodbath');
  });

  it('多次安靜邊線推進 → split-push', () => {
    const towers = [12, 15, 18, 21, 24].map((minute, index) =>
      event({
        t: minute * 60,
        type: 'tower',
        teamId: 'home',
        payload: {
          towerLane: index % 2 === 0 ? 'top' : 'bot',
          towerTier: index < 3 ? 1 : 2,
          pushStyle: 'split',
        },
      }),
    );
    const result = classifyMatchArchetypes({
      box: box({
        goldSeries: goldSeries([
          [0, 500, 500],
          [20 * 60, 18000, 16000],
          [30 * 60, 27000, 23000],
        ]),
        timeline: [
          ...towers,
          event({ t: 30 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } }),
        ],
        home: { kills: 12, deaths: 10, towers: 8 },
        away: { kills: 10, deaths: 12, towers: 3 },
      }),
    });
    expect(idsOf(result)).toContain('split-push');
  });

  it('多次關鍵物件爭奪 → objective-war', () => {
    const objs = [
      event({
        t: 16 * 60,
        type: 'dragon',
        teamId: 'home',
        payload: { objectiveIntent: 'contest', opponentIntent: 'contest', decisionOutcome: 'fight' },
      }),
      event({
        t: 20 * 60,
        type: 'dragon',
        teamId: 'away',
        payload: { objectiveIntent: 'contest', opponentIntent: 'contest', decisionOutcome: 'fight' },
      }),
      event({
        t: 22 * 60,
        type: 'baron',
        teamId: 'away',
        payload: { objectiveIntent: 'contest', opponentIntent: 'contest', decisionOutcome: 'fight' },
      }),
      event({
        t: 28 * 60,
        type: 'elder',
        teamId: 'home',
        payload: { objectiveIntent: 'contest', opponentIntent: 'contest', decisionOutcome: 'fight' },
      }),
    ];
    const result = classifyMatchArchetypes({
      box: box({
        goldSeries: goldSeries([
          [0, 500, 500],
          [20 * 60, 17000, 16500],
          [32 * 60, 30000, 28500],
        ]),
        timeline: [...objs, event({ t: 32 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } })],
        home: { kills: 16, deaths: 14, towers: 7, barons: 1, elders: 1 },
        away: { kills: 14, deaths: 16, towers: 5, barons: 1 },
      }),
    });
    expect(idsOf(result)).toContain('objective-war');
  });

  it('多次成功守住高地 → base-defense', () => {
    const result = classifyMatchArchetypes({
      box: box({
        winnerTeamId: 'away',
        goldSeries: goldSeries([
          [0, 500, 500],
          [20 * 60, 20000, 15000],
          [28 * 60, 26000, 22000],
          [36 * 60, 30000, 31000],
        ]),
        timeline: [
          event({ t: 24 * 60, type: 'inhibitor', teamId: 'home', payload: { towerLane: 'mid' } }),
          event({
            t: 26 * 60,
            type: 'base-hold',
            teamId: 'away',
            payload: { structureHold: true },
          }),
          event({
            t: 30 * 60,
            type: 'base-hold',
            teamId: 'away',
            payload: { structureHold: true },
          }),
          event({ t: 36 * 60, type: 'nexus', teamId: 'away', payload: { endMethod: 'siege' } }),
        ],
        home: { kills: 18, deaths: 16, towers: 9 },
        away: { kills: 16, deaths: 18, towers: 6 },
      }),
    });
    expect(idsOf(result)).toContain('base-defense');
  });

  it('劣勢方搶下關鍵物件 → miracle-steal', () => {
    const result = classifyMatchArchetypes({
      box: box({
        winnerTeamId: 'away',
        goldSeries: goldSeries([
          [0, 500, 500],
          [18 * 60, 18000, 13000],
          [22 * 60 + 30, 18500, 16000],
          [30 * 60, 25000, 27000],
        ]),
        timeline: [
          event({
            t: 22 * 60,
            type: 'baron',
            teamId: 'away',
            payload: {
              objectiveIntent: 'contest',
              opponentIntent: 'contest',
              decisionOutcome: 'fight',
            },
          }),
          event({ t: 30 * 60, type: 'nexus', teamId: 'away', payload: { endMethod: 'siege' } }),
        ],
        home: { kills: 14, deaths: 16, towers: 5 },
        away: { kills: 16, deaths: 14, towers: 7, barons: 1 },
      }),
    });
    expect(idsOf(result)).toContain('miracle-steal');
  });

  it('普通比賽不強制特殊標籤', () => {
    const result = classifyMatchArchetypes({
      box: box({
        durationSec: 29 * 60,
        goldSeries: goldSeries([
          [0, 500, 500],
          [14 * 60, 12000, 11000],
          [25 * 60, 21000, 19500],
          [29 * 60, 25000, 23000],
        ]),
        timeline: [
          event({ t: 18 * 60, type: 'dragon', teamId: 'home' }),
          event({ t: 22 * 60, type: 'tower', teamId: 'home', payload: { towerLane: 'mid', towerTier: 1 } }),
          event({ t: 29 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } }),
        ],
        home: { kills: 14, deaths: 11, towers: 6 },
        away: { kills: 11, deaths: 14, towers: 4 },
      }),
    });
    expect(result.primaryArchetype).toBeNull();
    expect(result.secondaryTags.length).toBeLessThanOrEqual(1);
  });

  it('偷家結束 → backdoor', () => {
    const result = classifyMatchArchetypes({
      box: box({
        goldSeries: goldSeries([
          [0, 500, 500],
          [20 * 60, 18000, 17000],
          [30 * 60, 26000, 25000],
        ]),
        timeline: [
          event({ t: 24 * 60, type: 'inhibitor', teamId: 'home', payload: { towerLane: 'top' } }),
          event({
            t: 30 * 60,
            type: 'nexus',
            teamId: 'home',
            payload: { endMethod: 'backdoor', towerTier: 'nexus' },
          }),
        ],
        home: { kills: 15, deaths: 12, towers: 6 },
        away: { kills: 12, deaths: 15, towers: 5 },
      }),
    });
    expect(idsOf(result)).toContain('backdoor');
  });

  it('stomp 與 comeback 不會同時出現', () => {
    const result = classifyMatchArchetypes({
      box: box({
        goldSeries: goldSeries([
          [0, 500, 500],
          [10 * 60, 10000, 6000],
          [20 * 60, 20000, 12000],
          [28 * 60, 28000, 16000],
        ]),
        timeline: [event({ t: 28 * 60, type: 'nexus', teamId: 'home', payload: { endMethod: 'siege' } })],
        home: { kills: 20, deaths: 5, towers: 9 },
        away: { kills: 5, deaths: 20, towers: 2 },
      }),
    });
    const ids = idsOf(result);
    expect(ids).toContain('stomp');
    expect(ids).not.toContain('comeback');
  });
});
