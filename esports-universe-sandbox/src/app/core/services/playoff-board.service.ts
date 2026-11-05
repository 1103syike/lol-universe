import { Injectable, computed, inject, signal } from '@angular/core';
import {
  PLAYOFF_SERIES_IDS,
} from '../models/playoff-board.model';
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

@Injectable({ providedIn: 'root' })
export class PlayoffBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly progressRevision = signal(0);

  readonly progress = computed(() => {
    this.progressRevision();
    const universeId = this.universeService.activeUniverseId();
    const teams = this.tcsTeams();
    if (!universeId) {
      return this.emptyProgress([]);
    }
    return this.readProgress(universeId, teams);
  });

  readonly standings = computed((): PlayoffStandingRow[] => {
    const teams = this.tcsTeams();
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
    if (!fifth || !sixth) {
      return;
    }
    if (teamId !== fifth.teamId && teamId !== sixth.teamId) {
      return;
    }

    const progress = this.progress();
    this.writeProgress({
      ...progress,
      roundOneOpponentId: teamId,
      semiOpponentId: null,
      scores: {},
    });
  }

  pickSemiOpponent(teamId: string): void {
    const winners = this.roundOneWinnerIds();
    if (winners.length < 2 || !winners.includes(teamId)) {
      return;
    }

    this.writeProgress({
      ...this.progress(),
      semiOpponentId: teamId,
      scores: this.scoresWithout([PLAYOFF_SERIES_IDS.semiOne, PLAYOFF_SERIES_IDS.semiTwo, PLAYOFF_SERIES_IDS.final]),
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
    this.removeLaterScores(seriesId, scores);
    const semiOpponentId = this.opensSemifinals(seriesId) ? null : progress.semiOpponentId;
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
    const teams = this.tcsTeams();
    this.writeProgress(this.emptyProgress(teams.map((team) => team.id)));
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
    const pickedSeed = progress.roundOneOpponentId === fifth.teamId
      ? fifth
      : progress.roundOneOpponentId === sixth.teamId
        ? sixth
        : null;
    const otherSeed = pickedSeed?.teamId === fifth.teamId ? sixth : pickedSeed ? fifth : null;

    const roundOneHigh = this.seriesView(
      PLAYOFF_SERIES_IDS.roundOneHigh,
      '首輪 1',
      pickedSeed ? third : null,
      pickedSeed,
    );
    const roundOneLow = this.seriesView(
      PLAYOFF_SERIES_IDS.roundOneLow,
      '首輪 2',
      otherSeed ? fourth : null,
      otherSeed,
    );

    const highWinner = this.winnerSeed(PLAYOFF_SERIES_IDS.roundOneHigh);
    const lowWinner = this.winnerSeed(PLAYOFF_SERIES_IDS.roundOneLow);
    const semiPick = progress.semiOpponentId;
    const semiOther =
      highWinner && lowWinner && semiPick
        ? semiPick === highWinner.teamId
          ? lowWinner
          : highWinner
        : null;
    const semiPickedSide =
      semiPick === highWinner?.teamId ? highWinner : semiPick === lowWinner?.teamId ? lowWinner : null;

    const semiOne = this.seriesView(
      PLAYOFF_SERIES_IDS.semiOne,
      '四強 1',
      seeds[0],
      semiPickedSide,
    );
    const semiTwo = this.seriesView(
      PLAYOFF_SERIES_IDS.semiTwo,
      '四強 2',
      seeds[1],
      semiOther,
    );

    const final = this.seriesView(
      PLAYOFF_SERIES_IDS.final,
      '決賽',
      this.winnerSeed(PLAYOFF_SERIES_IDS.semiOne),
      this.winnerSeed(PLAYOFF_SERIES_IDS.semiTwo),
    );

    return [roundOneHigh, roundOneLow, semiOne, semiTwo, final];
  }

  private seriesView(
    id: string,
    roundLabel: string,
    leftSeed: PlayoffStandingRow | null,
    rightSeed: PlayoffStandingRow | null,
  ): PlayoffSeriesView {
    const score = this.progress().scores[id];
    const left = leftSeed ? this.toSide(leftSeed, score?.winnerTeamId ?? null, score?.loserGames ?? null) : null;
    const right = rightSeed ? this.toSide(rightSeed, score?.winnerTeamId ?? null, score?.loserGames ?? null) : null;
    const status = score ? 'done' : left && right ? 'ready' : 'pending';
    const scoreText =
      status === 'done' && left && right ? `${left.games ?? 0} - ${right.games ?? 0}` : status === 'ready' ? '選擇勝方' : '待定';

    return { id, roundLabel, status, left, right, scoreText };
  }

  private toSide(
    seed: PlayoffStandingRow,
    winnerTeamId: string | null,
    loserGames: number | null,
  ): PlayoffSide {
    const isWinner = winnerTeamId === seed.teamId;
    const games = winnerTeamId ? (isWinner ? SERIES_WIN_GAMES : loserGames) : null;
    return {
      teamId: seed.teamId,
      seed: seed.rank,
      abbreviation: seed.abbreviation,
      name: seed.name,
      logoUrl: seed.logoUrl,
      games,
      isWinner,
    };
  }

  private winnerSeed(seriesId: string): PlayoffStandingRow | null {
    const winnerId = this.progress().scores[seriesId]?.winnerTeamId;
    if (!winnerId) {
      return null;
    }
    return this.standings().find((row) => row.teamId === winnerId) ?? null;
  }

  private roundOneWinnerIds(): string[] {
    return [PLAYOFF_SERIES_IDS.roundOneHigh, PLAYOFF_SERIES_IDS.roundOneLow]
      .map((seriesId) => this.progress().scores[seriesId]?.winnerTeamId)
      .filter((teamId): teamId is string => !!teamId);
  }

  private removeLaterScores(seriesId: string, scores: PlayoffProgress['scores']): void {
    const later: Record<string, string[]> = {
      [PLAYOFF_SERIES_IDS.roundOneHigh]: [PLAYOFF_SERIES_IDS.semiOne, PLAYOFF_SERIES_IDS.semiTwo, PLAYOFF_SERIES_IDS.final],
      [PLAYOFF_SERIES_IDS.roundOneLow]: [PLAYOFF_SERIES_IDS.semiOne, PLAYOFF_SERIES_IDS.semiTwo, PLAYOFF_SERIES_IDS.final],
      [PLAYOFF_SERIES_IDS.semiOne]: [PLAYOFF_SERIES_IDS.final],
      [PLAYOFF_SERIES_IDS.semiTwo]: [PLAYOFF_SERIES_IDS.final],
    };

    for (const id of later[seriesId] ?? []) {
      delete scores[id];
    }
  }

  private opensSemifinals(seriesId: string): boolean {
    return seriesId === PLAYOFF_SERIES_IDS.roundOneHigh || seriesId === PLAYOFF_SERIES_IDS.roundOneLow;
  }

  private scoresWithout(seriesIds: string[]): PlayoffProgress['scores'] {
    const scores = { ...this.progress().scores };
    for (const seriesId of seriesIds) {
      delete scores[seriesId];
    }
    return scores;
  }

  private matchupLabel(series: PlayoffSeriesView): string {
    const left = series.left ? `${series.left.abbreviation}` : '待定';
    const right = series.right ? `${series.right.abbreviation}` : '待定';
    return `${left} vs ${right}`;
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

  private tcsTeams(): Team[] {
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === 'TCS')
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private emptyProgress(teamIds: string[]): PlayoffProgress {
    return {
      seedTeamIds: teamIds.slice(0, PLAYOFF_TEAM_COUNT),
      roundOneOpponentId: null,
      semiOpponentId: null,
      scores: {},
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
    return `eus.playoff.${universeId}`;
  }
}
