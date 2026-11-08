import { ATTRIBUTE_KEYS, type Player, type PlayerPosition } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import { buildTeamProfile } from '../src/app/shared/sim/team-profile.ts';
import { runClassicDraft } from '../src/app/shared/sim/draft.ts';
import { resolvePatchMeta, resolvePatchVersion } from '../src/app/shared/sim/resolve-patch.ts';

function player(
  id: string,
  position: PlayerPosition,
  laning: number,
  mechanics: number,
  teamfighting: number,
  gameSense: number,
): Player {
  const attributes = {} as Player['attributes'];
  for (const key of ATTRIBUTE_KEYS) {
    attributes[key] = { current: 70, potential: 80, growthRate: 1 };
  }
  attributes.laning.current = laning;
  attributes.mechanics.current = mechanics;
  attributes.teamfighting.current = teamfighting;
  attributes.gameSense.current = gameSense;
  attributes.consistency.current = 75;
  attributes.adaptability.current = 72;
  return {
    id,
    displayName: id,
    gamertag: id,
    nationality: 'KR',
    position,
    teamId: 't1',
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

function team(
  teamId: string,
  bias: {
    laning: number;
    mech: number;
    tf: number;
    sense: number;
    draft: number;
    meta: number;
    specs: Coach['specialties'];
  },
) {
  const players = [
    player(`${teamId}-top`, 'TOP', bias.laning, bias.mech, 70, 70),
    player(`${teamId}-jg`, 'JUNGLE', 70, bias.mech, 75, bias.sense),
    player(`${teamId}-mid`, 'MID', bias.laning, bias.mech, 70, bias.sense),
    player(`${teamId}-bot`, 'BOT', bias.laning, bias.mech, 75, 70),
    player(`${teamId}-sup`, 'SUPPORT', 65, 70, bias.tf, bias.sense),
  ];
  const coach: Coach = {
    id: `${teamId}-coach`,
    displayName: 'C',
    gamertag: 'C',
    nationality: 'KR',
    teamId,
    birthday: '1988-01-01',
    rarity: 'gold',
    attributes: {
      draftStrategy: bias.draft,
      metaAdaptation: bias.meta,
      tacticalPlanning: 80,
      teamIntegration: 80,
      inGameLeadership: 80,
      playerDevelopment: 70,
    },
    specialties: bias.specs,
    contract: { startDate: '2021-01-01', endDate: '2022-01-01', annualSalary: 1 },
    careerRecords: [],
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
  };
  return buildTeamProfile(teamId, players, coach, () => 0.4, 1);
}

const home = team('HOME', {
  laning: 95,
  mech: 95,
  tf: 70,
  sense: 70,
  draft: 90,
  meta: 85,
  specs: ['laning', 'mechanics'],
});
const away = team('AWAY', {
  laning: 70,
  mech: 70,
  tf: 95,
  sense: 90,
  draft: 80,
  meta: 80,
  specs: ['teamfighting', 'gameSense'],
});

let i = 0;
const rnd = () => {
  i += 1;
  return (i * 0.17) % 1;
};

for (const date of ['2021-02-01', '2021-05-10', '2021-07-01', '2021-10-15']) {
  const patch = resolvePatchVersion(date);
  const draft = runClassicDraft({
    home,
    away,
    patch,
    meta: resolvePatchMeta(patch),
    random: rnd,
  });
  console.log('---', patch.label, patch.riotPatch);
  console.log('intent', draft.home.intent, '/', draft.away.intent, 'edge', draft.draftEdge);
  console.log('bans', draft.bans.map((b) => b.championId).join(', '));
  console.log(
    'home',
    draft.home.picks.map((p) => `${p.position}:${p.championId}`).join(' | '),
  );
  console.log(
    'away',
    draft.away.picks.map((p) => `${p.position}:${p.championId}`).join(' | '),
  );
}
