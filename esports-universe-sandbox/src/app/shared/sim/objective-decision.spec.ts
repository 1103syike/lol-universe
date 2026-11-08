import { describe, expect, it } from 'vitest';
import { decideObjective, pickObjectiveMethod } from './objective-decision';
import type { MatchState } from './match-state';
import type { TeamProfile } from './team-profile';
import type { Player } from '../../core/models/player.model';
import type { SimPlayerView } from './team-profile';

function fakeView(id: string, position: Player['position']): SimPlayerView {
  return {
    player: {
      id,
      gamertag: id,
      position,
      teamId: 't',
    } as Player,
    effective: {
      laning: 80,
      mechanics: 80,
      teamfighting: 80,
      consistency: 80,
      gameSense: 80,
      adaptability: 80,
    },
    archetype: 'balanced',
  };
}

function profile(
  teamId: string,
  style: Partial<TeamProfile['style']>,
): TeamProfile {
  return {
    teamId,
    players: [
      fakeView(`${teamId}-1`, 'TOP'),
      fakeView(`${teamId}-2`, 'JUNGLE'),
      fakeView(`${teamId}-3`, 'MID'),
      fakeView(`${teamId}-4`, 'BOT'),
      fakeView(`${teamId}-5`, 'SUPPORT'),
    ],
    byPosition: {},
    style: {
      earlyAggression: 0.5,
      lanePressure: 0.5,
      jungleMidSync: 0.5,
      resourceControl: 0.5,
      teamfightExecute: 0.5,
      lateScaling: 0.5,
      splitPush: 0.5,
      balanced: 0.5,
      ...style,
    },
    styleLabels: { primary: [], secondary: [] },
    chemistry: 1,
    coach: null,
  };
}

function baseState(partial: Partial<MatchState> = {}): MatchState {
  return {
    t: 18 * 60,
    phase: 'mid',
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeGold: 30000,
    awayGold: 30000,
    goldGap: 0,
    homeKills: 8,
    awayKills: 8,
    killGap: 0,
    homeTowers: 1,
    awayTowers: 1,
    towerGap: 0,
    homeBarons: 0,
    awayBarons: 0,
    homeSoul: false,
    awaySoul: false,
    homeAlive: 5,
    awayAlive: 5,
    draftEdge: 0,
    matchupEdge: 0,
    canRotateHome: true,
    canRotateAway: true,
    modes: {
      laning: false,
      transition: true,
      objective: true,
      siege: false,
    },
    presence: [],
    lastTeamfightAt: null,
    ...partial,
  };
}

describe('objective decision phase B', () => {
  it('大幅領先傾向 contest，落後且可轉線傾向 trade／give-up', () => {
    const strong = profile('home', {
      resourceControl: 0.85,
      teamfightExecute: 0.8,
    });
    const weak = profile('away', {
      resourceControl: 0.25,
      splitPush: 0.75,
      lanePressure: 0.7,
    });
    const state = baseState({
      goldGap: 4500,
      towerGap: 3,
      killGap: 5,
      canRotateAway: true,
    });

    let contestHome = 0;
    let tradeOrGiveAway = 0;
    for (let i = 0; i < 40; i += 1) {
      const decision = decideObjective({
        kind: 'dragon',
        phase: 'mid',
        home: strong,
        away: weak,
        state,
        edge: 24,
        random: () => (i % 10) / 10,
      });
      if (decision.home.intent === 'contest') {
        contestHome += 1;
      }
      if (decision.away.intent === 'trade' || decision.away.intent === 'give-up') {
        tradeOrGiveAway += 1;
      }
    }

    expect(contestHome).toBeGreaterThan(30);
    expect(tradeOrGiveAway).toBeGreaterThan(25);
  });

  it('雙方 contest 會打出 fight 結果與 taker', () => {
    const home = profile('home', { resourceControl: 0.6 });
    const away = profile('away', { resourceControl: 0.58 });
    const decision = decideObjective({
      kind: 'baron',
      phase: 'late',
      home,
      away,
      state: baseState({ t: 28 * 60, phase: 'late' }),
      edge: 2,
      random: () => 0.4,
    });
    expect(decision.home.intent).toBe('contest');
    expect(decision.away.intent).toBe('contest');
    expect(decision.outcome).toBe('fight');
    expect(decision.takerIsHome).not.toBeNull();
  });

  it('一方 contest 一方 give-up 為 free-take', () => {
    const home = profile('home', { resourceControl: 0.9, teamfightExecute: 0.9 });
    const away = profile('away', { resourceControl: 0.1, splitPush: 0.1, lanePressure: 0.1 });
    const decision = decideObjective({
      kind: 'baron',
      phase: 'late',
      home,
      away,
      state: baseState({
        goldGap: 8000,
        towerGap: 5,
        killGap: 10,
        canRotateAway: false,
      }),
      edge: 40,
      random: () => 0.9,
    });
    expect(decision.home.intent).toBe('contest');
    expect(decision.away.intent).toBe('give-up');
    expect(decision.outcome).toBe('free-take');
    expect(decision.takerIsHome).toBe(true);
    expect(decision.home.method).not.toBeNull();
    expect(decision.method).toBe(decision.home.method);
  });

  it('中野聯動高的陣容較常選埋伏開團', () => {
    const ambush = profile('home', {
      jungleMidSync: 0.95,
      earlyAggression: 0.9,
      resourceControl: 0.2,
      splitPush: 0.1,
      teamfightExecute: 0.2,
    });
    let ambushCount = 0;
    for (let i = 0; i < 40; i += 1) {
      const method = pickObjectiveMethod(ambush, 'early', () => (i % 10) / 10);
      if (method === 'engage-ambush') {
        ambushCount += 1;
      }
    }
    expect(ambushCount).toBeGreaterThan(12);
  });

  it('雙方 contest 會帶出子戰術 method', () => {
    const home = profile('home', { resourceControl: 0.6, jungleMidSync: 0.7 });
    const away = profile('away', { resourceControl: 0.58, teamfightExecute: 0.65 });
    const decision = decideObjective({
      kind: 'dragon',
      phase: 'mid',
      home,
      away,
      state: baseState(),
      edge: 1,
      random: () => 0.35,
    });
    expect(decision.outcome).toBe('fight');
    expect(decision.method).not.toBeNull();
  });
});
