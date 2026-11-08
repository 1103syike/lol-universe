import type { LeagueTier } from './league.model';

export const TITLE_SPONSOR_SIDES = ['prefix', 'suffix'] as const;

export type TitleSponsorSide = (typeof TITLE_SPONSOR_SIDES)[number];

export interface Team {
  id: string;
  abbreviation: string;
  name: string;
  titleSponsor: string | null;
  titleSponsorSide: TitleSponsorSide | null;
  leagueTier: LeagueTier;
  salaryCap: number;
  logoUrl: string | null;
  coachId: string | null;
  playerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamInput {
  abbreviation: string;
  name: string;
  leagueTier: LeagueTier;
  salaryCap: number;
  logoUrl: string | null;
  titleSponsor?: string | null;
  titleSponsorSide?: TitleSponsorSide | null;
}

export function teamDisplayName(team: Pick<Team, 'name' | 'titleSponsor' | 'titleSponsorSide'>): string {
  const sponsor = team.titleSponsor?.trim() ?? '';
  if (!sponsor || !team.titleSponsorSide) {
    return team.name;
  }
  const baseName = stripEmbeddedTitleSponsor(team.name, sponsor, team.titleSponsorSide);
  return team.titleSponsorSide === 'prefix' ? `${sponsor} ${baseName}` : `${baseName} ${sponsor}`;
}

export function stripEmbeddedTitleSponsor(
  name: string,
  sponsor: string | null,
  side: TitleSponsorSide | null,
): string {
  const raw = name.trim();
  const brand = sponsor?.trim() ?? '';
  if (!raw || !brand || !side) {
    return raw;
  }

  let next = raw;
  if (side === 'prefix') {
    const token = `${brand} `;
    while (next === brand || next.startsWith(token)) {
      next = next === brand ? '' : next.slice(token.length).trimStart();
    }
    return next || raw;
  }

  const token = ` ${brand}`;
  while (next === brand || next.endsWith(token)) {
    next = next === brand ? '' : next.slice(0, -token.length).trimEnd();
  }
  return next || raw;
}
