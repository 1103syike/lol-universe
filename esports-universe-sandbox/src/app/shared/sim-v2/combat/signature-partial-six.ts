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
  type AbilityExecutor,
} from './ability-helpers';

const jinxE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 50 + ctx.caster.ad * 1.2,
    'physical',
    'jinx:e',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'jinx:e:root', 1.4 + r * 0.05);
  }
  return true;
};

const leonaW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'leona:w:armor', 3, 20 + r * 10);
  applyArmor(ctx.caster, 'leona:w:mr', 3, 20 + r * 10);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    275,
    45 + (r - 1) * 25 + ctx.caster.ap * 0.4,
    'magic',
    'leona:w',
    ctx.recorder,
  );
  return true;
};

const leonaE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 750, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.4,
    'magic',
    'leona:e',
    ctx.recorder,
  );
  applyStun(ctx.target, 'leona:e:root', 0.5);
  return true;
};

const luxW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const amount = 45 + (r - 1) * 25 + ctx.caster.ap * 0.35;
  for (const ally of ctx.state.champions) {
    if (!ally.alive || ally.side !== ctx.caster.side) {
      continue;
    }
    const gap = Math.hypot(ally.position.x - ctx.caster.position.x, ally.position.y - ctx.caster.position.y);
    if (gap > 1000) {
      continue;
    }
    ally.statuses.push({
      id: `lux:w:shield:${ally.id}`,
      kind: 'shield',
      remainingSec: 2.5,
      magnitude: amount,
    });
  }
  return true;
};

const nautilusW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const amount = 50 + (r - 1) * 25 + ctx.caster.maxHp * 0.07 + ctx.caster.ap * 0.2;
  ctx.caster.statuses.push({
    id: 'nautilus:w:shield',
    kind: 'shield',
    remainingSec: 6,
    magnitude: amount,
  });
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      30 + (r - 1) * 20 + ctx.caster.ap * 0.4,
      'magic',
      'nautilus:w',
      ctx.recorder,
    );
  }
  return true;
};

const nautilusE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    350,
    55 + (r - 1) * 30 + ctx.caster.ap * 0.45,
    'magic',
    'nautilus:e',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    const gap = Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y);
    if (gap <= 350) {
      applySlow(enemy, 'nautilus:e:slow', 1.5, 30 + r * 5);
    }
  }
  return true;
};

const threshW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const ally =
    ctx.target && ctx.target.kind === 'champion' && ctx.target.side === ctx.caster.side
      ? ctx.target
      : ctx.state.champions
          .filter((champ) => champ.alive && champ.side === ctx.caster.side && champ.id !== ctx.caster.id)
          .sort(
            (left, right) =>
              Math.hypot(left.position.x - ctx.caster.position.x, left.position.y - ctx.caster.position.y) -
              Math.hypot(right.position.x - ctx.caster.position.x, right.position.y - ctx.caster.position.y),
          )[0];
  if (!ally) {
    return false;
  }
  ally.statuses.push({
    id: 'thresh:w:shield',
    kind: 'shield',
    remainingSec: 3,
    magnitude: 60 + r * 30 + ctx.caster.ap * 0.3,
  });
  applyMs(ally, 'thresh:w:ms', 2, 20 + r * 4);
  return true;
};

const threshR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    420,
    100 + (r - 1) * 100 + ctx.caster.ap * 0.5,
    'magic',
    'thresh:r',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    const gap = Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y);
    if (gap <= 420) {
      applySlow(enemy, 'thresh:r:slow', 2, 40 + r * 10);
      applyStun(enemy, 'thresh:r:box', 0.75);
    }
  }
  return true;
};

const viegoE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyMs(ctx.caster, 'viego:e:ms', 4, 30 + r * 6);
  applyAs(ctx.caster, 'viego:e:as', 4, 0.1 + r * 0.02);
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      40 + (r - 1) * 20 + ctx.caster.ad * 0.35,
      'physical',
      'viego:e',
      ctx.recorder,
    );
  }
  heal(ctx.caster, 20 + r * 10 + ctx.caster.ad * 0.1, ctx.caster);
  return true;
};

export const SIGNATURE_PARTIAL_SIX: Record<string, AbilityExecutor> = {
  'Jinx:E': jinxE,
  'Leona:W': leonaW,
  'Leona:E': leonaE,
  'Lux:W': luxW,
  'Nautilus:W': nautilusW,
  'Nautilus:E': nautilusE,
  'Thresh:W': threshW,
  'Thresh:R': threshR,
  'Viego:E': viegoE,
};
