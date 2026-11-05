export interface PlayoffScore {
  winnerTeamId: string;
  loserGames: number;
}

export interface PlayoffProgress {
  seedTeamIds: string[];
  roundOneOpponentId: string | null;
  semiOpponentId: string | null;
  scores: Record<string, PlayoffScore>;
}

export interface PlayoffSide {
  teamId: string;
  seed: number;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  games: number | null;
  isWinner: boolean;
}

export interface PlayoffSeriesView {
  id: string;
  roundLabel: string;
  status: 'pending' | 'ready' | 'done';
  left: PlayoffSide | null;
  right: PlayoffSide | null;
  scoreText: string;
}

export interface PlayoffStandingRow {
  rank: number;
  teamId: string;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  inPlayoff: boolean;
}

export const PLAYOFF_SERIES_IDS = {
  roundOneHigh: 'r1-high',
  roundOneLow: 'r1-low',
  semiOne: 'sf-1',
  semiTwo: 'sf-2',
  final: 'final',
} as const;
