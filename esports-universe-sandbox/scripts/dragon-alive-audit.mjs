import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { toMatchReport } from '../src/app/shared/sim-v2/adapter/to-match-report.ts';

function roster(side, picks) {
  return [
    ['TOP', picks.top],
    ['JUNGLE', picks.jg],
    ['MID', picks.mid],
    ['BOT', picks.bot],
    ['SUPPORT', picks.sup],
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

function clock(t) {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

const seeds = [42, 100, 500, 777, 1100, 2000, 3333, 5000, 7000, 9000];
const summary = [];

for (const seed of seeds) {
  const result = simulateV2Match({
    versionId: 'demo-a',
    seed,
    blueTeamId: 'BLUE',
    redTeamId: 'RED',
    blue: roster('blue', blue),
    red: roster('red', red),
    maxDurationSec: 2100,
  });
  const report = toMatchReport(result);
  const frames = result.replay.snapshots ?? [];
  const intervals = [];
  let open = null;
  for (const snap of frames) {
    const alive = (snap.monsters ?? []).some(
      (monster) => monster.alive !== false && monster.campId === 'dragon',
    );
    if (alive && open == null) {
      open = snap.t;
    } else if (!alive && open != null) {
      intervals.push({ spawn: open, dead: snap.t, lived: snap.t - open });
      open = null;
    }
  }
  if (open != null) {
    intervals.push({
      spawn: open,
      dead: report.boxScore.durationSec,
      lived: report.boxScore.durationSec - open,
      leftAlive: true,
    });
  }
  const kills = report.boxScore.timeline.filter(
    (event) => event.type === 'dragon' || event.type === 'dragon-soul',
  );
  summary.push({
    seed,
    mins: Number((report.boxScore.durationSec / 60).toFixed(1)),
    kills: kills.length,
    killClocks: kills.map((event) => clock(event.t)).join(', '),
    spawnCount: intervals.length,
    intervals: intervals.map((row) => ({
      spawn: clock(row.spawn),
      dead: clock(row.dead),
      livedSec: Math.round(row.lived),
      leftAlive: !!row.leftAlive,
    })),
    wasted: intervals.filter((row) => row.lived > 180).length,
  });
}

console.log(JSON.stringify({ games: summary.length, rows: summary }, null, 2));
