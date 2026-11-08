import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import type { TimelineEvent } from '../src/app/shared/sim/match-stats.ts';

const db = JSON.parse(readFileSync(resolve('db/db.json'), 'utf8'));
const universe = (
  db.entries as Array<{ id: string; value: unknown }>
).find((entry) => entry.id.startsWith('eus.universe.') && (entry.value as { players?: unknown })?.players)!
  .value as {
  teams: Array<{ id: string; abbreviation: string }>;
  players: Player[];
  coaches: Coach[];
};

function side(abbr: string) {
  const team = universe.teams.find((item) => item.abbreviation === abbr);
  if (!team) throw new Error(abbr);
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

function clock(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

function nameMap(players: Player[]): Map<string, string> {
  return new Map(players.map((player) => [player.id, player.gamertag]));
}

function analyzeBox(
  label: string,
  homeAbbr: string,
  awayAbbr: string,
  box: NonNullable<ReturnType<typeof simulateGame>['boxScore']>,
  names: Map<string, string>,
) {
  const kills = box.timeline.filter(
    (event) => event.type === 'first-blood' || event.type === 'kill' || event.type === 'mistake',
  );
  const byBucket: Record<string, { home: number; away: number }> = {};
  for (let minute = 0; minute < 50; minute += 5) {
    byBucket[`${minute}-${minute + 5}`] = { home: 0, away: 0 };
  }
  const killRows = kills.map((event) => {
    const bucket = Math.floor(event.t / 300) * 5;
    const key = `${bucket}-${bucket + 5}`;
    if (!byBucket[key]) byBucket[key] = { home: 0, away: 0 };
    if (event.teamId === box.homeTeamId) byBucket[key].home += 1;
    if (event.teamId === box.awayTeamId) byBucket[key].away += 1;
    return {
      t: event.t,
      clock: clock(event.t),
      type: event.type,
      side: event.teamId === box.homeTeamId ? homeAbbr : awayAbbr,
      killer: names.get(event.actorPlayerId ?? '') ?? event.actorPlayerId,
      victim: names.get(event.victimPlayerId ?? '') ?? event.victimPlayerId,
      assists: (event.assistPlayerIds ?? []).map((id) => names.get(id) ?? id),
      context: event.payload?.killContext ?? null,
      intensity: event.payload?.intensity ?? null,
    };
  });

  const teamfights = box.timeline.filter((event) => event.type === 'teamfight');
  const fightKillStats = teamfights.map((fight) => {
    const related = kills.filter(
      (kill) => Math.abs(kill.t - fight.t) <= 5 && kill.teamId === fight.teamId,
    );
    return {
      t: fight.t,
      clock: clock(fight.t),
      side: fight.teamId === box.homeTeamId ? homeAbbr : awayAbbr,
      nearbyKills: related.length,
      summary: fight.summary,
    };
  });

  const objContests = box.timeline.filter(
    (event) =>
      event.type === 'dragon' ||
      event.type === 'dragon-soul' ||
      event.type === 'baron' ||
      event.type === 'elder',
  );
  const objKillStats = objContests.map((obj) => {
    const related = kills.filter(
      (kill) =>
        kill.t <= obj.t &&
        obj.t - kill.t <= 8 &&
        (kill.payload?.killContext === 'dragon' ||
          kill.payload?.killContext === 'baron' ||
          kill.payload?.killContext === 'elder' ||
          kill.payload?.killContext === 'teamfight'),
    );
    return {
      t: obj.t,
      clock: clock(obj.t),
      type: obj.type,
      side: obj.teamId === box.homeTeamId ? homeAbbr : awayAbbr,
      relatedKills: related.length,
      intent: obj.payload?.objectiveIntent ?? null,
      opp: obj.payload?.opponentIntent ?? null,
    };
  });

  const victimReuseGaps: Array<{ victim: string; gapSec: number; a: string; b: string }> = [];
  const lastDeath = new Map<string, number>();
  for (const row of killRows) {
    const victimId = kills.find((event) => clock(event.t) === row.clock && names.get(event.victimPlayerId ?? '') === row.victim)
      ?.victimPlayerId;
    if (!victimId) continue;
    const prev = lastDeath.get(victimId);
    if (prev !== undefined) {
      victimReuseGaps.push({
        victim: row.victim ?? victimId,
        gapSec: row.t - prev,
        a: clock(prev),
        b: row.clock,
      });
    }
    lastDeath.set(victimId, row.t);
  }

  const shortRespawn = victimReuseGaps.filter((row) => row.gapSec < 30);
  const homeKills = box.home.kills;
  const awayKills = box.away.kills;

  return {
    label,
    score: `${homeAbbr} ${homeKills} - ${awayKills} ${awayAbbr}`,
    durationSec: box.durationSec,
    killEventCount: kills.length,
    byBucket,
    killRows,
    teamfightCount: teamfights.length,
    fightKillStats,
    avgKillsNearTeamfight:
      fightKillStats.length === 0
        ? 0
        : fightKillStats.reduce((sum, row) => sum + row.nearbyKills, 0) / fightKillStats.length,
    maxKillsNearTeamfight: Math.max(0, ...fightKillStats.map((row) => row.nearbyKills)),
    objKillStats,
    shortRespawnSample: shortRespawn.slice(0, 20),
    shortRespawnCount: shortRespawn.length,
    minDeathGapSec:
      victimReuseGaps.length === 0 ? null : Math.min(...victimReuseGaps.map((row) => row.gapSec)),
    objectives: objContests.map((event) => ({
      clock: clock(event.t),
      type: event.type,
      side: event.teamId === box.homeTeamId ? homeAbbr : awayAbbr,
    })),
  };
}

const rm = side('RM');
const jt = side('JT');
const allPlayers = [...rm.input.players, ...jt.input.players];
const names = nameMap(allPlayers);

const candidates: Array<{
  seed: number;
  home: string;
  away: string;
  score: string;
  dur: number;
}> = [];

for (let seed = 0; seed < 600; seed += 1) {
  const report = simulateGame({
    home: rm.input,
    away: jt.input,
    random: mulberry32(700000 + seed),
  });
  const box = report.boxScore!;
  const total = box.home.kills + box.away.kills;
  const min = Math.min(box.home.kills, box.away.kills);
  const max = Math.max(box.home.kills, box.away.kills);
  if ((min <= 2 && max >= 50) || total >= 58) {
    candidates.push({
      seed: 700000 + seed,
      home: 'RM',
      away: 'JT',
      score: `${box.home.kills}-${box.away.kills}`,
      dur: box.durationSec,
    });
  }
}

for (let seed = 0; seed < 600; seed += 1) {
  const report = simulateGame({
    home: jt.input,
    away: rm.input,
    random: mulberry32(800000 + seed),
  });
  const box = report.boxScore!;
  const min = Math.min(box.home.kills, box.away.kills);
  const max = Math.max(box.home.kills, box.away.kills);
  if ((min <= 2 && max >= 50) || box.home.kills + box.away.kills >= 58) {
    candidates.push({
      seed: 800000 + seed,
      home: 'JT',
      away: 'RM',
      score: `${box.home.kills}-${box.away.kills}`,
      dur: box.durationSec,
    });
  }
}

const exactish =
  candidates.find((row) => row.score === '1-63' || row.score === '63-1') ??
  candidates.find((row) => {
    const [a, b] = row.score.split('-').map(Number);
    return Math.min(a, b) === 1 && Math.max(a, b) >= 55 && row.dur >= 40 * 60;
  }) ??
  candidates.sort((left, right) => {
    const spread = (s: string) => {
      const [a, b] = s.split('-').map(Number);
      return Math.abs(a - b);
    };
    return spread(right.score) - spread(left.score);
  })[0];

let detailed = null;
if (exactish) {
  const homeSide = exactish.home === 'RM' ? rm : jt;
  const awaySide = exactish.away === 'RM' ? rm : jt;
  const report = simulateGame({
    home: homeSide.input,
    away: awaySide.input,
    random: mulberry32(exactish.seed),
  });
  detailed = analyzeBox(
    `seed ${exactish.seed}`,
    exactish.home,
    exactish.away,
    report.boxScore!,
    names,
  );
}

const distribution = {
  searched: 1200,
  extremeCandidates: candidates.length,
  candidateSample: candidates.slice(0, 25),
  detailed,
};

writeFileSync(resolve('scripts/rm-jt-kill-audit.json'), JSON.stringify(distribution, null, 2));
console.log(
  JSON.stringify(
    {
      extremeCandidates: candidates.length,
      picked: exactish ?? null,
      detailedScore: detailed?.score ?? null,
      killEvents: detailed?.killEventCount ?? null,
      shortRespawnCount: detailed?.shortRespawnCount ?? null,
      minDeathGapSec: detailed?.minDeathGapSec ?? null,
      teamfights: detailed?.teamfightCount ?? null,
      avgKillsNearTf: detailed?.avgKillsNearTeamfight ?? null,
      maxKillsNearTf: detailed?.maxKillsNearTeamfight ?? null,
      buckets: detailed?.byBucket ?? null,
    },
    null,
    2,
  ),
);
