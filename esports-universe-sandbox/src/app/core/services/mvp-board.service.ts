import { Injectable, computed, inject, signal } from '@angular/core';
import type { PlayerPosition } from '../models/player.model';
import { PLAYER_POSITION_LABELS } from '../models/player.model';
import type { LeagueTier } from '../models/league.model';
import type { MatchKeyPlayer } from '../../shared/sim';
import { StorageAdapter } from '../storage/storage.adapter';
import { SeasonClockService } from './season-clock.service';
import { TeamService } from './team.service';
import { UniverseService } from './universe.service';

type MvpLeague = Extract<LeagueTier, 'TCS' | 'TCL'>;

interface MvpCountEntry {
  playerId: string;
  teamId: string;
  gamertag: string;
  position: PlayerPosition;
  count: number;
}

interface MvpBoardProgress {
  year: number;
  leagues: Record<MvpLeague, Record<string, MvpCountEntry>>;
}

export interface MvpBoardRow {
  rank: number;
  playerId: string;
  teamId: string;
  gamertag: string;
  position: PlayerPosition;
  positionLabel: string;
  count: number;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
}

@Injectable({ providedIn: 'root' })
export class MvpBoardService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly teams = inject(TeamService);
  private readonly revision = signal(0);

  readonly tcsBoard = computed(() => this.boardFor('TCS'));
  readonly tclBoard = computed(() => this.boardFor('TCL'));

  record(league: MvpLeague | null | undefined, mvp: MatchKeyPlayer | null | undefined): void {
    if (!league || !mvp) {
      return;
    }
    const universeId = this.universeService.activeUniverseId();
    const year = this.clock.year();
    if (!universeId || !year) {
      return;
    }
    const progress = this.readProgress(universeId, year);
    const bucket = progress.leagues[league];
    const existing = bucket[mvp.playerId];
    bucket[mvp.playerId] = {
      playerId: mvp.playerId,
      teamId: mvp.teamId,
      gamertag: mvp.gamertag,
      position: mvp.position,
      count: (existing?.count ?? 0) + 1,
    };
    this.storage.setItem(this.storageKey(universeId), progress);
    this.revision.update((value) => value + 1);
  }

  boardFor(league: MvpLeague): MvpBoardRow[] {
    this.revision();
    this.clock.year();
    this.universeService.activeUniverseId();
    const universeId = this.universeService.activeUniverseId();
    const year = this.clock.year();
    if (!universeId || !year) {
      return [];
    }
    const progress = this.readProgress(universeId, year);
    const rows = Object.values(progress.leagues[league])
      .slice()
      .sort((left, right) => right.count - left.count || left.gamertag.localeCompare(right.gamertag));
    return rows.slice(0, 10).map((row, index) => {
      const team = this.teams.getTeamById(row.teamId);
      return {
        rank: index + 1,
        playerId: row.playerId,
        teamId: row.teamId,
        gamertag: row.gamertag,
        position: row.position,
        positionLabel: PLAYER_POSITION_LABELS[row.position],
        count: row.count,
        abbreviation: team?.abbreviation ?? '—',
        name: team?.name ?? '',
        logoUrl: team?.logoUrl ?? null,
      };
    });
  }

  private readProgress(universeId: string, year: number): MvpBoardProgress {
    const stored = this.storage.getItem<MvpBoardProgress>(this.storageKey(universeId));
    if (!stored || stored.year !== year) {
      return {
        year,
        leagues: { TCS: {}, TCL: {} },
      };
    }
    return {
      year: stored.year,
      leagues: {
        TCS: { ...(stored.leagues?.TCS ?? {}) },
        TCL: { ...(stored.leagues?.TCL ?? {}) },
      },
    };
  }

  private storageKey(universeId: string): string {
    return `eus.mvp-board.${universeId}`;
  }
}
