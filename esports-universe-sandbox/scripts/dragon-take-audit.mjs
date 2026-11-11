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

const comps = [
  {
    name: 'standard',
    blue: { top: 'Aatrox', jg: 'LeeSin', mid: 'Ahri', bot: 'Jinx', sup: 'Thresh' },
    red: { top: 'Garen', jg: 'Viego', mid: 'Syndra', bot: 'Ashe', sup: 'Lulu' },
  },
  {
    name: 'tank',
    blue: { top: 'Ornn', jg: 'Sejuani', mid: 'Galio', bot: 'Sion', sup: 'Braum' },
    red: { top: 'Maokai', jg: 'JarvanIV', mid: 'Orianna', bot: 'MissFortune', sup: 'Nautilus' },
  },
  {
    name: 'aggress',
    blue: { top: 'Riven', jg: 'Elise', mid: 'Zed', bot: 'Samira', sup: 'Pyke' },
    red: { top: 'Camille', jg: 'Khazix', mid: 'Akali', bot: 'Kaisa', sup: 'Nautilus' },
  },
];

const seeds = [42, 100, 777, 1000, 1100, 2000, 3000, 5000, 7000, 9000];

function clock(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

const rows = [];
for (const [compIndex, comp] of comps.entries()) {
  for (const seed of seeds) {
    const result = simulateV2Match({
      versionId: 'demo-a',
      seed: seed + compIndex * 31,
      blueTeamId: 'BLUE',
      redTeamId: 'RED',
      blue: roster('blue', comp.blue),
      red: roster('red', comp.red),
      maxDurationSec: 2100,
    });
    const report = toMatchReport(result);
    const box = report.boxScore;
    const dragons = box.timeline.filter(
      (event) => event.type === 'dragon' || event.type === 'dragon-soul',
    );
    const elders = box.timeline.filter((event) => event.type === 'elder');
    const towers = box.timeline.filter((event) => event.type === 'tower');
    const campKills = result.replay.events.filter(
      (event) =>
        event.type === 'camp_kill' &&
        (event.payload?.campId === 'dragon' || event.payload?.campId === 'elder'),
    );
    const times = dragons.map((event) => clock(event.t));
    const elderTimes = elders.map((event) => clock(event.t));
    const gaps = dragons.slice(1).map((event, index) =>
      Number((event.t - dragons[index].t).toFixed(1)),
    );
    const blueSoul = box.home.dragonSoul;
    const redSoul = box.away.dragonSoul;
    rows.push({
      comp: comp.name,
      seed: seed + compIndex * 31,
      mins: Number((box.durationSec / 60).toFixed(1)),
      elemental: dragons.length,
      blueDragons: box.home.dragons,
      redDragons: box.away.dragons,
      soul: blueSoul ? 'BLUE' : redSoul ? 'RED' : 'none',
      elders: elders.length,
      towers: towers.length,
      campKillDragonElder: campKills.length,
      dragonClocks: times.join(', '),
      elderClocks: elderTimes.join(', '),
      gapsSec: gaps.join(', '),
      minGap: gaps.length ? Math.min(...gaps) : null,
      anomaly:
        dragons.length > 4 ||
        (blueSoul && redSoul) ||
        (dragons.length >= 4 && !blueSoul && !redSoul) ||
        gaps.some((gap) => gap < 280),
    });
  }
}

const elementalCounts = rows.map((row) => row.elemental);
const elderCounts = rows.map((row) => row.elders);
const anomalies = rows.filter((row) => row.anomaly);

console.log(
  JSON.stringify(
    {
      games: rows.length,
      elemental: {
        min: Math.min(...elementalCounts),
        avg: Number(
          (elementalCounts.reduce((sum, n) => sum + n, 0) / rows.length).toFixed(2),
        ),
        max: Math.max(...elementalCounts),
        hist: Object.fromEntries(
          [...new Set(elementalCounts)]
            .sort((a, b) => a - b)
            .map((n) => [n, elementalCounts.filter((x) => x === n).length]),
        ),
      },
      elders: {
        min: Math.min(...elderCounts),
        avg: Number((elderCounts.reduce((sum, n) => sum + n, 0) / rows.length).toFixed(2)),
        max: Math.max(...elderCounts),
        hist: Object.fromEntries(
          [...new Set(elderCounts)]
            .sort((a, b) => a - b)
            .map((n) => [n, elderCounts.filter((x) => x === n).length]),
        ),
      },
      soulRate: Number(
        ((rows.filter((row) => row.soul !== 'none').length / rows.length) * 100).toFixed(1),
      ),
      anomalyCount: anomalies.length,
      anomalies: anomalies.slice(0, 12),
      sample: rows.slice(0, 8),
      all: rows,
    },
    null,
    2,
  ),
);
