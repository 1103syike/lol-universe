import {
  abilityEffectsOf,
  type AbilitySlotEffects,
} from './ability-effect-tags';
import {
  applyHardCc,
  applySlow,
  championsInRadius,
  dashCasterTo,
  knockbackTargetAway,
  pullTargetTo,
  type AbilityCastContext,
  type AbilityExecutor,
} from './ability-helpers';
import type { ChampionEntity } from '../state/entities';

function ccSeconds(effects: AbilitySlotEffects, level: number): number {
  const rankBonus = Math.max(0, level - 1) * 0.12;
  if (effects.knockup) {
    return 1.15 + rankBonus;
  }
  if (effects.hardCc) {
    return 1.0 + rankBonus;
  }
  return 0.8 + rankBonus;
}

function collectTargets(ctx: AbilityCastContext, effects: AbilitySlotEffects): ChampionEntity[] {
  if (effects.aoe || effects.knockup) {
    return championsInRadius(ctx.state, ctx.caster.position, 420, ctx.caster.side);
  }
  if (ctx.target?.kind === 'champion' && ctx.target.side !== ctx.caster.side) {
    return [ctx.target];
  }
  if (effects.knockback || effects.pull || effects.hardCc) {
    return championsInRadius(ctx.state, ctx.caster.position, 320, ctx.caster.side);
  }
  return [];
}

function applyMotionAndCc(ctx: AbilityCastContext, effects: AbilitySlotEffects): void {
  const via = `${ctx.caster.championId}:${ctx.slot}:fx`;
  const sec = ccSeconds(effects, ctx.level);
  const enemies = collectTargets(ctx, effects);
  for (const enemy of enemies) {
    if (effects.pull) {
      pullTargetTo(ctx.caster, enemy, effects.dashRange, ctx.state);
    }
    if (effects.knockback || effects.knockup) {
      knockbackTargetAway(ctx.caster, enemy, effects.knockup ? 220 : 320, ctx.state);
    }
    if (effects.hardCc || effects.knockup) {
      applyHardCc(enemy, `${via}:cc`, sec);
    } else if (effects.softCc) {
      applySlow(enemy, `${via}:slow`, Math.min(2.4, sec + 0.5), 28 + ctx.level * 3);
    }
  }
}

export function withParsedAbilityEffects(
  championId: string,
  slot: AbilityCastContext['slot'],
  base: AbilityExecutor,
): AbilityExecutor {
  const effects = abilityEffectsOf(championId, slot);
  if (!effects) {
    return base;
  }
  const needsMotion =
    effects.selfDash ||
    effects.pull ||
    effects.knockup ||
    effects.knockback ||
    effects.hardCc ||
    effects.softCc;
  if (!needsMotion) {
    return base;
  }
  return (ctx) => {
    if (effects.selfDash && ctx.target) {
      dashCasterTo(ctx.caster, ctx.target, effects.dashRange, ctx.state);
    }
    const ok = base(ctx);
    applyMotionAndCc(ctx, effects);
    return ok;
  };
}
