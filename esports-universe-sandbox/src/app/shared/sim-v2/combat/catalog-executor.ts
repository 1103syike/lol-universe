import type { AbilitySlot } from '../types/ids';
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
  type AbilityCastContext,
  type AbilityExecutor,
} from './ability-helpers';
import {
  CHAMPION_ABILITY_CATALOG,
  type ChampionAbilityProfile,
  type SlotSpec,
} from './champion-ability-catalog';

function profileOf(championId: string): ChampionAbilityProfile | null {
  return CHAMPION_ABILITY_CATALOG[championId] ?? null;
}

function slotSpec(profile: ChampionAbilityProfile, slot: AbilitySlot): SlotSpec | null {
  if (slot === 'Q' || slot === 'W' || slot === 'E' || slot === 'R') {
    return profile[slot];
  }
  return null;
}

function rawDamage(ctx: AbilityCastContext, spec: SlotSpec, profile: ChampionAbilityProfile): number {
  const r = rank(ctx.level);
  return (
    spec.base +
    spec.perLevel * (r - 1) +
    ctx.caster.ad * spec.ad +
    ctx.caster.ap * spec.ap
  );
}

function maybeCc(ctx: AbilityCastContext, spec: SlotSpec, via: string): void {
  if (!ctx.target || ctx.target.kind !== 'champion' || !spec.cc || spec.cc < 0.35) {
    return;
  }
  const sec = 0.7 + spec.cc * 0.7;
  if (spec.cc >= 0.75) {
    applyStun(ctx.target, `${via}:cc`, sec);
  } else {
    applySlow(ctx.target, `${via}:slow`, Math.min(2.4, sec + 0.4), 20 + spec.cc * 30);
  }
}

function executeSlot(ctx: AbilityCastContext, profile: ChampionAbilityProfile, spec: SlotSpec): boolean {
  const via = `${profile.id}:${ctx.slot}:${spec.kind}`;
  const dtype = profile.damageType;
  const r = rank(ctx.level);
  const raw = rawDamage(ctx, spec, profile);

  switch (spec.kind) {
    case 'sweetspot': {
      if (!ctx.target) {
        return false;
      }
      const sweet = ctx.target.kind === 'champion';
      const dealt = raw * (sweet ? 1.15 : 0.8);
      dealToTarget(ctx.state, ctx.caster, ctx.target, dealt, dtype, via, ctx.recorder);
      if (sweet) {
        heal(ctx.caster, dealt * (spec.heal ?? 0.2) + 20 + r * 8, ctx.caster);
        maybeCc(ctx, spec, via);
      }
      return true;
    }
    case 'cleave':
    case 'wave':
    case 'zone': {
      const radius = spec.kind === 'zone' ? 360 : 320;
      const hits = hitChampionsInRadius(
        ctx.state,
        ctx.caster,
        radius,
        raw,
        dtype,
        via,
        ctx.recorder,
      );
      if (hits > 0 && (spec.heal ?? 0) > 0) {
        heal(ctx.caster, (20 + r * 12) * hits * (spec.heal ?? 0.15), ctx.caster);
      }
      if (ctx.target?.kind === 'champion') {
        maybeCc(ctx, spec, via);
      }
      return true;
    }
    case 'engageStrike':
    case 'slam':
    case 'strike':
    case 'burst':
    case 'poke': {
      if (!ctx.target) {
        return false;
      }
      dealToTarget(ctx.state, ctx.caster, ctx.target, raw, dtype, via, ctx.recorder);
      if ((spec.heal ?? 0) > 0 && ctx.target.kind === 'champion') {
        heal(ctx.caster, raw * (spec.heal ?? 0.1), ctx.caster);
      }
      maybeCc(ctx, spec, via);
      return true;
    }
    case 'gapclose': {
      if (!ctx.target) {
        return false;
      }
      dealToTarget(ctx.state, ctx.caster, ctx.target, raw, dtype, via, ctx.recorder);
      if (ctx.target.kind === 'champion' || ctx.target.kind === 'monster') {
        dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
      }
      return true;
    }
    case 'hook': {
      if (!ctx.target || ctx.target.kind !== 'champion') {
        return false;
      }
      dealToTarget(ctx.state, ctx.caster, ctx.target, raw, dtype, via, ctx.recorder);
      applyStun(ctx.target, `${via}:hook`, 1 + (spec.cc ?? 0.5) * 0.4);
      if ((spec.kind === 'hook' && profile.combatClass === 'tank') || profile.combatClass === 'support') {
        dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
      }
      return true;
    }
    case 'steroid': {
      applyAs(ctx.caster, `${via}:as`, 3.5, 0.12 + r * 0.03);
      if ((spec.ms ?? 0) > 0) {
        applyMs(ctx.caster, `${via}:ms`, 2.5, spec.ms ?? 50);
      }
      if (ctx.target && raw > 1) {
        dealToTarget(ctx.state, ctx.caster, ctx.target, raw * 0.7, dtype, via, ctx.recorder);
      }
      return true;
    }
    case 'guard':
    case 'shield': {
      applyArmor(ctx.caster, `${via}:armor`, 3, 12 + r * 5 + (spec.shield ?? 0.1) * 40);
      heal(ctx.caster, 30 + r * 16 + ctx.caster.maxHp * (spec.heal ?? 0.08), ctx.caster);
      if (ctx.target?.kind === 'champion' && ctx.target.side !== ctx.caster.side) {
        dealToTarget(ctx.state, ctx.caster, ctx.target, raw * 0.65, dtype, via, ctx.recorder);
      }
      if (spec.kind === 'shield') {
        const ally = ctx.state.champions.find(
          (champ) =>
            champ.alive &&
            champ.side === ctx.caster.side &&
            champ.id !== ctx.caster.id &&
            Math.hypot(
              champ.position.x - ctx.caster.position.x,
              champ.position.y - ctx.caster.position.y,
            ) < 900,
        );
        if (ally) {
          heal(ally, 25 + r * 12 + ctx.caster.ap * 0.15, ctx.caster);
          applyArmor(ally, `${via}:ally`, 2.5, 10 + r * 3);
        }
      }
      return true;
    }
    case 'fade': {
      applyMs(ctx.caster, `${via}:ms`, 2.6, spec.ms ?? 75);
      heal(ctx.caster, 20 + r * 12, ctx.caster);
      return true;
    }
    case 'dash': {
      applyMs(ctx.caster, `${via}:ms`, 2.3, spec.ms ?? 65);
      if (ctx.target) {
        dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
        dealToTarget(ctx.state, ctx.caster, ctx.target, raw, dtype, via, ctx.recorder);
        maybeCc(ctx, spec, via);
      }
      return true;
    }
    case 'snare':
    case 'peel': {
      if (!ctx.target || ctx.target.kind !== 'champion') {
        return false;
      }
      dealToTarget(ctx.state, ctx.caster, ctx.target, raw, dtype, via, ctx.recorder);
      maybeCc(ctx, { ...spec, cc: Math.max(spec.cc ?? 0.6, 0.7) }, via);
      return true;
    }
    case 'duelUlt':
    case 'executeUlt':
    case 'assassinate':
    case 'burstUlt': {
      if (!ctx.target || ctx.target.kind !== 'champion') {
        return false;
      }
      const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
      const dealt = raw + missing * raw * (spec.execute ?? 0.15);
      const damageType =
        spec.kind === 'assassinate' && missing > 0.4 ? 'true' : dtype;
      dealToTarget(ctx.state, ctx.caster, ctx.target, dealt, damageType, via, ctx.recorder);
      if ((spec.heal ?? 0) > 0) {
        heal(ctx.caster, dealt * (spec.heal ?? 0.15) + 40 + r * 20, ctx.caster);
      }
      if (spec.kind === 'assassinate' || spec.kind === 'duelUlt') {
        applyAs(ctx.caster, `${via}:as`, 5, 0.18 + r * 0.03);
        applyMs(ctx.caster, `${via}:ms`, 5, 45 + r * 8);
      }
      maybeCc(ctx, spec, via);
      return true;
    }
    case 'teamUlt': {
      if (ctx.target && (spec.cc ?? 0) >= 0.85) {
        dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
      }
      const radius = 400;
      const hits = hitChampionsInRadius(
        ctx.state,
        ctx.caster,
        radius,
        raw,
        dtype,
        via,
        ctx.recorder,
      );
      for (const enemy of ctx.state.champions) {
        if (!enemy.alive || enemy.side === ctx.caster.side) {
          continue;
        }
        if (
          Math.hypot(
            enemy.position.x - ctx.caster.position.x,
            enemy.position.y - ctx.caster.position.y,
          ) <= radius &&
          (spec.cc ?? 0) >= 0.45
        ) {
          applyStun(enemy, `${via}:aoe`, 1 + (spec.cc ?? 0.5) * 0.35);
        }
      }
      for (const ally of ctx.state.champions) {
        if (!ally.alive || ally.side !== ctx.caster.side) {
          continue;
        }
        if (
          Math.hypot(
            ally.position.x - ctx.caster.position.x,
            ally.position.y - ctx.caster.position.y,
          ) > 500
        ) {
          continue;
        }
        if (profile.combatClass === 'support' || profile.combatClass === 'tank') {
          applyArmor(ally, `${via}:armor`, 3, 14 + r * 4);
          heal(ally, 25 + r * 12, ctx.caster);
        }
      }
      if ((spec.heal ?? 0) > 0) {
        heal(ctx.caster, 50 + r * 25 + hits * 15, ctx.caster);
      }
      return true;
    }
    default:
      if (!ctx.target) {
        return false;
      }
      dealToTarget(ctx.state, ctx.caster, ctx.target, raw, dtype, via, ctx.recorder);
      return true;
  }
}

export function resolveCatalogExecutor(
  championId: string,
  slot: AbilitySlot,
): AbilityExecutor | null {
  const profile = profileOf(championId);
  if (!profile) {
    return null;
  }
  const spec = slotSpec(profile, slot);
  if (!spec) {
    return null;
  }
  return (ctx) => executeSlot(ctx, profile, spec);
}

export function catalogSize(): number {
  return Object.keys(CHAMPION_ABILITY_CATALOG).length;
}
