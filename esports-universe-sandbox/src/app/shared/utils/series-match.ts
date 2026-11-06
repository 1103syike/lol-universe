import type { PlayoffScore, PlayoffSeriesView, PlayoffSide, PlayoffStandingRow } from '../../core/models/playoff-board.model';

const SERIES_WIN_GAMES = 3;

export function seriesView(
  scores: Record<string, PlayoffScore>,
  id: string,
  roundLabel: string,
  left: PlayoffStandingRow | PlayoffSide | null,
  right: PlayoffStandingRow | PlayoffSide | null,
): PlayoffSeriesView {
  const score = scores[id];
  const leftSide = left ? toSide(left, score?.winnerTeamId ?? null, score?.loserGames ?? null) : null;
  const rightSide = right ? toSide(right, score?.winnerTeamId ?? null, score?.loserGames ?? null) : null;
  const status = score ? 'done' : leftSide && rightSide ? 'ready' : 'pending';
  const scoreText =
    status === 'done' && leftSide && rightSide
      ? `${leftSide.games ?? 0} - ${rightSide.games ?? 0}`
      : status === 'ready'
        ? '選擇勝方'
        : '待定';
  return { id, roundLabel, status, left: leftSide, right: rightSide, scoreText };
}

export function winningSide(match: PlayoffSeriesView | undefined): PlayoffSide | null {
  if (match?.left?.isWinner) {
    return match.left;
  }
  if (match?.right?.isWinner) {
    return match.right;
  }
  return null;
}

export function losingSide(match: PlayoffSeriesView | undefined): PlayoffSide | null {
  if (!match?.left?.isWinner && !match?.right?.isWinner) {
    return null;
  }
  return match?.left?.isWinner ? (match.right ?? null) : (match?.left ?? null);
}

function toSide(
  seed: PlayoffStandingRow | PlayoffSide,
  winnerTeamId: string | null,
  loserGames: number | null,
): PlayoffSide {
  const rank = 'rank' in seed ? seed.rank : seed.seed;
  const isWinner = winnerTeamId === seed.teamId;
  return {
    teamId: seed.teamId,
    seed: rank,
    abbreviation: seed.abbreviation,
    name: seed.name,
    logoUrl: seed.logoUrl,
    games: winnerTeamId ? (isWinner ? SERIES_WIN_GAMES : loserGames) : null,
    isWinner,
  };
}
