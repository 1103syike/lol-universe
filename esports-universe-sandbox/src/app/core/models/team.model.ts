import type { LeagueTier } from './league.model';

export interface Team {
  id: string;
  abbreviation: string;
  name: string;
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
}
