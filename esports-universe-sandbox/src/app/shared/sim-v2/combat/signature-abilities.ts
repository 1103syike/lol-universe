import { dist } from '../map/pathfinding';
import { camilleState } from './ability-runtime-state';
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
import { FORM_KIT_ABILITIES } from './form-kits';
import { SIGNATURE_ABILITIES_MORE } from './signature-abilities-more';
import { SIGNATURE_BATCH_A } from './signature-batch-a';
import { SIGNATURE_BATCH_B } from './signature-batch-b';
import { SIGNATURE_BATCH_C } from './signature-batch-c';
import { SIGNATURE_BATCH_D } from './signature-batch-d';
import { SIGNATURE_BATCH_E } from './signature-batch-e';
import { SIGNATURE_BATCH_F } from './signature-batch-f';
import { SIGNATURE_BATCH_G } from './signature-batch-g';
import { SIGNATURE_BATCH_H } from './signature-batch-h';
import { SIGNATURE_PARTIAL_SIX } from './signature-partial-six';

const camilleQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = camilleState(ctx.caster);
  const r = rank(ctx.level);
  const bonusAd = Math.max(0, ctx.caster.ad - 60);
  if (bag.qEmpoweredUntil > now) {
    const raw = 40 + (r - 1) * 20 + bonusAd * (0.4 + r * 0.04);
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'camille:q2', ctx.recorder);
    bag.qEmpoweredUntil = 0;
    const runtime = ctx.caster.abilities.find((ability) => ability.slot === 'Q');
    if (runtime) {
      runtime.cooldownUntil = now + Math.max(4.5, 9 - r * 0.6);
      ctx.caster.abilityBag.customCooldownApplied = true;
    }
    return true;
  }
  const raw = 20 + (r - 1) * 15 + ctx.caster.ad * 0.4 + bonusAd * 0.2;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'camille:q1', ctx.recorder);
  bag.qEmpoweredUntil = now + 3.5;
  const runtime = ctx.caster.abilities.find((ability) => ability.slot === 'Q');
  if (runtime) {
    runtime.cooldownUntil = now + 0.75;
    ctx.caster.abilityBag.customCooldownApplied = true;
  }
  return true;
};

const camilleW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const hits = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    340,
    55 + (r - 1) * 25 + ctx.caster.ad * 0.55,
    'physical',
    'camille:w',
    ctx.recorder,
  );
  if (hits > 0) {
    heal(ctx.caster, 18 + r * 8 + hits * 10, ctx.caster);
  }
  return true;
};

const camilleE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  ctx.caster.path = [];
  ctx.caster.moving = false;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 30 + ctx.caster.ad * 0.75,
    'physical',
    'camille:e',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'camille:e:stun', 0.75);
  }
  return true;
};

const camilleR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  applySlow(ctx.target, 'camille:r:lock', 2.2, 45 + r * 5);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    35 + (r - 1) * 30 + ctx.caster.ad * 0.45,
    'physical',
    'camille:r',
    ctx.recorder,
  );
  applyAs(ctx.caster, 'camille:r:as', 3.5, 0.22);
  return true;
};

const dariusQ: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const hits = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    360,
    65 + (r - 1) * 35 + ctx.caster.ad * 0.85,
    'physical',
    'darius:q',
    ctx.recorder,
  );
  if (hits > 0) {
    heal(ctx.caster, 40 + r * 20 + hits * 25, ctx.caster);
  }
  return hits > 0 || true;
};

const dariusW: AbilityExecutor = (ctx) => {
  applyAs(ctx.caster, 'darius:w:as', 2.5, 0.3);
  if (ctx.target) {
    const r = rank(ctx.level);
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      40 + (r - 1) * 20 + ctx.caster.ad * 0.5,
      'physical',
      'darius:w',
      ctx.recorder,
    );
  }
  return true;
};

const dariusE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  pullTargetTo(ctx.caster, ctx.target, undefined, ctx.state);
  ctx.target.path = [];
  applyStun(ctx.target, 'darius:e:pull', 0.75);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    30 + r * 15 + ctx.caster.ad * 0.3,
    'physical',
    'darius:e',
    ctx.recorder,
  );
  return true;
};

const dariusR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0.75 + missing * (150 + (r - 1) * 50);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'darius:r', ctx.recorder);
  return true;
};

const syndraQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    75 + (r - 1) * 40 + ctx.caster.ap * 0.7,
    'magic',
    'syndra:q',
    ctx.recorder,
  );
  return true;
};

const syndraW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 35 + ctx.caster.ap * 0.55,
    'magic',
    'syndra:w',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'syndra:w:slow', 1.5, 30 + r * 5);
  }
  return true;
};

const syndraE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 30 + ctx.caster.ap * 0.45,
    'magic',
    'syndra:e',
    ctx.recorder,
  );
  applyStun(ctx.target, 'syndra:e:stun', 1.2);
  return true;
};

const syndraR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const bolts = 4 + r;
  const raw = bolts * (50 + (r - 1) * 25 + ctx.caster.ap * 0.2);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'syndra:r', ctx.recorder);
  return true;
};

const oriannaQ: AbilityExecutor = (ctx) => {
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
    'orianna:q',
    ctx.recorder,
  );
  return true;
};

const oriannaW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    60 + (r - 1) * 35 + ctx.caster.ap * 0.6,
    'magic',
    'orianna:w',
    ctx.recorder,
  );
  applyMs(ctx.caster, 'orianna:w:ms', 2, 40 + r * 8);
  return true;
};

const oriannaE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'orianna:e:armor', 3, 20 + r * 6);
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  return true;
};

const oriannaR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    380,
    150 + (r - 1) * 100 + ctx.caster.ap * 0.8,
    'magic',
    'orianna:r',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <=
      380
    ) {
      applyStun(enemy, 'orianna:r:pull', 1.3);
    }
  }
  return true;
};

const zedQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 35 + ctx.caster.ad * 1.0,
    'physical',
    'zed:q',
    ctx.recorder,
  );
  return true;
};

const zedW: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'zed:w:ms', 2.5, 80);
  return true;
};

const zedE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    55 + (r - 1) * 25 + ctx.caster.ad * 0.7,
    'physical',
    'zed:e',
    ctx.recorder,
  );
  return true;
};

const zedR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const mark = ctx.target.maxHp * (0.25 + r * 0.05) + ctx.caster.ad * 0.8;
  dealToTarget(ctx.state, ctx.caster, ctx.target, mark, 'physical', 'zed:r', ctx.recorder);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  return true;
};

const kennenQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    75 + (r - 1) * 40 + ctx.caster.ap * 0.75,
    'magic',
    'kennen:q',
    ctx.recorder,
  );
  return true;
};

const kennenW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    50 + (r - 1) * 30 + ctx.caster.ap * 0.55,
    'magic',
    'kennen:w',
    ctx.recorder,
  );
  return true;
};

const kennenE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'kennen:e:ms', 2.5, 100);
  return true;
};

const kennenR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    420,
    140 + (r - 1) * 90 + ctx.caster.ap * 0.7,
    'magic',
    'kennen:r',
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
      applyStun(enemy, 'kennen:r:stun', 1.25);
    }
  }
  return true;
};

const renektonQ: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const hits = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    60 + (r - 1) * 30 + ctx.caster.ad * 0.8,
    'physical',
    'renekton:q',
    ctx.recorder,
  );
  heal(ctx.caster, 35 + r * 18 + hits * 22, ctx.caster);
  return true;
};

const renektonW: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    40 + (r - 1) * 25 + ctx.caster.ad * 0.75,
    'physical',
    'renekton:w',
    ctx.recorder,
  );
  applyStun(ctx.target, 'renekton:w:stun', 1);
  return true;
};

const renektonE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyMs(ctx.caster, 'renekton:e:ms', 2, 70 + r * 10);
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      45 + (r - 1) * 25 + ctx.caster.ad * 0.9,
      'physical',
      'renekton:e',
      ctx.recorder,
    );
  }
  return true;
};

const renektonR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  heal(ctx.caster, 150 + r * 80, ctx.caster);
  applyArmor(ctx.caster, 'renekton:r:armor', 6, 25 + r * 8);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    300,
    40 + r * 25 + ctx.caster.ad * 0.3,
    'magic',
    'renekton:r',
    ctx.recorder,
  );
  return true;
};

const jhinQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ad * 0.55 + ctx.caster.ap * 0.6,
    'physical',
    'jhin:q',
    ctx.recorder,
  );
  return true;
};

const jhinW: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 35 + ctx.caster.ad * 0.5,
    'physical',
    'jhin:w',
    ctx.recorder,
  );
  applyStun(ctx.target, 'jhin:w:root', 1.25);
  return true;
};

const jhinE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'jhin:e:ms', 2, 40);
  return true;
};

const jhinR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  const raw = 4 * (40 + (r - 1) * 30 + ctx.caster.ad * 0.25) * (1 + missing);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'jhin:r', ctx.recorder);
  return true;
};

const luxQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 40 + ctx.caster.ap * 0.7,
    'magic',
    'lux:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'lux:q:root', 1.5);
  return true;
};

const luxE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    340,
    60 + (r - 1) * 40 + ctx.caster.ap * 0.6,
    'magic',
    'lux:e',
    ctx.recorder,
  );
  return true;
};

const luxR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    300 + (r - 1) * 150 + ctx.caster.ap * 1.0,
    'magic',
    'lux:r',
    ctx.recorder,
  );
  return true;
};

const nautilusQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    55 + (r - 1) * 30 + ctx.caster.ap * 0.9,
    'magic',
    'nautilus:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'nautilus:q:root', 1.2);
  dashCasterTo(ctx.caster, ctx.target, undefined, ctx.state);
  return true;
};

const nautilusR: AbilityExecutor = (ctx) => {
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
    'nautilus:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'nautilus:r:knock', 1.5);
  return true;
};

const leonaQ: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    40 + (r - 1) * 25 + ctx.caster.ap * 0.3,
    'magic',
    'leona:q',
    ctx.recorder,
  );
  applyStun(ctx.target, 'leona:q:stun', 1.1);
  return true;
};

const leonaR: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    350,
    100 + (r - 1) * 75 + ctx.caster.ap * 0.8,
    'magic',
    'leona:r',
    ctx.recorder,
  );
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side) {
      continue;
    }
    if (
      Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <=
      350
    ) {
      applyStun(enemy, 'leona:r:stun', 1.35);
    }
  }
  return true;
};

const gravesQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0.9;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    raw,
    'physical',
    'graves:q',
    ctx.recorder,
  );
  const blast = raw * 0.9;
  const origin = ctx.target.position;
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side || enemy.id === ctx.target!.id) {
      continue;
    }
    if (Math.hypot(enemy.position.x - origin.x, enemy.position.y - origin.y) > 280) {
      continue;
    }
    dealToTarget(ctx.state, ctx.caster, enemy, blast * 0.55, 'physical', 'graves:q', ctx.recorder);
  }
  for (const minion of ctx.state.minions) {
    if (!minion.alive || minion.side === ctx.caster.side) {
      continue;
    }
    if (Math.hypot(minion.position.x - origin.x, minion.position.y - origin.y) > 280) {
      continue;
    }
    dealToTarget(ctx.state, ctx.caster, minion, blast * 0.75, 'physical', 'graves:q', ctx.recorder);
  }
  for (const monster of ctx.state.monsters) {
    if (!monster.alive || monster.id === ctx.target!.id) {
      continue;
    }
    if (monster.spawnProtectUntil > ctx.state.scheduler.time) {
      continue;
    }
    if (Math.hypot(monster.position.x - origin.x, monster.position.y - origin.y) > 300) {
      continue;
    }
    dealToTarget(ctx.state, ctx.caster, monster, blast, 'physical', 'graves:q', ctx.recorder);
  }
  return true;
};

const gravesW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  if (ctx.target.kind === 'monster') {
    const r = rank(ctx.level);
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      45 + (r - 1) * 20 + ctx.caster.ad * 0.6,
      'magic',
      'graves:w',
      ctx.recorder,
    );
    return true;
  }
  if (ctx.target.kind !== 'champion') {
    return false;
  }
  applySlow(ctx.target, 'graves:w:slow', 2.5, 40);
  return true;
};

const gravesE: AbilityExecutor = (ctx) => {
  applyMs(ctx.caster, 'graves:e:ms', 2.5, 70);
  applyArmor(ctx.caster, 'graves:e:armor', 3, 15);
  return true;
};

const gravesR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    180 + (r - 1) * 120 + ctx.caster.ad * 1.3,
    'physical',
    'graves:r',
    ctx.recorder,
  );
  return true;
};

const viegoQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 55 + (r - 1) * 30 + ctx.caster.ad * 0.7;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'viego:q', ctx.recorder);
  if (ctx.target.kind === 'monster') {
    for (const monster of ctx.state.monsters) {
      if (
        !monster.alive ||
        monster.id === ctx.target.id ||
        monster.campId !== ctx.target.campId
      ) {
        continue;
      }
      if (monster.spawnProtectUntil > ctx.state.scheduler.time) {
        continue;
      }
      if (dist(ctx.caster.position, monster.position) > 280) {
        continue;
      }
      dealToTarget(
        ctx.state,
        ctx.caster,
        monster,
        raw * 0.62,
        'physical',
        'viego:q:camp',
        ctx.recorder,
      );
      monster.aggroTargetId = ctx.caster.id;
    }
  }
  heal(ctx.caster, 20 + r * 10, ctx.caster);
  return true;
};

const viegoW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    50 + (r - 1) * 30 + ctx.caster.ad * 0.5,
    'magic',
    'viego:w',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'viego:w:stun', 1.1);
  }
  return true;
};

const viegoR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    120 + (r - 1) * 80 + ctx.caster.ad * 1.2 + missing * 150,
    'physical',
    'viego:r',
    ctx.recorder,
  );
  heal(ctx.caster, 80 + r * 40, ctx.caster);
  return true;
};

const gragasQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 35 + ctx.caster.ap * 0.8,
    'magic',
    'gragas:q',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'gragas:q:slow', 2, 35 + r * 5);
  }
  return true;
};

const gragasW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  applyArmor(ctx.caster, 'gragas:w:dr', 2.5, 18 + r * 6);
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      40 + (r - 1) * 25 + ctx.caster.ap * 0.55 + ctx.caster.maxHp * 0.05,
      'magic',
      'gragas:w',
      ctx.recorder,
    );
  }
  return true;
};

const gragasE: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  dashCasterTo(ctx.caster, ctx.target, 520, ctx.state);
  ctx.caster.path = [];
  ctx.caster.moving = false;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 30 + ctx.caster.ap * 0.6,
    'magic',
    'gragas:e',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'gragas:e:knock', 0.85);
  }
  return true;
};

const gragasR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    150 + (r - 1) * 70 + ctx.caster.ap * 0.8,
    'magic',
    'gragas:r',
    ctx.recorder,
  );
  applyStun(ctx.target, 'gragas:r:knock', 1.0);
  applySlow(ctx.target, 'gragas:r:slow', 1.5, 40);
  return true;
};

export const SIGNATURE_ABILITIES: Record<string, AbilityExecutor> = {
  ...SIGNATURE_ABILITIES_MORE,
  ...SIGNATURE_BATCH_A,
  ...SIGNATURE_BATCH_B,
  ...SIGNATURE_BATCH_C,
  ...SIGNATURE_BATCH_D,
  ...SIGNATURE_BATCH_E,
  ...SIGNATURE_BATCH_F,
  ...SIGNATURE_BATCH_G,
  ...SIGNATURE_BATCH_H,
  ...FORM_KIT_ABILITIES,
  ...SIGNATURE_PARTIAL_SIX,
  'Camille:Q': camilleQ,
  'Camille:W': camilleW,
  'Camille:E': camilleE,
  'Camille:R': camilleR,
  'Gragas:Q': gragasQ,
  'Gragas:W': gragasW,
  'Gragas:E': gragasE,
  'Gragas:R': gragasR,
  'Darius:Q': dariusQ,
  'Darius:W': dariusW,
  'Darius:E': dariusE,
  'Darius:R': dariusR,
  'Syndra:Q': syndraQ,
  'Syndra:W': syndraW,
  'Syndra:E': syndraE,
  'Syndra:R': syndraR,
  'Orianna:Q': oriannaQ,
  'Orianna:W': oriannaW,
  'Orianna:E': oriannaE,
  'Orianna:R': oriannaR,
  'Zed:Q': zedQ,
  'Zed:W': zedW,
  'Zed:E': zedE,
  'Zed:R': zedR,
  'Kennen:Q': kennenQ,
  'Kennen:W': kennenW,
  'Kennen:E': kennenE,
  'Kennen:R': kennenR,
  'Renekton:Q': renektonQ,
  'Renekton:W': renektonW,
  'Renekton:E': renektonE,
  'Renekton:R': renektonR,
  'Jhin:Q': jhinQ,
  'Jhin:W': jhinW,
  'Jhin:E': jhinE,
  'Jhin:R': jhinR,
  'Lux:Q': luxQ,
  'Lux:E': luxE,
  'Lux:R': luxR,
  'Nautilus:Q': nautilusQ,
  'Nautilus:R': nautilusR,
  'Leona:Q': leonaQ,
  'Leona:R': leonaR,
  'Graves:Q': gravesQ,
  'Graves:W': gravesW,
  'Graves:E': gravesE,
  'Graves:R': gravesR,
  'Viego:Q': viegoQ,
  'Viego:W': viegoW,
  'Viego:R': viegoR,
};
