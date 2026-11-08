import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import { calculateChemistry } from '../src/app/shared/sim/chemistry.ts';
import { simulateLiveMatch } from '../src/app/shared/sim/live-match.ts';
import { emptyModifiers, type MatchLiveModifiers } from '../src/app/shared/sim/match-state.ts';
import { buildTeamProfile } from '../src/app/shared/sim/team-profile.ts';
import type { TimelineEvent } from '../src/app/shared/sim/match-stats.ts';
import { SIM_BALANCE } from '../src/app/shared/sim/balance.ts';

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
  if (!team) throw new Error(`missing ${abbr}`);
  return {
    teamId: team.id,
    players: universe.players.filter((player) => player.teamId === team.id),
    coach: universe.coaches.find((coach) => coach.teamId === team.id) ?? null,
  };
}

function cloneSide(source: ReturnType<typeof side>, newTeamId: string) {
  return {
    teamId: newTeamId,
    coach: source.coach
      ? { ...source.coach, id: `${source.coach.id}__mirror`, teamId: newTeamId }
      : null,
    players: source.players.map((player) => ({
      ...player,
      id: `${player.id}__mirror`,
      teamId: newTeamId,
    })),
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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isKill(event: TimelineEvent): boolean {
  return (
    event.type === 'kill' ||
    event.type === 'first-blood' ||
    event.type === 'mistake'
  );
}

function killContext(event: TimelineEvent): string {
  if (event.type === 'mistake' || event.payload?.killContext === 'mistake') {
    return 'mistake';
  }
  return event.payload?.killContext ?? 'unknown';
}

type FightBurst = {
  t: number;
  intensity: string | null;
  killCount: number;
  hasTeamfightMarker: boolean;
};

function analyzeBox(box: NonNullable<ReturnType<typeof simulateLiveMatch>['boxScore']>) {
  const durationMin = Math.max(1, box.durationSec / 60);
  const kills = box.timeline.filter(isKill);
  const totalKills = kills.length;
  const loserId =
    box.winnerTeamId === box.homeTeamId ? box.awayTeamId : box.homeTeamId;

  const byContext: Record<string, number> = {};
  for (const event of kills) {
    const context = killContext(event);
    byContext[context] = (byContext[context] ?? 0) + 1;
  }

  const early = kills.filter((event) => event.t < 14 * 60).length;
  const mid = kills.filter((event) => event.t >= 14 * 60 && event.t < 28 * 60).length;
  const late = kills.filter((event) => event.t >= 28 * 60).length;
  const earlyMin = 14;
  const midMin = 14;
  const lateMin = Math.max(0.5, durationMin - 28);

  const loserDeaths = kills
    .filter((event) => event.victimTeamId === loserId)
    .sort((left, right) => left.t - right.t);
  let maxLoserDeathsIn5Min = 0;
  for (let index = 0; index < loserDeaths.length; index += 1) {
    const start = loserDeaths[index].t;
    let count = 0;
    for (let cursor = index; cursor < loserDeaths.length; cursor += 1) {
      if (loserDeaths[cursor].t - start <= 5 * 60) count += 1;
      else break;
    }
    maxLoserDeathsIn5Min = Math.max(maxLoserDeathsIn5Min, count);
  }

  const bursts = new Map<number, FightBurst>();
  for (const event of box.timeline) {
    if (event.type === 'teamfight') {
      const row = bursts.get(event.t) ?? {
        t: event.t,
        intensity: 'teamfight',
        killCount: 0,
        hasTeamfightMarker: true,
      };
      row.hasTeamfightMarker = true;
      row.intensity = 'teamfight';
      bursts.set(event.t, row);
    }
    if (isKill(event)) {
      const stamp = event.t;
      const baseT = event.payload?.intensity ? stamp : stamp;
      const key = event.payload?.intensity === 'teamfight' || killContext(event) === 'teamfight'
        ? Math.floor(stamp / 5) * 5
        : stamp;
      const intensity =
        event.payload?.intensity ??
        (killContext(event) === 'teamfight'
          ? 'teamfight'
          : killContext(event) === 'gank'
            ? 'gank'
            : killContext(event) === 'mistake'
              ? 'mistake'
              : 'skirmish');
      const row = bursts.get(key) ?? {
        t: baseT,
        intensity,
        killCount: 0,
        hasTeamfightMarker: false,
      };
      if (intensity === 'teamfight') row.intensity = 'teamfight';
      row.killCount += 1;
      bursts.set(key, row);
    }
  }

  const teamfightTimes = box.timeline
    .filter((event) => event.type === 'teamfight')
    .map((event) => event.t)
    .sort((left, right) => left - right);
  const teamfightGaps: number[] = [];
  for (let index = 1; index < teamfightTimes.length; index += 1) {
    teamfightGaps.push(teamfightTimes[index] - teamfightTimes[index - 1]);
  }
  const shortTeamfightGaps = teamfightGaps.filter((gap) => gap <= 90).length;

  const teamfightKillBursts = [...bursts.values()].filter(
    (burst) => burst.intensity === 'teamfight' && burst.killCount > 0,
  );
  const gankKillEvents = kills.filter((event) => killContext(event) === 'gank').length;
  const mistakeKillEvents = kills.filter((event) => killContext(event) === 'mistake').length;
  const teamfightKillEvents = kills.filter((event) => killContext(event) === 'teamfight').length;
  const laneKillEvents = kills.filter((event) => killContext(event) === 'lane').length;
  const objectiveKillEvents = kills.filter((event) =>
    ['dragon', 'baron', 'elder'].includes(killContext(event)),
  ).length;

  const combatEngageCount = box.timeline.filter(
    (event) =>
      event.type === 'combat' &&
      !event.summary.includes('對線換血'),
  ).length;
  const teamfightMarkerCount = teamfightTimes.length;

  let underdogWinsWhenBehind = 0;
  let fightsWhenBehind = 0;
  const goldByT = new Map<number, { home: number; away: number }>();
  for (const sample of box.goldSeries) {
    goldByT.set(sample.t, { home: sample.homeGold, away: sample.awayGold });
  }
  for (const event of box.timeline) {
    if (event.type !== 'teamfight' && !(isKill(event) && killContext(event) === 'teamfight')) {
      continue;
    }
    if (event.type !== 'teamfight') continue;
    const nearest = [...goldByT.keys()]
      .filter((stamp) => stamp <= event.t)
      .sort((left, right) => right - left)[0];
    if (nearest === undefined) continue;
    const gold = goldByT.get(nearest)!;
    const homeBehind = gold.home < gold.away - 2000;
    const awayBehind = gold.away < gold.home - 2000;
    const winnerIsHome = event.teamId === box.homeTeamId;
    if (homeBehind || awayBehind) {
      fightsWhenBehind += 1;
      if ((homeBehind && winnerIsHome) || (awayBehind && !winnerIsHome)) {
        underdogWinsWhenBehind += 1;
      }
    }
  }

  return {
    durationSec: box.durationSec,
    durationMin: Number(durationMin.toFixed(2)),
    totalKills,
    kpm: Number((totalKills / durationMin).toFixed(2)),
    winnerKills: box.winnerTeamId === box.homeTeamId ? box.home.kills : box.away.kills,
    loserKills: box.winnerTeamId === box.homeTeamId ? box.away.kills : box.home.kills,
    loserDeaths: loserDeaths.length,
    maxLoserDeathsIn5Min,
    byContext,
    earlyKpm: Number((early / earlyMin).toFixed(2)),
    midKpm: Number((mid / midMin).toFixed(2)),
    lateKpm: Number((late / lateMin).toFixed(2)),
    earlyKills: early,
    midKills: mid,
    lateKills: late,
    teamfightMarkerCount,
    teamfightKillEvents,
    gankKillEvents,
    mistakeKillEvents,
    laneKillEvents,
    objectiveKillEvents,
    teamfightMarkersPerMin: Number((teamfightMarkerCount / durationMin).toFixed(2)),
    gankKillsPerMin: Number((gankKillEvents / durationMin).toFixed(2)),
    mistakeKillsPerMin: Number((mistakeKillEvents / durationMin).toFixed(2)),
    combatEngageCount,
    combatEngagePerMin: Number((combatEngageCount / durationMin).toFixed(2)),
    avgKillsPerTeamfightBurst:
      teamfightKillBursts.length > 0
        ? Number(mean(teamfightKillBursts.map((burst) => burst.killCount)).toFixed(2))
        : 0,
    teamfightBurstCount: teamfightKillBursts.length,
    avgTeamfightGapSec:
      teamfightGaps.length > 0 ? Number(mean(teamfightGaps).toFixed(1)) : null,
    minTeamfightGapSec: teamfightGaps.length > 0 ? Math.min(...teamfightGaps) : null,
    shortTeamfightGaps90s: shortTeamfightGaps,
    fightsWhenBehind,
    underdogWinsWhenBehind,
  };
}

type Row = ReturnType<typeof analyzeBox>;

function summarize(rows: Row[]) {
  return {
    runs: rows.length,
    avgDurationMin: Number(mean(rows.map((row) => row.durationMin)).toFixed(1)),
    avgTotalKills: Number(mean(rows.map((row) => row.totalKills)).toFixed(1)),
    avgKpm: Number(mean(rows.map((row) => row.kpm)).toFixed(2)),
    avgWinnerKills: Number(mean(rows.map((row) => row.winnerKills)).toFixed(1)),
    avgLoserKills: Number(mean(rows.map((row) => row.loserKills)).toFixed(1)),
    avgLoserDeaths: Number(mean(rows.map((row) => row.loserDeaths)).toFixed(1)),
    avgMaxLoserDeathsIn5Min: Number(
      mean(rows.map((row) => row.maxLoserDeathsIn5Min)).toFixed(1),
    ),
    pctLoserDeathsIn5MinGe8: rows.filter((row) => row.maxLoserDeathsIn5Min >= 8).length,
    pctLoserDeathsIn5MinGe12: rows.filter((row) => row.maxLoserDeathsIn5Min >= 12).length,
    avgEarlyKpm: Number(mean(rows.map((row) => row.earlyKpm)).toFixed(2)),
    avgMidKpm: Number(mean(rows.map((row) => row.midKpm)).toFixed(2)),
    avgLateKpm: Number(mean(rows.map((row) => row.lateKpm)).toFixed(2)),
    avgTeamfightMarkersPerMin: Number(
      mean(rows.map((row) => row.teamfightMarkersPerMin)).toFixed(2),
    ),
    avgGankKillsPerMin: Number(mean(rows.map((row) => row.gankKillsPerMin)).toFixed(2)),
    avgMistakeKillsPerMin: Number(
      mean(rows.map((row) => row.mistakeKillsPerMin)).toFixed(2),
    ),
    avgCombatEngagePerMin: Number(
      mean(rows.map((row) => row.combatEngagePerMin)).toFixed(2),
    ),
    avgKillsPerTeamfightBurst: Number(
      mean(rows.map((row) => row.avgKillsPerTeamfightBurst)).toFixed(2),
    ),
    avgTeamfightBurstCount: Number(
      mean(rows.map((row) => row.teamfightBurstCount)).toFixed(1),
    ),
    avgTeamfightGapSec: Number(
      mean(
        rows
          .map((row) => row.avgTeamfightGapSec)
          .filter((value): value is number => value !== null),
      ).toFixed(1),
    ),
    avgShortTeamfightGaps90s: Number(
      mean(rows.map((row) => row.shortTeamfightGaps90s)).toFixed(1),
    ),
    contextShare: {
      teamfight: Number(
        (
          (mean(rows.map((row) => row.teamfightKillEvents)) /
            Math.max(1, mean(rows.map((row) => row.totalKills)))) *
          100
        ).toFixed(1),
      ),
      gank: Number(
        (
          (mean(rows.map((row) => row.gankKillEvents)) /
            Math.max(1, mean(rows.map((row) => row.totalKills)))) *
          100
        ).toFixed(1),
      ),
      mistake: Number(
        (
          (mean(rows.map((row) => row.mistakeKillEvents)) /
            Math.max(1, mean(rows.map((row) => row.totalKills)))) *
          100
        ).toFixed(1),
      ),
      lane: Number(
        (
          (mean(rows.map((row) => row.laneKillEvents)) /
            Math.max(1, mean(rows.map((row) => row.totalKills)))) *
          100
        ).toFixed(1),
      ),
      objective: Number(
        (
          (mean(rows.map((row) => row.objectiveKillEvents)) /
            Math.max(1, mean(rows.map((row) => row.totalKills)))) *
          100
        ).toFixed(1),
      ),
    },
    behindFight: {
      avgFightsWhenBehind: Number(mean(rows.map((row) => row.fightsWhenBehind)).toFixed(1)),
      underdogWinRateWhenBehind: Number(
        (
          (rows.reduce((sum, row) => sum + row.underdogWinsWhenBehind, 0) /
            Math.max(
              1,
              rows.reduce((sum, row) => sum + row.fightsWhenBehind, 0),
            )) *
          100
        ).toFixed(1),
      ),
    },
  };
}

function runBand(
  name: string,
  games: number,
  pick: (index: number) => {
    home: ReturnType<typeof side>;
    away: ReturnType<typeof side>;
    modifiers: MatchLiveModifiers;
    seed: number;
  },
) {
  const rows: Row[] = [];
  for (let index = 0; index < games; index += 1) {
    const { home, away, modifiers, seed } = pick(index);
    const random = mulberry32(seed);
    const homeProfile = buildTeamProfile(
      home.teamId,
      home.players,
      home.coach,
      random,
      calculateChemistry(home.players, home.coach),
    );
    const awayProfile = buildTeamProfile(
      away.teamId,
      away.players,
      away.coach,
      random,
      calculateChemistry(away.players, away.coach),
    );
    const { boxScore } = simulateLiveMatch({
      home: homeProfile,
      away: awayProfile,
      random,
      modifiers,
    });
    rows.push(analyzeBox(boxScore!));
  }
  return { name, ...summarize(rows), samples: rows.slice(0, 3) };
}

const evenSources = ['MCX', 'OCE', 'RM', 'JT', 'GT'];
const even = runBand('even', 100, (index) => {
  const abbr = evenSources[index % evenSources.length];
  const home = side(abbr);
  return {
    home,
    away: cloneSide(home, `${home.teamId}__mirror`),
    modifiers: emptyModifiers(),
    seed: 850000 + index * 17,
  };
});

const midPairs: Array<[string, string]> = [
  ['RM', 'JT'],
  ['JT', 'RM'],
  ['GT', 'ahq'],
  ['ahq', 'GT'],
];
const mid = runBand('mid', 100, (index) => {
  const [homeAbbr, awayAbbr] = midPairs[index % midPairs.length];
  return {
    home: side(homeAbbr),
    away: side(awayAbbr),
    modifiers: {
      draftEdge: index % 2 === 0 ? 1.2 : -1.2,
      matchupByPhase: { early: 0.4, mid: 0.3, late: 0.2 },
    },
    seed: 860000 + index * 19,
  };
});

const stompPairs: Array<[string, string]> = [
  ['MCX', 'OCE'],
  ['OCE', 'MCX'],
  ['RM', 'ahq'],
  ['GT', 'JT'],
];
const stomp = runBand('stomp', 100, (index) => {
  const [homeAbbr, awayAbbr] = stompPairs[index % stompPairs.length];
  return {
    home: side(homeAbbr),
    away: side(awayAbbr),
    modifiers: {
      draftEdge: index % 2 === 0 ? 3.5 : -3.5,
      matchupByPhase: { early: 1.2, mid: 1.0, late: 0.8 },
    },
    seed: 870000 + index * 23,
  };
});

const theoretical = {
  tickSeconds: SIM_BALANCE.tickSeconds,
  killChanceBase: SIM_BALANCE.killChanceBase,
  teamfightChanceBase: SIM_BALANCE.teamfightChanceBase,
  earlyKillChanceScale: SIM_BALANCE.earlyKillChanceScale,
  note:
    '每 tick 最多嘗試 1 次 maybeResolveSkirmish；fightChance = (killChanceBase + |pressure-0.5|*0.22 + aggression) * phaseScale + (late? teamfightChanceBase : 0)。壓力越大 |pressure-0.5| 越大，交戰機率反而上升。teamfight 每次 1~3 殺。',
};

const out = { theoretical, even, mid, stomp };
writeFileSync(resolve('scripts/phase-h2-kill-volume-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
