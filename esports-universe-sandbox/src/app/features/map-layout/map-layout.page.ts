import { NgStyle } from '@angular/common';
import { Component, computed, HostListener, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  mapObjectiveIcon,
  scoreboardIconStyle,
  type ScoreboardSide,
} from '../../shared/sim/scoreboard-icons';
import {
  clampMapCoord,
  cloneMapLayout,
  DEFAULT_MAP_LAYOUT,
  MAP_LAYOUT_MAX,
  MAP_LAYOUT_SNAP,
  serializeMapLayout,
  snapMapCoord,
  type MapLayout,
  type MapPoint,
} from '../../shared/sim-v2/version/map-layout';
import { buildMonsters, buildStructures } from '../../shared/sim-v2/version/shared-content';

type MarkerGroup = 'structure' | 'objective' | 'camp' | 'fountain';

type MapMarker = {
  id: string;
  group: MarkerGroup;
  label: string;
  side: ScoreboardSide | 'neutral';
  x: number;
  y: number;
};

type DragState = {
  id: string;
  originClientX: number;
  originClientY: number;
  originX: number;
  originY: number;
};

const DRAFT_KEY = 'map-layout-draft-v1';
const STRUCTURE_META = Object.fromEntries(
  buildStructures().map((item) => [
    item.id,
    {
      label: `${item.side} ${item.kind}${item.lane ? ` ${item.lane}` : ''}`,
      side: item.side as ScoreboardSide,
    },
  ]),
);

const CAMP_META = Object.fromEntries(
  buildMonsters()
    .filter((item) => !['dragon', 'baron', 'herald'].includes(item.id))
    .map((item) => [item.id, { label: item.name, side: item.side as ScoreboardSide | 'neutral' }]),
);

@Component({
  selector: 'app-map-layout-page',
  imports: [NgStyle, RouterLink],
  templateUrl: './map-layout.page.html',
  styleUrl: './map-layout.page.scss',
})
export class MapLayoutPage {
  readonly snap = MAP_LAYOUT_SNAP;
  readonly layout = signal<MapLayout>(loadInitialLayout());
  readonly selectedId = signal<string | null>(null);
  readonly filter = signal<'all' | MarkerGroup>('all');
  readonly status = signal('拖曳標記調整位置，放開後會對齊 50。');
  readonly dirty = signal(false);

  private drag: DragState | null = null;
  private boardEl: HTMLElement | null = null;

  readonly markers = computed(() => {
    const data = this.layout();
    const list: MapMarker[] = [];

    for (const [id, point] of Object.entries(data.structures)) {
      const meta = STRUCTURE_META[id];
      list.push({
        id,
        group: 'structure',
        label: meta?.label ?? id,
        side: meta?.side ?? 'blue',
        x: point.x,
        y: point.y,
      });
    }

    for (const [id, point] of Object.entries(data.objectives)) {
      list.push({
        id,
        group: 'objective',
        label: id,
        side: 'neutral',
        x: point.x,
        y: point.y,
      });
    }

    for (const [id, point] of Object.entries(data.camps)) {
      const meta = CAMP_META[id];
      list.push({
        id,
        group: 'camp',
        label: meta?.label ?? id,
        side: meta?.side ?? 'neutral',
        x: point.x,
        y: point.y,
      });
    }

    list.push({
      id: 'fountain_blue',
      group: 'fountain',
      label: '藍方泉水',
      side: 'blue',
      x: data.fountains.blue.x,
      y: data.fountains.blue.y,
    });
    list.push({
      id: 'fountain_red',
      group: 'fountain',
      label: '紅方泉水',
      side: 'red',
      x: data.fountains.red.x,
      y: data.fountains.red.y,
    });

    return list;
  });

  readonly visibleMarkers = computed(() => {
    const filter = this.filter();
    if (filter === 'all') {
      return this.markers();
    }
    return this.markers().filter((marker) => marker.group === filter);
  });

  readonly selected = computed(() => {
    const id = this.selectedId();
    if (!id) {
      return null;
    }
    return this.markers().find((marker) => marker.id === id) ?? null;
  });

  mapX(x: number): number {
    return (x / MAP_LAYOUT_MAX) * 100;
  }

  mapY(y: number): number {
    return (1 - y / MAP_LAYOUT_MAX) * 100;
  }

  markerStyle(marker: MapMarker): Record<string, string> {
    if (marker.group === 'structure' && marker.side !== 'neutral') {
      return scoreboardIconStyle('tower', marker.side, 28);
    }
    if (marker.group === 'objective') {
      const icon = mapObjectiveIcon(marker.id);
      if (icon) {
        return scoreboardIconStyle(icon, 'blue', 28);
      }
    }
    if (marker.group === 'fountain') {
      return {
        width: '18px',
        height: '18px',
        borderRadius: '999px',
        background: marker.side === 'red' ? '#ff7a7a' : '#7ad0ff',
        border: '3px solid #fff',
        boxShadow: '0 0 0 2px rgb(0 0 0 / 45%)',
      };
    }
    return {
      width: '14px',
      height: '14px',
      borderRadius: '999px',
      background: marker.side === 'red' ? '#d45d5d' : marker.side === 'blue' ? '#5da8d4' : '#d4c15d',
      border: '2px solid #fff',
    };
  }

  setFilter(filter: 'all' | MarkerGroup): void {
    this.filter.set(filter);
  }

  select(id: string): void {
    this.selectedId.set(id);
  }

  startDrag(event: PointerEvent, marker: MapMarker, board: HTMLElement): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.boardEl = board;
    this.selectedId.set(marker.id);
    this.drag = {
      id: marker.id,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originX: marker.x,
      originY: marker.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.drag || !this.boardEl) {
      return;
    }
    const rect = this.boardEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }
    const dxPct = (event.clientX - this.drag.originClientX) / rect.width;
    const dyPct = (event.clientY - this.drag.originClientY) / rect.height;
    const nextX = clampMapCoord(this.drag.originX + dxPct * MAP_LAYOUT_MAX);
    const nextY = clampMapCoord(this.drag.originY - dyPct * MAP_LAYOUT_MAX);
    this.writePoint(this.drag.id, {
      x: snapMapCoord(nextX),
      y: snapMapCoord(nextY),
    });
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  endDrag(): void {
    this.drag = null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const selected = this.selected();
    if (!selected) {
      return;
    }
    const step = event.shiftKey ? this.snap * 2 : this.snap;
    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') {
      dx = -step;
    } else if (event.key === 'ArrowRight') {
      dx = step;
    } else if (event.key === 'ArrowUp') {
      dy = step;
    } else if (event.key === 'ArrowDown') {
      dy = -step;
    } else {
      return;
    }
    event.preventDefault();
    this.writePoint(selected.id, {
      x: clampMapCoord(snapMapCoord(selected.x + dx)),
      y: clampMapCoord(snapMapCoord(selected.y + dy)),
    });
  }

  nudge(dx: number, dy: number): void {
    const selected = this.selected();
    if (!selected) {
      return;
    }
    this.writePoint(selected.id, {
      x: clampMapCoord(snapMapCoord(selected.x + dx * this.snap)),
      y: clampMapCoord(snapMapCoord(selected.y + dy * this.snap)),
    });
  }

  resetSelected(): void {
    const id = this.selectedId();
    if (!id) {
      return;
    }
    const point = findDefaultPoint(id);
    if (!point) {
      return;
    }
    this.writePoint(id, { ...point });
    this.status.set(`已還原 ${id} 到預設座標。`);
  }

  resetAll(): void {
    this.layout.set(cloneMapLayout(DEFAULT_MAP_LAYOUT));
    this.dirty.set(false);
    localStorage.removeItem(DRAFT_KEY);
    this.status.set('已還原成目前專案內建座標。');
  }

  saveDraft(): void {
    localStorage.setItem(DRAFT_KEY, serializeMapLayout(this.layout()));
    this.status.set('草稿已存到瀏覽器 localStorage。');
  }

  async saveFile(): Promise<void> {
    const text = serializeMapLayout(this.layout());
    localStorage.setItem(DRAFT_KEY, text);

    const picker = window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<FileSystemFileHandle>;
    };

    if (typeof picker.showSaveFilePicker === 'function') {
      try {
        const handle = await picker.showSaveFilePicker({
          suggestedName: 'map-layout.json',
          types: [
            {
              description: 'Map Layout JSON',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        this.dirty.set(false);
        this.status.set('已儲存 map-layout.json。請覆蓋到 src/app/shared/sim-v2/version/map-layout.json。');
        return;
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          this.status.set('已取消儲存。');
          return;
        }
      }
    }

    downloadText('map-layout.json', text);
    this.dirty.set(false);
    this.status.set('已下載 map-layout.json。請覆蓋到 src/app/shared/sim-v2/version/map-layout.json。');
  }

  async copyJson(): Promise<void> {
    const text = serializeMapLayout(this.layout());
    await navigator.clipboard.writeText(text);
    this.status.set('JSON 已複製到剪貼簿。');
  }

  private writePoint(id: string, point: MapPoint): void {
    this.layout.update((current) => {
      const next = normalizeLayout(current);
      if (id === 'fountain_blue') {
        next.fountains.blue = point;
      } else if (id === 'fountain_red') {
        next.fountains.red = point;
      } else if (id in next.structures) {
        next.structures[id] = point;
      } else if (id in next.objectives) {
        next.objectives[id as keyof MapLayout['objectives']] = point;
      } else if (id in next.camps) {
        next.camps[id] = point;
      }
      return next;
    });
    this.dirty.set(true);
    this.status.set(`${id} → (${point.x}, ${point.y})`);
  }
}

function normalizeLayout(layout: MapLayout): MapLayout {
  const next = cloneMapLayout(layout);
  next.fountains = {
    blue: next.fountains?.blue ?? { ...DEFAULT_MAP_LAYOUT.fountains.blue },
    red: next.fountains?.red ?? { ...DEFAULT_MAP_LAYOUT.fountains.red },
  };
  return next;
}

function loadInitialLayout(): MapLayout {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      return normalizeLayout(JSON.parse(raw) as MapLayout);
    }
  } catch {
    // ignore broken draft
  }
  return cloneMapLayout(DEFAULT_MAP_LAYOUT);
}

function findDefaultPoint(id: string): MapPoint | null {
  if (id === 'fountain_blue') {
    return DEFAULT_MAP_LAYOUT.fountains.blue;
  }
  if (id === 'fountain_red') {
    return DEFAULT_MAP_LAYOUT.fountains.red;
  }
  if (id in DEFAULT_MAP_LAYOUT.structures) {
    return DEFAULT_MAP_LAYOUT.structures[id] ?? null;
  }
  if (id in DEFAULT_MAP_LAYOUT.objectives) {
    return DEFAULT_MAP_LAYOUT.objectives[id as keyof MapLayout['objectives']] ?? null;
  }
  if (id in DEFAULT_MAP_LAYOUT.camps) {
    return DEFAULT_MAP_LAYOUT.camps[id] ?? null;
  }
  return null;
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
