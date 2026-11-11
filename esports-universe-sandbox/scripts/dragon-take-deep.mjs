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

for (const seed of [1100, 777, 100]) {
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
  const box = report.boxScore;
  const dragons = box.timeline.filter(
    (event) =>
      event.type === 'dragon' || event.type === 'dragon-soul' || event.type === 'elder',
  );
  const camp = result.replay.events.filter(
    (event) =>
      event.type === 'camp_kill' &&
      (event.payload?.campId === 'dragon' || event.payload?.campId === 'elder'),
  );
  console.log('\n==== seed', seed, '====');
  console.log(
    'duration',
    (box.durationSec / 60).toFixed(1),
    'boxStacks',
    box.home.dragons,
    box.away.dragons,
    'boxSoul',
    box.home.dragonSoul,
    box.away.dragonSoul,
  );
  console.log(
    'stateStacks',
    result.state.blue.dragonStacks,
    result.state.red.dragonStacks,
    'hasSoul',
    result.state.blue.hasSoul,
    result.state.red.hasSoul,
  );
  console.log('timeline:');
  for (const event of dragons) {
    console.log(
      ' ',
      event.type,
      event.t.toFixed(1),
      event.teamId,
      event.payload?.marker,
      event.summary,
    );
  }
  console.log('camp_kills:');
  for (const event of camp) {
    console.log(' ', event.t.toFixed(1), event.payload?.campId, event.actorId);
  }
  const soulAt = Math.min(
    ...dragons.filter((event) => event.type === 'dragon-soul').map((event) => event.t),
    Number.POSITIVE_INFINITY,
  );
  if (soulAt < Number.POSITIVE_INFINITY) {
    const after = camp.filter(
      (event) => event.t > soulAt + 1 && event.payload?.campId === 'dragon',
    );
    console.log(
      'elemental after soul:',
      after.length,
      'elder camps:',
      camp.filter((event) => event.payload?.campId === 'elder').length,
    );
  }
}
