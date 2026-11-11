import { SUMMONER_SPELLS, type SummonerSpellId } from '../../../core/data/summoner-spells';
import { dashTowardWalkable, dist } from '../map/pathfinding';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, SummonerSpellRuntime } from '../state/entities';
import type { GameState } from '../state/game-state';
import {
  applyMs,
  applySlow,
  heal,
  pushStatus,
} from './ability-helpers';
import { applyDamage } from './damage';

export function hasSummoner(champion: ChampionEntity, spellId: SummonerSpellId): boolean {
  return champion.summonerSpells.some((spell) => spell.id === spellId);
}

export function summonerReady(
  state: GameState,
  champion: ChampionEntity,
  spellId: SummonerSpellId,
): SummonerSpellRuntime | null {
  const spell = champion.summonerSpells.find((item) => item.id === spellId);
  if (!spell || state.scheduler.time < spell.cooldownUntil) {
    return null;
  }
  return spell;
}

function startCooldown(
  state: GameState,
  champion: ChampionEntity,
  spell: SummonerSpellRuntime,
): void {
  const def = SUMMONER_SPELLS[spell.id];
  spell.cooldownUntil = state.scheduler.time + def.cooldownSec;
  if (spell.id === 'Smite') {
    champion.nextSmiteAt = spell.cooldownUntil;
  }
}

function recordCast(
  state: GameState,
  champion: ChampionEntity,
  spellId: SummonerSpellId,
  targetId: string | undefined,
  recorder?: ReplayRecorder,
): void {
  recorder?.record(state, {
    type: 'summoner',
    actorId: champion.id,
    targetId,
    payload: { spellId },
  });
}

export function smiteDamageFor(champion: ChampionEntity): number {
  return 450 + champion.level * 25;
}

export function castSmite(
  state: GameState,
  champion: ChampionEntity,
  target: { id: string; alive: boolean; hp: number; position: { x: number; y: number } },
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Smite');
  if (!spell || !target.alive) {
    return false;
  }
  if (dist(champion.position, target.position) > SUMMONER_SPELLS.Smite.range + 40) {
    return false;
  }
  applyDamage(
    state,
    champion,
    target as never,
    smiteDamageFor(champion),
    'true',
    recorder,
    'smite',
  );
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Smite', target.id, recorder);
  return true;
}

export function castFlash(
  state: GameState,
  champion: ChampionEntity,
  toward: { x: number; y: number },
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Flash');
  if (!spell) {
    return false;
  }
  const map = state.lockedPack.map;
  champion.position = dashTowardWalkable(
    map,
    champion.position,
    toward,
    SUMMONER_SPELLS.Flash.range,
  );
  champion.path = [];
  champion.moving = false;
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Flash', undefined, recorder);
  return true;
}

export function castIgnite(
  state: GameState,
  champion: ChampionEntity,
  target: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Ignite');
  if (!spell || !target.alive || target.side === champion.side) {
    return false;
  }
  if (dist(champion.position, target.position) > SUMMONER_SPELLS.Ignite.range) {
    return false;
  }
  const total = 70 + champion.level * 20;
  applyDamage(state, champion, target, total * 0.45, 'true', recorder, 'ignite');
  pushStatus(target, {
    id: `${champion.id}:ignite`,
    kind: 'ignite',
    remainingSec: 5,
    magnitude: total * 0.55,
  });
  pushStatus(target, {
    id: `${champion.id}:grievous`,
    kind: 'grievous',
    remainingSec: 5,
    magnitude: 0.4,
  });
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Ignite', target.id, recorder);
  return true;
}

export function castHeal(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Heal');
  if (!spell) {
    return false;
  }
  const amount = 90 + champion.level * 15;
  heal(champion, amount, champion);
  applyMs(champion, 'summoner:heal:ms', 1.2, 50);
  let partner: ChampionEntity | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const ally of state.champions) {
    if (!ally.alive || ally.side !== champion.side || ally.id === champion.id) {
      continue;
    }
    const gap = dist(champion.position, ally.position);
    if (gap > SUMMONER_SPELLS.Heal.range || gap >= best) {
      continue;
    }
    best = gap;
    partner = ally;
  }
  if (partner) {
    heal(partner, amount * 0.85, champion);
    applyMs(partner, 'summoner:heal:ally-ms', 1.2, 50);
  }
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Heal', partner?.id, recorder);
  return true;
}

export function castExhaust(
  state: GameState,
  champion: ChampionEntity,
  target: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Exhaust');
  if (!spell || !target.alive || target.side === champion.side) {
    return false;
  }
  if (dist(champion.position, target.position) > SUMMONER_SPELLS.Exhaust.range) {
    return false;
  }
  applySlow(target, 'summoner:exhaust:slow', 3, 0.3);
  pushStatus(target, {
    id: 'summoner:exhaust:damage',
    kind: 'exhaust',
    remainingSec: 3,
    magnitude: 0.35,
  });
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Exhaust', target.id, recorder);
  return true;
}

export function castGhost(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Ghost');
  if (!spell) {
    return false;
  }
  applyMs(champion, 'summoner:ghost', 10, 70 + champion.level * 2);
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Ghost', undefined, recorder);
  return true;
}

export function castBarrier(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Barrier');
  if (!spell) {
    return false;
  }
  pushStatus(champion, {
    id: 'summoner:barrier',
    kind: 'shield',
    remainingSec: 2.5,
    magnitude: 120 + champion.level * 20,
  });
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Barrier', undefined, recorder);
  return true;
}

export function castCleanse(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Cleanse');
  if (!spell) {
    return false;
  }
  champion.statuses = champion.statuses.filter(
    (status) =>
      status.kind !== 'stun' &&
      status.kind !== 'slow' &&
      status.kind !== 'exhaust' &&
      status.kind !== 'ignite',
  );
  applyMs(champion, 'summoner:cleanse:ms', 1, 30);
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Cleanse', undefined, recorder);
  return true;
}

export function castTeleport(
  state: GameState,
  champion: ChampionEntity,
  destination: { x: number; y: number },
  recorder?: ReplayRecorder,
): boolean {
  const spell = summonerReady(state, champion, 'Teleport');
  if (!spell) {
    return false;
  }
  if (champion.recallPhase !== 'none') {
    return false;
  }
  champion.moving = false;
  champion.path = [];
  champion.recallPhase = 'moving_home';
  champion.recallChannelDuration = 4;
  champion.recallChannelUntil = state.scheduler.time + 4;
  champion.recallHpSnapshot = champion.hp;
  champion.currentAction = 'teleport';
  champion.teleportDestination = { ...destination };
  startCooldown(state, champion, spell);
  recordCast(state, champion, 'Teleport', undefined, recorder);
  return true;
}

export function clearTeleportChannel(champion: ChampionEntity): void {
  champion.teleportDestination = null;
  if (champion.currentAction === 'teleport') {
    champion.currentAction = 'idle';
  }
}

export function finishTeleportIfReady(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  const channelingTp =
    champion.currentAction === 'teleport' || !!champion.teleportDestination;
  if (!channelingTp) {
    return false;
  }
  if (!champion.teleportDestination) {
    clearTeleportChannel(champion);
    if (champion.recallPhase === 'moving_home') {
      champion.recallPhase = 'none';
      champion.recallChannelUntil = 0;
      champion.recallChannelDuration = 0;
      champion.recallHpSnapshot = 0;
    }
    return false;
  }
  champion.currentAction = 'teleport';
  if (state.scheduler.time < champion.recallChannelUntil) {
    champion.moving = false;
    champion.path = [];
    return true;
  }
  champion.position = { ...champion.teleportDestination };
  champion.teleportDestination = null;
  champion.recallPhase = 'none';
  champion.recallChannelUntil = 0;
  champion.recallChannelDuration = 0;
  champion.recallHpSnapshot = 0;
  champion.currentAction = 'idle';
  applyMs(champion, 'summoner:tp:ms', 3, 40);
  recorder?.record(state, {
    type: 'respawn',
    actorId: champion.id,
    x: champion.position.x,
    y: champion.position.y,
    payload: { reason: 'teleport' },
  });
  return true;
}

export function maybeTickSummonerDots(
  state: GameState,
  champion: ChampionEntity,
  dt: number,
  recorder?: ReplayRecorder,
): void {
  for (const status of champion.statuses) {
    if (status.kind !== 'ignite' || status.magnitude <= 0) {
      continue;
    }
    const tick = (status.magnitude / Math.max(0.1, status.remainingSec)) * dt;
    status.magnitude = Math.max(0, status.magnitude - tick);
    applyDamage(state, null, champion, tick, 'true', recorder, 'ignite_dot');
  }
}
