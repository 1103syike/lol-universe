import type { Coach } from './coach.model';
import type { Player } from './player.model';
import type { Team } from './team.model';
import type { TeamTimelineEvent } from './team-timeline.model';

export const MIN_UNIVERSE_START_YEAR = 2021;

export function buildUniverseStartYears(maxYear = new Date().getFullYear() + 10): number[] {
  const years: number[] = [];
  for (let year = maxYear; year >= MIN_UNIVERSE_START_YEAR; year -= 1) {
    years.push(year);
  }
  return years;
}

export function isValidUniverseStartYear(year: number): boolean {
  return Number.isInteger(year) && year >= MIN_UNIVERSE_START_YEAR;
}

export function universeDateFromStartYear(startYear: number): string {
  return `${startYear}-01-01`;
}

export interface UniverseSummary {
  id: string;
  name: string;
  startYear: number;
  createdAt: string;
  updatedAt: string;
}

export interface UniverseData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  startYear: number;
  currentDate: string;
  seedPowerRevision?: number;
  teams: Team[];
  players: Player[];
  coaches: Coach[];
  teamEvents: TeamTimelineEvent[];
  hiddenTimelineIds: string[];
}

export interface UniverseStoreSnapshot {
  activeUniverseId: string | null;
  universes: UniverseSummary[];
}
