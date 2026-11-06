import { Injectable, computed, inject, signal } from '@angular/core';
import { isScheduleYear, mondayOnOrBefore } from '../../shared/utils/season-calendar';
import {
  emptyPromotion,
  emptyYearPlan,
  fixedKnockout,
  fixedPlayoff,
  fixedPlayoffFor,
  fixedPromotion,
  fixedRegular,
  fixedSummerWindow,
  fixedWorlds,
  type KnockoutKey,
  type PromotionPlan,
  type PromotionSplit,
  type RegularKey,
  type YearPlan,
} from '../../shared/utils/year-calendar';
import { StorageAdapter } from '../storage/storage.adapter';
import { SeasonClockService } from './season-clock.service';
import { UniverseService } from './universe.service';

export type ScheduleLeague = 'TCS' | 'TCL';

interface StoredYearPlan {
  anchorMonday?: string;
  regular?: Partial<Record<RegularKey, string | null>>;
  knockouts?: Partial<Record<KnockoutKey, Record<string, string>>>;
}

interface StoredCalendar extends StoredYearPlan {
  leagues?: Partial<Record<ScheduleLeague, StoredYearPlan>>;
  promotion?: Partial<PromotionPlan>;
}

@Injectable({ providedIn: 'root' })
export class YearCalendarService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly clock = inject(SeasonClockService);
  private readonly revision = signal(0);

  readonly plans = computed(() => this.snapshot(this.clock.year()).plans);

  readonly promotion = computed(() => this.snapshot(this.clock.year()).promotion);

  planFor(league: ScheduleLeague): YearPlan {
    return this.plans()[league];
  }

  planForYear(league: ScheduleLeague, year: number): YearPlan {
    return this.snapshot(year).plans[league];
  }

  promotionFor(year: number): PromotionPlan {
    return this.snapshot(year).promotion;
  }

  springMonday(league: ScheduleLeague): string | null {
    return this.planFor(league).springRegular;
  }

  setRegular(league: ScheduleLeague, key: RegularKey, date: string, year = this.clock.year()): void {
    if (fixedRegular(year, key) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    const current = this.snapshot(year);
    const plan = current.plans[league];
    this.persist(year, { ...current.plans, [league]: { ...plan, [key]: mondayOnOrBefore(date) } }, current.promotion);
  }

  clearRegular(league: ScheduleLeague, key: RegularKey, year = this.clock.year()): void {
    if (fixedRegular(year, key)) {
      return;
    }
    const current = this.snapshot(year);
    const plan = current.plans[league];
    this.persist(year, { ...current.plans, [league]: { ...plan, [key]: null } }, current.promotion);
  }

  setSeriesDate(league: ScheduleLeague, key: KnockoutKey, seriesId: string, date: string, year = this.clock.year()): void {
    if (this.seriesDateIsFixed(year, key, seriesId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    const current = this.snapshot(year);
    const plan = current.plans[league];
    this.persist(year, { ...current.plans, [league]: { ...plan, [key]: { ...plan[key], [seriesId]: date } } }, current.promotion);
  }

  clearSeries(league: ScheduleLeague, key: KnockoutKey, seriesId: string, year = this.clock.year()): void {
    if (this.seriesDateIsFixed(year, key, seriesId)) {
      return;
    }
    const current = this.snapshot(year);
    const plan = current.plans[league];
    const dates = { ...plan[key] };
    delete dates[seriesId];
    this.persist(year, { ...current.plans, [league]: { ...plan, [key]: dates } }, current.promotion);
  }

  setPromotionDate(split: PromotionSplit, seriesId: string, date: string, year = this.clock.year()): void {
    if (fixedPromotion(year, split) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    const current = this.snapshot(year);
    this.persist(year, current.plans, {
      ...current.promotion,
      [split]: { ...current.promotion[split], [seriesId]: date },
    });
  }

  clearPromotion(split: PromotionSplit, seriesId: string, year = this.clock.year()): void {
    if (fixedPromotion(year, split)) {
      return;
    }
    const current = this.snapshot(year);
    const dates = { ...current.promotion[split] };
    delete dates[seriesId];
    this.persist(year, current.plans, { ...current.promotion, [split]: dates });
  }

  private seriesDateIsFixed(year: number, key: KnockoutKey, seriesId: string): boolean {
    if (key === 'worlds') {
      return Boolean(fixedWorlds(year)?.[seriesId]);
    }
    if (key === 'rise' || key === 'retention' || key === 'tcsSlot') {
      return Boolean(fixedKnockout(year, key)?.[seriesId]);
    }
    if (key !== 'springPlayoff' && key !== 'summerPlayoff') {
      return false;
    }
    return Boolean(fixedPlayoff(year, key)?.[seriesId]);
  }

  private snapshot(year: number): { plans: Record<ScheduleLeague, YearPlan>; promotion: PromotionPlan } {
    this.revision();
    const universeId = this.universeService.activeUniverseId();
    if (!universeId || !isScheduleYear(year)) {
      return { plans: { TCS: emptyYearPlan(), TCL: emptyYearPlan() }, promotion: emptyPromotion() };
    }
    const stored = this.storage.getItem<StoredCalendar>(this.storageKey(universeId, year));
    const plans = this.readAll(stored);
    for (const league of ['TCS', 'TCL'] as const) {
      const spring = fixedRegular(year, 'springRegular');
      const summer = fixedRegular(year, 'summerRegular') ?? fixedSummerWindow(year, league)?.start ?? null;
      const springPlayoff = fixedPlayoffFor(year, 'springPlayoff', league);
      const summerPlayoff = fixedPlayoffFor(year, 'summerPlayoff', league);
      const worlds = fixedWorlds(year);
      const rise = league === 'TCS' ? fixedKnockout(year, 'rise') : null;
      const retention = league === 'TCS' ? fixedKnockout(year, 'retention') : null;
      const tcsSlot = league === 'TCS' ? fixedKnockout(year, 'tcsSlot') : null;
      plans[league] = {
        ...plans[league],
        springRegular: spring ?? plans[league].springRegular,
        summerRegular: summer ?? plans[league].summerRegular,
        springPlayoff: springPlayoff ?? plans[league].springPlayoff,
        summerPlayoff: summerPlayoff ?? plans[league].summerPlayoff,
        worlds: worlds ?? plans[league].worlds,
        rise: rise ?? plans[league].rise,
        retention: retention ?? plans[league].retention,
        tcsSlot: tcsSlot ?? plans[league].tcsSlot,
      };
    }
    return {
      plans,
      promotion: {
        spring: fixedPromotion(year, 'spring') ?? { ...stored?.promotion?.spring },
        summer: fixedPromotion(year, 'summer') ?? { ...stored?.promotion?.summer },
      },
    };
  }

  private readAll(stored: StoredCalendar | null): Record<ScheduleLeague, YearPlan> {
    if (!stored) {
      return { TCS: emptyYearPlan(), TCL: emptyYearPlan() };
    }
    if (stored.leagues) {
      return {
        TCS: this.readPlan(stored.leagues.TCS ?? null),
        TCL: this.readPlan(stored.leagues.TCL ?? null),
      };
    }
    return { TCS: this.readPlan(stored), TCL: emptyYearPlan() };
  }

  private readPlan(stored: StoredYearPlan | null): YearPlan {
    const empty = emptyYearPlan();
    if (!stored) {
      return empty;
    }
    return {
      springRegular: stored.regular?.springRegular ?? stored.anchorMonday ?? null,
      summerRegular: stored.regular?.summerRegular ?? null,
      springPlayoff: { ...empty.springPlayoff, ...stored.knockouts?.springPlayoff },
      summerPlayoff: { ...empty.summerPlayoff, ...stored.knockouts?.summerPlayoff },
      worlds: { ...empty.worlds, ...stored.knockouts?.worlds },
      rise: { ...empty.rise, ...stored.knockouts?.rise },
      retention: { ...empty.retention, ...stored.knockouts?.retention },
      formosa: { ...empty.formosa, ...stored.knockouts?.formosa },
      tcsSlot: { ...empty.tcsSlot, ...stored.knockouts?.tcsSlot },
    };
  }

  private persist(year: number, plans: Record<ScheduleLeague, YearPlan>, promotion: PromotionPlan): void {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId || !isScheduleYear(year)) {
      return;
    }
    const record: StoredCalendar = {
      leagues: {
        TCS: this.storePlan(plans.TCS),
        TCL: this.storePlan(plans.TCL),
      },
      promotion,
    };
    this.storage.setItem(this.storageKey(universeId, year), record);
    this.revision.update((value) => value + 1);
  }

  private storePlan(plan: YearPlan): StoredYearPlan {
    return {
      regular: {
        springRegular: plan.springRegular,
        summerRegular: plan.summerRegular,
      },
      knockouts: {
        springPlayoff: plan.springPlayoff,
        summerPlayoff: plan.summerPlayoff,
        worlds: plan.worlds,
        rise: plan.rise,
        retention: plan.retention,
        formosa: plan.formosa,
        tcsSlot: plan.tcsSlot,
      },
    };
  }

  private storageKey(universeId: string, year: number): string {
    return `eus.calendar.${year}.${universeId}`;
  }
}
