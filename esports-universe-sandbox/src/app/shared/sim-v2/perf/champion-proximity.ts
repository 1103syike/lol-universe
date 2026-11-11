import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';

export class ChampionProximityIndex {
  private time = Number.NaN;
  private n = 0;
  private xs = new Float64Array(10);
  private ys = new Float64Array(10);
  private sides = new Uint8Array(10);
  private alive = new Uint8Array(10);
  private ids: string[] = [];
  private indexById = new Map<string, number>();

  sync(state: GameState): void {
    const t = state.scheduler.time;
    const champs = state.champions;
    const n = champs.length;
    if (this.xs.length < n) {
      this.xs = new Float64Array(n);
      this.ys = new Float64Array(n);
      this.sides = new Uint8Array(n);
      this.alive = new Uint8Array(n);
    }
    this.time = t;
    this.n = n;
    this.ids.length = n;
    this.indexById.clear();
    for (let i = 0; i < n; i += 1) {
      const champ = champs[i];
      this.xs[i] = champ.position.x;
      this.ys[i] = champ.position.y;
      this.sides[i] = champ.side === 'blue' ? 0 : 1;
      this.alive[i] = champ.alive ? 1 : 0;
      this.ids[i] = champ.id;
      this.indexById.set(champ.id, i);
    }
  }

  refreshPositions(state: GameState): void {
    const champs = state.champions;
    const n = Math.min(this.n, champs.length);
    for (let i = 0; i < n; i += 1) {
      const champ = champs[i];
      this.xs[i] = champ.position.x;
      this.ys[i] = champ.position.y;
      this.alive[i] = champ.alive ? 1 : 0;
    }
  }

  isCurrent(state: GameState): boolean {
    return this.time === state.scheduler.time && this.n === state.champions.length;
  }

  countAllies(champion: ChampionEntity, radius: number): number {
    const self = this.indexById.get(champion.id);
    if (self === undefined) {
      return 0;
    }
    const r2 = radius * radius;
    const side = this.sides[self];
    const x = this.xs[self];
    const y = this.ys[self];
    let count = 0;
    for (let i = 0; i < this.n; i += 1) {
      if (i === self || !this.alive[i] || this.sides[i] !== side) {
        continue;
      }
      const dx = this.xs[i] - x;
      const dy = this.ys[i] - y;
      if (dx * dx + dy * dy <= r2) {
        count += 1;
      }
    }
    return count;
  }

  countEnemies(champion: ChampionEntity, radius: number): number {
    const self = this.indexById.get(champion.id);
    if (self === undefined) {
      return 0;
    }
    const r2 = radius * radius;
    const side = this.sides[self];
    const x = this.xs[self];
    const y = this.ys[self];
    let count = 0;
    for (let i = 0; i < this.n; i += 1) {
      if (!this.alive[i] || this.sides[i] === side) {
        continue;
      }
      const dx = this.xs[i] - x;
      const dy = this.ys[i] - y;
      if (dx * dx + dy * dy <= r2) {
        count += 1;
      }
    }
    return count;
  }

  countNearPoint(
    side: ChampionEntity['side'],
    point: { x: number; y: number },
    range: number,
    sameSide: boolean,
  ): number {
    const r2 = range * range;
    const sideBit = side === 'blue' ? 0 : 1;
    let count = 0;
    for (let i = 0; i < this.n; i += 1) {
      if (!this.alive[i]) {
        continue;
      }
      const isSame = this.sides[i] === sideBit;
      if (sameSide ? !isSame : isSame) {
        continue;
      }
      const dx = this.xs[i] - point.x;
      const dy = this.ys[i] - point.y;
      if (dx * dx + dy * dy < r2) {
        count += 1;
      }
    }
    return count;
  }

  nearestEnemy(
    champion: ChampionEntity,
  ): { enemyIndex: number; dist: number } | null {
    const self = this.indexById.get(champion.id);
    if (self === undefined) {
      return null;
    }
    const side = this.sides[self];
    const x = this.xs[self];
    const y = this.ys[self];
    let best = -1;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.n; i += 1) {
      if (!this.alive[i] || this.sides[i] === side) {
        continue;
      }
      const dx = this.xs[i] - x;
      const dy = this.ys[i] - y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best < 0) {
      return null;
    }
    return { enemyIndex: best, dist: bestDist };
  }
}

const indexes = new WeakMap<GameState, ChampionProximityIndex>();

export function getChampionProximity(state: GameState): ChampionProximityIndex {
  let index = indexes.get(state);
  if (!index) {
    index = new ChampionProximityIndex();
    indexes.set(state, index);
  }
  if (!index.isCurrent(state)) {
    index.sync(state);
  } else {
    index.refreshPositions(state);
  }
  return index;
}

export function beginChampionProximityFrame(state: GameState): ChampionProximityIndex {
  let index = indexes.get(state);
  if (!index) {
    index = new ChampionProximityIndex();
    indexes.set(state, index);
  }
  index.sync(state);
  return index;
}
