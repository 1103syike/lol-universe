import { buildChampionAbilityEffects } from '../src/app/shared/sim-v2/combat/ability-effect-tags.ts';

const catalog = buildChampionAbilityEffects();
const summary = {
  champions: Object.keys(catalog).length,
  slots: 0,
  selfDash: 0,
  pull: 0,
  knockup: 0,
  knockback: 0,
  hardCc: 0,
  softCc: 0,
  samples: [],
};

for (const [id, slots] of Object.entries(catalog)) {
  for (const [slot, fx] of Object.entries(slots)) {
    if (!fx) continue;
    summary.slots += 1;
    if (fx.selfDash) summary.selfDash += 1;
    if (fx.pull) summary.pull += 1;
    if (fx.knockup) summary.knockup += 1;
    if (fx.knockback) summary.knockback += 1;
    if (fx.hardCc) summary.hardCc += 1;
    if (fx.softCc) summary.softCc += 1;
    if (
      (id === 'Malphite' && slot === 'R') ||
      (id === 'Alistar' && slot === 'W') ||
      (id === 'Blitzcrank' && slot === 'Q') ||
      (id === 'Amumu' && slot === 'Q')
    ) {
      summary.samples.push({ id: `${id}:${slot}`, effects: fx });
    }
  }
}

console.log(JSON.stringify(summary, null, 2));
console.log('effects are parsed at runtime from champion-combat descriptions');
