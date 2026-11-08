import { Injectable, inject } from '@angular/core';
import { buildDoubleRoundRobin } from '../../shared/utils/round-robin';
import { SCHEDULE_YEARS } from '../../shared/utils/season-calendar';
import { fixedPlayoffFor } from '../../shared/utils/year-calendar';
import { LEAGUE_TIER_LABELS } from '../models/league.model';
import type { LeagueTier } from '../models/league.model';
import type { PlayoffSeriesView } from '../models/playoff-board.model';
import type { TeamTimelineEvent, TeamTimelineItem, TeamTimelineKind } from '../models/team-timeline.model';
import { MsiBoardService } from './msi-board.service';
import { PlayoffBoardService } from './playoff-board.service';
import { RegularSeasonService } from './regular-season.service';
import { SeasonClockService } from './season-clock.service';
import { StorageAdapter } from '../storage/storage.adapter';
import { TransferWindowService } from './transfer-window.service';
import { UniverseService } from './universe.service';

const SEASON_YEARS = SCHEDULE_YEARS;
const WIN_GAMES = 2;

interface SeriesScore {
  winnerTeamId: string;
  loserGames: number;
}

interface RegularProgress {
  teamIds: string[];
  scores: Record<string, SeriesScore>;
  tieScores: Record<string, SeriesScore>;
  coinOrders: Record<string, string[]>;
}

interface RankRow {
  teamId: string;
  abbreviation: string;
  seriesWins: number;
  seriesLosses: number;
  gameWins: number;
  gameLosses: number;
}

@Injectable({ providedIn: 'root' })
export class TeamTimelineService {
  private readonly universeService = inject(UniverseService);
  private readonly storage = inject(StorageAdapter);
  private readonly season = inject(RegularSeasonService);
  private readonly playoff = inject(PlayoffBoardService);
  private readonly msi = inject(MsiBoardService);
  private readonly clock = inject(SeasonClockService);
  private readonly windows = inject(TransferWindowService);

  itemsFor(teamId: string): TeamTimelineItem[] {
    this.season.playedCount();
    this.playoff.schedule();
    this.clock.year();
    this.msi.championRecord();

    const universe = this.universeService.activeUniverse();
    const team = universe?.teams.find((item) => item.id === teamId);
    if (!universe || !team) {
      return [];
    }

    const hidden = new Set(universe.hiddenTimelineIds);
    const stored = universe.teamEvents
      .filter((event) => event.teamId === teamId)
      .map((event) => this.toStoredItem(event));
    const founded = this.foundedItem(team.name, universe.startYear, teamId);
    const seasons = this.seasonItems(teamId, universe.id);
    const titles = this.titleItems(teamId);

    return [...stored, founded, ...seasons, ...titles].filter((item) => !hidden.has(item.id)).sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }
      return left.recordedAt.localeCompare(right.recordedAt);
    });
  }

  recordAcquisition(teamId: string, buyer: string): void {
    const name = buyer.trim();
    if (!name) {
      throw new Error('收購方不可為空');
    }
    this.windows.assertOpen();
    this.assertTeam(teamId);
    this.append(teamId, 'acquired', `被 ${name} 收購`, null);
  }

  recordRename(
    teamId: string,
    before: { abbreviation: string; name: string },
    after: { abbreviation: string; name: string },
  ): void {
    const from = `${before.abbreviation} ${before.name}`.trim();
    const to = `${after.abbreviation} ${after.name}`.trim();
    if (from === to) {
      return;
    }
    this.append(teamId, 'renamed', `由 ${from} 更名為 ${to}`, null);
  }

  recordSponsorship(
    teamId: string,
    before: string,
    after: string,
  ): void {
    if (before === after) {
      return;
    }
    this.windows.assertOpen();
    this.assertTeam(teamId);
    if (!after) {
      this.append(teamId, 'sponsored', `解除冠名（原 ${before}）`, null);
      return;
    }
    if (!before) {
      this.append(teamId, 'sponsored', `冠名為 ${after}`, null);
      return;
    }
    this.append(teamId, 'sponsored', `冠名由 ${before} 改為 ${after}`, null);
  }

  recordLeagueChange(teamId: string, from: LeagueTier, to: LeagueTier, date?: string): void {
    if (from === to) {
      return;
    }
    this.append(
      teamId,
      'league-changed',
      `聯賽層級由 ${LEAGUE_TIER_LABELS[from]} 改為 ${LEAGUE_TIER_LABELS[to]}`,
      null,
      date,
    );
  }

  recordPlayerMove(move: {
    playerId: string;
    gamertag: string;
    fromTeamId: string | null;
    toTeamId: string | null;
    leftDetail?: string;
  }): void {
    if (move.fromTeamId === move.toTeamId) {
      return;
    }

    const fromName = this.teamLabel(move.fromTeamId);
    const toName = this.teamLabel(move.toTeamId);

    if (move.fromTeamId) {
      const detail = move.leftDetail ?? (move.toTeamId ? `，前往 ${toName}` : '，成為自由球員');
      this.append(move.fromTeamId, 'player-left', `${move.gamertag} 離開${detail}`, move.playerId);
    }
    if (move.toTeamId) {
      const detail = move.fromTeamId ? `，來自 ${fromName}` : '';
      this.append(move.toTeamId, 'player-joined', `${move.gamertag} 加入${detail}`, move.playerId);
    }
  }

  deleteItem(itemId: string): void {
    const universe = this.universeService.activeUniverse();
    if (!universe || !itemId) {
      return;
    }

    const kept = universe.teamEvents.filter((event) => event.id !== itemId);
    if (kept.length !== universe.teamEvents.length) {
      this.universeService.patchActiveUniverse({ teamEvents: kept });
      return;
    }

    if (universe.hiddenTimelineIds.includes(itemId)) {
      return;
    }

    this.universeService.patchActiveUniverse({
      hiddenTimelineIds: [...universe.hiddenTimelineIds, itemId],
    });
  }

  removeTeam(teamId: string): void {
    const universe = this.universeService.activeUniverse();
    if (!universe) {
      return;
    }
    this.universeService.patchActiveUniverse({
      teamEvents: universe.teamEvents.filter((event) => event.teamId !== teamId),
    });
  }

  private append(
    teamId: string,
    kind: TeamTimelineKind,
    summary: string,
    playerId: string | null,
    date?: string,
  ): void {
    const universe = this.universeService.activeUniverse();
    if (!universe) {
      throw new Error('尚未選擇宇宙');
    }

    const event: TeamTimelineEvent = {
      id: crypto.randomUUID(),
      teamId,
      kind,
      date: date ?? universe.currentDate.slice(0, 10),
      recordedAt: new Date().toISOString(),
      summary,
      playerId,
    };

    this.universeService.patchActiveUniverse({
      teamEvents: [...universe.teamEvents, event],
    });
  }

  private assertTeam(teamId: string): void {
    const exists = this.universeService.activeUniverse()?.teams.some((team) => team.id === teamId);
    if (!exists) {
      throw new Error('找不到隊伍');
    }
  }

  private teamLabel(teamId: string | null): string {
    if (!teamId) {
      return '自由球員';
    }
    const team = this.universeService.activeUniverse()?.teams.find((item) => item.id === teamId);
    return team?.abbreviation ?? '已解散隊伍';
  }

  private foundedItem(name: string, startYear: number, teamId: string): TeamTimelineItem {
    return {
      id: `founded-${teamId}`,
      date: `${startYear}-01-01`,
      recordedAt: '1970-01-01T00:00:00.000Z',
      kindLabel: '成立',
      title: `${name} 成立`,
      detail: '',
      playerId: null,
      isSeason: false,
    };
  }

  private toStoredItem(event: TeamTimelineEvent): TeamTimelineItem {
    return {
      id: event.id,
      date: event.date,
      recordedAt: event.recordedAt,
      kindLabel: kindLabel(event.kind),
      title: event.summary,
      detail: '',
      playerId: event.playerId,
      isSeason: false,
    };
  }

  private seasonItems(teamId: string, universeId: string): TeamTimelineItem[] {
    const items: TeamTimelineItem[] = [];
    const teams = this.universeService.activeUniverse()?.teams ?? [];
    const names = new Map(teams.map((team) => [team.id, team.abbreviation]));

    for (const year of SEASON_YEARS) {
      items.push(
        ...this.leagueSeason(teamId, universeId, year, 'TCS', 6, names),
      );
      items.push(...this.leagueSeason(teamId, universeId, year, 'TCL', 6, names));
    }

    return items;
  }

  private titleItems(teamId: string): TeamTimelineItem[] {
    const year = this.clock.year();
    const items: TeamTimelineItem[] = [];
    items.push(...this.playoffTitles(teamId, year, 'TCS'));
    items.push(...this.playoffTitles(teamId, year, 'TCL'));
    for (const finish of this.msi.finishRecords()) {
      if (finish.teamId !== teamId) {
        continue;
      }
      items.push({
        id: `title-${year}-msi-${finish.place}-${teamId}`,
        date: finish.date,
        recordedAt: `${finish.date}T18:00:00.000Z`,
        kindLabel: finish.place,
        title: `${year} MSI ${finish.place}`,
        detail: `小場 ${finish.wins}-${finish.losses}`,
        playerId: null,
        isSeason: true,
      });
    }
    return items;
  }

  private playoffTitles(teamId: string, year: number, league: 'TCS' | 'TCL'): TeamTimelineItem[] {
    const dates = fixedPlayoffFor(year, 'springPlayoff', league);
    const series = this.playoff.bundle(league).series;
    const finishes = springFinishes(series).filter((item) => item.teamId === teamId);
    return finishes.map((finish) => {
      const line = seriesGames(series, teamId);
      const date = dates?.[finish.slot] ?? `${year}-04-10`;
      return {
        id: `title-${year}-${league}-${finish.place}-${teamId}`,
        date,
        recordedAt: `${date}T18:00:00.000Z`,
        kindLabel: finish.place,
        title: `${year} ${league} 春季${finish.place}`,
        detail: `小場 ${line.wins}-${line.losses}`,
        playerId: null,
        isSeason: true,
      };
    });
  }

  private leagueSeason(
    teamId: string,
    universeId: string,
    year: number,
    league: 'TCS' | 'TCL',
    playoffSpots: number,
    names: Map<string, string>,
  ): TeamTimelineItem[] {
    const key =
      league === 'TCS'
        ? `eus.regular.${year}.spring.${universeId}`
        : `eus.regular.${year}.spring.${league}.${universeId}`;
    const progress = this.storage.getItem<RegularProgress>(key);
    if (!progress?.teamIds.includes(teamId) || Object.keys(progress.scores ?? {}).length === 0) {
      return [];
    }

    const row = rankField(progress, names).find((item) => item.teamId === teamId);
    if (!row) {
      return [];
    }

    const schedule = buildDoubleRoundRobin(progress.teamIds);
    const played = schedule.filter((match) => progress.scores[`r${match.round}-${match.homeId}-${match.awayId}`]).length;
    const complete = schedule.length > 0 && played === schedule.length;
    const parts = [
      `第 ${row.rank} 名`,
      `大場 ${row.seriesWins}-${row.seriesLosses}`,
      `小場 ${row.gameWins}-${row.gameLosses}`,
    ];
    if (!complete) {
      parts.push('進行中');
    } else if (playoffSpots > 0) {
      parts.push(row.rank <= playoffSpots ? '季後賽區' : '未進季後賽');
    }

    return [
      {
        id: `season-${year}-${league}-${teamId}`,
        date: complete ? `${year}-06-30` : this.universeService.activeUniverse()?.currentDate.slice(0, 10) ?? `${year}-01-01`,
        recordedAt: complete ? `${year}-06-30T12:00:00.000Z` : new Date().toISOString(),
        kindLabel: '例行賽',
        title: `${year} 春季例行賽 · ${league}`,
        detail: parts.join(' · '),
        playerId: null,
        isSeason: true,
      },
    ];
  }
}

function springFinishes(series: PlayoffSeriesView[]): Array<{
  place: '冠軍' | '亞軍' | '四強';
  teamId: string;
  slot: 'sf-1' | 'sf-2' | 'final';
}> {
  const finishes: Array<{ place: '冠軍' | '亞軍' | '四強'; teamId: string; slot: 'sf-1' | 'sf-2' | 'final' }> = [];
  for (const id of ['sf-1', 'sf-2'] as const) {
    const match = series.find((item) => item.id === id);
    if (!match || match.status !== 'done' || !match.left || !match.right) {
      continue;
    }
    const loser = match.left.isWinner ? match.right : match.left;
    finishes.push({ place: '四強', teamId: loser.teamId, slot: id });
  }
  const final = series.find((item) => item.id === 'final');
  if (!final || final.status !== 'done' || !final.left || !final.right) {
    return finishes;
  }
  const winner = final.left.isWinner ? final.left : final.right;
  const loser = final.left.isWinner ? final.right : final.left;
  finishes.push({ place: '冠軍', teamId: winner.teamId, slot: 'final' });
  finishes.push({ place: '亞軍', teamId: loser.teamId, slot: 'final' });
  return finishes;
}

function seriesGames(series: PlayoffSeriesView[], teamId: string): { wins: number; losses: number } {
  let wins = 0;
  let losses = 0;
  for (const match of series) {
    if (match.status !== 'done' || !match.left || !match.right) {
      continue;
    }
    let own: PlayoffSeriesView['left'] = null;
    let other: PlayoffSeriesView['right'] = null;
    if (match.left.teamId === teamId) {
      own = match.left;
      other = match.right;
    } else if (match.right.teamId === teamId) {
      own = match.right;
      other = match.left;
    }
    if (!own || !other) {
      continue;
    }
    wins += own.games ?? 0;
    losses += other.games ?? 0;
  }
  return { wins, losses };
}

function kindLabel(kind: TeamTimelineKind): string {
  if (kind === 'acquired') {
    return '收購';
  }
  if (kind === 'renamed') {
    return '更名';
  }
  if (kind === 'sponsored') {
    return '冠名';
  }
  if (kind === 'player-joined') {
    return '加入';
  }
  if (kind === 'player-left') {
    return '離開';
  }
  return '層級';
}

function rankField(progress: RegularProgress, names: Map<string, string>): Array<RankRow & { rank: number }> {
  const rows = new Map<string, RankRow>();
  for (const teamId of progress.teamIds) {
    rows.set(teamId, {
      teamId,
      abbreviation: names.get(teamId) ?? '解散',
      seriesWins: 0,
      seriesLosses: 0,
      gameWins: 0,
      gameLosses: 0,
    });
  }

  for (const match of buildDoubleRoundRobin(progress.teamIds)) {
    const score = progress.scores[`r${match.round}-${match.homeId}-${match.awayId}`];
    if (!score?.winnerTeamId) {
      continue;
    }
    const homeWon = score.winnerTeamId === match.homeId;
    const awayWon = score.winnerTeamId === match.awayId;
    addSeries(rows.get(match.homeId), homeWon, homeWon ? WIN_GAMES : score.loserGames, awayWon ? WIN_GAMES : score.loserGames);
    addSeries(rows.get(match.awayId), awayWon, awayWon ? WIN_GAMES : score.loserGames, homeWon ? WIN_GAMES : score.loserGames);
  }

  return [...rows.values()]
    .sort((left, right) => compareRank(left, right, progress))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function addSeries(row: RankRow | undefined, won: boolean, gamesWon: number, gamesLost: number): void {
  if (!row) {
    return;
  }
  if (won) {
    row.seriesWins += 1;
  } else {
    row.seriesLosses += 1;
  }
  row.gameWins += gamesWon;
  row.gameLosses += gamesLost;
}

function compareRank(left: RankRow, right: RankRow, progress: RegularProgress): number {
  if (left.seriesWins !== right.seriesWins) {
    return right.seriesWins - left.seriesWins;
  }
  if (left.seriesLosses !== right.seriesLosses) {
    return left.seriesLosses - right.seriesLosses;
  }
  const leftRate = gameWinRate(left.gameWins, left.gameLosses);
  const rightRate = gameWinRate(right.gameWins, right.gameLosses);
  if (leftRate !== rightRate) {
    return rightRate - leftRate;
  }
  const margin = right.gameWins - right.gameLosses - (left.gameWins - left.gameLosses);
  if (margin !== 0) {
    return margin;
  }
  const tieWinner = progress.tieScores[tieId(left.teamId, right.teamId)]?.winnerTeamId;
  if (tieWinner === left.teamId) {
    return -1;
  }
  if (tieWinner === right.teamId) {
    return 1;
  }
  const coin = coinIndex(left.teamId, right.teamId, progress.coinOrders);
  if (coin !== 0) {
    return coin;
  }
  return left.abbreviation.localeCompare(right.abbreviation);
}

function gameWinRate(wins: number, losses: number): number {
  const played = wins + losses;
  if (played === 0) {
    return -1;
  }
  return wins / played;
}

function tieId(leftId: string, rightId: string): string {
  const ordered = [leftId, rightId].sort();
  return `bubble-${ordered[0]}-${ordered[1]}`;
}

function coinIndex(leftId: string, rightId: string, orders: Record<string, string[]>): number {
  const key = [leftId, rightId].sort().join('|');
  const direct = orders[key];
  if (direct) {
    return direct.indexOf(leftId) - direct.indexOf(rightId);
  }
  for (const order of Object.values(orders)) {
    const leftIndex = order.indexOf(leftId);
    const rightIndex = order.indexOf(rightId);
    if (leftIndex >= 0 && rightIndex >= 0) {
      return leftIndex - rightIndex;
    }
  }
  return 0;
}
