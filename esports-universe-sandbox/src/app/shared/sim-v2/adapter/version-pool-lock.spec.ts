import { describe, expect, it } from 'vitest';
import { ATTRIBUTE_KEYS, type Player, type PlayerPosition } from '../../../core/models/player.model';
import type { Coach } from '../../../core/models/coach.model';
import { runClassicDraft } from '../../sim/draft';
import { hasChampionMetaEntry, resolvePatchMeta, resolvePatchVersion } from '../../sim/resolve-patch';
import { buildTeamProfile } from '../../sim/team-profile';
import { getVersionPack } from '../version/registry';
import { buildV2Input, mergeVersionPatchMeta } from './from-legacy-input';

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

describe('version pack champion lock', () => {
  it('keeps Samira in 2021 meta but blocks her when demo-a pack is the allowed pool', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const meta = resolvePatchMeta(patch);
    expect(hasChampionMetaEntry(meta, 'Samira')).toBe(true);

    const pack = getVersionPack('demo-a');
    expect(pack.champions.Samira).toBeUndefined();
    const allowedChampionIds = new Set(Object.keys(pack.champions));

    for (let seed = 0; seed < 25; seed += 1) {
      let cursor = seed + 1;
      const random = () => {
        cursor = (cursor * 1103515245 + 12345) % 2147483648;
        return cursor / 2147483648;
      };
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random,
        allowedChampionIds,
      });
      expect(draft.home.picks.length).toBe(5);
      expect(draft.away.picks.length).toBe(5);
      for (const pick of [...draft.home.picks, ...draft.away.picks, ...draft.bans]) {
        expect(allowedChampionIds.has(pick.championId), pick.championId).toBe(true);
      }
    }
  });

  it('buildV2Input never ships champions missing from the locked version pack', () => {
    const homePlayers = (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      player(`home-${position}`, 'home', position),
    );
    const awayPlayers = (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      player(`away-${position}`, 'away', position),
    );
    let cursor = 17;
    const random = () => {
      cursor = (cursor * 1103515245 + 12345) % 2147483648;
      return cursor / 2147483648;
    };
    const input = buildV2Input(
      {
        home: { teamId: 'home', players: homePlayers, coach: coach('home') },
        away: { teamId: 'away', players: awayPlayers, coach: coach('away') },
        dateIso: '2021-02-15',
        random,
      },
      99,
    );
    const pack = getVersionPack(input.versionId);
    const allowed = new Set(Object.keys(pack.champions));
    for (const row of [...input.blue, ...input.red]) {
      expect(allowed.has(row.championId), row.championId).toBe(true);
    }
    if (input.draft) {
      expect(input.draft.home.picks.length).toBe(5);
      expect(input.draft.away.picks.length).toBe(5);
      for (const pick of [...input.draft.home.picks, ...input.draft.away.picks, ...input.draft.bans]) {
        expect(allowed.has(pick.championId), pick.championId).toBe(true);
      }
    }
  });

  it('allows pack champions missing from raw LCK meta after soft merge', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const base = resolvePatchMeta(patch);
    expect(hasChampionMetaEntry(base, 'Zed')).toBe(false);
    const meta = mergeVersionPatchMeta(base, 'demo-a');
    expect(hasChampionMetaEntry(meta, 'Zed')).toBe(true);
    expect(meta.Zed.presence).toBeLessThan(0.05);

    const pack = getVersionPack('demo-a');
    const allowedChampionIds = new Set(Object.keys(pack.champions));
    for (let seed = 0; seed < 40; seed += 1) {
      let cursor = seed * 13 + 7;
      const random = () => {
        cursor = (cursor * 1103515245 + 12345) % 2147483648;
        return cursor / 2147483648;
      };
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random,
        allowedChampionIds,
      });
      expect(draft.home.picks.length).toBe(5);
      expect(draft.away.picks.length).toBe(5);
      for (const pick of [...draft.home.picks, ...draft.away.picks]) {
        expect(allowedChampionIds.has(pick.championId)).toBe(true);
      }
    }
  });

  it('2021-spring pack drafts stay in real LCK pool and favor meta staples', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const pack = getVersionPack('2021-spring');
    const allowedChampionIds = new Set(Object.keys(pack.champions));
    const meta = mergeVersionPatchMeta(resolvePatchMeta(patch), '2021-spring');
    expect(allowedChampionIds.has('Zed')).toBe(false);
    expect(allowedChampionIds.has('Gnar')).toBe(true);
    expect(allowedChampionIds.has('Kaisa')).toBe(true);
    expect(allowedChampionIds.has('Rell')).toBe(true);

    let gnarOrRenektonPresence = 0;
    let kaisaPresence = 0;
    let rellOrAlistarPresence = 0;
    let kaisaPicks = 0;

    for (let seed = 0; seed < 60; seed += 1) {
      let cursor = seed * 17 + 3;
      const random = () => {
        cursor = (cursor * 1103515245 + 12345) % 2147483648;
        return cursor / 2147483648;
      };
      const draft = runClassicDraft({
        home: side('blue'),
        away: side('red'),
        patch,
        meta,
        random,
        allowedChampionIds,
      });
      expect(draft.home.picks.length).toBe(5);
      expect(draft.away.picks.length).toBe(5);
      const seen = new Set<string>();
      for (const entry of [...draft.home.picks, ...draft.away.picks, ...draft.bans]) {
        expect(allowedChampionIds.has(entry.championId), entry.championId).toBe(true);
        expect(entry.championId).not.toBe('Zed');
        seen.add(entry.championId);
      }
      if (seen.has('Gnar') || seen.has('Renekton')) {
        gnarOrRenektonPresence += 1;
      }
      if (seen.has('Kaisa')) {
        kaisaPresence += 1;
      }
      if (seen.has('Rell') || seen.has('Alistar')) {
        rellOrAlistarPresence += 1;
      }
      for (const pick of [...draft.home.picks, ...draft.away.picks]) {
        if (pick.championId === 'Kaisa') {
          kaisaPicks += 1;
        }
      }
    }

    expect(gnarOrRenektonPresence).toBeGreaterThan(40);
    expect(kaisaPresence).toBeGreaterThan(35);
    expect(rellOrAlistarPresence).toBeGreaterThan(35);
    expect(kaisaPicks).toBeGreaterThan(20);
  });

  it('buildV2Input on 2021 date locks 2021-spring and never ships Zed', () => {
    const homePlayers = (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      player(`home-${position}`, 'home', position),
    );
    const awayPlayers = (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      player(`away-${position}`, 'away', position),
    );
    let cursor = 41;
    const random = () => {
      cursor = (cursor * 1103515245 + 12345) % 2147483648;
      return cursor / 2147483648;
    };
    const input = buildV2Input(
      {
        home: { teamId: 'home', players: homePlayers, coach: coach('home') },
        away: { teamId: 'away', players: awayPlayers, coach: coach('away') },
        dateIso: '2021-02-15',
        random,
      },
      2021,
    );
    expect(input.versionId).toBe('2021-spring');
    const pack = getVersionPack(input.versionId);
    const allowed = new Set(Object.keys(pack.champions));
    for (const row of [...input.blue, ...input.red]) {
      expect(allowed.has(row.championId), row.championId).toBe(true);
      expect(row.championId).not.toBe('Zed');
    }
    for (const pick of [...input.draft!.home.picks, ...input.draft!.away.picks, ...input.draft!.bans]) {
      expect(allowed.has(pick.championId), pick.championId).toBe(true);
      expect(pick.championId).not.toBe('Zed');
    }
  });
});
