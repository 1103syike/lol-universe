import { Injectable, computed, inject, signal } from '@angular/core';
import type {
  PlayoffScore,
  PlayoffSeriesView,
  PlayoffSide,
  PlayoffStandingRow,
} from '../models/playoff-board.model';
import type { Team } from '../models/team.model';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

const PLAYOFF_TEAM_COUNT = 8;
const SERIES_WIN_GAMES = 3;

interface HillProgress {
  seedTeamIds: string[];
  scores: Record<string, PlayoffScore>;
}

const SERIES = {
  roundOneHigh: 'r1-high',
  roundOneLow: 'r1-low',
  roundTwoHigh: 'r2-high',
  roundTwoLow: 'r2-low',
  roundThreeHigh: 'r3-high',
  roundThreeLow: 'r3-low',
  losersRound: 'losers-r1',
  winnersFinal: 'winners-final',
  losersFinal: 'losers-final',
  grandFinal: 'grand-final',
} as const;

const LATER_SERIES: Record<string, string[]> = {
  [SERIES.roundOneHigh]: [
    SERIES.roundTwoHigh,
    SERIES.roundThreeHigh,
    SERIES.losersRound,
    SERIES.winnersFinal,
    SERIES.losersFinal,
    SERIES.grandFinal,
  ],
  [SERIES.roundOneLow]: [
    SERIES.roundTwoLow,
    SERIES.roundThreeLow,
    SERIES.losersRound,
    SERIES.winnersFinal,
    SERIES.losersFinal,
    SERIES.grandFinal,
  ],
  [SERIES.roundTwoHigh]: [
    SERIES.roundThreeHigh,
    SERIES.losersRound,
    SERIES.winnersFinal,
    SERIES.losersFinal,
    SERIES.grandFinal,
  ],
  [SERIES.roundTwoLow]: [
    SERIES.roundThreeLow,
    SERIES.losersRound,
    SERIES.winnersFinal,
    SERIES.losersFinal,
    SERIES.grandFinal,
  ],
  [SERIES.roundThreeHigh]: [SERIES.losersRound, SERIES.winnersFinal, SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.roundThreeLow]: [SERIES.losersRound, SERIES.winnersFinal, SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.losersRound]: [SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.winnersFinal]: [SERIES.losersFinal, SERIES.grandFinal],
  [SERIES.losersFinal]: [SERIES.grandFinal],
};

@Injectable({ providedIn: 'root' })
export class HillBoardService {
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
    if (Object.keys(progress.scores).length > 0) {
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
    this.writeProgress({ ...progress, scores });
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
    this.writeProgress(this.emptyProgress(this.tcsTeams().map((team) => team.id)));
  }

  private buildSeries(): PlayoffSeriesView[] {
    const seeds = this.seeds();
    if (seeds.length < PLAYOFF_TEAM_COUNT) {
      return [];
    }

    const roundOneHigh = this.seriesView(SERIES.roundOneHigh, '第一輪 1', seeds[4], seeds[7]);
    const roundOneLow = this.seriesView(SERIES.roundOneLow, '第一輪 2', seeds[5], seeds[6]);
    const roundTwoHigh = this.seriesView(SERIES.roundTwoHigh, '第二輪 1', seeds[3], this.winningSide(roundOneHigh));
    const roundTwoLow = this.seriesView(SERIES.roundTwoLow, '第二輪 2', seeds[2], this.winningSide(roundOneLow));
    const roundThreeHigh = this.seriesView(
      SERIES.roundThreeHigh,
      '第三輪 1',
      seeds[0],
      this.winningSide(roundTwoHigh),
    );
    const roundThreeLow = this.seriesView(
      SERIES.roundThreeLow,
      '第三輪 2',
      seeds[1],
      this.winningSide(roundTwoLow),
    );
    const winnersFinal = this.seriesView(
      SERIES.winnersFinal,
      '勝部決賽',
      this.winningSide(roundThreeHigh),
      this.winningSide(roundThreeLow),
    );
    const losersRound = this.seriesView(
      SERIES.losersRound,
      '敗部',
      this.losingSide(roundThreeHigh),
      this.losingSide(roundThreeLow),
    );
    const losersFinal = this.seriesView(
      SERIES.losersFinal,
      '敗部決賽',
      this.losingSide(winnersFinal),
      this.winningSide(losersRound),
    );
    const grandFinal = this.seriesView(
      SERIES.grandFinal,
      '總決賽',
      this.winningSide(winnersFinal),
      this.winningSide(losersFinal),
    );

    return [
      roundOneHigh,
      roundOneLow,
      roundTwoHigh,
      roundTwoLow,
      roundThreeHigh,
      roundThreeLow,
      winnersFinal,
      losersRound,
      losersFinal,
      grandFinal,
    ];
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

  private tcsTeams(): Team[] {
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === 'TCS')
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private emptyProgress(teamIds: string[]): HillProgress {
    return {
      seedTeamIds: teamIds.slice(0, PLAYOFF_TEAM_COUNT),
      scores: {},
    };
  }

  private readProgress(universeId: string, teams: Team[]): HillProgress {
    const stored = this.storage.getItem<HillProgress>(this.storageKey(universeId));
    const knownIds = new Set(teams.map((team) => team.id));
    const storedSeeds = (stored?.seedTeamIds ?? []).filter((teamId) => knownIds.has(teamId));
    const missing = teams.map((team) => team.id).filter((teamId) => !storedSeeds.includes(teamId));
    const seedTeamIds = [...storedSeeds, ...missing].slice(0, PLAYOFF_TEAM_COUNT);

    return {
      seedTeamIds,
      scores: stored?.scores ?? {},
    };
  }

  private writeProgress(progress: HillProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId), progress);
    this.progressRevision.update((value) => value + 1);
  }

  private storageKey(universeId: string): string {
    return `eus.hill-elim.${universeId}`;
  }
}
