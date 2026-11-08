import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Player } from '../src/app/core/models/player.model.ts';
import type { Coach } from '../src/app/core/models/coach.model.ts';
import { calculateChemistry } from '../src/app/shared/sim/chemistry.ts';
import { simulateLiveMatch } from '../src/app/shared/sim/live-match.ts';
import { emptyModifiers, type MatchLiveModifiers } from '../src/app/shared/sim/match-state.ts';
import { buildTeamProfile } from '../src/app/shared/sim/team-profile.ts';

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

function pct(flags: boolean[]): number {
  if (flags.length === 0) return 0;
  return (flags.filter(Boolean).length / flags.length) * 100;
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
  const rows: Array<{
    score: string;
    gap: number;
    goldGap: number;
    durationMin: number;
    winnerKills: number;
    loserKills: number;
  }> = [];

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
    const box = boxScore!;
    const homeKills = box.players
      .filter((player) => player.teamId === home.teamId)
      .reduce((sum, player) => sum + player.kills, 0);
    const awayKills = box.players
      .filter((player) => player.teamId === away.teamId)
      .reduce((sum, player) => sum + player.kills, 0);
    const highKills = Math.max(homeKills, awayKills);
    const lowKills = Math.min(homeKills, awayKills);
    const homeGold = box.players
      .filter((player) => player.teamId === home.teamId)
      .reduce((sum, player) => sum + player.gold, 0);
    const awayGold = box.players
      .filter((player) => player.teamId === away.teamId)
      .reduce((sum, player) => sum + player.gold, 0);
    rows.push({
      score: `${homeKills}-${awayKills}`,
      gap: highKills - lowKills,
      goldGap: Math.abs(homeGold - awayGold),
      durationMin: box.durationSec / 60,
      winnerKills: highKills,
      loserKills: lowKills,
    });
  }

  return {
    name,
    runs: games,
    avgDuration: Number(mean(rows.map((row) => row.durationMin)).toFixed(1)),
    avgScore: `${mean(rows.map((row) => row.winnerKills)).toFixed(1)}-${mean(rows.map((row) => row.loserKills)).toFixed(1)}`,
    avgKillGap: Number(mean(rows.map((row) => row.gap)).toFixed(1)),
    avgGoldGapK: Number((mean(rows.map((row) => row.goldGap)) / 1000).toFixed(1)),
    pctGapLe5: Number(pct(rows.map((row) => row.gap <= 5)).toFixed(1)),
    pctGapLe8: Number(pct(rows.map((row) => row.gap <= 8)).toFixed(1)),
    pctGapGe12: Number(pct(rows.map((row) => row.gap >= 12)).toFixed(1)),
    pctGapGe15: Number(pct(rows.map((row) => row.gap >= 15)).toFixed(1)),
    pctGapGe20: Number(pct(rows.map((row) => row.gap >= 20)).toFixed(1)),
    samples: rows.slice(0, 6).map((row) => ({
      score: row.score,
      gap: row.gap,
      dur: Number(row.durationMin.toFixed(1)),
      goldGapK: Number((row.goldGap / 1000).toFixed(1)),
    })),
  };
}

const evenSources = ['MCX', 'OCE', 'RM', 'JT', 'GT'];
const even = runBand('even', 80, (index) => {
  const source = side(evenSources[index % evenSources.length]);
  return {
    home: source,
    away: cloneSide(source, `${source.teamId}__mirror`),
    modifiers: emptyModifiers(),
    seed: 970000 + index * 17,
  };
});

const midPairs: Array<[string, string]> = [
  ['RM', 'JT'],
  ['JT', 'RM'],
  ['GT', 'ahq'],
  ['ahq', 'GT'],
];
const mid = runBand('mid', 80, (index) => {
  const [homeAbbr, awayAbbr] = midPairs[index % midPairs.length];
  return {
    home: side(homeAbbr),
    away: side(awayAbbr),
    modifiers: {
      draftEdge: index % 2 === 0 ? 1.2 : -1.2,
      matchupByPhase: { early: 0.4, mid: 0.3, late: 0.2 },
    },
    seed: 980000 + index * 19,
  };
});

const stompPairs: Array<[string, string]> = [
  ['MCX', 'OCE'],
  ['OCE', 'MCX'],
  ['RM', 'ahq'],
  ['GT', 'JT'],
  ['MAD', 'DCG'],
  ['DCG', 'MAD'],
];
const stomp = runBand('stomp', 80, (index) => {
  const [homeAbbr, awayAbbr] = stompPairs[index % stompPairs.length];
  return {
    home: side(homeAbbr),
    away: side(awayAbbr),
    modifiers: {
      draftEdge: index % 2 === 0 ? 3.4 : -3.4,
      matchupByPhase: { early: 1.15, mid: 1.05, late: 0.75 },
    },
    seed: 990000 + index * 23,
  };
});

const out = { even, mid, stomp };
writeFileSync(resolve('scripts/stompiness-out.json'), JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
