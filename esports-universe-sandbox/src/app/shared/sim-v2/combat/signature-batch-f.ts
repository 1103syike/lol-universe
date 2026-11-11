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

const Olaf_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'olaf:q', ctx.recorder);
  return true;
};

const Olaf_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'olaf:w', ctx.recorder);
  return true;
};

const Olaf_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 45 + ctx.caster.ad * 0.5 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'olaf:e', ctx.recorder);
  return true;
};

const Olaf_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 10 + ctx.caster.ad * 0.25 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'olaf:r', ctx.recorder);
  return true;
};

const Pantheon_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 1.15;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'pantheon:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'pantheon:q:slow', 1.5, 30);
  return true;
};

const Pantheon_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'pantheon:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'pantheon:w', ctx.recorder);
  return true;
};

const Pantheon_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 55 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.5;
  ctx.caster.statuses.push({ id: 'pantheon:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'pantheon:e', ctx.recorder);
  return true;
};

const Pantheon_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 300 + (r - 1) * 200 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'pantheon:r', ctx.recorder);
  return true;
};

const Poppy_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'poppy:q', ctx.recorder);
  return true;
};

const Poppy_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'poppy:w', ctx.recorder);
  return true;
};

const Poppy_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.6;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'poppy:e', ctx.recorder);
  return true;
};

const Poppy_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.45;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'poppy:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applyStun(ctx.target, 'poppy:r:cc', 1.35);
  return true;
};

const Pyke_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.75;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'pyke:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'pyke:q:slow', 1.5, 30);
  return true;
};

const Pyke_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'pyke:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'pyke:w', ctx.recorder);
  return true;
};

const Pyke_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'pyke:e', ctx.recorder);
  return true;
};

const Pyke_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'pyke:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Qiyana_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.9;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'qiyana:q', ctx.recorder);
  return true;
};

const Qiyana_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 8 + (r - 1) * 8 + ctx.caster.ad * 0 + ctx.caster.ap * 0.45 + Math.max(0, ctx.caster.ad - 60) * 0.2;
  applyMs(ctx.caster, 'qiyana:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'qiyana:w', ctx.recorder);
  return true;
};

const Qiyana_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'qiyana:e', ctx.recorder);
  return true;
};

const Qiyana_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.25;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'qiyana:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Quinn_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0.8;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'quinn:q', ctx.recorder);
  return true;
};

const Quinn_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'quinn:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'quinn:w', ctx.recorder);
  return true;
};

const Quinn_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.2;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'quinn:e', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'quinn:e:slow', 1.5, 30);
  return true;
};

const Quinn_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'quinn:r:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'quinn:r', ctx.recorder);
  return true;
};

const Rakan_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rakan:q', ctx.recorder);
  return true;
};

const Rakan_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'rakan:w', ctx.recorder);
  return true;
};

const Rakan_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'rakan:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'rakan:e', ctx.recorder);
  return true;
};

const Rakan_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'rakan:r:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'rakan:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'rakan:r:slow', 1.8, 35);
  }
  return true;
};

const Rammus_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'rammus:q:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rammus:q', ctx.recorder);
  return true;
};

const Rammus_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'rammus:w', ctx.recorder);
  return true;
};

const Rammus_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'rammus:e', ctx.recorder);
  return true;
};

const Rammus_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'rammus:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'rammus:r:slow', 1.8, 35);
  }
  return true;
};

const RekSai_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0.3 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'reksai:q', ctx.recorder);
  return true;
};

const RekSai_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'reksai:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'reksai:w', ctx.recorder);
  return true;
};

const RekSai_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 28 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.64;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'reksai:e', ctx.recorder);
  return true;
};

const RekSai_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'reksai:r', ctx.recorder);
  return true;
};

const Rell_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'rell:q:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'rell:q', ctx.recorder);
  return true;
};

const Rell_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'rell:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rell:w', ctx.recorder);
  return true;
};

const Rell_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'rell:e:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rell:e', ctx.recorder);
  return true;
};

const Rell_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 15 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.1375 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'rell:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Renata_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'renata:q', ctx.recorder);
  if (ctx.target.kind === 'champion') pullTargetTo(ctx.caster, ctx.target, 450, ctx.state);
  if (ctx.target.kind === 'champion') applyStun(ctx.target, 'renata:q:cc', 1);
  return true;
};

const Renata_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'renata:w:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'renata:w', ctx.recorder);
  return true;
};

const Renata_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'renata:e', ctx.recorder);
  return true;
};

const Renata_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'renata:r', ctx.recorder);
  return true;
};

const Rengar_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'rengar:q', ctx.recorder);
  return true;
};

const Rengar_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rengar:w', ctx.recorder);
  return true;
};

const Rengar_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 55 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.8;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'rengar:e', ctx.recorder);
  return true;
};

const Rengar_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'rengar:r', ctx.recorder);
  return true;
};

const Rumble_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 1.1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'rumble:q', ctx.recorder);
  return true;
};

const Rumble_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'rumble:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rumble:w', ctx.recorder);
  return true;
};

const Rumble_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 55 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rumble:e', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'rumble:e:slow', 1.5, 30);
  return true;
};

const Rumble_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.175 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'rumble:r', ctx.recorder);
  return true;
};

const Ryze_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ryze:q', ctx.recorder);
  return true;
};

const Ryze_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ryze:w', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'ryze:w:slow', 1.5, 30);
  return true;
};

const Ryze_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'ryze:e', ctx.recorder);
  return true;
};

const Ryze_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ryze:r', ctx.recorder);
  return true;
};

export const SIGNATURE_BATCH_F: Record<string, AbilityExecutor> = {
  'Olaf:Q': Olaf_Q,
  'Olaf:W': Olaf_W,
  'Olaf:E': Olaf_E,
  'Olaf:R': Olaf_R,
  'Pantheon:Q': Pantheon_Q,
  'Pantheon:W': Pantheon_W,
  'Pantheon:E': Pantheon_E,
  'Pantheon:R': Pantheon_R,
  'Poppy:Q': Poppy_Q,
  'Poppy:W': Poppy_W,
  'Poppy:E': Poppy_E,
  'Poppy:R': Poppy_R,
  'Pyke:Q': Pyke_Q,
  'Pyke:W': Pyke_W,
  'Pyke:E': Pyke_E,
  'Pyke:R': Pyke_R,
  'Qiyana:Q': Qiyana_Q,
  'Qiyana:W': Qiyana_W,
  'Qiyana:E': Qiyana_E,
  'Qiyana:R': Qiyana_R,
  'Quinn:Q': Quinn_Q,
  'Quinn:W': Quinn_W,
  'Quinn:E': Quinn_E,
  'Quinn:R': Quinn_R,
  'Rakan:Q': Rakan_Q,
  'Rakan:W': Rakan_W,
  'Rakan:E': Rakan_E,
  'Rakan:R': Rakan_R,
  'Rammus:Q': Rammus_Q,
  'Rammus:W': Rammus_W,
  'Rammus:E': Rammus_E,
  'Rammus:R': Rammus_R,
  'RekSai:Q': RekSai_Q,
  'RekSai:W': RekSai_W,
  'RekSai:E': RekSai_E,
  'RekSai:R': RekSai_R,
  'Rell:Q': Rell_Q,
  'Rell:W': Rell_W,
  'Rell:E': Rell_E,
  'Rell:R': Rell_R,
  'Renata:Q': Renata_Q,
  'Renata:W': Renata_W,
  'Renata:E': Renata_E,
  'Renata:R': Renata_R,
  'Rengar:Q': Rengar_Q,
  'Rengar:W': Rengar_W,
  'Rengar:E': Rengar_E,
  'Rengar:R': Rengar_R,
  'Rumble:Q': Rumble_Q,
  'Rumble:W': Rumble_W,
  'Rumble:E': Rumble_E,
  'Rumble:R': Rumble_R,
  'Ryze:Q': Ryze_Q,
  'Ryze:W': Ryze_W,
  'Ryze:E': Ryze_E,
  'Ryze:R': Ryze_R,
};
