import { DecimalPipe, NgStyle, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PlayoffSeriesView, PlayoffSide } from '../../core/models/playoff-board.model';
import { PLAYER_POSITION_LABELS, PLAYER_POSITIONS, type PlayerPosition } from '../../core/models/player.model';
import type { TeamTimelineKind } from '../../core/models/team-timeline.model';
import type { RosterSpot, SlateMatch } from '../../core/services/match-board.service';
import { MatchBoardService } from '../../core/services/match-board.service';
import { CompetitionStatsService } from '../../core/services/competition-stats.service';
import type { StatsCompetition } from '../../core/models/competition-stats.model';
import { MvpBoardService, type MvpBoardRow } from '../../core/services/mvp-board.service';
import { PlayoffBoardService, type PlayoffLeague } from '../../core/services/playoff-board.service';
import { RegularSeasonService, type RegularStanding } from '../../core/services/regular-season.service';
import { SeasonClockService } from '../../core/services/season-clock.service';
import { CoachService } from '../../core/services/coach.service';
import { PlayerService } from '../../core/services/player.service';
import { TransferWindowService, type TransferWindowState } from '../../core/services/transfer-window.service';
import { UniverseService } from '../../core/services/universe.service';
import { YearCalendarService } from '../../core/services/year-calendar.service';
import { championSplashUrl, getChampionById } from '../../core/models/champion.model';
import { COMP_INTENT_LABELS, type CompIntent } from '../../core/models/patch.model';
import { ChampionIconComponent } from '../../shared/ui/champion-icon/champion-icon.component';
import { ItemIconComponent } from '../../shared/ui/item-icon/item-icon.component';
import { MatchMapTrackComponent } from '../../shared/ui/match-map-track/match-map-track.component';
import { RoleIconComponent } from '../../shared/ui/role-icon/role-icon.component';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { PromotionBoardService } from '../../core/services/promotion-board.service';
import { MsiBoardService, type MsiHero, type MsiMatchView, type MsiSide, type MsiTable } from '../../core/services/msi-board.service';
import { getMsiGuestBundle, msiGuestRosterLines } from '../../core/data/msi-guest-roster';
import { StorageAdapter } from '../../core/storage/storage.adapter';
import { calculatePlayerOvr } from '../../shared/utils/player-ovr';
import { resolveTeamLogoUrl } from '../../shared/utils/team-logo';
import {
  buildMatchDigest,
  buildMatchReplayLog,
  explainReason,
  PHASE_LABELS,
  pickBubbleWinnerByProfile,
  pickMvpVerdict,
  simulateGameAsync,
  type MatchBoxScore,
  type MatchReplayLogEntry,
  type MatchReport,
  type MatchSideInput,
  type PlayerMatchStats,
} from '../../shared/sim';

import {
  markerToIcon,
  scoreboardIconStyle,
  type ScoreboardIconId,
  type ScoreboardSide,
} from '../../shared/sim/scoreboard-icons';
import { internationalWindows, type InternationalWindow } from '../../shared/utils/international-events';
import { addIsoDays, kickoffLabel, dateForWeekSlot, mondayOnOrBefore } from '../../shared/utils/season-calendar';
import { fixedRegular, type PromotionSplit } from '../../shared/utils/year-calendar';

interface CrownStat {
  label: string;
  value: string;
}

interface CrownRosterSpot {
  role: string;
  gamertag: string;
  isFirstTitle: boolean;
  titleMark: string | null;
}

interface CrownCoach {
  name: string;
  isFirstTitle: boolean;
  titleMark: string;
}

interface CrownMoment {
  id: string;
  scene: 'tcs' | 'tcl' | 'msi';
  mark: string;
  title: string;
  date: string;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  stats: CrownStat[];
  isFirstTitle: boolean;
  titleMark: string;
  coach: CrownCoach | null;
  roster: CrownRosterSpot[];
}

type PromoOutcome = 'up' | 'fail' | 'hold' | 'down';

interface PromoSide {
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  tag: string;
  outcome: PromoOutcome;
}

interface PromoRow {
  id: string;
  score: string;
  swapped: boolean;
  tcs: PromoSide;
  tcl: PromoSide;
}

interface PromoMoment {
  id: string;
  title: string;
  date: string;
  rows: PromoRow[];
}

interface TableMoment {
  id: string;
  league: 'TCS' | 'TCL';
  scene: 'tcs' | 'tcl';
  date: string;
  rows: RegularStanding[];
}

interface SummerGap {
  start: string;
  worldsStart: string;
}

interface TransferFeedItem {
  id: string;
  date: string;
  text: string;
  teamAbbr: string;
  kind: TeamTimelineKind;
}

interface TransferPulse {
  window: TransferWindowState;
  items: TransferFeedItem[];
}

interface EventSpotlight {
  scene: InternationalWindow['scene'];
  label: string;
  mark: string;
  start: string;
  end: string;
  phaseLabel: string;
  jumpIso: string;
}

const GROUP_PAGE_MS = 6400;

const PLAYOFF_DATE_ID: Record<string, string> = {
  'r1-high': 'qf-1',
  'r1-low': 'qf-2',
  'sf-1': 'sf-1',
  'sf-2': 'sf-2',
  final: 'final',
};

interface PlayoffChoice {
  teamId: string;
  abbreviation: string;
  name: string;
  logoUrl: string | null;
  rank: number;
}

interface PlayoffStep {
  kind: 'pick' | 'series' | 'done';
  title: string;
  pick?: 'round' | 'semi';
  chooser?: PlayoffChoice;
  bench?: PlayoffChoice;
  choices?: PlayoffChoice[];
  match?: PlayoffSeriesView;
  iso?: string;
  winner?: string;
}

interface PlayoffQueueItem {
  league: PlayoffLeague;
  match: PlayoffSeriesView;
  iso: string;
  kickoff: string;
}

interface PlayoffPickResult {
  chooser: PlayoffChoice;
  choice: PlayoffChoice;
}

interface PlayoffPickCard {
  league: PlayoffLeague;
  done: boolean;
  step: PlayoffStep | null;
  bye: PlayoffChoice[];
  result: PlayoffPickResult | null;
}

interface PlayoffTree {
  league: PlayoffLeague;
  rounds: PlayoffSeriesView[][];
}

interface PlayoffNext {
  league: string;
  roundLabel: string;
  when: string;
  kickoff: string;
  left: { abbreviation: string; name: string; logoUrl: string | null } | null;
  right: { abbreviation: string; name: string; logoUrl: string | null } | null;
}

interface RailUpcomingItem {
  id: string;
  when: string;
  kickoff: string;
  tag: string | null;
  league: string;
  round: string | null;
  leftAbbr: string;
  leftLogo: string | null;
  leftName: string;
  rightAbbr: string;
  rightLogo: string | null;
  rightName: string;
}

type DashboardPost =
  | { kind: 'bubble'; league: PlayoffLeague; sides: RegularStanding[] }
  | { kind: 'locks'; rows: { league: PlayoffLeague; seeds: RegularStanding[] }[] }
  | { kind: 'picks'; title: string; cards: PlayoffPickCard[] }
  | { kind: 'series'; item: PlayoffQueueItem }
  | { kind: 'promotion-pick'; split: PromotionSplit; chooser: RegularStanding; runner: RegularStanding; choices: RegularStanding[] }
  | { kind: 'promotion'; split: PromotionSplit; match: PlayoffSeriesView; iso: string; kickoff: string }
  | { kind: 'champions'; names: { league: PlayoffLeague; winner: string }[] };

type ScoreHold =
  | { kind: 'regular'; match: SlateMatch }
  | { kind: 'series'; item: PlayoffQueueItem }
  | { kind: 'promotion'; split: PromotionSplit; match: PlayoffSeriesView; iso: string; kickoff: string }
  | { kind: 'msi'; match: MsiMatchView };


@Component({
  selector: 'app-dashboard-page',
  imports: [DecimalPipe, NgStyle, NgTemplateOutlet, RouterLink, ChampionIconComponent, ItemIconComponent, MatchMapTrackComponent, RoleIconComponent, TeamLogoComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly slate = inject(MatchBoardService);
  private readonly season = inject(RegularSeasonService);
  private readonly playoff = inject(PlayoffBoardService);
  private readonly promotion = inject(PromotionBoardService);
  private readonly msi = inject(MsiBoardService);
  private readonly mvpBoard = inject(MvpBoardService);
  private readonly competitionStats = inject(CompetitionStatsService);
  private readonly calendar = inject(YearCalendarService);
  private readonly coaches = inject(CoachService);
  private readonly players = inject(PlayerService);
  private readonly windows = inject(TransferWindowService);
  private readonly storage = inject(StorageAdapter);
  private readonly destroyRef = inject(DestroyRef);
  private readonly crownTick = signal(0);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly clockLabel = this.clock.label;
  readonly lastMatchReport = signal<MatchReport | null>(null);
  readonly lastSeriesReports = signal<MatchReport[]>([]);
  readonly simBusy = signal(false);
  readonly lastSimBoard = signal<{
    foot: string | null;
    league: 'TCS' | 'TCL' | null;
    slate: SlateMatch | null;
    homeRecord: string | null;
    awayRecord: string | null;
    homeRank: number | null;
    awayRank: number | null;
    seriesNeed: number;
    homeSeriesWins: number;
    awaySeriesWins: number;
  } | null>(null);
  private pendingReportAdvance = false;
  readonly phaseLabels = PHASE_LABELS;

  seasonTitle(): string {
    const year = this.clock.year();
    if (this.pendingCrown()) {
      return `${year} 奪冠`;
    }
    const promo = this.pendingPromotion();
    if (promo) {
      return `${year} ${promo.title}`;
    }
    const table = this.pendingTable();
    if (table) {
      return `${year} ${table.league} 例行賽`;
    }
    if (this.liveMatch() || this.hasOpenRegular()) {
      return `${year} 春季例行賽`;
    }
    if (this.summerGap()) {
      return `${year} 夏季例行賽`;
    }
    const scene = this.postScene();
    if (scene?.kind === 'promotion' || scene?.kind === 'promotion-pick') {
      const split = scene.split === 'summer' ? '夏季' : '春季';
      return `${year} ${split}升降賽`;
    }
    if (scene?.kind === 'bubble' || scene?.kind === 'locks') {
      return `${year} 春季例行賽`;
    }
    if (scene?.kind === 'picks' || scene?.kind === 'series' || scene?.kind === 'champions') {
      return `${year} 春季季後賽`;
    }
    if (this.msiScene()) {
      return `${year} MSI`;
    }
    return this.clockLabel();
  }

  private hasOpenRegular(): boolean {
    return (['TCL', 'TCS'] as const).some((league) => {
      const gate = this.gateFor(league);
      return gate === 'incomplete' || gate === 'bubble' || gate === 'ready';
    });
  }

  private regularStillOpen(doneLeague: 'TCS' | 'TCL'): boolean {
    return (['TCL', 'TCS'] as const).some((league) => {
      if (league === doneLeague) {
        return false;
      }
      return this.season.playoffGate(league) === 'incomplete' || this.season.playoffGate(league) === 'bubble';
    });
  }
  readonly board = this.slate.board;
  readonly previewPick = signal<{ league: PlayoffLeague; teamId: string } | null>(null);
  readonly scoreBump = signal<{ key: string; side: 'left' | 'right'; token: number } | null>(null);
  readonly scoreHold = signal<ScoreHold | null>(null);
  readonly groupPage = signal(0);
  readonly meterOn = signal(false);
  readonly groupPageMs = GROUP_PAGE_MS;
  private lastFrame = '';
  private swapTimer = 0;
  private groupTimer = 0;
  private meterTimer = 0;
  private scoreAdvanceTimer = 0;
  private scoreToken = 0;
  private readonly scoreAdvanceMs = 720;

  constructor() {
    effect(() => {
      const stillRegular = (['TCL', 'TCS'] as const).some((league) => {
        const gate = this.season.playoffGate(league);
        return gate === 'incomplete' || gate === 'bubble';
      });
      if (!stillRegular) {
        for (const league of ['TCL', 'TCS'] as const) {
          if (!this.season.isPlayoffLocked(league) && this.season.playoffGate(league) === 'ready') {
            this.season.advanceLeague(league);
          }
        }
      }
      this.season.syncClockPhase();
      const paint = this.pagePaint();
      const frame = this.viewFrame();
      const previousScene = document.body.dataset['scene'] ?? '';
      if (this.lastFrame && frame !== this.lastFrame) {
        this.playSceneSwap(previousScene, paint?.scene ?? '');
      }
      this.lastFrame = frame;
      document.body.dataset['scene'] = paint?.scene ?? '';
      document.body.dataset['mark'] = paint?.mark ?? '';
    });
    this.armGroupTimer();
    this.restartMeter();
    this.destroyRef.onDestroy(() => {
      window.clearTimeout(this.swapTimer);
      window.clearTimeout(this.meterTimer);
      window.clearTimeout(this.scoreAdvanceTimer);
      window.clearInterval(this.groupTimer);
      document.body.classList.remove('is-scene-swap');
      delete document.body.dataset['scene'];
      delete document.body.dataset['sceneFrom'];
      delete document.body.dataset['mark'];
    });
  }

  bumpToken(key: string, side: 'left' | 'right'): number[] {
    const bump = this.scoreBump();
    if (!bump || bump.key !== key || bump.side !== side) {
      return [];
    }
    return [bump.token];
  }

  roster(teamId: string) {
    return this.slate.roster(teamId);
  }

  rosterLines(teamId: string) {
    return this.slate.rosterLines(teamId);
  }

  teamCoachName(teamId: string): string {
    if (!teamId) {
      return '';
    }
    const coach = this.coaches.getCoachByTeamId(teamId);
    if (!coach) {
      return '';
    }
    return coach.gamertag || coach.displayName || '';
  }

  stageGameReport(homeTeamId: string, awayTeamId: string): MatchReport | null {
    if (!homeTeamId || !awayTeamId) {
      return null;
    }
    const live = this.lastMatchReport();
    if (live && live.homeTeamId === homeTeamId && live.awayTeamId === awayTeamId) {
      return live;
    }
    const series = this.lastSeriesReports();
    for (let index = series.length - 1; index >= 0; index -= 1) {
      const report = series[index];
      if (report.homeTeamId === homeTeamId && report.awayTeamId === awayTeamId) {
        return report;
      }
    }
    return null;
  }

  stagePlayerKda(homeTeamId: string, awayTeamId: string, playerId: string): string | null {
    const report = this.stageGameReport(homeTeamId, awayTeamId);
    const stats = report?.boxScore?.players.find((player) => player.playerId === playerId);
    return stats ? this.reportKdaLabel(stats) : null;
  }

  stagePlayerGold(homeTeamId: string, awayTeamId: string, playerId: string): number | null {
    const report = this.stageGameReport(homeTeamId, awayTeamId);
    const stats = report?.boxScore?.players.find((player) => player.playerId === playerId);
    return stats ? stats.gold : null;
  }

  stagePlayerGoldLabel(homeTeamId: string, awayTeamId: string, playerId: string): string | null {
    const gold = this.stagePlayerGold(homeTeamId, awayTeamId, playerId);
    return gold == null ? null : this.stageGoldAmountLabel(gold);
  }

  stagePlayerCs(homeTeamId: string, awayTeamId: string, playerId: string): number | null {
    const report = this.stageGameReport(homeTeamId, awayTeamId);
    const stats = report?.boxScore?.players.find((player) => player.playerId === playerId);
    return stats ? Math.round(stats.cs) : null;
  }

  reportItemSlots(items: readonly string[] | null | undefined, slots = 6): Array<string | null> {
    const list = [...(items ?? [])].slice(0, slots);
    while (list.length < slots) {
      list.push('');
    }
    return list.map((itemId) => (itemId ? itemId : null));
  }

  stagePlayerItemSlots(
    homeTeamId: string,
    awayTeamId: string,
    playerId: string | null | undefined,
  ): Array<string | null> {
    if (!playerId) {
      return this.reportItemSlots([]);
    }
    const report = this.stageGameReport(homeTeamId, awayTeamId);
    const stats = report?.boxScore?.players.find((player) => player.playerId === playerId);
    return this.reportItemSlots(stats?.items);
  }

  stageGoldAmountLabel(value: number): string {
    const abs = Math.max(0, Math.round(value));
    if (abs >= 1000) {
      const k = abs / 1000;
      return `${k >= 10 ? k.toFixed(0) : k.toFixed(1)}K`;
    }
    return String(abs);
  }

  stageGoldDiffLabel(value: number): string {
    return this.stageGoldAmountLabel(Math.abs(value));
  }

  stageGoldCompare(
    homeGold: number,
    awayGold: number,
  ): {
    homeText: string;
    awayText: string;
    text: string;
    lead: 'home' | 'away' | 'even';
  } {
    const diff = homeGold - awayGold;
    const lead: 'home' | 'away' | 'even' =
      Math.abs(diff) < 50 ? 'even' : diff > 0 ? 'home' : 'away';
    return {
      homeText: this.stageGoldAmountLabel(homeGold),
      awayText: this.stageGoldAmountLabel(awayGold),
      text: lead === 'even' ? '0' : this.stageGoldDiffLabel(diff),
      lead,
    };
  }

  stageLaneGoldLead(
    homeTeamId: string,
    awayTeamId: string,
    homePlayerId: string | null | undefined,
    awayPlayerId: string | null | undefined,
  ): {
    homeText: string;
    awayText: string;
    text: string;
    lead: 'home' | 'away' | 'even';
  } | null {
    if (!homePlayerId || !awayPlayerId) {
      return null;
    }
    const homeGold = this.stagePlayerGold(homeTeamId, awayTeamId, homePlayerId);
    const awayGold = this.stagePlayerGold(homeTeamId, awayTeamId, awayPlayerId);
    if (homeGold == null || awayGold == null) {
      return null;
    }
    return this.stageGoldCompare(homeGold, awayGold);
  }

  stageTeamGoldLead(
    homeTeamId: string,
    awayTeamId: string,
  ): {
    homeText: string;
    awayText: string;
    text: string;
    lead: 'home' | 'away' | 'even';
  } | null {
    const box = this.stageGameReport(homeTeamId, awayTeamId)?.boxScore;
    if (!box) {
      return null;
    }
    return this.stageGoldCompare(box.home.totalGold, box.away.totalGold);
  }

  stagePlayerIsMvp(homeTeamId: string, awayTeamId: string, playerId: string): boolean {
    return this.stageGameReport(homeTeamId, awayTeamId)?.mvp?.playerId === playerId;
  }

  stagePlayerChampionId(homeTeamId: string, awayTeamId: string, playerId: string): string | null {
    const report = this.stageGameReport(homeTeamId, awayTeamId);
    if (!report || !playerId) {
      return null;
    }
    return this.reportPlayerChampionId(report, playerId);
  }

  stageDraftBans(homeTeamId: string, awayTeamId: string, teamId: string): string[] {
    const report = this.stageGameReport(homeTeamId, awayTeamId);
    if (!report || !teamId) {
      return [];
    }
    return this.reportDraftBans(report, teamId);
  }

  stageLineupRows(
    homeTeamId: string,
    awayTeamId: string,
  ): Array<{
    position: PlayerPosition;
    label: string;
    home: RosterSpot | null;
    away: RosterSpot | null;
  }> {
    const homeLines = this.rosterLines(homeTeamId);
    const awayLines = this.rosterLines(awayTeamId);
    return PLAYER_POSITIONS.map((position, index) => ({
      position,
      label: PLAYER_POSITION_LABELS[position],
      home: homeLines[index]?.players[0] ?? null,
      away: awayLines[index]?.players[0] ?? null,
    }));
  }

  teamOvr(teamId: string): number {
    return this.slate.teamOvr(teamId);
  }

  dateText(iso: string): string {
    return this.slate.dateText(iso);
  }

  shortDate(iso: string): string {
    return this.slate.shortDate(iso);
  }

  pendingCrown(): CrownMoment | null {
    if (this.scoreHold()) {
      return null;
    }
    this.crownTick();
    const today = this.board().today;
    if (!today) {
      return null;
    }
    const seen = this.seenCrownIds();
    const waiting = this.earnedCrowns().filter((crown) => crown.date && today <= crown.date && !seen.includes(crown.id));
    waiting.sort((left, right) => left.date.localeCompare(right.date));
    return waiting[0] ?? null;
  }

  ackCrown(id: string): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return;
    }
    const seen = this.seenCrownIds();
    if (!seen.includes(id)) {
      this.storage.setItem(this.crownKey(universeId), [...seen, id]);
    }
    this.crownTick.update((value) => value + 1);
    this.advanceToNextEvent();
  }

  pendingPromotion(): PromoMoment | null {
    if (this.scoreHold()) {
      return null;
    }
    this.crownTick();
    const today = this.board().today;
    const moment = this.promotionMoment();
    if (!today || !moment || !moment.date || today > moment.date) {
      return null;
    }
    if (this.seenCrownIds().includes(moment.id)) {
      return null;
    }
    return moment;
  }

  pendingTable(): TableMoment | null {
    if (this.scoreHold()) {
      return null;
    }
    this.crownTick();
    const today = this.board().today;
    if (!today) {
      return null;
    }
    const seen = this.seenCrownIds();
    const waiting = (['TCL', 'TCS'] as const)
      .map((league) => this.tableMoment(league))
      .filter((moment): moment is TableMoment => moment !== null)
      .filter((moment) => moment.date && today <= moment.date && !seen.includes(moment.id));
    waiting.sort((left, right) => {
      if (left.date !== right.date) {
        return left.date.localeCompare(right.date);
      }
      return left.league === 'TCL' ? -1 : 1;
    });
    return waiting[0] ?? null;
  }

  transferPulse(): TransferPulse | null {
    const window = this.windows.current();
    if (!window.isOpen) {
      return null;
    }
    this.activeUniverse();
    return {
      window,
      items: this.transferFeed(window.start, window.end),
    };
  }

  private transferFeed(start: string, end: string): TransferFeedItem[] {
    const universe = this.activeUniverse();
    if (!universe || !start || !end) {
      return [];
    }
    const teamById = new Map(universe.teams.map((team) => [team.id, team]));
    return universe.teamEvents
      .filter((event) => event.date >= start && event.date <= end)
      .filter((event) => event.kind === 'player-joined' || event.kind === 'acquired' || event.kind === 'renamed')
      .slice()
      .sort((left, right) => {
        if (left.date !== right.date) {
          return right.date.localeCompare(left.date);
        }
        return right.recordedAt.localeCompare(left.recordedAt);
      })
      .slice(0, 12)
      .map((event) => ({
        id: event.id,
        date: event.date,
        text: event.summary,
        teamAbbr: teamById.get(event.teamId)?.abbreviation ?? '—',
        kind: event.kind,
      }));
  }

  private simSide(teamId: string): MatchSideInput {
    const guest = getMsiGuestBundle(teamId);
    if (guest) {
      return {
        teamId: guest.teamId,
        players: guest.players,
        coach: guest.coach,
      };
    }
    return {
      teamId,
      players: this.players.getPlayersByTeamId(teamId),
      coach: this.coaches.getCoachByTeamId(teamId),
    };
  }

  private async playSimOneGame(
    homeTeamId: string,
    awayTeamId: string,
    hit: (winnerTeamId: string) => void,
    board?: {
      need: number;
      slate?: SlateMatch;
      league?: 'TCS' | 'TCL';
      competition?: StatsCompetition;
      readSeries?: () => { home: number; away: number };
      forceWinnerTeamId?: string;
    },
  ): Promise<MatchReport | null> {
    if (!homeTeamId || !awayTeamId || this.simBusy()) {
      return null;
    }
    this.simBusy.set(true);
    try {
      const report = await simulateGameAsync({
        home: this.simSide(homeTeamId),
        away: this.simSide(awayTeamId),
        forceWinnerTeamId: board?.forceWinnerTeamId,
        dateIso: this.activeUniverse()?.currentDate,
      });
      const league = board?.league ?? board?.slate?.league ?? this.leagueOfTeam(homeTeamId);
      const competition = board?.competition ?? league;
      this.recordMatchMvp(report, league);
      this.competitionStats.record(report, competition);
      this.lastMatchReport.set(report);
      this.lastSeriesReports.set([report]);
      hit(board?.forceWinnerTeamId ?? report.winnerTeamId);
      this.rememberSimBoard(homeTeamId, awayTeamId, board);
      return report;
    } finally {
      this.simBusy.set(false);
    }
  }


  private recordMatchMvp(report: MatchReport, league: 'TCS' | 'TCL' | null): void {
    this.mvpBoard.record(league, report.mvp);
  }

  private leagueOfTeam(teamId: string): 'TCS' | 'TCL' | null {
    const team = this.universeService.activeUniverse()?.teams.find((item) => item.id === teamId);
    if (team?.leagueTier === 'TCS' || team?.leagueTier === 'TCL') {
      return team.leagueTier;
    }
    return null;
  }

  private rememberSimBoard(
    homeTeamId: string,
    awayTeamId: string,
    board?: {
      need: number;
      slate?: SlateMatch;
      league?: 'TCS' | 'TCL';
      readSeries?: () => { home: number; away: number };
    },
  ): void {
    if (!board) {
      this.lastSimBoard.set(null);
      return;
    }
    const slate = board.slate;
    const league = board.league ?? slate?.league ?? this.leagueOfTeam(homeTeamId);
    const series = this.readSimSeriesScore(homeTeamId, awayTeamId, board);
    let foot: string | null = null;
    let heldSlate: SlateMatch | null = null;
    let homeRecord: string | null = null;
    let awayRecord: string | null = null;
    let homeRank: number | null = null;
    let awayRank: number | null = null;
    if (slate) {
      const weekIndex = Math.floor((slate.round - 1) / 2);
      const mates = this.season.fixturesFor(slate.league).filter(
        (item) => Math.floor((item.round - 1) / 2) === weekIndex,
      );
      const indexInWeek = mates.findIndex((item) => item.id === slate.id);
      const week = weekIndex + 1;
      const day = Math.floor(Math.max(0, indexInWeek) / 2) + 1;
      const table = this.season.standingsFor(slate.league);
      const home = table.find((row) => row.teamId === slate.homeId);
      const away = table.find((row) => row.teamId === slate.awayId);
      foot = `${slate.league} ${this.clock.year()} 春季常規賽 第${week}週 第${day}天`;
      homeRecord = home ? `${home.seriesWins}-${home.seriesLosses}` : slate.homeRecord;
      awayRecord = away ? `${away.seriesWins}-${away.seriesLosses}` : slate.awayRecord;
      homeRank = home?.rank ?? null;
      awayRank = away?.rank ?? null;
      heldSlate = {
        ...slate,
        homeGames: series.home,
        awayGames: series.away,
        status: series.home >= board.need || series.away >= board.need ? 'done' : 'ready',
        scoreText: `${series.home} - ${series.away}`,
        homeRecord: homeRecord ?? slate.homeRecord,
        awayRecord: awayRecord ?? slate.awayRecord,
        homeRank: homeRank ?? slate.homeRank,
        awayRank: awayRank ?? slate.awayRank,
      };
    }
    this.lastSimBoard.set({
      foot,
      league,
      slate: heldSlate,
      homeRecord,
      awayRecord,
      homeRank,
      awayRank,
      seriesNeed: board.need,
      homeSeriesWins: series.home,
      awaySeriesWins: series.away,
    });
  }

  private finishSimAdvance(): void {
    this.pendingReportAdvance = true;
  }

  private readSimSeriesScore(
    homeTeamId: string,
    awayTeamId: string,
    board: {
      slate?: SlateMatch;
      readSeries?: () => { home: number; away: number };
    },
  ): { home: number; away: number } {
    if (board.readSeries) {
      return board.readSeries();
    }
    if (board.slate) {
      const match = this.season.fixturesFor(board.slate.league).find((item) => item.id === board.slate!.id);
      if (match?.homeGames != null && match.awayGames != null) {
        return { home: match.homeGames, away: match.awayGames };
      }
    }
    const reports = this.lastSeriesReports();
    return {
      home: reports.filter((report) => report.winnerTeamId === homeTeamId).length,
      away: reports.filter((report) => report.winnerTeamId === awayTeamId).length,
    };
  }

  private playoffSeriesScore(
    league: PlayoffLeague,
    seriesId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): { home: number; away: number } {
    const match = this.playoff.bundle(league).series.find((item) => item.id === seriesId);
    return this.sidesSeriesScore(match?.left ?? null, match?.right ?? null, homeTeamId, awayTeamId);
  }

  private promotionSeriesScore(
    split: PromotionSplit,
    seriesId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): { home: number; away: number } {
    const match = this.promotion.bracket(split).find((item) => item.id === seriesId);
    return this.sidesSeriesScore(match?.left ?? null, match?.right ?? null, homeTeamId, awayTeamId);
  }

  private msiSeriesScore(
    matchId: string,
    homeTeamId: string,
    awayTeamId: string,
  ): { home: number; away: number } {
    const hero = this.msi.hero();
    const match =
      (hero?.kind === 'match' && hero.match.id === matchId ? hero.match : null) ??
      this.msi.stageSlate().find((item) => item.id === matchId) ??
      this.msi.upcoming().find((item) => item.id === matchId) ??
      null;
    if (!match) {
      return this.readSimSeriesScore(homeTeamId, awayTeamId, {});
    }
    const leftId = match.left?.teamId ?? match.left?.id ?? '';
    const rightId = match.right?.teamId ?? match.right?.id ?? '';
    return {
      home: leftId === homeTeamId ? match.leftGames : rightId === homeTeamId ? match.rightGames : 0,
      away: rightId === awayTeamId ? match.rightGames : leftId === awayTeamId ? match.leftGames : 0,
    };
  }

  private sidesSeriesScore(
    left: { teamId: string; games: number | null } | null,
    right: { teamId: string; games: number | null } | null,
    homeTeamId: string,
    awayTeamId: string,
  ): { home: number; away: number } {
    return {
      home: left?.teamId === homeTeamId ? (left.games ?? 0) : right?.teamId === homeTeamId ? (right.games ?? 0) : 0,
      away: right?.teamId === awayTeamId ? (right.games ?? 0) : left?.teamId === awayTeamId ? (left.games ?? 0) : 0,
    };
  }

  reportSeriesDots(side: 'home' | 'away'): boolean[] {
    const board = this.lastSimBoard();
    if (!board || board.seriesNeed <= 0) {
      return [];
    }
    const wins = side === 'home' ? board.homeSeriesWins : board.awaySeriesWins;
    return Array.from({ length: board.seriesNeed }, (_, index) => index < wins);
  }

  reportReasonText(report: MatchReport): string {
    return explainReason(report.primaryReason);
  }

  reportWinnerLabel(report: MatchReport): string {
    return this.reportSideLabel(report.winnerTeamId);
  }

  reportSideLabel(teamId: string): string {
    return this.reportTeam(teamId)?.abbreviation ?? '未知';
  }

  reportTeam(teamId: string): { abbreviation: string; name: string; logoUrl: string | null } | null {
    const team = this.players.teams().find((item) => item.id === teamId);
    if (team) {
      return {
        abbreviation: team.abbreviation,
        name: team.name,
        logoUrl: team.logoUrl ?? null,
      };
    }
    const guest = getMsiGuestBundle(teamId)?.guest;
    if (!guest) {
      return null;
    }
    return {
      abbreviation: guest.abbreviation,
      name: guest.name,
      logoUrl: guest.logoUrl,
    };
  }

  reportStylePrimary(styles: { primary: string[]; secondary: string[] }): string {
    return styles.primary.join('、') || styles.secondary.join('、') || '均衡';
  }

  reportPhaseHomeWidth(edge: number): number {
    const capped = Math.min(12, Math.abs(edge));
    const share = 50 + (edge >= 0 ? 1 : -1) * (capped / 12) * 40;
    return Math.max(10, Math.min(90, share));
  }

  reportPhaseAwayWidth(edge: number): number {
    return 100 - this.reportPhaseHomeWidth(edge);
  }

  reportPhaseLeaderText(report: MatchReport, edge: number): string {
    if (Math.abs(edge) < 0.75) {
      return '膠著';
    }
    if (edge > 0) {
      return `${this.reportSideLabel(report.homeTeamId)} +${edge.toFixed(1)}`;
    }
    return `${this.reportSideLabel(report.awayTeamId)} ${edge.toFixed(1)}`;
  }

  reportExtraNotes(report: MatchReport): string | null {
    const notes = [...report.coachNotes, ...report.styleNotes];
    return notes.length > 0 ? notes.join(' · ') : null;
  }

  reportIntentLabel(intent: CompIntent): string {
    return COMP_INTENT_LABELS[intent];
  }

  reportDraftBans(report: MatchReport, teamId: string): string[] {
    return (report.draft?.bans ?? [])
      .filter((ban) => ban.teamId === teamId)
      .map((ban) => ban.championId);
  }

  reportPlayerChampionId(report: MatchReport, playerId: string): string | null {
    const picks = [
      ...(report.draft?.home.picks ?? []),
      ...(report.draft?.away.picks ?? []),
    ];
    return picks.find((pick) => pick.playerId === playerId)?.championId ?? null;
  }

  reportDurationLabel(report: MatchReport): string {
    const total = report.boxScore?.durationSec ?? 0;
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  reportGoldLabel(value: number): string {
    return `${(value / 1000).toFixed(1)}K`;
  }

  reportDamageLabel(value: number): string {
    return `${(value / 1000).toFixed(1)}K`;
  }

  reportBoxPlayers(box: MatchBoxScore, teamId: string): PlayerMatchStats[] {
    const order = new Map<PlayerPosition, number>(
      PLAYER_POSITIONS.map((position, index) => [position, index]),
    );
    return box.players
      .filter((player) => player.teamId === teamId)
      .slice()
      .sort((left, right) => (order.get(left.position) ?? 99) - (order.get(right.position) ?? 99));
  }

  reportKdaLabel(player: PlayerMatchStats): string {
    return `${player.kills}/${player.deaths}/${player.assists}`;
  }

  reportSharePct(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }
    return value <= 1.0001 ? value * 100 : value;
  }

  reportShareLabel(value: number): string {
    return `${Math.round(this.reportSharePct(value))}%`;
  }

  reportSignedKLabel(value: number): string {
    const sign = value > 0 ? '+' : value < 0 ? '' : '';
    return `${sign}${(value / 1000).toFixed(1)}K`;
  }

  reportSignedIntLabel(value: number): string {
    const rounded = Math.round(value);
    const sign = rounded > 0 ? '+' : '';
    return `${sign}${rounded}`;
  }

  reportMaxDamage(box: MatchBoxScore): number {
    return Math.max(1, ...box.players.map((player) => player.damageToChamps));
  }

  reportDamageBarPct(player: PlayerMatchStats, maxDamage: number): number {
    return Math.max(4, Math.round((player.damageToChamps / Math.max(1, maxDamage)) * 100));
  }

  reportMatchDigest(box: MatchBoxScore): string[] {
    return buildMatchDigest(box, {
      home: this.reportSideLabel(box.homeTeamId),
      away: this.reportSideLabel(box.awayTeamId),
    });
  }

  reportMatchReplayLog(box: MatchBoxScore): MatchReplayLogEntry[] {
    return buildMatchReplayLog(box, {
      home: this.reportSideLabel(box.homeTeamId),
      away: this.reportSideLabel(box.awayTeamId),
    });
  }

  reportArchetypeMedals(report: MatchReport): Array<{
    id: string;
    label: string;
    reason: string;
    primary: boolean;
  }> {
    const archetypes = report.archetypes;
    if (!archetypes) {
      return [];
    }
    const medals: Array<{ id: string; label: string; reason: string; primary: boolean }> = [];
    if (archetypes.primaryArchetype) {
      medals.push({
        id: archetypes.primaryArchetype.id,
        label: archetypes.primaryArchetype.label,
        reason: archetypes.primaryArchetype.reason,
        primary: true,
      });
    }
    for (const tag of archetypes.secondaryTags) {
      medals.push({
        id: tag.id,
        label: tag.label,
        reason: tag.reason,
        primary: false,
      });
    }
    return medals;
  }

  reportMvpCard(report: MatchReport): {
    gamertag: string;
    teamLabel: string;
    teamAbbr: string;
    teamName: string;
    logoSrc: string | null;
    position: PlayerPosition;
    positionLabel: string;
    contribution: string;
    kda: string;
    damage: string;
    gold: string;
    cs: string;
    kp: string;
    vision: string;
    championId: string | null;
    championNameZh: string | null;
    splashUrl: string | null;
    items: string[];
    matchup: {
      bullets: string[];
      verdict: string;
    };
  } | null {
    const mvp = report.mvp;
    const box = report.boxScore;
    if (!mvp || !box) {
      return null;
    }
    const stats = box.players.find((player) => player.playerId === mvp.playerId);
    if (!stats) {
      return null;
    }
    const championId = this.reportPlayerChampionId(report, mvp.playerId);
    const champion = championId ? getChampionById(championId) : null;
    const team = this.reportTeam(mvp.teamId);
    const teamAbbr = team?.abbreviation ?? this.reportSideLabel(mvp.teamId);
    const foe = box.players.find(
      (player) => player.position === stats.position && player.teamId !== stats.teamId,
    );
    const bullets: string[] = [];
    if (foe) {
      const goldLead = stats.gold - foe.gold;
      const damageLead = stats.damageToChamps - foe.damageToChamps;
      const csLead = stats.cs - foe.cs;
      const kpLead = this.reportSharePct(stats.kpPct) - this.reportSharePct(foe.kpPct);
      if (goldLead >= 400) {
        bullets.push(`經濟 ${this.reportSignedKLabel(goldLead)}`);
      }
      if (damageLead >= 800) {
        bullets.push(`傷害 ${this.reportSignedKLabel(damageLead)}`);
      }
      if (csLead >= 12) {
        bullets.push(`補刀 ${this.reportSignedIntLabel(csLead)}`);
      }
      if (kpLead >= 8) {
        bullets.push(`參團 ${this.reportSignedIntLabel(kpLead)}%`);
      }
    }
    const matchup = {
      bullets,
      verdict: pickMvpVerdict(report, stats, foe),
    };
    return {
      gamertag: mvp.gamertag,
      teamLabel: this.reportSideLabel(mvp.teamId),
      teamAbbr,
      teamName: team?.name ?? '',
      logoSrc: teamAbbr ? resolveTeamLogoUrl(team?.logoUrl, teamAbbr) : null,
      position: mvp.position,
      positionLabel: PLAYER_POSITION_LABELS[mvp.position],
      contribution: mvp.contribution,
      kda: this.reportKdaLabel(stats),
      damage: `${this.reportDamageLabel(stats.damageToChamps)}（${this.reportShareLabel(stats.damagePct)}）`,
      gold: `${this.reportGoldLabel(stats.gold)}（${this.reportShareLabel(stats.goldPct)}）`,
      cs: String(Math.round(stats.cs)),
      kp: this.reportShareLabel(stats.kpPct),
      vision: String(Math.round(stats.visionScore)),
      championId,
      championNameZh: champion?.nameZh ?? null,
      splashUrl: championId ? championSplashUrl(championId) : null,
      items: stats.items ?? [],
      matchup,
    };
  }

  reportGoldChart(report: MatchReport): {
    width: number;
    height: number;
    midY: number;
    blueAreas: string[];
    redAreas: string[];
    blueLines: string[];
    redLines: string[];
    evenLines: string[];
    ticks: Array<{ x: number; label: string }>;
    yGuides: Array<{ y: number; label: string; value: number }>;
    plotLeft: number;
    plotRight: number;
    markers: Array<{
      x: number;
      y: number;
      icon: ScoreboardIconId;
      side: ScoreboardSide;
      style: Record<string, string>;
    }>;
    maxAbs: number;
  } | null {
    const series = report.boxScore?.goldSeries ?? [];
    if (series.length < 2) {
      return null;
    }

    const width = 640;
    const height = 180;
    const padLeft = 44;
    const padRight = 20;
    const padY = 18;
    const midY = height / 2;
    const evenBand = 150;
    const duration = Math.max(1, report.boxScore.durationSec);
    const diffs = series.map((sample) => sample.homeGold - sample.awayGold);
    const rawMax = Math.max(2000, ...diffs.map((diff) => Math.abs(diff)));
    const guideStep = rawMax <= 4000 ? 1000 : rawMax <= 10000 ? 2000 : rawMax <= 20000 ? 5000 : 10000;
    const maxAbs = Math.ceil(rawMax / guideStep) * guideStep;

    const pointAt = (t: number, diff: number): { x: number; y: number } => ({
      x: padLeft + (t / duration) * (width - padLeft - padRight),
      y: midY - (diff / maxAbs) * (height / 2 - padY),
    });

    const samples = series.map((sample) => {
      const diff = sample.homeGold - sample.awayGold;
      return { ...pointAt(sample.t, diff), diff };
    });

    type GoldSide = 'blue' | 'red' | 'even';
    const blueLineSegments: string[] = [];
    const redLineSegments: string[] = [];
    const evenLineSegments: string[] = [];
    const blueAreas: string[] = [];
    const redAreas: string[] = [];

    const formatPts = (pts: Array<{ x: number; y: number }>) =>
      pts.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

    const pushSideSegment = (side: GoldSide, pts: Array<{ x: number; y: number }>) => {
      if (pts.length < 2) {
        return;
      }
      const line = formatPts(pts);
      if (side === 'even') {
        evenLineSegments.push(line);
        return;
      }
      const area = [
        `${pts[0].x.toFixed(1)},${midY.toFixed(1)}`,
        line,
        `${pts[pts.length - 1].x.toFixed(1)},${midY.toFixed(1)}`,
      ].join(' ');
      if (side === 'blue') {
        blueLineSegments.push(line);
        blueAreas.push(area);
      } else {
        redLineSegments.push(line);
        redAreas.push(area);
      }
    };

    let currentSide: GoldSide | null = null;
    let currentPts: Array<{ x: number; y: number }> = [];

    const sideOf = (diff: number): GoldSide => {
      if (diff > evenBand) {
        return 'blue';
      }
      if (diff < -evenBand) {
        return 'red';
      }
      return 'even';
    };

    const flush = () => {
      if (currentSide) {
        pushSideSegment(currentSide, currentPts);
      }
      currentPts = [];
      currentSide = null;
    };

    const crossingAtZero = (
      prev: { x: number; y: number; diff: number },
      next: { x: number; y: number; diff: number },
    ): { x: number; y: number } => {
      const denom = Math.abs(prev.diff) + Math.abs(next.diff);
      const ratio = denom <= 0 ? 0.5 : Math.abs(prev.diff) / denom;
      return {
        x: prev.x + (next.x - prev.x) * ratio,
        y: midY,
      };
    };

    for (let index = 0; index < samples.length; index += 1) {
      const sample = samples[index];
      const side = sideOf(sample.diff);
      const point = { x: sample.x, y: sample.y };

      if (index > 0) {
        const prev = samples[index - 1];
        const prevSide = sideOf(prev.diff);
        if (prevSide !== side) {
          const needsZeroBridge =
            (prevSide === 'blue' && side === 'red') || (prevSide === 'red' && side === 'blue');
          const bridge = needsZeroBridge
            ? crossingAtZero(prev, sample)
            : { x: (prev.x + sample.x) / 2, y: midY };
          currentPts.push(bridge);
          flush();
          currentSide = side;
          currentPts = [bridge, point];
          continue;
        }
      }

      if (currentSide && currentSide !== side) {
        flush();
      }
      currentSide = side;
      currentPts.push(point);
    }
    flush();

    const tickMinutes = [0, 10, 20, 30, 40].filter((minute) => minute * 60 <= duration + 30);
    if (!tickMinutes.includes(Math.floor(duration / 60))) {
      tickMinutes.push(Math.floor(duration / 60));
    }
    const ticks = tickMinutes.map((minute) => ({
      x: padLeft + ((minute * 60) / duration) * (width - padLeft - padRight),
      label: `${minute}`,
    }));

    const yGuides: Array<{ y: number; label: string; value: number }> = [];
    for (let value = -maxAbs; value <= maxAbs; value += guideStep) {
      const point = pointAt(0, value);
      const absLabel = value === 0 ? '0' : `${Math.round(Math.abs(value) / 1000)}k`;
      yGuides.push({
        y: point.y,
        value,
        label: value > 0 ? `+${absLabel}` : value < 0 ? `-${absLabel}` : '0',
      });
    }

    const markers = (report.boxScore.timeline ?? [])
      .map((event) => {
        const icon = markerToIcon(event.payload?.marker, event.type);
        if (!icon) {
          return null;
        }
        const side: ScoreboardSide = event.teamId === report.homeTeamId ? 'blue' : 'red';
        const point = pointAt(event.t, 0);
        return {
          x: point.x,
          y: midY,
          icon,
          side,
          style: scoreboardIconStyle(icon, side, 20),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      width,
      height,
      midY,
      blueAreas,
      redAreas,
      blueLines: blueLineSegments,
      redLines: redLineSegments,
      evenLines: evenLineSegments,
      ticks,
      yGuides,
      plotLeft: padLeft,
      plotRight: width - padRight,
      markers,
      maxAbs,
    };
  }

  clearMatchReport(): void {
    this.lastMatchReport.set(null);
    this.lastSeriesReports.set([]);
    this.lastSimBoard.set(null);
    this.scoreHold.set(null);
    this.pendingReportAdvance = false;
  }

  continueAfterReport(): void {
    const shouldAdvance = this.pendingReportAdvance;
    this.pendingReportAdvance = false;
    this.lastMatchReport.set(null);
    this.scoreHold.set(null);
    if (shouldAdvance) {
      this.lastSeriesReports.set([]);
      this.lastSimBoard.set(null);
      this.advanceToNextEvent();
      return;
    }
  }

  homeFab(): { label: string; mode: 'next' | 'fastForward' | 'jump'; iso?: string } | null {
    if (this.lastMatchReport()) {
      return { label: '下一把', mode: 'next' };
    }
    if (this.missingLeagues().length > 0 || this.pendingCrown() || this.pendingPromotion() || this.pendingTable()) {
      return null;
    }
    const summer = this.summerGap();
    if (summer && this.board().today < summer.start) {
      return { label: `快進到 ${this.shortDate(summer.start)}`, mode: 'jump', iso: summer.start };
    }
    const event = this.spotlightEvent();
    if (event?.jumpIso) {
      return { label: `快進到 ${this.shortDate(event.jumpIso)}`, mode: 'jump', iso: event.jumpIso };
    }
    const match = this.liveMatch();
    if (match && !this.scoreHold() && this.board().canFastForward) {
      return { label: `快進到 ${this.shortDate(match.iso)}`, mode: 'fastForward' };
    }
    if (match) {
      return null;
    }
    const scene = this.postScene();
    if (scene?.kind === 'series' && scene.item.iso && !this.canScorePlayoff(scene.item.iso)) {
      return { label: `快進到 ${this.shortDate(scene.item.iso)}`, mode: 'jump', iso: scene.item.iso };
    }
    if (scene?.kind === 'promotion' && scene.iso && !this.canScorePlayoff(scene.iso)) {
      return { label: `快進到 ${this.shortDate(scene.iso)}`, mode: 'jump', iso: scene.iso };
    }
    if (scene) {
      return null;
    }
    const msi = this.msiScene();
    if (msi?.kind === 'match' && msi.match.date && !this.canScorePlayoff(msi.match.date)) {
      return { label: `快進到 ${this.shortDate(msi.match.date)}`, mode: 'jump', iso: msi.match.date };
    }
    return null;
  }

  runHomeFab(): void {
    const fab = this.homeFab();
    if (!fab) {
      return;
    }
    if (fab.mode === 'next') {
      this.continueAfterReport();
      return;
    }
    if (fab.mode === 'fastForward') {
      this.fastForward();
      return;
    }
    if (fab.iso) {
      this.jumpTo(fab.iso);
    }
  }

  summerGap(): SummerGap | null {
    if (
      this.scoreHold() ||
      this.pendingCrown() ||
      this.pendingPromotion() ||
      this.pendingTable() ||
      this.missingLeagues().length > 0 ||
      this.postScene() ||
      this.msiScene()
    ) {
      return null;
    }
    if (this.board().current) {
      return null;
    }
    const today = this.board().today;
    const start = fixedRegular(this.clock.year(), 'summerRegular');
    if (!today || !start) {
      return null;
    }
    const worlds = internationalWindows(today).find((event) => event.scene === 'worlds');
    if (!worlds || start >= worlds.start || today >= worlds.start) {
      return null;
    }
    return { start, worldsStart: worlds.start };
  }

  matchScene(league: 'TCS' | 'TCL', phase: 'regular' | 'playoff' = 'regular'): string {
    if (phase === 'playoff') {
      return league === 'TCL' ? 'tcl-playoff' : 'tcs-playoff';
    }
    return league === 'TCL' ? 'tcl' : 'tcs';
  }

  playoffMark(league: 'TCS' | 'TCL'): string {
    return `${league} 季後賽`;
  }

  regularMark(league: 'TCS' | 'TCL'): string {
    return `${league}\n例行賽`;
  }

  spotlightEvent(): EventSpotlight | null {
    if (this.scoreHold()) {
      return null;
    }
    const today = this.board().today;
    if (!today || this.missingLeagues().length > 0 || this.pendingCrown() || this.pendingPromotion() || this.pendingTable() || this.msiScene()) {
      return null;
    }
    const match = this.board().current;
    if (match && !this.board().canFastForward) {
      return null;
    }
    const scene = this.postScene();
    if (scene && scene.kind !== 'series') {
      return null;
    }
    if (scene?.kind === 'series' && this.canScorePlayoff(scene.item.iso)) {
      return null;
    }
    const nextIso =
      (match?.iso && this.board().canFastForward ? match.iso : '') ||
      (scene?.kind === 'series' ? scene.item.iso : '');
    const windows = internationalWindows(today).filter((event) => {
      if (event.scene === 'msi' && this.msi.isFinished()) {
        return false;
      }
      if (event.scene === 'worlds' && today < event.start && this.summerSitsBefore(event.start)) {
        return false;
      }
      return true;
    });
    const live = windows.find((event) => today >= event.start && today <= event.end) ?? null;
    if (!nextIso || nextIso <= today) {
      const upcoming = windows.find((event) => event.start > today) ?? null;
      const event = live ?? upcoming;
      if (!event) {
        return null;
      }
      return {
        scene: event.scene,
        label: event.label,
        mark: event.mark,
        start: event.start,
        end: event.end,
        phaseLabel: today < event.start ? '即將開打' : '進行中',
        jumpIso: today < event.start ? event.start : '',
      };
    }
    if (live && nextIso <= live.end) {
      return null;
    }
    const upcoming = windows.find((event) => event.start > today && event.start <= nextIso) ?? null;
    const event = live ?? upcoming;
    if (!event) {
      return null;
    }
    return {
      scene: event.scene,
      label: event.label,
      mark: event.mark,
      start: event.start,
      end: event.end,
      phaseLabel: today < event.start ? '即將開打' : '進行中',
      jumpIso: today < event.start ? event.start : nextIso,
    };
  }

  missingLeagues(): Array<'TCS' | 'TCL'> {
    return (['TCS', 'TCL'] as const).filter((league) => {
      return this.season.fixturesFor(league).length > 0 && !this.calendar.springMonday(league);
    });
  }

  fastForward(): void {
    if (this.missingLeagues().length > 0) {
      return;
    }
    this.slate.fastForward();
  }

  canScore(match: SlateMatch): boolean {
    return this.slate.hasArrived(match) && match.homeGames !== 2 && match.awayGames !== 2;
  }

  liveMatch(): SlateMatch | null {
    const hold = this.scoreHold();
    if (hold?.kind === 'regular') {
      return hold.match;
    }
    const held = this.lastSimBoard()?.slate;
    if (this.lastMatchReport() && held) {
      return held;
    }
    return this.board().current;
  }

  simOneGame(): void {
    if (this.simBusy() || this.scoreHold() || this.lastMatchReport()) {
      return;
    }
    const match = this.liveMatch();
    if (match && this.canScore(match)) {
      this.playGame(match);
      return;
    }
    const scene = this.postScene();
    if (scene?.kind === 'series' && scene.item.match.left && scene.item.match.right) {
      if (!this.canScorePlayoff(scene.item.iso) || scene.item.match.left.games === 3 || scene.item.match.right.games === 3) {
        return;
      }
      this.playPlayoff(scene.item.league, scene.item.match);
      return;
    }
    if (scene?.kind === 'promotion' && scene.match.left && scene.match.right) {
      if (!this.canScorePlayoff(scene.iso) || scene.match.left.games === 3 || scene.match.right.games === 3) {
        return;
      }
      this.playPromotion(scene.match);
      return;
    }
    const msi = this.msiScene();
    if (msi?.kind === 'match' && msi.match.left && msi.match.right && !msi.match.done) {
      if (!this.canScorePlayoff(msi.match.date)) {
        return;
      }
      this.playMsi(msi.match);
    }
  }

  canSimOneGame(): boolean {
    if (this.simBusy() || this.scoreHold() || this.lastMatchReport()) {
      return false;
    }
    const match = this.liveMatch();
    if (match && this.canScore(match)) {
      return true;
    }
    const scene = this.postScene();
    if (scene?.kind === 'series' && scene.item.match.left && scene.item.match.right) {
      return (
        this.canScorePlayoff(scene.item.iso) &&
        scene.item.match.left.games !== 3 &&
        scene.item.match.right.games !== 3
      );
    }
    if (scene?.kind === 'promotion' && scene.match.left && scene.match.right) {
      return this.canScorePlayoff(scene.iso) && scene.match.left.games !== 3 && scene.match.right.games !== 3;
    }
    const msi = this.msiScene();
    return Boolean(
      msi?.kind === 'match' &&
        msi.match.left &&
        msi.match.right &&
        !msi.match.done &&
        this.canScorePlayoff(msi.match.date),
    );
  }

  playGame(match: SlateMatch, teamId?: string): void {
    if (
      this.simBusy() ||
      this.scoreHold() ||
      this.lastMatchReport() ||
      this.missingLeagues().length > 0 ||
      !this.canScore(match)
    ) {
      return;
    }
    void this.playSimOneGame(
      match.homeId,
      match.awayId,
      (winnerTeamId) => this.slate.playGame(match, winnerTeamId),
      {
        need: 2,
        slate: match,
        league: match.league,
        forceWinnerTeamId: teamId,
      },
    ).then((report) => {
      if (!report) {
        return;
      }
      const winnerId = teamId ?? report.winnerTeamId;
      this.markScore(`regular:${match.id}`, winnerId === match.homeId ? 'left' : 'right');
      const series = this.readSimSeriesScore(match.homeId, match.awayId, { slate: match });
      const done = series.home >= 2 || series.away >= 2;
      const held = this.lastSimBoard()?.slate;
      if (held) {
        this.scoreHold.set({ kind: 'regular', match: held });
      }
      if (done) {
        this.finishSimAdvance();
      }
    });
  }

  gateLeagues(): Array<'TCS' | 'TCL'> {
    return (['TCS', 'TCL'] as const).filter((league) => this.gateFor(league) !== 'incomplete');
  }

  postScene(): DashboardPost | null {
    const hold = this.scoreHold();
    if (hold?.kind === 'series') {
      return { kind: 'series', item: hold.item };
    }
    if (hold?.kind === 'promotion') {
      return { kind: 'promotion', split: hold.split, match: hold.match, iso: hold.iso, kickoff: hold.kickoff };
    }
    const open = (['TCL', 'TCS'] as const).filter((league) => this.gateFor(league) !== 'incomplete');
    if (open.length === 0) {
      return null;
    }
    const bubble = open.find((league) => this.gateFor(league) === 'bubble');
    if (bubble) {
      return { kind: 'bubble', league: bubble, sides: this.bubbleSides(bubble) };
    }
    const locks = open.filter((league) => this.gateFor(league) === 'ready');
    if (locks.length > 0 && !this.hasOpenRegular()) {
      return { kind: 'locks', rows: locks.map((league) => ({ league, seeds: this.playoffSeeds(league) })) };
    }
    if (this.hasOpenRegular()) {
      return null;
    }
    const playing = open.filter((league) => this.gateFor(league) === 'playoff');
    if (playing.length === 0) {
      return null;
    }
    const roundCards = this.pickCards(playing, 'round');
    if (roundCards.some((card) => !card.done)) {
      return { kind: 'picks', title: '首輪選邊', cards: roundCards };
    }
    const roundLeft = this.playoffQueue().find((item) => item.match.id === 'r1-high' || item.match.id === 'r1-low');
    if (roundLeft) {
      return { kind: 'series', item: roundLeft };
    }
    if (playing.some((league) => !this.roundOneDone(league))) {
      return { kind: 'picks', title: '首輪進行中', cards: [] };
    }
    const semiCards = this.pickCards(playing, 'semi');
    if (semiCards.some((card) => !card.done)) {
      return { kind: 'picks', title: '四強選邊', cards: semiCards };
    }
    const next = this.playoffQueue()[0];
    if (next) {
      return { kind: 'series', item: next };
    }
    const promotion = this.promotionScene();
    if (promotion) {
      return promotion;
    }
    return null;
  }

  private promotionScene(): DashboardPost | null {
    const split = this.openPromotionSplit();
    if (!split) {
      return null;
    }
    const step = this.promotion.step(split);
    if (step?.phase === 'pick') {
      return { kind: 'promotion-pick', split, chooser: step.chooser, runner: step.runner, choices: step.choices };
    }
    if (step?.phase === 'series') {
      return {
        kind: 'promotion',
        split,
        match: step.match,
        iso: this.promotionDate(split, step.match.id),
        kickoff: '下午 2:00',
      };
    }
    return null;
  }

  private openPromotionSplit(): PromotionSplit | null {
    const year = this.clock.year();
    const today = this.board().today;
    const summerStart = fixedRegular(year, 'summerRegular');
    if (summerStart && today && today >= summerStart && this.promotion.isDone('spring')) {
      return null;
    }
    const dates = this.calendar.promotionFor(year).spring;
    if (!dates['promo-1'] || this.promotion.isDone('spring')) {
      return null;
    }
    return 'spring';
  }

  private promotionDate(split: PromotionSplit, seriesId: string): string {
    return this.calendar.promotionFor(this.clock.year())[split][seriesId] ?? '';
  }

  promotionUpcoming(): PlayoffNext[] {
    const scene = this.postScene();
    if (scene?.kind !== 'promotion') {
      return [];
    }
    return this.promotion
      .bracket(scene.split)
      .filter((match) => match.id !== scene.match.id && match.left && match.right)
      .map((match) => ({
        league: '升降',
        roundLabel: match.roundLabel,
        when: this.shortDate(this.promotionDate(scene.split, match.id)),
        kickoff: '下午 2:00',
        left: match.left ? { abbreviation: match.left.abbreviation, name: match.left.name, logoUrl: match.left.logoUrl } : null,
        right: match.right ? { abbreviation: match.right.abbreviation, name: match.right.name, logoUrl: match.right.logoUrl } : null,
      }));
  }

  pickPromotion(split: PromotionSplit, teamId: string): void {
    this.promotion.pick(split, teamId);
  }

  promotionBracket(split: PromotionSplit): PlayoffSeriesView[] {
    return this.promotion.bracket(split);
  }

  playPromotion(match: PlayoffSeriesView, teamId?: string): void {
    if (this.simBusy() || this.scoreHold() || this.lastMatchReport()) {
      return;
    }
    const scene = this.postScene();
    if (scene?.kind !== 'promotion' || scene.match.id !== match.id) {
      return;
    }
    if (!this.canScorePlayoff(scene.iso) || match.left?.games === 3 || match.right?.games === 3) {
      return;
    }
    if (!match.left || !match.right) {
      return;
    }
    void this.playSimOneGame(
      match.left.teamId,
      match.right.teamId,
      (winnerTeamId) => this.promotion.addGame(scene.split, match.id, winnerTeamId),
      {
        need: 3,
        readSeries: () =>
          this.promotionSeriesScore(scene.split, match.id, match.left!.teamId, match.right!.teamId),
        forceWinnerTeamId: teamId,
      },
    ).then((report) => {
      if (!report || !match.left || !match.right) {
        return;
      }
      const winnerId = teamId ?? report.winnerTeamId;
      const side = winnerId === match.left.teamId ? 'left' : 'right';
      this.markScore(`promotion:${match.id}`, side);
      const series = this.promotionSeriesScore(scene.split, match.id, match.left.teamId, match.right.teamId);
      const done = series.home >= 3 || series.away >= 3;
      const finished =
        this.promotion.bracket(scene.split).find((item) => item.id === match.id) ??
        this.withScoredSide(match, side);
      this.scoreHold.set({
        kind: 'promotion',
        split: scene.split,
        match: finished,
        iso: scene.iso,
        kickoff: scene.kickoff,
      });
      if (done) {
        this.finishSimAdvance();
      }
    });
  }

  msiScene(): MsiHero | null {
    const hold = this.scoreHold();
    if (hold?.kind === 'msi') {
      return { kind: 'match', match: hold.match };
    }
    if (this.missingLeagues().length > 0 || this.postScene()) {
      return null;
    }
    const match = this.board().current;
    if (match && !this.board().canFastForward) {
      return null;
    }
    return this.msi.hero();
  }

  msiUpcoming(): MsiMatchView[] {
    if (!this.msiScene()) {
      return [];
    }
    return this.msi.upcoming();
  }

  focusLeague(): 'TCS' | 'TCL' {
    const held = this.lastSimBoard()?.league;
    if (this.lastMatchReport() && held) {
      return held;
    }
    const current = this.board().current;
    if (current) {
      return current.league;
    }
    const upcoming = this.board().upcoming[0];
    if (upcoming) {
      return upcoming.league;
    }
    const scene = this.postScene();
    if (scene?.kind === 'series') {
      return scene.item.league;
    }
    if (scene?.kind === 'bubble') {
      return scene.league;
    }
    if (scene?.kind === 'locks') {
      return scene.rows[0]?.league ?? 'TCS';
    }
    if (scene?.kind === 'picks') {
      return scene.cards[0]?.league ?? 'TCS';
    }
    return 'TCS';
  }

  focusStandingRows(): RegularStanding[] {
    return this.focusLeague() === 'TCL' ? this.board().tclTable : this.board().tcsTable;
  }

  mvpRows(league: 'TCS' | 'TCL'): MvpBoardRow[] {
    return league === 'TCL' ? this.mvpBoard.tclBoard() : this.mvpBoard.tcsBoard();
  }

  positionLabel(position: PlayerPosition): string {
    return PLAYER_POSITION_LABELS[position];
  }

  mvpStatRows(league: 'TCS' | 'TCL'): Array<
    MvpBoardRow & {
      games: number;
      wins: number;
      losses: number;
      winRate: number;
      kills: number;
      deaths: number;
      assists: number;
      kda: number;
      kpPct: number;
      csm: number;
      dpm: number;
      gpm: number;
    }
  > {
    const periodId = this.competitionStats.currentPeriodId();
    const byPlayer = new Map(
      this.competitionStats.playersFor(league, periodId).map((row) => [row.playerId, row]),
    );
    return this.mvpRows(league).map((row) => {
      const stats = byPlayer.get(row.playerId);
      return {
        ...row,
        games: stats?.games ?? 0,
        wins: stats?.wins ?? 0,
        losses: stats?.losses ?? 0,
        winRate: stats?.winRate ?? 0,
        kills: stats?.kills ?? 0,
        deaths: stats?.deaths ?? 0,
        assists: stats?.assists ?? 0,
        kda: stats?.kda ?? 0,
        kpPct: stats?.kpPct ?? 0,
        csm: stats?.csm ?? 0,
        dpm: stats?.dpm ?? 0,
        gpm: stats?.gpm ?? 0,
      };
    });
  }

  focusChampionRows() {
    return this.competitionStats
      .championsFor(this.focusLeague(), this.competitionStats.currentPeriodId())
      .slice(0, 12);
  }

  focusPlayerStatRows() {
    return this.competitionStats
      .playersFor(this.focusLeague(), this.competitionStats.currentPeriodId())
      .slice(0, 12);
  }

  focusStatsGames(): number {
    return this.competitionStats.gamesPlayed(
      this.focusLeague(),
      this.competitionStats.currentPeriodId(),
    );
  }

  focusMvpLeaderboard(): Array<{
    rank: number;
    playerId: string;
    gamertag: string;
    abbreviation: string;
    teamName: string;
    logoUrl: string | null;
    positionLabel: string;
    games: number;
    value: number;
    valueLabel: string;
  }> {
    return this.mvpRows(this.focusLeague())
      .slice(0, 10)
      .map((row) => ({
        rank: row.rank,
        playerId: row.playerId,
        gamertag: row.gamertag,
        abbreviation: row.abbreviation,
        teamName: row.name,
        logoUrl: row.logoUrl,
        positionLabel: row.positionLabel,
        games: row.count,
        value: row.count,
        valueLabel: String(row.count),
      }));
  }

  focusLeaderboard(
    metric: 'kills' | 'assists' | 'kda' | 'dpm' | 'gpm',
  ): Array<{
    rank: number;
    playerId: string;
    gamertag: string;
    abbreviation: string;
    teamName: string;
    logoUrl: string | null;
    positionLabel: string;
    games: number;
    value: number;
    valueLabel: string;
  }> {
    const rows = this.competitionStats
      .playersFor(this.focusLeague(), this.competitionStats.currentPeriodId())
      .filter((row) => row.games > 0)
      .slice()
      .sort((left, right) => right[metric] - left[metric] || left.gamertag.localeCompare(right.gamertag))
      .slice(0, 10);
    return rows.map((row, index) => ({
      rank: index + 1,
      playerId: row.playerId,
      gamertag: row.gamertag,
      abbreviation: row.abbreviation,
      teamName: row.teamName,
      logoUrl: row.logoUrl,
      positionLabel: PLAYER_POSITION_LABELS[row.position],
      games: row.games,
      value: row[metric],
      valueLabel:
        metric === 'kills' || metric === 'assists'
          ? row[metric].toFixed(1)
          : metric === 'kda'
            ? row.kda.toFixed(2)
            : String(Math.round(row[metric])),
    }));
  }

  railUpcoming(): RailUpcomingItem[] {
    const league = this.focusLeague();
    const upcoming = this.board().upcoming;
    if (upcoming.length > 0) {
      const preferred = upcoming.filter((item) => item.league === league);
      const filler = upcoming.filter((item) => item.league !== league);
      return [...preferred, ...filler].slice(0, 3).map((item) => ({
        id: `${item.league}:${item.id}`,
        when: this.shortDate(item.iso),
        kickoff: item.kickoff,
        tag: item.league,
        league: item.league,
        round: null,
        leftAbbr: item.homeAbbreviation,
        leftLogo: item.homeLogoUrl,
        leftName: item.homeName,
        rightAbbr: item.awayAbbreviation,
        rightLogo: item.awayLogoUrl,
        rightName: item.awayName,
      }));
    }

    const items: RailUpcomingItem[] = [];
    for (const item of this.promotionUpcoming()) {
      items.push({
        id: `promo:${item.league}:${item.roundLabel}:${item.when}`,
        when: item.when,
        kickoff: item.kickoff,
        tag: item.league,
        league: item.league,
        round: item.roundLabel,
        leftAbbr: item.left?.abbreviation ?? '',
        leftLogo: item.left?.logoUrl ?? null,
        leftName: item.left?.name ?? '',
        rightAbbr: item.right?.abbreviation ?? '',
        rightLogo: item.right?.logoUrl ?? null,
        rightName: item.right?.name ?? '',
      });
    }
    for (const item of this.playoffUpcoming()) {
      items.push({
        id: `playoff:${item.league}:${item.roundLabel}:${item.when}`,
        when: item.when,
        kickoff: item.kickoff,
        tag: item.league,
        league: item.league,
        round: item.roundLabel,
        leftAbbr: item.left?.abbreviation ?? '',
        leftLogo: item.left?.logoUrl ?? null,
        leftName: item.left?.name ?? '',
        rightAbbr: item.right?.abbreviation ?? '',
        rightLogo: item.right?.logoUrl ?? null,
        rightName: item.right?.name ?? '',
      });
    }
    for (const item of this.msiUpcoming()) {
      items.push({
        id: item.id,
        when: item.date ? this.shortDate(item.date) : '待定',
        kickoff: this.msiWhen(item),
        tag: null,
        league: 'MSI',
        round: null,
        leftAbbr: item.left?.abbreviation ?? '',
        leftLogo: item.left?.logoUrl ?? null,
        leftName: item.left?.name ?? '',
        rightAbbr: item.right?.abbreviation ?? '',
        rightLogo: item.right?.logoUrl ?? null,
        rightName: item.right?.name ?? '',
      });
    }
    const preferred = items.filter((item) => item.league === league);
    const filler = items.filter((item) => item.league !== league);
    return [...preferred, ...filler].slice(0, 3);
  }

  msiTables(): MsiTable[] {
    if (!this.msiScene()) {
      return [];
    }
    return this.msi.boards();
  }

  msiWhen(match: MsiMatchView): string {
    if (match.stage === '亂鬥賽') {
      return `亂鬥 ${match.label}`;
    }
    return match.label;
  }

  msiSideLabel(match: MsiMatchView, side: 'left' | 'right'): string {
    return (side === 'left' ? match.left : match.right)?.abbreviation ?? '';
  }

  msiSideRecord(match: MsiMatchView, side: 'left' | 'right'): string {
    const team = side === 'left' ? match.left : match.right;
    if (!team?.abbreviation) {
      return '0-0';
    }
    const row = match.table.find((item) => item.abbreviation === team.abbreviation);
    if (!row) {
      return '0-0';
    }
    return `${row.wins}-${row.losses}`;
  }

  playoffSideLabel(league: PlayoffLeague, match: PlayoffSeriesView, side: 'left' | 'right'): string {
    const team = side === 'left' ? match.left : match.right;
    return team?.abbreviation ?? '';
  }

  playoffSideMeta(league: PlayoffLeague, match: PlayoffSeriesView, side: 'left' | 'right'): string {
    const team = side === 'left' ? match.left : match.right;
    if (!team) {
      return '';
    }
    const ovr = this.teamOvr(team.teamId);
    return ovr > 0 ? `#${team.seed} · OVR ${ovr}` : `#${team.seed}`;
  }

  playoffSideRecord(league: PlayoffLeague, match: PlayoffSeriesView, side: 'left' | 'right'): string {
    const team = side === 'left' ? match.left : match.right;
    if (!team) {
      return '0-0';
    }
    return this.standingRecord(league, team.teamId, team.abbreviation);
  }

  private standingRecord(league: PlayoffLeague, teamId: string, abbreviation: string): string {
    const row = this.season
      .standingsFor(league)
      .find((item) => item.teamId === teamId || item.abbreviation === abbreviation);
    if (!row) {
      return '0-0';
    }
    return `${row.seriesWins}-${row.seriesLosses}`;
  }

  msiLiveTable(key: string): boolean {
    const scene = this.msiScene();
    return scene?.kind === 'match' && scene.match.bucket === key;
  }

  showGroupPage(page: number): void {
    if (!this.canFlipGroupPages()) {
      return;
    }
    const max = this.groupPageCount() - 1;
    this.groupPage.set(Math.max(0, Math.min(page, max)));
    this.restartMeter();
    this.armGroupTimer();
  }

  groupPageHasLive(page: number): boolean {
    if (this.msiTables().length >= 3) {
      if (page === 0) {
        return this.msiLiveTable('A') || this.msiLiveTable('B');
      }
      return page === 1 && this.msiLiveTable('C');
    }
    return page === 0 && !!this.board().current;
  }

  private groupPageCount(): number {
    if (this.msiTables().length >= 3) {
      return 2;
    }
    if (this.msiTables().length === 0 && this.playoffTrees().length === 0) {
      return 5;
    }
    return 1;
  }

  private canFlipGroupPages(): boolean {
    return this.groupPageCount() > 1;
  }

  private prefersStillGroups(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private armGroupTimer(): void {
    const timers = window as unknown as Record<string, number>;
    window.clearInterval(timers['eusGroupPageTimer']);
    window.clearInterval(this.groupTimer);
    if (this.prefersStillGroups()) {
      return;
    }
    const handle = window.setInterval(() => this.turnGroupPage(), GROUP_PAGE_MS);
    this.groupTimer = handle;
    timers['eusGroupPageTimer'] = handle;
  }

  private restartMeter(): void {
    const timers = window as unknown as Record<string, number>;
    window.clearTimeout(timers['eusGroupMeterTimer']);
    window.clearTimeout(this.meterTimer);
    this.meterOn.set(false);
    if (this.prefersStillGroups()) {
      return;
    }
    const handle = window.setTimeout(() => this.meterOn.set(true), 32);
    this.meterTimer = handle;
    timers['eusGroupMeterTimer'] = handle;
  }

  private turnGroupPage(): void {
    if (this.prefersStillGroups() || !this.canFlipGroupPages()) {
      return;
    }
    const count = this.groupPageCount();
    this.groupPage.set((this.groupPage() + 1) % count);
    this.restartMeter();
  }

  msiLines(side: MsiSide | null): { role: string; gamertag: string; ovr: number | null }[] {
    if (!side) {
      return [];
    }
    if (side.teamId) {
      const lines: { role: string; gamertag: string; ovr: number | null }[] = [];
      for (const line of this.rosterLines(side.teamId)) {
        for (const player of line.players) {
          lines.push({ role: line.label, gamertag: player.gamertag, ovr: player.ovr });
        }
      }
      return lines;
    }
    const guestLines = msiGuestRosterLines(side.id);
    if (guestLines.length > 0) {
      return guestLines;
    }
    return side.roster.map((player) => ({ ...player, ovr: null }));
  }

  msiTeamOvr(side: MsiSide | null): number {
    if (!side) {
      return 0;
    }
    if (side.teamId) {
      return this.teamOvr(side.teamId);
    }
    return getMsiGuestBundle(side.id)?.teamOvr ?? 0;
  }

  msiLineupRows(
    left: MsiSide | null,
    right: MsiSide | null,
  ): Array<{
    position: PlayerPosition;
    label: string;
    home: RosterSpot | null;
    away: RosterSpot | null;
  }> {
    return PLAYER_POSITIONS.map((position) => ({
      position,
      label: PLAYER_POSITION_LABELS[position],
      home: this.msiRosterSpot(left, position),
      away: this.msiRosterSpot(right, position),
    }));
  }

  private msiRosterSpot(side: MsiSide | null, position: PlayerPosition): RosterSpot | null {
    if (!side) {
      return null;
    }
    if (side.teamId) {
      const line = this.rosterLines(side.teamId).find((row) => row.position === position);
      return line?.players[0] ?? null;
    }
    const player = getMsiGuestBundle(side.id)?.players.find((item) => item.position === position);
    if (!player) {
      return null;
    }
    return {
      id: player.id,
      position: PLAYER_POSITION_LABELS[player.position],
      gamertag: player.gamertag,
      ovr: Math.round(calculatePlayerOvr(player.attributes, player.position)),
    };
  }

  playMsi(match: MsiMatchView, sideId?: string): void {
    if (this.simBusy() || this.scoreHold() || this.lastMatchReport()) {
      return;
    }
    const scene = this.msiScene();
    if (scene?.kind !== 'match' || scene.match.id !== match.id || match.done) {
      return;
    }
    if (!this.canScorePlayoff(match.date)) {
      return;
    }
    if (!match.left || !match.right) {
      return;
    }
    const leftTeamId = match.left.teamId ?? match.left.id;
    const rightTeamId = match.right.teamId ?? match.right.id;
    const forceWinnerTeamId = sideId
      ? sideId === match.left.id
        ? leftTeamId
        : rightTeamId
      : undefined;
    const need = match.bestOf === 1 ? 1 : 3;
    void this.playSimOneGame(
      leftTeamId,
      rightTeamId,
      (winnerId) => {
        const winSideId = winnerId === leftTeamId ? match.left!.id : match.right!.id;
        this.msi.addGame(match.id, winSideId);
      },
      {
        need,
        competition: 'MSI',
        readSeries: () => this.msiSeriesScore(match.id, leftTeamId, rightTeamId),
        forceWinnerTeamId,
      },
    ).then((report) => {
      if (!report) {
        return;
      }
      const winnerId = forceWinnerTeamId ?? report.winnerTeamId;
      this.markScore(`msi:${match.id}`, winnerId === leftTeamId ? 'left' : 'right');
      const series = this.msiSeriesScore(match.id, leftTeamId, rightTeamId);
      const done = series.home >= need || series.away >= need;
      this.freezeMsiMatch(match, series, done);
      if (done) {
        this.finishSimAdvance();
      }
    });
  }

  private freezeMsiMatch(
    match: MsiMatchView,
    series: { home: number; away: number },
    done: boolean,
  ): void {
    this.scoreHold.set({
      kind: 'msi',
      match: {
        ...match,
        leftGames: series.home,
        rightGames: series.away,
        done,
      },
    });
  }

  pickMsi(sideId: string): void {
    this.msi.pickSemi(sideId);
    this.advanceToNextEvent();
  }

  gateFor(league: 'TCS' | 'TCL'): 'incomplete' | 'bubble' | 'ready' | 'playoff' {
    if (this.season.isPlayoffLocked(league)) {
      return 'playoff';
    }
    return this.season.playoffGate(league);
  }

  playoffSeeds(league: 'TCS' | 'TCL'): RegularStanding[] {
    const table = league === 'TCL' ? this.board().tclTable : this.board().tcsTable;
    return table.filter((row) => row.inPlayoff).slice(0, 6);
  }

  enterPlayoff(league: PlayoffLeague): void {
    this.season.advanceLeague(league);
  }

  bubbleSides(league: PlayoffLeague): RegularStanding[] {
    if (this.gateFor(league) !== 'bubble') {
      return [];
    }
    const table = league === 'TCL' ? this.board().tclTable : this.board().tcsTable;
    return table.slice(5, 7);
  }

  playBubble(league: PlayoffLeague, teamId: string): void {
    this.season.playBubble(league, teamId);
  }

  playoffStep(league: PlayoffLeague): PlayoffStep | null {
    const { progress, standings, series } = this.playoff.bundle(league);
    const seeds = standings.slice(0, 6);
    if (seeds.length < 6) {
      return null;
    }
    if (!progress.roundOneOpponentId) {
      return {
        kind: 'pick',
        title: '第 3 名首輪選邊',
        pick: 'round',
        chooser: this.choiceFrom(seeds[2], seeds[2].rank),
        bench: this.choiceFrom(seeds[3], seeds[3].rank),
        choices: [this.choiceFrom(seeds[4], seeds[4].rank), this.choiceFrom(seeds[5], seeds[5].rank)],
      };
    }
    const roundOne = series.slice(0, 2);
    const openRound = this.earliestReady(league, roundOne);
    if (openRound) {
      return this.seriesStep(league, openRound);
    }
    if (roundOne.some((match) => match.status !== 'done')) {
      return { kind: 'pick', title: '首輪待定', choices: [] };
    }
    if (!progress.semiOpponentId) {
      const winners = roundOne
        .map((match) => (match.left?.isWinner ? match.left : match.right?.isWinner ? match.right : null))
        .filter((side) => !!side)
        .map((side) => ({
          teamId: side.teamId,
          abbreviation: side.abbreviation,
          name: side.name,
          logoUrl: side.logoUrl,
          rank: side.seed,
        }));
      return {
        kind: 'pick',
        title: '第 1 名四強選邊',
        pick: 'semi',
        chooser: this.choiceFrom(seeds[0], seeds[0].rank),
        bench: this.choiceFrom(seeds[1], seeds[1].rank),
        choices: winners,
      };
    }
    const later = this.earliestReady(league, series.slice(2));
    if (later) {
      return this.seriesStep(league, later);
    }
    const final = series[4];
    const winner = final?.left?.isWinner ? final.left.abbreviation : final?.right?.isWinner ? final.right.abbreviation : '';
    return winner ? { kind: 'done', title: '春季季後賽冠軍', winner } : { kind: 'pick', title: '等待上一輪', choices: [] };
  }

  playoffTrees(): PlayoffTree[] {
    if (this.hasOpenRegular()) {
      return [];
    }
    const focus = this.shownLeague();
    return (['TCL', 'TCS'] as const)
      .filter((league) => this.gateFor(league) === 'playoff')
      .filter((league) => !focus || league === focus)
      .map((league) => {
        const series = this.playoff.bundle(league).series;
        return {
          league,
          rounds: [series.slice(0, 2), series.slice(2, 4), series.slice(4)],
        };
      });
  }

  isLiveSeries(league: PlayoffLeague, matchId: string): boolean {
    const scene = this.postScene();
    return scene?.kind === 'series' && scene.item.league === league && scene.item.match.id === matchId;
  }

  seriesStatus(match: PlayoffSeriesView): string {
    if (match.scoreText === '預覽') {
      return '預覽';
    }
    if (match.status === 'done') {
      return 'BO5';
    }
    if (match.status === 'pending') {
      return '待定';
    }
    return match.scoreText;
  }

  playoffUpcoming(): PlayoffNext[] {
    const shown = this.postScene();
    const shownKey = shown?.kind === 'series' ? `${shown.item.league}:${shown.item.match.id}` : '';
    const kickoffs = new Map(this.playoffQueue().map((item) => [`${item.league}:${item.match.id}`, item.kickoff]));
    const items: (PlayoffNext & { sort: string; rank: number })[] = [];
    for (const league of ['TCL', 'TCS'] as const) {
      if (this.gateFor(league) !== 'playoff') {
        continue;
      }
      for (const match of this.playoff.bundle(league).series) {
        if (match.status === 'done' || `${league}:${match.id}` === shownKey) {
          continue;
        }
        if (!match.left || !match.right) {
          continue;
        }
        const iso = this.seriesIso(league, match.id);
        items.push({
          league,
          roundLabel: match.roundLabel,
          when: iso ? this.shortDate(iso) : '待定',
          kickoff: kickoffs.get(`${league}:${match.id}`) ?? '',
          left: this.nextSide(match.left),
          right: this.nextSide(match.right),
          sort: iso || '9999-99-99',
          rank: this.seriesRank(match.id),
        });
      }
    }
    items.sort((left, right) => left.sort.localeCompare(right.sort) || left.rank - right.rank || (left.league === 'TCL' ? -1 : 1));
    return items.slice(0, 3);
  }

  private shownLeague(): PlayoffLeague | null {
    const scene = this.postScene();
    if (scene?.kind === 'series') {
      return scene.item.league;
    }
    if (scene?.kind === 'bubble') {
      return scene.league;
    }
    if (scene?.kind === 'picks') {
      return scene.cards.find((card) => !card.done)?.league ?? null;
    }
    return null;
  }

  private nextSide(side: PlayoffSeriesView['left']): PlayoffNext['left'] {
    if (!side) {
      return null;
    }
    return { abbreviation: side.abbreviation, name: side.name, logoUrl: side.logoUrl };
  }

  leagueRounds(league: PlayoffLeague): PlayoffSeriesView[][] {
    const series = this.playoff.bundle(league).series.map((match) => ({ ...match }));
    const preview = this.previewPick();
    if (preview?.league === league) {
      this.applyPickPreview(series, league, preview.teamId);
    }
    return [series.slice(0, 2), series.slice(2, 4), series.slice(4)];
  }

  previewChoice(card: PlayoffPickCard): PlayoffChoice | null {
    const teamId = this.previewPick()?.league === card.league ? this.previewPick()?.teamId : null;
    return card.step?.choices?.find((choice) => choice.teamId === teamId) ?? null;
  }

  setPreview(league: PlayoffLeague, teamId: string): void {
    this.previewPick.set({ league, teamId });
  }

  clearPreview(league: PlayoffLeague): void {
    if (this.previewPick()?.league === league) {
      this.previewPick.set(null);
    }
  }

  isPreviewMatch(match: PlayoffSeriesView): boolean {
    return match.scoreText === '預覽';
  }

  private applyPickPreview(series: PlayoffSeriesView[], league: PlayoffLeague, teamId: string): void {
    const scene = this.postScene();
    if (scene?.kind !== 'picks') {
      return;
    }
    const card = scene.cards.find((item) => item.league === league);
    const step = card?.step;
    if (!card || card.done || !step?.choices?.length) {
      return;
    }
    const picked = step.choices.find((choice) => choice.teamId === teamId);
    if (!picked) {
      return;
    }
    const other = step.choices.find((choice) => choice.teamId !== teamId) ?? null;
    if (step.pick === 'semi') {
      series[2] = this.withPreviewSide(series[2], picked);
      if (other) {
        series[3] = this.withPreviewSide(series[3], other);
      }
      return;
    }
    series[0] = this.withPreviewSide(series[0], picked);
    if (other) {
      series[1] = this.withPreviewSide(series[1], other);
    }
  }

  private withPreviewSide(match: PlayoffSeriesView | undefined, choice: PlayoffChoice): PlayoffSeriesView {
    if (!match) {
      return {
        id: '',
        roundLabel: '',
        status: 'pending',
        left: null,
        right: this.sideFromChoice(choice),
        scoreText: '預覽',
      };
    }
    return {
      ...match,
      right: this.sideFromChoice(choice),
      status: 'pending',
      scoreText: '預覽',
    };
  }

  private sideFromChoice(choice: PlayoffChoice): PlayoffSide {
    return {
      teamId: choice.teamId,
      seed: choice.rank,
      abbreviation: choice.abbreviation,
      name: choice.name,
      logoUrl: choice.logoUrl,
      games: null,
      isWinner: false,
    };
  }

  choosePlayoff(league: PlayoffLeague, pick: 'round' | 'semi' | undefined, teamId: string): void {
    if (pick === 'semi') {
      this.playoff.pickSemi(league, teamId);
      return;
    }
    this.playoff.pickRoundOne(league, teamId);
  }

  canScorePlayoff(iso: string | undefined): boolean {
    const today = this.board().today;
    return !iso || Boolean(today && today >= iso);
  }

  playPlayoff(league: PlayoffLeague, match: PlayoffSeriesView, teamId?: string): void {
    if (this.simBusy() || this.scoreHold() || this.lastMatchReport()) {
      return;
    }
    const head = this.playoffQueue()[0];
    if (!head || head.league !== league || head.match.id !== match.id) {
      return;
    }
    if (!this.canScorePlayoff(head.iso) || match.left?.games === 3 || match.right?.games === 3) {
      return;
    }
    if (!match.left || !match.right) {
      return;
    }
    void this.playSimOneGame(
      match.left.teamId,
      match.right.teamId,
      (winnerTeamId) => this.playoff.addGame(league, match.id, winnerTeamId),
      {
        need: 3,
        league,
        readSeries: () =>
          this.playoffSeriesScore(league, match.id, match.left!.teamId, match.right!.teamId),
        forceWinnerTeamId: teamId,
      },
    ).then((report) => {
      if (!report || !match.left || !match.right) {
        return;
      }
      const winnerId = teamId ?? report.winnerTeamId;
      const side = winnerId === match.left.teamId ? 'left' : 'right';
      this.markScore(`${league}:${match.id}`, side);
      const series = this.playoffSeriesScore(league, match.id, match.left.teamId, match.right.teamId);
      const done = series.home >= 3 || series.away >= 3;
      const finished =
        this.playoff.bundle(league).series.find((item) => item.id === match.id) ??
        this.withScoredSide(match, side);
      this.scoreHold.set({
        kind: 'series',
        item: { ...head, match: finished },
      });
      if (done) {
        this.finishSimAdvance();
      }
    });
  }

  private markScore(key: string, side: 'left' | 'right'): void {
    this.scoreToken += 1;
    this.scoreBump.set({ key, side, token: this.scoreToken });
  }

  private scheduleScoreAdvance(): void {
    window.clearTimeout(this.scoreAdvanceTimer);
    const finish = () => {
      this.scoreHold.set(null);
      this.scoreBump.set(null);
      this.advanceToNextEvent();
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    this.scoreAdvanceTimer = window.setTimeout(finish, this.scoreAdvanceMs);
  }

  private withScoredSide(match: PlayoffSeriesView, side: 'left' | 'right'): PlayoffSeriesView {
    const leftGames = (match.left?.games ?? 0) + (side === 'left' ? 1 : 0);
    const rightGames = (match.right?.games ?? 0) + (side === 'right' ? 1 : 0);
    const done = leftGames >= 3 || rightGames >= 3;
    return {
      ...match,
      left: match.left ? { ...match.left, games: leftGames, isWinner: done && leftGames >= 3 } : null,
      right: match.right ? { ...match.right, games: rightGames, isWinner: done && rightGames >= 3 } : null,
      status: done ? 'done' : 'ready',
      scoreText: `${leftGames} - ${rightGames}`,
    };
  }

  private viewFrame(): string {
    if (!this.activeUniverse() || this.missingLeagues().length > 0) {
      return '';
    }
    const hold = this.scoreHold();
    if (hold) {
      return this.holdFrame(hold);
    }
    const crown = this.pendingCrown();
    if (crown) {
      return `crown:${crown.id}`;
    }
    const promo = this.pendingPromotion();
    if (promo) {
      return `promo:${promo.id}`;
    }
    const table = this.pendingTable();
    if (table) {
      return `table:${table.id}`;
    }
    const summer = this.summerGap();
    if (summer) {
      return `summer:${summer.start}`;
    }
    const event = this.spotlightEvent();
    if (event) {
      return `event:${event.scene}:${event.start}`;
    }
    const match = this.board().current;
    if (match) {
      return `regular:${match.league}:${match.id}`;
    }
    const scene = this.postScene();
    if (scene?.kind === 'series') {
      return `playoff:${scene.item.league}:${scene.item.match.id}`;
    }
    if (scene?.kind === 'bubble') {
      return `bubble:${scene.league}`;
    }
    if (scene?.kind === 'picks') {
      const open = scene.cards.find((card) => !card.done) ?? scene.cards[0];
      return open ? `picks:${open.league}:${scene.title}` : 'picks';
    }
    if (scene?.kind === 'promotion-pick') {
      return `promotion-pick:${scene.split}`;
    }
    if (scene?.kind === 'promotion') {
      return `promotion:${scene.split}:${scene.match.id}`;
    }
    if (scene?.kind === 'champions') {
      return 'champions';
    }
    const msi = this.msiScene();
    if (msi?.kind === 'pick') {
      return 'msi:pick';
    }
    if (msi?.kind === 'match') {
      return `msi:${msi.match.id}`;
    }
    return 'idle';
  }

  private holdFrame(hold: ScoreHold): string {
    if (hold.kind === 'regular') {
      return `hold:regular:${hold.match.league}:${hold.match.id}`;
    }
    if (hold.kind === 'series') {
      return `hold:playoff:${hold.item.league}:${hold.item.match.id}`;
    }
    if (hold.kind === 'promotion') {
      return `hold:promotion:${hold.split}:${hold.match.id}`;
    }
    return `hold:msi:${hold.match.id}`;
  }

  private playSceneSwap(fromScene: string, nextScene: string): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (!fromScene || fromScene === nextScene) {
      return;
    }
    const body = document.body;
    body.dataset['sceneFrom'] = fromScene;
    body.classList.remove('is-scene-swap');
    void body.offsetWidth;
    body.classList.add('is-scene-swap');
    window.clearTimeout(this.swapTimer);
    this.swapTimer = window.setTimeout(() => body.classList.remove('is-scene-swap'), 760);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.home > .card, .home > .billboard, .home > .trees').forEach((node) => {
          if (!(node instanceof HTMLElement)) {
            return;
          }
          node.getAnimations().forEach((clip) => clip.cancel());
          node.animate(
            [
              { opacity: 0, transform: 'translateY(18px) scale(0.985)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 480, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' },
          );
        });
      });
    });
  }

  private pagePaint(): { scene: string; mark: string } | null {
    if (!this.activeUniverse() || this.missingLeagues().length > 0) {
      return null;
    }
    const hold = this.scoreHold();
    if (hold) {
      return this.holdPaint(hold);
    }
    const crown = this.pendingCrown();
    if (crown) {
      return { scene: crown.scene, mark: crown.mark };
    }
    if (this.pendingPromotion()) {
      return { scene: 'promotion', mark: '升降' };
    }
    const table = this.pendingTable();
    if (table) {
      return { scene: table.scene, mark: this.regularMark(table.league) };
    }
    if (this.summerGap()) {
      return { scene: 'tcs', mark: '夏季' };
    }
    const event = this.spotlightEvent();
    if (event) {
      return { scene: event.scene, mark: event.mark };
    }
    const match = this.board().current;
    if (match) {
      return { scene: this.matchScene(match.league), mark: this.regularMark(match.league) };
    }
    const scene = this.postScene();
    if (scene?.kind === 'series') {
      return { scene: this.matchScene(scene.item.league, 'playoff'), mark: this.playoffMark(scene.item.league) };
    }
    if (scene?.kind === 'bubble') {
      return { scene: this.matchScene(scene.league, 'playoff'), mark: this.playoffMark(scene.league) };
    }
    if (scene?.kind === 'picks') {
      return { scene: 'playoff', mark: '季後賽' };
    }
    if (scene?.kind === 'locks') {
      return { scene: 'playoff', mark: '季後賽' };
    }
    if (scene?.kind === 'promotion' || scene?.kind === 'promotion-pick') {
      return { scene: 'promotion', mark: '升降' };
    }
    if (this.msiScene()) {
      return { scene: 'msi', mark: 'MSI' };
    }
    return null;
  }

  private holdPaint(hold: ScoreHold): { scene: string; mark: string } {
    if (hold.kind === 'regular') {
      return { scene: this.matchScene(hold.match.league), mark: this.regularMark(hold.match.league) };
    }
    if (hold.kind === 'series') {
      return {
        scene: this.matchScene(hold.item.league, 'playoff'),
        mark: this.playoffMark(hold.item.league),
      };
    }
    if (hold.kind === 'promotion') {
      return { scene: 'promotion', mark: '升降' };
    }
    return { scene: 'msi', mark: 'MSI' };
  }

  private advanceToNextEvent(): void {
    if (this.pendingCrown()) {
      return;
    }
    if (this.pendingPromotion()) {
      return;
    }
    if (this.pendingTable()) {
      return;
    }
    const today = this.board().today;
    if (!today) {
      return;
    }
    const promotion = this.postScene();
    const promotionIso = promotion?.kind === 'promotion' ? promotion.iso : '';
    const msi = this.msiScene();
    let msiIso = '';
    if (msi?.kind === 'match') {
      msiIso = msi.match.date;
    } else if (msi?.kind === 'pick') {
      msiIso = msi.date;
    }
    const next = [this.board().current?.iso ?? '', this.playoffQueue()[0]?.iso ?? '', promotionIso, msiIso]
      .filter((iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso))
      .sort()[0];
    if (next && next > today) {
      this.universeService.setCurrentDate(next);
    }
  }

  jumpTo(iso: string): void {
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      this.universeService.setCurrentDate(iso);
    }
  }

  private summerSitsBefore(worldsStart: string): boolean {
    const start = fixedRegular(this.clock.year(), 'summerRegular');
    return Boolean(start && start < worldsStart);
  }

  private hasLiveScoring(): boolean {
    if (this.scoreHold()) {
      return true;
    }
    const match = this.board().current;
    if (match && !this.board().canFastForward) {
      return true;
    }
    const scene = this.postScene();
    if (scene?.kind === 'picks' || scene?.kind === 'promotion' || scene?.kind === 'promotion-pick' || scene?.kind === 'bubble') {
      return true;
    }
    if (scene?.kind === 'series' && this.canScorePlayoff(scene.item.iso)) {
      return true;
    }
    const msi = this.msiScene();
    if (msi) {
      return true;
    }
    return false;
  }

  private promotionMoment(): PromoMoment | null {
    const year = this.clock.year();
    const today = this.board().today;
    const summerStart = fixedRegular(year, 'summerRegular');
    const split: PromotionSplit = summerStart && today && today >= summerStart ? 'summer' : 'spring';
    if (!this.promotion.isDone(split)) {
      return null;
    }
    const matches = this.promotion.bracket(split);
    const rows: PromoRow[] = [];
    for (const match of matches) {
      if (!match.left || !match.right || match.status !== 'done') {
        return null;
      }
      const tcl = this.promoSide(match.left, match.left.isWinner ? '升級' : '升級失敗', match.left.isWinner ? 'up' : 'fail');
      const tcs = this.promoSide(match.right, match.right.isWinner ? '保級成功' : '降級', match.right.isWinner ? 'hold' : 'down');
      const swapped = tcl.outcome === 'up';
      rows.push({
        id: match.id,
        score: swapped
          ? `${match.left.games ?? 0}:${match.right.games ?? 0}`
          : `${match.right.games ?? 0}:${match.left.games ?? 0}`,
        swapped,
        tcs: swapped ? tcl : tcs,
        tcl: swapped ? tcs : tcl,
      });
    }
    if (rows.length === 0) {
      return null;
    }
    return {
      id: `${year}:${split}:promotion`,
      title: split === 'summer' ? '夏季升降賽' : '春季升降賽',
      date: this.promotionDate(split, 'promo-2'),
      rows,
    };
  }

  private promoSide(side: PlayoffSide, tag: string, outcome: PromoOutcome): PromoSide {
    return {
      abbreviation: side.abbreviation,
      name: side.name,
      logoUrl: side.logoUrl,
      tag,
      outcome,
    };
  }

  private tableMoment(league: 'TCS' | 'TCL'): TableMoment | null {
    if (this.season.playoffGate(league) === 'bubble') {
      return null;
    }
    const date = this.lastRegularIso(league);
    if (!date) {
      return null;
    }
    return {
      id: `${this.clock.year()}:regular:${league}`,
      league,
      scene: league === 'TCL' ? 'tcl' : 'tcs',
      date,
      rows: this.season.standingsFor(league),
    };
  }

  private lastRegularIso(league: 'TCS' | 'TCL'): string {
    const monday = this.calendar.springMonday(league);
    const matches = this.season.fixturesFor(league);
    if (!monday || matches.length === 0 || matches.some((match) => match.status !== 'done')) {
      return '';
    }
    let last = '';
    for (const match of matches) {
      const weekIndex = Math.floor((match.round - 1) / 2);
      const mates = matches.filter((item) => Math.floor((item.round - 1) / 2) === weekIndex);
      const indexInWeek = mates.findIndex((item) => item.id === match.id);
      const iso = dateForWeekSlot(monday, weekIndex, indexInWeek);
      if (iso > last) {
        last = iso;
      }
    }
    return last;
  }

  private earnedCrowns(): CrownMoment[] {
    const year = this.clock.year();
    const crowns: CrownMoment[] = [];
    for (const league of ['TCL', 'TCS'] as const) {
      const bundle = this.playoff.bundle(league);
      const final = bundle.series.find((match) => match.id === 'final');
      if (!final || final.status !== 'done') {
        continue;
      }
      let winner: PlayoffSide | null = null;
      if (final.left?.isWinner) {
        winner = final.left;
      } else if (final.right?.isWinner) {
        winner = final.right;
      }
      if (!winner) {
        continue;
      }
      const titleKey = `title-${year}-${league}-冠軍-${winner.teamId}`;
      const titleMark = this.teamTitleMark(winner.teamId, winner.name, titleKey);
      crowns.push({
        id: `${year}:spring:${league}`,
        scene: league === 'TCL' ? 'tcl' : 'tcs',
        mark: 'CHAMPION',
        title: `${league} 春季冠軍`,
        date: this.seriesIso(league, 'final'),
        abbreviation: winner.abbreviation,
        name: winner.name,
        logoUrl: winner.logoUrl,
        stats: this.leagueCrownStats(league, winner, final, bundle.series),
        isFirstTitle: titleMark.isFirst,
        titleMark: titleMark.label,
        coach: this.teamCrownCoach(winner.teamId, titleKey),
        roster: this.teamCrownRoster(winner.teamId, titleKey),
      });
    }
    const msi = this.msi.championSide();
    if (msi) {
      const teamId = msi.side.teamId;
      const titleKey = teamId
        ? `title-${year}-msi-冠軍-${teamId}`
        : `title-${year}-msi-冠軍-${msi.side.abbreviation}`;
      const titleMark = this.teamTitleMark(teamId, msi.side.name, titleKey);
      crowns.push({
        id: `${year}:msi`,
        scene: 'msi',
        mark: 'CHAMPION',
        title: 'MSI 冠軍',
        date: msi.date,
        abbreviation: msi.side.abbreviation,
        name: msi.side.name,
        logoUrl: msi.side.logoUrl,
        stats: this.msiCrownStats(msi.side),
        isFirstTitle: titleMark.isFirst,
        titleMark: titleMark.label,
        coach: teamId ? this.teamCrownCoach(teamId, titleKey) : null,
        roster: teamId ? this.teamCrownRoster(teamId, titleKey) : this.msiCrownRoster(msi.side),
      });
    }
    return crowns;
  }

  private teamCrownCoach(teamId: string, titleKey: string): CrownCoach | null {
    const coach = this.coaches.getCoachByTeamId(teamId);
    if (!coach) {
      return null;
    }
    const mark = this.personTitleMark(coach.careerRecords, titleKey);
    return {
      name: coach.gamertag || coach.displayName,
      isFirstTitle: mark.isFirst,
      titleMark: mark.label,
    };
  }

  private teamCrownRoster(teamId: string, titleKey: string): CrownRosterSpot[] {
    const universe = this.activeUniverse();
    const byId = new Map((universe?.players ?? []).map((player) => [player.id, player]));
    return this.slate.rosterLines(teamId).flatMap((line) =>
      line.players.map((player) => {
        const mark = this.personTitleMark(byId.get(player.id)?.careerRecords ?? [], titleKey);
        return {
          role: line.label,
          gamertag: player.gamertag,
          isFirstTitle: mark.isFirst,
          titleMark: mark.label,
        };
      }),
    );
  }

  private msiCrownRoster(side: MsiSide): CrownRosterSpot[] {
    return side.roster.map((player) => ({
      role: player.role,
      gamertag: player.gamertag,
      isFirstTitle: false,
      titleMark: null,
    }));
  }

  private personTitleMark(
    records: { id: string }[],
    currentKey: string,
  ): { isFirst: boolean; label: string } {
    const keys = new Set<string>();
    for (const record of records) {
      if (!record.id.startsWith('title-') || !record.id.includes('-冠軍-')) {
        continue;
      }
      keys.add(record.id);
    }
    keys.add(currentKey);
    const ordinal = keys.size;
    if (ordinal <= 1) {
      return { isFirst: true, label: '生涯首冠' };
    }
    return { isFirst: false, label: `生涯第 ${ordinal} 冠` };
  }

  private teamTitleMark(
    teamId: string | null,
    teamName: string,
    currentKey: string,
  ): { isFirst: boolean; label: string } {
    const keys = this.teamChampionKeys(teamId, teamName);
    keys.add(currentKey);
    const ordinal = keys.size;
    if (ordinal <= 1) {
      return { isFirst: true, label: '隊史首冠' };
    }
    return { isFirst: false, label: `隊史第 ${ordinal} 冠` };
  }

  private teamChampionKeys(teamId: string | null, teamName: string): Set<string> {
    const keys = new Set<string>();
    const universe = this.activeUniverse();
    const people = [...(universe?.players ?? []), ...(universe?.coaches ?? [])];
    for (const person of people) {
      for (const record of person.careerRecords) {
        if (!record.id.startsWith('title-') || !record.id.includes('-冠軍-')) {
          continue;
        }
        if (teamId && record.id.endsWith(`-${teamId}`)) {
          keys.add(record.id);
          continue;
        }
        if (record.teamName === teamName) {
          keys.add(record.id);
        }
      }
    }
    return keys;
  }

  private leagueCrownStats(
    league: PlayoffLeague,
    winner: PlayoffSide,
    final: PlayoffSeriesView,
    series: PlayoffSeriesView[],
  ): CrownStat[] {
    const stats: CrownStat[] = [];
    const standing = this.season
      .standingsFor(league)
      .find((row) => row.teamId === winner.teamId || row.abbreviation === winner.abbreviation);
    if (standing) {
      stats.push({ label: '種子', value: `#${standing.rank}` });
      stats.push({
        label: '例行大場',
        value: `${standing.seriesWins}-${standing.seriesLosses} · ${this.pairRate(standing.seriesWins, standing.seriesLosses)}`,
      });
      stats.push({
        label: '例行小場',
        value: `${standing.gameWins}-${standing.gameLosses} · ${this.pairRate(standing.gameWins, standing.gameLosses)}`,
      });
    } else {
      stats.push({ label: '種子', value: `#${winner.seed}` });
    }
    const path = this.playoffPathRecord(winner.teamId, series);
    stats.push({
      label: '季後賽',
      value: `${path.wins}-${path.losses} · ${this.pairRate(path.wins, path.losses)}`,
    });
    stats.push({ label: '決賽', value: this.finalScoreText(winner.teamId, final) });
    return stats;
  }

  private msiCrownStats(side: MsiSide): CrownStat[] {
    const stats: CrownStat[] = [];
    if (side.seed) {
      stats.push({ label: '種子', value: side.seed });
    }
    const record = this.msi.championRecord();
    if (record && (record.teamId === side.teamId || record.name === side.name)) {
      stats.push({
        label: 'MSI 戰績',
        value: `${record.wins}-${record.losses} · ${this.pairRate(record.wins, record.losses)}`,
      });
    }
    if (side.region) {
      stats.push({ label: '賽區', value: side.region });
    }
    return stats;
  }

  private playoffPathRecord(teamId: string, series: PlayoffSeriesView[]): { wins: number; losses: number } {
    let wins = 0;
    let losses = 0;
    for (const match of series) {
      if (match.status !== 'done') {
        continue;
      }
      const left = match.left;
      const right = match.right;
      if (!left || !right) {
        continue;
      }
      if (left.teamId !== teamId && right.teamId !== teamId) {
        continue;
      }
      const won =
        (left.teamId === teamId && left.isWinner) || (right.teamId === teamId && right.isWinner);
      if (won) {
        wins += 1;
      } else {
        losses += 1;
      }
    }
    return { wins, losses };
  }

  private finalScoreText(teamId: string, final: PlayoffSeriesView): string {
    const left = final.left;
    const right = final.right;
    if (!left || !right) {
      return '—';
    }
    const selfGames = left.teamId === teamId ? (left.games ?? 0) : (right.games ?? 0);
    const otherGames = left.teamId === teamId ? (right.games ?? 0) : (left.games ?? 0);
    return `${selfGames}-${otherGames}`;
  }

  private seenCrownIds(): string[] {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return [];
    }
    const stored = this.storage.getItem<string[]>(this.crownKey(universeId));
    return Array.isArray(stored) ? stored : [];
  }

  private crownKey(universeId: string): string {
    return `eus.crowns.${universeId}`;
  }

  private pickCards(leagues: PlayoffLeague[], pick: 'round' | 'semi'): PlayoffPickCard[] {
    const order: PlayoffLeague[] = ['TCS', 'TCL'];
    return order
      .filter((league) => leagues.includes(league))
      .map((league) => {
        const bundle = this.playoff.bundle(league);
        const done = pick === 'round' ? Boolean(bundle.progress.roundOneOpponentId) : Boolean(bundle.progress.semiOpponentId);
        return {
          league,
          done,
          step: done ? null : this.playoffStep(league),
          bye: this.playoffSeeds(league).slice(0, 2).map((row) => this.choiceFrom(row, row.rank)),
          result: done ? this.pickResult(bundle.standings, bundle.series, pick) : null,
        };
      });
  }

  private playoffQueue(): PlayoffQueueItem[] {
    const playing = (['TCL', 'TCS'] as const).filter((league) => this.gateFor(league) === 'playoff');
    const items: PlayoffQueueItem[] = [];
    for (const league of playing) {
      for (const match of this.playoff.bundle(league).series) {
        if (match.status !== 'ready' || !this.seriesAllowed(match.id, playing)) {
          continue;
        }
        items.push({ league, match, iso: this.seriesIso(league, match.id), kickoff: '' });
      }
    }
    items.sort((left, right) => {
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
      return this.seriesRank(left.match.id) - this.seriesRank(right.match.id);
    });
    const seen = new Map<string, number>();
    return items.map((item) => {
      const key = `${item.league}:${item.iso}`;
      const index = seen.get(key) ?? 0;
      seen.set(key, index + 1);
      return { ...item, kickoff: kickoffLabel(item.league, index) };
    });
  }

  private seriesRank(seriesId: string): number {
    const order = ['r1-high', 'r1-low', 'sf-1', 'sf-2', 'final'];
    const index = order.indexOf(seriesId);
    return index === -1 ? order.length : index;
  }

  private seriesAllowed(matchId: string, playing: PlayoffLeague[]): boolean {
    const roundPicked = playing.every((league) => this.playoff.bundle(league).progress.roundOneOpponentId);
    if (!roundPicked) {
      return false;
    }
    const isRoundOne = matchId === 'r1-high' || matchId === 'r1-low';
    if (isRoundOne) {
      return true;
    }
    const roundDone = playing.every((league) => this.roundOneDone(league));
    if (!roundDone) {
      return false;
    }
    return playing.every((league) => this.playoff.bundle(league).progress.semiOpponentId);
  }

  private roundOneDone(league: PlayoffLeague): boolean {
    return this.playoff.bundle(league).series.slice(0, 2).every((match) => match.status === 'done');
  }

  private pickResult(
    standings: { teamId: string; abbreviation: string; name: string; logoUrl: string | null; rank: number }[],
    series: PlayoffSeriesView[],
    pick: 'round' | 'semi',
  ): PlayoffPickResult | null {
    const match = pick === 'round' ? series[0] : series[2];
    const chooserSide = match?.left;
    const choiceSide = match?.right;
    if (!chooserSide || !choiceSide) {
      const seeds = standings.slice(0, 6);
      const chooser = pick === 'round' ? seeds[2] : seeds[0];
      if (!chooser) {
        return null;
      }
      return {
        chooser: this.choiceFrom(chooser, chooser.rank),
        choice: { teamId: '', abbreviation: '待定', name: '待定', logoUrl: null, rank: 0 },
      };
    }
    return {
      chooser: {
        teamId: chooserSide.teamId,
        abbreviation: chooserSide.abbreviation,
        name: chooserSide.name,
        logoUrl: chooserSide.logoUrl,
        rank: chooserSide.seed,
      },
      choice: {
        teamId: choiceSide.teamId,
        abbreviation: choiceSide.abbreviation,
        name: choiceSide.name,
        logoUrl: choiceSide.logoUrl,
        rank: choiceSide.seed,
      },
    };
  }

  private choiceFrom(
    row: { teamId: string; abbreviation: string; name: string; logoUrl: string | null },
    rank: number,
  ): PlayoffChoice {
    return {
      teamId: row.teamId,
      abbreviation: row.abbreviation,
      name: row.name,
      logoUrl: row.logoUrl,
      rank,
    };
  }

  private seriesStep(league: PlayoffLeague, match: PlayoffSeriesView): PlayoffStep {
    return { kind: 'series', title: match.roundLabel, match, iso: this.seriesIso(league, match.id) };
  }

  private earliestReady(league: PlayoffLeague, matches: PlayoffSeriesView[]): PlayoffSeriesView | null {
    const ready = matches.filter((match) => match.status === 'ready');
    ready.sort((left, right) => {
      const leftDate = this.seriesIso(league, left.id);
      const rightDate = this.seriesIso(league, right.id);
      if (leftDate !== rightDate) {
        if (!leftDate) {
          return 1;
        }
        if (!rightDate) {
          return -1;
        }
        return leftDate.localeCompare(rightDate);
      }
      return matches.indexOf(left) - matches.indexOf(right);
    });
    return ready[0] ?? null;
  }

  private seriesIso(league: PlayoffLeague, seriesId: string): string {
    const slotId = PLAYOFF_DATE_ID[seriesId];
    if (!slotId) {
      return '';
    }
    return this.calendar.planFor(league).springPlayoff[slotId] ?? '';
  }

  winRate(rate: number | null): string {
    if (rate === null) {
      return '—';
    }
    return `${Math.round(rate * 100)}%`;
  }

  pairRate(wins: number, losses: number): string {
    const total = wins + losses;
    if (total === 0) {
      return '—';
    }
    return this.winRate(wins / total);
  }
}
