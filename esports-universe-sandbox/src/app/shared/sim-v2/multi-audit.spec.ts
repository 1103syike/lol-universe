import { describe, expect, it } from 'vitest';
import type { Player } from '../../core/models/player.model';
import { buildMatchDigest } from '../sim/derive-from-box';
import { simulateGame } from '../sim/match-engine';

function fakePlayer(id: string, position: Player['position'], teamId: string): Player {
  const attr = (n: number) => ({ current: n, potential: n, growthRate: 0 });
  return {
    id,
    gamertag: id,
    realName: id,
    teamId,
    position,
    nationality: 'TW',
    age: 20,
    form: 72,
    morale: 70,
    rarity: 'rare',
    fatigue: 0,
    attributes: {
      laning: attr(70),
      mechanics: attr(70),
      teamfighting: attr(70),
      gameSense: attr(70),
      consistency: attr(70),
      adaptability: attr(70),
    },
  } as Player;
}

function side(teamId: string) {
  return {
    teamId,
    coach: null,
    players: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      fakePlayer(`${teamId}_${position}`, position, teamId),
    ),
  };
}

describe('multi run audit', () => {
  it('keeps BP and varied picks across seeds', () => {
    const pickSets = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5]) {
      let s = seed * 1000;
      const rng = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
      };
      const report = simulateGame({
        home: side('H'),
        away: side('A'),
        random: rng,
        dateIso: '2024-06-01',
      });
      const bans = report.draft.bans.map((ban) => ban.championId);
      const homePicks = report.draft.home.picks.map((pick) => `${pick.position}:${pick.championId}`);
      const awayPicks = report.draft.away.picks.map((pick) => `${pick.position}:${pick.championId}`);
      const key = [...homePicks, ...awayPicks].join('|');
      pickSets.add(key);
      // eslint-disable-next-line no-console
      console.log(
        'seed',
        seed,
        'bans',
        bans.length,
        bans.slice(0, 6).join(','),
        'home',
        homePicks.join(' '),
        'away',
        awayPicks.join(' '),
        'K',
        report.boxScore.home.kills,
        report.boxScore.away.kills,
        'Dmg',
        report.boxScore.players.reduce((sum, player) => sum + player.damageToChamps, 0),
      );
      expect(report.draft.bans.length).toBeGreaterThanOrEqual(10);
      expect(report.draft.home.picks).toHaveLength(5);
      expect(report.draft.away.picks).toHaveLength(5);
      expect(homePicks.join(' ')).not.toBe(
        'TOP:Garen JUNGLE:LeeSin MID:Annie BOT:Ashe SUPPORT:Thresh',
      );
      const rosterChamps = report.boxScore.players.map((player) => {
        const pick = [...report.draft.home.picks, ...report.draft.away.picks].find(
          (entry) => entry.playerId === player.playerId,
        );
        return pick?.championId ?? null;
      });
      expect(rosterChamps.every(Boolean)).toBe(true);
      const totalKills = report.boxScore.home.kills + report.boxScore.away.kills;
      expect(totalKills).toBe(report.boxScore.home.deaths + report.boxScore.away.deaths);
      expect(report.advantageSummary.length).toBeGreaterThan(8);
      expect(report.decisiveSummary.length).toBeGreaterThan(8);
      expect(report.phases.length).toBe(4);
      const digest = buildMatchDigest(report.boxScore, { home: 'H', away: 'A' });
      // eslint-disable-next-line no-console
      console.log('story', digest.join(' / '));
      expect(digest.length).toBeGreaterThan(1);
      expect(digest.some((line) => line.includes('主堡') || line.includes('結束'))).toBe(true);
    }
    expect(pickSets.size).toBeGreaterThan(1);
  }, 300_000);
});
