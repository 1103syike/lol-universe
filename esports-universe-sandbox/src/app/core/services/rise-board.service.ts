import { Injectable, computed, inject, signal } from '@angular/core';
import type { PlayoffScore, PlayoffSeriesView, PlayoffSide, PlayoffStandingRow } from '../models/playoff-board.model';
import type { Team } from '../models/team.model';
import { losingSide, seriesView, winningSide } from '../../shared/utils/series-match';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

export type RiseBoardId = 'rise' | 'rise-2026' | 'slot';

interface RiseProgress {
  tcsSeedIds: string[];
  tclSeedIds: string[];
  picks: string[];
  stagePickId: string | null;
  scores: Record<string, PlayoffScore>;
}

interface SeededRow extends PlayoffStandingRow {
  seed: number;
}

@Injectable({ providedIn: 'root' })
export class RiseBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly progressRevision = signal(0);
  readonly boardId = signal<RiseBoardId>('rise');

  readonly progress = computed(() => {
    this.progressRevision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return this.emptyProgress();
    }
    return this.readProgress(universeId);
  });

  readonly tcsStandings = computed(() => this.standings('TCS'));
  readonly tclStandings = computed(() => this.standings('TCL'));
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
  readonly pickChoices = computed(() => this.remainingTcs());
  readonly stageChoices = computed(() => this.stagePickChoices());
  readonly nextPicker = computed(() => this.tclStandings()[this.progress().picks.length] ?? null);
  readonly canReorder = computed(
    () => this.progress().picks.length === 0 && Object.keys(this.progress().scores).length === 0,
  );
  readonly hasEnoughTeams = computed(() => this.tcsStandings().length >= 10 && this.tclStandings().length >= 4);

  setBoard(boardId: RiseBoardId): void {
    this.boardId.set(boardId);
  }

  moveSeed(league: 'TCS' | 'TCL', teamId: string, direction: -1 | 1): void {
    if (!this.canReorder()) {
      return;
    }
    const progress = this.progress();
    const key = league === 'TCS' ? 'tcsSeedIds' : 'tclSeedIds';
    const seedIds = [...progress[key]];
    const index = seedIds.indexOf(teamId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= seedIds.length) {
      return;
    }
    const swapped = seedIds[nextIndex];
    seedIds[nextIndex] = seedIds[index];
    seedIds[index] = swapped;
    this.writeProgress({ ...progress, [key]: seedIds });
  }

  pickOpponent(teamId: string): void {
    const choices = this.remainingTcs();
    if (!choices.some((row) => row.teamId === teamId) || this.progress().picks.length >= 3) {
      return;
    }
    this.writeProgress({
      ...this.progress(),
      picks: [...this.progress().picks, teamId],
      stagePickId: null,
      scores: {},
    });
  }

  pickStageOpponent(teamId: string): void {
    const choices = this.stagePickChoices();
    if (!choices.some((row) => row.teamId === teamId)) {
      return;
    }
    const scores = { ...this.progress().scores };
    delete scores['s1'];
    delete scores['s2'];
    this.writeProgress({ ...this.progress(), stagePickId: teamId, scores });
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
    if (seriesId.startsWith('m')) {
      delete scores['s1'];
      delete scores['s2'];
    }
    const stagePickId = seriesId.startsWith('m') ? null : this.progress().stagePickId;
    this.writeProgress({ ...this.progress(), stagePickId, scores });
  }

  setLoserGames(seriesId: string, loserGames: number): void {
    const current = this.progress().scores[seriesId];
    if (!current) {
      return;
    }
    const games = Math.min(2, Math.max(0, Math.round(loserGames)));
    const scores = { ...this.progress().scores, [seriesId]: { ...current, loserGames: games } };
    if (seriesId.startsWith('m')) {
      delete scores['s1'];
      delete scores['s2'];
    }
    const stagePickId = seriesId.startsWith('m') ? null : this.progress().stagePickId;
    this.writeProgress({ ...this.progress(), stagePickId, scores });
  }

  reset(): void {
    this.writeProgress({
      tcsSeedIds: this.teams('TCS').map((team) => team.id),
      tclSeedIds: this.teams('TCL').map((team) => team.id),
      picks: [],
      stagePickId: null,
      scores: {},
    });
  }

  private buildSeries(): PlayoffSeriesView[] {
    const tcs = this.tcsField();
    const tcl = this.tclField();
    if (tcs.length < 4 || tcl.length < 4) {
      return [];
    }
    const pairs = this.stageOnePairs(tcs, tcl).map((pair) => ({ tcs: this.asSide(pair.tcs), tcl: this.asSide(pair.tcl) }));
    const scores = this.progress().scores;
    const opening = pairs.map((pair, index) =>
      seriesView(scores, `m${index + 1}`, `第一階段 ${index + 1}`, pair.tcs, pair.tcl),
    );
    if (opening.some((match) => match.status !== 'done')) {
      return opening;
    }
    if (this.boardId() === 'slot') {
      return [...opening, ...this.slotFinals(opening)];
    }
    return [...opening, ...this.riseFinals(opening)];
  }

  private stageOnePairs(tcs: SeededRow[], tcl: SeededRow[]): { tcs: SeededRow; tcl: SeededRow }[] {
    const picks = this.progress().picks;
    const pairs: { tcs: SeededRow; tcl: SeededRow }[] = [];
    picks.forEach((teamId, index) => {
      const row = tcs.find((item) => item.teamId === teamId);
      const picker = tcl[index];
      if (row && picker) {
        pairs.push({ tcs: row, tcl: picker });
      }
    });
    const remaining = tcs.filter((row) => !picks.includes(row.teamId));
    if (picks.length === 3 && remaining.length === 1 && tcl[3]) {
      pairs.push({ tcs: remaining[0], tcl: tcl[3] });
    }
    return pairs;
  }

  private riseFinals(opening: PlayoffSeriesView[]): PlayoffSeriesView[] {
    const ranked = this.rankLosers(opening);
    if (ranked.length < 4) {
      return [];
    }
    const pickedRow = ranked.find((row) => row.teamId === this.progress().stagePickId) ?? null;
    const isChoice = pickedRow?.teamId === ranked[2].teamId || pickedRow?.teamId === ranked[3].teamId;
    const other = isChoice ? (pickedRow?.teamId === ranked[2].teamId ? ranked[3] : ranked[2]) : null;
    const scores = this.progress().scores;
    return [
      seriesView(scores, 's1', '第二階段 1', isChoice ? ranked[0] : null, isChoice ? pickedRow : null),
      seriesView(scores, 's2', '第二階段 2', other ? ranked[1] : null, other),
    ];
  }

  private slotFinals(opening: PlayoffSeriesView[]): PlayoffSeriesView[] {
    const winners = opening
      .map((match) => winningSide(match))
      .filter((side): side is PlayoffSide => !!side)
      .sort((left, right) => left.seed - right.seed);
    if (winners.length < 4) {
      return [];
    }
    const scores = this.progress().scores;
    return [
      seriesView(scores, 's1', '第二階段 1', winners[0], winners[3]),
      seriesView(scores, 's2', '第二階段 2', winners[1], winners[2]),
    ];
  }

  private rankLosers(opening: PlayoffSeriesView[]): PlayoffSide[] {
    return opening
      .map((match) => losingSide(match))
      .filter((side): side is PlayoffSide => !!side)
      .sort((left, right) => (right.games ?? 0) - (left.games ?? 0) || left.seed - right.seed);
  }

  private remainingTcs(): SeededRow[] {
    if (this.progress().picks.length >= 3) {
      return [];
    }
    const picked = new Set(this.progress().picks);
    return this.tcsField().filter((row) => !picked.has(row.teamId));
  }

  private stagePickChoices(): PlayoffSide[] {
    if (this.boardId() === 'slot') {
      return [];
    }
    const opening = this.series().filter((match) => match.id.startsWith('m'));
    if (opening.length < 4 || opening.some((match) => match.status !== 'done')) {
      return [];
    }
    const ranked = this.rankLosers(opening);
    if (this.progress().stagePickId) {
      return [];
    }
    return ranked.slice(2, 4);
  }

  private buildOutcomes(): string[] {
    const lines: string[] = [];
    for (const match of this.series()) {
      const winner = winningSide(match);
      if (!winner) {
        continue;
      }
      if (match.id.startsWith('m')) {
        lines.push(`${winner.abbreviation} 直接晉級`);
      }
      if (match.id.startsWith('s')) {
        lines.push(this.boardId() === 'slot' ? `${winner.abbreviation} 取得下一年 TCS` : `${winner.abbreviation} 取得最後的 Rise 名額`);
      }
    }
    return lines;
  }

  private asSide(row: SeededRow): PlayoffSide {
    return {
      teamId: row.teamId,
      seed: row.seed,
      abbreviation: row.abbreviation,
      name: row.name,
      logoUrl: row.logoUrl,
      games: null,
      isWinner: false,
    };
  }

  private tcsField(): SeededRow[] {
    return this.tcsStandings().slice(6, 10).map((row, index) => ({ ...row, seed: index + 1 }));
  }

  private tclField(): SeededRow[] {
    return this.tclStandings().slice(0, 4).map((row, index) => ({ ...row, seed: index + 5 }));
  }

  private standings(league: 'TCS' | 'TCL'): PlayoffStandingRow[] {
    const ids = league === 'TCS' ? this.progress().tcsSeedIds : this.progress().tclSeedIds;
    const teams = this.teams(league);
    const ordered = ids
      .map((teamId) => teams.find((team) => team.id === teamId))
      .filter((team): team is Team => !!team);
    const rest = teams.filter((team) => !ids.includes(team.id));
    const cutoff = league === 'TCS' ? [7, 8, 9, 10] : [1, 2, 3, 4];
    return [...ordered, ...rest].map((team, index) => ({
      rank: index + 1,
      teamId: team.id,
      abbreviation: team.abbreviation,
      name: team.name,
      logoUrl: team.logoUrl,
      inPlayoff: cutoff.includes(index + 1),
    }));
  }

  private teams(league: 'TCS' | 'TCL'): Team[] {
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === league)
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private emptyProgress(): RiseProgress {
    return { tcsSeedIds: [], tclSeedIds: [], picks: [], stagePickId: null, scores: {} };
  }

  private readProgress(universeId: string): RiseProgress {
    const stored = this.storage.getItem<RiseProgress>(this.storageKey(universeId));
    return {
      tcsSeedIds: this.mergeIds(stored?.tcsSeedIds ?? [], 'TCS'),
      tclSeedIds: this.mergeIds(stored?.tclSeedIds ?? [], 'TCL'),
      picks: (stored?.picks ?? []).filter((teamId) => this.teams('TCS').some((team) => team.id === teamId)),
      stagePickId: stored?.stagePickId ?? null,
      scores: stored?.scores ?? {},
    };
  }

  private mergeIds(stored: string[], league: 'TCS' | 'TCL'): string[] {
    const known = new Set(this.teams(league).map((team) => team.id));
    const kept = stored.filter((teamId) => known.has(teamId));
    const missing = this.teams(league)
      .map((team) => team.id)
      .filter((teamId) => !kept.includes(teamId));
    return [...kept, ...missing];
  }

  private writeProgress(progress: RiseProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId), progress);
    this.progressRevision.update((value) => value + 1);
  }

  private storageKey(universeId: string): string {
    return `eus.rise.${this.boardId()}.${universeId}`;
  }
}
