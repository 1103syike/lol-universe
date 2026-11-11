import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';

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

const blue = { top: 'Aatrox', jg: 'LeeSin', mid: 'Ahri', bot: 'Jinx', sup: 'Thresh' };
const red = { top: 'Garen', jg: 'Viego', mid: 'Syndra', bot: 'Ashe', sup: 'Lulu' };
const seeds = [1001, 1002, 1003, 1004, 1005, 2001, 2002, 2003];
const roles = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
const LCK_VSPM = { TOP: 1.1, JUNGLE: 1.7, MID: 1.3, BOT: 1.3, SUPPORT: 3.5 };
const buckets = Object.fromEntries(roles.map((r) => [r, { vs: [], wards: [], kills: [] }]));
let totalKills = 0;

for (const seed of seeds) {
  const { state } = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', blue),
    red: roster('red', red),
    maxDurationSec: 1800,
  });
  const mins = Math.max(1, state.scheduler.time / 60);
  const kills = state.champions.reduce((s, c) => s + c.kills, 0);
  totalKills += kills;
  for (const champ of state.champions) {
    const b = buckets[champ.positionLabel];
    b.vs.push(champ.visionScore / mins);
    b.wards.push(champ.wardsPlaced ?? 0);
    b.kills.push(champ.kills);
  }
  console.log(
    `seed ${seed}: ${mins.toFixed(1)}m kills=${kills} wards=${state.champions.reduce((s, c) => s + (c.wardsPlaced || 0), 0)} teamVS=${state.champions.reduce((s, c) => s + c.visionScore, 0).toFixed(0)}`,
  );
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
console.log(`\navg kills/game ${(totalKills / seeds.length).toFixed(1)}`);
for (const role of roles) {
  const b = buckets[role];
  const vspm = mean(b.vs);
  const target = LCK_VSPM[role];
  console.log(
    `${role.padEnd(8)} VSPM ${vspm.toFixed(2)} (LCK ${target}, ${(((vspm - target) / target) * 100).toFixed(0)}%) wards ${mean(b.wards).toFixed(1)} kills ${mean(b.kills).toFixed(1)}`,
  );
}
