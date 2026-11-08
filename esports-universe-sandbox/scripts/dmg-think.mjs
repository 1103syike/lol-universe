import { simulateV2Match } from '../src/app/shared/sim-v2/engine.ts';

function roster(side) {
  return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'].map((position) => ({
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
}

const { state, replay } = simulateV2Match({
  versionId: 'demo-a',
  seed: 1200,
  blueTeamId: 'blue',
  redTeamId: 'red',
  blue: roster('blue'),
  red: roster('red'),
  maxDurationSec: 1800,
});

const mins = state.scheduler.time / 60;
const hitCount = {};
const dmgByVia = {};
const rawVsDealt = { raw: 0, dealt: 0, cappedHits: 0, champHits: 0 };
for (const e of replay.events) {
  if (e.type !== 'damage') continue;
  const src = state.champions.find((c) => c.id === e.actorId);
  const tgt = state.champions.find((c) => c.id === e.targetId);
  if (!src || !tgt) continue;
  const role = src.positionLabel;
  hitCount[role] = (hitCount[role] || 0) + 1;
  const via = String(e.payload?.via ?? 'unk');
  const kind = via.startsWith('ability') || via.includes(':') ? 'spell' : via === 'auto' || via === 'basic' ? 'auto' : via;
  dmgByVia[role] = dmgByVia[role] || {};
  dmgByVia[role][kind] = (dmgByVia[role][kind] || 0) + Math.round(e.amount || 0);
}

console.log('t', mins.toFixed(1) + 'm');
for (const c of state.champions) {
  const act = Object.fromEntries(
    Object.entries(c.activitySec || {}).map(([k, v]) => [k, Math.round(Number(v))]),
  );
  const fightSec = (act.fight || 0);
  console.log(
    c.positionLabel,
    c.side,
    'dmg',
    Math.round(c.damageToChampions),
    'kda',
    `${c.kills}/${c.deaths}/${c.assists}`,
    'lvl',
    c.level,
    'ad/ap',
    Math.round(c.ad) + '/' + Math.round(c.ap),
    'hp',
    Math.round(c.maxHp),
    'act',
    JSON.stringify(act),
  );
}
console.log('champHitCountsByRole', hitCount);
console.log('dmgByViaRough', JSON.stringify(dmgByVia, null, 2));

const deaths = replay.events.filter((e) => e.type === 'champion_kill' || e.type === 'kill').length;
console.log('killEvents', deaths);
const trades = replay.events.filter((e) => e.type === 'decision' && (e.payload?.intent === 'trade' || e.payload?.action === 'trade')).length;
const fights = replay.events.filter((e) => e.type === 'decision' && (e.payload?.intent === 'fight' || e.payload?.action === 'fight' || e.payload?.intent === 'skirmish')).length;
console.log('decision trade/fight samples not counted precisely; activity above is source of truth');
