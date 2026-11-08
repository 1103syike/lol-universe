import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { simulateGame } from '../src/app/shared/sim/match-engine.ts';
import { validateBoxScore } from '../src/app/shared/sim/invariants.ts';
import { PHASE_LABELS, REASON_LABELS } from '../src/app/shared/sim/report.ts';
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

function side(abbr: string) {
  const team = universe.teams.find((item) => item.abbreviation === abbr);
  if (!team) throw new Error(`missing ${abbr}`);
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
for (let i = 0; i < 5; i += 1) {
  const report = simulateGame({
    home: home.input,
    away: away.input,
    random: mulberry32(9000 + i * 97),
  });
  const issues = validateBoxScore(report.boxScore);
  const winner = report.winnerTeamId === home.team.id ? 'GRX' : 'BMG';
  const minutes = Math.floor(report.boxScore.durationSec / 60);
  const seconds = report.boxScore.durationSec % 60;
  console.log(
    `#${i + 1} ${winner} ${minutes}:${seconds.toString().padStart(2, '0')} | ${REASON_LABELS[report.primaryReason]} | issues=${issues.length}`,
  );
  console.log(
    `  Kills ${report.boxScore.home.kills}-${report.boxScore.away.kills} | Gold ${(report.boxScore.home.totalGold / 1000).toFixed(1)}K-${(report.boxScore.away.totalGold / 1000).toFixed(1)}K | Dragons ${report.boxScore.home.dragons}-${report.boxScore.away.dragons} | Baron ${report.boxScore.home.barons}-${report.boxScore.away.barons}`,
  );
  console.log(`  優勢：${report.advantageSummary}`);
  console.log(
    `  轉折：${report.turningPoints.map((point) => `[${PHASE_LABELS[point.phase]}] ${point.summary}`).join(' / ') || '（無）'}`,
  );
  if (issues.length) {
    console.log(issues);
    process.exitCode = 1;
  }
}
