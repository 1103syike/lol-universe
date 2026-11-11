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

const Udyr_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 6 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.25;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'udyr:q', ctx.recorder);
  return true;
};

const Udyr_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'udyr:w', ctx.recorder);
  return true;
};

const Udyr_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'udyr:e', ctx.recorder);
  if (ctx.target.kind === 'champion') applyStun(ctx.target, 'udyr:e:cc', 1);
  return true;
};

const Udyr_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 8 + ctx.caster.ad * 0 + ctx.caster.ap * 0.175 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'udyr:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Urgot_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 25 + (r - 1) * 45 + ctx.caster.ad * 0.7 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'urgot:q', ctx.recorder);
  return true;
};

const Urgot_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 12 + (r - 1) * 0 + ctx.caster.ad * 0.2 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'urgot:w', ctx.recorder);
  return true;
};

const Urgot_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 90 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  ctx.caster.statuses.push({ id: 'urgot:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'urgot:e', ctx.recorder);
  return true;
};

const Urgot_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 125 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  const missing = ctx.target.kind === 'champion' ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp) : 0;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw + missing * (80 + r * 40), 'physical', 'urgot:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'urgot:r:slow', 1.5, 30);
  return true;
};

const Varus_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 46.67 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.8667;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'varus:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'varus:q:slow', 1.5, 30);
  return true;
};

const Varus_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 6 + (r - 1) * 6 + ctx.caster.ad * 0 + ctx.caster.ap * 0.35 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'varus:w', ctx.recorder);
  return true;
};

const Varus_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'varus:e', ctx.recorder);
  return true;
};

const Varus_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'varus:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applyStun(ctx.target, 'varus:r:cc', 1.35);
  return true;
};

const Vayne_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0.75 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'vayne:q', ctx.recorder);
  return true;
};

const Vayne_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'vayne:w', ctx.recorder);
  return true;
};

const Vayne_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'vayne:e', ctx.recorder);
  return true;
};

const Vayne_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 35 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'vayne:r', ctx.recorder);
  return true;
};

const Veigar_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'veigar:q', ctx.recorder);
  return true;
};

const Veigar_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 85 + (r - 1) * 55 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'veigar:w', ctx.recorder);
  return true;
};

const Veigar_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'veigar:e', ctx.recorder);
  return true;
};

const Veigar_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 175 + (r - 1) * 75 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  const missing = ctx.target.kind === 'champion' ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp) : 0;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw + missing * (80 + r * 40), 'magic', 'veigar:r', ctx.recorder);
  return true;
};

const Velkoz_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.9 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'velkoz:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'velkoz:q:slow', 1.5, 30);
  return true;
};

const Velkoz_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'velkoz:w', ctx.recorder);
  return true;
};

const Velkoz_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'velkoz:e', ctx.recorder);
  return true;
};

const Velkoz_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 34.62 + (r - 1) * 13.46 + ctx.caster.ad * 0 + ctx.caster.ap * 0.0962 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'velkoz:r', ctx.recorder);
  return true;
};

const Vex_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'vex:q', ctx.recorder);
  return true;
};

const Vex_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'vex:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'vex:w', ctx.recorder);
  return true;
};

const Vex_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'vex:e', ctx.recorder);
  return true;
};

const Vex_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'vex:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Vi_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.6;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'vi:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'vi:q:slow', 1.5, 30);
  return true;
};

const Vi_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.035;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'vi:w', ctx.recorder);
  return true;
};

const Vi_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 20 + ctx.caster.ad * 1.1 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'vi:e', ctx.recorder);
  return true;
};

const Vi_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.9;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'vi:r', ctx.recorder);
  return true;
};

const Viktor_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'viktor:q:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'viktor:q', ctx.recorder);
  return true;
};

const Viktor_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'viktor:w', ctx.recorder);
  return true;
};

const Viktor_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'viktor:e', ctx.recorder);
  return true;
};

const Viktor_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 75 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'viktor:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Vladimir_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'vladimir:q', ctx.recorder);
  return true;
};

const Vladimir_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 13.75 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'vladimir:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'vladimir:w', ctx.recorder);
  return true;
};

const Vladimir_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.35 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'vladimir:e', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'vladimir:e:slow', 1.5, 30);
  return true;
};

const Vladimir_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'vladimir:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Volibear_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.2;
  applyMs(ctx.caster, 'volibear:q:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'volibear:q', ctx.recorder);
  return true;
};

const Volibear_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 25 + ctx.caster.ad * 1 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'volibear:w', ctx.recorder);
  return true;
};

const Volibear_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  ctx.caster.statuses.push({ id: 'volibear:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'volibear:e', ctx.recorder);
  return true;
};

const Volibear_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 300 + (r - 1) * 200 + ctx.caster.ad * 0 + ctx.caster.ap * 1.25 + Math.max(0, ctx.caster.ad - 60) * 2.5;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'volibear:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Warwick_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 15 + ctx.caster.ad * 1.2 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'warwick:q', ctx.recorder);
  return true;
};

const Warwick_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'warwick:w', ctx.recorder);
  return true;
};

const Warwick_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'warwick:e', ctx.recorder);
  return true;
};

const Warwick_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 175 + (r - 1) * 175 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.67;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'warwick:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applyStun(ctx.target, 'warwick:r:cc', 1.35);
  return true;
};

const Xayah_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 45 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'xayah:q', ctx.recorder);
  return true;
};

const Xayah_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'xayah:w', ctx.recorder);
  return true;
};

const Xayah_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 55 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.6;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'xayah:e', ctx.recorder);
  return true;
};

const Xayah_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'xayah:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Xerath_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.9 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'xerath:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'xerath:q:slow', 1.5, 30);
  return true;
};

const Xerath_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'xerath:w', ctx.recorder);
  return true;
};

const Xerath_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.45 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'xerath:e', ctx.recorder);
  return true;
};

const Xerath_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 170 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.45 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'xerath:r', ctx.recorder);
  return true;
};

const XinZhao_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'xinzhao:q', ctx.recorder);
  return true;
};

const XinZhao_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 10 + ctx.caster.ad * 0.3 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'xinzhao:w', ctx.recorder);
  return true;
};

const XinZhao_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'xinzhao:e', ctx.recorder);
  return true;
};

const XinZhao_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1.1 + Math.max(0, ctx.caster.ad - 60) * 1;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'xinzhao:r', ctx.recorder);
  return true;
};

const Yorick_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 20 + ctx.caster.ad * 0.5 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'yorick:q', ctx.recorder);
  return true;
};

const Yorick_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'yorick:w', ctx.recorder);
  return true;
};

const Yorick_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'yorick:e', ctx.recorder);
  return true;
};

const Yorick_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'yorick:r', ctx.recorder);
  return true;
};

const Yuumi_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'yuumi:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'yuumi:q:slow', 1.5, 30);
  return true;
};

const Yuumi_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'yuumi:w', ctx.recorder);
  return true;
};

const Yuumi_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'yuumi:e:ms', 2.5, 25);
  ctx.caster.statuses.push({ id: 'yuumi:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'yuumi:e', ctx.recorder);
  return true;
};

const Yuumi_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'yuumi:r', ctx.recorder);
  return true;
};

const Zac_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zac:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'zac:q:slow', 1.5, 30);
  return true;
};

const Zac_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'zac:w', ctx.recorder);
  return true;
};

const Zac_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zac:e', ctx.recorder);
  return true;
};

const Zac_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 140 + (r - 1) * 70 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'zac:r:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zac:r', ctx.recorder);
  return true;
};

const Zeri_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 15 + (r - 1) * 2 + ctx.caster.ad * 1.04 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'zeri:q', ctx.recorder);
  return true;
};

const Zeri_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 40 + ctx.caster.ad * 1.3 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'zeri:w', ctx.recorder);
  return true;
};

const Zeri_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 2 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0.12;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'zeri:e', ctx.recorder);
  return true;
};

const Zeri_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1.1 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'zeri:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Ziggs_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ziggs:q', ctx.recorder);
  return true;
};

const Ziggs_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'ziggs:w', ctx.recorder);
  return true;
};

const Ziggs_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'ziggs:e', ctx.recorder);
  return true;
};

const Ziggs_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 300 + (r - 1) * 200 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'ziggs:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Zilean_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.9 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zilean:q', ctx.recorder);
  return true;
};

const Zilean_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zilean:w', ctx.recorder);
  return true;
};

const Zilean_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zilean:e', ctx.recorder);
  return true;
};

const Zilean_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zilean:r', ctx.recorder);
  return true;
};

const Zoe_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 2 + (r - 1) * 2.8200000000000003 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'zoe:q', ctx.recorder);
  return true;
};

const Zoe_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.15 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'zoe:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zoe:w', ctx.recorder);
  return true;
};

const Zoe_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.45 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zoe:e', ctx.recorder);
  return true;
};

const Zoe_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'zoe:r:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'zoe:r', ctx.recorder);
  return true;
};

const Zyra_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'zyra:q', ctx.recorder);
  return true;
};

const Zyra_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'zyra:w', ctx.recorder);
  return true;
};

const Zyra_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'zyra:e', ctx.recorder);
  return true;
};

const Zyra_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 180 + (r - 1) * 85 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'zyra:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

export const SIGNATURE_BATCH_H: Record<string, AbilityExecutor> = {
  'Udyr:Q': Udyr_Q,
  'Udyr:W': Udyr_W,
  'Udyr:E': Udyr_E,
  'Udyr:R': Udyr_R,
  'Urgot:Q': Urgot_Q,
  'Urgot:W': Urgot_W,
  'Urgot:E': Urgot_E,
  'Urgot:R': Urgot_R,
  'Varus:Q': Varus_Q,
  'Varus:W': Varus_W,
  'Varus:E': Varus_E,
  'Varus:R': Varus_R,
  'Vayne:Q': Vayne_Q,
  'Vayne:W': Vayne_W,
  'Vayne:E': Vayne_E,
  'Vayne:R': Vayne_R,
  'Veigar:Q': Veigar_Q,
  'Veigar:W': Veigar_W,
  'Veigar:E': Veigar_E,
  'Veigar:R': Veigar_R,
  'Velkoz:Q': Velkoz_Q,
  'Velkoz:W': Velkoz_W,
  'Velkoz:E': Velkoz_E,
  'Velkoz:R': Velkoz_R,
  'Vex:Q': Vex_Q,
  'Vex:W': Vex_W,
  'Vex:E': Vex_E,
  'Vex:R': Vex_R,
  'Vi:Q': Vi_Q,
  'Vi:W': Vi_W,
  'Vi:E': Vi_E,
  'Vi:R': Vi_R,
  'Viktor:Q': Viktor_Q,
  'Viktor:W': Viktor_W,
  'Viktor:E': Viktor_E,
  'Viktor:R': Viktor_R,
  'Vladimir:Q': Vladimir_Q,
  'Vladimir:W': Vladimir_W,
  'Vladimir:E': Vladimir_E,
  'Vladimir:R': Vladimir_R,
  'Volibear:Q': Volibear_Q,
  'Volibear:W': Volibear_W,
  'Volibear:E': Volibear_E,
  'Volibear:R': Volibear_R,
  'Warwick:Q': Warwick_Q,
  'Warwick:W': Warwick_W,
  'Warwick:E': Warwick_E,
  'Warwick:R': Warwick_R,
  'Xayah:Q': Xayah_Q,
  'Xayah:W': Xayah_W,
  'Xayah:E': Xayah_E,
  'Xayah:R': Xayah_R,
  'Xerath:Q': Xerath_Q,
  'Xerath:W': Xerath_W,
  'Xerath:E': Xerath_E,
  'Xerath:R': Xerath_R,
  'XinZhao:Q': XinZhao_Q,
  'XinZhao:W': XinZhao_W,
  'XinZhao:E': XinZhao_E,
  'XinZhao:R': XinZhao_R,
  'Yorick:Q': Yorick_Q,
  'Yorick:W': Yorick_W,
  'Yorick:E': Yorick_E,
  'Yorick:R': Yorick_R,
  'Yuumi:Q': Yuumi_Q,
  'Yuumi:W': Yuumi_W,
  'Yuumi:E': Yuumi_E,
  'Yuumi:R': Yuumi_R,
  'Zac:Q': Zac_Q,
  'Zac:W': Zac_W,
  'Zac:E': Zac_E,
  'Zac:R': Zac_R,
  'Zeri:Q': Zeri_Q,
  'Zeri:W': Zeri_W,
  'Zeri:E': Zeri_E,
  'Zeri:R': Zeri_R,
  'Ziggs:Q': Ziggs_Q,
  'Ziggs:W': Ziggs_W,
  'Ziggs:E': Ziggs_E,
  'Ziggs:R': Ziggs_R,
  'Zilean:Q': Zilean_Q,
  'Zilean:W': Zilean_W,
  'Zilean:E': Zilean_E,
  'Zilean:R': Zilean_R,
  'Zoe:Q': Zoe_Q,
  'Zoe:W': Zoe_W,
  'Zoe:E': Zoe_E,
  'Zoe:R': Zoe_R,
  'Zyra:Q': Zyra_Q,
  'Zyra:W': Zyra_W,
  'Zyra:E': Zyra_E,
  'Zyra:R': Zyra_R,
};
