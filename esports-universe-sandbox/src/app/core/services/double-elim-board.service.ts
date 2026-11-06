import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  PlayoffProgress,
  PlayoffSeriesView,
  PlayoffSide,
  PlayoffStandingRow,
} from '../models/playoff-board.model';
import type { Team } from '../models/team.model';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

const PLAYOFF_TEAM_COUNT = 6;
const SERIES_WIN_GAMES = 3;

const SERIES = {
  roundOneHigh: 'r1-high',
  roundOneLow: 'r1-low',
  roundTwoHigh: 'r2-high',
  roundTwoLow: 'r2-low',
  winnersFinal: 'winners-final',
  losersRound: 'losers-r1',
  losersFinal: 'losers-final',
  grandFinal: 'grand-final',
} as const;

const LATER_SERIES: Record<string, string[]> = {
  [SERIES.roundOneHigh]: [
    SERIES.roundTwoHigh,
    SERIES.roundTwoLow,
    SERIES.winnersFinal,
    SERIES.losersRound,
    SERIES.losersFinal,
    SERIES.grandFinal,
  ],
  [SERIES.roundOneLow]: [
    SERIES.roundTwoHigh,
    SERIES.roundTwoLow,
    SERIES.winnersFinal,
    SERIES.losersRound,
    SERIES.losersFinal,
    SERIES.grandFinal,
  ],
  [SERIES.roundTwoHigh]: [SERIES.winnersFinal, SERIES.losersRound, SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.roundTwoLow]: [SERIES.winnersFinal, SERIES.losersRound, SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.winnersFinal]: [SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.losersRound]: [SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.losersFinal]: [SERIES.grandFinal],
};

@Injectable({ providedIn: 'root' })
export class DoubleElimBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly progressRevision = signal(0);
  private readonly league = signal<'TCS' | 'TCL'>('TCS');

  readonly activeLeague = this.league.asReadonly();

  setLeague(league: 'TCS' | 'TCL'): void {
    this.league.set(league);
    this.progressRevision.update((value) => value + 1);
  }

  readonly progress = computed(() => {
    this.progressRevision();
    this.league();
    const universeId = this.universeService.activeUniverseId();
    const teams = this.teams();
    if (!universeId) {
      return this.emptyProgress([]);
    }
    return this.readProgress(universeId, teams);
  });

  readonly standings = computed((): PlayoffStandingRow[] => {
    const teams = this.teams();
    const seedIds = this.progress().seedTeamIds;
    const ordered = seedIds
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter((team): team is Team => !!team);
    const rest = teams.filter((team) => !seedIds.includes(team.id));

    return [...ordered, ...rest].map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      logoUrl: team.logoUrl,
      inPlayoff: index < PLAYOFF_TEAM_COUNT,
    }));
  });

  readonly seeds = computed(() => this.standings().slice(0, PLAYOFF_TEAM_COUNT));
  readonly series = computed((): PlayoffSeriesView[] => this.buildSeries());
  readonly schedule = computed(() =>
    this.series().map((series) => ({
      id: series.id,
      roundLabel: series.roundLabel,
      matchup: this.matchupLabel(series),
      scoreText: series.scoreText,
      statusLabel: this.statusLabel(series.status),
    })),
  );
  readonly champion = computed(() => {
    const final = this.series().find((series) => series.id === SERIES.grandFinal);
    if (final?.left?.isWinner) {
      return final.left.abbreviation;
    }
    if (final?.right?.isWinner) {
      return final.right.abbreviation;
    }
    return null;
  });

  moveSeed(teamId: string, direction: -1 | 1): void {
    const progress = this.progress();
    if (progress.roundOneOpponentId || Object.keys(progress.scores).length > 0) {
      return;
    }

    const seedTeamIds = [...progress.seedTeamIds];
    const index = seedTeamIds.indexOf(teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= seedTeamIds.length) {
      return;
    }

    const swapped = seedTeamIds[nextIndex];
    seedTeamIds[nextIndex] = seedTeamIds[index];
    seedTeamIds[index] = swapped;
    this.writeProgress({ ...progress, seedTeamIds });
  }

  pickRoundOneOpponent(teamId: string): void {
    const fifth = this.seeds()[4];
    const sixth = this.seeds()[5];
    if (!fifth || !sixth || (teamId !== fifth.teamId && teamId !== sixth.teamId)) {
      return;
    }

    this.writeProgress({
      ...this.progress(),
      roundOneOpponentId: teamId,
      semiOpponentId: null,
      scores: {},
    });
  }

  pickRoundTwoOpponent(teamId: string): void {
    const winners = this.roundOneWinnerIds();
    if (winners.length < 2 || !winners.includes(teamId)) {
      return;
    }

    const scores = { ...this.progress().scores };
    for (const seriesId of LATER_SERIES[SERIES.roundTwoHigh]) {
      delete scores[seriesId];
    }
    delete scores[SERIES.roundTwoHigh];
    delete scores[SERIES.roundTwoLow];

    this.writeProgress({
      ...this.progress(),
      semiOpponentId: teamId,
      scores,
    });
  }

  setWinner(seriesId: string, teamId: string): void {
    const series = this.series().find((item) => item.id === seriesId);
    if (!series || series.status !== 'ready') {
      return;
    }
    if (series.left?.teamId !== teamId && series.right?.teamId !== teamId) {
      return;
    }

    const progress = this.progress();
    const scores = {
      ...progress.scores,
      [seriesId]: { winnerTeamId: teamId, loserGames: 1 },
    };
    for (const laterId of LATER_SERIES[seriesId] ?? []) {
      delete scores[laterId];
    }
    const semiOpponentId =
      seriesId === SERIES.roundOneHigh || seriesId === SERIES.roundOneLow ? null : progress.semiOpponentId;
    this.writeProgress({ ...progress, semiOpponentId, scores });
  }

  setLoserGames(seriesId: string, loserGames: number): void {
    const current = this.progress().scores[seriesId];
    if (!current) {
      return;
    }

    const games = Math.min(2, Math.max(0, Math.round(loserGames)));
    this.writeProgress({
      ...this.progress(),
      scores: {
        ...this.progress().scores,
        [seriesId]: { ...current, loserGames: games },
      },
    });
  }

  reset(): void {
    this.writeProgress(this.emptyProgress(this.teams().map((team) => team.id)));
  }

  private buildSeries(): PlayoffSeriesView[] {
    const seeds = this.seeds();
    if (seeds.length < PLAYOFF_TEAM_COUNT) {
      return [];
    }

    const progress = this.progress();
    const third = seeds[2];
    const fourth = seeds[3];
    const fifth = seeds[4];
    const sixth = seeds[5];
    const picked =
      progress.roundOneOpponentId === fifth.teamId
        ? fifth
        : progress.roundOneOpponentId === sixth.teamId
          ? sixth
          : null;
    const other = picked?.teamId === fifth.teamId ? sixth : picked ? fifth : null;

    const roundOneHigh = this.seriesView(SERIES.roundOneHigh, '首輪 1', picked ? third : null, picked);
    const roundOneLow = this.seriesView(SERIES.roundOneLow, '首輪 2', other ? fourth : null, other);
    const highWinner = this.winningSide(roundOneHigh);
    const lowWinner = this.winningSide(roundOneLow);
    const pickedWinner =
      progress.semiOpponentId === highWinner?.teamId
        ? highWinner
        : progress.semiOpponentId === lowWinner?.teamId
          ? lowWinner
          : null;
    const otherWinner =
      pickedWinner && highWinner && lowWinner
        ? pickedWinner.teamId === highWinner.teamId
          ? lowWinner
          : highWinner
        : null;

    const roundTwoHigh = this.seriesView(SERIES.roundTwoHigh, '第二輪 1', pickedWinner ? seeds[0] : null, pickedWinner);
    const roundTwoLow = this.seriesView(SERIES.roundTwoLow, '第二輪 2', otherWinner ? seeds[1] : null, otherWinner);
    const winnersFinal = this.seriesView(
      SERIES.winnersFinal,
      '勝者組決賽',
      this.winningSide(roundTwoHigh),
      this.winningSide(roundTwoLow),
    );
    const losersRound = this.seriesView(
      SERIES.losersRound,
      '敗者組',
      this.losingSide(roundTwoHigh),
      this.losingSide(roundTwoLow),
    );
    const losersFinal = this.seriesView(
      SERIES.losersFinal,
      '敗者組決賽',
      this.winningSide(losersRound),
      this.losingSide(winnersFinal),
    );
    const grandFinal = this.seriesView(
      SERIES.grandFinal,
      '總決賽',
      this.winningSide(winnersFinal),
      this.winningSide(losersFinal),
    );

    return [roundOneHigh, roundOneLow, roundTwoHigh, roundTwoLow, winnersFinal, losersRound, losersFinal, grandFinal];
  }

  private seriesView(
    id: string,
    roundLabel: string,
    left: PlayoffStandingRow | PlayoffSide | null,
    right: PlayoffStandingRow | PlayoffSide | null,
  ): PlayoffSeriesView {
    const score = this.progress().scores[id];
    const leftSide = left ? this.toSide(left, score?.winnerTeamId ?? null, score?.loserGames ?? null) : null;
    const rightSide = right ? this.toSide(right, score?.winnerTeamId ?? null, score?.loserGames ?? null) : null;
    const status = score ? 'done' : leftSide && rightSide ? 'ready' : 'pending';
    const scoreText =
      status === 'done' && leftSide && rightSide
        ? `${leftSide.games ?? 0} - ${rightSide.games ?? 0}`
        : status === 'ready'
          ? '選擇勝方'
          : '待定';

    return { id, roundLabel, status, left: leftSide, right: rightSide, scoreText };
  }

  private toSide(
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

  private winningSide(series: PlayoffSeriesView): PlayoffSide | null {
    if (series.left?.isWinner) {
      return series.left;
    }
    if (series.right?.isWinner) {
      return series.right;
    }
    return null;
  }

  private losingSide(series: PlayoffSeriesView): PlayoffSide | null {
    if (!series.left?.isWinner && !series.right?.isWinner) {
      return null;
    }
    return series.left?.isWinner ? series.right : series.left;
  }

  private roundOneWinnerIds(): string[] {
    return [SERIES.roundOneHigh, SERIES.roundOneLow]
      .map((seriesId) => this.progress().scores[seriesId]?.winnerTeamId)
      .filter((teamId): teamId is string => !!teamId);
  }

  private matchupLabel(series: PlayoffSeriesView): string {
    return `${series.left?.abbreviation ?? '待定'} vs ${series.right?.abbreviation ?? '待定'}`;
  }

  private statusLabel(status: PlayoffSeriesView['status']): string {
    if (status === 'done') {
      return '已結束';
    }
    if (status === 'ready') {
      return '選擇勝方';
    }
    return '待定';
  }

  private teams(): Team[] {
    const league = this.league();
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === league)
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private emptyProgress(teamIds: string[]): PlayoffProgress {
    return {
      seedTeamIds: teamIds.slice(0, PLAYOFF_TEAM_COUNT),
      roundOneOpponentId: null,
      semiOpponentId: null,
      scores: {},
      seedsLocked: false,
    };
  }

  private readProgress(universeId: string, teams: Team[]): PlayoffProgress {
    const stored = this.storage.getItem<PlayoffProgress>(this.storageKey(universeId));
    const knownIds = new Set(teams.map((team) => team.id));
    const storedSeeds = (stored?.seedTeamIds ?? []).filter((teamId) => knownIds.has(teamId));
    const missing = teams.map((team) => team.id).filter((teamId) => !storedSeeds.includes(teamId));
    const seedTeamIds = [...storedSeeds, ...missing].slice(0, PLAYOFF_TEAM_COUNT);

    return {
      seedTeamIds,
      roundOneOpponentId:
        stored?.roundOneOpponentId && seedTeamIds.includes(stored.roundOneOpponentId)
          ? stored.roundOneOpponentId
          : null,
      semiOpponentId: stored?.semiOpponentId ?? null,
      scores: stored?.scores ?? {},
      seedsLocked: false,
    };
  }

  private writeProgress(progress: PlayoffProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId), progress);
    this.progressRevision.update((value) => value + 1);
  }

  private storageKey(universeId: string): string {
    const league = this.league();
    return league === 'TCS' ? `eus.double-elim.${universeId}` : `eus.double-elim.${league}.${universeId}`;
  }
}
