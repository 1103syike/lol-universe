import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import type { Player } from '../src/app/core/models/player.model.ts';
import { validateBoxScore } from '../src/app/shared/sim/invariants.ts';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';

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

function side(abbr: string) {
  const team = universe.teams.find((item) => item.abbreviation === abbr);
  if (!team) {
    throw new Error(`missing ${abbr}`);
  }
  return {
    team,
    input: {
      teamId: team.id,
      players: universe.players.filter((player) => player.teamId === team.id),
      coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
    },
  };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const home = side('GRX');
const away = side('BMG');
const runs = 40;
let homeWins = 0;
let issueRuns = 0;
let earlyTowerRuns = 0;
let earlyGoldSpike = 0;
let totalDuration = 0;
let totalKills = 0;
let totalAbsGold = 0;
let totalHomeDmg = 0;
let totalAwayDmg = 0;
let maxDmgRatio = 0;
let zeroPlayerDmg = 0;
let highDmgZeroKda = 0;
let highDmgZeroKill = 0;
let zeroKdaPlayers = 0;
let playerSamples = 0;
const HIGH_DMG = 8000;

for (let index = 0; index < runs; index += 1) {
  const report = simulateGame({
    home: home.input,
    away: away.input,
    random: mulberry32(12000 + index * 131),
  });
  const issues = validateBoxScore(report.boxScore!);
  if (issues.length > 0) {
    issueRuns += 1;
    console.log(`issue#${index}`, issues.slice(0, 3));
  }
  if (report.winnerTeamId === home.team.id) {
    homeWins += 1;
  }
  const box = report.boxScore!;
  totalDuration += box.durationSec;
  totalKills += box.home.kills + box.away.kills;
  const last = box.goldSeries[box.goldSeries.length - 1];
  totalAbsGold += Math.abs((last?.homeGold ?? 0) - (last?.awayGold ?? 0));
  if (box.timeline.some((event) => event.type === 'tower' && event.t < 8 * 60)) {
    earlyTowerRuns += 1;
  }
  const early = box.goldSeries.find((sample) => sample.t > 0 && sample.t <= 90);
  if (early && Math.abs(early.homeGold - early.awayGold) > 600) {
    earlyGoldSpike += 1;
  }
  const homeDmg = box.players
    .filter((player) => player.teamId === box.homeTeamId)
    .reduce((sum, player) => sum + player.damageToChamps, 0);
  const awayDmg = box.players
    .filter((player) => player.teamId === box.awayTeamId)
    .reduce((sum, player) => sum + player.damageToChamps, 0);
  totalHomeDmg += homeDmg;
  totalAwayDmg += awayDmg;
  maxDmgRatio = Math.max(
    maxDmgRatio,
    Math.max(homeDmg, awayDmg) / Math.max(1, Math.min(homeDmg, awayDmg)),
  );
  zeroPlayerDmg += box.players.filter((player) => player.damageToChamps <= 0).length;
  for (const player of box.players) {
    playerSamples += 1;
    const ka = player.kills + player.assists;
    if (player.kills === 0 && player.deaths === 0 && player.assists === 0) {
      zeroKdaPlayers += 1;
      if (player.damageToChamps >= HIGH_DMG) {
        highDmgZeroKda += 1;
      }
    }
    if (player.damageToChamps >= HIGH_DMG && player.kills === 0 && ka === 0) {
      highDmgZeroKill += 1;
    }
  }
}

console.log(
  JSON.stringify(
    {
      runs,
      homeWinRate: homeWins / runs,
      issueRuns,
      earlyTowerRuns,
      earlyGoldSpike,
      avgDurationMin: Number((totalDuration / runs / 60).toFixed(2)),
      avgKills: Number((totalKills / runs).toFixed(2)),
      avgAbsGoldEnd: Math.round(totalAbsGold / runs),
      avgHomeDamageK: Number((totalHomeDmg / runs / 1000).toFixed(1)),
      avgAwayDamageK: Number((totalAwayDmg / runs / 1000).toFixed(1)),
      maxDamageRatio: Number(maxDmgRatio.toFixed(2)),
      zeroPlayerDamageCount: zeroPlayerDmg,
      zeroKdaPlayers,
      highDmgZeroKda,
      highDmgZeroKillAssist: highDmgZeroKill,
      playerSamples,
    },
    null,
    2,
  ),
);

if (issueRuns > 0 || earlyTowerRuns > 0) {
  process.exitCode = 1;
}
