import { DEFAULT_MAP_LAYOUT, type MapPoint } from './map-layout';
import type { MapDefinition, Vec2 } from './version-pack';

function makeWalkable(width: number, height: number): Array<Array<0 | 1>> {
  const grid: Array<Array<0 | 1>> = [];
  for (let y = 0; y < height; y += 1) {
    const row: Array<0 | 1> = [];
    for (let x = 0; x < width; x += 1) {
      const edge = x < 1 || y < 1 || x >= width - 1 || y >= height - 1;
      row.push(edge ? 0 : 1);
    }
    grid.push(row);
  }
  return grid;
}

function densify(points: Vec2[], step = 320): Vec2[] {
  if (points.length === 0) {
    return [];
  }
  const out: Vec2[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i += 1) {
    const from = points[i - 1];
    const to = points[i];
    const gap = Math.hypot(to.x - from.x, to.y - from.y);
    const segments = Math.max(1, Math.ceil(gap / step));
    for (let s = 1; s <= segments; s += 1) {
      const t = s / segments;
      out.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });
    }
  }
  return out;
}

function struct(id: string): Vec2 {
  const point = DEFAULT_MAP_LAYOUT.structures[id];
  if (!point) {
    throw new Error(`Missing structure in map layout: ${id}`);
  }
  return { x: point.x, y: point.y };
}

function camp(id: string): Vec2 {
  const point = DEFAULT_MAP_LAYOUT.camps[id];
  if (!point) {
    throw new Error(`Missing camp in map layout: ${id}`);
  }
  return { x: point.x, y: point.y };
}

function lerp(a: MapPoint, b: MapPoint, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

const MAP_CENTER = { x: 7500, y: 7500 };

function awayFromCenter(point: MapPoint, amount: number): Vec2 {
  const dx = point.x - MAP_CENTER.x;
  const dy = point.y - MAP_CENTER.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: point.x + (dx / length) * amount,
    y: point.y + (dy / length) * amount,
  };
}

function lanePoint(id: string, amount: number): Vec2 {
  return awayFromCenter(struct(id), amount);
}

function buildLaneSpines(blueFountain: Vec2, redFountain: Vec2): {
  top: Vec2[];
  mid: Vec2[];
  bot: Vec2[];
} {
  const wing = 180;
  const midBias = 40;
  const blueTopOuter = lanePoint('blue_top_outer', wing);
  const redTopOuter = lanePoint('red_top_outer', wing);
  const blueMidOuter = lanePoint('blue_mid_outer', midBias);
  const redMidOuter = lanePoint('red_mid_outer', midBias);
  const blueBotOuter = lanePoint('blue_bot_outer', wing);
  const redBotOuter = lanePoint('red_bot_outer', wing);

  return {
    top: [
      blueFountain,
      lanePoint('blue_nexus', 80),
      lanePoint('blue_inhib_top', wing),
      lanePoint('blue_top_inhib_tower', wing),
      lanePoint('blue_top_inner', wing),
      blueTopOuter,
      awayFromCenter(lerp(blueTopOuter, redTopOuter, 0.5), wing),
      redTopOuter,
      lanePoint('red_top_inner', wing),
      lanePoint('red_top_inhib_tower', wing),
      lanePoint('red_inhib_top', wing),
      lanePoint('red_nexus', 80),
      redFountain,
    ],
    mid: [
      blueFountain,
      lanePoint('blue_nexus', 40),
      lanePoint('blue_inhib_mid', midBias),
      lanePoint('blue_mid_inhib_tower', midBias),
      lanePoint('blue_mid_inner', midBias),
      blueMidOuter,
      lerp(blueMidOuter, redMidOuter, 0.5),
      redMidOuter,
      lanePoint('red_mid_inner', midBias),
      lanePoint('red_mid_inhib_tower', midBias),
      lanePoint('red_inhib_mid', midBias),
      lanePoint('red_nexus', 40),
      redFountain,
    ],
    bot: [
      blueFountain,
      lanePoint('blue_nexus', 80),
      lanePoint('blue_inhib_bot', wing),
      lanePoint('blue_bot_inhib_tower', wing),
      lanePoint('blue_bot_inner', wing),
      blueBotOuter,
      awayFromCenter(lerp(blueBotOuter, redBotOuter, 0.5), wing),
      redBotOuter,
      lanePoint('red_bot_inner', wing),
      lanePoint('red_bot_inhib_tower', wing),
      lanePoint('red_inhib_bot', wing),
      lanePoint('red_nexus', 80),
      redFountain,
    ],
  };
}

export function buildLaneApproaches(): Record<string, { blue: Vec2; red: Vec2 }> {
  return {
    TOP: {
      blue: lerp(struct('blue_top_inner'), struct('blue_top_outer'), 0.62),
      red: lerp(struct('red_top_inner'), struct('red_top_outer'), 0.62),
    },
    JUNGLE: {
      blue: camp('wolves'),
      red: camp('red_wolves'),
    },
    MID: {
      blue: lerp(struct('blue_mid_inner'), struct('blue_mid_outer'), 0.55),
      red: lerp(struct('red_mid_inner'), struct('red_mid_outer'), 0.55),
    },
    BOT: {
      blue: lerp(struct('blue_bot_inner'), struct('blue_bot_outer'), 0.62),
      red: lerp(struct('red_bot_inner'), struct('red_bot_outer'), 0.62),
    },
    SUPPORT: {
      blue: lerp(struct('blue_bot_inner'), struct('blue_bot_outer'), 0.42),
      red: lerp(struct('red_bot_inner'), struct('red_bot_outer'), 0.42),
    },
  };
}

export function buildCanonicalMap(): MapDefinition {
  const width = 75;
  const height = 75;
  const cellSize = 200;
  const blueFountain = { ...DEFAULT_MAP_LAYOUT.fountains.blue };
  const redFountain = { ...DEFAULT_MAP_LAYOUT.fountains.red };
  const spines = buildLaneSpines(blueFountain, redFountain);

  return {
    width,
    height,
    cellSize,
    walkable: makeWalkable(width, height),
    bushes: [
      { x: 3500, y: 7500 },
      { x: 11500, y: 7500 },
      { x: 7500, y: 3500 },
      { x: 7500, y: 11500 },
      { x: 5200, y: 9800 },
      { x: 9800, y: 5200 },
    ],
    blueFountain,
    redFountain,
    lanePaths: {
      top: densify(spines.top),
      mid: densify(spines.mid),
      bot: densify(spines.bot),
    },
  };
}
