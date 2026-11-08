import { Injectable, inject } from '@angular/core';
import { addIsoDays } from '../../shared/utils/season-calendar';
import { internationalEnd } from '../../shared/utils/international-events';
import { fixedPromotion, fixedRegular } from '../../shared/utils/year-calendar';
import { UniverseService } from './universe.service';

interface WindowSpan {
  label: string;
  start: string;
  end: string;
}

export interface TransferWindowState {
  isOpen: boolean;
  label: string;
  detail: string;
  start: string;
  end: string;
  range: string;
}

@Injectable({ providedIn: 'root' })
export class TransferWindowService {
  private readonly universeService = inject(UniverseService);

  current(): TransferWindowState {
    const today = this.today();
    const spans = this.spans(today);
    const open = spans.find((span) => today >= span.start && today <= span.end);
    if (open) {
      const range = `${this.pretty(open.start, today)} – ${this.pretty(open.end, today)}`;
      return {
        isOpen: true,
        label: open.label,
        detail: `${range}，可以收購、更名、簽約、交換選手。`,
        start: open.start,
        end: open.end,
        range,
      };
    }
    const next = spans.find((span) => span.start > today);
    if (next) {
      return {
        isOpen: false,
        label: '轉會期未開',
        detail: `下一窗是${next.label}，${this.pretty(next.start, today)} 到 ${this.pretty(next.end, today)}。`,
        start: next.start,
        end: next.end,
        range: `${this.pretty(next.start, today)} – ${this.pretty(next.end, today)}`,
      };
    }
    return {
      isOpen: false,
      label: '轉會期未開',
      detail: '今年沒有下一扇轉會窗。',
      start: '',
      end: '',
      range: '',
    };
  }

  assertOpen(): void {
    const state = this.current();
    if (!state.isOpen) {
      throw new Error(state.detail);
    }
  }

  nextStart(): string | null {
    const today = this.today();
    const spans = this.spans(today);
    const open = spans.find((span) => today >= span.start && today <= span.end);
    if (open) {
      return open.start;
    }
    return spans.find((span) => span.start > today)?.start ?? null;
  }

  private today(): string {
    return this.universeService.activeUniverse()?.currentDate.slice(0, 10) ?? '';
  }

  private spans(today: string): WindowSpan[] {
    const year = Number(today.slice(0, 4));
    if (!Number.isInteger(year) || year < 2000) {
      return [];
    }
    const spans: WindowSpan[] = [];
    const promoEnd = fixedPromotion(year, 'spring')?.['promo-2'];
    const summerStart = fixedRegular(year, 'summerRegular');
    if (promoEnd && summerStart) {
      const start = addIsoDays(promoEnd, 1);
      const end = addIsoDays(summerStart, -1);
      if (start <= end) {
        spans.push({ label: '季中轉會期', start, end });
      }
    }
    const worldsEnd = internationalEnd(year, '世界賽');
    const nextSpring = fixedRegular(year + 1, 'springRegular');
    if (worldsEnd && nextSpring) {
      const start = addIsoDays(worldsEnd, 1);
      const end = addIsoDays(nextSpring, -1);
      if (start <= end) {
        spans.push({ label: '休賽轉會期', start, end });
      }
    }
    return spans;
  }

  private pretty(iso: string, today: string): string {
    const [year, month, day] = iso.split('-');
    const date = `${Number(month)}/${Number(day)}`;
    return year === today.slice(0, 4) ? date : `${year}/${date}`;
  }
}
