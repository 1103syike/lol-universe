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
import {
  bakePaintMask,
  countWalkableCells,
  createPaintShapeId,
  DEFAULT_STROKE_WIDTH,
  MAX_STROKE_WIDTH,
  MIN_STROKE_WIDTH,
  PAINT_MASK_CELL,
  PAINT_MASK_HEIGHT,
  PAINT_MASK_WIDTH,
  stampMaskBrush,
  strokeFromDrag,
  walkableToPngDataUrl,
  type MapPaintShape,
} from '../../shared/sim-v2/version/map-paint';
import {
  buildDefaultRoads,
  MAP_ROAD_IDS,
  nearestRoadSegment,
  pointsToSvgPolyline,
  type MapRoadId,
} from '../../shared/sim-v2/version/map-roads';
import {
  clearHandles,
  makeSmoothHandles,
  wallToSvgPath,
} from '../../shared/sim-v2/version/map-walls';
import { buildMonsters, buildStructures } from '../../shared/sim-v2/version/shared-content';

type EditorMode = 'paint' | 'markers' | 'lanes';
type PaintTool = 'draw' | 'erase' | 'select';
type MarkerGroup = 'structure' | 'objective' | 'camp' | 'fountain';

type MapMarker = {
  id: string;
  group: MarkerGroup;
  label: string;
  side: ScoreboardSide | 'neutral';
  x: number;
  y: number;
};

type RangeRing = {
  id: string;
  kind: 'tower' | 'fountain';
  side: ScoreboardSide | 'neutral';
  x: number;
  y: number;
  range: number;
  label: string;
};

type MarkerDragState = {
  kind: 'marker';
  id: string;
  originClientX: number;
  originClientY: number;
  originX: number;
  originY: number;
};

type DrawDragState = {
  kind: 'draw';
  from: MapPoint;
  to: MapPoint;
};

type EraseDragState = {
  kind: 'erase';
};

type ShapePointDragState = {
  kind: 'shape-point';
  shapeId: string;
  pointIndex: number;
  originClientX: number;
  originClientY: number;
  originX: number;
  originY: number;
};

type HandleDragState = {
  kind: 'handle';
  shapeId: string;
  pointIndex: number;
  which: 'in' | 'out';
  originClientX: number;
  originClientY: number;
  originX: number;
  originY: number;
};

type LanePointDragState = {
  kind: 'lane-point';
  laneId: MapRoadId;
  pointIndex: number;
  originClientX: number;
  originClientY: number;
  originX: number;
  originY: number;
};

type DragState =
  | MarkerDragState
  | DrawDragState
  | EraseDragState
  | ShapePointDragState
  | HandleDragState
  | LanePointDragState;

const DRAFT_KEY = 'map-layout-draft-v10';

const STRUCTURE_META = Object.fromEntries(
  buildStructures().map((item) => [
    item.id,
    {
      label: `${item.side} ${item.kind}${item.lane ? ` ${item.lane}` : ''}`,
      side: item.side as ScoreboardSide,
      kind: item.kind,
      canAttack: item.range > 0,
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
  readonly mapMax = MAP_LAYOUT_MAX;
  readonly minStrokeWidth = MIN_STROKE_WIDTH;
  readonly maxStrokeWidth = MAX_STROKE_WIDTH;
  readonly layout = signal<MapLayout>(loadInitialLayout());
  readonly mode = signal<EditorMode>('paint');
  readonly paintTool = signal<PaintTool>('draw');
  readonly strokeWidth = signal(DEFAULT_STROKE_WIDTH);
  readonly selectedId = signal<string | null>(null);
  readonly selectedShapeId = signal<string | null>(null);
  readonly selectedPointIndex = signal<number | null>(null);
  readonly selectedLaneId = signal<MapRoadId | null>('top');
  readonly selectedLanePointIndex = signal<number | null>(null);
  readonly showTowerRanges = signal(true);
  readonly showFountainRanges = signal(true);
  readonly showMaskPreview = signal(true);
  readonly filter = signal<'all' | MarkerGroup>('all');
  readonly status = signal('按住起點拖到終點放開＝畫一條路。線寬可調。');
  readonly dirty = signal(false);
  readonly maskPreviewUrl = signal<string | null>(null);
  readonly drawPreview = signal<{ from: MapPoint; to: MapPoint } | null>(null);
  readonly cursorWorld = signal<MapPoint | null>(null);

  private drag: DragState | null = null;
  private boardEl: HTMLElement | null = null;

  readonly brushCursorStyle = computed(() => {
    const point = this.cursorWorld();
    if (!point) {
      return null;
    }
    const sizePct = (this.strokeWidth() / MAP_LAYOUT_MAX) * 100;
    return {
      left: `${this.mapX(point.x)}%`,
      top: `${this.mapY(point.y)}%`,
      width: `${sizePct}%`,
      height: `${sizePct}%`,
    };
  });

  readonly hasPaintMask = computed(() => !!this.layout().paintMask);

  readonly maskCells = computed(() => {
    const mask = this.layout().paintMask;
    if (!mask) {
      return [] as Array<{ key: string; x: number; y: number; size: number }>;
    }
    const cells: Array<{ key: string; x: number; y: number; size: number }> = [];
    for (let cy = 0; cy < mask.length; cy += 1) {
      for (let cx = 0; cx < (mask[cy]?.length ?? 0); cx += 1) {
        if (mask[cy][cx] !== 1) {
          continue;
        }
        cells.push({
          key: `${cx}_${cy}`,
          x: cx * PAINT_MASK_CELL,
          y: MAP_LAYOUT_MAX - (cy + 1) * PAINT_MASK_CELL,
          size: PAINT_MASK_CELL,
        });
      }
    }
    return cells;
  });

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

  readonly shapes = computed(() => this.layout().paintShapes);

  readonly selectedShape = computed((): MapPaintShape | null => {
    const id = this.selectedShapeId();
    if (!id) {
      return null;
    }
    return this.shapes().find((shape) => shape.id === id) ?? null;
  });

  readonly selectedPoint = computed(() => {
    const shape = this.selectedShape();
    const index = this.selectedPointIndex();
    if (!shape || index === null || index < 0 || index >= shape.points.length) {
      return null;
    }
    return shape.points[index];
  });

  readonly shapePaths = computed(() =>
    this.shapes().map((shape) => ({
      id: shape.id,
      label: shape.label,
      width: shape.width,
      d: wallToSvgPath(shape, MAP_LAYOUT_MAX),
      selected: this.selectedShapeId() === shape.id,
    })),
  );

  readonly draftLinePoints = computed(() => {
    const preview = this.drawPreview();
    if (!preview) {
      return '';
    }
    return `${preview.from.x},${MAP_LAYOUT_MAX - preview.from.y} ${preview.to.x},${MAP_LAYOUT_MAX - preview.to.y}`;
  });

  readonly lanePaths = computed(() =>
    MAP_ROAD_IDS.map((id) => {
      const road = this.layout().laneRoads[id];
      return {
        id,
        label: road.label,
        width: road.width,
        points: road.points,
        pointsAttr: pointsToSvgPolyline(road.points, MAP_LAYOUT_MAX),
        selected: this.selectedLaneId() === id,
      };
    }),
  );

  readonly selectedLane = computed(() => {
    const id = this.selectedLaneId();
    if (!id) {
      return null;
    }
    return this.layout().laneRoads[id] ?? null;
  });

  readonly selectedLanePoint = computed(() => {
    const lane = this.selectedLane();
    const index = this.selectedLanePointIndex();
    if (!lane || index === null || index < 0 || index >= lane.points.length) {
      return null;
    }
    return lane.points[index];
  });

  readonly towerAttackRange = computed(() => this.layout().attackRanges.tower);
  readonly fountainAttackRange = computed(() => this.layout().attackRanges.fountain);

  readonly rangeRings = computed((): RangeRing[] => {
    const data = this.layout();
    const towerRange = data.attackRanges.tower;
    const fountainRange = data.attackRanges.fountain;
    const rings: RangeRing[] = [];
    if (this.showTowerRanges()) {
      for (const [id, point] of Object.entries(data.structures)) {
        const meta = STRUCTURE_META[id];
        if (!meta?.canAttack) {
          continue;
        }
        rings.push({
          id,
          kind: 'tower',
          side: meta?.side ?? 'neutral',
          x: point.x,
          y: point.y,
          range: towerRange,
          label: meta?.label ?? id,
        });
      }
    }
    if (this.showFountainRanges()) {
      rings.push({
        id: 'fountain_blue',
        kind: 'fountain',
        side: 'blue',
        x: data.fountains.blue.x,
        y: data.fountains.blue.y,
        range: fountainRange,
        label: '藍方泉水',
      });
      rings.push({
        id: 'fountain_red',
        kind: 'fountain',
        side: 'red',
        x: data.fountains.red.x,
        y: data.fountains.red.y,
        range: fountainRange,
        label: '紅方泉水',
      });
    }
    return rings;
  });

  setMode(mode: EditorMode): void {
    this.mode.set(mode);
    this.drag = null;
    this.drawPreview.set(null);
    this.cursorWorld.set(null);
    this.selectedShapeId.set(null);
    this.selectedPointIndex.set(null);
    this.selectedLanePointIndex.set(null);
    if (mode === 'paint') {
      this.paintTool.set('draw');
      this.status.set('按住起點拖到終點放開＝畫一條路。線寬可調。');
    } else if (mode === 'lanes') {
      if (!this.selectedLaneId()) {
        this.selectedLaneId.set('top');
      }
      this.status.set('兵線模式：點線選路，拖白點微調；雙擊線段插點，Delete 刪點。');
    } else {
      this.status.set('標記模式：拖曳防禦塔／野怪／泉水座標。');
    }
  }

  selectLane(id: MapRoadId): void {
    this.selectedLaneId.set(id);
    this.selectedLanePointIndex.set(null);
    this.status.set(`已選 ${this.layout().laneRoads[id].label}。`);
  }

  selectLanePoint(laneId: MapRoadId, index: number, event?: Event): void {
    event?.stopPropagation();
    this.selectedLaneId.set(laneId);
    this.selectedLanePointIndex.set(index);
  }

  onLanePointerDown(event: PointerEvent, laneId: MapRoadId): void {
    if (this.mode() !== 'lanes' || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    this.selectLane(laneId);
  }

  onLaneDoubleClick(event: MouseEvent, board: HTMLElement): void {
    if (this.mode() !== 'lanes' || !this.selectedLaneId()) {
      return;
    }
    event.preventDefault();
    const laneId = this.selectedLaneId()!;
    const road = this.layout().laneRoads[laneId];
    const world = snapWorld(event.clientX, event.clientY, board);
    const hit = nearestRoadSegment(road, world);
    if (!hit || hit.dist > 420) {
      this.status.set('雙擊要靠近選中的兵線。');
      return;
    }
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      const points = next.laneRoads[laneId].points;
      points.splice(hit.index + 1, 0, {
        x: snapMapCoord(hit.closest.x),
        y: snapMapCoord(hit.closest.y),
      });
      return next;
    });
    this.selectedLanePointIndex.set(hit.index + 1);
    this.dirty.set(true);
    this.status.set(`已在 ${road.label} 插入控制點。`);
  }

  startLanePointDrag(
    event: PointerEvent,
    laneId: MapRoadId,
    index: number,
    board: HTMLElement,
  ): void {
    if (event.button !== 0 || this.mode() !== 'lanes') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const point = this.layout().laneRoads[laneId]?.points[index];
    if (!point) {
      return;
    }
    this.boardEl = board;
    this.selectedLaneId.set(laneId);
    this.selectedLanePointIndex.set(index);
    this.drag = {
      kind: 'lane-point',
      laneId,
      pointIndex: index,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originX: point.x,
      originY: point.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  deleteSelectedLanePoint(): void {
    const laneId = this.selectedLaneId();
    const index = this.selectedLanePointIndex();
    if (!laneId || index === null) {
      return;
    }
    const road = this.layout().laneRoads[laneId];
    if (road.points.length <= 2) {
      this.status.set('至少留兩個點。');
      return;
    }
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.laneRoads[laneId].points.splice(index, 1);
      return next;
    });
    this.selectedLanePointIndex.set(null);
    this.dirty.set(true);
    this.status.set(`已刪 ${road.label} 的控制點。`);
  }

  resetLaneRoads(): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.laneRoads = buildDefaultRoads(next);
      return next;
    });
    this.selectedLanePointIndex.set(null);
    this.dirty.set(true);
    this.status.set('已還原預設兵線（貼外緣、不穿塔心）。');
  }

  nudgeLanePoint(dx: number, dy: number): void {
    const laneId = this.selectedLaneId();
    const index = this.selectedLanePointIndex();
    const point = this.selectedLanePoint();
    if (!laneId || index === null || !point) {
      return;
    }
    this.writeLanePoint(laneId, index, {
      x: clampMapCoord(snapMapCoord(point.x + dx * this.snap)),
      y: clampMapCoord(snapMapCoord(point.y + dy * this.snap)),
    });
  }

  setPaintTool(tool: PaintTool): void {
    this.paintTool.set(tool);
    this.drawPreview.set(null);
    this.cursorWorld.set(null);
    this.drag = null;
    if (tool === 'draw') {
      this.status.set('按住起點 → 拖出一條線 → 放開完成。');
    } else if (tool === 'erase') {
      this.status.set('橡皮擦：先合成完整圖，再按住拖著擦掉格子。');
    } else {
      this.status.set('選取：點線、拖端點；黃點可微拉拉彎。');
    }
  }

  setStrokeWidth(raw: string): void {
    const width = Number(raw);
    if (!Number.isFinite(width)) {
      return;
    }
    this.strokeWidth.set(
      Math.max(MIN_STROKE_WIDTH, Math.min(MAX_STROKE_WIDTH, Math.round(width))),
    );
  }

  setSelectedStrokeWidth(raw: string): void {
    const shape = this.selectedShape();
    const width = Number(raw);
    if (!shape || !Number.isFinite(width)) {
      return;
    }
    const nextWidth = Math.max(MIN_STROKE_WIDTH, Math.min(MAX_STROKE_WIDTH, Math.round(width)));
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      const target = next.paintShapes.find((item) => item.id === shape.id);
      if (!target) {
        return current;
      }
      target.width = nextWidth;
      return next;
    });
    this.dirty.set(true);
  }

  toggleTowerRanges(): void {
    this.showTowerRanges.update((value) => !value);
  }

  toggleFountainRanges(): void {
    this.showFountainRanges.update((value) => !value);
  }

  setTowerAttackRange(raw: string | number): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    const nextRange = Math.max(200, Math.min(2000, Math.round(value)));
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.attackRanges.tower = nextRange;
      return next;
    });
    this.dirty.set(true);
    this.showTowerRanges.set(true);
    this.status.set(`防禦塔攻擊範圍改成 ${nextRange}`);
  }

  setFountainAttackRange(raw: string | number): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    const nextRange = Math.max(200, Math.min(2500, Math.round(value)));
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.attackRanges.fountain = nextRange;
      return next;
    });
    this.dirty.set(true);
    this.showFountainRanges.set(true);
    this.status.set(`溫泉塔攻擊範圍改成 ${nextRange}`);
  }

  toggleMaskPreview(): void {
    this.showMaskPreview.update((value) => !value);
  }

  mapX(x: number): number {
    return (x / MAP_LAYOUT_MAX) * 100;
  }

  mapY(y: number): number {
    return (1 - y / MAP_LAYOUT_MAX) * 100;
  }

  rangeStyle(ring: RangeRing): Record<string, string> {
    const sizePct = (ring.range * 2) / MAP_LAYOUT_MAX * 100;
    return {
      left: `${this.mapX(ring.x)}%`,
      top: `${this.mapY(ring.y)}%`,
      width: `${sizePct}%`,
      height: `${sizePct}%`,
    };
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

  selectShape(id: string): void {
    this.selectedShapeId.set(id);
    this.selectedPointIndex.set(null);
    this.paintTool.set('select');
  }

  onShapePointerDown(event: PointerEvent, shapeId: string): void {
    if (this.paintTool() === 'draw' || this.paintTool() === 'erase') {
      return;
    }
    event.stopPropagation();
    this.selectShape(shapeId);
  }

  selectShapePoint(shapeId: string, index: number, event?: Event): void {
    event?.stopPropagation();
    this.selectedShapeId.set(shapeId);
    this.selectedPointIndex.set(index);
    this.paintTool.set('select');
  }

  onBoardPointerMoveHover(event: PointerEvent, board: HTMLElement): void {
    if (this.mode() !== 'paint') {
      this.cursorWorld.set(null);
      return;
    }
    if (this.paintTool() !== 'draw' && this.paintTool() !== 'erase') {
      this.cursorWorld.set(null);
      return;
    }
    this.cursorWorld.set(snapWorld(event.clientX, event.clientY, board));
  }

  onBoardPointerLeave(): void {
    if (this.drag?.kind === 'draw' || this.drag?.kind === 'erase') {
      return;
    }
    this.cursorWorld.set(null);
  }

  onBoardPointerDown(event: PointerEvent, board: HTMLElement): void {
    if (this.mode() !== 'paint' || event.button !== 0) {
      return;
    }
    const tool = this.paintTool();
    if (tool !== 'draw' && tool !== 'erase') {
      return;
    }
    event.preventDefault();
    const point = snapWorld(event.clientX, event.clientY, board);
    this.boardEl = board;
    this.cursorWorld.set(point);
    if (tool === 'erase') {
      this.ensurePaintMask();
      this.drag = { kind: 'erase' };
      this.applyMaskBrushAt(point, 0);
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      return;
    }
    this.drag = {
      kind: 'draw',
      from: point,
      to: point,
    };
    this.drawPreview.set({ from: point, to: point });
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  startDrag(event: PointerEvent, marker: MapMarker, board: HTMLElement): void {
    if (event.button !== 0 || this.mode() !== 'markers') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.boardEl = board;
    this.selectedId.set(marker.id);
    this.drag = {
      kind: 'marker',
      id: marker.id,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originX: marker.x,
      originY: marker.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  startShapePointDrag(
    event: PointerEvent,
    shapeId: string,
    index: number,
    board: HTMLElement,
  ): void {
    if (event.button !== 0 || this.mode() !== 'paint') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const shape = this.layout().paintShapes.find((item) => item.id === shapeId);
    const point = shape?.points[index];
    if (!point) {
      return;
    }
    this.boardEl = board;
    this.selectedShapeId.set(shapeId);
    this.selectedPointIndex.set(index);
    this.paintTool.set('select');
    this.drag = {
      kind: 'shape-point',
      shapeId,
      pointIndex: index,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originX: point.x,
      originY: point.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  startHandleDrag(
    event: PointerEvent,
    shapeId: string,
    index: number,
    which: 'in' | 'out',
    board: HTMLElement,
  ): void {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const shape = this.layout().paintShapes.find((item) => item.id === shapeId);
    const point = shape?.points[index];
    const handle = which === 'in' ? point?.handleIn : point?.handleOut;
    if (!point || !handle) {
      return;
    }
    this.boardEl = board;
    this.selectedShapeId.set(shapeId);
    this.selectedPointIndex.set(index);
    this.drag = {
      kind: 'handle',
      shapeId,
      pointIndex: index,
      which,
      originClientX: event.clientX,
      originClientY: event.clientY,
      originX: handle.x,
      originY: handle.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.drag) {
      return;
    }
    if (this.drag.kind === 'draw') {
      if (!this.boardEl) {
        return;
      }
      const to = snapWorld(event.clientX, event.clientY, this.boardEl);
      this.drag = {
        ...this.drag,
        to,
      };
      this.drawPreview.set({ from: this.drag.from, to });
      this.cursorWorld.set(to);
      return;
    }
    if (this.drag.kind === 'erase') {
      if (!this.boardEl) {
        return;
      }
      const point = snapWorld(event.clientX, event.clientY, this.boardEl);
      this.cursorWorld.set(point);
      this.applyMaskBrushAt(point, 0);
      return;
    }
    if (!this.boardEl) {
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
    const point = {
      x: snapMapCoord(nextX),
      y: snapMapCoord(nextY),
    };
    if (this.drag.kind === 'marker') {
      this.writePoint(this.drag.id, point);
      return;
    }
    if (this.drag.kind === 'shape-point') {
      this.writeShapePoint(this.drag.shapeId, this.drag.pointIndex, point);
      return;
    }
    if (this.drag.kind === 'lane-point') {
      this.writeLanePoint(this.drag.laneId, this.drag.pointIndex, point);
      return;
    }
    this.writeHandle(this.drag.shapeId, this.drag.pointIndex, this.drag.which, point);
  }

  @HostListener('window:pointerup')
  @HostListener('window:pointercancel')
  endDrag(): void {
    if (this.drag?.kind === 'draw') {
      const { from, to } = this.drag;
      this.drag = null;
      this.drawPreview.set(null);
      this.commitDragStroke(from, to);
      return;
    }
    this.drag = null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.mode() === 'paint') {
      if (event.key === 'Escape') {
        this.drag = null;
        this.drawPreview.set(null);
        this.status.set('已取消。');
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if ((event.target as HTMLElement | null)?.tagName === 'INPUT') {
          return;
        }
        event.preventDefault();
        this.deleteSelectedShape();
      }
      return;
    }
    if (this.mode() === 'lanes') {
      if (event.key === 'Escape') {
        this.selectedLanePointIndex.set(null);
        this.status.set('已取消選點。');
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if ((event.target as HTMLElement | null)?.tagName === 'INPUT') {
          return;
        }
        event.preventDefault();
        this.deleteSelectedLanePoint();
        return;
      }
      const point = this.selectedLanePoint();
      const laneId = this.selectedLaneId();
      const index = this.selectedLanePointIndex();
      if (!point || !laneId || index === null) {
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
      this.writeLanePoint(laneId, index, {
        x: clampMapCoord(snapMapCoord(point.x + dx)),
        y: clampMapCoord(snapMapCoord(point.y + dy)),
      });
      return;
    }
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

  deleteSelectedShape(): void {
    const shapeId = this.selectedShapeId();
    if (!shapeId) {
      return;
    }
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.paintShapes = next.paintShapes.filter((shape) => shape.id !== shapeId);
      return next;
    });
    this.selectedShapeId.set(null);
    this.selectedPointIndex.set(null);
    this.dirty.set(true);
    this.status.set('已刪這條線。');
  }

  clearPaint(): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.paintShapes = [];
      next.paintMask = null;
      return next;
    });
    this.selectedShapeId.set(null);
    this.selectedPointIndex.set(null);
    this.maskPreviewUrl.set(null);
    this.dirty.set(true);
    this.status.set('已清空全部路線與可走圖。');
  }

  clearMaskOnly(): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.paintMask = null;
      return next;
    });
    this.maskPreviewUrl.set(null);
    this.dirty.set(true);
    this.status.set('已清除合成圖，路線線段仍保留，可再合成。');
  }

  bendSelectedShape(): void {
    const shape = this.selectedShape();
    if (!shape) {
      return;
    }
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      const index = next.paintShapes.findIndex((item) => item.id === shape.id);
      if (index < 0) {
        return current;
      }
      next.paintShapes[index] = makeSmoothHandles(next.paintShapes[index], 0.42);
      return next;
    });
    this.dirty.set(true);
    this.status.set('已產生可拉的弧點，拖黃點微調。');
  }

  straightenSelectedShape(): void {
    const shape = this.selectedShape();
    if (!shape) {
      return;
    }
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      const index = next.paintShapes.findIndex((item) => item.id === shape.id);
      if (index < 0) {
        return current;
      }
      next.paintShapes[index] = clearHandles(next.paintShapes[index]);
      return next;
    });
    this.dirty.set(true);
    this.status.set('已改回直線。');
  }

  buildCompleteMask(): void {
    const mask = this.bakeMaskFromShapes();
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.paintMask = mask;
      return next;
    });
    const url = walkableToPngDataUrl(mask, 6);
    this.maskPreviewUrl.set(url || null);
    this.dirty.set(true);
    this.paintTool.set('erase');
    this.status.set(
      `已合成完整可走圖：${this.layout().paintShapes.length} 條線 → ${countWalkableCells(mask)} 格。可直接用橡皮擦微調。`,
    );
  }

  downloadMaskPng(): void {
    let url = this.maskPreviewUrl();
    if (!url) {
      this.buildCompleteMask();
      url = this.maskPreviewUrl();
    }
    if (!url) {
      this.status.set('合成失敗，沒有圖可下載。');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'map-walkable.png';
    anchor.click();
    this.status.set('已下載 map-walkable.png（綠＝可走）。');
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
    this.selectedShapeId.set(null);
    this.selectedPointIndex.set(null);
    this.selectedLanePointIndex.set(null);
    this.drawPreview.set(null);
    this.maskPreviewUrl.set(null);
    this.status.set('已還原成目前專案內建座標與預設兵線。');
  }

  saveDraft(): void {
    localStorage.setItem(DRAFT_KEY, serializeMapLayout(this.layout()));
    this.status.set('草稿已存到瀏覽器 localStorage（重新整理還在，但不會寫進專案檔）。');
  }

  async saveToProject(): Promise<void> {
    const text = serializeMapLayout(this.layout());
    localStorage.setItem(DRAFT_KEY, text);
    const endpoints = ['/dev/save-map-layout', 'http://127.0.0.1:8765/save-map-layout'];
    let lastError = 'unknown';
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: text,
        });
        const payload = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          shapes?: number;
          lanes?: Record<string, number>;
        } | null;
        if (!response.ok || !payload?.ok) {
          lastError = payload?.error ?? `HTTP ${response.status}`;
          continue;
        }
        this.dirty.set(false);
        const laneText = payload.lanes
          ? `兵線 ${Object.entries(payload.lanes)
              .map(([id, count]) => `${id}:${count}`)
              .join(' / ')}`
          : '';
        this.status.set(
          `已寫入專案 map-layout.json（畫路 ${payload.shapes ?? '?'} 條${laneText ? `，${laneText}` : ''}）。`,
        );
        return;
      } catch (error) {
        lastError = String(error);
      }
    }
    this.status.set(
      `寫入專案失敗：${lastError}。請另開終端跑 npm run map:save-server，或先用「下載 JSON」。`,
    );
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
        this.status.set('已另存 JSON。若要進模擬，請改按「寫入專案」。');
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
    this.status.set('已下載 JSON。若要進模擬，請改按「寫入專案」。');
  }

  async copyJson(): Promise<void> {
    const text = serializeMapLayout(this.layout());
    await navigator.clipboard.writeText(text);
    this.status.set('JSON 已複製到剪貼簿。');
  }

  private fountainPads() {
    const data = this.layout();
    const radius = data.attackRanges.fountain * 0.55;
    return [
      { point: data.fountains.blue, radius },
      { point: data.fountains.red, radius },
    ];
  }

  private bakeMaskFromShapes() {
    return bakePaintMask(
      this.layout().paintShapes,
      this.fountainPads(),
      PAINT_MASK_WIDTH,
      PAINT_MASK_HEIGHT,
      PAINT_MASK_CELL,
    );
  }

  private ensurePaintMask(): void {
    if (this.layout().paintMask) {
      return;
    }
    const mask = this.bakeMaskFromShapes();
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.paintMask = mask;
      return next;
    });
    this.maskPreviewUrl.set(walkableToPngDataUrl(mask, 6) || null);
    this.dirty.set(true);
    this.status.set('尚未合成，已先依現有路線自動產生可走圖，可繼續擦。');
  }

  private applyMaskBrushAt(point: MapPoint, value: 0 | 1): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      if (!next.paintMask) {
        return current;
      }
      next.paintMask = stampMaskBrush(next.paintMask, point, this.strokeWidth(), value);
      return next;
    });
    const mask = this.layout().paintMask;
    if (mask) {
      this.maskPreviewUrl.set(walkableToPngDataUrl(mask, 6) || null);
    }
    this.dirty.set(true);
  }

  private commitDragStroke(from: MapPoint, to: MapPoint): void {
    const id = createPaintShapeId(this.layout().paintShapes);
    const shape = strokeFromDrag(
      id,
      `線 ${this.layout().paintShapes.length + 1}`,
      from,
      to,
      this.strokeWidth(),
    );
    if (!shape) {
      this.status.set('拖太短了，再拉長一點。');
      return;
    }
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      next.paintShapes.push(shape);
      if (next.paintMask) {
        let mask = next.paintMask;
        const samples = shape.points;
        for (let i = 0; i < samples.length; i += 1) {
          mask = stampMaskBrush(mask, samples[i], shape.width, 1);
        }
        if (samples.length >= 2) {
          const steps = Math.max(
            2,
            Math.ceil(Math.hypot(samples[1].x - samples[0].x, samples[1].y - samples[0].y) / 80),
          );
          for (let s = 1; s < steps; s += 1) {
            const t = s / steps;
            mask = stampMaskBrush(
              mask,
              {
                x: samples[0].x + (samples[1].x - samples[0].x) * t,
                y: samples[0].y + (samples[1].y - samples[0].y) * t,
              },
              shape.width,
              1,
            );
          }
        }
        next.paintMask = mask;
      }
      return next;
    });
    this.selectedShapeId.set(null);
    this.selectedPointIndex.set(null);
    this.paintTool.set('draw');
    this.dirty.set(true);
    const mask = this.layout().paintMask;
    if (mask) {
      this.maskPreviewUrl.set(walkableToPngDataUrl(mask, 6) || null);
    }
    this.status.set(`已畫上路 ${id}。可繼續畫；要微調先合成後用橡皮擦。`);
  }

  private writePoint(id: string, point: MapPoint): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
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

  private writeShapePoint(shapeId: string, index: number, point: MapPoint): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      const shape = next.paintShapes.find((item) => item.id === shapeId);
      if (!shape || !shape.points[index]) {
        return current;
      }
      const prev = shape.points[index];
      const dx = point.x - prev.x;
      const dy = point.y - prev.y;
      shape.points[index] = {
        ...prev,
        x: point.x,
        y: point.y,
        handleIn: prev.handleIn
          ? { x: prev.handleIn.x + dx, y: prev.handleIn.y + dy }
          : null,
        handleOut: prev.handleOut
          ? { x: prev.handleOut.x + dx, y: prev.handleOut.y + dy }
          : null,
      };
      return next;
    });
    this.dirty.set(true);
  }

  private writeHandle(
    shapeId: string,
    index: number,
    which: 'in' | 'out',
    point: MapPoint,
  ): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      const shape = next.paintShapes.find((item) => item.id === shapeId);
      if (!shape || !shape.points[index]) {
        return current;
      }
      if (which === 'in') {
        shape.points[index].handleIn = point;
      } else {
        shape.points[index].handleOut = point;
      }
      return next;
    });
    this.dirty.set(true);
  }

  private writeLanePoint(laneId: MapRoadId, index: number, point: MapPoint): void {
    this.layout.update((current) => {
      const next = cloneMapLayout(current);
      const road = next.laneRoads[laneId];
      if (!road?.points[index]) {
        return current;
      }
      road.points[index] = { x: point.x, y: point.y };
      return next;
    });
    this.dirty.set(true);
    this.status.set(`${laneId}#${index} → (${point.x}, ${point.y})`);
  }
}

function snapWorld(clientX: number, clientY: number, board: HTMLElement): MapPoint {
  const rect = board.getBoundingClientRect();
  const xRatio = (clientX - rect.left) / Math.max(1, rect.width);
  const yRatio = (clientY - rect.top) / Math.max(1, rect.height);
  return {
    x: snapMapCoord(clampMapCoord(xRatio * MAP_LAYOUT_MAX)),
    y: snapMapCoord(clampMapCoord((1 - yRatio) * MAP_LAYOUT_MAX)),
  };
}

function loadInitialLayout(): MapLayout {
  try {
    const raw =
      localStorage.getItem(DRAFT_KEY) ??
      localStorage.getItem('map-layout-draft-v8') ??
      localStorage.getItem('map-layout-draft-v7') ??
      localStorage.getItem('map-layout-draft-v6') ??
      localStorage.getItem('map-layout-draft-v5');
    if (raw) {
      const draft = cloneMapLayout(JSON.parse(raw) as MapLayout);
      const file = cloneMapLayout(DEFAULT_MAP_LAYOUT);
      if ((draft.paintShapes?.length ?? 0) >= (file.paintShapes?.length ?? 0)) {
        return draft;
      }
      return file;
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
