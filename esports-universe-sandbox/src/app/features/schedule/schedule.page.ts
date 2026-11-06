import { Component, inject, signal } from '@angular/core';
import { SeasonClockService } from '../../core/services/season-clock.service';
import { UniverseService } from '../../core/services/universe.service';
import { YearCalendarService, type ScheduleLeague } from '../../core/services/year-calendar.service';
import { fromIsoDate, toIsoDate } from '../../shared/utils/season-calendar';
import {
  marksOn,
  planDates,
  promotionMarks,
  regularRange,
  seriesFor,
  type CalendarDayMark,
  type KnockoutKey,
  type PromotionSplit,
  type RegularKey,
  type YearPlan,
} from '../../shared/utils/year-calendar';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'] as const;

type SegmentId = RegularKey | KnockoutKey | 'springPromotion' | 'summerPromotion';

interface Segment {
  id: SegmentId;
  label: string;
  kind: 'regular' | 'playoff' | 'qualifier' | 'promotion';
}

interface SeriesRow {
  id: string;
  label: string;
  detail: string;
  date: string;
}

interface MonthCell {
  iso: string;
  label: string;
  inMonth: boolean;
  marks: CalendarDayMark[];
  tone: CalendarDayMark['tone'] | '';
  isPicked: boolean;
}

interface MonthBoard {
  key: string;
  title: string;
  cells: MonthCell[];
}

const SEGMENTS: Segment[] = [
  { id: 'springRegular', label: '春季例行賽', kind: 'regular' },
  { id: 'summerRegular', label: '夏季例行賽', kind: 'regular' },
  { id: 'springPlayoff', label: '春季季後賽', kind: 'playoff' },
  { id: 'summerPlayoff', label: '夏季季後賽', kind: 'playoff' },
  { id: 'springPromotion', label: '春季升降賽', kind: 'promotion' },
  { id: 'summerPromotion', label: '夏季升降賽', kind: 'promotion' },
  { id: 'worlds', label: '世界賽資格賽', kind: 'qualifier' },
];

@Component({
  selector: 'app-schedule-page',
  templateUrl: './schedule.page.html',
  styleUrl: './schedule.page.scss',
})
export class SchedulePage {
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly calendar = inject(YearCalendarService);

  readonly activeUniverse = this.universeService.activeUniverse;
  readonly isSupported = this.clock.isSupported;
  readonly year = this.clock.year;
  readonly weekdayLabels = WEEKDAY_LABELS;
  readonly leagues: ScheduleLeague[] = ['TCS', 'TCL'];
  readonly leagueId = signal<ScheduleLeague>('TCS');
  readonly segmentId = signal<SegmentId>('springRegular');
  readonly selectedSeriesId = signal('qf-1');

  visibleSegments(): Segment[] {
    if (this.leagueId() === 'TCL') {
      return SEGMENTS.filter((item) => item.kind !== 'qualifier');
    }
    return SEGMENTS;
  }

  segment(): Segment {
    return this.visibleSegments().find((item) => item.id === this.segmentId()) ?? this.visibleSegments()[0];
  }

  segmentNote(): string {
    if (this.segment().kind === 'regular') {
      return '點一天，這段九週一起排。週一、週二休息。撞上春節連假會標春節，比賽順延。';
    }
    return '先選一場，再點日期。同一天可以排不只一場。';
  }

  regularLabel(): string {
    const segment = this.segment();
    if (segment.kind !== 'regular') {
      return '';
    }
    const monday = this.currentPlan()[segment.id as RegularKey];
    if (!monday) {
      return '未排';
    }
    const range = regularRange(monday);
    return `${this.shortDate(range.start)} – ${this.shortDate(range.end)}`;
  }

  seriesRows(): SeriesRow[] {
    const segment = this.segment();
    if (segment.kind === 'regular') {
      return [];
    }
    const dates = this.datesFor(segment);
    return seriesFor(segment.id).map((item) => ({
      id: item.id,
      label: item.label,
      detail: item.detail,
      date: dates[item.id] ? this.shortDate(dates[item.id]) : '',
    }));
  }

  yearMonths(): MonthBoard[] {
    const plan = this.currentPlan();
    const year = this.year();
    const months = new Map<string, { year: number; month: number }>();
    for (let month = 1; month <= 12; month += 1) {
      months.set(`${year}-${month}`, { year, month });
    }
    const promotion = this.calendar.promotion();
    for (const iso of [...planDates(plan), ...Object.values(promotion.spring), ...Object.values(promotion.summer)]) {
      const date = fromIsoDate(iso);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      months.set(key, { year: date.getFullYear(), month: date.getMonth() + 1 });
    }
    return [...months.values()]
      .sort((left, right) => left.year - right.year || left.month - right.month)
      .map((item) => this.monthBoard(item.year, item.month, plan));
  }

  selectLeague(league: ScheduleLeague): void {
    this.leagueId.set(league);
    if (!this.visibleSegments().some((item) => item.id === this.segmentId())) {
      this.segmentId.set('springRegular');
    }
  }

  selectSegment(id: SegmentId): void {
    this.segmentId.set(id);
    const rows = this.seriesRows();
    const open = rows.find((row) => !row.date) ?? rows[0];
    this.selectedSeriesId.set(open?.id ?? '');
  }

  selectSeries(seriesId: string): void {
    this.selectedSeriesId.set(seriesId);
  }

  pickDay(iso: string): void {
    const segment = this.segment();
    if (segment.kind === 'regular') {
      this.calendar.setRegular(this.leagueId(), segment.id as RegularKey, iso);
      return;
    }
    const seriesId = this.selectedSeriesId();
    if (!seriesId) {
      return;
    }
    if (segment.kind === 'promotion') {
      this.calendar.setPromotionDate(this.promotionSplit(segment.id), seriesId, iso);
    } else {
      this.calendar.setSeriesDate(this.leagueId(), segment.id as KnockoutKey, seriesId, iso);
    }
    const next = this.seriesRows().find((row) => !row.date);
    if (next) {
      this.selectedSeriesId.set(next.id);
    }
  }

  clearRegular(): void {
    const segment = this.segment();
    if (segment.kind !== 'regular') {
      return;
    }
    this.calendar.clearRegular(this.leagueId(), segment.id as RegularKey);
  }

  dayTitle(marks: CalendarDayMark[]): string | null {
    if (marks.length === 0) {
      return null;
    }
    return marks.map((mark) => mark.detail).join('、');
  }

  clearSeries(seriesId: string): void {
    const segment = this.segment();
    if (segment.kind === 'regular') {
      return;
    }
    if (segment.kind === 'promotion') {
      this.calendar.clearPromotion(this.promotionSplit(segment.id), seriesId);
    } else {
      this.calendar.clearSeries(this.leagueId(), segment.id as KnockoutKey, seriesId);
    }
    this.selectedSeriesId.set(seriesId);
  }

  private monthBoard(year: number, month: number, plan: YearPlan): MonthBoard {
    const first = new Date(year, month - 1, 1);
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(year, month, 0).getDate();
    const cells: MonthCell[] = [];
    for (let index = 0; index < lead; index += 1) {
      cells.push(this.cell(new Date(year, month - 1, 1 - (lead - index)), false, plan));
    }
    for (let day = 1; day <= count; day += 1) {
      cells.push(this.cell(new Date(year, month - 1, day), true, plan));
    }
    while (cells.length % 7 !== 0) {
      const last = fromIsoDate(cells[cells.length - 1].iso);
      last.setDate(last.getDate() + 1);
      cells.push(this.cell(last, false, plan));
    }
    return { key: `${year}-${month}`, title: `${year} / ${month}`, cells };
  }

  private cell(date: Date, inMonth: boolean, plan: YearPlan): MonthCell {
    const iso = toIsoDate(date);
    const marks = promotionMarks(marksOn(plan, iso), this.calendar.promotion(), iso);
    return {
      iso,
      label: String(date.getDate()),
      inMonth,
      marks,
      tone: this.toneOf(marks),
      isPicked: this.pickedDate() === iso,
    };
  }

  private toneOf(marks: CalendarDayMark[]): MonthCell['tone'] {
    const order: MonthCell['tone'][] = ['holiday', 'promotion', 'playoff', 'qualifier', 'spring', 'summer', 'rest'];
    return order.find((tone) => marks.some((mark) => mark.tone === tone)) ?? '';
  }

  private pickedDate(): string {
    const segment = this.segment();
    if (segment.kind === 'regular') {
      return '';
    }
    return this.datesFor(segment)[this.selectedSeriesId()] ?? '';
  }

  private datesFor(segment: Segment): Record<string, string> {
    if (segment.kind === 'promotion') {
      return this.calendar.promotion()[this.promotionSplit(segment.id)];
    }
    if (segment.kind === 'regular') {
      return {};
    }
    return this.currentPlan()[segment.id as KnockoutKey];
  }

  private promotionSplit(id: SegmentId): PromotionSplit {
    return id === 'summerPromotion' ? 'summer' : 'spring';
  }

  private currentPlan(): YearPlan {
    return this.calendar.planFor(this.leagueId());
  }

  private shortDate(iso: string): string {
    const date = fromIsoDate(iso);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  }
}
