import type { ChampionEntity } from '../state/entities';
import { akaliState, ekkoState, kassadinState, leblancState } from './ability-runtime-state';
import {
  applyMs,
  applySlow,
  applyStun,
  dashCasterTo,
  dealToTarget,
  heal,
  hitChampionsInRadius,
  rank,
  type AbilityExecutor,
} from './ability-helpers';

function setCooldown(caster: ChampionEntity, slot: 'Q' | 'W' | 'E' | 'R', until: number): void {
  const runtime = caster.abilities.find((ability) => ability.slot === slot);
  if (runtime) {
    runtime.cooldownUntil = until;
    caster.abilityBag.customCooldownApplied = true;
  }
}

export const comboLeblancQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = leblancState(ctx.caster);
  const r = rank(ctx.level);
  const marked = bag.markTargetId === ctx.target.id && bag.markUntil > now;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    65 + (r - 1) * 25 + ctx.caster.ap * 0.4,
    'magic',
    marked ? 'leblanc:q:detonate' : 'leblanc:q',
    ctx.recorder,
  );
  if (marked) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      65 + (r - 1) * 25 + ctx.caster.ap * 0.4,
      'magic',
      'leblanc:q:mark',
      ctx.recorder,
    );
    bag.markTargetId = null;
    bag.markUntil = 0;
  } else if (ctx.target.kind === 'champion') {
    bag.markTargetId = ctx.target.id;
    bag.markUntil = now + 3.5;
  }
  return true;
};

export const comboLeblancW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 600, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    75 + (r - 1) * 40 + ctx.caster.ap * 0.6,
    'magic',
    'leblanc:w',
    ctx.recorder,
  );
  return true;
};

export const comboLeblancE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = leblancState(ctx.caster);
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.3,
    'magic',
    'leblanc:e',
    ctx.recorder,
  );
  applySlow(ctx.target, 'leblanc:e:slow', 1.5, 40);
  bag.markTargetId = ctx.target.id;
  bag.markUntil = now + 3.5;
  ctx.state.scheduler.scheduleAfter(1.5, `leblanc:e:root:${ctx.caster.id}`, () => {
    if (!ctx.target || ctx.target.kind !== 'champion' || !ctx.target.alive) {
      return;
    }
    applyStun(ctx.target, 'leblanc:e:root', 1.2);
  });
  return true;
};

export const comboLeblancR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 600, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    150 + (r - 1) * 100 + ctx.caster.ap * 0.75,
    'magic',
    'leblanc:r',
    ctx.recorder,
  );
  return true;
};

export const comboKassadinQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    65 + (r - 1) * 30 + ctx.caster.ap * 0.7,
    'magic',
    'kassadin:q',
    ctx.recorder,
  );
  ctx.caster.statuses.push({
    id: 'kassadin:q:shield',
    kind: 'shield',
    remainingSec: 2,
    magnitude: 40 + r * 20 + ctx.caster.ap * 0.2,
  });
  return true;
};

export const comboKassadinW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 25 + ctx.caster.ap * 0.6 + ctx.caster.ad * 0.2,
    'magic',
    'kassadin:w',
    ctx.recorder,
  );
  heal(ctx.caster, 20 + r * 10 + ctx.caster.ap * 0.1, ctx.caster);
  return true;
};

export const comboKassadinE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    80 + (r - 1) * 35 + ctx.caster.ap * 0.8,
    'magic',
    'kassadin:e',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'kassadin:e:slow', 1.5, 40 + r * 5);
  }
  return true;
};

export const comboKassadinR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = kassadinState(ctx.caster);
  if (bag.rStackUntil < now) {
    bag.rStacks = 0;
  }
  const r = rank(ctx.level);
  const stacks = bag.rStacks;
  dashCasterTo(ctx.caster, ctx.target, 500, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    80 + (r - 1) * 40 + ctx.caster.ap * 0.4 + stacks * (40 + ctx.caster.ap * 0.1),
    'magic',
    'kassadin:r',
    ctx.recorder,
  );
  bag.rStacks = Math.min(4, stacks + 1);
  bag.rStackUntil = now + 20;
  setCooldown(ctx.caster, 'R', now + Math.max(2, 6 - stacks * 0.75));
  return true;
};

export const comboEkkoQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 25 + ctx.caster.ap * 0.3;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ekko:q', ctx.recorder);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw * 0.6, 'magic', 'ekko:q:return', ctx.recorder);
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'ekko:q:slow', 1.2, 30);
  }
  return true;
};

export const comboEkkoW: AbilityExecutor = (ctx) => {
  const now = ctx.state.scheduler.time;
  const bag = ekkoState(ctx.caster);
  const r = rank(ctx.level);
  bag.wSlowUntil = now + 3;
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'ekko:w:slow', 2.2, 40);
    applyStun(ctx.target, 'ekko:w:stun', 1.5);
  }
  ctx.caster.statuses.push({
    id: 'ekko:w:shield',
    kind: 'shield',
    remainingSec: 2.5,
    magnitude: 50 + r * 30 + ctx.caster.ap * 0.4,
  });
  return true;
};

export const comboEkkoE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 450, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.4,
    'magic',
    'ekko:e',
    ctx.recorder,
  );
  return true;
};

export const comboEkkoR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  heal(ctx.caster, 100 + r * 50 + ctx.caster.ap * 0.6, ctx.caster);
  applyMs(ctx.caster, 'ekko:r:ms', 2, 50);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    375,
    150 + (r - 1) * 100 + ctx.caster.ap * 1.2,
    'magic',
    'ekko:r',
    ctx.recorder,
  );
  return true;
};

export const comboPykeQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    40 + (r - 1) * 40 + ctx.caster.ad * 0.8,
    'physical',
    'pyke:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'pyke:q:stun', 1.1);
  return true;
};

export const comboPykeW: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'pyke:w:ms', 3, 40);
  return true;
};

export const comboPykeE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ad * 0.6,
    'physical',
    'pyke:e',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'pyke:e:stun', 0.9);
  }
  return true;
};

export const comboPykeR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const thresh = ctx.target.maxHp * (0.2 + r * 0.05);
  if (ctx.target.hp <= thresh) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      ctx.target.hp + 50,
      'true',
      'pyke:r:execute',
      ctx.recorder,
    );
  } else {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      100 + (r - 1) * 75 + ctx.caster.ad * 0.8,
      'physical',
      'pyke:r',
      ctx.recorder,
    );
  }
  return true;
};

export const COMBO_COMPLEX_ABILITIES: Record<string, AbilityExecutor> = {
  'Leblanc:Q': comboLeblancQ,
  'Leblanc:W': comboLeblancW,
  'Leblanc:E': comboLeblancE,
  'Leblanc:R': comboLeblancR,
  'Kassadin:Q': comboKassadinQ,
  'Kassadin:W': comboKassadinW,
  'Kassadin:E': comboKassadinE,
  'Kassadin:R': comboKassadinR,
  'Ekko:Q': comboEkkoQ,
  'Ekko:W': comboEkkoW,
  'Ekko:E': comboEkkoE,
  'Ekko:R': comboEkkoR,
  'Pyke:Q': comboPykeQ,
  'Pyke:W': comboPykeW,
  'Pyke:E': comboPykeE,
  'Pyke:R': comboPykeR,
};
