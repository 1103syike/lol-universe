import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { LCK_ROLE_CURVE } from '../src/app/shared/sim-v2/diagnostics/lck-role-curve.ts';

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
    blue: { top: 'Ornn', jg: 'Sejuani', mid: 'Galio', bot: 'MissFortune', sup: 'Nautilus' },
    red: { top: 'Maokai', jg: 'JarvanIV', mid: 'Orianna', bot: 'Ezreal', sup: 'Braum' },
  },
  {
    name: 'aggress',
    blue: { top: 'Riven', jg: 'Elise', mid: 'Zed', bot: 'Samira', sup: 'Pyke' },
    red: { top: 'Camille', jg: 'Khazix', mid: 'Akali', bot: 'Kaisa', sup: 'Nautilus' },
  },
];

const seeds = [42, 100, 500, 777, 1000, 1100, 2000, 3000, 5000, 7000, 9000, 12345];
const roles = ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];

function mean(arr) {
  return arr.reduce((sum, n) => sum + n, 0) / Math.max(1, arr.length);
}

function pct(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
}

function summarize(arr) {
  if (!arr.length) {
    return null;
  }
  return {
    n: arr.length,
    min: Number(Math.min(...arr).toFixed(1)),
    p25: Number(pct(arr, 0.25).toFixed(1)),
    avg: Number(mean(arr).toFixed(1)),
    p75: Number(pct(arr, 0.75).toFixed(1)),
    max: Number(Math.max(...arr).toFixed(1)),
  };
}

function clusterDeaths(deathTimes, gapSec = 8) {
  if (!deathTimes.length) {
    return [];
  }
  const sorted = [...deathTimes].sort((a, b) => a - b);
  const clusters = [];
  let start = sorted[0];
  let end = sorted[0];
  let count = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - end <= gapSec) {
      end = sorted[i];
      count += 1;
      continue;
    }
    clusters.push({ start, end, count, duration: end - start });
    start = sorted[i];
    end = sorted[i];
    count = 1;
  }
  clusters.push({ start, end, count, duration: end - start });
  return clusters;
}

function measureTtks(events) {
  const byVictim = new Map();
  const ttks = [];
  for (const event of events) {
    if (event.type === 'damage' && event.targetId) {
      const list = byVictim.get(event.targetId) ?? [];
      list.push(event.t);
      byVictim.set(event.targetId, list);
      continue;
    }
    if (event.type === 'death' && event.targetId) {
      const hits = byVictim.get(event.targetId) ?? [];
      const deathT = event.t;
      let start = deathT;
      for (let i = hits.length - 1; i >= 0; i -= 1) {
        if (deathT - hits[i] > 12) {
          break;
        }
        start = hits[i];
      }
      const ttk = deathT - start;
      if (ttk >= 0.2 && ttk <= 20) {
        ttks.push(ttk);
      }
      byVictim.set(event.targetId, []);
    }
  }
  return ttks;
}

const byRole = Object.fromEntries(
  roles.map((role) => [role, { gpm: [], csm: [], dpm: [], camps: [], kills: [], assists: [] }]),
);
const fightDurations = [];
const multiKillFights = [];
const ttks = [];
const gameSummaries = [];

for (const [compIndex, comp] of comps.entries()) {
  for (const seed of seeds) {
    const { state, replay } = simulateV2Match({
      versionId: 'demo-a',
      seed: seed + compIndex * 19,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue', comp.blue),
      red: roster('red', comp.red),
      maxDurationSec: 2100,
    });
    const mins = Math.max(1, state.scheduler.time / 60);
    const deaths = replay.events.filter((event) => event.type === 'death');
    const deathTimes = deaths.map((event) => event.t);
    const clusters = clusterDeaths(deathTimes, 8);
    for (const cluster of clusters) {
      if (cluster.count >= 2) {
        fightDurations.push(cluster.duration);
      }
      if (cluster.count >= 3) {
        multiKillFights.push(cluster.duration);
      }
    }
    ttks.push(...measureTtks(replay.events));

    const roleSnap = {};
    for (const champ of state.champions) {
      const role = champ.positionLabel;
      const bucket = byRole[role];
      bucket.gpm.push(champ.earnedGold / mins);
      bucket.csm.push(champ.cs / mins);
      bucket.dpm.push(champ.damageToChampions / mins);
      bucket.camps.push(champ.campKills ?? 0);
      bucket.kills.push(champ.kills);
      bucket.assists.push(champ.assists);
      if (role === 'JUNGLE') {
        roleSnap[champ.side] = {
          gpm: Number((champ.earnedGold / mins).toFixed(1)),
          csm: Number((champ.cs / mins).toFixed(2)),
          dpm: Number((champ.damageToChampions / mins).toFixed(1)),
          camps: champ.campKills ?? 0,
          gold: Math.round(champ.earnedGold),
          cs: Math.round(champ.cs),
          kda: `${champ.kills}/${champ.deaths}/${champ.assists}`,
          sources: champ.goldBySource,
        };
      }
    }
    gameSummaries.push({
      comp: comp.name,
      seed: seed + compIndex * 19,
      mins: Number(mins.toFixed(1)),
      kills: deaths.length,
      fights2: clusters.filter((c) => c.count >= 2).length,
      fights3: clusters.filter((c) => c.count >= 3).length,
      jg: roleSnap,
    });
  }
}

const out = {
  games: comps.length * seeds.length,
  benchmarks: {
    lolTeamfightAvgSec: 15,
    note: 'LCS sample ~15s teamfight; LoL burstier/faster than Dota',
    lckJungle: LCK_ROLE_CURVE.JUNGLE,
  },
  roles: Object.fromEntries(
    roles.map((role) => {
      const lck = LCK_ROLE_CURVE[role];
      const gpm = summarize(byRole[role].gpm);
      const csm = summarize(byRole[role].csm);
      const dpm = summarize(byRole[role].dpm);
      return [
        role,
        {
          gpm,
          csm,
          dpm,
          camps: summarize(byRole[role].camps),
          lck: { gpm: lck.gpm.avg, csm: lck.csm.avg, dpm: lck.dpm.avg },
          deltaPct: {
            gpm: Number((((gpm.avg - lck.gpm.avg) / lck.gpm.avg) * 100).toFixed(1)),
            csm: Number((((csm.avg - lck.csm.avg) / lck.csm.avg) * 100).toFixed(1)),
            dpm: Number((((dpm.avg - lck.dpm.avg) / lck.dpm.avg) * 100).toFixed(1)),
          },
        },
      ];
    }),
  ),
  fights: {
    gapSec: 8,
    durations2plus: summarize(fightDurations),
    durations3plus: summarize(multiKillFights),
    vsLol15s: fightDurations.length
      ? {
          shareOver20s: Number(
            (
              (fightDurations.filter((d) => d > 20).length / fightDurations.length) *
              100
            ).toFixed(1),
          ),
          shareOver30s: Number(
            (
              (fightDurations.filter((d) => d > 30).length / fightDurations.length) *
              100
            ).toFixed(1),
          ),
          avg: Number(mean(fightDurations).toFixed(1)),
        }
      : null,
  },
  ttk: summarize(ttks),
  lowJungleGames: gameSummaries
    .filter((game) => {
      const values = Object.values(game.jg);
      return values.some((row) => row.gpm < 320 || row.dpm < 280 || row.csm < 4.5);
    })
    .slice(0, 12),
  sampleGames: gameSummaries.slice(0, 6),
};

console.log(JSON.stringify(out, null, 2));
