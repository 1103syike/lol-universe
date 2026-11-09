import { describe, expect, it } from 'vitest';
import type { Coach } from '../../core/models/coach.model';
import type { Player, PlayerPosition } from '../../core/models/player.model';
import { assertBoxScore, timelineKillDeathBalance, validateBoxScore } from './invariants';
import { simulateGame } from './match-engine';
import type { MatchSimResult, TimelineEvent } from './match-stats';
import { buildBoxScore } from './reduce-stats';
import { createTimelineEvent, resetTimelineIds } from './timeline';

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

function makeCoach(id: string, teamId: string): Coach {
  return {
    id,
    displayName: 'Coach',
    gamertag: 'Coach',
    nationality: 'TW',
    teamId,
    birthday: '1990-01-01',
    rarity: 'SR',
    attributes: {
      draftStrategy: 80,
      metaAdaptation: 80,
      tacticalPlanning: 82,
      teamIntegration: 78,
      inGameLeadership: 85,
      playerDevelopment: 75,
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

function sampleResult(): MatchSimResult {
  resetTimelineIds();
  const homeId = 'home';
  const awayId = 'away';
  const timeline: TimelineEvent[] = [
    createTimelineEvent({
      t: 240,
      type: 'first-blood',
      teamId: homeId,
      actorPlayerId: 'h-jgl',
      victimPlayerId: 'a-top',
      victimTeamId: awayId,
      payload: { goldDeltaHome: 400, goldDeltaAway: 0, killGold: 400 },
      summary: 'First Blood',
    }),
    createTimelineEvent({
      t: 600,
      type: 'dragon',
      teamId: awayId,
      actorPlayerId: 'a-jgl',
      payload: { dragonType: 'infernal', marker: 'D1', goldDeltaAway: 400 },
      summary: 'Dragon',
    }),
    createTimelineEvent({
      t: 900,
      type: 'tower',
      teamId: homeId,
      actorPlayerId: 'h-bot',
      payload: { towerLane: 'bot', towerTier: 1, marker: 'T', goldDeltaHome: 650 },
      summary: 'Tower',
    }),
    createTimelineEvent({
      t: 1500,
      type: 'baron',
      teamId: homeId,
      actorPlayerId: 'h-jgl',
      payload: { marker: 'B', goldDeltaHome: 900 },
      summary: 'Baron',
    }),
    createTimelineEvent({
      t: 1800,
      type: 'nexus',
      teamId: homeId,
      summary: 'Nexus',
    }),
  ];

  return {
    homeTeamId: homeId,
    awayTeamId: awayId,
    durationSec: 1800,
    winnerTeamId: homeId,
    timeline,
    goldSeries: [
      { t: 0, homeGold: 2500, awayGold: 2500 },
      { t: 1800, homeGold: 52000, awayGold: 48000 },
    ],
    players: [
      {
        playerId: 'h-top',
        teamId: homeId,
        gamertag: 'HTop',
        position: 'TOP',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 10000,
        cs: 220,
        visionScore: 18,
        items: [],
      },
      {
        playerId: 'h-jgl',
        teamId: homeId,
        gamertag: 'HJgl',
        position: 'JUNGLE',
        kills: 1,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 11000,
        cs: 170,
        visionScore: 40,
        items: [],
      },
      {
        playerId: 'h-mid',
        teamId: homeId,
        gamertag: 'HMid',
        position: 'MID',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 11000,
        cs: 250,
        visionScore: 20,
        items: [],
      },
      {
        playerId: 'h-bot',
        teamId: homeId,
        gamertag: 'HBot',
        position: 'BOT',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 12000,
        cs: 280,
        visionScore: 15,
        items: [],
      },
      {
        playerId: 'h-sup',
        teamId: homeId,
        gamertag: 'HSup',
        position: 'SUPPORT',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 8000,
        cs: 40,
        visionScore: 70,
        items: [],
      },
      {
        playerId: 'a-top',
        teamId: awayId,
        gamertag: 'ATop',
        position: 'TOP',
        kills: 0,
        deaths: 1,
        assists: 0,
        damageToChamps: 0,
        gold: 9500,
        cs: 210,
        visionScore: 16,
        items: [],
      },
      {
        playerId: 'a-jgl',
        teamId: awayId,
        gamertag: 'AJgl',
        position: 'JUNGLE',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 10000,
        cs: 160,
        visionScore: 38,
        items: [],
      },
      {
        playerId: 'a-mid',
        teamId: awayId,
        gamertag: 'AMid',
        position: 'MID',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 10500,
        cs: 240,
        visionScore: 18,
        items: [],
      },
      {
        playerId: 'a-bot',
        teamId: awayId,
        gamertag: 'ABot',
        position: 'BOT',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 11000,
        cs: 270,
        visionScore: 14,
        items: [],
      },
      {
        playerId: 'a-sup',
        teamId: awayId,
        gamertag: 'ASup',
        position: 'SUPPORT',
        kills: 0,
        deaths: 0,
        assists: 0,
        damageToChamps: 0,
        gold: 7000,
        cs: 35,
        visionScore: 65,
        items: [],
      },
    ],
  };
}

describe('match box score invariants', () => {
  it('手寫 timeline reduce 後通過不變量', () => {
    const box = buildBoxScore(sampleResult());
    expect(validateBoxScore(box)).toEqual([]);
    assertBoxScore(box);
    expect(box.home.kills).toBe(1);
    expect(box.away.deaths).toBe(1);
    expect(box.home.towers).toBe(1);
    expect(box.away.dragons).toBe(1);
    expect(box.home.barons).toBe(1);
    expect(box.winnerTeamId).toBe('home');
    expect(timelineKillDeathBalance(box.timeline)).toBe(true);
  });

  it(
    'live tick 模擬產出的 box score 通過不變量',
    () => {
      const homeId = 'team-home';
      const awayId = 'team-away';
      const positions: PlayerPosition[] = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
      const homePlayers = positions.map((position, index) =>
        makePlayer(`h-${index}`, homeId, `H${position}`, position, 88),
      );
      const awayPlayers = positions.map((position, index) =>
        makePlayer(`a-${index}`, awayId, `A${position}`, position, 80),
      );

      let seed = 42;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
      };

      const report = simulateGame({
        home: { teamId: homeId, players: homePlayers, coach: makeCoach('c-h', homeId) },
        away: { teamId: awayId, players: awayPlayers, coach: makeCoach('c-a', awayId) },
        random,
      });

      expect(validateBoxScore(report.boxScore)).toEqual([]);
      expect(
        report.boxScore.timeline.some((event) => event.type === 'nexus' || event.type === 'surrender'),
      ).toBe(true);
      expect(report.boxScore.goldSeries.length).toBeGreaterThan(5);
      expect(report.boxScore.players).toHaveLength(10);
      expect(report.boxScore).toBeTruthy();
      expect(report.mvp).toBeTruthy();
      expect(report.mvp?.teamId).toBe(report.winnerTeamId);
      expect(report.keyPlayers[0]?.playerId).toBe(report.mvp?.playerId);
    },
    30_000,
  );
});
