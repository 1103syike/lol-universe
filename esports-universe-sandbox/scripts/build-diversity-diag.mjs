import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';

function roster(side, bots) {
  return [
    { position: 'TOP', championId: bots.top },
    { position: 'JUNGLE', championId: bots.jg },
    { position: 'MID', championId: bots.mid },
    { position: 'BOT', championId: bots.bot },
    { position: 'SUPPORT', championId: bots.sup },
  ].map((row) => ({
    playerId: `${side}_${row.position}`,
    gamertag: `${side}_${row.position}`,
    position: row.position,
    championId: row.championId,
    laning: 74,
    mechanics: 72,
    teamfighting: 72,
    gameSense: 72,
    consistency: 70,
    adaptability: 68,
  }));
}

const comps = [
  {
    name: 'standard',
    blue: { top: 'Aatrox', jg: 'LeeSin', mid: 'Ahri', bot: 'Jinx', sup: 'Thresh' },
    red: { top: 'Garen', jg: 'Viego', mid: 'Syndra', bot: 'Ashe', sup: 'Lulu' },
  },
  {
    name: 'tank-fest',
    blue: { top: 'Aatrox', jg: 'LeeSin', mid: 'Ahri', bot: 'Jinx', sup: 'Thresh' },
    red: { top: 'Ornn', jg: 'Sejuani', mid: 'Malphite', bot: 'Sion', sup: 'Braum' },
  },
  {
    name: 'assassin',
    blue: { top: 'Aatrox', jg: 'LeeSin', mid: 'Ahri', bot: 'Jinx', sup: 'Thresh' },
    red: { top: 'Riven', jg: 'Khazix', mid: 'Zed', bot: 'Samira', sup: 'Pyke' },
  },
];

const byChamp = {};
for (const [compIndex, comp] of comps.entries()) {
  for (const [seedOffset, seed] of [1000, 2000, 3000, 4000].entries()) {
    const { state } = simulateV2Match({
      versionId: 'demo-a',
      seed: 10_000 + compIndex * 1000 + seedOffset * 17 + seed,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', comp.blue),
      red: roster('red', comp.red),
      maxDurationSec: 1500,
    });
    for (const champ of state.champions) {
      if (champ.side !== 'blue') continue;
      const key = `${champ.championId}@${champ.positionLabel}`;
      byChamp[key] ??= new Set();
      const planCore = (champ.shopPlan ?? [])
        .filter(
          (id) =>
            ![
              'DoransBlade',
              'DoransRing',
              'DoransShield',
              'WorldAtlas',
              'Boots',
              'LongSword',
              'AmplifyingTome',
              'RubyCrystal',
              'ClothArmor',
              'FaerieCharm',
              'BFSword',
              'Pickaxe',
              'CloakofAgility',
              'Noonquiver',
              'Zeal',
              'LastWhisper',
              'VampiricScepter',
              'BamisCinder',
              'Kindlegem',
              'ForbiddenIdol',
              'LostChapter',
              'BlastingWand',
              'NeedlesslyLargeRod',
              'Tunneler',
              'Tiamat',
              'RecurveBow',
              'GiantsBelt',
              'NegatronCloak',
              'ChainVest',
            ].includes(id),
        )
        .slice(0, 5)
        .join(' > ');
      const bought = champ.items.slice(0, 6).join(' > ');
      byChamp[key].add(`${comp.name}#${seed}: plan=${planCore || '(empty)'} | bought=${bought}`);
    }
  }
}

for (const [key, plans] of Object.entries(byChamp)) {
  console.log(`\n${key} (${plans.size} variants)`);
  for (const plan of plans) {
    console.log(`  - ${plan}`);
  }
}
