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

const Leblanc_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'leblanc:q', ctx.recorder);
  return true;
};

const Leblanc_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 75 + (r - 1) * 40 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'leblanc:w', ctx.recorder);
  return true;
};

const Leblanc_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'leblanc:e', ctx.recorder);
  return true;
};

const Leblanc_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 70 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'leblanc:r', ctx.recorder);
  return true;
};

const Lillia_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 35 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.35 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'lillia:q', ctx.recorder);
  return true;
};

const Lillia_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0.35 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'lillia:w', ctx.recorder);
  return true;
};

const Lillia_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'lillia:e', ctx.recorder);
  return true;
};

const Lillia_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 100 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'lillia:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'lillia:r:slow', 1.5, 30);
  return true;
};

const Lissandra_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.75 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'lissandra:q', ctx.recorder);
  return true;
};

const Lissandra_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'lissandra:w', ctx.recorder);
  return true;
};

const Lissandra_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'lissandra:e', ctx.recorder);
  return true;
};

const Lissandra_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.75 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'lissandra:r', ctx.recorder);
  return true;
};

const Malzahar_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.55 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'malzahar:q', ctx.recorder);
  return true;
};

const Malzahar_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 3.5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'malzahar:w', ctx.recorder);
  return true;
};

const Malzahar_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'malzahar:e', ctx.recorder);
  return true;
};

const Malzahar_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 125 + (r - 1) * 75 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'malzahar:r', ctx.recorder);
  return true;
};

const Maokai_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'maokai:q', ctx.recorder);
  return true;
};

const Maokai_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'maokai:w', ctx.recorder);
  return true;
};

const Maokai_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0.25 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'maokai:e', ctx.recorder);
  return true;
};

const Maokai_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 75 + ctx.caster.ad * 0 + ctx.caster.ap * 0.75 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'maokai:r:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'maokai:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'maokai:r:slow', 1.5, 30);
  return true;
};

const MasterYi_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 20 + ctx.caster.ad * 0.7 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'masteryi:q', ctx.recorder);
  return true;
};

const MasterYi_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  const missing = ctx.target.kind === 'champion' ? 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp) : 0;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw + missing * (80 + r * 40), 'physical', 'masteryi:w', ctx.recorder);
  return true;
};

const MasterYi_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.35;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'true', 'masteryi:e', ctx.recorder);
  return true;
};

const MasterYi_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'masteryi:r', ctx.recorder);
  return true;
};

const Milio_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 60 + ctx.caster.ad * 0 + ctx.caster.ap * 1.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'milio:q', ctx.recorder);
  return true;
};

const Milio_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'milio:w', ctx.recorder);
  return true;
};

const Milio_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'milio:e:ms', 2.5, 25);
  ctx.caster.statuses.push({ id: 'milio:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'milio:e', ctx.recorder);
  return true;
};

const Milio_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'milio:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'milio:r:cc', 1.35);
  }
  return true;
};

const MonkeyKing_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.55;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'monkeyking:q', ctx.recorder);
  return true;
};

const MonkeyKing_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'monkeyking:w', ctx.recorder);
  return true;
};

const MonkeyKing_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'monkeyking:e', ctx.recorder);
  return true;
};

const MonkeyKing_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 5.5 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'monkeyking:r:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'monkeyking:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applyStun(ctx.target, 'monkeyking:r:cc', 1.35);
  }
  return true;
};

const Mordekaiser_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 2.65 + ctx.caster.ad * 0 + ctx.caster.ap * 0.7 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'mordekaiser:q', ctx.recorder);
  return true;
};

const Mordekaiser_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'mordekaiser:w:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'mordekaiser:w', ctx.recorder);
  return true;
};

const Mordekaiser_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 15 + ctx.caster.ad * 0 + ctx.caster.ap * 0.4 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'mordekaiser:e', ctx.recorder);
  return true;
};

const Mordekaiser_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'mordekaiser:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'mordekaiser:r:slow', 1.5, 30);
  return true;
};

const Morgana_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 55 + ctx.caster.ad * 0 + ctx.caster.ap * 0.9 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'morgana:q', ctx.recorder);
  return true;
};

const Morgana_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 6 + (r - 1) * 5.5 + ctx.caster.ad * 0 + ctx.caster.ap * 0.085 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'morgana:w', ctx.recorder);
  return true;
};

const Morgana_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'morgana:e:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'morgana:e', ctx.recorder);
  return true;
};

const Morgana_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 200 + (r - 1) * 75 + ctx.caster.ad * 0 + ctx.caster.ap * 0.8 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'morgana:r:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'morgana:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'morgana:r:slow', 1.8, 35);
  }
  return true;
};

const Naafiri_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 35 + (r - 1) * 5 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.2;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'naafiri:q', ctx.recorder);
  return true;
};

const Naafiri_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'naafiri:w', ctx.recorder);
  return true;
};

const Naafiri_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 15 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.4;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'naafiri:e', ctx.recorder);
  return true;
};

const Naafiri_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.2;
  if (ctx.target) dashCasterTo(ctx.caster, ctx.target, 550, ctx.state);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'naafiri:r', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'naafiri:r:slow', 1.5, 30);
  return true;
};

const Nami_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 90 + (r - 1) * 55 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'nami:q', ctx.recorder);
  return true;
};

const Nami_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.5 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'nami:w', ctx.recorder);
  return true;
};

const Nami_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 20 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'nami:e', ctx.recorder);
  return true;
};

const Nami_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 100 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'nami:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'nami:r:slow', 1.8, 35);
  }
  return true;
};

const Nasus_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 35 + (r - 1) * 20 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'nasus:q', ctx.recorder);
  return true;
};

const Nasus_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'nasus:w', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'nasus:w:slow', 1.5, 30);
  return true;
};

const Nasus_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 50 + (r - 1) * 30 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'nasus:e', ctx.recorder);
  return true;
};

const Nasus_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'nasus:r', ctx.recorder);
  return true;
};

const Neeko_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 50 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'neeko:q', ctx.recorder);
  return true;
};

const Neeko_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 30 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.6 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'neeko:w', ctx.recorder);
  return true;
};

const Neeko_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 70 + (r - 1) * 35 + ctx.caster.ad * 0 + ctx.caster.ap * 0.65 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'neeko:e', ctx.recorder);
  return true;
};

const Neeko_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 200 + ctx.caster.ad * 0 + ctx.caster.ap * 1.2 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'neeko:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
  }
  return true;
};

const Nilah_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 5 + (r - 1) * 5 + ctx.caster.ad * 0.9 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'nilah:q', ctx.recorder);
  return true;
};

const Nilah_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'nilah:w:ms', 2.5, 25);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'nilah:w', ctx.recorder);
  return true;
};

const Nilah_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 60 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.2;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'nilah:e', ctx.recorder);
  return true;
};

const Nilah_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 15 + (r - 1) * 10 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.1;
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'physical', 'nilah:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'nilah:r:slow', 1.8, 35);
  }
  return true;
};

const Nocturne_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 65 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0.85;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'physical', 'nocturne:q', ctx.recorder);
  return true;
};

const Nocturne_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 40 + (r - 1) * 25 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'nocturne:w', ctx.recorder);
  return true;
};

const Nocturne_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 80 + (r - 1) * 45 + ctx.caster.ad * 0 + ctx.caster.ap * 1 + Math.max(0, ctx.caster.ad - 60) * 0;
  applyMs(ctx.caster, 'nocturne:e:ms', 2.5, 25);
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'nocturne:e', ctx.recorder);
  return true;
};

const Nocturne_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 150 + (r - 1) * 125 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 1.2;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'nocturne:r', ctx.recorder);
  return true;
};

const Nunu_Q: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 400 + (r - 1) * 200 + ctx.caster.ad * 0 + ctx.caster.ap * 0 + Math.max(0, ctx.caster.ad - 60) * 0;
  heal(ctx.caster, 30 + r * 15 + ctx.caster.ap * 0.15, ctx.caster);
  if (!ctx.target) return true;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'nunu:q', ctx.recorder);
  return true;
};

const Nunu_W: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 36 + (r - 1) * 9 + ctx.caster.ad * 0 + ctx.caster.ap * 0.3 + Math.max(0, ctx.caster.ad - 60) * 0;
  if (!ctx.target) return false;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'nunu:w', ctx.recorder);
  if (ctx.target.kind === 'champion') applySlow(ctx.target, 'nunu:w:slow', 1.5, 30);
  return true;
};

const Nunu_E: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 16 + (r - 1) * 8 + ctx.caster.ad * 0 + ctx.caster.ap * 0.15 + Math.max(0, ctx.caster.ad - 60) * 0;
  hitChampionsInRadius(ctx.state, ctx.caster, 320, Math.max(raw, 20), 'magic', 'nunu:e', ctx.recorder);
  return true;
};

const Nunu_R: AbilityExecutor = (ctx) => {
  const r = rank(ctx.level);
  const raw = 625 + (r - 1) * 325 + ctx.caster.ad * 0 + ctx.caster.ap * 3 + Math.max(0, ctx.caster.ad - 60) * 0;
  ctx.caster.statuses.push({ id: 'nunu:r:shield', kind: 'shield', remainingSec: 3, magnitude: 50 + r * 25 + ctx.caster.ap * 0.3 });
  hitChampionsInRadius(ctx.state, ctx.caster, 450, Math.max(raw, 20), 'magic', 'nunu:r', ctx.recorder);
  if (ctx.target && ctx.target.kind === 'champion') {
    applySlow(ctx.target, 'nunu:r:slow', 1.8, 35);
  }
  return true;
};

export const SIGNATURE_BATCH_E: Record<string, AbilityExecutor> = {
  'Leblanc:Q': Leblanc_Q,
  'Leblanc:W': Leblanc_W,
  'Leblanc:E': Leblanc_E,
  'Leblanc:R': Leblanc_R,
  'Lillia:Q': Lillia_Q,
  'Lillia:W': Lillia_W,
  'Lillia:E': Lillia_E,
  'Lillia:R': Lillia_R,
  'Lissandra:Q': Lissandra_Q,
  'Lissandra:W': Lissandra_W,
  'Lissandra:E': Lissandra_E,
  'Lissandra:R': Lissandra_R,
  'Malzahar:Q': Malzahar_Q,
  'Malzahar:W': Malzahar_W,
  'Malzahar:E': Malzahar_E,
  'Malzahar:R': Malzahar_R,
  'Maokai:Q': Maokai_Q,
  'Maokai:W': Maokai_W,
  'Maokai:E': Maokai_E,
  'Maokai:R': Maokai_R,
  'MasterYi:Q': MasterYi_Q,
  'MasterYi:W': MasterYi_W,
  'MasterYi:E': MasterYi_E,
  'MasterYi:R': MasterYi_R,
  'Milio:Q': Milio_Q,
  'Milio:W': Milio_W,
  'Milio:E': Milio_E,
  'Milio:R': Milio_R,
  'MonkeyKing:Q': MonkeyKing_Q,
  'MonkeyKing:W': MonkeyKing_W,
  'MonkeyKing:E': MonkeyKing_E,
  'MonkeyKing:R': MonkeyKing_R,
  'Mordekaiser:Q': Mordekaiser_Q,
  'Mordekaiser:W': Mordekaiser_W,
  'Mordekaiser:E': Mordekaiser_E,
  'Mordekaiser:R': Mordekaiser_R,
  'Morgana:Q': Morgana_Q,
  'Morgana:W': Morgana_W,
  'Morgana:E': Morgana_E,
  'Morgana:R': Morgana_R,
  'Naafiri:Q': Naafiri_Q,
  'Naafiri:W': Naafiri_W,
  'Naafiri:E': Naafiri_E,
  'Naafiri:R': Naafiri_R,
  'Nami:Q': Nami_Q,
  'Nami:W': Nami_W,
  'Nami:E': Nami_E,
  'Nami:R': Nami_R,
  'Nasus:Q': Nasus_Q,
  'Nasus:W': Nasus_W,
  'Nasus:E': Nasus_E,
  'Nasus:R': Nasus_R,
  'Neeko:Q': Neeko_Q,
  'Neeko:W': Neeko_W,
  'Neeko:E': Neeko_E,
  'Neeko:R': Neeko_R,
  'Nilah:Q': Nilah_Q,
  'Nilah:W': Nilah_W,
  'Nilah:E': Nilah_E,
  'Nilah:R': Nilah_R,
  'Nocturne:Q': Nocturne_Q,
  'Nocturne:W': Nocturne_W,
  'Nocturne:E': Nocturne_E,
  'Nocturne:R': Nocturne_R,
  'Nunu:Q': Nunu_Q,
  'Nunu:W': Nunu_W,
  'Nunu:E': Nunu_E,
  'Nunu:R': Nunu_R,
};
