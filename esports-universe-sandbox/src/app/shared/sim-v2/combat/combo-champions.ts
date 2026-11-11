import { dist } from '../map/pathfinding';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { ReplayRecorder } from '../replay/recorder';
import {
  aatroxState,
  ahriState,
  annieState,
  clearLeeSinMark,
  ezrealState,
  leeSinState,
  pruneSyndraSpheres,
  syndraState,
} from './ability-runtime-state';
import {
  applyArmor,
  applyAs,
  applyMs,
  applySlow,
  applyStun,
  championsInRadius,
  dashCasterTo,
  dealToTarget,
  heal,
  hitChampionsInRadius,
  knockbackTargetAway,
  rank,
  type AbilityExecutor,
} from './ability-helpers';
import type { Damageable } from './damage';

function abilityRuntime(caster: ChampionEntity, slot: 'Q' | 'W' | 'E' | 'R') {
  return caster.abilities.find((ability) => ability.slot === slot);
}

export const AATROX_Q_INTER_CAST_SEC = 1;
export const AATROX_SWEET_GAP = 320;

function setCooldown(caster: ChampionEntity, slot: 'Q' | 'W' | 'E' | 'R', until: number): void {
  const runtime = abilityRuntime(caster, slot);
  if (runtime) {
    runtime.cooldownUntil = until;
    caster.abilityBag.customCooldownApplied = true;
  }
}

function packCooldown(
  caster: ChampionEntity,
  slot: 'Q' | 'W' | 'E' | 'R',
  stateTime: number,
  fallbackSec: number,
): void {
  setCooldown(caster, slot, stateTime + fallbackSec);
}

export const comboAnnieQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const pyro = annieState(ctx.caster);
  pyro.pyromania = Math.min(4, pyro.pyromania + 1);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    80 + (r - 1) * 35 + ctx.caster.ap * 0.8,
    'magic',
    'annie:q',
    ctx.recorder,
  );
  if (pyro.pyromania >= 4 && ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'annie:pyro', 1.25);
    pyro.pyromania = 0;
  }
  return true;
};

export const comboAnnieW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const pyro = annieState(ctx.caster);
  pyro.pyromania = Math.min(4, pyro.pyromania + 1);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    70 + (r - 1) * 40 + ctx.caster.ap * 0.7,
    'magic',
    'annie:w',
    ctx.recorder,
  );
  if (pyro.pyromania >= 4 && ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'annie:pyro', 1.25);
    pyro.pyromania = 0;
  }
  return true;
};

export const comboAnnieE: AbilityExecutor = (ctx) => {
  const pyro = annieState(ctx.caster);
  pyro.pyromania = Math.min(4, pyro.pyromania + 1);
  const r = rank(ctx.level);
  applyMs(ctx.caster, 'annie:e:ms', 2, 30 + r * 8);
  applyArmor(ctx.caster, 'annie:e:shield', 3, 20 + r * 8 + ctx.caster.ap * 0.2);
  return true;
};

export const comboAnnieR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const pyro = annieState(ctx.caster);
  pyro.pyromania = Math.min(4, pyro.pyromania + 1);
  const stunned = pyro.pyromania >= 4;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    150 + (r - 1) * 125 + ctx.caster.ap * 0.75,
    'magic',
    'annie:r',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion' && stunned) {
    applyStun(ctx.target, 'annie:r:stun', 1.5);
    pyro.pyromania = 0;
  }
  return true;
};

export const comboLeeSinQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const lee = leeSinState(ctx.caster);
  const r = rank(ctx.level);
  const marked =
    lee.qIsRecast &&
    lee.qMarkTargetId === ctx.target.id &&
    lee.qMarkUntil > now;

  if (marked) {
    const missing =
      ctx.target.kind === 'champion'
        ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp)
        : 0.2;
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      (55 + (r - 1) * 25 + ctx.caster.ad * 1) * (1 + missing * 0.5),
      'physical',
      'leesin:q2',
      ctx.recorder,
    );
    dashCasterTo(ctx.caster, ctx.target, 1200, ctx.state);
    clearLeeSinMark(ctx.caster);
    packCooldown(ctx.caster, 'Q', now, Math.max(6, 11 - r));
    return true;
  }

  const q1Raw = 55 + (r - 1) * 25 + ctx.caster.ad * 1;
  dealToTarget(ctx.state, ctx.caster, ctx.target, q1Raw, 'physical', 'leesin:q1', ctx.recorder);
  if (ctx.target.kind === 'monster') {
    for (const monster of ctx.state.monsters) {
      if (
        !monster.alive ||
        monster.id === ctx.target.id ||
        monster.campId !== ctx.target.campId
      ) {
        continue;
      }
      if (monster.spawnProtectUntil > now) {
        continue;
      }
      if (dist(ctx.target.position, monster.position) > 320) {
        continue;
      }
      dealToTarget(
        ctx.state,
        ctx.caster,
        monster,
        q1Raw * 0.55,
        'physical',
        'leesin:q1:camp',
        ctx.recorder,
      );
      monster.aggroTargetId = ctx.caster.id;
    }
  }
  lee.qMarkTargetId = ctx.target.id;
  lee.qMarkUntil = now + 3;
  lee.qIsRecast = true;
  setCooldown(ctx.caster, 'Q', now);
  return true;
};

export const comboLeeSinW: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const ally =
    ctx.target?.kind === 'champion' && ctx.target.side === ctx.caster.side
      ? ctx.target
      : ctx.caster;
  if (ally.id !== ctx.caster.id) {
    dashCasterTo(ctx.caster, ally, 700, ctx.state);
  }
  heal(ally, 40 + r * 25 + ctx.caster.ad * 0.15, ctx.caster);
  applyMs(ctx.caster, 'leesin:w:ms', 2.5, 40 + r * 8);
  applyAs(ctx.caster, 'leesin:w:as', 3, 0.35 + r * 0.04);
  return true;
};

export const comboLeeSinE: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0.6;
  const hits = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    380,
    raw,
    'magic',
    'leesin:e',
    ctx.recorder,
  );
  if (hits === 0 && ctx.target) {
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'leesin:e', ctx.recorder);
  }
  if (ctx.target?.kind === 'champion') {
    applySlow(ctx.target, 'leesin:e:slow', 2, 25 + r * 5);
  }
  return hits > 0 || !!ctx.target;
};

export const comboLeeSinR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const now = ctx.state.scheduler.time;
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
  knockbackTargetAway(ctx.caster, ctx.target, 500, ctx.state);
  applyStun(ctx.target, 'leesin:r:airborne', 0.75);
  leeSinState(ctx.caster).rFlashArmedUntil = now + 0.35;
  return true;
};

export const comboSyndraQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const r = rank(ctx.level);
  const bag = syndraState(ctx.caster);
  pruneSyndraSpheres(ctx.caster, now);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    75 + (r - 1) * 40 + ctx.caster.ap * 0.7,
    'magic',
    'syndra:q',
    ctx.recorder,
  );
  bag.spheres.push({
    id: `syndra-sphere-${bag.nextSphereId}`,
    x: ctx.target.position.x,
    y: ctx.target.position.y,
    expiresAt: now + 6,
  });
  bag.nextSphereId += 1;
  if (bag.spheres.length > 4) {
    bag.spheres.shift();
  }
  return true;
};

export const comboSyndraW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const r = rank(ctx.level);
  const spheres = pruneSyndraSpheres(ctx.caster, now);
  const grabbed = spheres.shift();
  const bonus = grabbed ? 1.35 : 1;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    (55 + (r - 1) * 35 + ctx.caster.ap * 0.55) * bonus,
    'magic',
    grabbed ? 'syndra:w:sphere' : 'syndra:w',
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'syndra:w:slow', 1.5, 30 + r * 5 + (grabbed ? 15 : 0));
  }
  if (grabbed) {
    spheres.push({
      id: grabbed.id,
      x: ctx.target.position.x,
      y: ctx.target.position.y,
      expiresAt: now + 4,
    });
  }
  return true;
};

export const comboSyndraE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const r = rank(ctx.level);
  const spheres = pruneSyndraSpheres(ctx.caster, now);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 30 + ctx.caster.ap * 0.45,
    'magic',
    'syndra:e',
    ctx.recorder,
  );
  const hitSpheres = spheres.filter(
    (sphere) => dist(sphere, ctx.target!.position) <= 520,
  );
  for (const sphere of hitSpheres) {
    const index = spheres.indexOf(sphere);
    if (index >= 0) {
      spheres.splice(index, 1);
    }
  }
  const stunSec = hitSpheres.length > 0 ? 1.35 + Math.min(0.45, hitSpheres.length * 0.15) : 0.35;
  applyStun(ctx.target, 'syndra:e:stun', stunSec);
  knockbackTargetAway(ctx.caster, ctx.target, 180 + hitSpheres.length * 40, ctx.state);
  return true;
};

export const comboSyndraR: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const r = rank(ctx.level);
  const spheres = pruneSyndraSpheres(ctx.caster, now);
  const near = spheres.filter((sphere) => dist(sphere, ctx.target!.position) <= 900);
  const bolts = Math.max(4, 3 + r + near.length);
  for (const sphere of near) {
    const index = spheres.indexOf(sphere);
    if (index >= 0) {
      spheres.splice(index, 1);
    }
  }
  const raw = bolts * (70 + (r - 1) * 35 + ctx.caster.ap * 0.25);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'syndra:r', ctx.recorder);
  return true;
};

function aatroxHeal(caster: ChampionEntity, amount: number, now: number): void {
  const bag = aatroxState(caster);
  const mult = bag.rUntil > now ? bag.rHealMult : 1;
  heal(caster, amount * mult, caster);
}

export const comboAatroxQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = aatroxState(ctx.caster);
  if (bag.qWindowUntil > 0 && now > bag.qWindowUntil) {
    bag.qStage = 0;
    bag.qWindowUntil = 0;
  }
  const stage = bag.qStage === 0 ? 1 : ((bag.qStage + 1) as 1 | 2 | 3);
  const r = rank(ctx.level);
  const gap = Math.hypot(
    ctx.target.position.x - ctx.caster.position.x,
    ctx.target.position.y - ctx.caster.position.y,
  );
  const sweet =
    bag.sweetUntil > now ||
    (ctx.target.kind === 'champion' &&
      gap >= AATROX_SWEET_GAP - 70 &&
      gap <= AATROX_SWEET_GAP + 160);
  const stageMul = stage === 1 ? 1 : stage === 2 ? 1.25 : 1.5625;
  const base = 10 + (r - 1) * 15 + ctx.caster.ad * (0.6 + (r - 1) * 0.075);
  const raw = base * stageMul * (sweet ? 1.75 : 1);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    raw,
    'physical',
    sweet ? `aatrox:q${stage}:sweet` : `aatrox:q${stage}`,
    ctx.recorder,
  );
  if (ctx.target.kind === 'champion') {
    aatroxHeal(ctx.caster, 18 + r * 10 + raw * (sweet ? 0.2 : 0.12), now);
    if (sweet) {
      applyStun(ctx.target, `aatrox:q${stage}:knock`, stage === 3 ? 0.85 : 0.55);
    } else {
      applySlow(ctx.target, `aatrox:q${stage}:slow`, 0.8, 15 + r * 3);
    }
  }
  if (sweet) {
    bag.sweetUntil = 0;
  }
  if (stage >= 3) {
    bag.qStage = 0;
    bag.qWindowUntil = 0;
    packCooldown(ctx.caster, 'Q', now, Math.max(6, 14 - (r - 1) * 2));
  } else {
    bag.qStage = stage;
    bag.qWindowUntil = now + 4;
    setCooldown(ctx.caster, 'Q', now + AATROX_Q_INTER_CAST_SEC);
  }
  return true;
};

export const comboAatroxW: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = aatroxState(ctx.caster);
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 10 + ctx.caster.ad * 0.4;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'aatrox:w', ctx.recorder);
  applySlow(ctx.target, 'aatrox:w:slow', 1.5, 25 + r * 2.5);
  bag.wTetherTargetId = ctx.target.id;
  bag.wTetherUntil = now + 1.5;
  bag.wAnchorX = ctx.target.position.x;
  bag.wAnchorY = ctx.target.position.y;
  const casterId = ctx.caster.id;
  const targetId = ctx.target.id;
  const recorder = ctx.recorder;
  ctx.state.scheduler.scheduleAfter(1.5, `aatrox:w:${casterId}:${targetId}`, () => {
    const self = ctx.state.champions.find((champ) => champ.id === casterId);
    const victim = ctx.state.champions.find((champ) => champ.id === targetId);
    if (!self?.alive || !victim?.alive) {
      return;
    }
    const stateBag = aatroxState(self);
    if (stateBag.wTetherTargetId !== targetId || stateBag.wTetherUntil <= ctx.state.scheduler.time - 0.05) {
      return;
    }
    const tetherGap = Math.hypot(victim.position.x - stateBag.wAnchorX, victim.position.y - stateBag.wAnchorY);
    if (tetherGap > 380) {
      stateBag.wTetherTargetId = null;
      return;
    }
    const pullRank = rank(self.abilities.find((ability) => ability.slot === 'W')?.level ?? 1);
    const pullRaw = 30 + (pullRank - 1) * 10 + self.ad * 0.4;
    dealToTarget(ctx.state, self, victim, pullRaw, 'physical', 'aatrox:w:pull', recorder);
    victim.position = { x: stateBag.wAnchorX, y: stateBag.wAnchorY };
    victim.path = [];
    victim.moving = false;
    applyStun(victim, 'aatrox:w:pull', 0.35);
    stateBag.wTetherTargetId = null;
  });
  return true;
};

export const comboAatroxE: AbilityExecutor = (ctx) => {
  const now = ctx.state.scheduler.time;
  const bag = aatroxState(ctx.caster);
  const r = rank(ctx.level);
  if (ctx.target) {
    const gap = Math.hypot(
      ctx.target.position.x - ctx.caster.position.x,
      ctx.target.position.y - ctx.caster.position.y,
    );
    if (gap > AATROX_SWEET_GAP + 30) {
      const dashLen = Math.max(90, Math.min(420, gap - AATROX_SWEET_GAP));
      dashCasterTo(ctx.caster, ctx.target, dashLen, ctx.state);
    } else if (gap < 220) {
      const dx = ctx.caster.position.x - ctx.target.position.x;
      const dy = ctx.caster.position.y - ctx.target.position.y;
      const len = Math.hypot(dx, dy) || 1;
      const retreat = {
        x: ctx.target.position.x + (dx / len) * AATROX_SWEET_GAP,
        y: ctx.target.position.y + (dy / len) * AATROX_SWEET_GAP,
      };
      dashCasterTo(ctx.caster, { position: retreat }, 260, ctx.state);
    }
  }
  bag.sweetUntil = now + 1.85;
  applyMs(ctx.caster, 'aatrox:e:ms', 1.2, 40 + r * 6);
  return true;
};

export const comboAatroxR: AbilityExecutor = (ctx) => {
  const now = ctx.state.scheduler.time;
  const bag = aatroxState(ctx.caster);
  const r = rank(ctx.level);
  bag.rUntil = now + 10;
  bag.rHealMult = 1.5 + r * 0.25;
  applyMs(ctx.caster, 'aatrox:r:ms', 10, 60 + r * 20);
  applyAs(ctx.caster, 'aatrox:r:ad', 10, 0.12 + r * 0.06);
  aatroxHeal(ctx.caster, 40 + r * 25, now);
  return true;
};

function ahriFireBolts(
  state: GameState,
  caster: ChampionEntity,
  preferred: Damageable | null,
  raw: number,
  recorder?: ReplayRecorder,
): number {
  const enemies = championsInRadius(state, caster.position, 600)
    .filter((champ) => champ.side !== caster.side)
    .sort((left, right) => {
      const leftPrefer = preferred && left.id === preferred.id ? -1 : 0;
      const rightPrefer = preferred && right.id === preferred.id ? -1 : 0;
      if (leftPrefer !== rightPrefer) {
        return leftPrefer - rightPrefer;
      }
      return dist(caster.position, left.position) - dist(caster.position, right.position);
    });
  const targets = enemies.slice(0, 3);
  for (const enemy of targets) {
    dealToTarget(state, caster, enemy, raw, 'magic', 'ahri:r', recorder);
  }
  if (targets.length > 0) {
    return targets.length;
  }
  if (
    preferred &&
    preferred.kind !== 'champion' &&
    preferred.kind !== 'structure' &&
    preferred.alive &&
    dist(caster.position, preferred.position) <= 600
  ) {
    dealToTarget(state, caster, preferred, raw, 'magic', 'ahri:r', recorder);
    return 1;
  }
  return 0;
}

export const comboAhriQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const raw = 35 + (r - 1) * 25 + ctx.caster.ap * 0.5;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ahri:q', ctx.recorder);
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'ahri:q:return', ctx.recorder);
  return true;
};

export const comboAhriW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const r = rank(ctx.level);
  const primary = 40 + (r - 1) * 20 + ctx.caster.ap * 0.4;
  applyMs(ctx.caster, 'ahri:w:ms', 2, 40);
  if (ctx.target.kind === 'champion') {
    dealToTarget(ctx.state, ctx.caster, ctx.target, primary, 'magic', 'ahri:w', ctx.recorder);
    dealToTarget(ctx.state, ctx.caster, ctx.target, primary * 0.4, 'magic', 'ahri:w', ctx.recorder);
    dealToTarget(ctx.state, ctx.caster, ctx.target, primary * 0.4, 'magic', 'ahri:w', ctx.recorder);
    return true;
  }
  dealToTarget(ctx.state, ctx.caster, ctx.target, primary, 'magic', 'ahri:w', ctx.recorder);
  return true;
};

export const comboAhriE: AbilityExecutor = (ctx) => {
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const r = rank(ctx.level);
  const charmSec = 1.2 + (r - 1) * 0.15;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    80 + (r - 1) * 40 + ctx.caster.ap * 0.85,
    'magic',
    'ahri:e',
    ctx.recorder,
  );
  applyStun(ctx.target, 'ahri:e:charm', charmSec);
  applySlow(ctx.target, 'ahri:e:slow', charmSec, 65);
  return true;
};

export const comboAhriR: AbilityExecutor = (ctx) => {
  const now = ctx.state.scheduler.time;
  const bag = ahriState(ctx.caster);
  const r = rank(ctx.level);
  if (bag.rWindowUntil <= now || bag.rChargesLeft <= 0) {
    bag.rChargesLeft = 3;
    bag.rWindowUntil = now + 15;
  }
  if (ctx.target) {
    dashCasterTo(ctx.caster, ctx.target, 500, ctx.state);
  }
  const bolt = 75 + (r - 1) * 50 + ctx.caster.ap * 0.35;
  ahriFireBolts(ctx.state, ctx.caster, ctx.target, bolt, ctx.recorder);
  bag.rChargesLeft -= 1;
  if (bag.rChargesLeft <= 0) {
    bag.rWindowUntil = 0;
    packCooldown(ctx.caster, 'R', now, Math.max(100, 160 - r * 20));
  } else {
    packCooldown(ctx.caster, 'R', now, 1);
  }
  return true;
};

function ezrealBonusAd(caster: ChampionEntity): number {
  return Math.max(0, caster.ad - 60);
}

export function noteEzrealPassive(caster: ChampionEntity, now: number): void {
  const bag = ezrealState(caster);
  if (bag.passiveUntil < now) {
    bag.passiveStacks = 0;
  }
  bag.passiveStacks = Math.min(5, bag.passiveStacks + 1);
  bag.passiveUntil = now + 6;
  applyAs(caster, 'ezreal:p:as', 6, bag.passiveStacks * 0.1);
}

export function detonateEzrealW(
  state: GameState,
  caster: ChampionEntity,
  target: Damageable,
  byAbility: boolean,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const bag = ezrealState(caster);
  if (bag.wMarkTargetId !== target.id || bag.wMarkUntil <= now) {
    return false;
  }
  const runtime = abilityRuntime(caster, 'W');
  const r = rank(runtime?.level ?? 1);
  const raw = 80 + (r - 1) * 55 + ezrealBonusAd(caster) * 1.0 + caster.ap * 0.7;
  dealToTarget(state, caster, target, raw, 'magic', 'ezreal:w:detonate', recorder);
  bag.wMarkTargetId = null;
  bag.wMarkUntil = 0;
  if (byAbility) {
    caster.mana = Math.min(caster.maxMana, caster.mana + 60);
  }
  noteEzrealPassive(caster, now);
  return true;
}

function reduceEzrealCooldowns(caster: ChampionEntity, now: number, amount = 1.5): void {
  for (const ability of caster.abilities) {
    if (ability.slot === 'P' || ability.level <= 0) {
      continue;
    }
    if (ability.cooldownUntil <= now) {
      continue;
    }
    ability.cooldownUntil = Math.max(now, ability.cooldownUntil - amount);
  }
}

export const comboEzrealQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 25 + ctx.caster.ad * 1.3 + ctx.caster.ap * 0.15;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'ezreal:q', ctx.recorder);
  detonateEzrealW(ctx.state, ctx.caster, ctx.target, true, ctx.recorder);
  reduceEzrealCooldowns(ctx.caster, now, 1.5);
  noteEzrealPassive(ctx.caster, now);
  return true;
};

export const comboEzrealW: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  if (ctx.target.kind !== 'champion' && ctx.target.kind !== 'monster') {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const bag = ezrealState(ctx.caster);
  bag.wMarkTargetId = ctx.target.id;
  bag.wMarkUntil = now + 4;
  noteEzrealPassive(ctx.caster, now);
  return true;
};

export const comboEzrealE: AbilityExecutor = (ctx) => {
  const now = ctx.state.scheduler.time;
  const bag = ezrealState(ctx.caster);
  const r = rank(ctx.level);
  if (ctx.target) {
    dashCasterTo(ctx.caster, ctx.target, 475, ctx.state);
  }
  let boltTarget = ctx.target;
  if (bag.wMarkTargetId && bag.wMarkUntil > now) {
    const marked =
      ctx.state.champions.find((champ) => champ.id === bag.wMarkTargetId) ??
      ctx.state.monsters.find((monster) => monster.id === bag.wMarkTargetId);
    if (marked?.alive && dist(ctx.caster.position, marked.position) <= 750) {
      boltTarget = marked;
    }
  }
  if (boltTarget) {
    const raw = 80 + (r - 1) * 50 + ezrealBonusAd(ctx.caster) * 0.5 + ctx.caster.ap * 0.75;
    dealToTarget(ctx.state, ctx.caster, boltTarget, raw, 'magic', 'ezreal:e', ctx.recorder);
    detonateEzrealW(ctx.state, ctx.caster, boltTarget, true, ctx.recorder);
  }
  noteEzrealPassive(ctx.caster, now);
  return true;
};

export const comboEzrealR: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const now = ctx.state.scheduler.time;
  const r = rank(ctx.level);
  const raw = 350 + (r - 1) * 200 + ezrealBonusAd(ctx.caster) * 1.0 + ctx.caster.ap * 0.9;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ezreal:r', ctx.recorder);
  detonateEzrealW(ctx.state, ctx.caster, ctx.target, true, ctx.recorder);
  for (const enemy of ctx.state.champions) {
    if (!enemy.alive || enemy.side === ctx.caster.side || enemy.id === ctx.target.id) {
      continue;
    }
    if (dist(ctx.target.position, enemy.position) > 350) {
      continue;
    }
    dealToTarget(ctx.state, ctx.caster, enemy, raw * 0.85, 'magic', 'ezreal:r', ctx.recorder);
  }
  noteEzrealPassive(ctx.caster, now);
  return true;
};

export const COMBO_CHAMPION_ABILITIES: Record<string, AbilityExecutor> = {
  'Annie:Q': comboAnnieQ,
  'Annie:W': comboAnnieW,
  'Annie:E': comboAnnieE,
  'Annie:R': comboAnnieR,
  'LeeSin:Q': comboLeeSinQ,
  'LeeSin:W': comboLeeSinW,
  'LeeSin:E': comboLeeSinE,
  'LeeSin:R': comboLeeSinR,
  'Syndra:Q': comboSyndraQ,
  'Syndra:W': comboSyndraW,
  'Syndra:E': comboSyndraE,
  'Syndra:R': comboSyndraR,
  'Aatrox:Q': comboAatroxQ,
  'Aatrox:W': comboAatroxW,
  'Aatrox:E': comboAatroxE,
  'Aatrox:R': comboAatroxR,
  'Ahri:Q': comboAhriQ,
  'Ahri:W': comboAhriW,
  'Ahri:E': comboAhriE,
  'Ahri:R': comboAhriR,
  'Ezreal:Q': comboEzrealQ,
  'Ezreal:W': comboEzrealW,
  'Ezreal:E': comboEzrealE,
  'Ezreal:R': comboEzrealR,
};
