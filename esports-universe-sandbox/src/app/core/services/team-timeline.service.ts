import { Injectable, inject } from '@angular/core';
import { buildDoubleRoundRobin } from '../../shared/utils/round-robin';
import { LEAGUE_TIER_LABELS } from '../models/league.model';
import type { LeagueTier } from '../models/league.model';
import type { TeamTimelineEvent, TeamTimelineItem, TeamTimelineKind } from '../models/team-timeline.model';
import { PlayoffBoardService } from './playoff-board.service';
import { RegularSeasonService } from './regular-season.service';
import { SeasonClockService } from './season-clock.service';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

const SEASON_YEARS = [2021, 2022];
const WIN_GAMES = 2;
const FINAL_SERIES_ID = 'final';

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

interface PlayoffProgress {
  seedTeamIds: string[];
  scores: Record<string, SeriesScore>;
  seedsLocked: boolean;
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
  private readonly clock = inject(SeasonClockService);

  itemsFor(teamId: string): TeamTimelineItem[] {
    this.season.playedCount();
    this.playoff.schedule();
    this.clock.year();

    const universe = this.universeService.activeUniverse();
    const team = universe?.teams.find((item) => item.id === teamId);
    if (!universe || !team) {
      return [];
    }

    const hidden = new Set(universe.hiddenTimelineIds);
    const stored = universe.teamEvents
      .filter((event) => event.teamId === teamId)
      .map((event) => this.toStoredItem(event));
    const founded = this.foundedItem(team.abbreviation, team.name, universe.teamEvents, teamId, universe.startYear);
    const seasons = this.seasonItems(teamId, universe.id);

    return [...stored, founded, ...seasons].filter((item) => !hidden.has(item.id)).sort((left, right) => {
      if (left.date !== right.date) {
        return right.date.localeCompare(left.date);
      }
      return right.recordedAt.localeCompare(left.recordedAt);
    });
  }

  recordAcquisition(teamId: string, buyer: string): void {
    const name = buyer.trim();
    if (!name) {
      throw new Error('收購方不可為空');
    }
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

  recordLeagueChange(teamId: string, from: LeagueTier, to: LeagueTier): void {
    if (from === to) {
      return;
    }
    this.append(
      teamId,
      'league-changed',
      `聯賽層級由 ${LEAGUE_TIER_LABELS[from]} 改為 ${LEAGUE_TIER_LABELS[to]}`,
      null,
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

  private append(teamId: string, kind: TeamTimelineKind, summary: string, playerId: string | null): void {
    const universe = this.universeService.activeUniverse();
    if (!universe) {
      throw new Error('尚未選擇宇宙');
    }

    const event: TeamTimelineEvent = {
      id: crypto.randomUUID(),
      teamId,
      kind,
      date: universe.currentDate.slice(0, 10),
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

  private foundedItem(
    abbreviation: string,
    name: string,
    events: TeamTimelineEvent[],
    teamId: string,
    startYear: number,
  ): TeamTimelineItem {
    const firstRename = events
      .filter((event) => event.teamId === teamId && event.kind === 'renamed')
      .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))[0];
    const original = firstRename ? renameOrigin(firstRename.summary) : `${abbreviation} ${name}`.trim();

    return {
      id: `founded-${teamId}`,
      date: `${startYear}-01-01`,
      recordedAt: '1970-01-01T00:00:00.000Z',
      kindLabel: '成立',
      title: `以 ${original} 成立`,
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
    const playoff = this.storage.getItem<PlayoffProgress>(`eus.playoff.${universeId}`);
    const tclPlayoff = this.storage.getItem<PlayoffProgress>(`eus.playoff.TCL.${universeId}`);
    const clockYear = this.clock.year();

    for (const year of SEASON_YEARS) {
      items.push(
        ...this.leagueSeason(teamId, universeId, year, 'TCS', 6, names, playoff, clockYear),
      );
      items.push(...this.leagueSeason(teamId, universeId, year, 'TCL', 6, names, tclPlayoff, clockYear));
    }

    return items;
  }

  private leagueSeason(
    teamId: string,
    universeId: string,
    year: number,
    league: 'TCS' | 'TCL',
    playoffSpots: number,
    names: Map<string, string>,
    playoff: PlayoffProgress | null,
    clockYear: number,
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

    if (year === clockYear && playoff?.seedsLocked) {
      const seed = playoff.seedTeamIds.indexOf(teamId);
      if (seed >= 0) {
        parts.push(`第 ${seed + 1} 種子`);
      }
      if (playoff.scores?.[FINAL_SERIES_ID]?.winnerTeamId === teamId) {
        parts.push('季後賽冠軍');
      }
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

function kindLabel(kind: TeamTimelineKind): string {
  if (kind === 'acquired') {
    return '收購';
  }
  if (kind === 'renamed') {
    return '更名';
  }
  if (kind === 'player-joined') {
    return '加入';
  }
  if (kind === 'player-left') {
    return '離開';
  }
  return '層級';
}

function renameOrigin(summary: string): string {
  const matched = summary.match(/^由 (.+) 更名為 /);
  return matched?.[1] ?? summary;
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
