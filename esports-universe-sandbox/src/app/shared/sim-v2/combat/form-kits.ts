import type { AbilityDefinition } from '../version/version-pack';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { AbilitySlot } from '../types/ids';
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
  pushStatus,
  rank,
  type AbilityExecutor,
} from './ability-helpers';

export type FormId = 'a' | 'b';

function formStatusId(championId: string, form: FormId): string {
  return `${championId}:form:${form}`;
}

export function getForm(champion: ChampionEntity, championId = champion.championId): FormId {
  if (champion.statuses.some((status) => status.id === formStatusId(championId, 'b'))) {
    return 'b';
  }
  return 'a';
}

export function setForm(
  champion: ChampionEntity,
  form: FormId,
  ranges?: { a: number; b: number },
  championId = champion.championId,
): void {
  champion.statuses = champion.statuses.filter(
    (status) => !status.id.startsWith(`${championId}:form:`),
  );
  pushStatus(champion, {
    id: formStatusId(championId, form),
    kind: 'form',
    remainingSec: 1e9,
    magnitude: form === 'b' ? 1 : 0,
  });
  if (ranges) {
    champion.attackRange = form === 'b' ? ranges.b : ranges.a;
  }
}

export function toggleForm(
  champion: ChampionEntity,
  ranges?: { a: number; b: number },
  championId = champion.championId,
): FormId {
  const next: FormId = getForm(champion, championId) === 'a' ? 'b' : 'a';
  setForm(champion, next, ranges, championId);
  return next;
}

function abilityDef(
  state: GameState,
  championId: string,
  slot: AbilitySlot,
): AbilityDefinition | undefined {
  return state.lockedPack.champions[championId]?.abilities.find((ability) => ability.slot === slot);
}

export function rankedAbilityDamage(
  state: GameState,
  caster: ChampionEntity,
  slot: AbilitySlot,
  level: number,
  fallbackBase: number,
  fallbackPerLevel: number,
  fallbackAd = 0,
  fallbackAp = 0,
  fallbackBonusAd = 0,
): { raw: number; damageType: 'physical' | 'magic' | 'true' } {
  const def = abilityDef(state, caster.championId, slot);
  const r = rank(level);
  const ranked = def?.damageByRank?.[r - 1];
  const base =
    ranked != null
      ? ranked
      : (def?.damageBase ?? fallbackBase) + (def?.damagePerLevel ?? fallbackPerLevel) * (r - 1);
  const adRatio = def?.adRatio ?? fallbackAd;
  const apRatio = def?.apRatio ?? fallbackAp;
  const bonusAdRatio = def?.bonusAdRatio ?? fallbackBonusAd;
  const raw =
    base + caster.ad * adRatio + caster.ad * bonusAdRatio + caster.ap * apRatio;
  return {
    raw,
    damageType: def?.damageType ?? (apRatio > adRatio + bonusAdRatio ? 'magic' : 'physical'),
  };
}

const JAYCE_RANGE = { a: 125, b: 500 };
const NIDALEE_RANGE = { a: 525, b: 125 };
const ELISE_RANGE = { a: 550, b: 125 };
const GNAR_RANGE = { a: 400, b: 150 };

const jayceQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const form = getForm(ctx.caster, 'Jayce');
  const r = rank(ctx.level);
  if (form === 'a') {
    dashCasterTo(ctx.caster, ctx.target, 600, ctx.state);
    const { raw } = rankedAbilityDamage(
      ctx.state,
      ctx.caster,
      'Q',
      ctx.level,
      60,
      45,
      0,
      0,
      1.35,
    );
    dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'physical', 'jayce:q:hammer', ctx.recorder);
    if (ctx.target.kind === 'champion') {
      applySlow(ctx.target, 'jayce:q:slow', 2, 0.3 + r * 0.05);
    }
    return true;
  }
  const poke =
    rankedAbilityDamage(ctx.state, ctx.caster, 'Q', ctx.level, 60, 50, 0, 0, 1.4).raw * 1.05;
  dealToTarget(ctx.state, ctx.caster, ctx.target, poke, 'physical', 'jayce:q:cannon', ctx.recorder);
  return true;
};

const jayceW: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Jayce');
  const r = rank(ctx.level);
  if (form === 'b') {
    applyAs(ctx.caster, 'jayce:w:hyper', 4, 0.55 + r * 0.08);
    if (ctx.target) {
      dealToTarget(
        ctx.state,
        ctx.caster,
        ctx.target,
        ctx.caster.ad * (0.7 + r * 0.06),
        'physical',
        'jayce:w:cannon',
        ctx.recorder,
      );
    }
    return true;
  }
  const ticks = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    320,
    35 + (r - 1) * 15 + ctx.caster.ap * 0.25,
    'magic',
    'jayce:w:hammer',
    ctx.recorder,
  );
  if (ticks === 0 && ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      35 + (r - 1) * 15 + ctx.caster.ap * 0.25,
      'magic',
      'jayce:w:hammer',
      ctx.recorder,
    );
  }
  return true;
};

const jayceE: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Jayce');
  const r = rank(ctx.level);
  if (form === 'b') {
    applyMs(ctx.caster, 'jayce:e:gate', 3.2, 35 + r * 5);
    return true;
  }
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  const percent = 0.08 + (r - 1) * 0.028;
  const raw = ctx.target.maxHp * percent + ctx.caster.ad * 1.0;
  dealToTarget(ctx.state, ctx.caster, ctx.target, raw, 'magic', 'jayce:e:hammer', ctx.recorder);
  applyStun(ctx.target, 'jayce:e:knock', 0.55);
  return true;
};

const jayceR: AbilityExecutor = (ctx) => {
  const next = toggleForm(ctx.caster, JAYCE_RANGE, 'Jayce');
  applyMs(ctx.caster, 'jayce:r:swap', 0.85, 40);
  if (next === 'a') {
    applyArmor(ctx.caster, 'jayce:r:hammer-resist', 5, 8 + ctx.caster.level * 2);
  }
  return true;
};

const nidaleeQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const form = getForm(ctx.caster, 'Nidalee');
  const r = rank(ctx.level);
  if (form === 'b') {
    dashCasterTo(ctx.caster, ctx.target, 375, ctx.state);
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      70 + (r - 1) * 30 + ctx.caster.ad * 0.75 + ctx.caster.ap * 0.4,
      'physical',
      'nidalee:q:cougar',
      ctx.recorder,
    );
    return true;
  }
  const hunted = ctx.target.kind === 'champion' && ctx.target.hp / ctx.target.maxHp < 0.5;
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    (70 + (r - 1) * 40 + ctx.caster.ap * 0.5) * (hunted ? 1.4 : 1),
    'magic',
    'nidalee:q:human',
    ctx.recorder,
  );
  return true;
};

const nidaleeW: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Nidalee');
  const r = rank(ctx.level);
  if (form === 'b') {
    applyMs(ctx.caster, 'nidalee:w:pounce', 1.2, 50 + r * 6);
    if (ctx.target) {
      dashCasterTo(ctx.caster, ctx.target, 450, ctx.state);
      dealToTarget(
        ctx.state,
        ctx.caster,
        ctx.target,
        55 + (r - 1) * 25 + ctx.caster.ap * 0.3,
        'magic',
        'nidalee:w:cougar',
        ctx.recorder,
      );
    }
    return true;
  }
  hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    280,
    40 + (r - 1) * 20 + ctx.caster.ap * 0.2,
    'magic',
    'nidalee:w:trap',
    ctx.recorder,
  );
  return true;
};

const nidaleeE: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Nidalee');
  const r = rank(ctx.level);
  if (form === 'b') {
    if (!ctx.target) {
      return false;
    }
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      80 + (r - 1) * 35 + ctx.caster.ap * 0.45,
      'magic',
      'nidalee:e:cougar',
      ctx.recorder,
    );
    return true;
  }
  heal(ctx.caster, 50 + r * 25 + ctx.caster.ap * 0.5, ctx.caster);
  applyMs(ctx.caster, 'nidalee:e:haste', 3, 20 + r * 4);
  return true;
};

const nidaleeR: AbilityExecutor = (ctx) => {
  toggleForm(ctx.caster, NIDALEE_RANGE, 'Nidalee');
  applyMs(ctx.caster, 'nidalee:r:swap', 1, 35);
  return true;
};

const eliseQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const form = getForm(ctx.caster, 'Elise');
  const r = rank(ctx.level);
  if (form === 'b') {
    const missing = 1 - ctx.target.hp / Math.max(1, ctx.target.maxHp);
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      60 + (r - 1) * 30 + ctx.caster.ap * 0.3 + missing * (60 + r * 20),
      'magic',
      'elise:q:spider',
      ctx.recorder,
    );
    return true;
  }
  const current = ctx.target.hp / Math.max(1, ctx.target.maxHp);
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    40 + (r - 1) * 25 + ctx.caster.ap * 0.04 * current * 100,
    'magic',
    'elise:q:human',
    ctx.recorder,
  );
  return true;
};

const eliseW: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Elise');
  const r = rank(ctx.level);
  if (form === 'b') {
    applyAs(ctx.caster, 'elise:w:spider', 3, 0.35 + r * 0.05);
    applyMs(ctx.caster, 'elise:w:spider-ms', 3, 25 + r * 4);
    return true;
  }
  if (!ctx.target) {
    return false;
  }
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    60 + (r - 1) * 35 + ctx.caster.ap * 0.8,
    'magic',
    'elise:w:human',
    ctx.recorder,
  );
  return true;
};

const eliseE: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Elise');
  if (form === 'b') {
    applyMs(ctx.caster, 'elise:e:rappel', 2, 70);
    return true;
  }
  if (!ctx.target || ctx.target.kind !== 'champion') {
    return false;
  }
  applyStun(ctx.target, 'elise:e:cocoon', 1.4);
  return true;
};

const eliseR: AbilityExecutor = (ctx) => {
  toggleForm(ctx.caster, ELISE_RANGE, 'Elise');
  return true;
};

const gnarQ: AbilityExecutor = (ctx) => {
  if (!ctx.target) {
    return false;
  }
  const form = getForm(ctx.caster, 'Gnar');
  const r = rank(ctx.level);
  if (form === 'b') {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      45 + (r - 1) * 30 + ctx.caster.ad * 1.2,
      'physical',
      'gnar:q:mega',
      ctx.recorder,
    );
    if (ctx.target.kind === 'champion') {
      applySlow(ctx.target, 'gnar:q:slow', 1.25, 0.3);
    }
    return true;
  }
  dealToTarget(
    ctx.state,
    ctx.caster,
    ctx.target,
    35 + (r - 1) * 25 + ctx.caster.ad * 1.15,
    'physical',
    'gnar:q:mini',
    ctx.recorder,
  );
  applyMs(ctx.caster, 'gnar:q:pickup', 1.5, 25);
  return true;
};

const gnarW: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Gnar');
  const r = rank(ctx.level);
  if (form === 'b') {
    hitChampionsInRadius(
      ctx.state,
      ctx.caster,
      300,
      50 + (r - 1) * 30 + ctx.caster.ad * 1.0,
      'physical',
      'gnar:w:mega',
      ctx.recorder,
    );
    return true;
  }
  applyAs(ctx.caster, 'gnar:w:mini', 4, 0.25 + r * 0.04);
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      20 + r * 10 + ctx.caster.ad * 0.3,
      'physical',
      'gnar:w:mini',
      ctx.recorder,
    );
  }
  return true;
};

const gnarE: AbilityExecutor = (ctx) => {
  const form = getForm(ctx.caster, 'Gnar');
  const r = rank(ctx.level);
  if (ctx.target) {
    dashCasterTo(ctx.caster, ctx.target, form === 'b' ? 675 : 475, ctx.state);
  } else {
    applyMs(ctx.caster, 'gnar:e:hop', 1.2, 60);
  }
  if (ctx.target) {
    dealToTarget(
      ctx.state,
      ctx.caster,
      ctx.target,
      (form === 'b' ? 70 : 40) + (r - 1) * 25 + ctx.caster.ad * 0.6,
      'physical',
      form === 'b' ? 'gnar:e:mega' : 'gnar:e:mini',
      ctx.recorder,
    );
  }
  return true;
};

const gnarR: AbilityExecutor = (ctx) => {
  setForm(ctx.caster, 'b', GNAR_RANGE, 'Gnar');
  applyArmor(ctx.caster, 'gnar:r:mega', 8, 20 + ctx.caster.level * 2);
  const hits = hitChampionsInRadius(
    ctx.state,
    ctx.caster,
    420,
    140 + ctx.caster.level * 12 + ctx.caster.ad * 0.6,
    'physical',
    'gnar:r',
    ctx.recorder,
  );
  if (hits > 0) {
    for (const enemy of ctx.state.champions) {
      if (!enemy.alive || enemy.side === ctx.caster.side) {
        continue;
      }
      if (Math.hypot(enemy.position.x - ctx.caster.position.x, enemy.position.y - ctx.caster.position.y) <= 420) {
        applyStun(enemy, 'gnar:r:stun', 1.1);
      }
    }
  }
  return true;
};

export const FORM_KIT_ABILITIES: Record<string, AbilityExecutor> = {
  'Jayce:Q': jayceQ,
  'Jayce:W': jayceW,
  'Jayce:E': jayceE,
  'Jayce:R': jayceR,
  'Nidalee:Q': nidaleeQ,
  'Nidalee:W': nidaleeW,
  'Nidalee:E': nidaleeE,
  'Nidalee:R': nidaleeR,
  'Elise:Q': eliseQ,
  'Elise:W': eliseW,
  'Elise:E': eliseE,
  'Elise:R': eliseR,
  'Gnar:Q': gnarQ,
  'Gnar:W': gnarW,
  'Gnar:E': gnarE,
  'Gnar:R': gnarR,
};
