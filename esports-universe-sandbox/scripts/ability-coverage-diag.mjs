import { CHAMPIONS } from '../src/app/core/data/champions.ts';
import { CHAMPION_KITS } from '../src/app/core/data/champion-kits.ts';
import { CHAMPION_ABILITY_EFFECTS } from '../src/app/shared/sim-v2/combat/ability-effect-tags.ts';
import { resolveAbilityExecutor } from '../src/app/shared/sim-v2/combat/executors.ts';
import { resolveArchetypeExecutor } from '../src/app/shared/sim-v2/combat/ability-archetypes.ts';
import { SIGNATURE_ABILITIES } from '../src/app/shared/sim-v2/combat/signature-abilities.ts';

const slots = ['Q', 'W', 'E', 'R'];
const legacySpecial = new Set([
  'Garen',
  'Ashe',
  'Annie',
  'LeeSin',
  'Thresh',
  'Ahri',
  'Jinx',
]);
const signatureChamps = new Set([
  ...legacySpecial,
  ...Object.keys(SIGNATURE_ABILITIES).map((key) => key.split(':')[0]),
]);

const missingKit = [];
const missingExec = [];
const missingArchetype = [];
const byClass = {};
const signature = [];
const archetypeOnly = [];

for (const champ of CHAMPIONS) {
  const kit = CHAMPION_KITS[champ.id];
  if (!kit) {
    missingKit.push(champ.id);
  }
  const combatClass = kit?.combatClass ?? 'unknown';
  byClass[combatClass] = (byClass[combatClass] ?? 0) + 1;

  let ok = true;
  for (const slot of slots) {
    const executor = resolveAbilityExecutor(champ.id, slot);
    if (typeof executor !== 'function') {
      missingExec.push(`${champ.id}:${slot}`);
      ok = false;
    }
    if (kit && !resolveArchetypeExecutor(champ.id, slot) && !signatureChamps.has(champ.id)) {
      // archetype may be null only for P; QWER should exist for kit champs
    }
  }
  if (kit) {
    for (const slot of slots) {
      if (!resolveArchetypeExecutor(champ.id, slot)) {
        missingArchetype.push(`${champ.id}:${slot}`);
      }
    }
  }
  if (!ok) {
    continue;
  }
  if (signatureChamps.has(champ.id)) {
    signature.push(champ.id);
  } else {
    archetypeOnly.push(champ.id);
  }
}

const effectCounts = {
  champions: Object.keys(CHAMPION_ABILITY_EFFECTS).length,
  selfDash: 0,
  pull: 0,
  knockup: 0,
  knockback: 0,
  hardCc: 0,
  softCc: 0,
};
for (const slots of Object.values(CHAMPION_ABILITY_EFFECTS)) {
  for (const fx of Object.values(slots)) {
    if (!fx) continue;
    if (fx.selfDash) effectCounts.selfDash += 1;
    if (fx.pull) effectCounts.pull += 1;
    if (fx.knockup) effectCounts.knockup += 1;
    if (fx.knockback) effectCounts.knockback += 1;
    if (fx.hardCc) effectCounts.hardCc += 1;
    if (fx.softCc) effectCounts.softCc += 1;
  }
}

console.log(
  JSON.stringify(
    {
      championsTotal: CHAMPIONS.length,
      kitsTotal: Object.keys(CHAMPION_KITS).length,
      missingKitCount: missingKit.length,
      missingKit: missingKit.slice(0, 20),
      missingExec,
      missingArchetypeCount: missingArchetype.length,
      byClass,
      signatureChampCount: signature.length,
      signatureChamps: signature.sort(),
      archetypeOnlyCount: archetypeOnly.length,
      signatureAbilityEntries: Object.keys(SIGNATURE_ABILITIES).length,
      allHaveQWER: missingExec.length === 0,
      parsedEffects: effectCounts,
      note: '施法時依 wiki 敘述套用 selfDash/pull/knockup/knockback/hardCc',
    },
    null,
    2,
  ),
);
