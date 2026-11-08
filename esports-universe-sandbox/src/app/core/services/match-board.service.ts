import { Injectable, computed, inject } from '@angular/core';
import { PLAYER_POSITION_LABELS, PLAYER_POSITIONS, type PlayerPosition } from '../models/player.model';
import { PlayerService } from './player.service';
import { RegularSeasonService, type RegularMatchView, type RegularStanding } from './regular-season.service';
import { UniverseService } from './universe.service';
import { YearCalendarService } from './year-calendar.service';
import { dateForWeekSlot, fromIsoDate, kickoffLabel } from '../../shared/utils/season-calendar';
import { calculatePlayerOvr, calculateTeamOvr } from '../../shared/utils/player-ovr';

export interface SlateMatch extends RegularMatchView {
  league: 'TCS' | 'TCL';
  iso: string;
  kickoff: string;
  homeRank: number;
  awayRank: number;
  homeRecord: string;
  awayRecord: string;
}

export interface RosterSpot {
  id: string;
  position: string;
  gamertag: string;
  ovr: number;
}

export interface RosterLine {
  position: PlayerPosition;
  label: string;
  players: RosterSpot[];
}

export interface MatchBoard {
  today: string;
  current: SlateMatch | null;
  upcoming: SlateMatch[];
  tcsResults: SlateMatch[];
  tclResults: SlateMatch[];
  tcsTable: RegularStanding[];
  tclTable: RegularStanding[];
  canFastForward: boolean;
}

@Injectable({ providedIn: 'root' })
export class MatchBoardService {
  private readonly universeService = inject(UniverseService);
  private readonly season = inject(RegularSeasonService);
  private readonly players = inject(PlayerService);
  private readonly calendar = inject(YearCalendarService);

  readonly board = computed(() => this.buildBoard());

  roster(teamId: string): RosterSpot[] {
    return this.rosterLines(teamId).flatMap((line) => line.players);
  }

  teamOvr(teamId: string): number {
    if (!teamId) {
      return 0;
    }
    return calculateTeamOvr(this.players.getPlayersByTeamId(teamId));
  }

  rosterLines(teamId: string): RosterLine[] {
    const byRole = new Map<PlayerPosition, RosterSpot[]>(
      PLAYER_POSITIONS.map((position) => [position, []]),
    );
    for (const player of this.players.getPlayersByTeamId(teamId)) {
      byRole.get(player.position)?.push({
        id: player.id,
        position: PLAYER_POSITION_LABELS[player.position],
        gamertag: player.gamertag,
        ovr: calculatePlayerOvr(player.attributes, player.position),
      });
    }
    return PLAYER_POSITIONS.map((position) => ({
      position,
      label: PLAYER_POSITION_LABELS[position],
      players: byRole.get(position) ?? [],
    }));
  }

  dateText(iso: string): string {
    if (!iso) {
      return '日期未排';
    }
    const date = fromIsoDate(iso);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  shortDate(iso: string): string {
    if (!iso) {
      return '未排';
    }
    const date = fromIsoDate(iso);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  fastForward(): void {
    const next = this.board().current;
    if (!next?.iso || !this.board().canFastForward) {
      return;
    }
    this.universeService.setCurrentDate(next.iso);
  }

  hasArrived(match: SlateMatch): boolean {
    const today = this.board().today;
    return Boolean(match.iso && today && today >= match.iso);
  }

  playGame(match: SlateMatch, teamId: string): void {
    if (!this.hasArrived(match)) {
      return;
    }
    this.withLeague(match.league, () => this.season.addGame(match.id, teamId));
  }

  finishSeries(match: SlateMatch, winnerTeamId: string): void {
    if (!this.hasArrived(match) || (winnerTeamId !== match.homeId && winnerTeamId !== match.awayId)) {
      return;
    }
    this.withLeague(match.league, () => this.season.setWinner(match.id, winnerTeamId));
  }

  private buildBoard(): MatchBoard {
    const today = (this.universeService.activeUniverse()?.currentDate ?? '').slice(0, 10);
    const tcsTable = this.season.standingsFor('TCS');
    const tclTable = this.season.standingsFor('TCL');
    const matches = [...this.datedMatches('TCS', tcsTable), ...this.datedMatches('TCL', tclTable)];
    matches.sort((left, right) => this.compareSlate(left, right));
    const pending = matches.filter((match) => match.status !== 'done');
    const current = pending[0] ?? null;
    const finished = (league: 'TCS' | 'TCL') =>
      matches.filter((match) => match.league === league && match.status === 'done').slice(-4).reverse();
    return {
      today,
      current,
      upcoming: pending.slice(1, 6),
      tcsResults: finished('TCS'),
      tclResults: finished('TCL'),
      tcsTable,
      tclTable,
      canFastForward: Boolean(current?.iso && today && today < current.iso),
    };
  }

  private datedMatches(league: 'TCS' | 'TCL', table: RegularStanding[]): SlateMatch[] {
    const monday = this.calendar.springMonday(league);
    const matches = this.season.fixturesFor(league);
    const records = new Map(table.map((row) => [row.teamId, { rank: row.rank, record: `${row.seriesWins}-${row.seriesLosses}` }]));
    return matches.map((match) => {
      const weekIndex = Math.floor((match.round - 1) / 2);
      const mates = matches.filter((item) => Math.floor((item.round - 1) / 2) === weekIndex);
      const indexInWeek = mates.findIndex((item) => item.id === match.id);
      const home = records.get(match.homeId);
      const away = records.get(match.awayId);
      return {
        ...match,
        league,
        iso: monday ? dateForWeekSlot(monday, weekIndex, indexInWeek) : '',
        kickoff: kickoffLabel(league, indexInWeek),
        homeRank: home?.rank ?? 0,
        awayRank: away?.rank ?? 0,
        homeRecord: home?.record ?? '0-0',
        awayRecord: away?.record ?? '0-0',
      };
    });
  }

  private compareSlate(left: SlateMatch, right: SlateMatch): number {
    if (left.iso !== right.iso) {
      if (!left.iso) {
        return 1;
      }
      if (!right.iso) {
        return -1;
      }
      return left.iso.localeCompare(right.iso);
    }
    if (left.league !== right.league) {
      return left.league === 'TCL' ? -1 : 1;
    }
    if (left.kickoff !== right.kickoff) {
      return left.kickoff.localeCompare(right.kickoff);
    }
    return left.round - right.round || left.id.localeCompare(right.id);
  }

  private withLeague(league: 'TCS' | 'TCL', action: () => void): void {
    const previous = this.season.league();
    if (previous !== league) {
      this.season.setLeague(league);
    }
    action();
    if (previous !== league) {
      this.season.setLeague(previous);
    }
  }
}
