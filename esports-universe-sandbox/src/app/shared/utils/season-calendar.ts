const SERIES_PER_DAY = 2;
const FIRST_PLAY_OFFSET = 2;
const LAST_PLAY_OFFSET = 6;
const PLAY_DAYS_PER_WEEK = 5;
const REGULAR_WEEKS = 9;

export const SCHEDULE_YEARS = [2021, 2022, 2023, 2024, 2025, 2026] as const;

export function isScheduleYear(year: number): boolean {
  return (SCHEDULE_YEARS as readonly number[]).includes(year);
}

const LUNAR_NEW_YEAR = [
  { start: '2021-02-10', end: '2021-02-16' },
  { start: '2022-01-29', end: '2022-02-06' },
  { start: '2023-01-20', end: '2023-01-29' },
  { start: '2024-02-08', end: '2024-02-14' },
  { start: '2025-01-25', end: '2025-02-02' },
  { start: '2026-02-14', end: '2026-02-22' },
] as const;

export interface SeasonDay {
  iso: string;
  role: 'holiday' | 'rest' | 'play';
  weekIndex: number | null;
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addIsoDays(iso: string, days: number): string {
  const date = fromIsoDate(iso);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function mondayOnOrBefore(iso: string): string {
  const date = fromIsoDate(iso);
  const weekday = date.getDay();
  const back = weekday === 0 ? 6 : weekday - 1;
  date.setDate(date.getDate() - back);
  return toIsoDate(date);
}

export function isRestOffset(offsetFromMonday: number): boolean {
  return offsetFromMonday < FIRST_PLAY_OFFSET;
}

export function playDayOffset(indexInWeek: number): number {
  const slot = Math.floor(indexInWeek / SERIES_PER_DAY);
  return Math.min(LAST_PLAY_OFFSET, FIRST_PLAY_OFFSET + slot);
}

export function isLunarNewYear(iso: string): boolean {
  return LUNAR_NEW_YEAR.some((range) => iso >= range.start && iso <= range.end);
}

export function regularSeasonDays(monday: string): SeasonDay[] {
  const days: SeasonDay[] = [];
  let cursor = monday;
  let weekIndex = 0;
  let playDays = 0;
  while (weekIndex < REGULAR_WEEKS && days.length < 160) {
    const date = fromIsoDate(cursor);
    const offset = date.getDay() === 0 ? 6 : date.getDay() - 1;
    if (isLunarNewYear(cursor)) {
      days.push({ iso: cursor, role: 'holiday', weekIndex: null });
    } else if (offset < FIRST_PLAY_OFFSET) {
      days.push({ iso: cursor, role: 'rest', weekIndex: null });
    } else {
      days.push({ iso: cursor, role: 'play', weekIndex });
      playDays += 1;
      if (playDays === PLAY_DAYS_PER_WEEK) {
        weekIndex += 1;
        playDays = 0;
      }
    }
    cursor = addIsoDays(cursor, 1);
  }
  return days;
}

export function dateForWeekSlot(seasonMonday: string, weekIndex: number, indexInWeek: number): string {
  const playDayIndex = weekIndex * PLAY_DAYS_PER_WEEK + Math.floor(indexInWeek / SERIES_PER_DAY);
  const playDay = regularSeasonDays(seasonMonday).filter((day) => day.role === 'play')[playDayIndex];
  return playDay?.iso ?? addIsoDays(seasonMonday, weekIndex * 7 + playDayOffset(indexInWeek));
}

const KICKOFF_BY_LEAGUE = {
  TCL: ['下午 2:00', '下午 5:00'],
  TCS: ['晚上 7:00', '晚上 9:00'],
} as const;

export function kickoffLabel(league: 'TCS' | 'TCL', indexInWeek: number): string {
  const times = KICKOFF_BY_LEAGUE[league];
  return times[indexInWeek % times.length];
}
