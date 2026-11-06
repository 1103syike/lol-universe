import { Injectable, computed, inject, signal } from '@angular/core';
import { mondayOnOrBefore } from '../../shared/utils/season-calendar';
import {
  emptyPromotion,
  emptyYearPlan,
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

  readonly plans = computed(() => {
    this.revision();
    const universeId = this.universeService.activeUniverseId();
    const year = this.clock.year();
    if (!universeId || !this.clock.isSupported()) {
      return { TCS: emptyYearPlan(), TCL: emptyYearPlan() };
    }
    return this.readAll(this.storage.getItem<StoredCalendar>(this.storageKey(universeId, year)));
  });

  readonly promotion = computed(() => {
    this.revision();
    const universeId = this.universeService.activeUniverseId();
    const year = this.clock.year();
    if (!universeId || !this.clock.isSupported()) {
      return emptyPromotion();
    }
    const stored = this.storage.getItem<StoredCalendar>(this.storageKey(universeId, year));
    return {
      spring: { ...stored?.promotion?.spring },
      summer: { ...stored?.promotion?.summer },
    };
  });

  planFor(league: ScheduleLeague): YearPlan {
    return this.plans()[league];
  }

  springMonday(league: ScheduleLeague): string | null {
    return this.planFor(league).springRegular;
  }

  setRegular(league: ScheduleLeague, key: RegularKey, date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    this.write(league, { ...this.planFor(league), [key]: mondayOnOrBefore(date) });
  }

  clearRegular(league: ScheduleLeague, key: RegularKey): void {
    this.write(league, { ...this.planFor(league), [key]: null });
  }

  setSeriesDate(league: ScheduleLeague, key: KnockoutKey, seriesId: string, date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    const plan = this.planFor(league);
    this.write(league, { ...plan, [key]: { ...plan[key], [seriesId]: date } });
  }

  clearSeries(league: ScheduleLeague, key: KnockoutKey, seriesId: string): void {
    const dates = { ...this.planFor(league)[key] };
    delete dates[seriesId];
    this.write(league, { ...this.planFor(league), [key]: dates });
  }

  setPromotionDate(split: PromotionSplit, seriesId: string, date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }
    const promotion = this.promotion();
    this.persist(this.plans(), { ...promotion, [split]: { ...promotion[split], [seriesId]: date } });
  }

  clearPromotion(split: PromotionSplit, seriesId: string): void {
    const promotion = this.promotion();
    const dates = { ...promotion[split] };
    delete dates[seriesId];
    this.persist(this.plans(), { ...promotion, [split]: dates });
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
    };
  }

  private write(league: ScheduleLeague, plan: YearPlan): void {
    const universeId = this.universeService.activeUniverseId();
    const year = this.clock.year();
    if (!universeId || !this.clock.isSupported()) {
      return;
    }
    this.persist({ ...this.plans(), [league]: plan }, this.promotion());
  }

  private persist(plans: Record<ScheduleLeague, YearPlan>, promotion: PromotionPlan): void {
    const universeId = this.universeService.activeUniverseId();
    const year = this.clock.year();
    if (!universeId || !this.clock.isSupported()) {
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
      },
    };
  }

  private storageKey(universeId: string, year: number): string {
    return `eus.calendar.${year}.${universeId}`;
  }
}
