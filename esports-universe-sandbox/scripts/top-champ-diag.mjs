import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { combatProfile } from '../src/app/shared/sim-v2/champion/combat-profile.ts';
import { CHAMPION_KITS } from '../src/app/core/data/champion-kits.ts';

function roster(side, topId) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? topId
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

const rows = [];
for (const top of ['Aatrox', 'Garen', 'Jayce', 'Camille', 'Renekton', 'Ornn', 'Kennen']) {
  const kit = CHAMPION_KITS[top];
  const { state } = simulateV2Match({
    versionId: 'demo-a',
    seed: 1100,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', top),
    red: roster('red', 'Garen'),
    maxDurationSec: 1800,
  });
  const blueTop = state.champions.find((c) => c.side === 'blue' && c.positionLabel === 'TOP');
  const p = combatProfile(state, blueTop);
  const mins = state.scheduler.time / 60;
  rows.push({
    top,
    class: kit?.combatClass,
    poke: kit?.style?.poke,
    engage: kit?.style?.engage,
    mult: Number(p.damageDealtMult.toFixed(3)),
    auto: Number(p.autoMult.toFixed(3)),
    pokeApp: Number(p.pokeAppetite.toFixed(3)),
    allIn: Number(p.allInAppetite.toFixed(3)),
    dis: Number(p.disengageHp.toFixed(3)),
    dmg: Math.round(blueTop.damageToChampions),
    dpm: Math.round(blueTop.damageToChampions / mins),
    kda: `${blueTop.kills}/${blueTop.deaths}/${blueTop.assists}`,
    mins: Number(mins.toFixed(1)),
    totalKills: state.champions.reduce((s, c) => s + c.kills, 0),
  });
}
console.log(JSON.stringify(rows, null, 2));
