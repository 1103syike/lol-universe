import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';
import { writeFileSync } from 'node:fs';

const roster = (side) =>
  ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
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

const { state, replay } = simulateV2Match({
  versionId: 'demo-a',
  seed: 1000,
  blueTeamId: 'blue',
  redTeamId: 'red',
  blue: roster('blue'),
  red: roster('red'),
  maxDurationSec: 2400,
});

const via = {};
let annieCasts = { Q: 0, W: 0, E: 0, R: 0 };
for (const e of replay.events) {
  if (e.type === 'ability') {
    const src = state.champions.find((c) => c.id === e.actorId);
    if (src?.championId === 'Annie') {
      const slot = e.payload?.slot;
      if (slot && annieCasts[slot] != null) annieCasts[slot] += 1;
    }
  }
  if (e.type !== 'damage' || !e.amount) continue;
  const src = state.champions.find((c) => c.id === e.actorId);
  if (!src || src.championId !== 'Annie') continue;
  const tgt = state.champions.find((c) => c.id === e.targetId);
  if (!tgt) continue;
  const key = e.payload?.via || 'unknown';
  via[key] = (via[key] || 0) + e.amount;
}

const sortedVia = Object.entries(via)
  .map(([k, v]) => [k, Math.round(v)])
  .sort((a, b) => b[1] - a[1]);

writeFileSync(
  'annie-diag.json',
  JSON.stringify(
    {
      t: Math.round(state.scheduler.time),
      annie: state.champions
        .filter((c) => c.championId === 'Annie')
        .map((c) => ({
          side: c.side,
          dmg: Math.round(c.damageToChampions),
          ap: Math.round(c.ap),
          lvl: c.level,
          items: c.items,
          abilityLevels: c.abilities.map((a) => `${a.slot}${a.level}`),
        })),
      annieCasts,
      via: Object.fromEntries(sortedVia),
      board: state.champions
        .map((c) => ({
          champ: c.championId,
          role: c.positionLabel,
          dmg: Math.round(c.damageToChampions),
        }))
        .sort((a, b) => b.dmg - a.dmg),
    },
    null,
    2,
  ),
);
