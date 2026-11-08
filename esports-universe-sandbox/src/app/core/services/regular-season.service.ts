import { Injectable, computed, inject, signal } from '@angular/core';
import type { Team } from '../models/team.model';
import type { LeagueTier } from '../models/league.model';
import { buildDoubleRoundRobin } from '../../shared/utils/round-robin';
import { shuffleIds } from '../../shared/utils/opening-fixtures';
import { StorageAdapter } from '../storage/storage.adapter';
import { PlayoffBoardService } from './playoff-board.service';
import { SeasonClockService } from './season-clock.service';
import { UniverseService } from './universe.service';
import { YearCalendarService } from './year-calendar.service';

const TCS_FORMAT = { teamSpots: 10, playoffSpots: 6 } as const;
const TCL_FORMAT = { teamSpots: 10, playoffSpots: 6 } as const;
const WIN_GAMES = 2;

interface SeriesScore {
  winnerTeamId: string;
  loserGames: number;
  homeGames?: number;
  awayGames?: number;
}

interface RegularProgress {
  teamIds: string[];
  scores: Record<string, SeriesScore>;
  tieScores: Record<string, SeriesScore>;
  coinOrders: Record<string, string[]>;
  roundDates: Record<string, string>;
  seasonStart: string | null;
}

export interface RegularStanding {
  rank: number;
  teamId: string;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  seriesWins: number;
  seriesLosses: number;
  gameWins: number;
  gameLosses: number;
  winRate: number | null;
  streak: number;
  inPlayoff: boolean;
  inLeague: boolean;
}

export interface RosterNotice {
  teamSpots: number;
  playoffSpots: number;
  currentCount: number;
  fieldCount: number;
  quotaDiffers: boolean;
  left: { teamId: string; abbreviation: string }[];
  joined: { teamId: string; abbreviation: string }[];
}

export interface RegularMatchView {
  id: string;
  round: number;
  homeId: string;
  awayId: string;
  homeAbbreviation: string;
  awayAbbreviation: string;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
  status: 'ready' | 'done';
  homeGames: number | null;
  awayGames: number | null;
  scoreText: string;
}

interface RankedTeam extends RegularStanding {
  wins: number;
  diff: number;
}

@Injectable({ providedIn: 'root' })
export class RegularSeasonService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly playoffBoard = inject(PlayoffBoardService);
  private readonly calendar = inject(YearCalendarService);
  private readonly revision = signal(0);
  readonly league = signal<LeagueTier>('TCS');

  readonly progress = computed(() => {
    this.revision();
    this.league();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId || !this.clock.isSupported()) {
      return this.emptyProgress();
    }
    return this.readProgress(universeId);
  });

  readonly matches = computed(() => this.buildMatches());
  readonly roundCount = computed(() => Math.max(...this.matches().map((match) => match.round), 0));
  readonly playedCount = computed(() => this.matches().filter((match) => match.status === 'done').length);
  readonly standings = computed(() => this.rankTeams());
  readonly bubble = computed(() => this.findBubble());
  readonly coinGroups = computed(() => this.findCoinGroups());
  readonly rosterNotice = computed(() => this.buildRosterNotice());
  readonly playoffSpots = computed(() => this.format().playoffSpots);
  readonly hasEnoughTeams = computed(() => this.teamOrder().length >= 2);
  readonly canAdvance = computed(() => {
    const league = this.league();
    if (league !== 'TCS' && league !== 'TCL') {
      return false;
    }
    return !this.playoffBoard.isLocked(league) && this.playoffGate(league) === 'ready';
  });

  matchesInRound(round: number): RegularMatchView[] {
    return this.matches().filter((match) => match.round === round);
  }

  fixturesFor(league: 'TCS' | 'TCL'): RegularMatchView[] {
    this.revision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId || !this.clock.isSupported()) {
      return [];
    }
    const progress = this.readProgressFor(universeId, league);
    return this.toMatchViews(this.orderFor(league, progress), progress.scores);
  }

  standingsFor(league: 'TCS' | 'TCL'): RegularStanding[] {
    this.revision();
    const universe = this.universeService.activeUniverse();
    const universeId = this.universeService.activeUniverseId();
    if (!universe || !universeId || !this.clock.isSupported()) {
      return [];
    }
    const progress = this.readProgressFor(universeId, league);
    const order = this.orderFor(league, progress);
    const teams = this.teamMap();
    const matches = this.toMatchViews(order, progress.scores);
    const totals = new Map<string, TeamRecord>();
    const field = order.map((teamId) => ({ teamId, team: teams.get(teamId) ?? null }));
    for (const entry of field) {
      totals.set(entry.teamId, emptyRecord());
    }
    for (const match of matches) {
      if (match.status !== 'done' || match.homeGames === null || match.awayGames === null) {
        continue;
      }
      const home = totals.get(match.homeId);
      const away = totals.get(match.awayId);
      if (!home || !away) {
        continue;
      }
      const homeWon = match.homeGames > match.awayGames;
      addResult(home, match.round, homeWon, match.homeGames, match.awayGames);
      addResult(away, match.round, !homeWon, match.awayGames, match.homeGames);
    }
    const rows: RankedTeam[] = field.map((entry) => {
      const total = totals.get(entry.teamId) ?? emptyRecord();
      const shown = this.presentTeam(entry.team);
      return {
        rank: 0,
        teamId: entry.teamId,
        abbreviation: shown.abbreviation,
        name: shown.name,
        logoUrl: shown.logoUrl,
        seriesWins: total.seriesWins,
        seriesLosses: total.seriesLosses,
        gameWins: total.gameWins,
        gameLosses: total.gameLosses,
        winRate: gameWinRate(total.gameWins, total.gameLosses),
        streak: currentStreak(total.results),
        inPlayoff: false,
        inLeague: entry.team?.leagueTier === league,
        wins: total.seriesWins,
        diff: total.gameWins - total.gameLosses,
      };
    });
    rows.sort((left, right) => this.compareWith(left, right, progress));
    const spots = league === 'TCL' ? TCL_FORMAT.playoffSpots : TCS_FORMAT.playoffSpots;
    return rows.map((row, index) => ({
      rank: index + 1,
      teamId: row.teamId,
      abbreviation: row.abbreviation,
      name: row.name,
      logoUrl: row.logoUrl,
      seriesWins: row.seriesWins,
      seriesLosses: row.seriesLosses,
      gameWins: row.gameWins,
      gameLosses: row.gameLosses,
      winRate: row.winRate,
      streak: row.streak,
      inPlayoff: spots > 0 && index < spots && rows.length >= spots,
      inLeague: row.inLeague,
    }));
  }

  firstIncompleteRound(): number {
    const open = this.matches().find((match) => match.status !== 'done');
    return open?.round ?? 1;
  }

  setLeague(league: LeagueTier): void {
    this.league.set(league);
  }

  seasonStart(): string | null {
    const league = this.league();
    if (league !== 'TCS' && league !== 'TCL') {
      return null;
    }
    return this.calendar.springMonday(league);
  }

  addGame(seriesId: string, teamId: string): void {
    const match = this.matches().find((item) => item.id === seriesId);
    if (!match || (teamId !== match.homeId && teamId !== match.awayId)) {
      return;
    }
    const current = this.gamesFrom(this.progress().scores[seriesId], match.homeId);
    if (current.done) {
      return;
    }
    const homeGames = current.home + (teamId === match.homeId ? 1 : 0);
    const awayGames = current.away + (teamId === match.awayId ? 1 : 0);
    const finished = homeGames >= WIN_GAMES || awayGames >= WIN_GAMES;
    const score: SeriesScore = finished
      ? {
          winnerTeamId: homeGames >= WIN_GAMES ? match.homeId : match.awayId,
          loserGames: homeGames >= WIN_GAMES ? awayGames : homeGames,
        }
      : { winnerTeamId: '', loserGames: 0, homeGames, awayGames };
    this.writeProgress({
      ...this.progress(),
      teamIds: this.teamOrder(),
      scores: { ...this.progress().scores, [seriesId]: score },
      tieScores: {},
      coinOrders: {},
    });
  }

  setWinner(seriesId: string, teamId: string): void {
    const match = this.matches().find((item) => item.id === seriesId);
    if (!match || (teamId !== match.homeId && teamId !== match.awayId)) {
      return;
    }
    const current = this.progress().scores[seriesId];
    const loserGames = current?.winnerTeamId === teamId ? current.loserGames : 0;
    this.writeProgress({
      ...this.progress(),
      teamIds: this.teamOrder(),
      scores: { ...this.progress().scores, [seriesId]: { winnerTeamId: teamId, loserGames } },
      tieScores: {},
      coinOrders: {},
    });
  }

  setLoserGames(seriesId: string, loserGames: number): void {
    const current = this.progress().scores[seriesId];
    if (!current) {
      return;
    }
    const games = Math.min(1, Math.max(0, Math.round(loserGames)));
    this.writeProgress({
      ...this.progress(),
      scores: { ...this.progress().scores, [seriesId]: { ...current, loserGames: games } },
      tieScores: {},
      coinOrders: {},
    });
  }

  private gamesFrom(score: SeriesScore | undefined, homeId: string): { home: number; away: number; done: boolean } {
    if (!score) {
      return { home: 0, away: 0, done: false };
    }
    if (!score.winnerTeamId) {
      return { home: score.homeGames ?? 0, away: score.awayGames ?? 0, done: false };
    }
    const homeWon = score.winnerTeamId === homeId;
    return {
      home: homeWon ? WIN_GAMES : score.loserGames,
      away: homeWon ? score.loserGames : WIN_GAMES,
      done: true,
    };
  }

  playBubble(league: 'TCS' | 'TCL', teamId: string): void {
    if (this.league() !== league) {
      this.league.set(league);
    }
    const bubble = this.bubble();
    if (!bubble || (teamId !== bubble.leftId && teamId !== bubble.rightId)) {
      return;
    }
    this.setTieWinner(bubble.id, teamId);
  }

  setTieWinner(seriesId: string, teamId: string): void {
    const bubble = this.bubble();
    if (!bubble || bubble.id !== seriesId) {
      return;
    }
    if (teamId !== bubble.leftId && teamId !== bubble.rightId) {
      return;
    }
    this.writeProgress({
      ...this.progress(),
      tieScores: { ...this.progress().tieScores, [seriesId]: { winnerTeamId: teamId, loserGames: 0 } },
    });
  }

  flipCoin(groupKey: string): void {
    const group = this.coinGroups().find((item) => item.key === groupKey);
    if (!group) {
      return;
    }
    const next = [...group.teamIds];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const current = next[index];
      next[index] = next[swapIndex];
      next[swapIndex] = current;
    }
    if (next.join('|') === group.teamIds.join('|') && next.length > 1) {
      const first = next[0];
      next[0] = next[1];
      next[1] = first;
    }
    this.writeProgress({
      ...this.progress(),
      coinOrders: { ...this.progress().coinOrders, [groupKey]: next },
    });
  }

  playoffGate(league: 'TCS' | 'TCL'): 'incomplete' | 'bubble' | 'ready' {
    const matches = this.fixturesFor(league);
    const rows = this.standingsFor(league);
    const spots = league === 'TCL' ? TCL_FORMAT.playoffSpots : TCS_FORMAT.playoffSpots;
    const qualified = rows.filter((row) => row.inPlayoff);
    const finished = matches.length > 0 && matches.every((match) => match.status === 'done');
    if (!finished || qualified.length !== spots) {
      return 'incomplete';
    }
    const inside = rows[spots - 1];
    const outside = rows[spots];
    const sameRecord = Boolean(
      inside &&
        outside &&
        inside.seriesWins === outside.seriesWins &&
        inside.gameWins - inside.gameLosses === outside.gameWins - outside.gameLosses,
    );
    if (sameRecord && inside && outside) {
      const universeId = this.universeService.activeUniverseId();
      const progress = universeId ? this.readProgressFor(universeId, league) : null;
      if (!progress?.tieScores[this.tieId(inside.teamId, outside.teamId)]) {
        return 'bubble';
      }
    }
    return 'ready';
  }

  isPlayoffLocked(league?: 'TCS' | 'TCL'): boolean {
    const current = league ?? this.league();
    if (current !== 'TCS' && current !== 'TCL') {
      return false;
    }
    return this.playoffBoard.isLocked(current);
  }

  advanceLeague(league: 'TCS' | 'TCL'): boolean {
    if (this.league() !== league) {
      this.league.set(league);
    }
    if (this.playoffBoard.isLocked(league) || this.playoffGate(league) !== 'ready') {
      return false;
    }
    const seedIds = this.standings()
      .filter((row) => row.inPlayoff)
      .map((row) => row.teamId);
    if (seedIds.length !== TCS_FORMAT.playoffSpots) {
      return false;
    }
    this.playoffBoard.applyLockedSeeds(league, seedIds);
    this.syncClockPhase();
    return true;
  }

  syncClockPhase(): void {
    const bothLocked = this.playoffBoard.isLocked('TCS') && this.playoffBoard.isLocked('TCL');
    this.clock.setPhase(bothLocked ? 'playoff' : 'regular');
  }

  advanceToPlayoff(): boolean {
    const league = this.league();
    if (league !== 'TCS' && league !== 'TCL') {
      return false;
    }
    return this.advanceLeague(league);
  }

  reopenRegular(): void {
    const league = this.league();
    if ((league !== 'TCS' && league !== 'TCL') || !this.playoffBoard.isLocked(league)) {
      return;
    }
    this.playoffBoard.clearLockedSeeds(league);
    this.syncClockPhase();
  }

  reset(): void {
    this.writeProgress({
      ...this.emptyProgress(),
      teamIds: shuffleIds(this.leagueTeams().map((team) => team.id)),
      roundDates: this.progress().roundDates,
      seasonStart: this.progress().seasonStart,
    });
  }

  private buildMatches(): RegularMatchView[] {
    return this.toMatchViews(this.teamOrder(), this.progress().scores);
  }

  private toMatchViews(order: string[], scores: RegularProgress['scores']): RegularMatchView[] {
    const teams = this.teamMap();
    return buildDoubleRoundRobin(order).map((match) => {
      const id = `r${match.round}-${match.homeId}-${match.awayId}`;
      const score = scores[id];
      const home = this.presentTeam(teams.get(match.homeId));
      const away = this.presentTeam(teams.get(match.awayId));
      const games = this.gamesFrom(score, match.homeId);
      const started = Boolean(score);
      return {
        id,
        round: match.round,
        homeId: match.homeId,
        awayId: match.awayId,
        homeAbbreviation: home.abbreviation,
        awayAbbreviation: away.abbreviation,
        homeName: home.name,
        awayName: away.name,
        homeLogoUrl: home.logoUrl,
        awayLogoUrl: away.logoUrl,
        status: games.done ? 'done' : 'ready',
        homeGames: started ? games.home : null,
        awayGames: started ? games.away : null,
        scoreText: started ? `${games.home} - ${games.away}` : '選擇勝方',
      };
    });
  }

  private rankTeams(): RegularStanding[] {
    const totals = new Map<string, TeamRecord>();
    const field = this.fieldEntries();
    for (const entry of field) {
      totals.set(entry.teamId, emptyRecord());
    }
    for (const match of this.matches()) {
      if (match.status !== 'done' || match.homeGames === null || match.awayGames === null) {
        continue;
      }
      const home = totals.get(match.homeId);
      const away = totals.get(match.awayId);
      if (!home || !away) {
        continue;
      }
      const homeWon = match.homeGames > match.awayGames;
      addResult(home, match.round, homeWon, match.homeGames, match.awayGames);
      addResult(away, match.round, !homeWon, match.awayGames, match.homeGames);
    }
    const rows: RankedTeam[] = field.map((entry) => {
      const total = totals.get(entry.teamId) ?? emptyRecord();
      const shown = this.presentTeam(entry.team);
      return {
        rank: 0,
        teamId: entry.teamId,
        abbreviation: shown.abbreviation,
        name: shown.name,
        logoUrl: shown.logoUrl,
        seriesWins: total.seriesWins,
        seriesLosses: total.seriesLosses,
        gameWins: total.gameWins,
        gameLosses: total.gameLosses,
        winRate: gameWinRate(total.gameWins, total.gameLosses),
        streak: currentStreak(total.results),
        inPlayoff: false,
        inLeague: entry.team?.leagueTier === this.league(),
        wins: total.seriesWins,
        diff: total.gameWins - total.gameLosses,
      };
    });
    rows.sort((left, right) => this.compareRank(left, right));
    const spots = this.playoffSpots();
    return rows.map((row, index) => ({
      rank: index + 1,
      teamId: row.teamId,
      abbreviation: row.abbreviation,
      name: row.name,
      logoUrl: row.logoUrl,
      seriesWins: row.seriesWins,
      seriesLosses: row.seriesLosses,
      gameWins: row.gameWins,
      gameLosses: row.gameLosses,
      winRate: row.winRate,
      streak: row.streak,
      inPlayoff: spots > 0 && index < spots && rows.length >= spots,
      inLeague: row.inLeague,
    }));
  }

  private compareRank(left: RankedTeam, right: RankedTeam): number {
    const record = compareSeriesThenGames(left, right);
    if (record !== 0) {
      return record;
    }
    const tieWinner = this.tieWinnerId(left.teamId, right.teamId);
    if (tieWinner === left.teamId) {
      return -1;
    }
    if (tieWinner === right.teamId) {
      return 1;
    }
    const coin = this.coinIndex(left, right);
    if (coin !== 0) {
      return coin;
    }
    return left.abbreviation.localeCompare(right.abbreviation);
  }

  private findBubble(): { id: string; leftId: string; rightId: string; leftAbbreviation: string; rightAbbreviation: string } | null {
    if (this.playedCount() !== this.matches().length || this.matches().length === 0) {
      return null;
    }
    const rows = this.standings();
    const cut = this.playoffSpots();
    if (cut === 0) {
      return null;
    }
    const inside = rows[cut - 1];
    const outside = rows[cut];
    if (!inside || !outside || !sameSeriesAndGames(inside, outside)) {
      return null;
    }
    const id = this.tieId(inside.teamId, outside.teamId);
    if (this.progress().tieScores[id]) {
      return null;
    }
    return {
      id,
      leftId: inside.teamId,
      rightId: outside.teamId,
      leftAbbreviation: inside.abbreviation,
      rightAbbreviation: outside.abbreviation,
    };
  }

  private findCoinGroups(): { key: string; teamIds: string[]; label: string }[] {
    if (this.bubble() || this.playedCount() !== this.matches().length || this.matches().length === 0) {
      return [];
    }
    const rows = this.standings();
    const groups: RegularStanding[][] = [];
    for (const row of rows) {
      const current = groups[groups.length - 1];
      const previous = current?.[0];
      if (previous && sameSeriesAndGames(previous, row)) {
        current.push(row);
      } else {
        groups.push([row]);
      }
    }
    return groups
      .flatMap((group) => {
        const inside = group.filter((row) => row.inPlayoff);
        const outside = group.filter((row) => !row.inPlayoff);
        return [inside, outside].filter((part) => part.length > 1);
      })
      .map((group) => {
        const teamIds = group.map((row) => row.teamId);
        return {
          key: [...teamIds].sort().join('|'),
          teamIds,
          label: group.map((row) => row.abbreviation).join('、'),
        };
      });
  }

  private tieWinnerId(leftId: string, rightId: string): string | null {
    return this.progress().tieScores[this.tieId(leftId, rightId)]?.winnerTeamId ?? null;
  }

  private tieId(leftId: string, rightId: string): string {
    const ordered = [leftId, rightId].sort();
    return `bubble-${ordered[0]}-${ordered[1]}`;
  }

  private coinIndex(left: RankedTeam, right: RankedTeam): number {
    const key = [left.teamId, right.teamId].sort().join('|');
    const direct = this.progress().coinOrders[key];
    if (direct) {
      return direct.indexOf(left.teamId) - direct.indexOf(right.teamId);
    }
    for (const order of Object.values(this.progress().coinOrders)) {
      const leftIndex = order.indexOf(left.teamId);
      const rightIndex = order.indexOf(right.teamId);
      if (leftIndex >= 0 && rightIndex >= 0) {
        return leftIndex - rightIndex;
      }
    }
    return 0;
  }

  private compareWith(left: RankedTeam, right: RankedTeam, progress: RegularProgress): number {
    const record = compareSeriesThenGames(left, right);
    if (record !== 0) {
      return record;
    }
    const tieWinner = progress.tieScores[this.tieId(left.teamId, right.teamId)]?.winnerTeamId ?? null;
    if (tieWinner === left.teamId) {
      return -1;
    }
    if (tieWinner === right.teamId) {
      return 1;
    }
    const coin = this.coinOrder(left.teamId, right.teamId, progress.coinOrders);
    if (coin !== 0) {
      return coin;
    }
    return left.abbreviation.localeCompare(right.abbreviation);
  }

  private coinOrder(leftId: string, rightId: string, coinOrders: Record<string, string[]>): number {
    const key = [leftId, rightId].sort().join('|');
    const direct = coinOrders[key];
    if (direct) {
      return direct.indexOf(leftId) - direct.indexOf(rightId);
    }
    for (const order of Object.values(coinOrders)) {
      const leftIndex = order.indexOf(leftId);
      const rightIndex = order.indexOf(rightId);
      if (leftIndex >= 0 && rightIndex >= 0) {
        return leftIndex - rightIndex;
      }
    }
    return 0;
  }

  private orderFor(league: 'TCS' | 'TCL', progress: RegularProgress): string[] {
    if (progress.teamIds.length >= 2) {
      return progress.teamIds;
    }
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === league)
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation))
      .map((team) => team.id);
  }

  private teamOrder(): string[] {
    const stored = this.progress().teamIds;
    if (stored.length >= 2) {
      return stored;
    }
    return this.leagueTeams().map((team) => team.id);
  }

  private hasScores(): boolean {
    return Object.keys(this.progress().scores).length > 0;
  }

  private fieldEntries(): { teamId: string; team: Team | null }[] {
    const teams = this.teamMap();
    return this.teamOrder().map((teamId) => ({ teamId, team: teams.get(teamId) ?? null }));
  }

  private buildRosterNotice(): RosterNotice {
    const current = this.leagueTeams();
    const format = this.format();
    const fieldIds = this.teamOrder();
    const currentIds = new Set(current.map((team) => team.id));
    const fieldIdsSet = new Set(fieldIds);
    const teams = this.teamMap();
    const started = this.hasScores();
    const left = started
      ? fieldIds
          .filter((teamId) => !currentIds.has(teamId))
          .map((teamId) => this.shortTeam(teams.get(teamId), teamId))
      : [];
    const joined = started
      ? current
          .filter((team) => !fieldIdsSet.has(team.id))
          .map((team) => this.shortTeam(team, team.id))
      : [];
    return {
      teamSpots: format.teamSpots,
      playoffSpots: format.playoffSpots,
      currentCount: current.length,
      fieldCount: fieldIds.length,
      quotaDiffers: current.length !== format.teamSpots,
      left,
      joined,
    };
  }

  private presentTeam(team: Team | undefined | null): { abbreviation: string; name: string; logoUrl: string | null } {
    if (!team) {
      return { abbreviation: '解散', name: '這支隊伍已不在宇宙裡', logoUrl: null };
    }
    return { abbreviation: team.abbreviation, name: team.name, logoUrl: team.logoUrl };
  }

  private shortTeam(team: Team | undefined | null, teamId: string): { teamId: string; abbreviation: string } {
    return { teamId, abbreviation: team?.abbreviation ?? '解散' };
  }

  private teamMap(): Map<string, Team> {
    return new Map((this.universeService.activeUniverse()?.teams ?? []).map((team) => [team.id, team]));
  }

  private leagueTeams(): Team[] {
    const league = this.league();
    return (this.universeService.activeUniverse()?.teams ?? [])
      .filter((team) => team.leagueTier === league)
      .slice()
      .sort((left, right) => left.abbreviation.localeCompare(right.abbreviation));
  }

  private format(): { teamSpots: number; playoffSpots: number } {
    return this.league() === 'TCL' ? TCL_FORMAT : TCS_FORMAT;
  }

  private emptyProgress(): RegularProgress {
    return { teamIds: [], scores: {}, tieScores: {}, coinOrders: {}, roundDates: {}, seasonStart: null };
  }

  private readProgressFor(universeId: string, league: 'TCS' | 'TCL'): RegularProgress {
    const stored = this.storage.getItem<RegularProgress>(this.storageKeyFor(universeId, league));
    return {
      teamIds: stored?.teamIds ?? [],
      scores: stored?.scores ?? {},
      tieScores: stored?.tieScores ?? {},
      coinOrders: stored?.coinOrders ?? {},
      roundDates: stored?.roundDates ?? {},
      seasonStart: stored?.seasonStart ?? null,
    };
  }

  private readProgress(universeId: string): RegularProgress {
    const league = this.league();
    if (league !== 'TCS' && league !== 'TCL') {
      return this.emptyProgress();
    }
    return this.readProgressFor(universeId, league);
  }

  private storageKeyFor(universeId: string, league: 'TCS' | 'TCL'): string {
    const year = this.clock.year();
    if (league === 'TCS') {
      return `eus.regular.${year}.spring.${universeId}`;
    }
    return `eus.regular.${year}.spring.${league}.${universeId}`;
  }

  private writeProgress(progress: RegularProgress): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId), progress);
    this.revision.update((value) => value + 1);
    const league = this.league();
    if ((league === 'TCS' || league === 'TCL') && this.playoffBoard.isLocked(league)) {
      this.playoffBoard.clearLockedSeeds(league);
      if (!this.playoffBoard.isLocked('TCS') && !this.playoffBoard.isLocked('TCL')) {
        this.clock.setPhase('regular');
      }
    }
  }

  private storageKey(universeId: string): string {
    const year = this.clock.year();
    if (this.league() === 'TCS') {
      return `eus.regular.${year}.spring.${universeId}`;
    }
    return `eus.regular.${year}.spring.${this.league()}.${universeId}`;
  }
}

interface TeamRecord {
  seriesWins: number;
  seriesLosses: number;
  gameWins: number;
  gameLosses: number;
  results: { round: number; won: boolean }[];
}

function emptyRecord(): TeamRecord {
  return { seriesWins: 0, seriesLosses: 0, gameWins: 0, gameLosses: 0, results: [] };
}

function addResult(record: TeamRecord, round: number, won: boolean, gamesWon: number, gamesLost: number): void {
  if (won) {
    record.seriesWins += 1;
  } else {
    record.seriesLosses += 1;
  }
  record.gameWins += gamesWon;
  record.gameLosses += gamesLost;
  record.results.push({ round, won });
}

function currentStreak(results: { round: number; won: boolean }[]): number {
  const ordered = [...results].sort((left, right) => left.round - right.round);
  const latest = ordered[ordered.length - 1];
  if (!latest) {
    return 0;
  }
  let streak = 0;
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    if (ordered[index].won !== latest.won) {
      break;
    }
    streak += 1;
  }
  return latest.won ? streak : -streak;
}

function gameWinRate(wins: number, losses: number): number | null {
  const played = wins + losses;
  if (played === 0) {
    return null;
  }
  return wins / played;
}

function compareSeriesThenGames(
  left: { wins: number; seriesLosses: number; winRate: number | null; diff: number },
  right: { wins: number; seriesLosses: number; winRate: number | null; diff: number },
): number {
  if (left.wins !== right.wins) {
    return right.wins - left.wins;
  }
  if (left.seriesLosses !== right.seriesLosses) {
    return left.seriesLosses - right.seriesLosses;
  }
  const leftRate = left.winRate ?? -1;
  const rightRate = right.winRate ?? -1;
  if (leftRate !== rightRate) {
    return rightRate - leftRate;
  }
  if (left.diff !== right.diff) {
    return right.diff - left.diff;
  }
  return 0;
}

function sameSeriesAndGames(
  left: { seriesWins: number; seriesLosses: number; gameWins: number; gameLosses: number; winRate: number | null },
  right: { seriesWins: number; seriesLosses: number; gameWins: number; gameLosses: number; winRate: number | null },
): boolean {
  return (
    compareSeriesThenGames(
      { wins: left.seriesWins, seriesLosses: left.seriesLosses, winRate: left.winRate, diff: gameMargin(left) },
      { wins: right.seriesWins, seriesLosses: right.seriesLosses, winRate: right.winRate, diff: gameMargin(right) },
    ) === 0
  );
}

function gameMargin(row: { gameWins: number; gameLosses: number }): number {
  return row.gameWins - row.gameLosses;
}
