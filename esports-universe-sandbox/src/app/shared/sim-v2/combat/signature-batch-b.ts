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

const AurelionSol_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5.62 + (r - 1) * 1.88 + ctx.caster.ad * 0 + ctx.caster.ap * 0.0688 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'aurelionsol:q', ctx.recorder);
  return true;
};

const AurelionSol_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'aurelionsol:w', ctx.recorder);
  return true;
};

const AurelionSol_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 2.5 + (r - 1) * 1.25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.03 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'aurelionsol:e', ctx.recorder);
  return true;
};

const AurelionSol_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.75 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'aurelionsol:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Aurora_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 45 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'aurora:q', ctx.recorder);
  return true;
};

const Aurora_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'aurora:w', ctx.recorder);
  return true;
};

const Aurora_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'aurora:e', ctx.recorder);
  return true;
};

const Aurora_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 175 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'aurora:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'aurora:r:slow', 1.8, 35);
  }
  return true;
};

const Bard_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'bard:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'bard:q:slow', 1.5, 30);
  return true;
};

const Bard_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'bard:w', ctx.recorder);
  return true;
};

const Bard_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'bard:e', ctx.recorder);
  return true;
};

const Bard_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'bard:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Belveth_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 5 + ctx.caster.ad * 1 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'belveth:q', ctx.recorder);
  return true;
};

const Belveth_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 1.25 + Math.max(0, ctx.caster.ad - 60) * 1;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'belveth:w', ctx.recorder);
  return true;
};

const Belveth_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 6 + (r - 1) * 1 + ctx.caster.ad * 0.08 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'belveth:e', ctx.recorder);
  return true;
};

const Belveth_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 6 + (r - 1) * 2 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.12;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'belveth:r', ctx.recorder);
  return true;
};

const Brand_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'brand:q', ctx.recorder);
  return true;
};

const Brand_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'brand:w', ctx.recorder);
  return true;
};

const Brand_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 55 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'brand:e', ctx.recorder);
  return true;
};

const Brand_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 75 + ctx.caster.ad * 0 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'brand:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Braum_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'braum:q:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'braum:q', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'braum:q:slow', 1.5, 30);
  return true;
};

const Braum_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'braum:w', ctx.recorder);
  return true;
};

const Braum_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'braum:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'braum:e', ctx.recorder);
  return true;
};

const Braum_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 150 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'braum:r:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'braum:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Briar_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0.8;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'briar:q', ctx.recorder);
  return true;
};

const Briar_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0.6 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'briar:w', ctx.recorder);
  return true;
};

const Briar_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 1;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'briar:e', ctx.recorder);
  return true;
};

const Briar_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 1.2 + Math.max(0, ctx.caster.ad - 60) * 0.5;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'briar:r', ctx.recorder);
  return true;
};

const Cassiopeia_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'cassiopeia:q', ctx.recorder);
  return true;
};

const Cassiopeia_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'cassiopeia:w', ctx.recorder);
  return true;
};

const Cassiopeia_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'cassiopeia:e', ctx.recorder);
  return true;
};

const Cassiopeia_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'cassiopeia:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'cassiopeia:r:slow', 1.8, 35);
  }
  return true;
};

const Chogath_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 55 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'chogath:q', ctx.recorder);
  return true;
};

const Chogath_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'chogath:w', ctx.recorder);
  return true;
};

const Chogath_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'chogath:e', ctx.recorder);
  return true;
};

const Chogath_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 300 + (r - 1) * 175 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'chogath:r', ctx.recorder);
  return true;
};

const Corki_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 1.3;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'corki:q', ctx.recorder);
  return true;
};

const Corki_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'corki:w', ctx.recorder);
  return true;
};

const Corki_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 3.119999999999999 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.15;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'corki:e', ctx.recorder);
  return true;
};

const Corki_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 90 + (r - 1) * 80 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.85;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'corki:r', ctx.recorder);
  return true;
};

export const SIGNATURE_BATCH_B: Record<string, AbilityExecutor> = {
  'AurelionSol:Q': AurelionSol_Q,
  'AurelionSol:W': AurelionSol_W,
  'AurelionSol:E': AurelionSol_E,
  'AurelionSol:R': AurelionSol_R,
  'Aurora:Q': Aurora_Q,
  'Aurora:W': Aurora_W,
  'Aurora:E': Aurora_E,
  'Aurora:R': Aurora_R,
  'Bard:Q': Bard_Q,
  'Bard:W': Bard_W,
  'Bard:E': Bard_E,
  'Bard:R': Bard_R,
  'Belveth:Q': Belveth_Q,
  'Belveth:W': Belveth_W,
  'Belveth:E': Belveth_E,
  'Belveth:R': Belveth_R,
  'Brand:Q': Brand_Q,
  'Brand:W': Brand_W,
  'Brand:E': Brand_E,
  'Brand:R': Brand_R,
  'Braum:Q': Braum_Q,
  'Braum:W': Braum_W,
  'Braum:E': Braum_E,
  'Braum:R': Braum_R,
  'Briar:Q': Briar_Q,
  'Briar:W': Briar_W,
  'Briar:E': Briar_E,
  'Briar:R': Briar_R,
  'Cassiopeia:Q': Cassiopeia_Q,
  'Cassiopeia:W': Cassiopeia_W,
  'Cassiopeia:E': Cassiopeia_E,
  'Cassiopeia:R': Cassiopeia_R,
  'Chogath:Q': Chogath_Q,
  'Chogath:W': Chogath_W,
  'Chogath:E': Chogath_E,
  'Chogath:R': Chogath_R,
  'Corki:Q': Corki_Q,
  'Corki:W': Corki_W,
  'Corki:E': Corki_E,
  'Corki:R': Corki_R,
};
