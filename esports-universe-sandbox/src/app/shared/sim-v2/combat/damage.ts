import { combatProfile } from '../champion/combat-profile';
import { combatPowerMult } from '../champion/identity-runtime';
import { grantExp, grantGold, shareSupportGold } from '../economy/economy';
import type { ChampionEntity, MinionEntity, MonsterEntity, StructureEntity } from '../state/entities';
import { pushGoldSample, type GameState } from '../state/game-state';
import type { ReplayRecorder } from '../replay/recorder';
import { killOverpace, matchKillTotal } from './kill-pace';

export type Damageable = ChampionEntity | MinionEntity | MonsterEntity | StructureEntity;

const THREAT_WINDOW_SEC = 18;
const PROXIMITY_ASSIST_RANGE = 3200;
const KILLER_ASSIST_RANGE = 3000;
const LANE_MATE_ASSIST_RANGE = 5200;
const CHAMPION_DAMAGE_SCALE = 1.85;
const CHAMPION_HIT_HP_CAP = 0.078;
const MINION_XP_RANGE = 1200;

const BASE_RESPAWN_WAIT = [
  10, 10, 12, 12, 14, 16, 20, 25, 28, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5,
] as const;

export function deathTimerSec(level: number, timeSec: number): number {
  const brw = BASE_RESPAWN_WAIT[Math.max(0, Math.min(17, level - 1))] ?? 52.5;
  const minutes = timeSec / 60;
  let tif = 0;
  if (minutes >= 15) {
    const steps15 = Math.ceil(2 * (Math.min(minutes, 30) - 15));
    tif += Math.max(0, steps15) * 0.00425;
  }
  if (minutes >= 30) {
    const steps30 = Math.ceil(2 * (Math.min(minutes, 45) - 30));
    tif += Math.max(0, steps30) * 0.003;
  }
  if (minutes >= 45) {
    const steps45 = Math.ceil(2 * (Math.min(minutes, 55) - 45));
    tif += Math.max(0, steps45) * 0.0145;
  }
  tif = Math.min(0.5, tif);
  return brw * (1 + tif);
}

function isFightingAction(action: string): boolean {
  return (
    action === 'fight' ||
    action === 'trade' ||
    action === 'gank' ||
    action === 'skirmish'
  );
}

function shareMinionExp(
  state: GameState,
  minion: MinionEntity,
  killer: ChampionEntity | null,
  recorder?: ReplayRecorder,
): void {
  const baseXp = 58 + minion.gold * 0.35;
  const nearby = state.champions.filter((champ) => {
    if (!champ.alive || champ.side === minion.side) {
      return false;
    }
    const dx = champ.position.x - minion.position.x;
    const dy = champ.position.y - minion.position.y;
    return Math.hypot(dx, dy) <= MINION_XP_RANGE;
  });
  if (nearby.length === 0) {
    return;
  }
  if (killer) {
    grantExp(state, killer, baseXp, recorder, 'minion');
    for (const ally of nearby) {
      if (ally.id === killer.id) {
        continue;
      }
      grantExp(state, ally, baseXp * 0.55, recorder, 'minion_share');
    }
    return;
  }
  const split = baseXp / nearby.length;
  for (const champ of nearby) {
    grantExp(state, champ, split, recorder, 'minion_share');
  }
}

function laneOfChampion(champion: ChampionEntity): 'top' | 'mid' | 'bot' | 'jungle' {
  if (champion.positionLabel === 'TOP') {
    return 'top';
  }
  if (champion.positionLabel === 'MID') {
    return 'mid';
  }
  if (champion.positionLabel === 'BOT' || champion.positionLabel === 'SUPPORT') {
    return 'bot';
  }
  return 'jungle';
}

function softLastHitFarmer(
  state: GameState,
  minion: MinionEntity,
): ChampionEntity | null {
  let best: ChampionEntity | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const champ of state.champions) {
    if (!champ.alive || champ.side === minion.side) {
      continue;
    }
    if (champ.positionLabel === 'JUNGLE') {
      continue;
    }
    const lane = laneOfChampion(champ);
    if (lane !== minion.lane) {
      continue;
    }
    if (
      champ.currentAction === 'dead' ||
      champ.currentAction === 'recall' ||
      champ.currentAction === 'stunned'
    ) {
      continue;
    }
    const d = Math.hypot(champ.position.x - minion.position.x, champ.position.y - minion.position.y);
    const farming =
      champ.currentAction === 'farm' ||
      champ.currentAction === 'lane' ||
      champ.currentAction === 'siege';
    const reach =
      champ.positionLabel === 'SUPPORT'
        ? champ.attackRange + (farming ? 780 : 520)
        : champ.attackRange + (farming ? 980 : 720);
    if (d > reach) {
      continue;
    }
    const roleBias =
      champ.positionLabel === 'BOT'
        ? 36
        : champ.positionLabel === 'MID'
          ? 28
          : champ.positionLabel === 'TOP'
            ? 26
            : 6;
    const actionBias = farming ? 34 : 12;
    const score = champ.skills.laning + actionBias + roleBias - d / 55;
    if (score > bestScore) {
      best = champ;
      bestScore = score;
    }
  }
  if (!best) {
    return null;
  }
  if (best.positionLabel === 'SUPPORT') {
    const supportChance =
      0.42 +
      best.skills.laning / 300 +
      (best.currentAction === 'farm' || best.currentAction === 'lane' ? 0.12 : 0);
    return state.rng() < Math.min(0.62, supportChance) ? best : null;
  }
  const farming =
    best.currentAction === 'farm' ||
    best.currentAction === 'lane' ||
    best.currentAction === 'siege';
  const chance =
    0.7 +
    best.skills.laning / 280 +
    (farming ? 0.12 : 0.02) +
    (best.positionLabel === 'BOT' ? 0.06 : best.positionLabel === 'MID' ? 0.04 : 0.03);
  return state.rng() < Math.min(0.94, chance) ? best : null;
}

function laneOwnerFarmer(
  state: GameState,
  minion: MinionEntity,
): ChampionEntity | null {
  const role =
    minion.lane === 'top' ? 'TOP' : minion.lane === 'mid' ? 'MID' : 'BOT';
  const owner = state.champions.find(
    (champ) =>
      champ.alive &&
      champ.side !== minion.side &&
      champ.positionLabel === role &&
      champ.currentAction !== 'dead' &&
      champ.currentAction !== 'recall' &&
      champ.currentAction !== 'stunned',
  );
  if (!owner) {
    return null;
  }
  const farming =
    owner.currentAction === 'farm' ||
    owner.currentAction === 'lane' ||
    owner.currentAction === 'siege' ||
    owner.currentAction === 'idle';
  const fighting =
    owner.currentAction === 'fight' ||
    owner.currentAction === 'trade' ||
    owner.currentAction === 'gank' ||
    owner.currentAction === 'skirmish' ||
    owner.currentAction === 'roam';
  const base = role === 'BOT' ? 0.6 : role === 'MID' ? 0.34 : 0.36;
  const chance =
    base +
    owner.skills.laning / 400 +
    (farming ? 0.1 : 0) +
    (fighting ? -0.32 : 0);
  return state.rng() < Math.min(0.84, Math.max(0.14, chance)) ? owner : null;
}

export function creditMinionKill(
  state: GameState,
  source: ChampionEntity | null,
  minion: MinionEntity,
  recorder?: ReplayRecorder,
  via = 'auto',
): void {
  let credited = source?.kind === 'champion' ? source : null;
  let creditVia = via;
  if (!credited && (via === 'minion' || via === 'tower')) {
    credited = softLastHitFarmer(state, minion);
    if (credited) {
      creditVia = 'soft_lasthit';
    } else {
      credited = laneOwnerFarmer(state, minion);
      if (credited) {
        creditVia = 'lane_owner';
      }
    }
    if (
      credited?.positionLabel === 'BOT' &&
      minion.lane === 'bot' &&
      state.rng() < 0.085
    ) {
      const support = state.champions.find(
        (champ) =>
          champ.alive &&
          champ.side === credited!.side &&
          champ.positionLabel === 'SUPPORT' &&
          champ.currentAction !== 'dead' &&
          champ.currentAction !== 'recall',
      );
      if (support) {
        credited = support;
        creditVia = 'support_tax';
      }
    }
  }
  if (credited) {
    credited.cs += 1;
    grantGold(state, credited, minion.gold, 'cs', recorder);
    if (credited.positionLabel === 'BOT') {
      grantGold(state, credited, Math.round(minion.gold * 0.22), 'lane_quest', recorder);
    } else if (credited.positionLabel === 'MID') {
      grantGold(state, credited, Math.round(minion.gold * 0.06), 'lane_quest', recorder);
    } else if (credited.positionLabel === 'TOP') {
      grantGold(state, credited, Math.round(minion.gold * 0.05), 'lane_quest', recorder);
    }
    shareSupportGold(state, credited, minion.gold, recorder);
    recorder?.record(state, {
      type: 'minion_death',
      actorId: credited.id,
      targetId: minion.id,
      amount: minion.gold,
      payload: { via: creditVia, cs: credited.cs },
    });
  }
  shareMinionExp(state, minion, credited, recorder);
}

export function mitigate(
  raw: number,
  damageType: 'physical' | 'magic' | 'true',
  armor: number,
  mr: number,
): number {
  if (damageType === 'true') {
    return Math.max(0, raw);
  }
  const resist = damageType === 'physical' ? armor : mr;
  const factor = 100 / (100 + Math.max(0, resist));
  return Math.max(0, raw * factor);
}

function noteThreat(victim: ChampionEntity, source: ChampionEntity, amount: number, at: number): void {
  const prev = victim.threatTable[source.id];
  victim.threatTable[source.id] = {
    amount: (prev?.amount ?? 0) + amount,
    at,
  };
}

function resolveKiller(
  state: GameState,
  source: ChampionEntity | null,
  victim: ChampionEntity,
): ChampionEntity | null {
  if (source) {
    return source;
  }
  const now = state.scheduler.time;
  let best: ChampionEntity | null = null;
  let bestAmount = 0;
  for (const [attackerId, threat] of Object.entries(victim.threatTable)) {
    if (now - threat.at > THREAT_WINDOW_SEC || threat.amount <= 0) {
      continue;
    }
    const attacker = state.champions.find((champ) => champ.id === attackerId);
    if (!attacker || attacker.side === victim.side) {
      continue;
    }
    if (threat.amount > bestAmount) {
      best = attacker;
      bestAmount = threat.amount;
    }
  }
  return best;
}

function forceRecall(state: GameState, victim: ChampionEntity, recorder?: ReplayRecorder): void {
  const fountain =
    victim.side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
  victim.hp = Math.max(victim.maxHp * 0.35, 1);
  victim.threatTable = {};
  victim.path = [];
  victim.moving = false;
  victim.currentAction = 'recall';
  victim.recallPhase = 'at_base';
  victim.recallCount += 1;
  victim.position = { ...fountain };
  recorder?.record(state, {
    type: 'respawn',
    actorId: victim.id,
    x: fountain.x,
    y: fountain.y,
    payload: { reason: 'escape_pve' },
  });
}

export function applyDamage(
  state: GameState,
  source: ChampionEntity | null,
  target: Damageable,
  raw: number,
  damageType: 'physical' | 'magic' | 'true',
  recorder?: ReplayRecorder,
  via = 'auto',
): number {
  if (!('alive' in target) || !target.alive) {
    return 0;
  }
  const armor =
    'armor' in target && typeof (target as ChampionEntity).armor === 'number'
      ? (target as ChampionEntity).armor
      : 0;
  const mr =
    'mr' in target && typeof (target as ChampionEntity).mr === 'number'
      ? (target as ChampionEntity).mr
      : 0;
  let powerScaled = raw;
  if (source && source.kind === 'champion' && target.kind === 'champion') {
    const profile = combatProfile(state, source);
    powerScaled *= combatPowerMult(state, source) * profile.damageDealtMult;
    if (via === 'auto') {
      powerScaled *= profile.autoMult;
    }
    if (source.positionLabel === 'TOP') {
      powerScaled *= via === 'auto' ? 1.05 : via === 'lane_harass' ? 1.02 : 1.03;
    }
    const overpace = killOverpace(state);
    const kills = matchKillTotal(state);
    if (overpace > 1.15) {
      powerScaled *= 1 / (1 + (overpace - 1.15) * 1.15);
    }
    if (kills >= 32) {
      powerScaled *= 0.9;
    }
    if (kills >= 38) {
      powerScaled *= 0.82;
    }
    if (kills >= 42) {
      powerScaled *= 0.7;
    }
    const minutes = state.scheduler.time / 60;
    if (minutes > 30) {
      powerScaled *= 1 / (1 + (minutes - 30) * 0.018);
    }
  }
  if (target.kind === 'champion') {
    const takenProfile = combatProfile(state, target);
    powerScaled *= takenProfile.damageTakenMult;
  }
  const scaledRaw = target.kind === 'champion' ? powerScaled * CHAMPION_DAMAGE_SCALE : powerScaled;
  let dealt = mitigate(scaledRaw, damageType, armor, mr);
  if (target.kind === 'champion' && damageType !== 'true') {
    const hpCap = target.maxHp * CHAMPION_HIT_HP_CAP;
    dealt = Math.min(dealt, hpCap);
  }
  target.hp = Math.max(0, target.hp - dealt);
  if (source && source.kind === 'champion') {
    source.damageDealt += dealt;
    if (target.kind === 'champion') {
      source.damageToChampions += dealt;
      noteThreat(target, source, dealt, state.scheduler.time);
    }
  }
  if (target.kind === 'champion') {
    target.damageTaken += dealt;
    if (dealt > 0 && target.recallPhase === 'moving_home') {
      target.recallPhase = 'none';
      target.recallChannelUntil = 0;
      target.currentAction = 'idle';
    }
  }
  recorder?.record(state, {
    type: 'damage',
    actorId: source?.id,
    targetId: target.id,
    amount: dealt,
    payload: { raw, damageType, via, hpAfter: target.hp },
  });
  if (target.hp <= 0) {
    if (target.kind === 'champion') {
      const overpace = killOverpace(state);
      const kills = matchKillTotal(state);
      const escapeChance =
        overpace > 0.85 ? 0.92 : overpace > 0.75 ? 0.78 : kills >= 20 ? 0.62 : 0.34;
      if (source?.kind === 'champion' && state.rng() < escapeChance) {
        target.alive = true;
        forceRecall(state, target, recorder);
        return dealt;
      }
      target.alive = false;
      handleChampionDeath(state, source, target, recorder, via);
    } else if (target.kind === 'minion') {
      target.alive = false;
      creditMinionKill(state, source?.kind === 'champion' ? source : null, target, recorder, via);
    } else {
      target.alive = false;
    }
  }
  return dealt;
}

function nearestEnemyChampion(
  state: GameState,
  victim: ChampionEntity,
  radius: number,
): ChampionEntity | null {
  let best: ChampionEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === victim.side) {
      continue;
    }
    const dx = enemy.position.x - victim.position.x;
    const dy = enemy.position.y - victim.position.y;
    const d = Math.hypot(dx, dy);
    if (d <= radius && d < bestDist) {
      best = enemy;
      bestDist = d;
    }
  }
  return best;
}

function handleChampionDeath(
  state: GameState,
  source: ChampionEntity | null,
  victim: ChampionEntity,
  recorder?: ReplayRecorder,
  via = 'auto',
): void {
  let credited = resolveKiller(state, source, victim);
  const environmental = via === 'tower' || via === 'minion' || via === 'monster' || via === 'camp';
  if (!credited && environmental) {
    credited =
      nearestEnemyChampion(state, victim, 1800) ?? nearestEnemyChampion(state, victim, 20000);
  }
  if (!credited) {
    credited = state.champions.find((champ) => champ.side !== victim.side) ?? null;
  }
  if (!credited) {
    victim.alive = true;
    forceRecall(state, victim, recorder);
    return;
  }

  victim.deaths += 1;
  victim.moving = false;
  victim.path = [];
  victim.currentAction = 'dead';
  victim.recallPhase = 'none';
  const threatSnapshot = { ...victim.threatTable };
  victim.threatTable = {};
  const t = state.scheduler.time;
  const respawn = deathTimerSec(victim.level, t);
  victim.respawnAt = t + respawn;
  const assistIds: string[] = [];
  if (credited) {
    credited.kills += 1;
    const killPay =
      state.lockedPack.economy.killGold *
      (credited.positionLabel === 'SUPPORT' ? 0.55 : credited.positionLabel === 'JUNGLE' ? 0.9 : 1);
    grantGold(state, credited, killPay, 'kill', recorder);
    pushGoldSample(state);
    const killXp = 80 + victim.level * 28 + Math.max(0, victim.level - credited.level) * 18;
    grantExp(state, credited, killXp, recorder, 'kill');
    const assisted = new Set<string>();
    for (const [attackerId, threat] of Object.entries(threatSnapshot)) {
      if (t - threat.at > THREAT_WINDOW_SEC || threat.amount <= 0) {
        continue;
      }
      const ally = state.champions.find((champ) => champ.id === attackerId);
      if (!ally || ally.side !== credited.side || ally.id === credited.id) {
        continue;
      }
      assisted.add(ally.id);
    }
    const laneOf = (champ: ChampionEntity): 'top' | 'mid' | 'bot' | 'jungle' => {
      if (champ.positionLabel === 'TOP') {
        return 'top';
      }
      if (champ.positionLabel === 'MID') {
        return 'mid';
      }
      if (champ.positionLabel === 'BOT' || champ.positionLabel === 'SUPPORT') {
        return 'bot';
      }
      return 'jungle';
    };
    const killLane = laneOf(victim);
    for (const ally of state.champions) {
      if (ally.side !== credited.side || ally.id === credited.id || !ally.alive) {
        continue;
      }
      if (assisted.has(ally.id)) {
        continue;
      }
      const toVictim = Math.hypot(
        ally.position.x - victim.position.x,
        ally.position.y - victim.position.y,
      );
      const toKiller = Math.hypot(
        ally.position.x - credited.position.x,
        ally.position.y - credited.position.y,
      );
      if (toVictim <= PROXIMITY_ASSIST_RANGE || toKiller <= KILLER_ASSIST_RANGE) {
        assisted.add(ally.id);
        continue;
      }
      const sameLaneMate =
        laneOf(ally) === killLane &&
        killLane !== 'jungle' &&
        Math.min(toVictim, toKiller) <= LANE_MATE_ASSIST_RANGE;
      const junglerNearby =
        ally.positionLabel === 'JUNGLE' && Math.min(toVictim, toKiller) <= LANE_MATE_ASSIST_RANGE;
      if (sameLaneMate || junglerNearby) {
        assisted.add(ally.id);
        continue;
      }
      if (
        isFightingAction(ally.currentAction) &&
        (toVictim <= PROXIMITY_ASSIST_RANGE + 600 || toKiller <= KILLER_ASSIST_RANGE + 600)
      ) {
        assisted.add(ally.id);
        continue;
      }
      let dealtRecently = false;
      for (const enemy of state.champions) {
        if (enemy.side === ally.side) {
          continue;
        }
        const threat = enemy.threatTable[ally.id] ?? threatSnapshot[ally.id];
        if (threat && t - threat.at <= THREAT_WINDOW_SEC && threat.amount > 0) {
          dealtRecently = true;
          break;
        }
      }
      if (dealtRecently && Math.min(toVictim, toKiller) <= PROXIMITY_ASSIST_RANGE + 800) {
        assisted.add(ally.id);
      }
    }
    for (const allyId of assisted) {
      const ally = state.champions.find((champ) => champ.id === allyId);
      if (!ally) {
        continue;
      }
      ally.assists += 1;
      const assistPay =
        state.lockedPack.economy.assistGold *
        (ally.positionLabel === 'SUPPORT' ? 0.7 : 1);
      grantGold(state, ally, assistPay, 'assist', recorder);
      assistIds.push(ally.playerId);
    }
  }
  recorder?.record(state, {
    type: 'death',
    actorId: victim.id,
    targetId: credited?.id,
    payload: { respawnAt: victim.respawnAt, assistPlayerIds: assistIds, via },
  });
  state.scheduler.schedule(victim.respawnAt, 'respawn', () => {
    if (state.ended) {
      return;
    }
    const fountain =
      victim.side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
    victim.alive = true;
    victim.hp = victim.maxHp;
    victim.mana = victim.maxMana;
    victim.position = { ...fountain };
    victim.currentAction = 'idle';
    victim.recallPhase = 'at_base';
    recorder?.record(state, { type: 'respawn', actorId: victim.id, x: fountain.x, y: fountain.y });
  });
}
