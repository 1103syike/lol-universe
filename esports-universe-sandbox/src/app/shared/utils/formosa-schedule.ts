export interface FormosaCalendarDay {
  iso: string;
  label: string;
  detail: string;
}

const GROUP_PAIR = { label: '分組', detail: '兩場 BO3' };
const GROUP_LAST = { label: '分組', detail: '一場 BO3' };
const SUPER = { label: '超級週', detail: '同種子 BO5' };

function days(dates: readonly string[], mark: { label: string; detail: string }): FormosaCalendarDay[] {
  return dates.map((iso) => ({ iso, label: mark.label, detail: mark.detail }));
}

const FORMOSA_2025_DAYS: FormosaCalendarDay[] = [
  ...days(['2025-01-15', '2025-01-16', '2025-01-17', '2025-01-18', '2025-01-19'], GROUP_PAIR),
  ...days(['2025-01-22', '2025-01-23', '2025-01-24', '2025-01-25', '2025-01-26'], GROUP_PAIR),
  ...days(['2025-01-31', '2025-02-01'], GROUP_PAIR),
  { iso: '2025-02-02', label: GROUP_LAST.label, detail: GROUP_LAST.detail },
];

const FORMOSA_2026_DAYS: FormosaCalendarDay[] = [
  ...days(['2026-01-14', '2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18'], GROUP_PAIR),
  ...days(['2026-01-21', '2026-01-22', '2026-01-23', '2026-01-24', '2026-01-25'], GROUP_PAIR),
  ...days(['2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31', '2026-02-01'], SUPER),
];

const FORMOSA_2025_DATES: Record<string, string> = {
  gb: '2025-01-15',
  'pi-1': '2025-02-07',
  'pi-2': '2025-02-07',
  'pi-3': '2025-02-08',
  'pi-4': '2025-02-08',
  'pi-f': '2025-02-09',
  'po-1': '2025-02-12',
  'po-2': '2025-02-13',
  'po-3': '2025-02-15',
  'po-4': '2025-02-16',
  'po-wf': '2025-02-19',
  'po-lb': '2025-02-20',
  'po-lf': '2025-02-22',
  'po-gf': '2025-02-23',
};

const FORMOSA_2026_DATES: Record<string, string> = {
  gb: '2026-01-14',
  'pi-1': '2026-02-06',
  'pi-2': '2026-02-06',
  'pi-3': '2026-02-07',
  'pi-4': '2026-02-07',
  'pi-f': '2026-02-08',
  'po-1': '2026-02-12',
  'po-2': '2026-02-13',
  'po-lb1': '2026-02-14',
  'po-3': '2026-02-15',
  'po-4': '2026-02-19',
  'po-lb2': '2026-02-20',
  'po-wf': '2026-02-21',
  'po-lb3': '2026-02-22',
  'po-lf': '2026-02-28',
  'po-gf': '2026-03-01',
};

export function formosaCalendarDays(year: number): FormosaCalendarDay[] {
  if (year === 2025) {
    return FORMOSA_2025_DAYS;
  }
  if (year === 2026) {
    return FORMOSA_2026_DAYS;
  }
  return [];
}

export function formosaSeriesIso(year: number, seriesId: string): string {
  const dates = year === 2026 ? FORMOSA_2026_DATES : year === 2025 ? FORMOSA_2025_DATES : {};
  return dates[seriesId] ?? '';
}
