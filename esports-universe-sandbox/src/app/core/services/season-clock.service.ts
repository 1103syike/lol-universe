import { Injectable, computed, inject, signal } from '@angular/core';
import { isScheduleYear } from '../../shared/utils/season-calendar';
import { StorageAdapter } from '../storage/storage.adapter';
import { UniverseService } from './universe.service';

export type SeasonPhase = 'regular' | 'playoff';

interface SeasonClock {
  year: number;
  phase: SeasonPhase;
}

@Injectable({ providedIn: 'root' })
export class SeasonClockService {
  private readonly storage = inject(StorageAdapter);
  private readonly universeService = inject(UniverseService);
  private readonly revision = signal(0);

  readonly year = computed(() => {
    const date = this.universeService.activeUniverse()?.currentDate ?? '';
    const year = Number(date.slice(0, 4));
    return Number.isInteger(year) ? year : 0;
  });

  readonly isSupported = computed(() => isScheduleYear(this.year()));

  readonly phase = computed(() => {
    this.revision();
    const stored = this.read();
    if (!stored || stored.year !== this.year()) {
      return 'regular' as const;
    }
    return stored.phase;
  });

  readonly label = computed(() => {
    const year = this.year();
    if (!this.isSupported()) {
      return year > 0 ? `${year} 年的賽程還沒接到時間軸` : '尚未選擇宇宙';
    }
    return this.phase() === 'playoff' ? `${year} 春季季後賽` : `${year} 春季例行賽`;
  });

  setPhase(phase: SeasonPhase): void {
    const universeId = this.universeService.activeUniverseId();
    const year = this.year();
    if (!universeId || !isScheduleYear(year)) {
      return;
    }
    this.storage.setItem(this.storageKey(universeId), { year, phase });
    this.revision.update((value) => value + 1);
  }

  private read(): SeasonClock | null {
    const universeId = this.universeService.activeUniverseId();
    if (!universeId) {
      return null;
    }
    return this.storage.getItem<SeasonClock>(this.storageKey(universeId));
  }

  private storageKey(universeId: string): string {
    return `eus.clock.${universeId}`;
  }
}
