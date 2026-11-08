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

export type PlayoffLeague = 'TCS' | 'TCL';

@Injectable({ providedIn: 'root' })
export class PlayoffBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly progressRevision = signal(0);
  private readonly league = signal<PlayoffLeague>('TCS');

  readonly activeLeague = this.league.asReadonly();

  readonly progress = computed(() => {
    this.progressRevision();
    const league = this.league();
    const universeId = this.universeService.activeUniverseId();
    const teams = this.teamsFor(league);
    if (!universeId) {
      return this.emptyProgress([]);
    }
    return this.readProgress(universeId, league, teams);
  });

  readonly standings = computed((): PlayoffStandingRow[] => this.rowsFor(this.teamsFor(this.league()), this.progress()));

  readonly seeds = computed(() => this.standings().slice(0, PLAYOFF_TEAM_COUNT));

  readonly series = computed((): PlayoffSeriesView[] => this.seriesFrom(this.seeds(), this.progress()));

  readonly schedule = computed(() =>
    this.series().map((series) => ({
      id: series.id,
      roundLabel: series.roundLabel,
      matchup: this.matchupLabel(series),
      scoreText: series.scoreText,
      statusLabel: this.statusLabel(series.status),
    })),
  );

  setLeague(league: PlayoffLeague): void {
    this.league.set(league);
  }

  bundle(league: PlayoffLeague): { progress: PlayoffProgress; standings: PlayoffStandingRow[]; series: PlayoffSeriesView[] } {
    this.progressRevision();
    const universeId = this.universeService.activeUniverseId();
    const teams = this.teamsFor(league);
    const progress = universeId ? this.readProgress(universeId, league, teams) : this.emptyProgress(teams.map((team) => team.id));
    const standings = this.rowsFor(teams, progress);
    return { progress, standings, series: this.seriesFrom(standings.slice(0, PLAYOFF_TEAM_COUNT), progress) };
  }

  pickRoundOne(league: PlayoffLeague, teamId: string): void {
    const { progress, standings } = this.bundle(league);
    const fifth = standings[4];
    const sixth = standings[5];
    if (!fifth || !sixth || (teamId !== fifth.teamId && teamId !== sixth.teamId)) {
      return;
    }
    this.writeProgress({ ...progress, roundOneOpponentId: teamId, semiOpponentId: null, scores: {} }, league);
  }

  pickSemi(league: PlayoffLeague, teamId: string): void {
    const { progress } = this.bundle(league);
    const winners = [PLAYOFF_SERIES_IDS.roundOneHigh, PLAYOFF_SERIES_IDS.roundOneLow]
      .map((seriesId) => progress.scores[seriesId]?.winnerTeamId)
      .filter((id): id is string => !!id);
    if (winners.length < 2 || !winners.includes(teamId)) {
      return;
    }
    const scores = { ...progress.scores };
    for (const seriesId of [PLAYOFF_SERIES_IDS.semiOne, PLAYOFF_SERIES_IDS.semiTwo, PLAYOFF_SERIES_IDS.final]) {
      delete scores[seriesId];
    }
    this.writeProgress({ ...progress, semiOpponentId: teamId, scores }, league);
  }

  addGame(league: PlayoffLeague, seriesId: string, teamId: string): void {
    const { progress, series } = this.bundle(league);
    const match = series.find((item) => item.id === seriesId);
    if (!match || match.status !== 'ready' || !match.left || !match.right) {
      return;
    }
    if (teamId !== match.left.teamId && teamId !== match.right.teamId) {
      return;
    }
    const current = progress.scores[seriesId];
    let leftGames = current?.winnerTeamId
      ? current.winnerTeamId === match.left.teamId
        ? SERIES_WIN_GAMES
        : current.loserGames
      : (current?.homeGames ?? 0);
    let rightGames = current?.winnerTeamId
      ? current.winnerTeamId === match.right.teamId
        ? SERIES_WIN_GAMES
        : current.loserGames
      : (current?.awayGames ?? 0);
    if (teamId === match.left.teamId) {
      leftGames += 1;
    } else {
      rightGames += 1;
    }
    const finished = leftGames >= SERIES_WIN_GAMES || rightGames >= SERIES_WIN_GAMES;
    const scores = {
      ...progress.scores,
      [seriesId]: finished
        ? {
            winnerTeamId: leftGames >= SERIES_WIN_GAMES ? match.left.teamId : match.right.teamId,
            loserGames: leftGames >= SERIES_WIN_GAMES ? rightGames : leftGames,
          }
        : { winnerTeamId: '', loserGames: 0, homeGames: leftGames, awayGames: rightGames },
    };
    if (finished) {
      this.removeLaterScores(seriesId, scores);
    }
    const semiOpponentId = finished && this.opensSemifinals(seriesId) ? null : progress.semiOpponentId;
    this.writeProgress({ ...progress, semiOpponentId, scores }, league);
  }

  isLocked(league: PlayoffLeague): boolean {
    this.progressRevision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return false;
    }
    return this.storage.getItem<PlayoffProgress>(this.storageKey(universeId, league))?.seedsLocked === true;
  }

  applyLockedSeeds(league: PlayoffLeague, teamIds: string[]): void {
    this.writeProgress(
      {
        seedTeamIds: teamIds.slice(0, PLAYOFF_TEAM_COUNT),
        roundOneOpponentId: null,
        semiOpponentId: null,
        scores: {},
        seedsLocked: true,
      },
      league,
    );
  }

  clearLockedSeeds(league: PlayoffLeague = this.league()): void {
    const teams = this.teamsFor(league);
    this.writeProgress(this.emptyProgress(teams.map((team) => team.id)), league);
  }

  moveSeed(teamId: string, direction: -1 | 1): void {
    const progress = this.progress();
    if (progress.seedsLocked || progress.roundOneOpponentId || Object.keys(progress.scores).length > 0) {
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
    const progress = this.progress();
    if (progress.seedsLocked) {
      this.writeProgress({
        ...progress,
        roundOneOpponentId: null,
        semiOpponentId: null,
        scores: {},
      });
      return;
    }
    const teams = this.teamsFor(this.league());
    this.writeProgress(this.emptyProgress(teams.map((team) => team.id)));
  }

  private rowsFor(teams: Team[], progress: PlayoffProgress): PlayoffStandingRow[] {
    const seedIds = progress.seedTeamIds;
    const directory = new Map(this.allTeams().map((team) => [team.id, team]));
    const ordered = seedIds
      .map((teamId) => directory.get(teamId) ?? null)
      .filter((team): team is Team => !!team);
    const rest = this.bracketStarted(progress) ? [] : teams.filter((team) => !seedIds.includes(team.id));
    return [...ordered, ...rest].map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      logoUrl: team.logoUrl,
      inPlayoff: index < PLAYOFF_TEAM_COUNT,
    }));
  }

  private seriesFrom(seeds: PlayoffStandingRow[], progress: PlayoffProgress): PlayoffSeriesView[] {
    if (seeds.length < PLAYOFF_TEAM_COUNT) {
      return [];
    }

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

    const roundOneHigh = this.seriesView(progress, PLAYOFF_SERIES_IDS.roundOneHigh, '首輪 1', third, pickedSeed);
    const roundOneLow = this.seriesView(progress, PLAYOFF_SERIES_IDS.roundOneLow, '首輪 2', fourth, otherSeed);

    const highWinner = this.winnerSeed(PLAYOFF_SERIES_IDS.roundOneHigh, progress, seeds);
    const lowWinner = this.winnerSeed(PLAYOFF_SERIES_IDS.roundOneLow, progress, seeds);
    const semiPick = progress.semiOpponentId;
    const semiOther =
      highWinner && lowWinner && semiPick
        ? semiPick === highWinner.teamId
          ? lowWinner
          : highWinner
        : null;
    const semiPickedSide =
      semiPick === highWinner?.teamId ? highWinner : semiPick === lowWinner?.teamId ? lowWinner : null;

    const semiOne = this.seriesView(progress, PLAYOFF_SERIES_IDS.semiOne, '四強 1', seeds[0], semiPickedSide);
    const semiTwo = this.seriesView(progress, PLAYOFF_SERIES_IDS.semiTwo, '四強 2', seeds[1], semiOther);
    const final = this.seriesView(
      progress,
      PLAYOFF_SERIES_IDS.final,
      '決賽',
      this.winnerSeed(PLAYOFF_SERIES_IDS.semiOne, progress, seeds),
      this.winnerSeed(PLAYOFF_SERIES_IDS.semiTwo, progress, seeds),
    );

    return [roundOneHigh, roundOneLow, semiOne, semiTwo, final];
  }

  private seriesView(
    progress: PlayoffProgress,
    id: string,
    roundLabel: string,
    leftSeed: PlayoffStandingRow | null,
    rightSeed: PlayoffStandingRow | null,
  ): PlayoffSeriesView {
    const score = progress.scores[id];
    const done = Boolean(score?.winnerTeamId);
    const left = leftSeed
      ? this.toSide(leftSeed, done ? score.winnerTeamId : null, done ? score.loserGames : null, done ? null : (score?.homeGames ?? 0))
      : null;
    const right = rightSeed
      ? this.toSide(rightSeed, done ? score.winnerTeamId : null, done ? score.loserGames : null, done ? null : (score?.awayGames ?? 0))
      : null;
    const status = done ? 'done' : left && right ? 'ready' : 'pending';
    const scoreText =
      status === 'done' && left && right
        ? `${left.games ?? 0} - ${right.games ?? 0}`
        : status === 'ready' && score
          ? `${left?.games ?? 0} - ${right?.games ?? 0}`
          : status === 'ready'
            ? '選擇勝方'
            : '待定';

    return { id, roundLabel, status, left, right, scoreText };
  }

  private toSide(
    seed: PlayoffStandingRow,
    winnerTeamId: string | null,
    loserGames: number | null,
    shownGames: number | null = null,
  ): PlayoffSide {
    const isWinner = !!winnerTeamId && winnerTeamId === seed.teamId;
    const games = winnerTeamId ? (isWinner ? SERIES_WIN_GAMES : loserGames) : shownGames;
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

  private winnerSeed(seriesId: string, progress: PlayoffProgress, rows: PlayoffStandingRow[]): PlayoffStandingRow | null {
    const winnerId = progress.scores[seriesId]?.winnerTeamId;
    if (!winnerId) {
      return null;
    }
    return rows.find((row) => row.teamId === winnerId) ?? null;
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

  private teamsFor(league: PlayoffLeague): Team[] {
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

  private allTeams(): Team[] {
    return this.universeService.activeUniverse()?.teams ?? [];
  }

  private bracketStarted(progress: PlayoffProgress): boolean {
    return (
      progress.seedsLocked ||
      Object.keys(progress.scores ?? {}).length > 0 ||
      Boolean(progress.roundOneOpponentId) ||
      Boolean(progress.semiOpponentId)
    );
  }

  private readProgress(universeId: string, league: PlayoffLeague, teams: Team[]): PlayoffProgress {
    const stored = this.storage.getItem<PlayoffProgress>(this.storageKey(universeId, league));
    if (stored && this.bracketStarted(stored)) {
      return {
        seedTeamIds: stored.seedTeamIds ?? [],
        roundOneOpponentId: stored.roundOneOpponentId ?? null,
        semiOpponentId: stored.semiOpponentId ?? null,
        scores: stored.scores ?? {},
        seedsLocked: stored.seedsLocked === true,
      };
    }
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
      seedsLocked: stored?.seedsLocked === true,
    };
  }

  private writeProgress(progress: PlayoffProgress, league: PlayoffLeague = this.league()): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId, league), progress);
    this.progressRevision.update((value) => value + 1);
  }

  private storageKey(universeId: string, league: PlayoffLeague): string {
    if (league === 'TCS') {
      return `eus.playoff.${universeId}`;
    }
    return `eus.playoff.${league}.${universeId}`;
  }
}
