import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import { validateBoxScore } from '../src/app/shared/sim/invariants.ts';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universeEntry = (db.entries as Array<{ id: string; value: unknown }>).find((entry) =>
  entry.id.startsWith('eus.universe.'),
);
if (!universeEntry) {
  throw new Error('universe missing');
}
const universe = universeEntry.value as {
  teams: Array<{ id: string; abbreviation: string }>;
  players: Player[];
  coaches: Coach[];
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function side(abbr: string) {
  const team = universe.teams.find((item) => item.abbreviation === abbr);
  if (!team) throw new Error(`missing ${abbr}`);
  return {
    abbr,
    id: team.id,
    input: {
      teamId: team.id,
      players: universe.players.filter((player) => player.teamId === team.id),
      coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
    },
  };
}

const pairs = [
  ['GRX', 'BMG'],
  ['JT', 'ahq'],
  ['MAD', 'DCG'],
  ['PSG', 'HKA'],
  ['GRX', 'JT'],
  ['BMG', 'MAD'],
  ['ahq', 'PSG'],
  ['DCG', 'HKA'],
] as const;

let n = 0;
let highDmgLose = 0;
let extremeDmgLose = 0;
let objKillNoCombat = 0;
let issuesTotal = 0;
let totalObjKills = 0;
let objKillsMissingCombat = 0;
let winnerGoldBehind = 0;
let winnerTowerBehind = 0;
let homeMoreDmg = 0;
let awayMoreDmg = 0;
let homeWin = 0;
let awayWin = 0;
let sumHomeDmg = 0;
let sumAwayDmg = 0;
let fightWinnerHasMoreDmg = 0;
let fightTotal = 0;
const endMethods: Record<string, number> = {};
const samples: unknown[] = [];

for (let i = 0; i < 80; i += 1) {
  const [ha, aa] = pairs[i % pairs.length];
  const home = side(ha);
  const away = side(aa);
  const report = simulateGame({
    home: home.input,
    away: away.input,
    random: mulberry32(12000 + i * 131),
  });
  n += 1;
  const box = report.boxScore;
  issuesTotal += validateBoxScore(box).length;
  const homeDmg = box.players
    .filter((player) => player.teamId === home.id)
    .reduce((sum, player) => sum + player.damageToChamps, 0);
  const awayDmg = box.players
    .filter((player) => player.teamId === away.id)
    .reduce((sum, player) => sum + player.damageToChamps, 0);
  sumHomeDmg += homeDmg;
  sumAwayDmg += awayDmg;
  if (homeDmg >= awayDmg) homeMoreDmg += 1;
  else awayMoreDmg += 1;

  const winnerHome = report.winnerTeamId === home.id;
  if (winnerHome) homeWin += 1;
  else awayWin += 1;

  const winnerDmg = winnerHome ? homeDmg : awayDmg;
  const loserDmg = winnerHome ? awayDmg : homeDmg;
  const dmgRatio = loserDmg / Math.max(1, winnerDmg);
  if (loserDmg > winnerDmg) highDmgLose += 1;
  if (dmgRatio >= 1.25) {
    extremeDmgLose += 1;
    if (samples.length < 8) {
      const end = [...box.timeline].reverse().find((event) => event.type === 'nexus');
      samples.push({
        match: `${ha} vs ${aa}`,
        winner: winnerHome ? ha : aa,
        dmg: `${Math.round(homeDmg / 1000)}k-${Math.round(awayDmg / 1000)}k`,
        kills: `${box.home.kills}-${box.away.kills}`,
        gold: `${Math.round(box.home.totalGold / 1000)}k-${Math.round(box.away.totalGold / 1000)}k`,
        towers: `${box.home.towers}-${box.away.towers}`,
        end: end?.payload?.endMethod ?? 'none',
        ratio: Number(dmgRatio.toFixed(2)),
      });
    }
  }

  const end = [...box.timeline].reverse().find((event) => event.type === 'nexus');
  const method = String(end?.payload?.endMethod ?? 'none');
  endMethods[method] = (endMethods[method] ?? 0) + 1;

  const winnerSide = winnerHome ? box.home : box.away;
  const loserSide = winnerHome ? box.away : box.home;
  if (winnerSide.totalGold < loserSide.totalGold) winnerGoldBehind += 1;
  if (winnerSide.towers < loserSide.towers) winnerTowerBehind += 1;

  const objKills = box.timeline.filter(
    (event) =>
      event.type === 'kill' &&
      (event.payload?.killContext === 'dragon' ||
        event.payload?.killContext === 'baron' ||
        event.payload?.killContext === 'elder'),
  );
  let missingInGame = 0;
  for (const kill of objKills) {
    totalObjKills += 1;
    const hasCombat = box.timeline.some(
      (event) => event.type === 'combat' && Math.abs(event.t - kill.t) <= 3,
    );
    if (!hasCombat) {
      missingInGame += 1;
      objKillsMissingCombat += 1;
    }
  }
  if (missingInGame > 0) objKillNoCombat += 1;

  for (const event of box.timeline) {
    if (event.type !== 'combat' || !event.payload?.damageByPlayer) continue;
    fightTotal += 1;
    let h = 0;
    let a = 0;
    for (const [playerId, amount] of Object.entries(event.payload.damageByPlayer)) {
      const player = box.players.find((item) => item.playerId === playerId);
      if (!player) continue;
      if (player.teamId === home.id) h += Number(amount);
      else a += Number(amount);
    }
    const combatWinnerHome = event.teamId === home.id;
    if ((combatWinnerHome && h >= a) || (!combatWinnerHome && a >= h)) {
      fightWinnerHasMoreDmg += 1;
    }
  }
}

const out = {
  n,
  highDmgLose,
  highDmgLosePct: Number(((highDmgLose / n) * 100).toFixed(1)),
  extremeDmgLose,
  extremePct: Number(((extremeDmgLose / n) * 100).toFixed(1)),
  winnerGoldBehind,
  winnerTowerBehind,
  homeMoreDmg,
  awayMoreDmg,
  homeWin,
  awayWin,
  avgHomeDmgK: Number((sumHomeDmg / n / 1000).toFixed(1)),
  avgAwayDmgK: Number((sumAwayDmg / n / 1000).toFixed(1)),
  fightWinnerHasMoreDmgPct: fightTotal
    ? Number(((fightWinnerHasMoreDmg / fightTotal) * 100).toFixed(1))
    : 0,
  objKillNoCombatGames: objKillNoCombat,
  totalObjKills,
  objKillsMissingCombat,
  objMissingPct: totalObjKills
    ? Number(((objKillsMissingCombat / totalObjKills) * 100).toFixed(1))
    : 0,
  issuesTotal,
  endMethods,
  samples,
};

writeFileSync(resolve('scripts/probe-damage-win-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
