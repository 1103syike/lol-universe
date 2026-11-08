import { writeFileSync } from 'fs';
import { CHAMPION_KITS } from '../src/app/core/data/champion-kits.ts';

function hash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pick(id, options) {
  return options[hash(id) % options.length];
}

function buildSpec(id, kit) {
  const poke = kit.style.poke / 100;
  const engage = kit.style.engage / 100;
  const tf = kit.style.teamfight / 100;
  const split = kit.style.splitPush / 100;
  const laning = kit.style.laning / 100;
  const magic = kit.damageType === 'ap' || kit.damageType === 'hybrid';
  const dtype = magic ? 'magic' : 'physical';
  const cls = kit.combatClass;

  const qKinds = {
    fighter: poke >= 0.55 ? 'sweetspot' : engage >= 0.7 ? 'engageStrike' : 'cleave',
    mage: poke >= 0.6 ? 'poke' : 'burst',
    marksman: poke >= 0.55 ? 'poke' : 'steroid',
    assassin: 'gapclose',
    tank: engage >= 0.7 ? 'hook' : 'slam',
    support: engage >= 0.6 ? 'hook' : 'poke',
  };
  const wKinds = {
    fighter: 'guard',
    mage: poke >= 0.5 ? 'zone' : 'shield',
    marksman: 'poke',
    assassin: 'fade',
    tank: 'guard',
    support: 'shield',
  };
  const eKinds = {
    fighter: split >= 0.65 ? 'dash' : 'cleave',
    mage: 'snare',
    marksman: 'dash',
    assassin: 'strike',
    tank: 'wave',
    support: 'peel',
  };
  const rKinds = {
    fighter: 'duelUlt',
    mage: tf >= 0.7 ? 'teamUlt' : 'burstUlt',
    marksman: 'executeUlt',
    assassin: 'assassinate',
    tank: 'teamUlt',
    support: 'teamUlt',
  };

  const flavor = pick(id, ['blood', 'iron', 'storm', 'shadow', 'light', 'frost', 'flame', 'void']);

  return {
    id,
    combatClass: cls,
    damageType: dtype,
    flavor,
    Q: {
      kind: qKinds[cls],
      base: Math.round(45 + laning * 35 + poke * 25),
      perLevel: Math.round(18 + poke * 18),
      ad: Number((magic ? 0.15 : 0.55 + poke * 0.45).toFixed(2)),
      ap: Number((magic ? 0.55 + poke * 0.35 : 0.05).toFixed(2)),
      heal: Number((cls === 'fighter' || cls === 'assassin' ? 0.12 + poke * 0.12 : 0).toFixed(2)),
      cc: Number((engage * 0.9).toFixed(2)),
    },
    W: {
      kind: wKinds[cls],
      base: Math.round(30 + tf * 30),
      perLevel: Math.round(14 + tf * 12),
      ad: Number((magic ? 0.1 : 0.35).toFixed(2)),
      ap: Number((magic ? 0.45 : 0.1).toFixed(2)),
      heal: Number((cls === 'tank' || cls === 'support' || cls === 'fighter' ? 0.15 : 0.05).toFixed(2)),
      shield: Number((cls === 'tank' || cls === 'support' || cls === 'mage' ? 0.2 + engage * 0.15 : 0.08).toFixed(2)),
      cc: Number((engage * 0.5).toFixed(2)),
    },
    E: {
      kind: eKinds[cls],
      base: Math.round(35 + split * 25 + engage * 15),
      perLevel: Math.round(16 + split * 10),
      ad: Number((magic ? 0.12 : 0.5 + split * 0.25).toFixed(2)),
      ap: Number((magic ? 0.5 : 0.08).toFixed(2)),
      ms: Math.round(40 + split * 40 + engage * 20),
      cc: Number((cls === 'mage' || cls === 'support' || cls === 'tank' ? 0.7 + engage * 0.3 : engage * 0.4).toFixed(2)),
    },
    R: {
      kind: rKinds[cls],
      base: Math.round(110 + tf * 60 + kit.scaling.late * 0.5),
      perLevel: Math.round(70 + tf * 40),
      ad: Number((magic ? 0.2 : 1.0 + kit.scaling.late / 200).toFixed(2)),
      ap: Number((magic ? 0.75 + tf * 0.25 : 0.1).toFixed(2)),
      execute: Number((cls === 'marksman' || cls === 'assassin' || cls === 'fighter' ? 0.2 + kit.scaling.late / 400 : 0.08).toFixed(2)),
      aoe: cls === 'mage' || cls === 'tank' || cls === 'support' || tf >= 0.75,
      heal: Number((cls === 'fighter' ? 0.2 : cls === 'tank' ? 0.15 : 0).toFixed(2)),
      cc: Number((engage * 0.85 + (cls === 'tank' || cls === 'support' ? 0.3 : 0)).toFixed(2)),
    },
  };
}

const catalog = {};
for (const [id, kit] of Object.entries(CHAMPION_KITS)) {
  catalog[id] = buildSpec(id, kit);
}

const body = `import type { ChampionCombatClass } from '../../../core/data/champion-kits';

export type AbilityDamageType = 'physical' | 'magic' | 'true';
export type SlotKind =
  | 'sweetspot'
  | 'engageStrike'
  | 'cleave'
  | 'poke'
  | 'burst'
  | 'steroid'
  | 'gapclose'
  | 'hook'
  | 'slam'
  | 'guard'
  | 'zone'
  | 'shield'
  | 'fade'
  | 'dash'
  | 'snare'
  | 'strike'
  | 'wave'
  | 'peel'
  | 'duelUlt'
  | 'teamUlt'
  | 'burstUlt'
  | 'executeUlt'
  | 'assassinate';

export interface SlotSpec {
  kind: SlotKind;
  base: number;
  perLevel: number;
  ad: number;
  ap: number;
  heal?: number;
  shield?: number;
  ms?: number;
  cc?: number;
  execute?: number;
  aoe?: boolean;
}

export interface ChampionAbilityProfile {
  id: string;
  combatClass: ChampionCombatClass;
  damageType: AbilityDamageType;
  flavor: string;
  Q: SlotSpec;
  W: SlotSpec;
  E: SlotSpec;
  R: SlotSpec;
}

export const CHAMPION_ABILITY_CATALOG: Record<string, ChampionAbilityProfile> = ${JSON.stringify(catalog, null, 2)};
`;

writeFileSync(
  new URL('../src/app/shared/sim-v2/combat/champion-ability-catalog.ts', import.meta.url),
  body,
);
console.log('wrote', Object.keys(catalog).length, 'profiles');
