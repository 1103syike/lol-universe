import { Injectable, computed, inject, signal } from '@angular/core';
import type { PlayoffScore, PlayoffSeriesView, PlayoffSide, PlayoffStandingRow } from '../models/playoff-board.model';
import type { Team } from '../models/team.model';
import type { LeagueTier } from '../models/league.model';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

export type QualifierFormatId = 'worlds-2021' | 'worlds-2023' | 'promotion-2023';

interface QualifierProgress {
  tcsSeedIds: string[];
  tclSeedIds: string[];
  pickTeamId: string | null;
  scores: Record<string, PlayoffScore>;
}

const SERIES_WIN_GAMES = 3;

@Injectable({ providedIn: 'root' })
export class QualifierBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly progressRevision = signal(0);
  readonly formatId = signal<QualifierFormatId>('worlds-2021');

  readonly progress = computed(() => {
    this.progressRevision();
    const universeId = this.universeService.activeUniverseId();
    const formatId = this.formatId();
    if (!universeId) {
      return this.emptyProgress();
    }
    return this.readProgress(universeId, formatId);
  });

  readonly tcsStandings = computed(() => this.standingsFor('TCS', this.progress().tcsSeedIds));
  readonly tclStandings = computed(() => this.standingsFor('TCL', this.progress().tclSeedIds));
  readonly series = computed(() => this.buildSeries());
  readonly schedule = computed(() =>
    this.series().map((series) => ({
      id: series.id,
      roundLabel: series.roundLabel,
      matchup: `${series.left?.abbreviation ?? '待定'} vs ${series.right?.abbreviation ?? '待定'}`,
      scoreText: series.scoreText,
      statusLabel: series.status === 'done' ? '已結束' : series.status === 'ready' ? '選擇勝方' : '待定',
    })),
  );
  readonly outcomes = computed(() => this.buildOutcomes());
  readonly hasEnoughTeams = computed(() => {
    if (this.formatId() === 'promotion-2023') {
      return this.tcsStandings().length >= 10 && this.tclStandings().length >= 2;
    }
    const needed = this.formatId() === 'worlds-2021' ? 5 : 6;
    return this.tcsStandings().length >= needed;
  });
  readonly canReorder = computed(
    () => !this.progress().pickTeamId && Object.keys(this.progress().scores).length === 0,
  );

  setFormat(formatId: QualifierFormatId): void {
    this.formatId.set(formatId);
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

  pickPromotionOpponent(teamId: string): void {
    const ninth = this.tcsStandings()[8];
    const tenth = this.tcsStandings()[9];
    if (!ninth || !tenth || (teamId !== ninth.teamId && teamId !== tenth.teamId)) {
      return;
    }

    this.writeProgress({
      ...this.progress(),
      pickTeamId: teamId,
      scores: {},
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

    const scores = {
      ...this.progress().scores,
      [seriesId]: { winnerTeamId: teamId, loserGames: 1 },
    };
    if (seriesId === 'g1') {
      delete scores['g2'];
    }
    if (seriesId === 'wb' || seriesId === 'lb1') {
      delete scores['lb2'];
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
    this.writeProgress(this.emptyProgress());
  }

  private buildSeries(): PlayoffSeriesView[] {
    const formatId = this.formatId();
    if (formatId === 'worlds-2021') {
      return this.buildWorlds2021();
    }
    if (formatId === 'worlds-2023') {
      return this.buildWorlds2023();
    }
    return this.buildPromotion();
  }

  private buildWorlds2021(): PlayoffSeriesView[] {
    const rows = this.tcsStandings();
    if (rows.length < 5) {
      return [];
    }
    const first = this.seriesView('g1', '資格賽 1', rows[3], rows[4]);
    const second = this.seriesView('g2', '資格賽 2', this.winningSide(first), rows[2]);
    return [first, second];
  }

  private buildWorlds2023(): PlayoffSeriesView[] {
    const rows = this.tcsStandings();
    if (rows.length < 6) {
      return [];
    }
    const winners = this.seriesView('wb', '勝者組', rows[2], rows[3]);
    const losers = this.seriesView('lb1', '敗者組', rows[4], rows[5]);
    const losersFinal = this.seriesView('lb2', '敗者組決賽', this.losingSide(winners), this.winningSide(losers));
    return [winners, losers, losersFinal];
  }

  private buildPromotion(): PlayoffSeriesView[] {
    const tcs = this.tcsStandings();
    const tcl = this.tclStandings();
    if (tcs.length < 10 || tcl.length < 2) {
      return [];
    }

    const ninth = tcs[8];
    const tenth = tcs[9];
    const picked = this.progress().pickTeamId === ninth.teamId ? ninth : this.progress().pickTeamId === tenth.teamId ? tenth : null;
    const other = picked?.teamId === ninth.teamId ? tenth : picked ? ninth : null;
    return [
      this.seriesView('p1', '升降賽 1', picked ? tcl[0] : null, picked),
      this.seriesView('p2', '升降賽 2', other ? tcl[1] : null, other),
    ];
  }

  private buildOutcomes(): string[] {
    const formatId = this.formatId();
    if (formatId === 'worlds-2021') {
      const winner = this.winningSide(this.series().find((series) => series.id === 'g2') ?? this.emptySeries());
      return winner ? [`${winner.abbreviation} 取得世界賽第三種子`] : [];
    }
    if (formatId === 'worlds-2023') {
      const lines: string[] = [];
      const third = this.winningSide(this.series().find((series) => series.id === 'wb') ?? this.emptySeries());
      const fourth = this.winningSide(this.series().find((series) => series.id === 'lb2') ?? this.emptySeries());
      if (third) {
        lines.push(`${third.abbreviation} 取得世界賽第三種子`);
      }
      if (fourth) {
        lines.push(`${fourth.abbreviation} 取得世界賽第四種子`);
      }
      return lines;
    }

    return this.series()
      .filter((series) => series.status === 'done')
      .map((series) => {
        const winner = this.winningSide(series);
        return winner ? `${winner.abbreviation} 取得下一階段 TCS 資格` : '';
      })
      .filter((line) => line.length > 0);
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

  private emptySeries(): PlayoffSeriesView {
    return { id: '', roundLabel: '', status: 'pending', left: null, right: null, scoreText: '' };
  }

  private standingsFor(league: LeagueTier, seedIds: string[]): PlayoffStandingRow[] {
    const teams = this.teamsIn(league);
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
      inPlayoff: this.isMarked(league, index),
    }));
  }

  private isMarked(league: LeagueTier, index: number): boolean {
    const formatId = this.formatId();
    if (league === 'TCL') {
      return formatId === 'promotion-2023' && index < 2;
    }
    if (formatId === 'worlds-2021') {
      return index >= 2 && index <= 4;
    }
    if (formatId === 'worlds-2023') {
      return index >= 2 && index <= 5;
    }
    return index === 8 || index === 9;
  }

  private teamsIn(league: LeagueTier): Team[] {
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === league)
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private emptyProgress(): QualifierProgress {
    return {
      tcsSeedIds: this.teamsIn('TCS').map((team) => team.id),
      tclSeedIds: this.teamsIn('TCL').map((team) => team.id),
      pickTeamId: null,
      scores: {},
    };
  }

  private readProgress(universeId: string, formatId: QualifierFormatId): QualifierProgress {
    const stored = this.storage.getItem<QualifierProgress>(this.storageKey(universeId, formatId));
    const tcsIds = this.teamsIn('TCS').map((team) => team.id);
    const tclIds = this.teamsIn('TCL').map((team) => team.id);
    return {
      tcsSeedIds: this.mergeIds(stored?.tcsSeedIds ?? [], tcsIds),
      tclSeedIds: this.mergeIds(stored?.tclSeedIds ?? [], tclIds),
      pickTeamId: stored?.pickTeamId ?? null,
      scores: stored?.scores ?? {},
    };
  }

  private mergeIds(stored: string[], current: string[]): string[] {
    const known = new Set(current);
    const kept = stored.filter((teamId) => known.has(teamId));
    const missing = current.filter((teamId) => !kept.includes(teamId));
    return [...kept, ...missing];
  }

  private writeProgress(progress: QualifierProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId, this.formatId()), progress);
    this.progressRevision.update((value) => value + 1);
  }

  private storageKey(universeId: string, formatId: QualifierFormatId): string {
    return `eus.qualifier.${formatId}.${universeId}`;
  }
}
