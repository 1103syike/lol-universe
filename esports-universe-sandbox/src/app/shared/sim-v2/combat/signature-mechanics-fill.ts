import { CHAMPION_COMBAT_BY_ID, type ChampionAbilityCombatData } from '../../../core/data/champion-combat';
import { CHAMPION_KITS } from '../../../core/data/champion-kits';
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
  pullTargetTo,
  rank,
  type AbilityExecutor,
} from './ability-helpers';

type DamageType = 'physical' | 'magic' | 'true';

function abilityOf(championId: string, slot: 'Q' | 'W' | 'E' | 'R'): ChampionAbilityCombatData | null {
  const combat = CHAMPION_COMBAT_BY_ID[championId];
  if (!combat) {
    return null;
  }
  return combat.abilities.find((ability) => ability.slot === slot) ?? null;
}

function rawFromAbility(
  ability: ChampionAbilityCombatData,
  level: number,
  ad: number,
  ap: number,
  bonusAd: number,
): number {
  const r = rank(level);
  const ranked = ability.damageByRank[r - 1] ?? ability.damageBase + ability.damagePerLevel * (r - 1);
  return ranked + ad * ability.adRatio + bonusAd * ability.bonusAdRatio + ap * ability.apRatio;
}

function resolveDamageType(
  championId: string,
  ability: ChampionAbilityCombatData,
): DamageType {
  const combat = CHAMPION_COMBAT_BY_ID[championId];
  const desc = ability.description.toLowerCase();
  if (/\btrue damage\b/.test(desc) && !/magic damage[\s\S]{0,80}true damage|true damage[\s\S]{0,80}magic damage/.test(desc)) {
    return 'true';
  }
  if (ability.damageType === 'true') {
    return 'true';
  }
  if (combat?.adaptiveType === 'MAGIC_DAMAGE' && ability.apRatio >= ability.adRatio && ability.damageType === 'physical') {
    return 'magic';
  }
  if (
    combat?.adaptiveType === 'PHYSICAL_DAMAGE' &&
    ability.adRatio + ability.bonusAdRatio >= ability.apRatio &&
    ability.damageType === 'magic'
  ) {
    return 'physical';
  }
  return ability.damageType;
}

function descFlags(description: string) {
  const desc = description.toLowerCase();
  return {
    dash: /\b(dash|dashes|dashing|blink|leap|lunge|charge|charges|rush|dives?)\b/.test(desc),
    stun: /\b(stun|stuns|charm|charms|root|roots|snare|knock(?:ed|s)? up|knockup|suppress|airborne|sleep|taunt|fear|fears)\b/.test(
      desc,
    ),
    slow: /\bslow/.test(desc),
    pull: /\b(pull|pulls|drag|drags|hook|hooks)\b/.test(desc),
    shield: /\bshield/.test(desc),
    heal: /\b(heal|heals|restor)/.test(desc),
    ms: /\b(movement speed|move speed|movespeed)\b/.test(desc),
    as: /\b(attack speed)\b/.test(desc),
    armor: /\b(armor|magic resist|damage reduction)\b/.test(desc),
    aoe: /\b(nearby|surrounding|around|area|enemies|units around|in a radius)\b/.test(desc),
    returnOrb: /\b(returns? to|on the way back|coming back|return trip)\b/.test(desc),
    trueReturn: /\btrue damage\b/.test(desc) && /\b(return|returns|coming back|on the way back)\b/.test(desc),
    execute: /\b(missing (?:health|hp)|lower health|execute)\b/.test(desc),
    multi: /\b(three|3 |bolts?|missiles?|shots?|strikes? twice|two strikes|fires?)\b/.test(desc),
    knockback: /\b(knock(?:s|ed)? back|knockback|push(?:es|ed)?)\b/.test(desc),
  };
}

function buildExecutor(championId: string, slot: 'Q' | 'W' | 'E' | 'R'): AbilityExecutor {
  return (ctx) => {
    const ability = abilityOf(championId, slot);
    if (!ability) {
      return false;
    }
    const flags = descFlags(ability.description);
    const via = `${championId.toLowerCase()}:${slot.toLowerCase()}`;
    const bonusAd = Math.max(0, ctx.caster.ad - 60);
    const raw = rawFromAbility(ability, ctx.level, ctx.caster.ad, ctx.caster.ap, bonusAd);
    const dtype = resolveDamageType(championId, ability);
    const r = rank(ctx.level);
    const hasDamage = raw > 1 || ability.tags.includes('damage');

    if (flags.ms) {
      applyMs(ctx.caster, `${via}:ms`, slot === 'R' ? 4 : 2, 25 + r * 5);
    }
    if (flags.as) {
      applyAs(ctx.caster, `${via}:as`, 3, 0.15 + r * 0.03);
    }
    if (flags.armor) {
      applyArmor(ctx.caster, `${via}:armor`, 3, 15 + r * 5);
    }
    if (flags.heal) {
      heal(ctx.caster, Math.max(25, raw * 0.35 + 20 + r * 10 + ctx.caster.ap * 0.1), ctx.caster);
    }
    if (flags.shield) {
      const existing = ctx.caster.statuses.find((status) => status.id === `${via}:shield`);
      const amount = Math.max(40, 50 + r * 30 + ctx.caster.ap * 0.3 + ctx.caster.ad * 0.1);
      if (existing) {
        existing.remainingSec = Math.max(existing.remainingSec, 3);
        existing.magnitude = Math.max(existing.magnitude, amount);
      } else {
        ctx.caster.statuses.push({
          id: `${via}:shield`,
          kind: 'shield',
          remainingSec: 3,
          magnitude: amount,
        });
      }
    }

    if (flags.dash && ctx.target) {
      dashCasterTo(ctx.caster, ctx.target, Math.min(650, Math.max(350, ability.range || 450)), ctx.state);
    }

    if (!hasDamage && !flags.pull && !flags.stun && !flags.slow) {
      return flags.ms || flags.as || flags.armor || flags.heal || flags.shield || flags.dash;
    }

    if (flags.aoe && (slot === 'R' || flags.multi || ability.tags.includes('aoe'))) {
      const radius = slot === 'R' ? 450 : 320;
      const hits = hitChampionsInRadius(
        ctx.state,
        ctx.caster,
        radius,
        Math.max(raw, 20 + r * 15),
        dtype,
        via,
        ctx.recorder,
      );
      if (hits === 0 && ctx.target) {
        dealToTarget(ctx.state, ctx.caster, ctx.target, Math.max(raw, 20), dtype, via, ctx.recorder);
      }
    } else if (ctx.target) {
      let dealt = Math.max(raw, hasDamage ? 15 + r * 8 : 0);
      if (flags.execute && ctx.target.kind === 'champion') {
        const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
        dealt += missing * (60 + r * 40 + ctx.caster.ap * 0.2 + ctx.caster.ad * 0.15);
      }
      if (flags.trueReturn) {
        const half = Math.max(dealt, 20);
        dealToTarget(ctx.state, ctx.caster, ctx.target, half, 'magic', via, ctx.recorder);
        dealToTarget(ctx.state, ctx.caster, ctx.target, half, 'true', `${via}:return`, ctx.recorder);
      } else if (flags.returnOrb) {
        dealToTarget(ctx.state, ctx.caster, ctx.target, dealt, dtype, via, ctx.recorder);
        dealToTarget(ctx.state, ctx.caster, ctx.target, dealt * 0.85, dtype, `${via}:return`, ctx.recorder);
      } else if (flags.multi && ctx.target.kind === 'champion') {
        dealToTarget(ctx.state, ctx.caster, ctx.target, dealt, dtype, via, ctx.recorder);
        dealToTarget(ctx.state, ctx.caster, ctx.target, dealt * 0.45, dtype, via, ctx.recorder);
        dealToTarget(ctx.state, ctx.caster, ctx.target, dealt * 0.45, dtype, via, ctx.recorder);
      } else if (dealt > 0) {
        dealToTarget(ctx.state, ctx.caster, ctx.target, dealt, dtype, via, ctx.recorder);
      }
      if (flags.pull && ctx.target.kind === 'champion') {
        pullTargetTo(ctx.caster, ctx.target, Math.min(500, ability.range || 400), ctx.state);
      }
      if (ctx.target.kind === 'champion') {
        if (flags.stun) {
          applyStun(ctx.target, `${via}:cc`, slot === 'R' ? 1.4 : 1.0);
        } else if (flags.slow) {
          applySlow(ctx.target, `${via}:slow`, 1.6, 25 + r * 4);
        }
      }
    } else if (flags.aoe) {
      hitChampionsInRadius(ctx.state, ctx.caster, 380, Math.max(raw, 25 + r * 12), dtype, via, ctx.recorder);
    }

    return true;
  };
}

export const SIGNATURE_MECHANICS_FILL: Record<string, AbilityExecutor> = (() => {
  const out: Record<string, AbilityExecutor> = {};
  for (const championId of Object.keys(CHAMPION_KITS)) {
    for (const slot of ['Q', 'W', 'E', 'R'] as const) {
      if (!abilityOf(championId, slot)) {
        continue;
      }
      out[`${championId}:${slot}`] = buildExecutor(championId, slot);
    }
  }
  return out;
})();

export function handcraftedKeyCount(): number {
  return Object.keys(SIGNATURE_MECHANICS_FILL).length;
}
