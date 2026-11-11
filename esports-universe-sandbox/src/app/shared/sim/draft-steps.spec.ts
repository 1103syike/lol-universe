import { describe, expect, it } from 'vitest';
import type { Coach } from '../../core/models/coach.model';
import { ATTRIBUTE_KEYS, type Player, type PlayerPosition } from '../../core/models/player.model';
import { prepareV2Match } from '../sim-v2/adapter/from-legacy-input';
import { getVersionPack } from '../sim-v2/version/registry';
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

describe('draft steps timeline', () => {
  it('emits ban then pick steps matching classic BP order and final picks', () => {
    const patch = resolvePatchVersion('2021-02-15');
    const meta = resolvePatchMeta(patch);
    const draft = runClassicDraft({
      home: side('blue'),
      away: side('red'),
      patch,
      meta,
      random: mulberry(11),
    });

    expect(draft.steps.length).toBeGreaterThan(0);
    expect(draft.steps.every((step, index) => step.index === index)).toBe(true);

    const firstBanBlock = draft.steps.filter((step) => step.kind === 'ban').slice(0, 6);
    expect(firstBanBlock.map((step) => step.side)).toEqual([
      'blue',
      'red',
      'blue',
      'red',
      'blue',
      'red',
    ]);

    const pickSteps = draft.steps.filter((step) => step.kind === 'pick');
    const homePickIds = draft.home.picks.map((pick) => pick.championId);
    const awayPickIds = draft.away.picks.map((pick) => pick.championId);
    const steppedHome = pickSteps
      .filter((step) => step.side === 'blue')
      .map((step) => step.pick.championId);
    const steppedAway = pickSteps
      .filter((step) => step.side === 'red')
      .map((step) => step.pick.championId);
    expect(steppedHome).toEqual(homePickIds);
    expect(steppedAway).toEqual(awayPickIds);

    const banIds = draft.steps.filter((step) => step.kind === 'ban').map((step) => step.championId);
    expect(banIds).toEqual(draft.bans.map((ban) => ban.championId));
  });

  it('prepareV2Match keeps steps inside the version pack', () => {
    const pack = getVersionPack('demo-a');
    const allowed = new Set(Object.keys(pack.champions));
    const homePlayers = (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      player(`home-${position}`, 'home', position),
    );
    const awayPlayers = (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      player(`away-${position}`, 'away', position),
    );
    const prepared = prepareV2Match(
      {
        home: { teamId: 'home', players: homePlayers, coach: coach('home') },
        away: { teamId: 'away', players: awayPlayers, coach: coach('away') },
        dateIso: '2021-02-15',
        random: mulberry(21),
      },
      77,
    );

    expect(prepared.steps.length).toBeGreaterThan(0);
    expect(prepared.input.draft?.steps?.length).toBe(prepared.steps.length);
    for (const step of prepared.steps) {
      if (step.kind === 'ban') {
        expect(allowed.has(step.championId)).toBe(true);
      } else {
        expect(allowed.has(step.pick.championId)).toBe(true);
      }
    }
    expect(prepared.input.blue).toHaveLength(5);
    expect(prepared.input.red).toHaveLength(5);
  });
});
