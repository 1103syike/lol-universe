import { formosaCalendarDays, formosaSeriesIso } from './formosa-schedule';
import { addIsoDays, fromIsoDate, isLunarNewYear, regularSeasonDays } from './season-calendar';

export type RegularKey = 'springRegular' | 'summerRegular';
export type KnockoutKey = 'springPlayoff' | 'summerPlayoff' | 'worlds' | 'rise' | 'retention' | 'formosa' | 'tcsSlot';
export type BracketShape = 'single' | 'double' | 'hill';

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
  rise: Record<string, string>;
  retention: Record<string, string>;
  formosa: Record<string, string>;
  tcsSlot: Record<string, string>;
}

export interface CalendarDayMark {
  label: string;
  detail: string;
  tone: 'rest' | 'spring' | 'summer' | 'playoff' | 'qualifier' | 'holiday' | 'promotion' | 'event';
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

const DOUBLE_SERIES: SeriesSlot[] = [
  { id: 'r1-high', label: '首輪1', detail: '第 3 名選擇的對手' },
  { id: 'r1-low', label: '首輪2', detail: '第 4 名對剩下的隊伍' },
  { id: 'r2-high', label: '次輪1', detail: '第 1 名選擇的勝者' },
  { id: 'r2-low', label: '次輪2', detail: '第 2 名對剩下的勝者' },
  { id: 'winners-final', label: '勝決', detail: '勝者組決賽' },
  { id: 'losers-r1', label: '敗部', detail: '第二輪敗者互打' },
  { id: 'losers-final', label: '敗決', detail: '敗者組決賽' },
  { id: 'grand-final', label: '總決', detail: '總決賽' },
];

const HILL_SERIES: SeriesSlot[] = [
  { id: 'r1-high', label: '首輪1', detail: 'Legend 第 5 名對 Rise 第 2 名' },
  { id: 'r1-low', label: '首輪2', detail: 'Legend 第 6 名對 Rise 第 1 名' },
  { id: 'r2-high', label: '次輪1', detail: 'Legend 第 4 名加入' },
  { id: 'r2-low', label: '次輪2', detail: 'Legend 第 3 名加入' },
  { id: 'r3-high', label: '三輪1', detail: 'Legend 第 1 名加入' },
  { id: 'r3-low', label: '三輪2', detail: 'Legend 第 2 名加入' },
  { id: 'losers-r1', label: '敗部', detail: '敗部' },
  { id: 'winners-final', label: '勝決', detail: '勝者組決賽' },
  { id: 'losers-final', label: '敗決', detail: '敗者組決賽' },
  { id: 'grand-final', label: '總決', detail: '總決賽' },
];

const WORLDS_FOUR_SERIES: SeriesSlot[] = [
  { id: 'wb', label: '勝組', detail: '年度積分第 3 名對第 4 名' },
  { id: 'lb1', label: '敗組', detail: '第 5 名對第 6 名' },
  { id: 'lb2', label: '敗決', detail: '勝者組敗者對敗者組勝者' },
];

const RISE_SERIES: SeriesSlot[] = [
  { id: 'rise-1', label: '資格1', detail: 'TCL 選擇的第一支 TCS' },
  { id: 'rise-2', label: '資格2', detail: '第二場' },
  { id: 'rise-3', label: '資格3', detail: '第三場' },
  { id: 'rise-4', label: '資格4', detail: '最後兩隊' },
  { id: 'rise-5', label: '補位1', detail: '敗部第 1 名選擇的對手' },
  { id: 'rise-6', label: '補位2', detail: '剩下兩隊' },
];

const RETENTION_SERIES: SeriesSlot[] = [
  { id: 'ret-1', label: '首輪1', detail: '第 3 名對第 6 名' },
  { id: 'ret-2', label: '首輪2', detail: '第 4 名對第 5 名' },
  { id: 'ret-3', label: '準決1', detail: '第 1 名對勝者' },
  { id: 'ret-4', label: '準決2', detail: '第 2 名對勝者' },
  { id: 'ret-5', label: '決賽', detail: '冠軍與亞軍進下一年 TCS' },
];

const FORMOSA_2025_SERIES: SeriesSlot[] = [
  { id: 'gb', label: '分組開賽', detail: '1/15 到 2/2，日期固定' },
  { id: 'pi-1', label: '入圍1', detail: '第 3 種子對第 6 種子，BO3' },
  { id: 'pi-2', label: '入圍2', detail: '第 4 種子對第 5 種子，BO3' },
  { id: 'pi-3', label: '入圍3', detail: '第 1 種子對 4 對 5 的勝者，BO3' },
  { id: 'pi-4', label: '入圍4', detail: '第 2 種子對 3 對 6 的勝者，BO3' },
  { id: 'pi-f', label: '入圍決', detail: '兩場第二輪的敗者，BO5' },
  { id: 'po-1', label: '季後1', detail: '勝組第 3 名對入圍決賽勝者' },
  { id: 'po-2', label: '季後2', detail: '兩支入圍第二輪勝者' },
  { id: 'po-3', label: '次輪1', detail: '勝組第 1 名選擇對手' },
  { id: 'po-4', label: '次輪2', detail: '勝組第 2 名對剩下的勝者' },
  { id: 'po-wf', label: '勝決', detail: '次輪兩名勝者' },
  { id: 'po-lb', label: '敗部', detail: '次輪兩名敗者' },
  { id: 'po-lf', label: '敗決', detail: '勝決敗者對敗部勝者' },
  { id: 'po-gf', label: '總決', detail: '勝決勝者對敗決勝者' },
];

const FORMOSA_2026_SERIES: SeriesSlot[] = [
  { id: 'gb', label: '分組開賽', detail: '1/14 到 2/1，日期固定' },
  { id: 'pi-1', label: '入圍1', detail: '第 3 種子對第 6 種子，BO3' },
  { id: 'pi-2', label: '入圍2', detail: '第 4 種子對第 5 種子，BO3' },
  { id: 'pi-3', label: '入圍3', detail: '第 1 種子選擇對手，BO3' },
  { id: 'pi-4', label: '入圍4', detail: '第 2 種子對剩下的勝者，BO3' },
  { id: 'pi-f', label: '入圍決', detail: '兩場第二輪的敗者，BO5，勝者以第 6 種子晉級' },
  { id: 'po-1', label: '勝1', detail: '敗組第 1 名選擇一支入圍晉級隊' },
  { id: 'po-2', label: '勝2', detail: '剩下兩支入圍晉級隊，高種子對低種子' },
  { id: 'po-lb1', label: '敗1', detail: '勝組第一輪的兩名敗者' },
  { id: 'po-3', label: '勝3', detail: '勝組第 1 名選擇對手' },
  { id: 'po-4', label: '勝4', detail: '勝組第 2 名對剩下的勝者' },
  { id: 'po-lb2', label: '敗2', detail: '敗部第一輪勝者對次輪較低種子的敗者' },
  { id: 'po-wf', label: '勝決', detail: '勝組第二輪的兩名勝者' },
  { id: 'po-lb3', label: '敗3', detail: '敗部第二輪勝者對次輪較高種子的敗者' },
  { id: 'po-lf', label: '敗決', detail: '勝決敗者對敗部第三輪勝者' },
  { id: 'po-gf', label: '總決', detail: '勝決勝者對敗決勝者' },
];

const TCS_SLOT_SERIES: SeriesSlot[] = [
  { id: 'slot-1', label: '資格1', detail: 'TCL 選擇的 Rise' },
  { id: 'slot-2', label: '資格2', detail: '第二場' },
  { id: 'slot-3', label: '資格3', detail: '第三場' },
  { id: 'slot-4', label: '資格4', detail: '最後一場' },
  { id: 'slot-5', label: '決1', detail: '第 1 名對第 4 名' },
  { id: 'slot-6', label: '決2', detail: '第 2 名對第 3 名' },
];

export interface YearFormat {
  tcsSpring: BracketShape | null;
  tclSpring: BracketShape | null;
  tcsSummer: BracketShape | null;
  tclSummer: BracketShape | null;
  summerWeeks: boolean;
  springPromotion: boolean;
  summerPromotion: boolean;
  worlds: 'gauntlet' | 'four' | null;
  rise: boolean;
  retention: boolean;
  formosa: boolean;
  tcsSlot: boolean;
}

const FIXED_REGULAR: Partial<Record<number, Partial<Record<RegularKey, string>>>> = {
  2021: { springRegular: '2021-01-13', summerRegular: '2021-06-09' },
  2022: { springRegular: '2022-01-12', summerRegular: '2022-06-15' },
  2023: { springRegular: '2023-01-18', summerRegular: '2023-06-07' },
  2024: { springRegular: '2024-01-17', summerRegular: '2024-06-12' },
  2025: { springRegular: '2025-03-26' },
  2026: { springRegular: '2026-04-01' },
};

const FIXED_SUMMER: Partial<Record<number, Record<'TCS' | 'TCL', { start: string; end: string }>>> = {
  2025: {
    TCS: { start: '2025-07-23', end: '2025-08-24' },
    TCL: { start: '2025-07-23', end: '2025-09-21' },
  },
  2026: {
    TCS: { start: '2026-07-29', end: '2026-08-30' },
    TCL: { start: '2026-07-29', end: '2026-09-24' },
  },
};

export function fixedRegular(year: number, key: RegularKey): string | null {
  return FIXED_REGULAR[year]?.[key] ?? null;
}

export function fixedSummerWindow(year: number, league: 'TCS' | 'TCL'): { start: string; end: string } | null {
  return FIXED_SUMMER[year]?.[league] ?? null;
}

const FIXED_PLAYOFF: Partial<Record<number, Record<'springPlayoff' | 'summerPlayoff', Record<string, string>>>> = {
  2021: {
    springPlayoff: {
      'qf-1': '2021-03-31',
      'qf-2': '2021-04-01',
      'sf-1': '2021-04-03',
      'sf-2': '2021-04-04',
      final: '2021-04-10',
    },
    summerPlayoff: {
      'qf-1': '2021-08-18',
      'qf-2': '2021-08-19',
      'sf-1': '2021-08-21',
      'sf-2': '2021-08-22',
      final: '2021-08-28',
    },
  },
  2022: {
    springPlayoff: {
      'qf-1': '2022-03-23',
      'qf-2': '2022-03-24',
      'sf-1': '2022-03-26',
      'sf-2': '2022-03-27',
      final: '2022-04-02',
    },
    summerPlayoff: {
      'qf-1': '2022-08-17',
      'qf-2': '2022-08-18',
      'sf-1': '2022-08-20',
      'sf-2': '2022-08-21',
      final: '2022-08-28',
    },
  },
  2023: {
    springPlayoff: {
      'r1-high': '2023-03-22',
      'r1-low': '2023-03-23',
      'r2-high': '2023-03-25',
      'r2-low': '2023-03-26',
      'winners-final': '2023-04-01',
      'losers-r1': '2023-04-02',
      'losers-final': '2023-04-08',
      'grand-final': '2023-04-09',
    },
    summerPlayoff: {
      'r1-high': '2023-08-08',
      'r1-low': '2023-08-09',
      'r2-high': '2023-08-10',
      'r2-low': '2023-08-11',
      'winners-final': '2023-08-12',
      'losers-r1': '2023-08-13',
      'losers-final': '2023-08-19',
      'grand-final': '2023-08-20',
    },
  },
  2024: {
    springPlayoff: {
      'r1-high': '2024-03-30',
      'r1-low': '2024-03-31',
      'r2-high': '2024-04-03',
      'r2-low': '2024-04-04',
      'winners-final': '2024-04-06',
      'losers-r1': '2024-04-07',
      'losers-final': '2024-04-13',
      'grand-final': '2024-04-14',
    },
    summerPlayoff: {
      'r1-high': '2024-08-23',
      'r1-low': '2024-08-24',
      'r2-high': '2024-08-28',
      'r2-low': '2024-08-29',
      'winners-final': '2024-08-31',
      'losers-r1': '2024-09-01',
      'losers-final': '2024-09-07',
      'grand-final': '2024-09-08',
    },
  },
  2025: {
    springPlayoff: {
      'r1-high': '2025-05-28',
      'r1-low': '2025-05-29',
      'r2-high': '2025-05-31',
      'r2-low': '2025-06-01',
      'winners-final': '2025-06-04',
      'losers-r1': '2025-06-05',
      'losers-final': '2025-06-07',
      'grand-final': '2025-06-08',
    },
    summerPlayoff: {
      'r1-high': '2025-09-03',
      'r1-low': '2025-09-04',
      'r2-high': '2025-09-06',
      'r2-low': '2025-09-07',
      'r3-high': '2025-09-10',
      'r3-low': '2025-09-11',
      'losers-r1': '2025-09-13',
      'winners-final': '2025-09-14',
      'losers-final': '2025-09-17',
      'grand-final': '2025-09-20',
    },
  },
  2026: {
    springPlayoff: {
      'r1-high': '2026-06-03',
      'r1-low': '2026-06-04',
      'r2-high': '2026-06-06',
      'r2-low': '2026-06-07',
      'winners-final': '2026-06-10',
      'losers-r1': '2026-06-11',
      'losers-final': '2026-06-13',
      'grand-final': '2026-06-14',
    },
    summerPlayoff: {
      'r1-high': '2026-09-02',
      'r1-low': '2026-09-03',
      'r2-high': '2026-09-05',
      'r2-low': '2026-09-06',
      'r3-high': '2026-09-09',
      'r3-low': '2026-09-10',
      'losers-r1': '2026-09-12',
      'winners-final': '2026-09-13',
      'losers-final': '2026-09-16',
      'grand-final': '2026-09-19',
    },
  },
};

const FIXED_PROMOTION: Partial<Record<number, Partial<Record<PromotionSplit, Record<string, string>>>>> = {
  2021: {
    spring: { 'promo-1': '2021-04-14', 'promo-2': '2021-04-15' },
    summer: { 'promo-1': '2021-09-01', 'promo-2': '2021-09-02' },
  },
  2022: {
    spring: { 'promo-1': '2022-04-06', 'promo-2': '2022-04-07' },
    summer: { 'promo-1': '2022-08-31', 'promo-2': '2022-09-01' },
  },
  2023: {
    spring: { 'promo-1': '2023-04-12', 'promo-2': '2023-04-13' },
    summer: { 'promo-1': '2023-08-23', 'promo-2': '2023-08-24' },
  },
  2024: {
    spring: { 'promo-1': '2024-04-17', 'promo-2': '2024-04-18' },
    summer: { 'promo-1': '2024-09-11', 'promo-2': '2024-09-12' },
  },
  2025: {
    spring: { 'promo-1': '2025-06-11', 'promo-2': '2025-06-12' },
  },
};

const FIXED_WORLDS: Partial<Record<number, Record<string, string>>> = {
  2021: { 'gauntlet-65': '2021-09-03', 'gauntlet-4': '2021-09-04', 'gauntlet-3': '2021-09-05' },
  2022: { 'gauntlet-65': '2022-09-02', 'gauntlet-4': '2022-09-03', 'gauntlet-3': '2022-09-04' },
  2023: { wb: '2023-08-25', lb1: '2023-08-26', lb2: '2023-08-27' },
  2024: { wb: '2024-09-13', lb1: '2024-09-14', lb2: '2024-09-15' },
  2025: { wb: '2025-10-04', lb1: '2025-10-05', lb2: '2025-10-08' },
  2026: { wb: '2026-10-07', lb1: '2026-10-08', lb2: '2026-10-10' },
};

const FIXED_KNOCKOUT: Partial<Record<number, Partial<Record<'rise' | 'retention' | 'tcsSlot', Record<string, string>>>>> = {
  2025: {
    rise: {
      'rise-1': '2025-06-14',
      'rise-2': '2025-06-15',
      'rise-3': '2025-06-18',
      'rise-4': '2025-06-19',
      'rise-5': '2025-06-21',
      'rise-6': '2025-06-22',
    },
    retention: {
      'ret-1': '2025-09-24',
      'ret-2': '2025-09-25',
      'ret-3': '2025-09-27',
      'ret-4': '2025-09-28',
      'ret-5': '2025-10-01',
    },
  },
  2026: {
    rise: {
      'rise-1': '2026-06-17',
      'rise-2': '2026-06-18',
      'rise-3': '2026-06-20',
      'rise-4': '2026-06-21',
      'rise-5': '2026-06-24',
      'rise-6': '2026-06-25',
    },
    tcsSlot: {
      'slot-1': '2026-09-26',
      'slot-2': '2026-09-27',
      'slot-3': '2026-09-30',
      'slot-4': '2026-10-01',
      'slot-5': '2026-10-03',
      'slot-6': '2026-10-04',
    },
  },
};

export function fixedKnockout(year: number, key: 'rise' | 'retention' | 'tcsSlot'): Record<string, string> | null {
  return FIXED_KNOCKOUT[year]?.[key] ?? null;
}

export function fixedPromotion(year: number, split: 'spring' | 'summer'): Record<string, string> | null {
  return FIXED_PROMOTION[year]?.[split] ?? null;
}

export function fixedWorlds(year: number): Record<string, string> | null {
  return FIXED_WORLDS[year] ?? null;
}

export function fixedPlayoff(year: number, key: 'springPlayoff' | 'summerPlayoff'): Record<string, string> | null {
  return FIXED_PLAYOFF[year]?.[key] ?? null;
}

export function fixedPlayoffFor(
  year: number,
  key: 'springPlayoff' | 'summerPlayoff',
  league: 'TCS' | 'TCL',
): Record<string, string> | null {
  const dates = fixedPlayoff(year, key);
  if (!dates || league === 'TCL') {
    return year >= 2025 ? null : dates;
  }
  if (year >= 2025) {
    return dates;
  }
  const shifted = { ...dates };
  for (const seriesId of ['final', 'grand-final']) {
    if (shifted[seriesId]) {
      shifted[seriesId] = addIsoDays(shifted[seriesId], 1);
    }
  }
  return shifted;
}

export function yearFormat(year: number): YearFormat {
  if (year <= 2022) {
    return {
      tcsSpring: 'single',
      tclSpring: 'single',
      tcsSummer: 'single',
      tclSummer: 'single',
      summerWeeks: true,
      springPromotion: true,
      summerPromotion: true,
      worlds: 'gauntlet',
      rise: false,
      retention: false,
      formosa: false,
      tcsSlot: false,
    };
  }
  if (year <= 2024) {
    return {
      tcsSpring: 'double',
      tclSpring: 'double',
      tcsSummer: 'double',
      tclSummer: 'double',
      summerWeeks: true,
      springPromotion: true,
      summerPromotion: true,
      worlds: 'four',
      rise: false,
      retention: false,
      formosa: false,
      tcsSlot: false,
    };
  }
  if (year === 2025) {
    return {
      tcsSpring: 'double',
      tclSpring: null,
      tcsSummer: 'hill',
      tclSummer: null,
      summerWeeks: false,
      springPromotion: true,
      summerPromotion: false,
      worlds: 'four',
      rise: true,
      retention: true,
      formosa: true,
      tcsSlot: false,
    };
  }
  return {
    tcsSpring: 'double',
    tclSpring: null,
    tcsSummer: 'hill',
    tclSummer: null,
    summerWeeks: false,
    springPromotion: false,
    summerPromotion: false,
    worlds: 'four',
    rise: true,
    retention: false,
    formosa: true,
    tcsSlot: true,
  };
}

export function playoffShape(year: number, league: 'TCS' | 'TCL', split: 'spring' | 'summer'): BracketShape | null {
  const format = yearFormat(year);
  if (league === 'TCS') {
    return split === 'spring' ? format.tcsSpring : format.tcsSummer;
  }
  return split === 'spring' ? format.tclSpring : format.tclSummer;
}

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
    rise: {},
    retention: {},
    formosa: {},
    tcsSlot: {},
  };
}

export function emptyPromotion(): PromotionPlan {
  return { spring: {}, summer: {} };
}

export function seriesFor(key: string, year = 2021, league: 'TCS' | 'TCL' = 'TCS'): SeriesSlot[] {
  const format = yearFormat(year);
  if (key === 'worlds') {
    return format.worlds === 'four' ? WORLDS_FOUR_SERIES : WORLDS_SERIES;
  }
  if (key === 'springPromotion' || key === 'summerPromotion') {
    return PROMOTION_SERIES;
  }
  if (key === 'rise') {
    return RISE_SERIES;
  }
  if (key === 'retention') {
    return RETENTION_SERIES;
  }
  if (key === 'formosa') {
    return year >= 2026 ? FORMOSA_2026_SERIES : FORMOSA_2025_SERIES;
  }
  if (key === 'tcsSlot') {
    return TCS_SLOT_SERIES;
  }
  if (key === 'springPlayoff' || key === 'summerPlayoff') {
    const split = key === 'springPlayoff' ? 'spring' : 'summer';
    return bracketSeries(playoffShape(year, league, split));
  }
  return [];
}

function bracketSeries(shape: BracketShape | null): SeriesSlot[] {
  if (shape === 'double') {
    return DOUBLE_SERIES;
  }
  if (shape === 'hill') {
    return HILL_SERIES;
  }
  return PLAYOFF_SERIES;
}

export function promotionMarks(marks: CalendarDayMark[], promotion: PromotionPlan, iso: string, year = 2021): CalendarDayMark[] {
  const format = yearFormat(year);
  if (format.springPromotion) {
    pushSeries(marks, promotion.spring, PROMOTION_SERIES, iso, 'promotion', '春季升降賽');
  }
  if (format.summerPromotion) {
    pushSeries(marks, promotion.summer, PROMOTION_SERIES, iso, 'promotion', '夏季升降賽');
  }
  return marks;
}

export function regularRange(monday: string): { start: string; end: string } {
  const days = regularSeasonDays(monday);
  return { start: days[0]?.iso ?? monday, end: days[days.length - 1]?.iso ?? monday };
}

export function marksOn(plan: YearPlan, iso: string, year = 2021, league: 'TCS' | 'TCL' = 'TCS'): CalendarDayMark[] {
  const format = yearFormat(year);
  const marks: CalendarDayMark[] = [];
  pushRegular(marks, plan.springRegular, iso, '春例', '春季例行賽', 'spring');
  if (format.summerWeeks) {
    pushRegular(marks, plan.summerRegular, iso, '夏例', '夏季例行賽', 'summer');
  } else {
    const summer = fixedSummerWindow(year, league);
    if (summer && league === 'TCS') {
      pushSeasonWindow(marks, summer.start, summer.end, iso, '傳奇', 'Legend 組，6 隊', 'summer');
      pushSeasonWindow(marks, summer.start, summer.end, iso, '涅槃', 'Rise 組，6 隊', 'summer');
    } else if (summer) {
      pushSeasonWindow(marks, summer.start, summer.end, iso, '夏例', '夏季例行賽', 'summer');
    } else if (plan.summerRegular === iso) {
      marks.push({ label: '夏開', detail: '夏季開賽', tone: 'summer' });
    }
  }
  const springShape = playoffShape(year, league, 'spring');
  const summerShape = playoffShape(year, league, 'summer');
  if (springShape) {
    pushSeries(marks, plan.springPlayoff, bracketSeries(springShape), iso, 'playoff', '春季季後賽');
  }
  if (summerShape) {
    pushSeries(marks, plan.summerPlayoff, bracketSeries(summerShape), iso, 'playoff', '夏季季後賽');
  }
  if (league === 'TCS' && format.worlds) {
    pushSeries(marks, plan.worlds, seriesFor('worlds', year), iso, 'qualifier', '世界賽資格賽');
  }
  if (league === 'TCS' && format.rise) {
    pushSeries(marks, plan.rise, RISE_SERIES, iso, 'qualifier', 'Rise 資格賽');
  }
  if (league === 'TCS' && format.retention) {
    pushSeries(marks, plan.retention, RETENTION_SERIES, iso, 'playoff', 'TCS 保留賽');
  }
  if (league === 'TCS' && format.formosa) {
    const dates: Record<string, string> = {};
    for (const slot of seriesFor('formosa', year)) {
      const slotIso = formosaSeriesIso(year, slot.id);
      if (slotIso) {
        dates[slot.id] = slotIso;
      }
    }
    pushSeries(marks, dates, seriesFor('formosa', year).filter((slot) => slot.id !== 'gb'), iso, 'playoff', '福爾摩沙杯');
    for (const day of formosaCalendarDays(year)) {
      if (day.iso === iso) {
        marks.push({ label: day.label, detail: day.detail, tone: 'playoff' });
      }
    }
  }
  if (league === 'TCS' && format.tcsSlot) {
    pushSeries(marks, plan.tcsSlot, TCS_SLOT_SERIES, iso, 'qualifier', 'TCS 資格賽');
  }
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

function pushSeasonWindow(
  marks: CalendarDayMark[],
  start: string,
  end: string,
  iso: string,
  label: string,
  detail: string,
  tone: 'spring' | 'summer',
): void {
  if (iso < start || iso > end) {
    return;
  }
  const date = fromIsoDate(iso);
  const offset = date.getDay() === 0 ? 6 : date.getDay() - 1;
  if (offset < 2) {
    if (!marks.some((mark) => mark.label === '休' || mark.label === '春節')) {
      marks.push({ label: '休', detail: `${detail} 休息`, tone: 'rest' });
    }
    return;
  }
  marks.push({ label, detail, tone });
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
