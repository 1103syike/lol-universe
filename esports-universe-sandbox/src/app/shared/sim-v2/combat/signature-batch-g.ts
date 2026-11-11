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

const Samira_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 5 + ctx.caster.ad * 0.95 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'samira:q', ctx.recorder);
  return true;
};

const Samira_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'samira:w', ctx.recorder);
  return true;
};

const Samira_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.2;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'samira:e', ctx.recorder);
  return true;
};

const Samira_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 10 + ctx.caster.ad * 0.45 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'samira:r:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'samira:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Senna_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'senna:q', ctx.recorder);
  return true;
};

const Senna_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.7;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'senna:w', ctx.recorder);
  return true;
};

const Senna_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'senna:e', ctx.recorder);
  return true;
};

const Senna_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 250 + (r - 1) * 150 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 1.15;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'senna:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Seraphine_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'seraphine:q', ctx.recorder);
  return true;
};

const Seraphine_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'seraphine:w:ms', 2.5, 25);
  ctx.caster.statuses.push({ id: 'seraphine:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'seraphine:w', ctx.recorder);
  return true;
};

const Seraphine_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'seraphine:e', ctx.recorder);
  return true;
};

const Seraphine_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'seraphine:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'seraphine:r:slow', 1.8, 35);
  }
  return true;
};

const Shaco_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 25 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.65;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'shaco:q', ctx.recorder);
  return true;
};

const Shaco_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.12 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'shaco:w', ctx.recorder);
  return true;
};

const Shaco_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0.8;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'shaco:e', ctx.recorder);
  return true;
};

const Shaco_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 75 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'shaco:r', ctx.recorder);
  return true;
};

const Shen_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 1.7599999999999998 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'shen:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'shen:q:slow', 1.5, 30);
  return true;
};

const Shen_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'shen:w', ctx.recorder);
  return true;
};

const Shen_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'shen:e', ctx.recorder);
  return true;
};

const Shen_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  ctx.caster.statuses.push({ id: 'shen:r:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  const missing = ctx.target.kind === 'champion' ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp) : 0;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw + missing * (80 + r * 40), 'physical', 'shen:r', ctx.recorder);
  return true;
};

const Shyvana_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0.2 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'shyvana:q', ctx.recorder);
  return true;
};

const Shyvana_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.1;
  applyMs(ctx.caster, 'shyvana:w:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'shyvana:w', ctx.recorder);
  return true;
};

const Shyvana_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 85 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'shyvana:e', ctx.recorder);
  return true;
};

const Shyvana_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'shyvana:r', ctx.recorder);
  return true;
};

const Singed_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 2.5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.1062 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'singed:q', ctx.recorder);
  return true;
};

const Singed_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'singed:w', ctx.recorder);
  return true;
};

const Singed_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'singed:e', ctx.recorder);
  return true;
};

const Singed_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'singed:r:ms', 2.5, 25);
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'singed:r', ctx.recorder);
  return true;
};

const Sion_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 20 + ctx.caster.ad * 0.4 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'sion:q', ctx.recorder);
  return true;
};

const Sion_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'sion:w', ctx.recorder);
  return true;
};

const Sion_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'sion:e', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'sion:e:slow', 1.5, 30);
  return true;
};

const Sion_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 150 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'sion:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'sion:r:slow', 1.5, 30);
  return true;
};

const Sivir_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'sivir:q', ctx.recorder);
  return true;
};

const Sivir_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0.7 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'sivir:w', ctx.recorder);
  return true;
};

const Sivir_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  ctx.caster.statuses.push({ id: 'sivir:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'sivir:e', ctx.recorder);
  return true;
};

const Sivir_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'sivir:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Skarner_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.8;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'skarner:q', ctx.recorder);
  return true;
};

const Skarner_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  ctx.caster.statuses.push({ id: 'skarner:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'skarner:w', ctx.recorder);
  return true;
};

const Skarner_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'skarner:e', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'skarner:e:slow', 1.5, 30);
  return true;
};

const Skarner_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'skarner:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'skarner:r:cc', 1.35);
  }
  return true;
};

const Smolder_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.3;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'smolder:q', ctx.recorder);
  return true;
};

const Smolder_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.6;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'smolder:w', ctx.recorder);
  return true;
};

const Smolder_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 5 + ctx.caster.ad * 0.3 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'smolder:e:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'smolder:e', ctx.recorder);
  return true;
};

const Smolder_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 1.1;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'smolder:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Sona_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'sona:q', ctx.recorder);
  return true;
};

const Sona_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 25 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'sona:w', ctx.recorder);
  return true;
};

const Sona_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'sona:e:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'sona:e', ctx.recorder);
  return true;
};

const Sona_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'sona:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Soraka_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 85 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.35 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'soraka:q', ctx.recorder);
  return true;
};

const Soraka_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'soraka:w', ctx.recorder);
  return true;
};

const Soraka_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'soraka:e', ctx.recorder);
  return true;
};

const Soraka_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'soraka:r', ctx.recorder);
  return true;
};

const Swain_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.45 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'swain:q', ctx.recorder);
  return true;
};

const Swain_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'swain:w', ctx.recorder);
  return true;
};

const Swain_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'swain:e', ctx.recorder);
  return true;
};

const Swain_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 7.5 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.025 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'swain:r', ctx.recorder);
  return true;
};

const Sylas_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'sylas:q', ctx.recorder);
  return true;
};

const Sylas_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'sylas:w', ctx.recorder);
  return true;
};

const Sylas_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'sylas:e', ctx.recorder);
  return true;
};

const Sylas_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'sylas:r', ctx.recorder);
  return true;
};

const TahmKench_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 6 + (r - 1) * 2.4700000000000006 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'tahmkench:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'tahmkench:q:slow', 1.5, 30);
  return true;
};

const TahmKench_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 1.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'tahmkench:w', ctx.recorder);
  return true;
};

const TahmKench_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'tahmkench:e', ctx.recorder);
  return true;
};

const TahmKench_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'tahmkench:r', ctx.recorder);
  return true;
};

const Taliyah_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 56 + (r - 1) * 18.5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'taliyah:q', ctx.recorder);
  return true;
};

const Taliyah_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'taliyah:w', ctx.recorder);
  return true;
};

const Taliyah_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'taliyah:e', ctx.recorder);
  return true;
};

const Taliyah_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'taliyah:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'taliyah:r:slow', 1.5, 30);
  return true;
};

const Talon_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'talon:q', ctx.recorder);
  return true;
};

const Talon_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'talon:w', ctx.recorder);
  return true;
};

const Talon_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'talon:e', ctx.recorder);
  return true;
};

const Talon_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 90 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  applyMs(ctx.caster, 'talon:r:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'talon:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Taric_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'taric:q', ctx.recorder);
  return true;
};

const Taric_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'taric:w', ctx.recorder);
  return true;
};

const Taric_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 90 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'taric:e', ctx.recorder);
  return true;
};

const Taric_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'taric:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Teemo_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'teemo:q', ctx.recorder);
  return true;
};

const Teemo_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'teemo:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'teemo:w', ctx.recorder);
  return true;
};

const Teemo_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 9 + (r - 1) * 14 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'teemo:e', ctx.recorder);
  return true;
};

const Teemo_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 31.25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.125 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'teemo:r', ctx.recorder);
  return true;
};

const Tristana_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'tristana:q', ctx.recorder);
  return true;
};

const Tristana_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'tristana:w', ctx.recorder);
  return true;
};

const Tristana_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 45 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'tristana:e', ctx.recorder);
  return true;
};

const Tristana_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 225 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0.7;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'tristana:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Trundle_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 20 + ctx.caster.ad * 0.15 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'trundle:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'trundle:q:slow', 1.5, 30);
  return true;
};

const Trundle_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'trundle:w:ms', 2.5, 25);
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'trundle:w', ctx.recorder);
  return true;
};

const Trundle_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'trundle:e', ctx.recorder);
  return true;
};

const Trundle_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'trundle:r', ctx.recorder);
  return true;
};

const Tryndamere_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  const missing = ctx.target.kind === 'champion' ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp) : 0;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw + missing * (80 + r * 40), 'physical', 'tryndamere:q', ctx.recorder);
  return true;
};

const Tryndamere_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'tryndamere:w', ctx.recorder);
  return true;
};

const Tryndamere_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 1.3;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'tryndamere:e', ctx.recorder);
  return true;
};

const Tryndamere_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'tryndamere:r', ctx.recorder);
  return true;
};

const TwistedFate_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.85 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'twistedfate:q', ctx.recorder);
  return true;
};

const TwistedFate_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 20 + ctx.caster.ad * 1 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'twistedfate:w', ctx.recorder);
  return true;
};

const TwistedFate_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0.2;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'twistedfate:e', ctx.recorder);
  return true;
};

const TwistedFate_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'twistedfate:r', ctx.recorder);
  return true;
};

const Twitch_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'twitch:q', ctx.recorder);
  return true;
};

const Twitch_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'twitch:w', ctx.recorder);
  return true;
};

const Twitch_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'twitch:e', ctx.recorder);
  return true;
};

const Twitch_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'twitch:r', ctx.recorder);
  return true;
};

export const SIGNATURE_BATCH_G: Record<string, AbilityExecutor> = {
  'Samira:Q': Samira_Q,
  'Samira:W': Samira_W,
  'Samira:E': Samira_E,
  'Samira:R': Samira_R,
  'Senna:Q': Senna_Q,
  'Senna:W': Senna_W,
  'Senna:E': Senna_E,
  'Senna:R': Senna_R,
  'Seraphine:Q': Seraphine_Q,
  'Seraphine:W': Seraphine_W,
  'Seraphine:E': Seraphine_E,
  'Seraphine:R': Seraphine_R,
  'Shaco:Q': Shaco_Q,
  'Shaco:W': Shaco_W,
  'Shaco:E': Shaco_E,
  'Shaco:R': Shaco_R,
  'Shen:Q': Shen_Q,
  'Shen:W': Shen_W,
  'Shen:E': Shen_E,
  'Shen:R': Shen_R,
  'Shyvana:Q': Shyvana_Q,
  'Shyvana:W': Shyvana_W,
  'Shyvana:E': Shyvana_E,
  'Shyvana:R': Shyvana_R,
  'Singed:Q': Singed_Q,
  'Singed:W': Singed_W,
  'Singed:E': Singed_E,
  'Singed:R': Singed_R,
  'Sion:Q': Sion_Q,
  'Sion:W': Sion_W,
  'Sion:E': Sion_E,
  'Sion:R': Sion_R,
  'Sivir:Q': Sivir_Q,
  'Sivir:W': Sivir_W,
  'Sivir:E': Sivir_E,
  'Sivir:R': Sivir_R,
  'Skarner:Q': Skarner_Q,
  'Skarner:W': Skarner_W,
  'Skarner:E': Skarner_E,
  'Skarner:R': Skarner_R,
  'Smolder:Q': Smolder_Q,
  'Smolder:W': Smolder_W,
  'Smolder:E': Smolder_E,
  'Smolder:R': Smolder_R,
  'Sona:Q': Sona_Q,
  'Sona:W': Sona_W,
  'Sona:E': Sona_E,
  'Sona:R': Sona_R,
  'Soraka:Q': Soraka_Q,
  'Soraka:W': Soraka_W,
  'Soraka:E': Soraka_E,
  'Soraka:R': Soraka_R,
  'Swain:Q': Swain_Q,
  'Swain:W': Swain_W,
  'Swain:E': Swain_E,
  'Swain:R': Swain_R,
  'Sylas:Q': Sylas_Q,
  'Sylas:W': Sylas_W,
  'Sylas:E': Sylas_E,
  'Sylas:R': Sylas_R,
  'TahmKench:Q': TahmKench_Q,
  'TahmKench:W': TahmKench_W,
  'TahmKench:E': TahmKench_E,
  'TahmKench:R': TahmKench_R,
  'Taliyah:Q': Taliyah_Q,
  'Taliyah:W': Taliyah_W,
  'Taliyah:E': Taliyah_E,
  'Taliyah:R': Taliyah_R,
  'Talon:Q': Talon_Q,
  'Talon:W': Talon_W,
  'Talon:E': Talon_E,
  'Talon:R': Talon_R,
  'Taric:Q': Taric_Q,
  'Taric:W': Taric_W,
  'Taric:E': Taric_E,
  'Taric:R': Taric_R,
  'Teemo:Q': Teemo_Q,
  'Teemo:W': Teemo_W,
  'Teemo:E': Teemo_E,
  'Teemo:R': Teemo_R,
  'Tristana:Q': Tristana_Q,
  'Tristana:W': Tristana_W,
  'Tristana:E': Tristana_E,
  'Tristana:R': Tristana_R,
  'Trundle:Q': Trundle_Q,
  'Trundle:W': Trundle_W,
  'Trundle:E': Trundle_E,
  'Trundle:R': Trundle_R,
  'Tryndamere:Q': Tryndamere_Q,
  'Tryndamere:W': Tryndamere_W,
  'Tryndamere:E': Tryndamere_E,
  'Tryndamere:R': Tryndamere_R,
  'TwistedFate:Q': TwistedFate_Q,
  'TwistedFate:W': TwistedFate_W,
  'TwistedFate:E': TwistedFate_E,
  'TwistedFate:R': TwistedFate_R,
  'Twitch:Q': Twitch_Q,
  'Twitch:W': Twitch_W,
  'Twitch:E': Twitch_E,
  'Twitch:R': Twitch_R,
};
