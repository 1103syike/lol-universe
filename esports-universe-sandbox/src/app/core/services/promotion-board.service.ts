import { Injectable, inject, signal } from '@angular/core';
import { PLAYOFF_SERIES_IDS, type PlayoffScore, type PlayoffSeriesView, type PlayoffSide } from '../models/playoff-board.model';
import type { PromotionSplit } from '../../shared/utils/year-calendar';
import { StorageAdapter } from '../storage/storage.adapter';
import { PlayoffBoardService, type PlayoffLeague } from './playoff-board.service';
import { RegularSeasonService, type RegularStanding } from './regular-season.service';
import { UniverseService } from './universe.service';

const SERIES_WIN_GAMES = 3;

interface PromotionProgress {
  tclIds: string[];
  tcsIds: string[];
  pickTeamId: string | null;
  scores: Record<string, PlayoffScore>;
}

export type PromotionStep =
  | { phase: 'pick'; chooser: RegularStanding; runner: RegularStanding; choices: RegularStanding[] }
  | { phase: 'series'; match: PlayoffSeriesView };

@Injectable({ providedIn: 'root' })
export class PromotionBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly season = inject(RegularSeasonService);
  private readonly playoff = inject(PlayoffBoardService);
  private readonly revision = signal(0);

  step(split: PromotionSplit): PromotionStep | null {
    const progress = this.read(split);
    const tcl = progress.pickTeamId ? this.rows(progress.tclIds, 'TCL') : (this.liveSeeds()?.tcl ?? []);
    const tcs = progress.pickTeamId ? this.rows(progress.tcsIds, 'TCS') : (this.liveSeeds()?.tcs ?? []);
    if (tcl.length < 2 || tcs.length < 2) {
      return null;
    }
    if (!progress.pickTeamId) {
      return { phase: 'pick', chooser: tcl[0], runner: tcl[1], choices: tcs };
    }
    const picked = tcs.find((row) => row.teamId === progress.pickTeamId) ?? null;
    const other = tcs.find((row) => row.teamId !== progress.pickTeamId) ?? null;
    const first = this.seriesView(progress, 'promo-1', '升降賽 1', tcl[0], picked);
    if (first.status !== 'done') {
      return { phase: 'series', match: first };
    }
    const second = this.seriesView(progress, 'promo-2', '升降賽 2', tcl[1], other);
    if (second.status !== 'done') {
      return { phase: 'series', match: second };
    }
    return null;
  }

  bracket(split: PromotionSplit): PlayoffSeriesView[] {
    const progress = this.read(split);
    if (!progress.pickTeamId) {
      return [];
    }
    const tcl = this.rows(progress.tclIds, 'TCL');
    const tcs = this.rows(progress.tcsIds, 'TCS');
    if (tcl.length < 2 || tcs.length < 2) {
      return [];
    }
    const picked = tcs.find((row) => row.teamId === progress.pickTeamId) ?? null;
    const other = tcs.find((row) => row.teamId !== progress.pickTeamId) ?? null;
    return [
      this.seriesView(progress, 'promo-1', '升降賽 1', tcl[0], picked),
      this.seriesView(progress, 'promo-2', '升降賽 2', tcl[1], other),
    ];
  }

  isDone(split: PromotionSplit): boolean {
    const scores = this.read(split).scores;
    return Boolean(scores['promo-1']?.winnerTeamId && scores['promo-2']?.winnerTeamId);
  }

  pick(split: PromotionSplit, teamId: string): void {
    const seeds = this.liveSeeds();
    if (!seeds) {
      return;
    }
    if (!seeds.tcs.some((row) => row.teamId === teamId)) {
      return;
    }
    if (this.read(split).pickTeamId) {
      return;
    }
    this.write(split, {
      tclIds: seeds.tcl.map((row) => row.teamId),
      tcsIds: seeds.tcs.map((row) => row.teamId),
      pickTeamId: teamId,
      scores: {},
    });
  }

  addGame(split: PromotionSplit, seriesId: string, teamId: string): void {
    const current = this.step(split);
    if (current?.phase !== 'series' || current.match.id !== seriesId || current.match.status !== 'ready') {
      return;
    }
    const match = current.match;
    if (!match.left || !match.right) {
      return;
    }
    if (teamId !== match.left.teamId && teamId !== match.right.teamId) {
      return;
    }
    const progress = this.read(split);
    const score = progress.scores[seriesId];
    let leftGames = score?.winnerTeamId ? (score.winnerTeamId === match.left.teamId ? SERIES_WIN_GAMES : score.loserGames) : (score?.homeGames ?? 0);
    let rightGames = score?.winnerTeamId ? (score.winnerTeamId === match.right.teamId ? SERIES_WIN_GAMES : score.loserGames) : (score?.awayGames ?? 0);
    if (teamId === match.left.teamId) {
      leftGames += 1;
    } else {
      rightGames += 1;
    }
    const finished = leftGames >= SERIES_WIN_GAMES || rightGames >= SERIES_WIN_GAMES;
    const nextScore: PlayoffScore = finished
      ? {
          winnerTeamId: leftGames >= SERIES_WIN_GAMES ? match.left.teamId : match.right.teamId,
          loserGames: leftGames >= SERIES_WIN_GAMES ? rightGames : leftGames,
        }
      : { winnerTeamId: '', loserGames: 0, homeGames: leftGames, awayGames: rightGames };
    this.write(split, {
      ...progress,
      scores: { ...progress.scores, [seriesId]: nextScore },
    });
  }

  private liveSeeds(): { tcl: RegularStanding[]; tcs: RegularStanding[] } | null {
    const tcl = this.finalists('TCL');
    const tcs = this.season.standingsFor('TCS').slice(8, 10);
    if (!tcl || tcs.length < 2) {
      return null;
    }
    return { tcl, tcs };
  }

  private finalists(league: PlayoffLeague): RegularStanding[] | null {
    const final = this.playoff.bundle(league).series.find((series) => series.id === PLAYOFF_SERIES_IDS.final);
    if (!final || final.status !== 'done' || !final.left || !final.right) {
      return null;
    }
    const winner = final.left.isWinner ? final.left : final.right;
    const loser = final.left.isWinner ? final.right : final.left;
    if (!winner.isWinner) {
      return null;
    }
    return [this.face(winner, 1), this.face(loser, 2)];
  }

  private face(side: PlayoffSide, rank: number): RegularStanding {
    const row = this.season.standingsFor('TCL').find((item) => item.teamId === side.teamId);
    if (row) {
      return { ...row, rank, inPlayoff: true, inLeague: true };
    }
    return {
      rank,
      teamId: side.teamId,
      abbreviation: side.abbreviation,
      name: side.name,
      logoUrl: side.logoUrl,
      seriesWins: 0,
      seriesLosses: 0,
      gameWins: 0,
      gameLosses: 0,
      winRate: null,
      streak: 0,
      inPlayoff: true,
      inLeague: true,
    };
  }

  private rows(ids: string[], league: 'TCS' | 'TCL'): RegularStanding[] {
    const table = this.season.standingsFor(league);
    return ids
      .map((teamId) => table.find((row) => row.teamId === teamId) ?? null)
      .filter((row): row is RegularStanding => !!row);
  }

  private seriesView(
    progress: PromotionProgress,
    id: string,
    roundLabel: string,
    leftSeed: RegularStanding | null,
    rightSeed: RegularStanding | null,
  ): PlayoffSeriesView {
    const score = progress.scores[id];
    const winnerId = score?.winnerTeamId || null;
    const left = leftSeed
      ? this.toSide(leftSeed, winnerId, winnerId ? (score?.loserGames ?? 0) : null, winnerId ? null : (score?.homeGames ?? 0))
      : null;
    const right = rightSeed
      ? this.toSide(rightSeed, winnerId, winnerId ? (score?.loserGames ?? 0) : null, winnerId ? null : (score?.awayGames ?? 0))
      : null;
    const done = Boolean(winnerId);
    const status = done ? 'done' : left && right ? 'ready' : 'pending';
    const scoreText = status === 'done' && left && right ? `${left.games ?? 0} - ${right.games ?? 0}` : status === 'ready' ? 'BO5' : '待定';
    return { id, roundLabel, status, left, right, scoreText };
  }

  private toSide(
    seed: RegularStanding,
    winnerTeamId: string | null,
    loserGames: number | null,
    shownGames: number | null,
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

  private read(split: PromotionSplit): PromotionProgress {
    this.revision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return this.empty();
    }
    const stored = this.storage.getItem<PromotionProgress>(this.storageKey(universeId, split)) ?? this.empty();
    return this.matchesChampion(stored) ? stored : this.empty();
  }

  private matchesChampion(progress: PromotionProgress): boolean {
    const champion = this.finalists('TCL')?.[0];
    if (!champion || progress.tclIds.length === 0) {
      return true;
    }
    if (progress.tclIds[0] === champion.teamId) {
      return true;
    }
    const started = (['promo-1', 'promo-2'] as const).some((id) => {
      const score = progress.scores[id];
      return Boolean(score?.winnerTeamId || score?.homeGames || score?.awayGames);
    });
    return started;
  }

  private write(split: PromotionSplit, progress: PromotionProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId, split), progress);
    this.revision.update((value) => value + 1);
  }

  private empty(): PromotionProgress {
    return { tclIds: [], tcsIds: [], pickTeamId: null, scores: {} };
  }

  private storageKey(universeId: string, split: PromotionSplit): string {
    return `eus.promotion.${split}.${universeId}`;
  }
}
