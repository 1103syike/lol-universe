import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RegularSeasonService, type RegularMatchView } from '../../core/services/regular-season.service';
import { YearCalendarService } from '../../core/services/year-calendar.service';
import { SeasonClockService } from '../../core/services/season-clock.service';
import { UniverseService } from '../../core/services/universe.service';
import { LEAGUE_TIERS, type LeagueTier } from '../../core/models/league.model';
import { TeamLogoComponent } from '../../shared/ui/team-logo/team-logo.component';
import { dateForWeekSlot, fromIsoDate, kickoffLabel } from '../../shared/utils/season-calendar';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

interface CalendarDay {
  iso: string;
  weekday: string;
  label: string;
  kickoff: string;
  isRest: boolean;
  matches: RegularMatchView[];
}

interface FixtureGroup {
  title: string;
  matches: RegularMatchView[];
}

const ROUNDS_PER_WEEK = 2;

@Component({
  selector: 'app-match-day-page',
  imports: [NgTemplateOutlet, RouterLink, TeamLogoComponent],
  templateUrl: './match-day.page.html',
  styleUrl: './match-day.page.scss',
})
export class MatchDayPage {
  private readonly universeService = inject(UniverseService);
  private readonly season = inject(RegularSeasonService);
  private readonly calendar = inject(YearCalendarService);
  private readonly clock = inject(SeasonClockService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly clockLabel = this.clock.label;
  readonly isSupported = this.clock.isSupported;
  readonly year = this.clock.year;
  readonly standings = this.season.standings;
  readonly playedCount = this.season.playedCount;
  readonly matchCount = computed(() => this.season.matches().length);
  readonly roundCount = this.season.roundCount;
  readonly bubble = this.season.bubble;
  readonly rosterNotice = this.season.rosterNotice;
  readonly playoffSpots = this.season.playoffSpots;
  readonly hasEnoughTeams = this.season.hasEnoughTeams;
  readonly playoffLocked = computed(() => {
    const league = this.season.league();
    return (league === 'TCS' || league === 'TCL') && this.season.isPlayoffLocked(league);
  });
  readonly weekNumber = signal(1);
  readonly leagues = LEAGUE_TIERS;
  readonly selectedLeague = this.season.league;

  constructor() {
    effect(() => {
      const universeId = this.universeService.activeUniverseId();
      if (!universeId) {
        return;
      }
      untracked(() => this.weekNumber.set(this.weekOf(this.season.firstIncompleteRound())));
    });
  }

  selectLeague(league: LeagueTier): void {
    this.season.setLeague(league);
    this.weekNumber.set(this.weekOf(this.season.firstIncompleteRound()));
  }

  hasSpringSchedule(): boolean {
    const league = this.selectedLeague();
    if (league !== 'TCS' && league !== 'TCL') {
      return true;
    }
    return Boolean(this.calendar.springMonday(league));
  }

  otherLeagueNote(): string {
    const league = this.selectedLeague();
    const count = (this.activeUniverse()?.teams ?? []).filter((team) => team.leagueTier === league).length;
    return `${league} 從 2023 才建立。現在有 ${count} 支隊伍。`;
  }

  weekCount(): number {
    return Math.ceil(this.roundCount() / ROUNDS_PER_WEEK);
  }

  weekIndexes(): number[] {
    return Array.from({ length: this.weekCount() }, (_, index) => index + 1);
  }

  roundsInWeek(): number[] {
    return this.roundsFor(this.weekNumber());
  }

  matchesInRound(round: number) {
    return this.season.matchesInRound(round);
  }

  fixtureGroups(): FixtureGroup[] {
    const start = this.season.seasonStart();
    if (!start) {
      return this.roundsInWeek().map((round) => ({
        title: `第 ${round} 輪`,
        matches: this.matchesInRound(round),
      }));
    }
    return this.daysForWeek(start, this.weekNumber())
      .filter((day) => day.matches.length > 0)
      .map((day) => ({
        title: `週${day.weekday} ${day.label} · ${day.kickoff}`,
        matches: day.matches,
      }));
  }

  showWeek(week: number): void {
    this.weekNumber.set(week);
  }

  weekState(week: number): 'current' | 'done' | 'open' {
    if (week === this.weekNumber()) {
      return 'current';
    }
    const matches = this.roundsFor(week).flatMap((round) => this.season.matchesInRound(round));
    if (matches.length > 0 && matches.every((match) => match.status === 'done')) {
      return 'done';
    }
    return 'open';
  }

  scoreText(games: number | null): string {
    return games === null ? '–' : String(games);
  }

  winRateLabel(rate: number | null): string {
    if (rate === null) {
      return '—';
    }
    return `${Math.round(rate * 100)}%`;
  }

  private daysForWeek(seasonMonday: string, week: number): CalendarDay[] {
    const weekIndex = week - 1;
    const league = this.selectedLeague() === 'TCL' ? 'TCL' : 'TCS';
    const matches = this.roundsFor(week).flatMap((round) => this.matchesInRound(round));
    const grouped = new Map<string, RegularMatchView[]>();
    matches.forEach((match, index) => {
      const iso = dateForWeekSlot(seasonMonday, weekIndex, index);
      const key = `${iso}|${index % 2}`;
      const dayMatches = grouped.get(key) ?? [];
      dayMatches.push(match);
      grouped.set(key, dayMatches);
    });
    return [...grouped.entries()].map(([key, dayMatches]) => {
      const iso = key.slice(0, 10);
      const slot = Number(key.slice(11));
      const date = fromIsoDate(iso);
      return {
        iso,
        weekday: WEEKDAY_LABELS[(date.getDay() + 6) % 7],
        label: this.shortDate(iso),
        kickoff: kickoffLabel(league, slot),
        isRest: false,
        matches: dayMatches,
      };
    });
  }

  private shortDate(iso: string): string {
    const date = fromIsoDate(iso);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  private weekOf(round: number): number {
    return Math.max(1, Math.ceil(round / ROUNDS_PER_WEEK));
  }

  private roundsFor(week: number): number[] {
    const first = (week - 1) * ROUNDS_PER_WEEK + 1;
    return [first, first + 1].filter((round) => round <= this.roundCount());
  }

  teamNames(teams: { abbreviation: string }[]): string {
    return teams.map((team) => team.abbreviation).join('、');
  }

  previousWeek(): void {
    this.weekNumber.update((week) => Math.max(1, week - 1));
  }

  nextWeek(): void {
    this.weekNumber.update((week) => Math.min(this.weekCount(), week + 1));
  }

  playoffRoute(): string {
    return this.selectedLeague() === 'TCL' ? '/leagues/tcl-single' : '/leagues/tcs-single';
  }

}
