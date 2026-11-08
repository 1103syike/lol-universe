import type { AbilitySlot } from '../types/ids';
import type { StatusEffect } from '../state/entities';
import type { GameState } from '../state/game-state';
import { resolveArchetypeExecutor } from './ability-archetypes';
import {
  applyArmor,
  applyAs,
  applyMs,
  applySlow,
  applyStun,
  dealToTarget,
  heal,
  hitChampionsInRadius,
  rank,
  recomputeItemStats,
  type AbilityCastContext,
  type AbilityExecutor,
} from './ability-helpers';
import { resolveCatalogExecutor } from './catalog-executor';
import { SIGNATURE_ABILITIES } from './signature-abilities';

export type { AbilityCastContext, AbilityExecutor };

function genericDamage(ctx: AbilityCastContext): boolean {
  const def = ctx.state.lockedPack.champions[ctx.caster.championId]?.abilities.find(
    (item) => item.slot === ctx.slot,
  );
  if (!def || !ctx.target || !def.tags.includes('damage')) {
    return false;
  }
  const identity = ctx.state.lockedPack.champions[ctx.caster.championId]?.identity;
  const identityMult =
    ctx.target.kind === 'champion'
      ? 0.8 + (identity?.skirmish ?? 55) / 600 + (identity?.closeout ?? 55) / 700
      : 1;
  const scaling =
    def.damageType === 'magic'
      ? ctx.caster.ap * 0.45 + ctx.caster.ad * 0.05
      : ctx.caster.ad * 0.55 + ctx.caster.ap * 0.05;
  const raw =
    (def.damageBase + def.damagePerLevel * (rank(ctx.level) - 1) + scaling) * identityMult;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    raw,
    def.damageType,
    `ability:${ctx.slot}`,
    ctx.recorder,
  );
  return true;
}

function genericUtility(ctx: AbilityCastContext): boolean {
  const def = ctx.state.lockedPack.champions[ctx.caster.championId]?.abilities.find(
    (item) => item.slot === ctx.slot,
  );
  if (!def) {
    return false;
  }
  if (def.tags.includes('damage') && ctx.target) {
    genericDamage(ctx);
  }
  if (def.tags.includes('utility')) {
    heal(ctx.caster, 20 + ctx.level * 15 + ctx.caster.ap * 0.15, ctx.caster);
    applyMs(ctx.caster, `${ctx.caster.championId}:${ctx.slot}:ms`, 2.5, 40 + ctx.level * 8);
  }
  return true;
}

const garenQ: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyMs(ctx.caster, 'garen:q:ms', 3, 60 + r * 8);
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      75 + (r - 1) * 30 + ctx.caster.ad * 0.5,
      'physical',
      'garen:q',
      ctx.recorder,
    );
  }
  return true;
};

const garenW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'garen:w:armor', 3, 15 + r * 4);
  heal(ctx.caster, 35 + r * 18, ctx.caster);
  return true;
};

const garenE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    325,
    30 + (r - 1) * 20 + ctx.caster.ad * 0.36,
    'physical',
    'garen:e',
    ctx.recorder,
  );
  return true;
};

const garenR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    150 + (r - 1) * 100 + missing * (150 + (r - 1) * 50),
    'true',
    'garen:r',
    ctx.recorder,
  );
  return true;
};

const asheW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    20 + (r - 1) * 35 + ctx.caster.ad,
    'physical',
    'ashe:w',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'ashe:w:slow', 2, 15 + r * 4);
  }
  return true;
};

const asheR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    200 + (r - 1) * 150 + ctx.caster.ad * 0.1,
    'magic',
    'ashe:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'ashe:r:stun', 1 + r * 0.25);
  return true;
};

const annieQ: AbilityExecutor = (ctx) => {
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
    'annie:q',
    ctx.recorder,
  );
  return true;
};

const annieR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    150 + (r - 1) * 125 + ctx.caster.ap * 0.75,
    'magic',
    'annie:r',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'annie:r:stun', 1.25);
  }
  return true;
};

const leeSinQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 25 + ctx.caster.ad * 1.0,
    'physical',
    'leesin:q',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion' || ctx.target.kind === 'monster') {
    ctx.caster.position = { ...ctx.target.position };
    ctx.caster.path = [];
    ctx.caster.moving = false;
  }
  return true;
};

const leeSinW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  heal(ctx.caster, 40 + r * 20 + ctx.caster.ad * 0.1, ctx.caster);
  applyMs(ctx.caster, 'leesin:w:ms', 2.5, 40 + r * 8);
  return true;
};

const leeSinR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    175 + (r - 1) * 115 + ctx.caster.ad * 2,
    'physical',
    'leesin:r',
    ctx.recorder,
  );
  const dx = ctx.target.position.x - ctx.caster.position.x;
  const dy = ctx.target.position.y - ctx.caster.position.y;
  const len = Math.hypot(dx, dy) || 1;
  ctx.target.position = {
    x: ctx.target.position.x + (dx / len) * 350,
    y: ctx.target.position.y + (dy / len) * 350,
  };
  ctx.target.path = [];
  ctx.target.moving = false;
  return true;
};

const threshQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + ctx.level * 22 + ctx.caster.ad * 0.35,
    'magic',
    'thresh:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'thresh:q:stun', 1.1);
  return true;
};

const threshE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    45 + ctx.level * 18 + ctx.caster.ad * 0.3,
    'magic',
    'thresh:e',
    ctx.recorder,
  );
  applySlow(ctx.target, 'thresh:e:slow', 2, 30 + ctx.level * 5);
  return true;
};

const ahriQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ap * 0.45;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ahri:q', ctx.recorder);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw * 0.5, 'true', 'ahri:q:return', ctx.recorder);
  return true;
};

const ahriE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 25 + ctx.caster.ap * 0.6,
    'magic',
    'ahri:e',
    ctx.recorder,
  );
  applyStun(ctx.target, 'ahri:e:charm', 1.2);
  return true;
};

const ahriR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyMs(ctx.caster, 'ahri:r:ms', 3, 100);
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      60 + (r - 1) * 40 + ctx.caster.ap * 0.35,
      'magic',
      'ahri:r',
      ctx.recorder,
    );
  }
  return true;
};

const jinxQ: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyAs(ctx.caster, 'jinx:q:as', 4, 0.15 + r * 0.03);
  ctx.caster.attackRange = Math.max(ctx.caster.attackRange, 625 + r * 15);
  return true;
};

const jinxW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    10 + (r - 1) * 50 + ctx.caster.ad * 1.4,
    'physical',
    'jinx:w',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'jinx:w:slow', 2, 30 + r * 6);
  }
  return true;
};

const jinxR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    200 + (r - 1) * 100 + ctx.caster.ad * 1.5 + missing * (200 + (r - 1) * 50),
    'physical',
    'jinx:r',
    ctx.recorder,
  );
  return true;
};

const LEGACY_SPECIAL: Record<string, AbilityExecutor> = {
  'Garen:Q': garenQ,
  'Garen:W': garenW,
  'Garen:E': garenE,
  'Garen:R': garenR,
  'Ashe:W': asheW,
  'Ashe:R': asheR,
  'Annie:Q': annieQ,
  'Annie:R': annieR,
  'LeeSin:Q': leeSinQ,
  'LeeSin:W': leeSinW,
  'LeeSin:R': leeSinR,
  'Thresh:Q': threshQ,
  'Thresh:E': threshE,
  'Ahri:Q': ahriQ,
  'Ahri:E': ahriE,
  'Ahri:R': ahriR,
  'Jinx:Q': jinxQ,
  'Jinx:W': jinxW,
  'Jinx:R': jinxR,
};

const SPECIAL: Record<string, AbilityExecutor> = {
  ...LEGACY_SPECIAL,
  ...SIGNATURE_ABILITIES,
};

export function resolveAbilityExecutor(championId: string, slot: AbilitySlot): AbilityExecutor {
  const key = `${championId}:${slot}`;
  if (SPECIAL[key]) {
    return SPECIAL[key];
  }
  return (
    resolveCatalogExecutor(championId, slot) ??
    resolveArchetypeExecutor(championId, slot) ??
    genericUtility
  );
}

export function tickStatuses(state: GameState, dt: number): void {
  for (const champion of state.champions) {
    if (!champion.alive || champion.statuses.length === 0) {
      continue;
    }
    let msBonus = 0;
    let armorBonus = 0;
    let asBonus = 0;
    let slow = 0;
    let stunned = false;
    const next: StatusEffect[] = [];
    for (const status of champion.statuses) {
      status.remainingSec -= dt;
      if (status.remainingSec <= 0) {
        continue;
      }
      next.push(status);
      if (status.kind === 'ms') {
        msBonus += status.magnitude;
      } else if (status.kind === 'armor') {
        armorBonus += status.magnitude;
      } else if (status.kind === 'as') {
        asBonus += status.magnitude;
      } else if (status.kind === 'slow') {
        slow += status.magnitude;
      } else if (status.kind === 'stun') {
        stunned = true;
      }
    }
    champion.statuses = next;
    recomputeItemStats(state, champion);
    champion.moveSpeed = Math.max(110, champion.moveSpeed + msBonus - slow);
    champion.armor += armorBonus;
    champion.attackSpeed = Math.max(0.2, champion.attackSpeed + asBonus);
    if (stunned) {
      champion.currentAction = 'stunned';
      champion.path = [];
      champion.moving = false;
    }
  }
}
