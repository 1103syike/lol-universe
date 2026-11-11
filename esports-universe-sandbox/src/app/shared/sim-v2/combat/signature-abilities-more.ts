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
  pullTargetTo,
  rank,
  type AbilityExecutor,
} from './ability-helpers';

const yasuoQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ad * 1.05,
    'physical',
    'yasuo:q',
    ctx.recorder,
  );
  return true;
};
const yasuoW: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'yasuo:w:windwall', 3.5, 40);
  return true;
};
const yasuoE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 25 + ctx.caster.ad * 0.6 + ctx.caster.ap * 0.4,
    'magic',
    'yasuo:e',
    ctx.recorder,
  );
  return true;
};
const yasuoR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    180 + (r - 1) * 100 + ctx.caster.ad * 1.5,
    'physical',
    'yasuo:r',
    ctx.recorder,
  );
  applyAs(ctx.caster, 'yasuo:r:as', 5, 0.4);
  applyStun(ctx.target, 'yasuo:r:knock', 1.2);
  return true;
};

const yoneQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    45 + (r - 1) * 25 + ctx.caster.ad * 1.05,
    'physical',
    'yone:q',
    ctx.recorder,
  );
  return true;
};
const yoneW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    330,
    40 + (r - 1) * 25 + ctx.caster.ad * 0.55 + ctx.caster.ap * 0.5,
    'magic',
    'yone:w',
    ctx.recorder,
  );
  applyArmor(ctx.caster, 'yone:w:shield', 2.5, 20 + r * 6);
  return true;
};
const yoneE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'yone:e:ms', 3, 80);
  return true;
};
const yoneR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    160 + (r - 1) * 90 + ctx.caster.ad * 0.8,
    'physical',
    'yone:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'yone:r:knock', 1.3);
  return true;
};

const kaisaQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ad * 0.7 + ctx.caster.ap * 0.3,
    'physical',
    'kaisa:q',
    ctx.recorder,
  );
  return true;
};
const kaisaW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 35 + ctx.caster.ap * 1.2,
    'magic',
    'kaisa:w',
    ctx.recorder,
  );
  return true;
};
const kaisaE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'kaisa:e:ms', 2.5, 70);
  applyAs(ctx.caster, 'kaisa:e:as', 3, 0.25);
  return true;
};
const kaisaR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  applyMs(ctx.caster, 'kaisa:r:ms', 2, 100);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  applyArmor(ctx.caster, 'kaisa:r:shield', 2.5, 30);
  return true;
};

const akaliQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ap * 0.65 + ctx.caster.ad * 0.35,
    'magic',
    'akali:q',
    ctx.recorder,
  );
  return true;
};
const akaliW: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'akali:w:ms', 3, 90);
  return true;
};
const katarinaQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    65 + (r - 1) * 35 + ctx.caster.ap * 0.5,
    'magic',
    'katarina:q',
    ctx.recorder,
  );
  return true;
};
const katarinaW: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'katarina:w:ms', 2, 70);
  return true;
};
const katarinaE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    40 + (r - 1) * 25 + ctx.caster.ap * 0.45 + ctx.caster.ad * 0.5,
    'magic',
    'katarina:e',
    ctx.recorder,
  );
  return true;
};
const katarinaR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    380,
    160 + (r - 1) * 100 + ctx.caster.ap * 0.9 + ctx.caster.ad * 0.8,
    'magic',
    'katarina:r',
    ctx.recorder,
  );
  return true;
};

const azirQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 35 + ctx.caster.ap * 0.45,
    'magic',
    'azir:q',
    ctx.recorder,
  );
  return true;
};
const azirW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    45 + (r - 1) * 25 + ctx.caster.ap * 0.55,
    'magic',
    'azir:w',
    ctx.recorder,
  );
  return true;
};
const azirE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'azir:e:ms', 2, 80);
  applyArmor(ctx.caster, 'azir:e:shield', 2.5, 25);
  return true;
};
const azirR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    420,
    150 + (r - 1) * 100 + ctx.caster.ap * 0.7,
    'magic',
    'azir:r',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <=
      420
    ) {
      applyStun(enemy, 'azir:r:wall', 1.2);
    }
  }
  return true;
};

const settQ: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'sett:q:ms', 2.5, 60);
  applyAs(ctx.caster, 'sett:q:as', 3, 0.25);
  return true;
};
const settW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.caster.hp / Math.max(1, ctx.caster.maxHp);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    80 + (r - 1) * 50 + ctx.caster.ad * 0.5 + missing * 200,
    'true',
    'sett:w',
    ctx.recorder,
  );
  applyArmor(ctx.caster, 'sett:w:shield', 2, 35);
  return true;
};
const settE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    50 + (r - 1) * 25 + ctx.caster.ad * 0.6,
    'physical',
    'sett:e',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <=
      320
    ) {
      applyStun(enemy, 'sett:e:pull', 1);
    }
  }
  return true;
};
const settR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    180 + (r - 1) * 120 + ctx.caster.ad * 1.2,
    'physical',
    'sett:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'sett:r:slam', 1.4);
  return true;
};

const fioraQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ad * 0.95,
    'physical',
    'fiora:q',
    ctx.recorder,
  );
  return true;
};
const fioraW: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 40 + ctx.caster.ap * 1.0,
    'magic',
    'fiora:w',
    ctx.recorder,
  );
  applyStun(ctx.target, 'fiora:w:stun', 1.2);
  return true;
};
const fioraE: AbilityExecutor = (ctx) => {
  applyAs(ctx.caster, 'fiora:e:as', 3, 0.35);
  return true;
};
const fioraR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    ctx.target.maxHp * (0.12 + r * 0.04) + ctx.caster.ad * 0.8,
    'true',
    'fiora:r',
    ctx.recorder,
  );
  heal(ctx.caster, 100 + r * 50, ctx.caster);
  return true;
};

const jaxQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ad * 1.0,
    'physical',
    'jax:q',
    ctx.recorder,
  );
  return true;
};
const jaxW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.6,
    'magic',
    'jax:w',
    ctx.recorder,
  );
  return true;
};
const jaxE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'jax:e:dodge', 2, 35);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    55 + (r - 1) * 30 + ctx.caster.ad * 0.7,
    'physical',
    'jax:e',
    ctx.recorder,
  );
  return true;
};
const jaxR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyAs(ctx.caster, 'jax:r:as', 8, 0.3);
  applyArmor(ctx.caster, 'jax:r:armor', 8, 25 + r * 8);
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      100 + (r - 1) * 70 + ctx.caster.ad * 0.8,
      'physical',
      'jax:r',
      ctx.recorder,
    );
  }
  return true;
};

const gwenQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.5,
    'magic',
    'gwen:q',
    ctx.recorder,
  );
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    ctx.target.kind === 'champion' ? ctx.target.maxHp * 0.02 : 20,
    'true',
    'gwen:q:true',
    ctx.recorder,
  );
  return true;
};
const gwenW: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'gwen:w:mist', 4, 40);
  return true;
};
const gwenE: AbilityExecutor = (ctx) => {
  applyAs(ctx.caster, 'gwen:e:as', 3.5, 0.3);
  applyMs(ctx.caster, 'gwen:e:ms', 2.5, 50);
  return true;
};
const gwenR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    150 + (r - 1) * 100 + ctx.caster.ap * 0.8,
    'magic',
    'gwen:r',
    ctx.recorder,
  );
  return true;
};

const lucianQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 35 + ctx.caster.ad * 0.9,
    'physical',
    'lucian:q',
    ctx.recorder,
  );
  return true;
};
const lucianW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.9,
    'magic',
    'lucian:w',
    ctx.recorder,
  );
  applyMs(ctx.caster, 'lucian:w:ms', 2, 50);
  return true;
};
const lucianE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'lucian:e:ms', 2, 80);
  applyAs(ctx.caster, 'lucian:e:as', 2.5, 0.2);
  return true;
};
const lucianR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    200 + (r - 1) * 120 + ctx.caster.ad * 1.2,
    'physical',
    'lucian:r',
    ctx.recorder,
  );
  return true;
};

const caitlynQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 40 + ctx.caster.ad * 1.3,
    'physical',
    'caitlyn:q',
    ctx.recorder,
  );
  return true;
};
const caitlynW: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  applyStun(ctx.target, 'caitlyn:w:trap', 1.5);
  return true;
};
const caitlynE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ap * 0.8,
    'magic',
    'caitlyn:e',
    ctx.recorder,
  );
  applyMs(ctx.caster, 'caitlyn:e:ms', 2, 70);
  return true;
};
const caitlynR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    250 + (r - 1) * 150 + ctx.caster.ad * 2,
    'physical',
    'caitlyn:r',
    ctx.recorder,
  );
  return true;
};

const malphiteQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ap * 0.6,
    'magic',
    'malphite:q',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'malphite:q:slow', 2.5, 30);
  }
  return true;
};
const malphiteW: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'malphite:w:armor', 4, 25);
  applyAs(ctx.caster, 'malphite:w:as', 3, 0.2);
  return true;
};
const malphiteE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    50 + (r - 1) * 25 + ctx.caster.ap * 0.4 + ctx.caster.armor * 0.3,
    'magic',
    'malphite:e',
    ctx.recorder,
  );
  return true;
};
const malphiteR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  if (ctx.target) {
    dashCasterTo(ctx.caster, ctx.target, 1000, ctx.state);
  }
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    400,
    160 + (r - 1) * 100 + ctx.caster.ap * 0.9,
    'magic',
    'malphite:r',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <=
      400
    ) {
      knockbackTargetAway(ctx.caster, enemy, 240, ctx.state);
      applyStun(enemy, 'malphite:r:knock', 1.5);
    }
  }
  return true;
};

const ornnQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ad * 1.1,
    'physical',
    'ornn:q',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'ornn:q:slow', 2, 30);
  }
  return true;
};
const ornnW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'ornn:w:armor', 3, 20);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    55 + (r - 1) * 30 + ctx.caster.ad * 0.4,
    'magic',
    'ornn:w',
    ctx.recorder,
  );
  return true;
};
const ornnE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 40 + ctx.caster.ad * 0.5,
    'physical',
    'ornn:e',
    ctx.recorder,
  );
  applyStun(ctx.target, 'ornn:e:knock', 1.1);
  return true;
};
const ornnR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    450,
    140 + (r - 1) * 90 + ctx.caster.ad * 0.4,
    'magic',
    'ornn:r',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <=
      450
    ) {
      applyStun(enemy, 'ornn:r:knock', 1.3);
    }
  }
  return true;
};

const sejuaniQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 40 + ctx.caster.ap * 0.6,
    'magic',
    'sejuani:q',
    ctx.recorder,
  );
  return true;
};
const sejuaniW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    55 + (r - 1) * 30 + ctx.caster.ap * 0.45,
    'magic',
    'sejuani:w',
    ctx.recorder,
  );
  return true;
};
const sejuaniE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  applyStun(ctx.target, 'sejuani:e:stun', 1.1);
  return true;
};
const sejuaniR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    150 + (r - 1) * 100 + ctx.caster.ap * 0.8,
    'magic',
    'sejuani:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'sejuani:r:stun', 1.6);
  return true;
};

const jarvanQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 30 + ctx.caster.ad * 1.2,
    'physical',
    'jarvan:q',
    ctx.recorder,
  );
  return true;
};
const jarvanW: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'jarvan:w:shield', 3, 30);
  heal(ctx.caster, 40, ctx.caster);
  return true;
};
const jarvanE: AbilityExecutor = (ctx) => {
  applyAs(ctx.caster, 'jarvan:e:as', 3, 0.25);
  applyMs(ctx.caster, 'jarvan:e:ms', 2, 50);
  return true;
};
const jarvanR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    160 + (r - 1) * 100 + ctx.caster.ad * 1.5,
    'physical',
    'jarvan:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'jarvan:r:lock', 1.2);
  return true;
};

const rivenQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    45 + (r - 1) * 25 + ctx.caster.ad * 0.95,
    'physical',
    'riven:q',
    ctx.recorder,
  );
  applyMs(ctx.caster, 'riven:q:ms', 1.5, 50);
  return true;
};
const rivenW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    280,
    55 + (r - 1) * 30 + ctx.caster.ad * 1.0,
    'physical',
    'riven:w',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <=
      280
    ) {
      applyStun(enemy, 'riven:w:stun', 0.95);
    }
  }
  return true;
};
const rivenE: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'riven:e:shield', 2.5, 30);
  applyMs(ctx.caster, 'riven:e:ms', 2, 60);
  return true;
};
const rivenR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const missing =
    ctx.target.kind === 'champion' ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp) : 0;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    100 + (r - 1) * 70 + ctx.caster.ad * 1.8 + missing * 150,
    'physical',
    'riven:r',
    ctx.recorder,
  );
  return true;
};

const ireliaQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    40 + (r - 1) * 25 + ctx.caster.ad * 0.8,
    'physical',
    'irelia:q',
    ctx.recorder,
  );
  heal(ctx.caster, 25 + r * 10, ctx.caster);
  return true;
};
const ireliaW: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'irelia:w:guard', 2.5, 25);
  if (ctx.target) {
    const r = rank(ctx.level);
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      50 + (r - 1) * 30 + ctx.caster.ad * 0.5 + ctx.caster.ap * 0.4,
      'physical',
      'irelia:w',
      ctx.recorder,
    );
  }
  return true;
};
const ireliaE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 30 + ctx.caster.ap * 0.7,
    'magic',
    'irelia:e',
    ctx.recorder,
  );
  applyStun(ctx.target, 'irelia:e:stun', 1.1);
  return true;
};
const ireliaR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    125 + (r - 1) * 80 + ctx.caster.ad * 0.7 + ctx.caster.ap * 0.7,
    'magic',
    'irelia:r',
    ctx.recorder,
  );
  applyMs(ctx.caster, 'irelia:r:ms', 4, 60);
  return true;
};

const blitzcrankQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    80 + (r - 1) * 45 + ctx.caster.ap * 1.0,
    'magic',
    'blitz:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'blitz:q:grab', 1.2);
  pullTargetTo(ctx.caster, ctx.target, undefined, ctx.state);
  return true;
};
const blitzcrankW: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'blitz:w:ms', 3, 90);
  return true;
};
const blitzcrankE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  applyStun(ctx.target, 'blitz:e:knock', 1.1);
  return true;
};
const blitzcrankR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    380,
    150 + (r - 1) * 100 + ctx.caster.ap * 0.8,
    'magic',
    'blitz:r',
    ctx.recorder,
  );
  return true;
};

const luluQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 35 + ctx.caster.ap * 0.5,
    'magic',
    'lulu:q',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'lulu:q:slow', 2, 30);
  }
  return true;
};
const luluW: AbilityExecutor = (ctx) => {
  if (ctx.target?.kind === 'champion' && ctx.target.side !== ctx.caster.side) {
    applyStun(ctx.target, 'lulu:w:poly', 1.4);
    return true;
  }
  applyMs(ctx.caster, 'lulu:w:ms', 3, 70);
  applyAs(ctx.caster, 'lulu:w:as', 3, 0.2);
  return true;
};
const luluE: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'lulu:e:shield', 3, 30);
  heal(ctx.caster, 40, ctx.caster);
  return true;
};
const luluR: AbilityExecutor = (ctx) => {
  heal(ctx.caster, 150, ctx.caster);
  applyArmor(ctx.caster, 'lulu:r:giant', 4, 40);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    80 + rank(ctx.level) * 40 + ctx.caster.ap * 0.4,
    'magic',
    'lulu:r',
    ctx.recorder,
  );
  return true;
};

const jannaQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 35 + ctx.caster.ap * 0.65,
    'magic',
    'janna:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'janna:q:knock', 1.2);
  return true;
};
const jannaW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.5,
    'magic',
    'janna:w',
    ctx.recorder,
  );
  applyMs(ctx.caster, 'janna:w:ms', 2.5, 60);
  return true;
};
const jannaE: AbilityExecutor = (ctx) => {
  applyArmor(ctx.caster, 'janna:e:shield', 3, 35);
  return true;
};
const jannaR: AbilityExecutor = (ctx) => {
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    400,
    60 + rank(ctx.level) * 30,
    'magic',
    'janna:r',
    ctx.recorder,
  );
  for (const ally of ctx.state.champions) {
    if (!ally.alive || ally.side !== ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(ally.position.x - ctx.caster.position.x, ally.position.y - ctx.caster.position.y) <=
      450
    ) {
      heal(ally, 120 + rank(ctx.level) * 40 + ctx.caster.ap * 0.4, ctx.caster);
    }
  }
  return true;
};

const apheliosQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 28 + ctx.caster.ad * 0.7,
    'physical',
    'aphelios:q',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'aphelios:q:slow', 1.2, 20 + r * 3);
  }
  return true;
};
const apheliosW: AbilityExecutor = (ctx) => {
  applyAs(ctx.caster, 'aphelios:w:as', 3, 0.18 + rank(ctx.level) * 0.02);
  return true;
};
const apheliosE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'aphelios:e:ms', 2.2, 45 + rank(ctx.level) * 5);
  applyArmor(ctx.caster, 'aphelios:e:cover', 2, 10 + rank(ctx.level) * 3);
  return true;
};
const apheliosR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    140 + (r - 1) * 90 + ctx.caster.ad * 0.9 + ctx.caster.ap * 0.5,
    'physical',
    'aphelios:r',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'aphelios:r:root', 1.4, 45);
  }
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    280,
    40 + (r - 1) * 25 + ctx.caster.ad * 0.25,
    'physical',
    'aphelios:r:splash',
    ctx.recorder,
  );
  return true;
};

const missFortuneQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ad * 1.0 + ctx.caster.ap * 0.35,
    'physical',
    'mf:q',
    ctx.recorder,
  );
  return true;
};
const missFortuneW: AbilityExecutor = (ctx) => {
  applyAs(ctx.caster, 'mf:w:as', 4, 0.35);
  applyMs(ctx.caster, 'mf:w:ms', 3, 50);
  return true;
};
const missFortuneE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.8,
    'magic',
    'mf:e',
    ctx.recorder,
  );
  return true;
};
const missFortuneR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    450,
    200 + (r - 1) * 130 + ctx.caster.ad * 1.2,
    'physical',
    'mf:r',
    ctx.recorder,
  );
  return true;
};

export const SIGNATURE_ABILITIES_MORE: Record<string, AbilityExecutor> = {
  'Yasuo:Q': yasuoQ,
  'Yasuo:W': yasuoW,
  'Yasuo:E': yasuoE,
  'Yasuo:R': yasuoR,
  'Yone:Q': yoneQ,
  'Yone:W': yoneW,
  'Yone:E': yoneE,
  'Yone:R': yoneR,
  'Kaisa:Q': kaisaQ,
  'Kaisa:W': kaisaW,
  'Kaisa:E': kaisaE,
  'Kaisa:R': kaisaR,
  'Akali:Q': akaliQ,
  'Akali:W': akaliW,
  'Katarina:Q': katarinaQ,
  'Katarina:W': katarinaW,
  'Katarina:E': katarinaE,
  'Katarina:R': katarinaR,
  'Azir:Q': azirQ,
  'Azir:W': azirW,
  'Azir:E': azirE,
  'Azir:R': azirR,
  'Sett:Q': settQ,
  'Sett:W': settW,
  'Sett:E': settE,
  'Sett:R': settR,
  'Fiora:Q': fioraQ,
  'Fiora:W': fioraW,
  'Fiora:E': fioraE,
  'Fiora:R': fioraR,
  'Jax:Q': jaxQ,
  'Jax:W': jaxW,
  'Jax:E': jaxE,
  'Jax:R': jaxR,
  'Gwen:Q': gwenQ,
  'Gwen:W': gwenW,
  'Gwen:E': gwenE,
  'Gwen:R': gwenR,
  'Lucian:Q': lucianQ,
  'Lucian:W': lucianW,
  'Lucian:E': lucianE,
  'Lucian:R': lucianR,
  'Caitlyn:Q': caitlynQ,
  'Caitlyn:W': caitlynW,
  'Caitlyn:E': caitlynE,
  'Caitlyn:R': caitlynR,
  'Malphite:Q': malphiteQ,
  'Malphite:W': malphiteW,
  'Malphite:E': malphiteE,
  'Malphite:R': malphiteR,
  'Ornn:Q': ornnQ,
  'Ornn:W': ornnW,
  'Ornn:E': ornnE,
  'Ornn:R': ornnR,
  'Sejuani:Q': sejuaniQ,
  'Sejuani:W': sejuaniW,
  'Sejuani:E': sejuaniE,
  'Sejuani:R': sejuaniR,
  'JarvanIV:Q': jarvanQ,
  'JarvanIV:W': jarvanW,
  'JarvanIV:E': jarvanE,
  'JarvanIV:R': jarvanR,
  'Riven:Q': rivenQ,
  'Riven:W': rivenW,
  'Riven:E': rivenE,
  'Riven:R': rivenR,
  'Irelia:Q': ireliaQ,
  'Irelia:W': ireliaW,
  'Irelia:E': ireliaE,
  'Irelia:R': ireliaR,
  'Blitzcrank:Q': blitzcrankQ,
  'Blitzcrank:W': blitzcrankW,
  'Blitzcrank:E': blitzcrankE,
  'Blitzcrank:R': blitzcrankR,
  'Lulu:Q': luluQ,
  'Lulu:W': luluW,
  'Lulu:E': luluE,
  'Lulu:R': luluR,
  'Janna:Q': jannaQ,
  'Janna:W': jannaW,
  'Janna:E': jannaE,
  'Janna:R': jannaR,
  'Aphelios:Q': apheliosQ,
  'Aphelios:W': apheliosW,
  'Aphelios:E': apheliosE,
  'Aphelios:R': apheliosR,
  'MissFortune:Q': missFortuneQ,
  'MissFortune:W': missFortuneW,
  'MissFortune:E': missFortuneE,
  'MissFortune:R': missFortuneR,
};
