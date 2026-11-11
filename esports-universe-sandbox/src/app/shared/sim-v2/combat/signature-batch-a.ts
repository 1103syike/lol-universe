import { akaliState, aniviaState } from './ability-runtime-state';
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
  knockbackTargetAway,
  rank,
  type AbilityExecutor,
} from './ability-helpers';

const akaliE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = akaliState(ctx.caster);
  const r = rank(ctx.level);
  const marked =
    bag.eMarkedTargetId === ctx.target.id && bag.eMarkedUntil > now;
  if (marked) {
    dashCasterTo(ctx.caster, ctx.target, 700, ctx.state);
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      60 + (r - 1) * 35 + ctx.caster.ap * 0.55 + ctx.caster.ad * 0.5,
      'magic',
      'akali:e2',
      ctx.recorder,
    );
    bag.eMarkedTargetId = null;
    bag.eMarkedUntil = 0;
    const runtime = ctx.caster.abilities.find((ability) => ability.slot === 'E');
    if (runtime) {
      runtime.cooldownUntil = now + Math.max(5, 10 - r * 0.5);
      ctx.caster.abilityBag.customCooldownApplied = true;
    }
    return true;
  }
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    40 + (r - 1) * 25 + ctx.caster.ap * 0.4 + ctx.caster.ad * 0.35,
    'magic',
    'akali:e1',
    ctx.recorder,
  );
  bag.eMarkedTargetId = ctx.target.id;
  bag.eMarkedUntil = now + 3;
  const runtime = ctx.caster.abilities.find((ability) => ability.slot === 'E');
  if (runtime) {
    runtime.cooldownUntil = now + 0.6;
    ctx.caster.abilityBag.customCooldownApplied = true;
  }
  return true;
};

const akaliR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = akaliState(ctx.caster);
  const r = rank(ctx.level);
  if (bag.rStage === 1 && bag.rWindowUntil > now) {
    const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
    dashCasterTo(ctx.caster, ctx.target, 650, ctx.state);
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      90 + (r - 1) * 60 + ctx.caster.ap * 0.5 + missing * 140,
      'magic',
      'akali:r2',
      ctx.recorder,
    );
    bag.rStage = 0;
    bag.rWindowUntil = 0;
    return true;
  }
  dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 40 + ctx.caster.ap * 0.4 + ctx.caster.ad * 0.5,
    'magic',
    'akali:r1',
    ctx.recorder,
  );
  bag.rStage = 1;
  bag.rWindowUntil = now + 8;
  const runtime = ctx.caster.abilities.find((ability) => ability.slot === 'R');
  if (runtime) {
    runtime.cooldownUntil = now + 1.5;
    ctx.caster.abilityBag.customCooldownApplied = true;
  }
  return true;
};

const akshanQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 45 + (r - 1) * 25 + ctx.caster.ad * 0.7;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'akshan:q', ctx.recorder);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw * 0.7, 'physical', 'akshan:q:return', ctx.recorder);
  return true;
};

const akshanW: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'akshan:w:ms', 3.5, 70 + rank(ctx.level) * 8);
  applyAs(ctx.caster, 'akshan:w:as', 3.5, 0.15);
  return true;
};

const akshanE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 600, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 25 + ctx.caster.ad * 0.55,
    'physical',
    'akshan:e',
    ctx.recorder,
  );
  applyAs(ctx.caster, 'akshan:e:as', 2.5, 0.25);
  return true;
};

const akshanR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  const shots = 3 + Math.min(2, r);
  for (let i = 0; i < shots; i += 1) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      25 + (r - 1) * 15 + ctx.caster.ad * 0.25 + missing * 20,
      'physical',
      'akshan:r',
      ctx.recorder,
    );
  }
  return true;
};

const alistarQ: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const hits = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    50 + (r - 1) * 25 + ctx.caster.ap * 0.7,
    'magic',
    'alistar:q',
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
      ) <= 300
    ) {
      applyStun(enemy, 'alistar:q:knock', 1.0);
    }
  }
  return hits > 0 || !!ctx.target;
};

const alistarW: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 580, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    45 + (r - 1) * 25 + ctx.caster.ap * 0.7,
    'magic',
    'alistar:w',
    ctx.recorder,
  );
  knockbackTargetAway(ctx.caster, ctx.target, 280, ctx.state);
  applyStun(ctx.target, 'alistar:w:knock', 0.75);
  return true;
};

const alistarE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    25 + (r - 1) * 15 + ctx.caster.ap * 0.4,
    'magic',
    'alistar:e',
    ctx.recorder,
  );
  heal(ctx.caster, 20 + r * 12 + ctx.caster.ap * 0.2, ctx.caster);
  return true;
};

const alistarR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'alistar:r:armor', 5 + r, 25 + r * 10);
  applyMs(ctx.caster, 'alistar:r:ms', 3, 40);
  heal(ctx.caster, 60 + r * 40 + ctx.caster.maxHp * 0.08, ctx.caster);
  return true;
};

const ambessaQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 450, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ad * 0.75,
    'physical',
    'ambessa:q',
    ctx.recorder,
  );
  return true;
};

const ambessaW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'ambessa:w:shield', 2.5, 18 + r * 6);
  heal(ctx.caster, 35 + r * 20, ctx.caster);
  return true;
};

const ambessaE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 520, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 28 + ctx.caster.ad * 0.7,
    'physical',
    'ambessa:e',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'ambessa:e:slow', 1.2, 30 + r * 4);
  }
  return true;
};

const ambessaR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 650, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    120 + (r - 1) * 70 + ctx.caster.ad * 1.1,
    'physical',
    'ambessa:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'ambessa:r:stun', 0.9);
  applyAs(ctx.caster, 'ambessa:r:as', 4, 0.25);
  return true;
};

const amumuQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 30 + ctx.caster.ap * 0.85,
    'magic',
    'amumu:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'amumu:q:stun', 1.1);
  dashCasterTo(ctx.caster, ctx.target, 700, ctx.state);
  return true;
};

const amumuW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    15 + (r - 1) * 8 + ctx.caster.ap * 0.15 + ctx.caster.maxHp * 0.01,
    'magic',
    'amumu:w',
    ctx.recorder,
  );
  return true;
};

const amumuE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    65 + (r - 1) * 30 + ctx.caster.ap * 0.5,
    'magic',
    'amumu:e',
    ctx.recorder,
  );
  return true;
};

const amumuR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(
        enemy.position.x - ctx.caster.position.x,
        enemy.position.y - ctx.caster.position.y,
      ) > 450
    ) {
      continue;
    }
    dealToTarget(
      ctx.state,
      ctx.caster,
      enemy,
      120 + (r - 1) * 70 + ctx.caster.ap * 0.8,
      'magic',
      'amumu:r',
      ctx.recorder,
    );
    applyStun(enemy, 'amumu:r:curse', 1.5);
  }
  return true;
};

const aniviaQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const bag = aniviaState(ctx.caster);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.55,
    'magic',
    'anivia:q',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'anivia:q:stun', 1.1);
    applySlow(ctx.target, 'anivia:q:chill', 3, 30);
    bag.chilledTargetId = ctx.target.id;
    bag.chilledUntil = ctx.state.scheduler.time + 3;
  }
  return true;
};

const aniviaW: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'anivia:w:wall', 3, 15);
  if (ctx.target?.kind === 'champion') {
    applySlow(ctx.target, 'anivia:w:block', 1.5, 40);
  }
  return true;
};

const aniviaE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const bag = aniviaState(ctx.caster);
  const chilled =
    ctx.target.kind === 'champion' &&
    bag.chilledTargetId === ctx.target.id &&
    bag.chilledUntil > ctx.state.scheduler.time;
  const raw = (50 + (r - 1) * 30 + ctx.caster.ap * 0.6) * (chilled ? 2 : 1);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    raw,
    'magic',
    chilled ? 'anivia:e:chilled' : 'anivia:e',
    ctx.recorder,
  );
  return true;
};

const aniviaR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const bag = aniviaState(ctx.caster);
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(
        enemy.position.x - ctx.caster.position.x,
        enemy.position.y - ctx.caster.position.y,
      ) > 400
    ) {
      continue;
    }
    dealToTarget(
      ctx.state,
      ctx.caster,
      enemy,
      40 + (r - 1) * 25 + ctx.caster.ap * 0.3,
      'magic',
      'anivia:r',
      ctx.recorder,
    );
    applySlow(enemy, 'anivia:r:chill', 2.5, 35 + r * 4);
    bag.chilledTargetId = enemy.id;
    bag.chilledUntil = ctx.state.scheduler.time + 2.5;
  }
  return true;
};

export const SIGNATURE_BATCH_A: Record<string, AbilityExecutor> = {
  'Akali:E': akaliE,
  'Akali:R': akaliR,
  'Akshan:Q': akshanQ,
  'Akshan:W': akshanW,
  'Akshan:E': akshanE,
  'Akshan:R': akshanR,
  'Alistar:Q': alistarQ,
  'Alistar:W': alistarW,
  'Alistar:E': alistarE,
  'Alistar:R': alistarR,
  'Ambessa:Q': ambessaQ,
  'Ambessa:W': ambessaW,
  'Ambessa:E': ambessaE,
  'Ambessa:R': ambessaR,
  'Amumu:Q': amumuQ,
  'Amumu:W': amumuW,
  'Amumu:E': amumuE,
  'Amumu:R': amumuR,
  'Anivia:Q': aniviaQ,
  'Anivia:W': aniviaW,
  'Anivia:E': aniviaE,
  'Anivia:R': aniviaR,
};
