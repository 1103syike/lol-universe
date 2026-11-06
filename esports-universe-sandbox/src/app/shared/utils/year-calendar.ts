import { isLunarNewYear, regularSeasonDays } from './season-calendar';

export type RegularKey = 'springRegular' | 'summerRegular';
export type KnockoutKey = 'springPlayoff' | 'summerPlayoff' | 'worlds';

export interface SeriesSlot {
  id: string;
  label: string;
  detail: string;
}

export interface YearPlan {
  springRegular: string | null;
  summerRegular: string | null;
  springPlayoff: Record<string, string>;
  summerPlayoff: Record<string, string>;
  worlds: Record<string, string>;
}

export interface CalendarDayMark {
  label: string;
  detail: string;
  tone: 'rest' | 'spring' | 'summer' | 'playoff' | 'qualifier' | 'holiday' | 'promotion';
}

export const PLAYOFF_SERIES: SeriesSlot[] = [
  { id: 'qf-1', label: '首輪A', detail: '第 3 名選擇的對手' },
  { id: 'qf-2', label: '首輪B', detail: '第 4 名對剩下的隊伍' },
  { id: 'sf-1', label: '次輪A', detail: '第 1 名選擇的勝者' },
  { id: 'sf-2', label: '次輪B', detail: '第 2 名對剩下的勝者' },
  { id: 'final', label: '決賽', detail: '總決賽' },
];

export const WORLDS_SERIES: SeriesSlot[] = [
  { id: 'gauntlet-65', label: '6v5', detail: '第 6 名對第 5 名' },
  { id: 'gauntlet-4', label: '對4', detail: '勝者對第 4 名' },
  { id: 'gauntlet-3', label: '對3', detail: '勝者對第 3 名' },
];

export const PROMOTION_SERIES: SeriesSlot[] = [
  { id: 'promo-1', label: '升降1', detail: 'TCL 第 1 名選擇的 TCS' },
  { id: 'promo-2', label: '升降2', detail: 'TCL 第 2 名對剩下的 TCS' },
];

export type PromotionSplit = 'spring' | 'summer';

export interface PromotionPlan {
  spring: Record<string, string>;
  summer: Record<string, string>;
}

export function emptyYearPlan(): YearPlan {
  return {
    springRegular: null,
    summerRegular: null,
    springPlayoff: {},
    summerPlayoff: {},
    worlds: {},
  };
}

export function emptyPromotion(): PromotionPlan {
  return { spring: {}, summer: {} };
}

export function seriesFor(key: string): SeriesSlot[] {
  if (key === 'worlds') {
    return WORLDS_SERIES;
  }
  if (key === 'springPromotion' || key === 'summerPromotion') {
    return PROMOTION_SERIES;
  }
  if (key === 'springPlayoff' || key === 'summerPlayoff') {
    return PLAYOFF_SERIES;
  }
  return [];
}

export function promotionMarks(marks: CalendarDayMark[], promotion: PromotionPlan, iso: string): CalendarDayMark[] {
  pushSeries(marks, promotion.spring, PROMOTION_SERIES, iso, 'promotion', '春季升降賽');
  pushSeries(marks, promotion.summer, PROMOTION_SERIES, iso, 'promotion', '夏季升降賽');
  return marks;
}

export function regularRange(monday: string): { start: string; end: string } {
  const days = regularSeasonDays(monday);
  return { start: days[0]?.iso ?? monday, end: days[days.length - 1]?.iso ?? monday };
}

export function marksOn(plan: YearPlan, iso: string): CalendarDayMark[] {
  const marks: CalendarDayMark[] = [];
  pushRegular(marks, plan.springRegular, iso, '春例', '春季例行賽', 'spring');
  pushRegular(marks, plan.summerRegular, iso, '夏例', '夏季例行賽', 'summer');
  pushSeries(marks, plan.springPlayoff, PLAYOFF_SERIES, iso, 'playoff', '春季季後賽');
  pushSeries(marks, plan.summerPlayoff, PLAYOFF_SERIES, iso, 'playoff', '夏季季後賽');
  pushSeries(marks, plan.worlds, WORLDS_SERIES, iso, 'qualifier', '世界賽資格賽');
  if (isLunarNewYear(iso) && !marks.some((mark) => mark.label === '春節')) {
    marks.push({ label: '春節', detail: '春節連假', tone: 'holiday' });
  }
  return marks;
}

export function planDates(plan: YearPlan): string[] {
  const dates: string[] = [];
  for (const monday of [plan.springRegular, plan.summerRegular]) {
    if (!monday) {
      continue;
    }
    const range = regularRange(monday);
    dates.push(range.start, range.end);
  }
  dates.push(...Object.values(plan.springPlayoff), ...Object.values(plan.summerPlayoff), ...Object.values(plan.worlds));
  return dates.filter((iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso));
}

function pushRegular(
  marks: CalendarDayMark[],
  monday: string | null,
  iso: string,
  label: string,
  detail: string,
  tone: 'spring' | 'summer',
): void {
  if (!monday) {
    return;
  }
  const day = regularSeasonDays(monday).find((item) => item.iso === iso);
  if (!day) {
    return;
  }
  if (day.role === 'holiday') {
    if (!marks.some((mark) => mark.label === '春節')) {
      marks.push({ label: '春節', detail: `${detail} 順延`, tone: 'holiday' });
    }
    return;
  }
  if (day.role === 'rest') {
    if (!marks.some((mark) => mark.label === '休' || mark.label === '春節')) {
      marks.push({ label: '休', detail: `${detail} 休息`, tone: 'rest' });
    }
    return;
  }
  marks.push({ label, detail, tone });
}

function pushSeries(
  marks: CalendarDayMark[],
  dates: Record<string, string>,
  series: SeriesSlot[],
  iso: string,
  tone: CalendarDayMark['tone'],
  prefix: string,
): void {
  for (const item of series) {
    if (dates[item.id] === iso) {
      marks.push({ label: item.label, detail: `${prefix} ${item.detail}`, tone });
    }
  }
}
