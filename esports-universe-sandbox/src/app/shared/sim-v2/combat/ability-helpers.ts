import { recomputeItemStats } from '../economy/economy';
import { dashToward, dashTowardWalkable, dist } from '../map/pathfinding';
import type { ChampionEntity, StatusEffect } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { AbilitySlot } from '../types/ids';
import type { ReplayRecorder } from '../replay/recorder';
import { applyDamage, type Damageable } from './damage';

const DEFAULT_DASH_RANGE = 650;

export interface AbilityCastContext {
  state: GameState;
  caster: ChampionEntity;
  slot: AbilitySlot;
  target: Damageable | null;
  level: number;
  recorder?: ReplayRecorder;
}

export type AbilityExecutor = (ctx: AbilityCastContext) => boolean;

export function pushStatus(target: ChampionEntity, effect: StatusEffect): void {
  const existing = target.statuses.find((item) => item.id === effect.id);
  if (existing) {
    existing.remainingSec = Math.max(existing.remainingSec, effect.remainingSec);
    existing.magnitude = Math.max(existing.magnitude, effect.magnitude);
    return;
  }
  target.statuses.push(effect);
}

export function heal(target: ChampionEntity, amount: number, source: ChampionEntity): void {
  const grievous = target.statuses.find((status) => status.kind === 'grievous');
  const reduced = grievous ? amount * Math.max(0.2, 1 - grievous.magnitude) : amount;
  const gained = Math.min(target.maxHp - target.hp, Math.max(0, reduced));
  target.hp += gained;
  source.healingDone += gained;
}

export function rank(level: number): number {
  return Math.max(1, level);
}

export function hitChampionsInRadius(
  state: GameState,
  caster: ChampionEntity,
  radius: number,
  raw: number,
  damageType: 'physical' | 'magic' | 'true',
  via: string,
  recorder?: ReplayRecorder,
): number {
  let hits = 0;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === caster.side) {
      continue;
    }
    if (dist(caster.position, enemy.position) > radius) {
      continue;
    }
    applyDamage(state, caster, enemy, raw, damageType, recorder, via);
    hits += 1;
  }
  return hits;
}

export function dealToTarget(
  state: GameState,
  caster: ChampionEntity,
  target: Damageable,
  raw: number,
  damageType: 'physical' | 'magic' | 'true',
  via: string,
  recorder?: ReplayRecorder,
): void {
  applyDamage(state, caster, target, raw, damageType, recorder, via);
}

export function applyMs(caster: ChampionEntity, id: string, sec: number, magnitude: number): void {
  pushStatus(caster, { id, kind: 'ms', remainingSec: sec, magnitude });
}

export function applyAs(caster: ChampionEntity, id: string, sec: number, magnitude: number): void {
  pushStatus(caster, { id, kind: 'as', remainingSec: sec, magnitude });
}

export function applyArmor(
  caster: ChampionEntity,
  id: string,
  sec: number,
  magnitude: number,
): void {
  pushStatus(caster, { id, kind: 'armor', remainingSec: sec, magnitude });
}

export function applySlow(
  target: ChampionEntity,
  id: string,
  sec: number,
  magnitude: number,
): void {
  pushStatus(target, { id, kind: 'slow', remainingSec: sec, magnitude });
}

export function dashCasterTo(
  caster: ChampionEntity,
  target: { position: { x: number; y: number } },
  maxRange = DEFAULT_DASH_RANGE,
  state?: GameState,
): void {
  const map = state?.lockedPack.map;
  caster.position = map
    ? dashTowardWalkable(map, caster.position, target.position, maxRange)
    : dashToward(caster.position, target.position, maxRange);
  caster.path = [];
  caster.moving = false;
}

export function pullTargetTo(
  caster: ChampionEntity,
  target: ChampionEntity,
  maxRange = DEFAULT_DASH_RANGE,
  state?: GameState,
): void {
  const map = state?.lockedPack.map;
  target.position = map
    ? dashTowardWalkable(map, target.position, caster.position, maxRange)
    : dashToward(target.position, caster.position, maxRange);
  target.path = [];
  target.moving = false;
}

export function applyStun(target: ChampionEntity, id: string, sec: number): void {
  pushStatus(target, { id, kind: 'stun', remainingSec: sec, magnitude: 1 });
}

export { dist, recomputeItemStats };
