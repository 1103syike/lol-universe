import { CHAMPION_KITS, type ChampionCombatClass, type ChampionKit } from '../../../core/data/champion-kits';
import type { AbilitySlot } from '../types/ids';
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
} from './ability-helpers';
import type { AbilityCastContext, AbilityExecutor } from './ability-helpers';

function kitOf(championId: string): ChampionKit | null {
  return CHAMPION_KITS[championId] ?? null;
}

function classOf(kit: ChampionKit | null): ChampionCombatClass {
  return kit?.combatClass ?? 'fighter';
}

function isMagic(kit: ChampionKit | null): boolean {
  return kit?.damageType === 'ap' || kit?.damageType === 'hybrid';
}

function fighterQ(ctx: AbilityCastContext, kit: ChampionKit | null): boolean {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const poke = (kit?.style.poke ?? 40) / 100;
  const raw = 55 + (r - 1) * 28 + ctx.caster.ad * (0.7 + poke * 0.35);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:q`, ctx.recorder);
  if (ctx.target.kind === 'champion') {
    const healAmt = (22 + r * 10 + ctx.caster.ad * 0.12) * (0.55 + poke * 0.7);
    heal(ctx.caster, healAmt, ctx.caster);
    if (poke >= 0.55) {
      applySlow(ctx.target, `${ctx.caster.championId}:q:slow`, 1.1, 18 + r * 3);
    }
  }
  return true;
}

function fighterW(ctx: AbilityCastContext, kit: ChampionKit | null): boolean {
  const r = rank(ctx.level);
  const engage = (kit?.style.engage ?? 50) / 100;
  applyArmor(ctx.caster, `${ctx.caster.championId}:w:armor`, 2.8, 12 + r * 4 + engage * 8);
  heal(ctx.caster, 28 + r * 16 + ctx.caster.ad * 0.08, ctx.caster);
  if (ctx.target?.kind === 'champion') {
    const raw = 35 + (r - 1) * 18 + ctx.caster.ad * 0.35;
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:w`, ctx.recorder);
  }
  return true;
}

function fighterE(ctx: AbilityCastContext, kit: ChampionKit | null): boolean {
  const r = rank(ctx.level);
  const split = (kit?.style.splitPush ?? 50) / 100;
  applyMs(ctx.caster, `${ctx.caster.championId}:e:ms`, 2.2, 45 + r * 8 + split * 20);
  if (ctx.target) {
    const raw = 40 + (r - 1) * 22 + ctx.caster.ad * 0.45;
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:e`, ctx.recorder);
  } else {
    hitChampionsInRadius(
      ctx.state,
      ctx.caster,
      300,
      28 + (r - 1) * 16 + ctx.caster.ad * 0.3,
      'physical',
      `${ctx.caster.championId}:e`,
      ctx.recorder,
    );
  }
  return true;
}

function fighterR(ctx: AbilityCastContext, kit: ChampionKit | null): boolean {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const close = (kit?.scaling.late ?? 60) / 100;
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  const raw =
    140 + (r - 1) * 90 + ctx.caster.ad * (1.1 + close * 0.4) + missing * (120 + (r - 1) * 40);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:r`, ctx.recorder);
  heal(ctx.caster, 40 + r * 25 + missing * 80, ctx.caster);
  return true;
}

function mageQ(ctx: AbilityCastContext): boolean {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 40 + ctx.caster.ap * 0.75;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', `${ctx.caster.championId}:q`, ctx.recorder);
  return true;
}

function mageW(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  if (ctx.target) {
    const raw = 50 + (r - 1) * 30 + ctx.caster.ap * 0.45;
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', `${ctx.caster.championId}:w`, ctx.recorder);
    if (ctx.target.kind === 'champion') {
      applySlow(ctx.target, `${ctx.caster.championId}:w:slow`, 1.5, 25 + r * 4);
    }
  } else {
    applyMs(ctx.caster, `${ctx.caster.championId}:w:ms`, 2, 50 + r * 8);
  }
  return true;
}

function mageE(ctx: AbilityCastContext): boolean {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 55 + (r - 1) * 30 + ctx.caster.ap * 0.55;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', `${ctx.caster.championId}:e`, ctx.recorder);
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, `${ctx.caster.championId}:e:cc`, 0.85 + r * 0.08);
  }
  return true;
}

function mageR(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  const raw = 160 + (r - 1) * 110 + ctx.caster.ap * 0.85;
  if (ctx.target) {
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', `${ctx.caster.championId}:r`, ctx.recorder);
    if (ctx.target.kind === 'champion') {
      applyStun(ctx.target, `${ctx.caster.championId}:r:cc`, 1.1);
    }
  } else {
    hitChampionsInRadius(
      ctx.state,
      ctx.caster,
      380,
      raw * 0.75,
      'magic',
      `${ctx.caster.championId}:r`,
      ctx.recorder,
    );
  }
  return true;
}

function marksmanQ(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  applyAs(ctx.caster, `${ctx.caster.championId}:q:as`, 3.5, 0.12 + r * 0.03);
  if (ctx.target) {
    const raw = 35 + (r - 1) * 25 + ctx.caster.ad * 0.9;
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:q`, ctx.recorder);
  }
  return true;
}

function marksmanW(ctx: AbilityCastContext): boolean {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 25 + (r - 1) * 35 + ctx.caster.ad * 1.05;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:w`, ctx.recorder);
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, `${ctx.caster.championId}:w:slow`, 2, 20 + r * 5);
  }
  return true;
}

function marksmanE(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  applyMs(ctx.caster, `${ctx.caster.championId}:e:ms`, 2.2, 55 + r * 10);
  if (ctx.target) {
    const raw = 30 + (r - 1) * 20 + ctx.caster.ad * 0.5;
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:e`, ctx.recorder);
  }
  return true;
}

function marksmanR(ctx: AbilityCastContext): boolean {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  const raw = 180 + (r - 1) * 100 + ctx.caster.ad * 1.4 + missing * (160 + (r - 1) * 50);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', `${ctx.caster.championId}:r`, ctx.recorder);
  return true;
}

function assassinQ(ctx: AbilityCastContext): boolean {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const magic = isMagic(kitOf(ctx.caster.championId));
  const raw = 60 + (r - 1) * 30 + (magic ? ctx.caster.ap * 0.7 : ctx.caster.ad * 0.95);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    raw,
    magic ? 'magic' : 'physical',
    `${ctx.caster.championId}:q`,
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion' || ctx.target.kind === 'monster') {
    ctx.caster.position = { ...ctx.target.position };
    ctx.caster.path = [];
    ctx.caster.moving = false;
  }
  return true;
}

function assassinW(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  applyMs(ctx.caster, `${ctx.caster.championId}:w:ms`, 2.5, 70 + r * 12);
  heal(ctx.caster, 25 + r * 15, ctx.caster);
  return true;
}

function assassinE(ctx: AbilityCastContext): boolean {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const magic = isMagic(kitOf(ctx.caster.championId));
  const raw = 45 + (r - 1) * 25 + (magic ? ctx.caster.ap * 0.5 : ctx.caster.ad * 0.65);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    raw,
    magic ? 'magic' : 'physical',
    `${ctx.caster.championId}:e`,
    ctx.recorder,
  );
  return true;
}

function assassinR(ctx: AbilityCastContext): boolean {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const magic = isMagic(kitOf(ctx.caster.championId));
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  const raw =
    150 +
    (r - 1) * 100 +
    (magic ? ctx.caster.ap * 0.9 : ctx.caster.ad * 1.6) +
    missing * (100 + (r - 1) * 40);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    raw,
    magic ? 'magic' : 'physical',
    `${ctx.caster.championId}:r`,
    ctx.recorder,
  );
  return true;
}

function tankQ(ctx: AbilityCastContext): boolean {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 25 + ctx.caster.ad * 0.4 + ctx.caster.maxHp * 0.03;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', `${ctx.caster.championId}:q`, ctx.recorder);
  applyStun(ctx.target, `${ctx.caster.championId}:q:stun`, 1 + r * 0.1);
  return true;
}

function tankW(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, `${ctx.caster.championId}:w:armor`, 3.5, 20 + r * 6);
  heal(ctx.caster, 40 + r * 22 + ctx.caster.maxHp * 0.02, ctx.caster);
  return true;
}

function tankE(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  applyMs(ctx.caster, `${ctx.caster.championId}:e:ms`, 2.5, 60 + r * 10);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    35 + (r - 1) * 18 + ctx.caster.ad * 0.3,
    'magic',
    `${ctx.caster.championId}:e`,
    ctx.recorder,
  );
  return true;
}

function tankR(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  const raw = 120 + (r - 1) * 80 + ctx.caster.ap * 0.5 + ctx.caster.maxHp * 0.06;
  const hits = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    400,
    raw,
    'magic',
    `${ctx.caster.championId}:r`,
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <= 400) {
      applyStun(enemy, `${ctx.caster.championId}:r:stun`, 1.2);
    }
  }
  return hits >= 0;
}

function supportQ(ctx: AbilityCastContext): boolean {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 20 + ctx.caster.ad * 0.3 + ctx.caster.ap * 0.35;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', `${ctx.caster.championId}:q`, ctx.recorder);
  applyStun(ctx.target, `${ctx.caster.championId}:q:cc`, 1.05);
  return true;
}

function supportW(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  heal(ctx.caster, 50 + r * 25 + ctx.caster.ap * 0.25, ctx.caster);
  applyArmor(ctx.caster, `${ctx.caster.championId}:w:armor`, 2.5, 12 + r * 4);
  const ally = ctx.state.champions.find(
    (champ) =>
      champ.alive &&
      champ.side === ctx.caster.side &&
      champ.id !== ctx.caster.id &&
      Math.hypot(champ.position.x - ctx.caster.position.x, champ.position.y - ctx.caster.position.y) < 900,
  );
  if (ally) {
    heal(ally, 40 + r * 20 + ctx.caster.ap * 0.2, ctx.caster);
    applyArmor(ally, `${ctx.caster.championId}:w:ally`, 2.5, 10 + r * 3);
  }
  return true;
}

function supportE(ctx: AbilityCastContext): boolean {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 35 + (r - 1) * 18 + ctx.caster.ap * 0.4;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', `${ctx.caster.championId}:e`, ctx.recorder);
  applySlow(ctx.target, `${ctx.caster.championId}:e:slow`, 2, 30 + r * 5);
  return true;
}

function supportR(ctx: AbilityCastContext): boolean {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    420,
    80 + (r - 1) * 50 + ctx.caster.ap * 0.45,
    'magic',
    `${ctx.caster.championId}:r`,
    ctx.recorder,
  );
  for (const ally of ctx.state.champions) {
    if (!ally.alive || ally.side !== ctx.caster.side) {
      continue;
    }
    if (Math.hypot(ally.position.x - ctx.caster.position.x, ally.position.y - ctx.caster.position.y) > 500) {
      continue;
    }
    applyArmor(ally, `${ctx.caster.championId}:r:armor`, 3, 18 + r * 5);
    heal(ally, 30 + r * 15, ctx.caster);
  }
  return true;
}

export function resolveArchetypeExecutor(
  championId: string,
  slot: AbilitySlot,
): AbilityExecutor | null {
  if (slot === 'P') {
    return null;
  }
  const kit = kitOf(championId);
  const combatClass = classOf(kit);
  const table: Record<ChampionCombatClass, Record<'Q' | 'W' | 'E' | 'R', AbilityExecutor>> = {
    fighter: {
      Q: (ctx) => fighterQ(ctx, kit),
      W: (ctx) => fighterW(ctx, kit),
      E: (ctx) => fighterE(ctx, kit),
      R: (ctx) => fighterR(ctx, kit),
    },
    mage: { Q: mageQ, W: mageW, E: mageE, R: mageR },
    marksman: { Q: marksmanQ, W: marksmanW, E: marksmanE, R: marksmanR },
    assassin: { Q: assassinQ, W: assassinW, E: assassinE, R: assassinR },
    tank: { Q: tankQ, W: tankW, E: tankE, R: tankR },
    support: { Q: supportQ, W: supportW, E: supportE, R: supportR },
  };
  return table[combatClass][slot] ?? null;
}
