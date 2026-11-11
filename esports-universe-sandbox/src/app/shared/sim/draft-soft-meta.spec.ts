import { describe, expect, it } from 'vitest';
import type { Coach } from '../../core/models/coach.model';
import { ATTRIBUTE_KEYS, type Player, type PlayerPosition } from '../../core/models/player.model';
import { getVersionPack } from '../sim-v2/version/registry';
import { mergeVersionPatchMeta } from '../sim-v2/adapter/from-legacy-input';
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

describe('draft soft meta with version pack', () => {
  it('always fills 5+5 from demo-a and keeps a BOT pick after bans', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const pack = getVersionPack('demo-a');
    const allowedChampionIds = new Set(Object.keys(pack.champions));
    const meta = mergeVersionPatchMeta(resolvePatchMeta(patch), 'demo-a');
    const botPool = ['Ashe', 'Jinx', 'Ezreal', 'Jhin'];

    for (let seed = 0; seed < 50; seed += 1) {
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random: mulberry(seed * 19 + 5),
        allowedChampionIds,
      });
      expect(draft.home.picks.length).toBe(5);
      expect(draft.away.picks.length).toBe(5);
      for (const pick of [...draft.home.picks, ...draft.away.picks, ...draft.bans]) {
        expect(allowedChampionIds.has(pick.championId)).toBe(true);
      }
      const homeBot = draft.home.picks.find((pick) => pick.position === 'BOT');
      const awayBot = draft.away.picks.find((pick) => pick.position === 'BOT');
      expect(homeBot).toBeTruthy();
      expect(awayBot).toBeTruthy();
      expect(botPool).toContain(homeBot!.championId);
      expect(botPool).toContain(awayBot!.championId);
      const homeJungle = draft.home.picks.find((pick) => pick.position === 'JUNGLE');
      const awayJungle = draft.away.picks.find((pick) => pick.position === 'JUNGLE');
      expect(homeJungle).toBeTruthy();
      expect(awayJungle).toBeTruthy();
    }
  });

  it('does not ban the last remaining ADC for open BOT lanes', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const pack = getVersionPack('demo-a');
    const allowedChampionIds = new Set(Object.keys(pack.champions));
    const meta = mergeVersionPatchMeta(resolvePatchMeta(patch), 'demo-a');
    const botPool = new Set(['Ashe', 'Jinx', 'Ezreal', 'Jhin']);

    for (let seed = 0; seed < 40; seed += 1) {
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random: mulberry(seed * 41 + 11),
        allowedChampionIds,
      });
      const bannedBots = draft.bans.filter((ban) => botPool.has(ban.championId)).map((ban) => ban.championId);
      expect(bannedBots.length).toBeLessThan(4);
      const pickedBots = [...draft.home.picks, ...draft.away.picks]
        .filter((pick) => pick.position === 'BOT')
        .map((pick) => pick.championId);
      expect(pickedBots.length).toBe(2);
    }
  });
});
