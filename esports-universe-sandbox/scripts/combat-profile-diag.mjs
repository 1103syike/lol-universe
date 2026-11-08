import { combatProfile } from '../src/app/shared/sim-v2/champion/combat-profile.ts';
import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';

function roster(side, picks) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: picks[position],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

const configs = [
  {
    name: 'jayce-poke',
    picks: { TOP: 'Jayce', JUNGLE: 'LeeSin', MID: 'Annie', BOT: 'Ashe', SUPPORT: 'Thresh' },
  },
  {
    name: 'ornn-front',
    picks: { TOP: 'Ornn', JUNGLE: 'Sejuani', MID: 'Orianna', BOT: 'Jinx', SUPPORT: 'Lulu' },
  },
  {
    name: 'rumble-dmg',
    picks: { TOP: 'Rumble', JUNGLE: 'LeeSin', MID: 'Syndra', BOT: 'Ashe', SUPPORT: 'Nautilus' },
  },
];

for (const cfg of configs) {
  const { state } = simulateV2Match({
    versionId: 'demo-a',
    seed: 1200,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', cfg.picks),
    red: roster('red', cfg.picks),
    maxDurationSec: 1500,
  });
  const mins = state.scheduler.time / 60;
  console.log('===', cfg.name, mins.toFixed(1) + 'm');
  for (const role of ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT']) {
    const c = state.champions.find((x) => x.side === 'blue' && x.positionLabel === role);
    if (!c) continue;
    const p = combatProfile(state, c);
    console.log(
      role,
      c.championId,
      'dmg',
      Math.round(c.damageToChampions),
      'dpm',
      Math.round(c.damageToChampions / mins),
      'mult',
      p.damageDealtMult.toFixed(2),
      'poke',
      p.pokeAppetite.toFixed(2),
      'allIn',
      p.allInAppetite.toFixed(2),
    );
  }
}
