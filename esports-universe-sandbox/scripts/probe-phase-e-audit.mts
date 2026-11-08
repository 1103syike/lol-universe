import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import { validateBoxScore } from '../src/app/shared/sim/invariants.ts';
import { buildMatchDigest } from '../src/app/shared/sim/derive-from-box.ts';
import { recountKillsFromTimeline } from '../src/app/shared/sim/reduce-stats.ts';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universeEntry = (db.entries as Array<{ id: string; value: unknown }>).find(
  (entry) => entry.id.startsWith('eus.universe.') && (entry.value as { players?: unknown })?.players,
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

const home = side('GT');
const away = side('ahq');

const audits = [];
for (let seed = 0; seed < 12; seed += 1) {
  const report = simulateGame({
    home: home.input,
    away: away.input,
    random: mulberry32(20261108 + seed * 97),
  });
  const box = report.boxScore!;
  const issues = validateBoxScore(box);
  const kills = box.timeline.filter(
    (event) => event.type === 'first-blood' || event.type === 'kill' || event.type === 'mistake',
  );
  const recounted = recountKillsFromTimeline(box.timeline);
  const digest = buildMatchDigest(box, { home: 'GT', away: 'ahq' });
  const towers = box.timeline.filter((event) => event.type === 'tower');
  const inhibs = box.timeline.filter((event) => event.type === 'inhibitor');
  const nexusTowers = towers.filter((event) => event.payload?.towerTier === 'nexus');
  const objs = box.timeline.filter((event) =>
    ['dragon', 'dragon-soul', 'baron', 'elder', 'voidgrub', 'herald'].includes(event.type),
  );
  const nexus = box.timeline.find((event) => event.type === 'nexus');
  const elder = objs.filter((event) => event.type === 'elder');
  const winnerId = box.winnerTeamId;
  const winnerInhibs = inhibs.filter((event) => event.teamId === winnerId);
  const winnerNexusTowers = nexusTowers.filter((event) => event.teamId === winnerId);
  const towersMissingDefender = towers.filter((event) => !event.payload?.defenderTeamId).length;
  const azhi = box.players.find((player) => player.gamertag === 'Azhi');
  const azhiDeaths = kills
    .filter((event) => event.victimPlayerId === azhi?.playerId)
    .map((event) => ({
      t: event.t,
      clock: `${Math.floor(event.t / 60)}:${String(Math.floor(event.t % 60)).padStart(2, '0')}`,
      hasKiller: Boolean(event.actorPlayerId),
      assistCount: event.assistPlayerIds?.length ?? 0,
      killGold: event.payload?.killGold ?? null,
    }));

  const sameSecond = [];
  const sorted = box.timeline
    .filter((event) => event.type !== 'income' && event.type !== 'combat')
    .slice()
    .sort((left, right) => left.t - right.t);
  for (let index = 1; index < sorted.length; index += 1) {
    const prev = sorted[index - 1];
    const curr = sorted[index];
    if (prev.t === curr.t) {
      sameSecond.push({ t: curr.t, types: [prev.type, curr.type] });
    }
  }

  const dragonTimes = objs.filter((event) => event.type === 'dragon' || event.type === 'dragon-soul').map((e) => e.t);
  const dragonGaps = dragonTimes.slice(1).map((t, i) => t - dragonTimes[i]);

  audits.push({
    seed,
    score: `${box.home.kills}-${box.away.kills}`,
    durationSec: box.durationSec,
    issues: issues.map((issue) => issue.code),
    timelineKillEvents: kills.length,
    boxKills: box.home.kills + box.away.kills,
    recountKills: [...recounted.killsByPlayer.values()].reduce((sum, value) => sum + value, 0),
    missingKillerOrVictim: kills.filter((event) => !event.actorPlayerId || !event.victimPlayerId).length,
    digestLen: digest.length,
    digestKillMentions: digest.filter((line) => /擊殺|First Blood|失誤/.test(line)).length,
    towers: towers.map((event) => ({
      t: event.t,
      taker: event.teamId === home.team.id ? 'GT' : 'ahq',
      defender: event.payload?.defenderTeamId === home.team.id ? 'GT' : event.payload?.defenderTeamId ? 'ahq' : null,
      lane: event.payload?.towerLane ?? null,
      tier: event.payload?.towerTier ?? null,
      summary: event.summary,
      hasDefenderId: Boolean(event.payload?.defenderTeamId),
    })),
    inhibCount: inhibs.length,
    nexusTowerCount: nexusTowers.length,
    baseTowerCount: towers.filter((event) => event.payload?.towerTier === 3).length,
    winnerSiegeReady: winnerInhibs.length >= 1 && winnerNexusTowers.length >= 2,
    towersMissingDefender,
    objs: objs.map((event) => ({
      t: event.t,
      type: event.type,
      intent: event.payload?.objectiveIntent ?? null,
      opp: event.payload?.opponentIntent ?? null,
      method: event.payload?.objectiveMethod ?? null,
    })),
    dragonGaps,
    elderCount: elder.length,
    elderToNexusSec:
      elder.length > 0 && nexus ? nexus.t - elder[elder.length - 1].t : null,
    nexusAt: nexus?.t ?? null,
    azhiDeaths,
    azhiStats: azhi
      ? { k: azhi.kills, d: azhi.deaths, a: azhi.assists, gold: Math.round(azhi.gold) }
      : null,
    sameSecondSample: sameSecond.slice(0, 8),
    digest: digest,
  });
}

const blowout = audits.find((row) => {
  const [h, a] = row.score.split('-').map(Number);
  return h + a >= 20 && Math.min(h, a) <= 3;
});
const withElder = audits.find((row) => row.elderCount > 0) ?? audits[0];

const out = {
  note: 'Exact UI match not persisted; GT vs ahq sampled for structural audit',
  sampleCount: audits.length,
  blowoutOrHeavy: blowout ?? audits.sort((a, b) => b.boxKills - a.boxKills)[0],
  withElder,
  aggregate: {
    issueRuns: audits.filter((row) => row.issues.length > 0).length,
    killEventEqualsBox: audits.every((row) => row.timelineKillEvents === row.boxKills),
    recountEqualsBox: audits.every((row) => row.recountKills === row.boxKills),
    anyMissingKiller: audits.some((row) => row.missingKillerOrVictim > 0),
    avgDigestKillMentions:
      audits.reduce((sum, row) => sum + row.digestKillMentions, 0) / audits.length,
    avgBoxKills: audits.reduce((sum, row) => sum + row.boxKills, 0) / audits.length,
    runsWithoutFullSiegeBeforeNexus: audits.filter(
      (row) => row.nexusAt !== null && !row.winnerSiegeReady && !String(row.digest[row.digest.length - 1] ?? '').includes('時限到'),
    ).length,
    runsTimeoutEnd: audits.filter((row) =>
      String(row.digest[row.digest.length - 1] ?? '').includes('時限到'),
    ).length,
    runsMissingDefender: audits.filter((row) => row.towersMissingDefender > 0).length,
    avgDurationMin: audits.reduce((sum, row) => sum + row.durationSec / 60, 0) / audits.length,
  },
};

writeFileSync(resolve('scripts/phase-e-audit-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out.aggregate, null, 2));
console.log('wrote scripts/phase-e-audit-out.json');
console.log('focus score', out.blowoutOrHeavy.score, 'kills timeline', out.blowoutOrHeavy.timelineKillEvents, 'digest kills', out.blowoutOrHeavy.digestKillMentions);
console.log('elder sample score', out.withElder.score, 'elderToNexus', out.withElder.elderToNexusSec, 'inhib', out.withElder.inhibCount, 'baseTowers', out.withElder.baseTowerCount);
