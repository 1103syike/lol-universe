import type { CalendarDayMark } from './year-calendar';

export type InternationalScene = 'msi' | 'worlds' | 'first-stand' | 'ewc';

export interface InternationalWindow {
  scene: InternationalScene;
  label: string;
  mark: string;
  start: string;
  end: string;
}

interface InternationalEvent {
  label: string;
  start: string;
  end: string;
}

const SCENE_BY_LABEL: Record<string, Pick<InternationalWindow, 'scene' | 'mark'>> = {
  MSI: { scene: 'msi', mark: 'MSI' },
  世界賽: { scene: 'worlds', mark: 'WORLDS' },
  先鋒賽: { scene: 'first-stand', mark: 'FIRST' },
  石油杯: { scene: 'ewc', mark: 'EWC' },
};

const EVENTS: Partial<Record<number, InternationalEvent[]>> = {
  2021: [
    { label: 'MSI', start: '2021-05-06', end: '2021-05-23' },
    { label: '世界賽', start: '2021-10-05', end: '2021-11-06' },
  ],
  2022: [
    { label: 'MSI', start: '2022-05-10', end: '2022-05-29' },
    { label: '世界賽', start: '2022-09-29', end: '2022-11-05' },
  ],
  2023: [
    { label: 'MSI', start: '2023-05-02', end: '2023-05-21' },
    { label: '世界賽', start: '2023-10-10', end: '2023-11-19' },
  ],
  2024: [
    { label: 'MSI', start: '2024-05-01', end: '2024-05-19' },
    { label: '石油杯', start: '2024-07-04', end: '2024-07-07' },
    { label: '世界賽', start: '2024-09-25', end: '2024-11-02' },
  ],
  2025: [
    { label: '先鋒賽', start: '2025-03-10', end: '2025-03-16' },
    { label: 'MSI', start: '2025-06-27', end: '2025-07-12' },
    { label: '石油杯', start: '2025-07-16', end: '2025-07-20' },
    { label: '世界賽', start: '2025-10-14', end: '2025-11-09' },
  ],
  2026: [
    { label: '先鋒賽', start: '2026-03-16', end: '2026-03-22' },
    { label: 'MSI', start: '2026-06-28', end: '2026-07-12' },
    { label: '石油杯', start: '2026-07-15', end: '2026-07-19' },
    { label: '世界賽', start: '2026-10-15', end: '2026-11-14' },
  ],
};

function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function internationalEnd(year: number, label: string): string | null {
  return EVENTS[year]?.find((event) => event.label === label)?.end ?? null;
}

export function internationalWindows(iso: string): InternationalWindow[] {
  const year = Number(iso.slice(0, 4));
  return (EVENTS[year] ?? []).map((event) => {
    const scene = SCENE_BY_LABEL[event.label] ?? { scene: 'worlds' as const, mark: 'WORLDS' };
    return {
      scene: scene.scene,
      mark: scene.mark,
      label: event.label,
      start: event.start,
      end: event.end,
    };
  });
}

export function internationalMarks(year: number, iso: string): CalendarDayMark[] {
  return (EVENTS[year] ?? [])
    .filter((event) => iso >= event.start && iso <= event.end)
    .map((event) => ({
      label: event.label,
      detail: `${event.label} ${shortDate(event.start)}–${shortDate(event.end)}`,
      tone: 'event',
    }));
}
