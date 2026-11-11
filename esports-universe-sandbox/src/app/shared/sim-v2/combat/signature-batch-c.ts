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

const Diana_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'diana:q', ctx.recorder);
  return true;
};

const Diana_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 12 + ctx.caster.ad * 0 + ctx.caster.ap * 0.18 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'diana:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'diana:w', ctx.recorder);
  return true;
};

const Diana_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'diana:e', ctx.recorder);
  return true;
};

const Diana_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'diana:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'diana:r:slow', 1.8, 35);
  }
  return true;
};

const Draven_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.75;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'draven:q', ctx.recorder);
  return true;
};

const Draven_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'draven:w:ms', 2.5, 25);
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'draven:w', ctx.recorder);
  return true;
};

const Draven_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'draven:e', ctx.recorder);
  return true;
};

const Draven_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 175 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.1;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'draven:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const DrMundo_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'drmundo:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'drmundo:q:slow', 1.5, 30);
  return true;
};

const DrMundo_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 3.75 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'drmundo:w', ctx.recorder);
  return true;
};

const DrMundo_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'drmundo:e', ctx.recorder);
  return true;
};

const DrMundo_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'drmundo:r:ms', 2.5, 25);
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'drmundo:r', ctx.recorder);
  return true;
};

const Ekko_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'ekko:q', ctx.recorder);
  return true;
};

const Ekko_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'ekko:w', ctx.recorder);
  return true;
};

const Ekko_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ekko:e', ctx.recorder);
  return true;
};

const Ekko_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 150 + ctx.caster.ad * 0 + ctx.caster.ap * 1.75 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'ekko:r', ctx.recorder);
  return true;
};

const Evelynn_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 25 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'evelynn:q', ctx.recorder);
  return true;
};

const Evelynn_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 250 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'evelynn:w', ctx.recorder);
  return true;
};

const Evelynn_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'evelynn:e', ctx.recorder);
  return true;
};

const Evelynn_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 125 + (r - 1) * 125 + ctx.caster.ad * 0 + ctx.caster.ap * 0.75 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'evelynn:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Fiddlesticks_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'fiddlesticks:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applyStun(ctx.target, 'fiddlesticks:q:cc', 1);
  return true;
};

const Fiddlesticks_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.45 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'fiddlesticks:w', ctx.recorder);
  return true;
};

const Fiddlesticks_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'fiddlesticks:e', ctx.recorder);
  return true;
};

const Fiddlesticks_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 37.5 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.125 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'fiddlesticks:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Fizz_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'fizz:q', ctx.recorder);
  return true;
};

const Fizz_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'fizz:w', ctx.recorder);
  return true;
};

const Fizz_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.95 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'fizz:e', ctx.recorder);
  return true;
};

const Fizz_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'fizz:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'fizz:r:slow', 1.8, 35);
  }
  return true;
};

const Galio_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'galio:q', ctx.recorder);
  return true;
};

const Galio_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  ctx.caster.statuses.push({ id: 'galio:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'galio:w', ctx.recorder);
  return true;
};

const Galio_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 90 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.9 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'galio:e', ctx.recorder);
  return true;
};

const Galio_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'galio:r:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'galio:r', ctx.recorder);
  return true;
};

const Gangplank_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 10 + (r - 1) * 30 + ctx.caster.ad * 1 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'gangplank:q', ctx.recorder);
  return true;
};

const Gangplank_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'gangplank:w', ctx.recorder);
  return true;
};

const Gangplank_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'gangplank:e', ctx.recorder);
  return true;
};

const Gangplank_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'gangplank:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

export const SIGNATURE_BATCH_C: Record<string, AbilityExecutor> = {
  'Diana:Q': Diana_Q,
  'Diana:W': Diana_W,
  'Diana:E': Diana_E,
  'Diana:R': Diana_R,
  'Draven:Q': Draven_Q,
  'Draven:W': Draven_W,
  'Draven:E': Draven_E,
  'Draven:R': Draven_R,
  'DrMundo:Q': DrMundo_Q,
  'DrMundo:W': DrMundo_W,
  'DrMundo:E': DrMundo_E,
  'DrMundo:R': DrMundo_R,
  'Ekko:Q': Ekko_Q,
  'Ekko:W': Ekko_W,
  'Ekko:E': Ekko_E,
  'Ekko:R': Ekko_R,
  'Evelynn:Q': Evelynn_Q,
  'Evelynn:W': Evelynn_W,
  'Evelynn:E': Evelynn_E,
  'Evelynn:R': Evelynn_R,
  'Fiddlesticks:Q': Fiddlesticks_Q,
  'Fiddlesticks:W': Fiddlesticks_W,
  'Fiddlesticks:E': Fiddlesticks_E,
  'Fiddlesticks:R': Fiddlesticks_R,
  'Fizz:Q': Fizz_Q,
  'Fizz:W': Fizz_W,
  'Fizz:E': Fizz_E,
  'Fizz:R': Fizz_R,
  'Galio:Q': Galio_Q,
  'Galio:W': Galio_W,
  'Galio:E': Galio_E,
  'Galio:R': Galio_R,
  'Gangplank:Q': Gangplank_Q,
  'Gangplank:W': Gangplank_W,
  'Gangplank:E': Gangplank_E,
  'Gangplank:R': Gangplank_R,
};
