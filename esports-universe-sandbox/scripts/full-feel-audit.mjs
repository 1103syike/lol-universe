import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { LCK_ROLE_CURVE } from '../src/app/shared/sim-v2/diagnostics/lck-role-curve.ts';
import { isLegendaryItem } from '../src/app/shared/sim-v2/economy/economy.ts';

const BOOT_UPGRADES = new Set([
  'PlatedSteelcaps',
  'BerserkersGreaves',
  'BootsofSwiftness',
  'SorcerersShoes',
  'MercurysTreads',
  'IonianBootsofLucidity',
  'MobilityBoots',
]);

function roster(side, bots) {
  return [
    ['TOP', bots.top],
    ['JUNGLE', bots.jg],
    ['MID', bots.mid],
    ['BOT', bots.bot],
    ['SUPPORT', bots.sup],
  ].map(([position, championId]) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId,
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
    blue: { top: 'Ornn', jg: 'Sejuani', mid: 'Galio', bot: 'Sion', sup: 'Braum' },
    red: { top: 'Aatrox', jg: 'LeeSin', mid: 'Ahri', bot: 'Jinx', sup: 'Thresh' },
  },
  {
    name: 'assassin',
    blue: { top: 'Riven', jg: 'Khazix', mid: 'Zed', bot: 'Samira', sup: 'Pyke' },
    red: { top: 'Camille', jg: 'Elise', mid: 'Akali', bot: 'Kaisa', sup: 'Nautilus' },
  },
];

const seeds = [1000, 1100, 1200, 2000, 3000, 4000, 5000, 7000];
const roles = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];

function mean(arr) {
  return arr.reduce((s, x) => s + x, 0) / Math.max(1, arr.length);
}

function pct(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function summarize(arr) {
  if (!arr.length) return null;
  return {
    n: arr.length,
    min: Number(Math.min(...arr).toFixed(2)),
    p10: Number(pct(arr, 0.1).toFixed(2)),
    avg: Number(mean(arr).toFixed(2)),
    p90: Number(pct(arr, 0.9).toFixed(2)),
    max: Number(Math.max(...arr).toFixed(2)),
  };
}

function lckDelta(avg, target) {
  return Number((((avg - target) / target) * 100).toFixed(1));
}

const byRole = Object.fromEntries(
  roles.map((role) => [role, { gpm: [], csm: [], dpm: [], dtpm: [], recalls: [], legendaries: [] }]),
);
const flags = [];
const buildPlans = {};
let games = 0;
let totalKills = 0;
let emptyRecallish = 0;
let lateBootGames = 0;
let bootSample = 0;

for (const [compIndex, comp] of comps.entries()) {
  for (const seed of seeds) {
    games += 1;
    const { state, replay } = simulateV2Match({
      versionId: 'demo-a',
      seed: seed + compIndex * 17,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', comp.blue),
      red: roster('red', comp.red),
      maxDurationSec: 1800,
    });
    const mins = Math.max(1, state.scheduler.time / 60);
    const kills = state.champions.reduce((s, c) => s + (c.kills ?? 0), 0);
    totalKills += kills;
    if (kills < 8 || kills > 55) {
      flags.push(`${comp.name}#${seed}: kills=${kills} duration=${mins.toFixed(1)}m`);
    }

    const buyEvents = (replay.events ?? []).filter((e) => e.type === 'item_buy' && !e.payload?.sold);
    for (const champ of state.champions) {
      const role = champ.positionLabel;
      const bucket = byRole[role];
      const gpm = champ.earnedGold / mins;
      const csm = champ.cs / mins;
      const dpm = champ.damageToChampions / mins;
      const dtpm = champ.damageTaken / mins;
      bucket.gpm.push(gpm);
      bucket.csm.push(csm);
      bucket.dpm.push(dpm);
      bucket.dtpm.push(dtpm);
      bucket.recalls.push(champ.recallCount ?? 0);

      const legendaries = champ.items.filter((id) => isLegendaryItem(state.lockedPack.items[id])).length;
      bucket.legendaries.push(legendaries);

      const planKey = `${champ.championId}@${role}`;
      buildPlans[planKey] ??= new Set();
      const core = (champ.shopPlan ?? champ.items)
        .filter((id) => !['DoransBlade', 'DoransRing', 'DoransShield', 'WorldAtlas', 'Boots'].includes(id))
        .slice(0, 4)
        .join('>');
      buildPlans[planKey].add(core || champ.items.slice(0, 4).join('>'));

      const champBuys = buyEvents
        .filter((e) => e.actorId === champ.id)
        .map((e) => e.payload?.itemId)
        .filter(Boolean);
      const firstBoot =
        champBuys.findIndex((id) => id === 'Boots' || BOOT_UPGRADES.has(id));
      const firstLegendaryBuy = champBuys.findIndex((id) =>
        isLegendaryItem(state.lockedPack.items[id]),
      );
      if (role !== 'SUPPORT' && firstBoot >= 0) {
        bootSample += 1;
        if (firstLegendaryBuy >= 0 && firstBoot > firstLegendaryBuy + 2) {
          lateBootGames += 1;
          if (lateBootGames <= 8) {
            flags.push(
              `${comp.name}#${seed} ${champ.championId}: boots after several buys (boot#${firstBoot}, leg#${firstLegendaryBuy})`,
            );
          }
        }
      }

      if ((champ.recallCount ?? 0) >= 4 && legendaries === 0 && champ.earnedGold > 6000) {
        emptyRecallish += 1;
        flags.push(
          `${comp.name}#${seed} ${champ.championId}: recalls=${champ.recallCount} but 0 legendaries gold=${Math.round(champ.earnedGold)}`,
        );
      }
    }
  }
}

console.log(`\n=== FULL FEEL AUDIT (${games} games, ${comps.length} comps × ${seeds.length} seeds) ===`);
console.log(`avg kills/game: ${(totalKills / games).toFixed(1)}`);
console.log(`late-boot rate (non-sup): ${bootSample ? ((lateBootGames / bootSample) * 100).toFixed(1) : 0}%`);
console.log(`suspicious empty-ish recall cases: ${emptyRecallish}`);

console.log('\n--- Role curve vs LCK avg ---');
for (const role of roles) {
  const b = byRole[role];
  const lck = LCK_ROLE_CURVE[role];
  const gpm = summarize(b.gpm);
  const csm = summarize(b.csm);
  const dpm = summarize(b.dpm);
  const dtpm = summarize(b.dtpm);
  const recalls = summarize(b.recalls);
  const legs = summarize(b.legendaries);
  console.log(
    `\n${role}\n  GPM  ${gpm.min}/${gpm.avg}/${gpm.max}  LCK ${lck.gpm.avg} (${lckDelta(gpm.avg, lck.gpm.avg)}%)\n  CSM  ${csm.min}/${csm.avg}/${csm.max}  LCK ${lck.csm.avg} (${lckDelta(csm.avg, lck.csm.avg)}%)\n  DPM  ${dpm.min}/${dpm.avg}/${dpm.max}  LCK ${lck.dpm.avg} (${lckDelta(dpm.avg, lck.dpm.avg)}%)\n  DTPM ${dtpm.min}/${dtpm.avg}/${dtpm.max}  LCK~${lck.dtpm.avg} (${lckDelta(dtpm.avg, lck.dtpm.avg)}%)\n  recalls avg ${recalls.avg} | legendaries avg ${legs.avg}`,
  );
}

console.log('\n--- Build diversity (unique plan cores) ---');
const diversity = Object.entries(buildPlans)
  .map(([k, set]) => [k, set.size])
  .sort((a, b) => b[1] - a[1]);
for (const [k, n] of diversity.slice(0, 12)) {
  console.log(`  ${k}: ${n}`);
}
const mono = diversity.filter(([, n]) => n <= 1);
console.log(`single-plan champs in this sample: ${mono.length}/${diversity.length}`);

console.log('\n--- Flags ---');
if (!flags.length) {
  console.log('  (none)');
} else {
  for (const flag of flags.slice(0, 30)) {
    console.log(`  - ${flag}`);
  }
  if (flags.length > 30) console.log(`  ... +${flags.length - 30} more`);
}
