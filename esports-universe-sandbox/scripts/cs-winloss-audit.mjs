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

function summarize(arr) {
  if (!arr.length) {
    return null;
  }
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    n: arr.length,
    min: Number(sorted[0].toFixed(2)),
    avg: Number(mean(arr).toFixed(2)),
    max: Number(sorted[sorted.length - 1].toFixed(2)),
  };
}

const byRole = Object.fromEntries(
  roles.map((role) => [
    role,
    {
      all: { csm: [], cs: [], gpm: [] },
      win: { csm: [], cs: [], gpm: [] },
      lose: { csm: [], cs: [], gpm: [] },
    },
  ]),
);
const teamTotals = { win: [], lose: [], all: [] };
const creditVia = { soft_lasthit: 0, lane_owner: 0, auto: 0, other: 0, missedProxy: 0 };
const games = [];

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
    const winnerId = state.winnerTeamId;
    const winnerSide =
      winnerId === state.blue.teamId ? 'blue' : winnerId === state.red.teamId ? 'red' : null;

    let soft = 0;
    let laneOwner = 0;
    let auto = 0;
    let other = 0;
    for (const event of replay.events) {
      if (event.type !== 'minion_death') {
        continue;
      }
      const via = event.payload?.via ?? 'other';
      if (via === 'soft_lasthit') {
        soft += 1;
      } else if (via === 'lane_owner') {
        laneOwner += 1;
      } else if (via === 'auto' || via === 'ability') {
        auto += 1;
      } else {
        other += 1;
      }
    }
    creditVia.soft_lasthit += soft;
    creditVia.lane_owner += laneOwner;
    creditVia.auto += auto;
    creditVia.other += other;

    const teamCs = { blue: 0, red: 0 };
    for (const champ of state.champions) {
      const role = champ.positionLabel;
      const csm = champ.cs / mins;
      const gpm = champ.earnedGold / mins;
      const bucket = byRole[role];
      bucket.all.csm.push(csm);
      bucket.all.cs.push(champ.cs);
      bucket.all.gpm.push(gpm);
      teamCs[champ.side] += champ.cs;
      const outcome =
        winnerSide == null ? null : champ.side === winnerSide ? 'win' : 'lose';
      if (outcome) {
        bucket[outcome].csm.push(csm);
        bucket[outcome].cs.push(champ.cs);
        bucket[outcome].gpm.push(gpm);
      }
    }
    teamTotals.all.push(teamCs.blue, teamCs.red);
    if (winnerSide === 'blue') {
      teamTotals.win.push(teamCs.blue);
      teamTotals.lose.push(teamCs.red);
    } else if (winnerSide === 'red') {
      teamTotals.win.push(teamCs.red);
      teamTotals.lose.push(teamCs.blue);
    }
    games.push({
      comp: comp.name,
      seed: seed + compIndex * 19,
      mins: Number(mins.toFixed(1)),
      winnerSide,
      teamCs,
      credit: { soft, laneOwner, auto, other },
    });
  }
}

const roleOut = Object.fromEntries(
  roles.map((role) => {
    const lck = LCK_ROLE_CURVE[role];
    const all = byRole[role].all;
    const win = byRole[role].win;
    const lose = byRole[role].lose;
    const winCsm = mean(win.csm);
    const loseCsm = mean(lose.csm);
    return [
      role,
      {
        csm: summarize(all.csm),
        cs: summarize(all.cs),
        gpm: summarize(all.gpm),
        lckCsm: lck.csm.avg,
        deltaPctVsLck: Number((((mean(all.csm) - lck.csm.avg) / lck.csm.avg) * 100).toFixed(1)),
        win: {
          csm: summarize(win.csm),
          cs: summarize(win.cs),
          gpm: summarize(win.gpm),
        },
        lose: {
          csm: summarize(lose.csm),
          cs: summarize(lose.cs),
          gpm: summarize(lose.gpm),
        },
        winMinusLoseCsm: Number((winCsm - loseCsm).toFixed(2)),
        winMinusLoseCs: Number((mean(win.cs) - mean(lose.cs)).toFixed(1)),
      },
    ];
  }),
);

const out = {
  games: comps.length * seeds.length,
  realBenchmarks: {
    lckRoleCsm: Object.fromEntries(roles.map((role) => [role, LCK_ROLE_CURVE[role].csm.avg])),
    esports2022CsAt15WinMinusLose: { TOP: 4.1, JUNGLE: 2.4, MID: 3.7, BOT: 4.1 },
    teamTotalCsTypical: '900-1000 per team (~30min pro)',
    note: '勝敗方 CS 差距通常小，來自死亡／離線／漏補，不是結局硬扣',
  },
  teamTotalCs: {
    all: summarize(teamTotals.all),
    win: summarize(teamTotals.win),
    lose: summarize(teamTotals.lose),
    winMinusLose: Number((mean(teamTotals.win) - mean(teamTotals.lose)).toFixed(1)),
  },
  creditVia,
  roles: roleOut,
  sampleGames: games.slice(0, 6),
};

console.log(JSON.stringify(out, null, 2));
