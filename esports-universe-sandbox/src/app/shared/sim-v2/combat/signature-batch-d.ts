import {
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

const Hecarim_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.9;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'hecarim:q', ctx.recorder);
  return true;
};

const Hecarim_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'hecarim:w', ctx.recorder);
  return true;
};

const Hecarim_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  applyMs(ctx.caster, 'hecarim:e:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'hecarim:e', ctx.recorder);
  return true;
};

const Hecarim_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'hecarim:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Heimerdinger_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'heimerdinger:q', ctx.recorder);
  return true;
};

const Heimerdinger_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'heimerdinger:w', ctx.recorder);
  return true;
};

const Heimerdinger_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'heimerdinger:e', ctx.recorder);
  return true;
};

const Heimerdinger_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'heimerdinger:r', ctx.recorder);
  return true;
};

const Hwei_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'hwei:q', ctx.recorder);
  return true;
};

const Hwei_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'hwei:w', ctx.recorder);
  return true;
};

const Hwei_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'hwei:e', ctx.recorder);
  return true;
};

const Hwei_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 2.5 + (r - 1) * 2.5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.0125 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'hwei:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Illaoi_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'illaoi:q', ctx.recorder);
  return true;
};

const Illaoi_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'illaoi:w', ctx.recorder);
  return true;
};

const Illaoi_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'illaoi:e', ctx.recorder);
  return true;
};

const Illaoi_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'illaoi:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Ivern_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ivern:q', ctx.recorder);
  return true;
};

const Ivern_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 7.5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ivern:w', ctx.recorder);
  return true;
};

const Ivern_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'ivern:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ivern:e', ctx.recorder);
  return true;
};

const Ivern_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ivern:r', ctx.recorder);
  return true;
};

const Kalista_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 65 + ctx.caster.ad * 1.05 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kalista:q', ctx.recorder);
  return true;
};

const Kalista_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kalista:w', ctx.recorder);
  return true;
};

const Kalista_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 10 + ctx.caster.ad * 0.7 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'kalista:e', ctx.recorder);
  return true;
};

const Kalista_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kalista:r', ctx.recorder);
  return true;
};

const Karma_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'karma:q', ctx.recorder);
  return true;
};

const Karma_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.45 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'karma:w', ctx.recorder);
  return true;
};

const Karma_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'karma:e:ms', 2.5, 25);
  ctx.caster.statuses.push({ id: 'karma:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'karma:e', ctx.recorder);
  return true;
};

const Karma_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'karma:r', ctx.recorder);
  return true;
};

const Karthus_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 19 + ctx.caster.ad * 0 + ctx.caster.ap * 0.35 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'karthus:q', ctx.recorder);
  return true;
};

const Karthus_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'karthus:w', ctx.recorder);
  return true;
};

const Karthus_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 7.5 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.05 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'karthus:e', ctx.recorder);
  return true;
};

const Karthus_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 150 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'karthus:r', ctx.recorder);
  return true;
};

const Kassadin_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'kassadin:q', ctx.recorder);
  return true;
};

const Kassadin_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'kassadin:w', ctx.recorder);
  return true;
};

const Kassadin_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'kassadin:e', ctx.recorder);
  return true;
};

const Kassadin_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'kassadin:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Kayle_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0.6;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kayle:q', ctx.recorder);
  return true;
};

const Kayle_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'kayle:w:ms', 2.5, 25);
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kayle:w', ctx.recorder);
  return true;
};

const Kayle_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 15 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0.1;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'kayle:e', ctx.recorder);
  return true;
};

const Kayle_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 1;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kayle:r', ctx.recorder);
  return true;
};

const Kayn_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.85;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'kayn:q', ctx.recorder);
  return true;
};

const Kayn_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 85 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'kayn:w', ctx.recorder);
  return true;
};

const Kayn_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'kayn:e:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kayn:e', ctx.recorder);
  return true;
};

const Kayn_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.5;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kayn:r', ctx.recorder);
  return true;
};

const Khazix_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'khazix:q', ctx.recorder);
  return true;
};

const Khazix_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 85 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'khazix:w', ctx.recorder);
  return true;
};

const Khazix_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'khazix:e', ctx.recorder);
  return true;
};

const Khazix_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'khazix:r', ctx.recorder);
  return true;
};

const Kindred_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.75;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'kindred:q', ctx.recorder);
  return true;
};

const Kindred_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 25 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0.2;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  const missing = ctx.target.kind === 'champion' ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp) : 0;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw + missing * (80 + r * 40), 'physical', 'kindred:w', ctx.recorder);
  return true;
};

const Kindred_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kindred:e', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'kindred:e:slow', 1.5, 30);
  return true;
};

const Kindred_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kindred:r', ctx.recorder);
  return true;
};

const Kled_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.6;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'kled:q', ctx.recorder);
  return true;
};

const Kled_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.045;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kled:w', ctx.recorder);
  return true;
};

const Kled_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 35 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.55;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'kled:e', ctx.recorder);
  return true;
};

const Kled_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.09;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kled:r', ctx.recorder);
  return true;
};

const KogMaw_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'kogmaw:q', ctx.recorder);
  return true;
};

const KogMaw_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'kogmaw:w', ctx.recorder);
  return true;
};

const KogMaw_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'kogmaw:e', ctx.recorder);
  return true;
};

const KogMaw_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.35 + Math.max(0, ctx.caster.ad - 60) * 0.75;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'kogmaw:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const KSante_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'ksante:q', ctx.recorder);
  return true;
};

const KSante_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 45 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'ksante:w', ctx.recorder);
  if (ctx.target.kind === 'champion') applyStun(ctx.target, 'ksante:w:cc', 1);
  return true;
};

const KSante_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'ksante:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'ksante:e', ctx.recorder);
  return true;
};

const KSante_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'ksante:r', ctx.recorder);
  return true;
};

export const SIGNATURE_BATCH_D: Record<string, AbilityExecutor> = {
  'Hecarim:Q': Hecarim_Q,
  'Hecarim:W': Hecarim_W,
  'Hecarim:E': Hecarim_E,
  'Hecarim:R': Hecarim_R,
  'Heimerdinger:Q': Heimerdinger_Q,
  'Heimerdinger:W': Heimerdinger_W,
  'Heimerdinger:E': Heimerdinger_E,
  'Heimerdinger:R': Heimerdinger_R,
  'Hwei:Q': Hwei_Q,
  'Hwei:W': Hwei_W,
  'Hwei:E': Hwei_E,
  'Hwei:R': Hwei_R,
  'Illaoi:Q': Illaoi_Q,
  'Illaoi:W': Illaoi_W,
  'Illaoi:E': Illaoi_E,
  'Illaoi:R': Illaoi_R,
  'Ivern:Q': Ivern_Q,
  'Ivern:W': Ivern_W,
  'Ivern:E': Ivern_E,
  'Ivern:R': Ivern_R,
  'Kalista:Q': Kalista_Q,
  'Kalista:W': Kalista_W,
  'Kalista:E': Kalista_E,
  'Kalista:R': Kalista_R,
  'Karma:Q': Karma_Q,
  'Karma:W': Karma_W,
  'Karma:E': Karma_E,
  'Karma:R': Karma_R,
  'Karthus:Q': Karthus_Q,
  'Karthus:W': Karthus_W,
  'Karthus:E': Karthus_E,
  'Karthus:R': Karthus_R,
  'Kassadin:Q': Kassadin_Q,
  'Kassadin:W': Kassadin_W,
  'Kassadin:E': Kassadin_E,
  'Kassadin:R': Kassadin_R,
  'Kayle:Q': Kayle_Q,
  'Kayle:W': Kayle_W,
  'Kayle:E': Kayle_E,
  'Kayle:R': Kayle_R,
  'Kayn:Q': Kayn_Q,
  'Kayn:W': Kayn_W,
  'Kayn:E': Kayn_E,
  'Kayn:R': Kayn_R,
  'Khazix:Q': Khazix_Q,
  'Khazix:W': Khazix_W,
  'Khazix:E': Khazix_E,
  'Khazix:R': Khazix_R,
  'Kindred:Q': Kindred_Q,
  'Kindred:W': Kindred_W,
  'Kindred:E': Kindred_E,
  'Kindred:R': Kindred_R,
  'Kled:Q': Kled_Q,
  'Kled:W': Kled_W,
  'Kled:E': Kled_E,
  'Kled:R': Kled_R,
  'KogMaw:Q': KogMaw_Q,
  'KogMaw:W': KogMaw_W,
  'KogMaw:E': KogMaw_E,
  'KogMaw:R': KogMaw_R,
  'KSante:Q': KSante_Q,
  'KSante:W': KSante_W,
  'KSante:E': KSante_E,
  'KSante:R': KSante_R,
};
