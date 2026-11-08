import { recomputeItemStats } from '../economy/economy';
import { dist } from '../map/pathfinding';
import type { ChampionEntity, StatusEffect } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { AbilitySlot } from '../types/ids';
import type { ReplayRecorder } from '../replay/recorder';
import { applyDamage, type Damageable } from './damage';

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
  const gained = Math.min(target.maxHp - target.hp, Math.max(0, amount));
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

export function applyStun(target: ChampionEntity, id: string, sec: number): void {
  pushStatus(target, { id, kind: 'stun', remainingSec: sec, magnitude: 1 });
}

export { dist, recomputeItemStats };
