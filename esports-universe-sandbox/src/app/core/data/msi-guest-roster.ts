import type { Coach, CoachAttributes } from '../models/coach.model';
import { COACH_ATTRIBUTE_KEYS } from '../models/coach.model';
import type {
  AttributeKey,
  Player,
  PlayerAttributes,
  PlayerNationality,
  PlayerPosition,
} from '../models/player.model';
import { ATTRIBUTE_KEYS, PLAYER_POSITION_LABELS } from '../models/player.model';
import { suggestRarityFromOvr } from '../models/rarity.model';
import { calculateCoachOvr, calculatePlayerOvr } from '../../shared/utils/player-ovr';
import { clampRating } from '../../shared/utils/rating-scale';
import { MSI_2021_GUESTS, type MsiGuestTeam } from './msi-2021';

type RegionId =
  | 'LCK'
  | 'LPL'
  | 'LEC'
  | 'LCS'
  | 'LJL'
  | 'CBLOL'
  | 'TCL'
  | 'LCO'
  | 'LCL'
  | 'LLA';

interface RegionBand {
  current: number;
  spread: number;
  form: number;
  coach: number;
  nationality: PlayerNationality;
}

interface StarSeed {
  form?: number;
  nationality?: PlayerNationality;
  attributes: Record<AttributeKey, number>;
}

const ROLE_TO_POSITION: Record<string, PlayerPosition> = {
  上路: 'TOP',
  打野: 'JUNGLE',
  中路: 'MID',
  下路: 'BOT',
  輔助: 'SUPPORT',
};

const REGION_BAND: Record<RegionId, RegionBand> = {
  LCK: { current: 96, spread: 4, form: 94, coach: 98, nationality: 'KR' },
  LPL: { current: 94, spread: 4, form: 93, coach: 96, nationality: 'CN' },
  LEC: { current: 90, spread: 4, form: 90, coach: 92, nationality: 'EU' },
  LCS: { current: 86, spread: 4, form: 88, coach: 88, nationality: 'US' },
  LJL: { current: 82, spread: 4, form: 82, coach: 84, nationality: 'KR' },
  CBLOL: { current: 80, spread: 4, form: 80, coach: 82, nationality: 'EU' },
  TCL: { current: 78, spread: 4, form: 78, coach: 80, nationality: 'EU' },
  LCO: { current: 76, spread: 4, form: 76, coach: 78, nationality: 'EU' },
  LCL: { current: 74, spread: 4, form: 74, coach: 76, nationality: 'EU' },
  LLA: { current: 72, spread: 4, form: 72, coach: 74, nationality: 'US' },
};

const ROLE_NUDGE: Record<PlayerPosition, Partial<Record<AttributeKey, number>>> = {
  TOP: { laning: 3, consistency: 2, teamfighting: -1 },
  JUNGLE: { gameSense: 4, adaptability: 2, laning: -2 },
  MID: { mechanics: 3, laning: 2, teamfighting: 1 },
  BOT: { mechanics: 4, laning: 2, consistency: 1 },
  SUPPORT: { gameSense: 3, teamfighting: 2, mechanics: -3, laning: -2 },
};

const STAR_SEEDS: Record<string, StarSeed> = {
  Khan: {
    form: 94,
    nationality: 'KR',
    attributes: {
      laning: 104,
      mechanics: 100,
      teamfighting: 98,
      gameSense: 101,
      consistency: 102,
      adaptability: 96,
    },
  },
  Canyon: {
    form: 97,
    nationality: 'KR',
    attributes: {
      laning: 98,
      mechanics: 108,
      teamfighting: 106,
      gameSense: 110,
      consistency: 104,
      adaptability: 107,
    },
  },
  ShowMaker: {
    form: 97,
    nationality: 'KR',
    attributes: {
      laning: 108,
      mechanics: 110,
      teamfighting: 107,
      gameSense: 106,
      consistency: 105,
      adaptability: 104,
    },
  },
  Ghost: {
    form: 93,
    nationality: 'KR',
    attributes: {
      laning: 100,
      mechanics: 102,
      teamfighting: 101,
      gameSense: 98,
      consistency: 100,
      adaptability: 96,
    },
  },
  BeryL: {
    form: 94,
    nationality: 'KR',
    attributes: {
      laning: 94,
      mechanics: 98,
      teamfighting: 106,
      gameSense: 108,
      consistency: 104,
      adaptability: 102,
    },
  },
  Xiaohu: {
    form: 94,
    nationality: 'CN',
    attributes: {
      laning: 102,
      mechanics: 100,
      teamfighting: 102,
      gameSense: 104,
      consistency: 101,
      adaptability: 100,
    },
  },
  Wei: {
    form: 93,
    nationality: 'CN',
    attributes: {
      laning: 96,
      mechanics: 102,
      teamfighting: 101,
      gameSense: 103,
      consistency: 98,
      adaptability: 100,
    },
  },
  Cryin: {
    form: 92,
    nationality: 'CN',
    attributes: {
      laning: 100,
      mechanics: 102,
      teamfighting: 99,
      gameSense: 98,
      consistency: 97,
      adaptability: 99,
    },
  },
  GALA: {
    form: 95,
    nationality: 'CN',
    attributes: {
      laning: 103,
      mechanics: 106,
      teamfighting: 102,
      gameSense: 99,
      consistency: 100,
      adaptability: 98,
    },
  },
  Ming: {
    form: 94,
    nationality: 'CN',
    attributes: {
      laning: 94,
      mechanics: 98,
      teamfighting: 104,
      gameSense: 105,
      consistency: 102,
      adaptability: 100,
    },
  },
  Armut: {
    form: 90,
    nationality: 'EU',
    attributes: {
      laning: 94,
      mechanics: 92,
      teamfighting: 93,
      gameSense: 92,
      consistency: 94,
      adaptability: 90,
    },
  },
  Elyoya: {
    form: 92,
    nationality: 'EU',
    attributes: {
      laning: 92,
      mechanics: 96,
      teamfighting: 98,
      gameSense: 100,
      consistency: 96,
      adaptability: 97,
    },
  },
  Humanoid: {
    form: 92,
    nationality: 'EU',
    attributes: {
      laning: 98,
      mechanics: 100,
      teamfighting: 96,
      gameSense: 97,
      consistency: 95,
      adaptability: 96,
    },
  },
  Carzzy: {
    form: 91,
    nationality: 'EU',
    attributes: {
      laning: 96,
      mechanics: 99,
      teamfighting: 95,
      gameSense: 92,
      consistency: 94,
      adaptability: 93,
    },
  },
  Kaiser: {
    form: 90,
    nationality: 'EU',
    attributes: {
      laning: 88,
      mechanics: 92,
      teamfighting: 96,
      gameSense: 98,
      consistency: 95,
      adaptability: 94,
    },
  },
  Fudge: {
    form: 88,
    nationality: 'CA',
    attributes: {
      laning: 90,
      mechanics: 88,
      teamfighting: 87,
      gameSense: 89,
      consistency: 90,
      adaptability: 88,
    },
  },
  Blaber: {
    form: 90,
    nationality: 'US',
    attributes: {
      laning: 86,
      mechanics: 92,
      teamfighting: 90,
      gameSense: 93,
      consistency: 88,
      adaptability: 92,
    },
  },
  Perkz: {
    form: 90,
    nationality: 'EU',
    attributes: {
      laning: 92,
      mechanics: 93,
      teamfighting: 91,
      gameSense: 90,
      consistency: 88,
      adaptability: 89,
    },
  },
  Zven: {
    form: 88,
    nationality: 'EU',
    attributes: {
      laning: 90,
      mechanics: 91,
      teamfighting: 89,
      gameSense: 88,
      consistency: 90,
      adaptability: 87,
    },
  },
  Vulcan: {
    form: 88,
    nationality: 'CA',
    attributes: {
      laning: 84,
      mechanics: 88,
      teamfighting: 91,
      gameSense: 92,
      consistency: 90,
      adaptability: 89,
    },
  },
};

const COACH_BY_TEAM: Record<string, string> = {
  dk: 'kkOma',
  rng: 'Poppy-RNG',
  mad: 'Mac',
  c9: 'Mithy',
  dfm: 'Kuri',
  png: 'jokastein',
  iw: 'Doctor',
  pgg: 'Chenyboy',
  uol: 'Invi',
  inf: 'Otto',
};

export interface MsiGuestBundle {
  teamId: string;
  guest: MsiGuestTeam;
  players: Player[];
  coach: Coach;
  teamOvr: number;
}

const bundleCache = new Map<string, MsiGuestBundle>();

export function clearMsiGuestBundleCache(): void {
  bundleCache.clear();
}

function hashTag(tag: string): number {
  let hash = 2166136261;
  for (let index = 0; index < tag.length; index += 1) {
    hash ^= tag.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildAttributes(base: number, position: PlayerPosition, gamertag: string): PlayerAttributes {
  const star = STAR_SEEDS[gamertag];
  if (star) {
    const attributes = {} as PlayerAttributes;
    for (const key of ATTRIBUTE_KEYS) {
      const current = clampRating(star.attributes[key]);
      attributes[key] = {
        current,
        potential: clampRating(current + 4),
        growthRate: 1.05,
      };
    }
    return attributes;
  }

  const seed = hashTag(gamertag);
  const nudge = ROLE_NUDGE[position];
  const attributes = {} as PlayerAttributes;
  ATTRIBUTE_KEYS.forEach((key, index) => {
    const wobble = ((seed >>> ((index + 2) % 16)) + index * 17) % 11 - 5;
    const current = clampRating(base + wobble + (nudge[key] ?? 0));
    attributes[key] = {
      current,
      potential: clampRating(current + 5),
      growthRate: 1.15,
    };
  });
  return attributes;
}

function buildCoachAttributes(base: number, tag: string): CoachAttributes {
  const seed = hashTag(tag);
  const attributes = {} as CoachAttributes;
  COACH_ATTRIBUTE_KEYS.forEach((key, index) => {
    const wobble = ((seed >>> ((index + 4) % 16)) + index * 13) % 9 - 4;
    attributes[key] = clampRating(base + wobble);
  });
  return attributes;
}

function buildPlayer(
  guest: MsiGuestTeam,
  gamertag: string,
  position: PlayerPosition,
  band: RegionBand,
  now: string,
): Player {
  const star = STAR_SEEDS[gamertag];
  const attributes = buildAttributes(band.current, position, gamertag);
  const form = clampRating(star?.form ?? band.form);
  return {
    id: `msi:${guest.id}:${position}`,
    displayName: gamertag,
    gamertag,
    nationality: star?.nationality ?? band.nationality,
    position,
    teamId: guest.id,
    birthday: '1998-01-01',
    rarity: suggestRarityFromOvr(calculatePlayerOvr(attributes, position)),
    attributes,
    form,
    contract: {
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      annualSalary: 2_500_000,
    },
    careerRecords: [],
    createdAt: now,
    updatedAt: now,
  };
}

function buildCoach(guest: MsiGuestTeam, band: RegionBand, now: string): Coach {
  const tag = COACH_BY_TEAM[guest.id] ?? 'GuestHC';
  const attributes = buildCoachAttributes(band.coach, tag);
  return {
    id: `msi:${guest.id}:coach`,
    displayName: tag,
    gamertag: tag,
    nationality: band.nationality,
    teamId: guest.id,
    birthday: '1988-01-01',
    rarity: suggestRarityFromOvr(calculateCoachOvr(attributes)),
    attributes,
    specialties: ['teamfighting', 'gameSense'],
    contract: {
      startDate: '2021-01-01',
      endDate: '2021-12-31',
      annualSalary: 3_000_000,
    },
    careerRecords: [],
    createdAt: now,
    updatedAt: now,
  };
}

function teamAverageOvr(players: Player[]): number {
  if (players.length === 0) {
    return 0;
  }
  const total = players.reduce(
    (sum, player) => sum + calculatePlayerOvr(player.attributes, player.position),
    0,
  );
  return Math.round((total / players.length) * 10) / 10;
}

export function isMsiGuestTeamId(teamId: string): boolean {
  return MSI_2021_GUESTS.some((guest) => guest.id === teamId);
}

export function getMsiGuestBundle(teamId: string): MsiGuestBundle | null {
  if (!teamId) {
    return null;
  }
  const cached = bundleCache.get(teamId);
  if (cached) {
    return cached;
  }
  const guest = MSI_2021_GUESTS.find((item) => item.id === teamId);
  if (!guest) {
    return null;
  }
  const band = REGION_BAND[guest.region as RegionId] ?? REGION_BAND.LLA;
  const now = '2021-05-01T00:00:00.000Z';
  const players = guest.roster.map((row) => {
    const position = ROLE_TO_POSITION[row.role] ?? 'MID';
    return buildPlayer(guest, row.gamertag, position, band, now);
  });
  const coach = buildCoach(guest, band, now);
  const bundle: MsiGuestBundle = {
    teamId: guest.id,
    guest,
    players,
    coach,
    teamOvr: teamAverageOvr(players),
  };
  bundleCache.set(teamId, bundle);
  return bundle;
}

export function msiGuestRosterLines(
  teamId: string,
): Array<{ role: string; gamertag: string; ovr: number }> {
  const bundle = getMsiGuestBundle(teamId);
  if (!bundle) {
    return [];
  }
  return bundle.players.map((player) => ({
    role: PLAYER_POSITION_LABELS[player.position],
    gamertag: player.gamertag,
    ovr: Math.round(calculatePlayerOvr(player.attributes, player.position)),
  }));
}
