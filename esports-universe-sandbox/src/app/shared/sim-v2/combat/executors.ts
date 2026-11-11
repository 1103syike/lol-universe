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
  dashCasterTo,
  dealToTarget,
  heal,
  hitChampionsInRadius,
  rank,
  recomputeItemStats,
  type AbilityCastContext,
  type AbilityExecutor,
} from './ability-helpers';
import { withParsedAbilityEffects } from './apply-ability-effects';
import { resolveCatalogExecutor } from './catalog-executor';
import { COMBO_CHAMPION_ABILITIES } from './combo-champions';
import { COMBO_COMPLEX_ABILITIES } from './combo-complex';
import { SIGNATURE_ABILITIES } from './signature-abilities';
import { SIGNATURE_MECHANICS_FILL } from './signature-mechanics-fill';

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
  const r = rank(ctx.level);
  const ranked = def.damageByRank?.[r - 1];
  const base =
    ranked != null
      ? ranked
      : def.damageBase + def.damagePerLevel * (r - 1);
  const hasCustomRatio =
    (def.adRatio ?? 0) > 0 || (def.apRatio ?? 0) > 0 || (def.bonusAdRatio ?? 0) > 0;
  const scaling = hasCustomRatio
    ? ctx.caster.ad * (def.adRatio ?? 0) +
      ctx.caster.ad * (def.bonusAdRatio ?? 0) +
      ctx.caster.ap * (def.apRatio ?? 0)
    : def.damageType === 'magic'
      ? ctx.caster.ap * 0.45 + ctx.caster.ad * 0.05
      : ctx.caster.ad * 0.55 + ctx.caster.ap * 0.05;
  const raw = (base + scaling) * identityMult;
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

const asheQ: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyAs(ctx.caster, 'ashe:q:focus', 4, 0.2 + r * 0.05);
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
    20 + (r - 1) * 15 + ctx.caster.ad,
    'physical',
    'ashe:w',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'ashe:w:slow', 2, 15 + r * 4);
  }
  return true;
};

const asheE: AbilityExecutor = () => true;

const asheR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    200 + (r - 1) * 200 + ctx.caster.ad,
    'magic',
    'ashe:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'ashe:r:stun', 1 + r * 0.25);
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
  'Ashe:Q': asheQ,
  'Ashe:W': asheW,
  'Ashe:E': asheE,
  'Ashe:R': asheR,
  'Thresh:Q': threshQ,
  'Thresh:E': threshE,
  'Jinx:Q': jinxQ,
  'Jinx:W': jinxW,
  'Jinx:R': jinxR,
};

let specialTable: Record<string, AbilityExecutor> | null = null;

function specialAbilities(): Record<string, AbilityExecutor> {
  if (!specialTable) {
    specialTable = {
      ...SIGNATURE_MECHANICS_FILL,
      ...LEGACY_SPECIAL,
      ...SIGNATURE_ABILITIES,
      ...COMBO_CHAMPION_ABILITIES,
      ...COMBO_COMPLEX_ABILITIES,
    };
  }
  return specialTable;
}

export function handcraftedAbilityKeys(): ReadonlySet<string> {
  return new Set(Object.keys(specialAbilities()));
}

export function isHandcraftedAbility(championId: string, slot: AbilitySlot): boolean {
  return Object.prototype.hasOwnProperty.call(specialAbilities(), `${championId}:${slot}`);
}

export function resolveAbilityExecutor(championId: string, slot: AbilitySlot): AbilityExecutor {
  const key = `${championId}:${slot}`;
  const base =
    specialAbilities()[key] ??
    resolveCatalogExecutor(championId, slot) ??
    resolveArchetypeExecutor(championId, slot) ??
    genericUtility;
  if (COMBO_CHAMPION_ABILITIES[key] || COMBO_COMPLEX_ABILITIES[key]) {
    return base;
  }
  return withParsedAbilityEffects(championId, slot, base);
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
      if (status.kind !== 'form') {
        status.remainingSec -= dt;
      }
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
