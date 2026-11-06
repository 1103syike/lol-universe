import type { Team } from '../../core/models/team.model';
import type { StorageAdapter } from '../../core/storage/storage.adapter';

const LEAGUES = ['TCS', 'TCL'] as const;

interface FixtureUniverse {
  id: string;
  startYear: number;
  teams: Team[];
}

export function rememberShuffledFixtures(storage: StorageAdapter, universe: FixtureUniverse): void {
  for (const league of LEAGUES) {
    const teamIds = shuffleIds(
      universe.teams.filter((team) => team.leagueTier === league).map((team) => team.id),
    );
    if (teamIds.length < 2) {
      continue;
    }
    storage.setItem(springFixtureKey(universe.startYear, universe.id, league), {
      teamIds,
      scores: {},
      tieScores: {},
      coinOrders: {},
      roundDates: {},
      seasonStart: null,
    });
  }
}

export function shuffleIds(ids: readonly string[]): string[] {
  const next = [...ids];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swapIndex];
    next[swapIndex] = current;
  }
  return next;
}

function springFixtureKey(year: number, universeId: string, league: 'TCS' | 'TCL'): string {
  if (league === 'TCS') {
    return `eus.regular.${year}.spring.${universeId}`;
  }
  return `eus.regular.${year}.spring.${league}.${universeId}`;
}
