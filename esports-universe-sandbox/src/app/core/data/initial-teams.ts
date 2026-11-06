import type { Coach, CoachAttributes } from '../models/coach.model';
import { COACH_ATTRIBUTE_KEYS } from '../models/coach.model';
import type { LeagueTier } from '../models/league.model';
import type { Player, PlayerAttributes, PlayerNationality, PlayerPosition } from '../models/player.model';
import { ATTRIBUTE_KEYS } from '../models/player.model';
import type { Team } from '../models/team.model';
import { clampRating } from '../../shared/utils/create-default-attributes';
import { defaultTeamLogoUrl } from '../../shared/utils/team-logo';

export interface InitialTeamSeed {
  abbreviation: string;
  name: string;
  leagueTier: LeagueTier;
  logoUrl: string;
}

export const DEFAULT_SALARY_CAP = 100_000_000;

const PLAYER_SALARY = 1_800_000;
const COACH_SALARY = 2_200_000;
const ROLES = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const satisfies readonly PlayerPosition[];

type RosterLine = readonly [string, string, string, string, string, string];

interface NamedPlayer {
  gamertag: string;
  birthday?: string;
  nationality?: PlayerNationality;
  position?: PlayerPosition;
}

interface NamedRoster {
  coach?: string;
  players: readonly NamedPlayer[];
}

interface SeedRow {
  abbreviation: string;
  name: string;
  leagueTier: LeagueTier;
  logoUrl?: string;
  roster?: RosterLine | NamedRoster;
}

const SEED_ROWS: SeedRow[] = [
  { abbreviation: 'ahq', name: 'ahq e-Sports Club', leagueTier: 'TCS', roster: {
    players: [
      { gamertag: 'Azhi', birthday: '2001-05-09', position: 'TOP' },
      { gamertag: 'Relic', position: 'JUNGLE' },
      { gamertag: 'Wuji', birthday: '1994-07-02', position: 'MID' },
      { gamertag: 'Apex', birthday: '1996-01-19', position: 'MID' },
      { gamertag: 'Prism', position: 'BOT' },
      { gamertag: 'Quartz', position: 'SUPPORT' },
    ],
  } },
  { abbreviation: 'JT', name: 'CTBC J Team', leagueTier: 'TCS', roster: {
    coach: 'Shuan',
    players: [
      { gamertag: 'Union', birthday: '1998-01-01' },
      { gamertag: 'Doris', birthday: '1999-01-01', nationality: 'KR' },
      { gamertag: 'Chilyz', birthday: '2001-11-03' },
      { gamertag: 'vans', birthday: '2000-01-01' },
      { gamertag: 'Dodo', birthday: '1998-01-01' },
    ],
  } },
  { abbreviation: 'PSG', name: 'PSG Talon', leagueTier: 'TCS', roster: {
    coach: 'Talo',
    players: [
      { gamertag: 'Spear', position: 'TOP' },
      { gamertag: 'River', birthday: '1999-07-23', nationality: 'KR', position: 'JUNGLE' },
      { gamertag: 'Forge', position: 'MID' },
      { gamertag: 'Bolt', position: 'BOT' },
      { gamertag: 'Wing', position: 'SUPPORT' },
    ],
  } },
  { abbreviation: 'GT', name: 'Glitter Tigers', leagueTier: 'TCS', roster: {
    coach: 'Sopchin',
    players: [
      { gamertag: 'Hoshi', birthday: '2000-01-01' },
      { gamertag: 'Angle', birthday: '2001-01-01' },
      { gamertag: 'Ssign', birthday: '2003-01-01' },
      { gamertag: 'Chiayi', birthday: '2002-01-01' },
      { gamertag: 'Yuwen', birthday: '2001-01-01' },
    ],
  } },
  { abbreviation: 'FEG', name: 'Far Eastern Giants', leagueTier: 'TCS', roster: {
    players: [
      { gamertag: 'Kinko', birthday: '2000-01-01' },
      { gamertag: 'Quan', birthday: '2000-01-01' },
      { gamertag: 'Meiji', birthday: '1998-01-01' },
      { gamertag: 'Yan', birthday: '2001-01-01' },
      { gamertag: 'Bien', birthday: '2001-01-01' },
    ],
  } },
  { abbreviation: 'RM', name: 'Rakuten Monkeys', leagueTier: 'TCS', roster: {
    players: [
      { gamertag: 'Diya', birthday: '1999-01-01', nationality: 'KR' },
      { gamertag: 'Luke', birthday: '2002-01-01' },
      { gamertag: 'Nicky', birthday: '1997-01-01' },
      { gamertag: 'Amity', birthday: '2001-01-01' },
      { gamertag: 'Effort', birthday: '1998-01-01', nationality: 'KR' },
    ],
  } },
  { abbreviation: 'WS', name: 'Wayi Spiders', leagueTier: 'TCS', roster: {
    players: [
      { gamertag: 'Unicials', birthday: '1998-01-01' },
      { gamertag: 'Nuz', birthday: '1999-01-01' },
      { gamertag: 'Cassini', birthday: '2000-01-01' },
      { gamertag: 'Lanyz', birthday: '1999-01-01' },
      { gamertag: 'Shields', birthday: '2000-01-01' },
    ],
  } },
  { abbreviation: 'MAD', name: 'MAD Team', leagueTier: 'TCS', roster: ['Hexa', 'Rock', 'Gemini', 'Pulse', 'Bruce', 'Koala'] },
  { abbreviation: 'HKA', name: 'Hong Kong Attitude', leagueTier: 'TCS', roster: ['Atude', 'Zoom', 'Lark', 'Moon', 'MnM', 'Kaix'] },
  { abbreviation: 'DCG', name: 'Deep Cross Gaming', leagueTier: 'TCS', roster: {
    coach: 'Dex',
    players: [
      { gamertag: 'Pika', position: 'TOP' },
      { gamertag: 'Burrow', position: 'JUNGLE' },
      { gamertag: 'Mission', position: 'MID' },
      { gamertag: 'Nestea', position: 'MID' },
      { gamertag: 'Atlen', position: 'BOT' },
      { gamertag: 'Deep', position: 'SUPPORT' },
    ],
  } },
  { abbreviation: 'ONE', name: 'Cathay ONE Team', leagueTier: 'TCL', roster: ['Cath', 'Driver', 'Cube', 'Hong', 'Shunn', 'Kino'] },
  { abbreviation: 'ANK', name: 'ANK Gaming', leagueTier: 'TCL', roster: ['Anko', 'Sez', 'Topz', 'Midk', 'Art', 'Eason'] },
  { abbreviation: 'NVM', name: 'Nova MS', leagueTier: 'TCL', roster: ['Nov', 'Sheng', 'Hole', 'Mist', 'Doggo', 'Yurs'] },
  { abbreviation: 'BMG', name: 'Ban Mei Gaming', leagueTier: 'TCL', roster: {
    coach: 'Banmei',
    players: [
      { gamertag: 'Gunner', position: 'TOP' },
      { gamertag: 'Spider', position: 'JUNGLE' },
      { gamertag: 'Maoan', position: 'MID' },
      { gamertag: 'Flare', position: 'BOT' },
      { gamertag: 'Shell', position: 'SUPPORT' },
    ],
  } },
  { abbreviation: 'GRX', name: 'G-Rex Gaming', leagueTier: 'TCL', roster: {
    coach: 'Rex',
    players: [
      { gamertag: 'Scale', position: 'TOP' },
      { gamertag: 'Hunt', position: 'JUNGLE' },
      { gamertag: 'Gori', nationality: 'KR', position: 'MID' },
      { gamertag: 'Claw', position: 'BOT' },
      { gamertag: 'Tail', position: 'SUPPORT' },
    ],
  } },
  { abbreviation: 'SMG', name: 'Still Moving Under Gunfire', leagueTier: 'TCL', roster: ['Still', 'Moving', 'Under', 'Gunfire', 'Smoke', 'Cover'] },
  { abbreviation: 'BYG', name: 'Beyond Gaming', leagueTier: 'TCL', roster: ['Bay', 'Yon', 'Over', 'Line', 'Edge', 'Limit'] },
  { abbreviation: 'OCE', name: 'Ocean Rovers', leagueTier: 'TCL', roster: ['Tide', 'Wave', 'Reef', 'Coral', 'Drift', 'Harbor'] },
  { abbreviation: 'MCX', name: 'Machi E-Sports', leagueTier: 'TCL', roster: ['Machi', 'Macchi', 'Chi', 'Espo', 'Ort', 'Play'] },
  { abbreviation: 'TXO', name: 'Tongxin', leagueTier: 'TCL', roster: ['Tong', 'Xin', 'Oath', 'Bond', 'Link', 'Pact'] },
];

export const INITIAL_TEAMS: InitialTeamSeed[] = SEED_ROWS.map((row) => ({
  abbreviation: row.abbreviation,
  name: row.name,
  leagueTier: row.leagueTier,
  logoUrl: row.logoUrl ?? defaultTeamLogoUrl(row.abbreviation),
}));

export interface OpeningLeague {
  teams: Team[];
  players: Player[];
  coaches: Coach[];
}

export function buildOpeningLeague(now: string, startYear: number): OpeningLeague {
  const teams: Team[] = [];
  const players: Player[] = [];
  const coaches: Coach[] = [];
  const seen = new Set<string>();

  SEED_ROWS.forEach((row, teamIndex) => {
    const teamId = crypto.randomUUID();
    const roster = row.roster;
    const playerIds: string[] = [];
    let coachId: string | null = null;
    const base = row.leagueTier === 'TCS' ? 76 : 68;

    if (roster) {
      const named = isNamedRoster(roster) ? roster : toNamedRoster(roster, startYear, teamIndex);
      if (named.coach) {
        rememberTag(seen, named.coach);
        const coach = buildCoach(named.coach, teamId, now, startYear, base, teamIndex);
        coachId = coach.id;
        coaches.push(coach);
      }

      if (named.players.length > 7) {
        throw new Error(`${row.abbreviation} 超過 7 名選手`);
      }
      named.players.forEach((seed, roleIndex) => {
        const position = seed.position ?? ROLES[roleIndex];
        rememberTag(seen, seed.gamertag);
        const player = buildPlayer(seed.gamertag, position, teamId, now, startYear, base, teamIndex, roleIndex, seed);
        playerIds.push(player.id);
        players.push(player);
      });
    }

    teams.push({
      id: teamId,
      abbreviation: row.abbreviation,
      name: row.name,
      leagueTier: row.leagueTier,
      salaryCap: DEFAULT_SALARY_CAP,
      logoUrl: row.logoUrl ?? defaultTeamLogoUrl(row.abbreviation),
      coachId,
      playerIds,
      createdAt: now,
      updatedAt: now,
    });
  });

  return { teams, players, coaches };
}

function isNamedRoster(roster: RosterLine | NamedRoster): roster is NamedRoster {
  return !Array.isArray(roster);
}

function toNamedRoster(roster: RosterLine, startYear: number, teamIndex: number): NamedRoster {
  const players = ROLES.map((_, roleIndex) => ({
    gamertag: roster[roleIndex + 1],
    birthday: birthday(startYear, teamIndex * 6 + roleIndex),
  }));
  return {
    coach: roster[0],
    players: [players[0], players[1], players[2], players[3], players[4]],
  };
}

function rememberTag(seen: Set<string>, tag: string): void {
  const key = tag.toLowerCase();
  if (seen.has(key)) {
    throw new Error(`預設選手 ID 重複：${tag}`);
  }
  seen.add(key);
}

function buildPlayer(
  tag: string,
  position: PlayerPosition,
  teamId: string,
  now: string,
  startYear: number,
  base: number,
  teamIndex: number,
  roleIndex: number,
  seed?: NamedPlayer,
): Player {
  return {
    id: crypto.randomUUID(),
    displayName: tag,
    gamertag: tag,
    nationality: seed?.nationality ?? 'TW',
    position,
    teamId,
    birthday: seed?.birthday ?? birthday(startYear, teamIndex * 6 + roleIndex),
    attributes: playerAttributes(base, teamIndex + roleIndex),
    form: clampRating(base - 4),
    contract: contract(startYear, PLAYER_SALARY),
    careerRecords: [],
    createdAt: now,
    updatedAt: now,
  };
}

function buildCoach(
  tag: string,
  teamId: string,
  now: string,
  startYear: number,
  base: number,
  teamIndex: number,
): Coach {
  return {
    id: crypto.randomUUID(),
    displayName: tag,
    gamertag: tag,
    nationality: 'TW',
    teamId,
    birthday: birthday(startYear, teamIndex * 6 + 5),
    attributes: coachAttributes(base + 2, teamIndex),
    specialties: ['teamfighting', 'gameSense'],
    contract: contract(startYear, COACH_SALARY),
    careerRecords: [],
    createdAt: now,
    updatedAt: now,
  };
}

function playerAttributes(base: number, salt: number): PlayerAttributes {
  const attributes = {} as PlayerAttributes;
  ATTRIBUTE_KEYS.forEach((key, index) => {
    const current = clampRating(base + ((salt + index * 3) % 9) - 4);
    attributes[key] = {
      current,
      potential: clampRating(current + 8),
      growthRate: 1,
    };
  });
  return attributes;
}

function coachAttributes(base: number, salt: number): CoachAttributes {
  const attributes = {} as CoachAttributes;
  COACH_ATTRIBUTE_KEYS.forEach((key, index) => {
    attributes[key] = clampRating(base + ((salt + index) % 5) - 2);
  });
  return attributes;
}

function contract(startYear: number, annualSalary: number) {
  return {
    startDate: `${startYear}-01-01`,
    endDate: `${startYear}-12-31`,
    annualSalary,
  };
}

function birthday(startYear: number, index: number): string {
  const year = startYear - 22 - (index % 5);
  const month = String((index % 12) + 1).padStart(2, '0');
  const day = String((index % 27) + 1).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
