import { NgTemplateOutlet } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PlayoffSeriesView } from '../../core/models/playoff-board.model';
import type { SlateMatch } from '../../core/services/match-board.service';
import { MatchBoardService } from '../../core/services/match-board.service';
import { PlayoffBoardService, type PlayoffLeague } from '../../core/services/playoff-board.service';
import { RegularSeasonService, type RegularStanding } from '../../core/services/regular-season.service';
import { SeasonClockService } from '../../core/services/season-clock.service';
import { UniverseService } from '../../core/services/universe.service';
import { YearCalendarService } from '../../core/services/year-calendar.service';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { kickoffLabel } from '../../shared/utils/season-calendar';

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

interface PlayoffPickCard {
  league: PlayoffLeague;
  done: boolean;
  step: PlayoffStep | null;
  summary: string;
}

type DashboardPost =
  | { kind: 'bubble'; league: PlayoffLeague; sides: RegularStanding[] }
  | { kind: 'locks'; rows: { league: PlayoffLeague; seeds: RegularStanding[] }[] }
  | { kind: 'picks'; title: string; cards: PlayoffPickCard[] }
  | { kind: 'series'; item: PlayoffQueueItem }
  | { kind: 'champions'; names: { league: PlayoffLeague; winner: string }[] };

@Component({
  selector: 'app-dashboard-page',
  imports: [NgTemplateOutlet, RouterLink, TeamLogoComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly slate = inject(MatchBoardService);
  private readonly season = inject(RegularSeasonService);
  private readonly playoff = inject(PlayoffBoardService);
  private readonly calendar = inject(YearCalendarService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly clockLabel = this.clock.label;
  readonly board = this.slate.board;

  roster(teamId: string) {
    return this.slate.roster(teamId);
  }

  rosterLines(teamId: string) {
    return this.slate.rosterLines(teamId);
  }

  dateText(iso: string): string {
    return this.slate.dateText(iso);
  }

  shortDate(iso: string): string {
    return this.slate.shortDate(iso);
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

  playGame(match: SlateMatch, teamId: string): void {
    if (this.missingLeagues().length > 0 || !this.canScore(match)) {
      return;
    }
    this.slate.playGame(match, teamId);
    this.advanceToNextEvent();
  }

  gateLeagues(): Array<'TCS' | 'TCL'> {
    return (['TCS', 'TCL'] as const).filter((league) => this.gateFor(league) !== 'incomplete');
  }

  postScene(): DashboardPost | null {
    const open = (['TCL', 'TCS'] as const).filter((league) => this.gateFor(league) !== 'incomplete');
    if (open.length === 0) {
      return null;
    }
    const bubble = open.find((league) => this.gateFor(league) === 'bubble');
    if (bubble) {
      return { kind: 'bubble', league: bubble, sides: this.bubbleSides(bubble) };
    }
    const locks = open.filter((league) => this.gateFor(league) === 'ready');
    if (locks.length > 0) {
      return { kind: 'locks', rows: locks.map((league) => ({ league, seeds: this.playoffSeeds(league) })) };
    }
    const playing = open.filter((league) => this.gateFor(league) === 'playoff');
    if (playing.length === 0) {
      return null;
    }
    const roundCards = this.pickCards(playing, 'round');
    if (roundCards.some((card) => !card.done)) {
      return { kind: 'picks', title: '兩邊都選完，才開打首輪', cards: roundCards };
    }
    const roundLeft = this.playoffQueue().find((item) => item.match.id === 'r1-high' || item.match.id === 'r1-low');
    if (roundLeft) {
      return { kind: 'series', item: roundLeft };
    }
    if (playing.some((league) => !this.roundOneDone(league))) {
      return { kind: 'picks', title: '等首輪打完', cards: [] };
    }
    const semiCards = this.pickCards(playing, 'semi');
    if (semiCards.some((card) => !card.done)) {
      return { kind: 'picks', title: '兩邊都選完，才開打四強', cards: semiCards };
    }
    const next = this.playoffQueue()[0];
    if (next) {
      return { kind: 'series', item: next };
    }
    return { kind: 'champions', names: playing.map((league) => ({ league, winner: this.championName(league) })) };
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
        title: '第 3 名選擇首輪對手',
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
      return { kind: 'pick', title: '首輪還在等對陣', choices: [] };
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
        title: '第 1 名選擇四強對手',
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
    return winner ? { kind: 'done', title: '春季季後賽冠軍', winner } : { kind: 'pick', title: '等前一輪打完', choices: [] };
  }

  playoffUpcoming(): { league: PlayoffLeague; label: string; when: string }[] {
    return this.playoffQueue()
      .slice(1, 6)
      .map((item) => ({
        league: item.league,
        label: `${item.match.left?.abbreviation ?? '待定'} 對 ${item.match.right?.abbreviation ?? '待定'}`,
        when: `${item.kickoff}${item.iso ? ` ${this.shortDate(item.iso)}` : ''}`,
      }));
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

  playPlayoff(league: PlayoffLeague, match: PlayoffSeriesView, teamId: string): void {
    const head = this.playoffQueue()[0];
    if (!head || head.league !== league || head.match.id !== match.id) {
      return;
    }
    if (!this.canScorePlayoff(head.iso) || match.left?.games === 3 || match.right?.games === 3) {
      return;
    }
    this.playoff.addGame(league, match.id, teamId);
    this.advanceToNextEvent();
  }

  private advanceToNextEvent(): void {
    const today = this.board().today;
    if (!today) {
      return;
    }
    const next = [this.board().current?.iso ?? '', this.playoffQueue()[0]?.iso ?? '']
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

  private pickCards(leagues: PlayoffLeague[], pick: 'round' | 'semi'): PlayoffPickCard[] {
    return leagues.map((league) => {
      const bundle = this.playoff.bundle(league);
      const done = pick === 'round' ? Boolean(bundle.progress.roundOneOpponentId) : Boolean(bundle.progress.semiOpponentId);
      return {
        league,
        done,
        step: done ? null : this.playoffStep(league),
        summary: done ? this.matchupSummary(bundle.series, pick) : '',
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

  private matchupSummary(series: PlayoffSeriesView[], pick: 'round' | 'semi'): string {
    const slots = pick === 'round' ? series.slice(0, 2) : series.slice(2, 4);
    return slots
      .map((match) => `${match.left?.abbreviation ?? '待定'} 對 ${match.right?.abbreviation ?? '待定'}`)
      .join('，');
  }

  private championName(league: PlayoffLeague): string {
    const final = this.playoff.bundle(league).series[4];
    if (final?.left?.isWinner) {
      return final.left.abbreviation;
    }
    if (final?.right?.isWinner) {
      return final.right.abbreviation;
    }
    return '還沒產生';
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
}
