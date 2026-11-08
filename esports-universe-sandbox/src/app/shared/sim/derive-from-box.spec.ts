import { describe, expect, it } from 'vitest';
import { buildMatchDigest, buildMatchReplayLog } from './derive-from-box';
import type { MatchBoxScore, TimelineEvent } from './match-stats';

function event(partial: Partial<TimelineEvent> & Pick<TimelineEvent, 't' | 'type' | 'summary'>): TimelineEvent {
  return {
    id: partial.id ?? `ev-${partial.t}-${partial.type}`,
    phase: partial.phase ?? 'early',
    teamId: partial.teamId ?? 'home',
    payload: partial.payload,
    actorPlayerId: partial.actorPlayerId,
    victimPlayerId: partial.victimPlayerId,
    assistPlayerIds: partial.assistPlayerIds,
    ...partial,
  };
}

describe('buildMatchDigest', () => {
  it('故事依分鐘摘要排列，小龍早於一血', () => {
    const box = {
      homeTeamId: 'home',
      awayTeamId: 'away',
      winnerTeamId: 'home',
      durationSec: 20 * 60,
      home: { kills: 5, deaths: 1 },
      away: { kills: 1, deaths: 5 },
      players: [
        {
          playerId: 'p1',
          teamId: 'home',
          gamertag: 'Hoshi',
          position: 'TOP',
        },
        {
          playerId: 'p2',
          teamId: 'away',
          gamertag: 'Azhi',
          position: 'TOP',
        },
      ],
      timeline: [
        event({
          t: 5 * 60 + 24,
          type: 'dragon',
          teamId: 'home',
          summary: '5:24 · 小龍',
        }),
        event({
          t: 6 * 60 + 44,
          type: 'first-blood',
          teamId: 'home',
          actorPlayerId: 'p1',
          victimPlayerId: 'p2',
          summary: '6:44 · First Blood',
          payload: { killContext: 'lane', fightLane: 'top' },
        }),
        event({
          t: 12 * 60,
          type: 'nexus',
          teamId: 'home',
          summary: '12:00 · 比賽結束',
        }),
      ],
    } as MatchBoxScore;

    const digest = buildMatchDigest(box, { home: 'GT', away: 'ahq' });
    const dragonAt = digest.findIndex((line) => line.includes('5分鐘') && line.includes('小龍'));
    const fbAt = digest.findIndex((line) => line.includes('6分鐘') && line.includes('一血'));
    expect(dragonAt).toBeGreaterThanOrEqual(0);
    expect(fbAt).toBeGreaterThan(dragonAt);
    expect(digest[fbAt]).toContain('Hoshi');
    expect(digest[fbAt]).toContain('Azhi');
  });

  it('團戰帶畫面感，擊殺寫選手名，巴龍有原因', () => {
    const box = {
      homeTeamId: 'home',
      awayTeamId: 'away',
      winnerTeamId: 'away',
      durationSec: 30 * 60,
      home: { kills: 2, deaths: 5 },
      away: { kills: 5, deaths: 2 },
      players: [
        { playerId: 'xin', teamId: 'away', gamertag: 'Xin', position: 'JUNGLE' },
        { playerId: 'oath', teamId: 'away', gamertag: 'Oath', position: 'SUPPORT' },
        { playerId: 'smoke', teamId: 'home', gamertag: 'Smoke', position: 'MID' },
        { playerId: 'a2', teamId: 'home', gamertag: 'Kai', position: 'BOT' },
        { playerId: 'a3', teamId: 'home', gamertag: 'Bo', position: 'TOP' },
      ],
      timeline: [
        event({
          t: 19 * 60,
          type: 'kill',
          teamId: 'away',
          actorPlayerId: 'xin',
          victimPlayerId: 'smoke',
          assistPlayerIds: ['oath'],
          summary: 'kill',
          payload: { killContext: 'dragon', fightLane: 'river' },
        }),
        event({
          t: 19 * 60 + 8,
          type: 'kill',
          teamId: 'away',
          actorPlayerId: 'xin',
          victimPlayerId: 'a2',
          summary: 'kill',
          payload: { killContext: 'dragon', fightLane: 'river' },
        }),
        event({
          t: 19 * 60 + 12,
          type: 'kill',
          teamId: 'home',
          actorPlayerId: 'a3',
          victimPlayerId: 'oath',
          summary: 'kill',
          payload: { killContext: 'dragon', fightLane: 'river' },
        }),
        event({
          t: 19 * 60 + 20,
          type: 'dragon',
          teamId: 'away',
          summary: 'dragon',
        }),
        event({
          t: 20 * 60 + 30,
          type: 'kill',
          teamId: 'away',
          actorPlayerId: 'xin',
          victimPlayerId: 'smoke',
          summary: 'pick',
          payload: { killContext: 'gank', fightLane: 'mid' },
        }),
        event({
          t: 20 * 60 + 50,
          type: 'baron',
          teamId: 'away',
          summary: 'baron',
        }),
        event({
          t: 30 * 60,
          type: 'nexus',
          teamId: 'away',
          summary: 'end',
        }),
      ],
    } as MatchBoxScore;

    const digest = buildMatchDigest(box, { home: 'TXO', away: 'SMG' });
    const dragonFight = digest.find((line) => line.includes('19分鐘'));
    expect(dragonFight).toBeTruthy();
    expect(dragonFight).toMatch(/龍|河道|敢打|拉扯|硬剛/);
    expect(dragonFight).toContain('Xin');
    expect(dragonFight).toContain('Smoke');
    expect(dragonFight).toMatch(/1換2|2換1/);
    expect(dragonFight).toContain('小龍');

    const baron = digest.find((line) => line.includes('巴龍'));
    expect(baron).toBeTruthy();
    expect(baron).not.toBe('20分鐘，SMG拿下巴龍');
    expect(baron).toMatch(/轉巴龍|強開巴龍|偷|空窗|人數/);
  });
});

describe('buildMatchReplayLog', () => {
  it('列出誰殺誰與助攻', () => {
    const box = {
      homeTeamId: 'home',
      awayTeamId: 'away',
      winnerTeamId: 'home',
      durationSec: 10 * 60,
      home: { kills: 1, deaths: 0 },
      away: { kills: 0, deaths: 1 },
      players: [
        { playerId: 'p1', teamId: 'home', gamertag: 'Hoshi', position: 'TOP' },
        { playerId: 'p2', teamId: 'away', gamertag: 'Azhi', position: 'TOP' },
        { playerId: 'p3', teamId: 'home', gamertag: 'Nana', position: 'SUPPORT' },
      ],
      timeline: [
        event({
          t: 6 * 60 + 44,
          type: 'first-blood',
          teamId: 'home',
          actorPlayerId: 'p1',
          victimPlayerId: 'p2',
          assistPlayerIds: ['p3'],
          summary: '6:44 · First Blood',
        }),
      ],
    } as MatchBoxScore;

    const log = buildMatchReplayLog(box, { home: 'GT', away: 'ahq' });
    expect(log[0]?.text).toContain('Hoshi');
    expect(log[0]?.text).toContain('Azhi');
    expect(log[0]?.text).toContain('助攻：Nana');
    expect(log[0]?.killer?.gamertag).toBe('Hoshi');
    expect(log[0]?.victim?.gamertag).toBe('Azhi');
    expect(log[0]?.assists.map((item) => item.gamertag)).toEqual(['Nana']);
    expect(log[0]?.icon).toBe('kill');
  });
});
