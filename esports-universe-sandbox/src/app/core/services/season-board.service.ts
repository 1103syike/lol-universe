import { Injectable, computed, inject, signal } from '@angular/core';
import type { PlayoffScore, PlayoffSeriesView, PlayoffStandingRow } from '../models/playoff-board.model';
import type { LeagueTier } from '../models/league.model';
import type { Team } from '../models/team.model';
import { losingSide, seriesView, winningSide } from '../../shared/utils/series-match';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

export type SeasonBoardId = 'retention' | 'ea' | 'rl';

interface SeasonProgress {
  seeds: Partial<Record<LeagueTier, string[]>>;
  scores: Record<string, PlayoffScore>;
}

const LATER: Record<SeasonBoardId, Record<string, string[]>> = {
  retention: {
    'r1-high': ['sf-2', 'final'],
    'r1-low': ['sf-1', 'final'],
    'sf-1': ['final'],
    'sf-2': ['final'],
  },
  ea: {
    'r1-high': ['lb-1', 'r2-low', 'lb-2', 'lb-3', 'winners-final', 'losers-final', 'grand-final'],
    'r1-low': ['lb-1', 'r2-high', 'lb-2', 'lb-3', 'winners-final', 'losers-final', 'grand-final'],
    'lb-1': ['lb-2', 'lb-3', 'losers-final', 'grand-final'],
    'r2-high': ['lb-3', 'winners-final', 'losers-final', 'grand-final'],
    'r2-low': ['lb-2', 'lb-3', 'winners-final', 'losers-final', 'grand-final'],
    'lb-2': ['lb-3', 'losers-final', 'grand-final'],
    'lb-3': ['losers-final', 'grand-final'],
    'winners-final': ['losers-final', 'grand-final'],
    'losers-final': ['grand-final'],
  },
  rl: {
    'r1-5': ['qf-4', 'sf-a', 'final'],
    'r1-8': ['qf-1', 'sf-a', 'final'],
    'r1-6': ['qf-3', 'sf-b', 'final'],
    'r1-7': ['qf-2', 'sf-b', 'final'],
    'qf-1': ['sf-a', 'final'],
    'qf-4': ['sf-a', 'final'],
    'qf-2': ['sf-b', 'final'],
    'qf-3': ['sf-b', 'final'],
    'sf-a': ['final'],
    'sf-b': ['final'],
  },
};

@Injectable({ providedIn: 'root' })
export class SeasonBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly progressRevision = signal(0);
  readonly boardId = signal<SeasonBoardId>('retention');

  readonly progress = computed(() => {
    this.progressRevision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return this.emptyProgress();
    }
    return this.readProgress(universeId);
  });

  readonly tcsStandings = computed(() => this.standings('TCS', this.markedTcs()));
  readonly tclStandings = computed(() => this.standings('TCL', this.markedTcl()));
  readonly academyStandings = computed(() => this.standings('EA', 6));
  readonly reserveStandings = computed(() => this.standings('RL', 12));
  readonly series = computed(() => this.buildSeries());
  readonly schedule = computed(() =>
    this.series().map((match) => ({
      id: match.id,
      roundLabel: match.roundLabel,
      matchup: `${match.left?.abbreviation ?? '待定'} vs ${match.right?.abbreviation ?? '待定'}`,
      scoreText: match.scoreText,
      statusLabel: match.status === 'done' ? '已結束' : match.status === 'ready' ? '選擇勝方' : '待定',
    })),
  );
  readonly outcomes = computed(() => this.buildOutcomes());
  readonly canReorder = computed(() => Object.keys(this.progress().scores).length === 0);
  readonly hasEnoughTeams = computed(() => {
    const boardId = this.boardId();
    if (boardId === 'retention') {
      return this.tcsStandings().length >= 10 && this.tclStandings().length >= 2;
    }
    if (boardId === 'ea') {
      return this.academyStandings().length >= 6;
    }
    return this.reserveStandings().length >= 12;
  });

  setBoard(boardId: SeasonBoardId): void {
    this.boardId.set(boardId);
  }

  moveSeed(tier: LeagueTier, teamId: string, direction: -1 | 1): void {
    if (!this.canReorder()) {
      return;
    }
    const progress = this.progress();
    const seedIds = [...(progress.seeds[tier] ?? [])];
    const index = seedIds.indexOf(teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= seedIds.length) {
      return;
    }
    const swapped = seedIds[nextIndex];
    seedIds[nextIndex] = seedIds[index];
    seedIds[index] = swapped;
    this.writeProgress({ ...progress, seeds: { ...progress.seeds, [tier]: seedIds } });
  }

  setWinner(seriesId: string, teamId: string): void {
    const match = this.series().find((item) => item.id === seriesId);
    if (!match || match.status !== 'ready') {
      return;
    }
    if (match.left?.teamId !== teamId && match.right?.teamId !== teamId) {
      return;
    }
    const scores = { ...this.progress().scores, [seriesId]: { winnerTeamId: teamId, loserGames: 1 } };
    for (const laterId of LATER[this.boardId()][seriesId] ?? []) {
      delete scores[laterId];
    }
    this.writeProgress({ ...this.progress(), scores });
  }

  setLoserGames(seriesId: string, loserGames: number): void {
    const current = this.progress().scores[seriesId];
    if (!current) {
      return;
    }
    const games = Math.min(2, Math.max(0, Math.round(loserGames)));
    this.writeProgress({
      ...this.progress(),
      scores: { ...this.progress().scores, [seriesId]: { ...current, loserGames: games } },
    });
  }

  reset(): void {
    const seeds: Partial<Record<LeagueTier, string[]>> = {};
    for (const tier of ['TCS', 'TCL', 'EA', 'RL'] as const) {
      seeds[tier] = this.teams(tier).map((team) => team.id);
    }
    this.writeProgress({ seeds, scores: {} });
  }

  private buildSeries(): PlayoffSeriesView[] {
    const boardId = this.boardId();
    if (boardId === 'retention') {
      return this.buildRetention();
    }
    if (boardId === 'ea') {
      return this.buildAcademy();
    }
    return this.buildReserve();
  }

  private buildRetention(): PlayoffSeriesView[] {
    const tcs = this.tcsStandings();
    const tcl = this.tclStandings();
    if (tcs.length < 10 || tcl.length < 2) {
      return [];
    }
    const seeds = [tcs[6], tcs[7], tcs[8], tcs[9], tcl[0], tcl[1]];
    const scores = this.progress().scores;
    const roundOneHigh = seriesView(scores, 'r1-high', '第一輪 1', seeds[2], seeds[5]);
    const roundOneLow = seriesView(scores, 'r1-low', '第一輪 2', seeds[3], seeds[4]);
    const semiOne = seriesView(scores, 'sf-1', '準決賽 1', seeds[0], winningSide(roundOneLow));
    const semiTwo = seriesView(scores, 'sf-2', '準決賽 2', seeds[1], winningSide(roundOneHigh));
    const final = seriesView(scores, 'final', '決賽', winningSide(semiOne), winningSide(semiTwo));
    return [roundOneHigh, roundOneLow, semiOne, semiTwo, final];
  }

  private buildAcademy(): PlayoffSeriesView[] {
    const rows = this.academyStandings();
    if (rows.length < 6) {
      return [];
    }
    const scores = this.progress().scores;
    const roundOneHigh = seriesView(scores, 'r1-high', '第一輪 1', rows[2], rows[5]);
    const roundOneLow = seriesView(scores, 'r1-low', '第一輪 2', rows[3], rows[4]);
    const losersOne = seriesView(scores, 'lb-1', '敗部 1', losingSide(roundOneHigh), losingSide(roundOneLow));
    const roundTwoHigh = seriesView(scores, 'r2-high', '第二輪 1', rows[0], winningSide(roundOneLow));
    const roundTwoLow = seriesView(scores, 'r2-low', '第二輪 2', rows[1], winningSide(roundOneHigh));
    const losersTwo = seriesView(scores, 'lb-2', '敗部 2', losingSide(roundTwoLow), winningSide(losersOne));
    const losersThree = seriesView(scores, 'lb-3', '敗部 3', losingSide(roundTwoHigh), winningSide(losersTwo));
    const winnersFinal = seriesView(scores, 'winners-final', '勝部決賽', winningSide(roundTwoHigh), winningSide(roundTwoLow));
    const losersFinal = seriesView(scores, 'losers-final', '敗部決賽', losingSide(winnersFinal), winningSide(losersThree));
    const grandFinal = seriesView(scores, 'grand-final', '總決賽', winningSide(winnersFinal), winningSide(losersFinal));
    return [roundOneHigh, roundOneLow, losersOne, roundTwoHigh, roundTwoLow, losersTwo, losersThree, winnersFinal, losersFinal, grandFinal];
  }

  private buildReserve(): PlayoffSeriesView[] {
    const rows = this.reserveStandings();
    if (rows.length < 12) {
      return [];
    }
    const scores = this.progress().scores;
    const roundFive = seriesView(scores, 'r1-5', '第一輪', rows[4], rows[11]);
    const roundSix = seriesView(scores, 'r1-6', '第一輪', rows[5], rows[10]);
    const roundSeven = seriesView(scores, 'r1-7', '第一輪', rows[6], rows[9]);
    const roundEight = seriesView(scores, 'r1-8', '第一輪', rows[7], rows[8]);
    const quarterOne = seriesView(scores, 'qf-1', '八強', rows[0], winningSide(roundEight));
    const quarterFour = seriesView(scores, 'qf-4', '八強', rows[3], winningSide(roundFive));
    const quarterTwo = seriesView(scores, 'qf-2', '八強', rows[1], winningSide(roundSeven));
    const quarterThree = seriesView(scores, 'qf-3', '八強', rows[2], winningSide(roundSix));
    const semiA = seriesView(scores, 'sf-a', '四強', winningSide(quarterOne), winningSide(quarterFour));
    const semiB = seriesView(scores, 'sf-b', '四強', winningSide(quarterTwo), winningSide(quarterThree));
    const final = seriesView(scores, 'final', '決賽', winningSide(semiA), winningSide(semiB));
    return [roundFive, roundSix, roundSeven, roundEight, quarterOne, quarterFour, quarterTwo, quarterThree, semiA, semiB, final];
  }

  private buildOutcomes(): string[] {
    const boardId = this.boardId();
    if (boardId === 'retention') {
      const final = this.series().find((match) => match.id === 'final');
      const winner = winningSide(final);
      const loser = losingSide(final);
      const lines: string[] = [];
      if (winner) {
        lines.push(`${winner.abbreviation} 取得下一年 TCS`);
      }
      if (loser) {
        lines.push(`${loser.abbreviation} 取得下一年 TCS`);
      }
      return lines;
    }
    const finalId = boardId === 'ea' ? 'grand-final' : 'final';
    const winner = winningSide(this.series().find((match) => match.id === finalId));
    return winner ? [`冠軍：${winner.abbreviation}`] : [];
  }

  private markedTcs(): number[] {
    return [7, 8, 9, 10];
  }

  private markedTcl(): number[] {
    return this.boardId() === 'retention' ? [1, 2] : [];
  }

  private standings(tier: LeagueTier, marked: number | number[]): PlayoffStandingRow[] {
    const ids = this.progress().seeds[tier] ?? [];
    const teams = this.teams(tier);
    const ordered = ids
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter((team): team is Team => !!team);
    const rest = teams.filter((team) => !ids.includes(team.id));
    const marks = Array.isArray(marked) ? new Set(marked) : null;
    const cutoff = typeof marked === 'number' ? marked : 0;
    return [...ordered, ...rest].map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      logoUrl: team.logoUrl,
      inPlayoff: marks ? marks.has(index + 1) : index < cutoff,
    }));
  }

  private teams(tier: LeagueTier): Team[] {
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === tier)
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private emptyProgress(): SeasonProgress {
    return { seeds: {}, scores: {} };
  }

  private readProgress(universeId: string): SeasonProgress {
    const stored = this.storage.getItem<SeasonProgress>(this.storageKey(universeId));
    const seeds: Partial<Record<LeagueTier, string[]>> = {};
    for (const tier of ['TCS', 'TCL', 'EA', 'RL'] as const) {
      const known = new Set(this.teams(tier).map((team) => team.id));
      const kept = (stored?.seeds?.[tier] ?? []).filter((teamId) => known.has(teamId));
      const missing = this.teams(tier)
        .map((team) => team.id)
        .filter((teamId) => !kept.includes(teamId));
      seeds[tier] = [...kept, ...missing];
    }
    return { seeds, scores: stored?.scores ?? {} };
  }

  private writeProgress(progress: SeasonProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId), progress);
    this.progressRevision.update((value) => value + 1);
  }

  private storageKey(universeId: string): string {
    return `eus.season.${this.boardId()}.${universeId}`;
  }
}
