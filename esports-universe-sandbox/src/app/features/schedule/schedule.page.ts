import { Component, DestroyRef, inject, signal } from '@angular/core';
import type { PlayoffSeriesView } from '../../core/models/playoff-board.model';
import { MsiBoardService, type MsiMatchView } from '../../core/services/msi-board.service';
import { PlayoffBoardService, type PlayoffLeague } from '../../core/services/playoff-board.service';
import { PromotionBoardService } from '../../core/services/promotion-board.service';
import { RegularSeasonService } from '../../core/services/regular-season.service';
import { SeasonClockService } from '../../core/services/season-clock.service';
import { UniverseService } from '../../core/services/universe.service';
import { YearCalendarService, type ScheduleLeague } from '../../core/services/year-calendar.service';
import { bindPageScene } from '../../shared/utils/bind-page-scene';
import { internationalMarks } from '../../shared/utils/international-events';
import { dateForWeekSlot, fromIsoDate, isScheduleYear, SCHEDULE_YEARS, toIsoDate } from '../../shared/utils/season-calendar';
import { marksOn, promotionMarks, type CalendarDayMark } from '../../shared/utils/year-calendar';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

const BOARD_SERIES_OF_SLOT: Record<string, string> = {
  'qf-1': 'r1-high',
  'qf-2': 'r1-low',
  'sf-1': 'sf-1',
  'sf-2': 'sf-2',
  final: 'final',
};

interface ScoreSide {
  name: string;
  score: number;
  won: boolean;
}

interface ShownMark extends CalendarDayMark {
  league: '' | ScheduleLeague;
  matchup: string;
  sides?: [ScoreSide, ScoreSide];
}

interface MonthCell {
  iso: string;
  label: string;
  inMonth: boolean;
  marks: ShownMark[];
  tone: CalendarDayMark['tone'] | '';
  shade: '' | ScheduleLeague;
}

interface MonthBoard {
  key: string;
  title: string;
  cells: MonthCell[];
}

@Component({
  selector: 'app-schedule-page',
  templateUrl: './schedule.page.html',
  styleUrl: './schedule.page.scss',
})
export class SchedulePage {
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly calendar = inject(YearCalendarService);
  private readonly season = inject(RegularSeasonService);
  private readonly playoff = inject(PlayoffBoardService);
  private readonly promotion = inject(PromotionBoardService);
  private readonly msi = inject(MsiBoardService);

  constructor() {
    bindPageScene(inject(DestroyRef), 'schedule', '日程');
  }

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly scheduleYears = SCHEDULE_YEARS;
  readonly weekdayLabels = WEEKDAY_LABELS;
  private readonly chosenYear = signal<number | null>(null);
  private readonly monthCursor = signal<{ year: number; month: number } | null>(null);

  viewYear(): number {
    const chosen = this.chosenYear();
    if (chosen !== null && isScheduleYear(chosen)) {
      return chosen;
    }
    const current = this.clock.year();
    return isScheduleYear(current) ? current : SCHEDULE_YEARS[0];
  }

  selectYear(year: number): void {
    const month = this.monthCursor()?.month ?? 1;
    this.chosenYear.set(year);
    this.monthCursor.set({ year, month });
  }

  shownMonth(): MonthBoard {
    const cursor = this.monthCursor();
    if (cursor && isScheduleYear(cursor.year)) {
      return this.monthBoard(cursor.year, cursor.month);
    }
    const today = this.activeUniverse()?.currentDate ?? '';
    const month = Number(today.slice(5, 7));
    if (month >= 1 && month <= 12) {
      return this.monthBoard(this.yearOf(today), month);
    }
    return this.monthBoard(this.viewYear(), 1);
  }

  shiftMonth(step: -1 | 1): void {
    const [titleYear, titleMonth] = this.shownMonth().title.split(' / ').map(Number);
    const date = new Date(titleYear, titleMonth - 1 + step, 1);
    this.followMonth(date.getFullYear(), date.getMonth() + 1);
  }

  dayTitle(marks: CalendarDayMark[]): string | null {
    if (marks.length === 0) {
      return null;
    }
    return marks.map((mark) => mark.detail).join('、');
  }

  private monthBoard(year: number, month: number): MonthBoard {
    const fixtures = this.springFixtures();
    const first = new Date(year, month - 1, 1);
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(year, month, 0).getDate();
    const cells: MonthCell[] = [];
    for (let index = 0; index < lead; index += 1) {
      cells.push(this.cell(new Date(year, month - 1, 1 - (lead - index)), false, fixtures));
    }
    for (let day = 1; day <= count; day += 1) {
      cells.push(this.cell(new Date(year, month - 1, day), true, fixtures));
    }
    while (cells.length % 7 !== 0) {
      const last = fromIsoDate(cells[cells.length - 1].iso);
      last.setDate(last.getDate() + 1);
      cells.push(this.cell(last, false, fixtures));
    }
    return { key: `${year}-${month}`, title: `${year} / ${month}`, cells };
  }

  private cell(date: Date, inMonth: boolean, fixtures: Map<string, ShownMark[]>): MonthCell {
    const iso = toIsoDate(date);
    const marks = this.dayMarks(iso, fixtures);
    return {
      iso,
      label: String(date.getDate()),
      inMonth,
      marks,
      tone: this.toneOf(marks),
      shade: this.shadeOf(marks),
    };
  }

  private shadeOf(marks: ShownMark[]): '' | ScheduleLeague {
    const leagues = [...new Set(marks.map((mark) => mark.league).filter((league) => league !== ''))];
    return leagues.length === 1 ? leagues[0] : '';
  }

  private toneOf(marks: CalendarDayMark[]): MonthCell['tone'] {
    const order: MonthCell['tone'][] = ['holiday', 'promotion', 'playoff', 'qualifier', 'spring', 'summer', 'event', 'rest'];
    return order.find((tone) => marks.some((mark) => mark.tone === tone)) ?? '';
  }

  private followMonth(year: number, month: number): void {
    if (!isScheduleYear(year)) {
      return;
    }
    this.monthCursor.set({ year, month });
    if (year !== this.viewYear()) {
      this.chosenYear.set(year);
    }
  }

  private yearOf(iso: string): number {
    const year = Number(iso.slice(0, 4));
    return isScheduleYear(year) ? year : this.viewYear();
  }

  private springFixtures(): Map<string, ShownMark[]> {
    const marks = new Map<string, ShownMark[]>();
    for (const league of ['TCS', 'TCL'] as const) {
      const matches = this.season.fixturesFor(league);
      const byWeek = new Map<number, typeof matches>();
      for (const match of matches) {
        const weekIndex = Math.floor((match.round - 1) / 2);
        const mates = byWeek.get(weekIndex) ?? [];
        mates.push(match);
        byWeek.set(weekIndex, mates);
      }
      for (const year of SCHEDULE_YEARS) {
        const monday = this.calendar.planForYear(league, year).springRegular;
        if (!monday) {
          continue;
        }
        for (const [weekIndex, mates] of byWeek) {
          mates.forEach((match, indexInWeek) => {
            const iso = dateForWeekSlot(monday, weekIndex, indexInWeek);
            const slot = `W${weekIndex + 1} D${Math.floor(indexInWeek / 2) + 1}`;
            const key = `${league}:${iso}`;
            const cards = marks.get(key) ?? [];
            let matchup = '';
            let sides: [ScoreSide, ScoreSide] | undefined;
            if (year === this.clock.year()) {
              matchup = `${match.homeAbbreviation} vs ${match.awayAbbreviation}`;
              if (match.status === 'done' && match.homeGames !== null && match.awayGames !== null) {
                const homeGames = match.homeGames;
                const awayGames = match.awayGames;
                matchup = `${match.homeAbbreviation} ${homeGames}:${awayGames} ${match.awayAbbreviation}`;
                sides = [
                  { name: match.homeAbbreviation, score: homeGames, won: homeGames > awayGames },
                  { name: match.awayAbbreviation, score: awayGames, won: awayGames > homeGames },
                ];
              }
            }
            cards.push({
              label: `春例 ${slot}`,
              matchup,
              detail: `${league} 春季例行賽 ${slot} ${matchup}`,
              tone: 'spring',
              league,
              sides,
            });
            marks.set(key, cards);
          });
        }
      }
    }
    return marks;
  }

  private dayMarks(iso: string, fixtures: Map<string, ShownMark[]>): ShownMark[] {
    const year = this.yearOf(iso);
    const marks: ShownMark[] = [];
    let hasRest = false;
    let holiday: ShownMark | null = null;
    for (const league of ['TCS', 'TCL'] as const) {
      for (const mark of marksOn(this.calendar.planForYear(league, year), iso, year, league)) {
        if (mark.tone === 'holiday') {
          holiday = { ...mark, label: '春節', league: '', matchup: '' };
          continue;
        }
        if (mark.tone === 'rest') {
          hasRest = true;
          continue;
        }
        if (mark.label === '春例') {
          const cards = fixtures.get(`${league}:${iso}`) ?? [];
          if (cards.length > 0) {
            marks.push(...cards);
            continue;
          }
        }
        if (mark.tone === 'playoff') {
          marks.push(this.seriesMark(mark, league, this.playoffOn(league, iso, year)));
          continue;
        }
        marks.push({ ...mark, league, matchup: '' });
      }
    }
    if (holiday) {
      marks.unshift(holiday);
    } else if (hasRest) {
      marks.unshift({ label: '休', detail: '休息', tone: 'rest', league: '', matchup: '' });
    }
    for (const mark of promotionMarks([], this.calendar.promotionFor(year), iso, year)) {
      marks.push(this.seriesMark(mark, '', this.promotionOn(iso, year)));
    }
    const msiMarks = this.msiMarks(iso);
    marks.push(...msiMarks);
    for (const mark of internationalMarks(year, iso)) {
      if (mark.label === 'MSI') {
        continue;
      }
      marks.push({ ...mark, league: '', matchup: '' });
    }
    return marks;
  }

  private msiMarks(iso: string): ShownMark[] {
    return this.msi.onDate(iso).map((match) => this.msiMark(match));
  }

  private msiMark(match: MsiMatchView): ShownMark {
    const left = match.left?.abbreviation || '待定';
    const right = match.right?.abbreviation || '待定';
    const leftName = match.left?.name || left;
    const rightName = match.right?.name || right;
    let matchup = `${left} vs ${right}`;
    let sides: [ScoreSide, ScoreSide] | undefined;
    if (match.done) {
      matchup = `${left} ${match.leftGames}:${match.rightGames} ${right}`;
      sides = [
        { name: left, score: match.leftGames, won: match.leftGames > match.rightGames },
        { name: right, score: match.rightGames, won: match.rightGames > match.leftGames },
      ];
    }
    return {
      label: this.msiChip(match),
      matchup,
      detail: `MSI ${match.stage} ${match.label} ${leftName} vs ${rightName}`,
      tone: 'event',
      league: '',
      sides,
    };
  }

  private msiChip(match: MsiMatchView): string {
    if (match.stage === '亂鬥賽') {
      return `亂鬥 ${match.label}`;
    }
    if (match.label) {
      return match.label;
    }
    return 'MSI';
  }

  private playoffOn(league: PlayoffLeague, iso: string, year: number): PlayoffSeriesView | null {
    if (year !== this.clock.year()) {
      return null;
    }
    const dates = this.calendar.planForYear(league, year).springPlayoff;
    const slotId = Object.entries(dates).find(([, date]) => date === iso)?.[0];
    if (!slotId) {
      return null;
    }
    const seriesId = BOARD_SERIES_OF_SLOT[slotId] ?? slotId;
    return this.playoff.bundle(league).series.find((item) => item.id === seriesId) ?? null;
  }

  private promotionOn(iso: string, year: number): PlayoffSeriesView | null {
    if (year !== this.clock.year()) {
      return null;
    }
    const plan = this.calendar.promotionFor(year);
    for (const split of ['spring', 'summer'] as const) {
      const slotId = Object.entries(plan[split]).find(([, date]) => date === iso)?.[0];
      if (!slotId) {
        continue;
      }
      const series = this.promotion.bracket(split).find((item) => item.id === slotId);
      if (series) {
        return series;
      }
    }
    return null;
  }

  private seriesMark(mark: CalendarDayMark, league: ShownMark['league'], series: PlayoffSeriesView | null): ShownMark {
    const base: ShownMark = { ...mark, league, matchup: '' };
    if (!series?.left || !series.right) {
      return base;
    }
    const left = series.left;
    const right = series.right;
    const leftGames = left.games ?? 0;
    const rightGames = right.games ?? 0;
    const played = series.status === 'done' || leftGames + rightGames > 0;
    const names = `${left.abbreviation} vs ${right.abbreviation}`;
    const score = `${left.abbreviation} ${leftGames}:${rightGames} ${right.abbreviation}`;
    if (series.status !== 'done') {
      return {
        ...base,
        matchup: played ? score : names,
        detail: `${mark.detail} ${played ? score : names}`,
      };
    }
    return {
      ...base,
      matchup: score,
      detail: `${mark.detail} ${left.name} ${leftGames}:${rightGames} ${right.name}`,
      sides: [
        { name: left.abbreviation, score: leftGames, won: left.isWinner },
        { name: right.abbreviation, score: rightGames, won: right.isWinner },
      ],
    };
  }
}
