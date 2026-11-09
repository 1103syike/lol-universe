import { combatProfile } from '../champion/combat-profile';
import { combatPowerMult } from '../champion/identity-runtime';
import {
  grantExp,
  grantGold,
  nearestSharedRichesAlly,
  paySharedRichesMinionKill,
  tryPaySharedRichesCombat,
} from '../economy/economy';
import type { ChampionEntity, MinionEntity, MonsterEntity, StructureEntity } from '../state/entities';
import { pushGoldSample, type GameState } from '../state/game-state';
import type { ReplayRecorder } from '../replay/recorder';

export type Damageable = ChampionEntity | MinionEntity | MonsterEntity | StructureEntity;

const THREAT_WINDOW_SEC = 12;
const PROXIMITY_ASSIST_RANGE = 1400;
const KILLER_ASSIST_RANGE = 1400;
const LANE_MATE_ASSIST_RANGE = 1800;
const CHAMPION_DAMAGE_SCALE = 0.88;
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
    if (champ.positionLabel === 'SUPPORT') {
      continue;
    }
    const roleBias =
      champ.positionLabel === 'BOT'
        ? 40
        : champ.positionLabel === 'MID'
          ? 32
          : champ.positionLabel === 'TOP'
            ? 34
            : 8;
    const actionBias = farming ? 36 : 14;
    const score = champ.skills.laning + actionBias + roleBias - d / 55;
    if (score > bestScore) {
      best = champ;
      bestScore = score;
    }
  }
  if (!best) {
    return null;
  }
  const farming =
    best.currentAction === 'farm' ||
    best.currentAction === 'lane' ||
    best.currentAction === 'siege';
  const earlyBoost = state.scheduler.time < 240 ? 0.08 : 0;
  const chance =
    0.84 +
    best.skills.laning / 320 +
    (farming ? 0.1 : 0.03) +
    earlyBoost +
    (best.positionLabel === 'BOT' ? 0.05 : best.positionLabel === 'MID' ? 0.04 : 0.05);
  return state.rng() < Math.min(0.98, chance) ? best : null;
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
  const base = role === 'BOT' ? 0.78 : role === 'MID' ? 0.72 : 0.74;
  const earlyBoost = state.scheduler.time < 240 ? 0.1 : 0;
  const chance =
    base +
    owner.skills.laning / 450 +
    (farming ? 0.1 : 0) +
    earlyBoost +
    (fighting ? -0.22 : 0);
  return state.rng() < Math.min(0.96, Math.max(0.28, chance)) ? owner : null;
}

function creditLaneFarmBonuses(
  state: GameState,
  credited: ChampionEntity,
  minionGold: number,
  recorder?: ReplayRecorder,
): void {
  if (credited.positionLabel === 'BOT') {
    grantGold(state, credited, Math.round(minionGold * 0.22), 'lane_quest', recorder);
  } else if (credited.positionLabel === 'MID') {
    grantGold(state, credited, Math.round(minionGold * 0.06), 'lane_quest', recorder);
  } else if (credited.positionLabel === 'TOP') {
    grantGold(state, credited, Math.round(minionGold * 0.05), 'lane_quest', recorder);
  }
}

export function creditMinionKill(
  state: GameState,
  source: ChampionEntity | null,
  minion: MinionEntity,
  recorder?: ReplayRecorder,
  via = 'auto',
): void {
  let credited: ChampionEntity | null = null;
  let creditVia = via;

  if (source?.kind === 'champion' && source.positionLabel === 'SUPPORT') {
    const ally = paySharedRichesMinionKill(state, source, minion.gold, recorder);
    if (ally) {
      source.cs += 1;
      creditLaneFarmBonuses(state, ally, minion.gold, recorder);
      recorder?.record(state, {
        type: 'minion_death',
        actorId: source.id,
        targetId: minion.id,
        amount: minion.gold,
        payload: {
          via: 'support_shared_riches',
          cs: source.cs,
          sharedWith: ally.id,
        },
      });
      shareMinionExp(state, minion, ally, recorder);
      return;
    }
    const redirect = nearestSharedRichesAlly(state, source);
    if (redirect) {
      redirect.cs += 1;
      grantGold(state, redirect, minion.gold, 'cs', recorder);
      creditLaneFarmBonuses(state, redirect, minion.gold, recorder);
      recorder?.record(state, {
        type: 'minion_death',
        actorId: redirect.id,
        targetId: minion.id,
        amount: minion.gold,
        payload: { via: 'support_redirect', cs: redirect.cs, supportId: source.id },
      });
      shareMinionExp(state, minion, redirect, recorder);
      return;
    }
    shareMinionExp(state, minion, null, recorder);
    return;
  }
  if (source?.kind === 'champion') {
    credited = source;
  }

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
  }

  if (credited) {
    if (credited.positionLabel === 'SUPPORT') {
      const ally = paySharedRichesMinionKill(state, credited, minion.gold, recorder);
      if (ally) {
        credited.cs += 1;
        creditLaneFarmBonuses(state, ally, minion.gold, recorder);
        recorder?.record(state, {
          type: 'minion_death',
          actorId: credited.id,
          targetId: minion.id,
          amount: minion.gold,
          payload: {
            via: 'support_shared_riches',
            cs: credited.cs,
            sharedWith: ally.id,
          },
        });
        shareMinionExp(state, minion, ally, recorder);
      } else {
        shareMinionExp(state, minion, null, recorder);
      }
      return;
    }
    credited.cs += 1;
    grantGold(state, credited, minion.gold, 'cs', recorder);
    creditLaneFarmBonuses(state, credited, minion.gold, recorder);
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
    const exhausted = source.statuses.find((status) => status.kind === 'exhaust');
    if (exhausted) {
      powerScaled *= Math.max(0.4, 1 - exhausted.magnitude);
    }
  }
  if (target.kind === 'champion') {
    const takenProfile = combatProfile(state, target);
    powerScaled *= takenProfile.damageTakenMult;
  }
  const scaledRaw = target.kind === 'champion' ? powerScaled * CHAMPION_DAMAGE_SCALE : powerScaled;
  let dealt = mitigate(scaledRaw, damageType, armor, mr);
  if (target.kind === 'champion') {
    const shield = target.statuses.find((status) => status.kind === 'shield' && status.magnitude > 0);
    if (shield) {
      const absorbed = Math.min(shield.magnitude, dealt);
      shield.magnitude -= absorbed;
      dealt -= absorbed;
      if (shield.magnitude <= 0.5) {
        target.statuses = target.statuses.filter((status) => status.id !== shield.id);
      }
    }
  }
  target.hp = Math.max(0, target.hp - dealt);
  if (source && source.kind === 'champion') {
    source.damageDealt += dealt;
    if (target.kind === 'champion') {
      source.damageToChampions += dealt;
      noteThreat(target, source, dealt, state.scheduler.time);
      if (dealt > 0) {
        for (const structure of state.structures) {
          if (
            !structure.alive ||
            structure.side !== target.side ||
            structure.ad <= 0 ||
            structure.range <= 0
          ) {
            continue;
          }
          const towerGap = Math.hypot(
            source.position.x - structure.position.x,
            source.position.y - structure.position.y,
          );
          if (towerGap > structure.range) {
            continue;
          }
          structure.aggroTargetId = source.id;
          structure.aggroUntil = state.scheduler.time + 3.2;
        }
      }
      if (source.positionLabel === 'SUPPORT' && dealt > 0) {
        tryPaySharedRichesCombat(state, source, recorder);
      }
    }
  }
  if (target.kind === 'champion') {
    target.damageTaken += dealt;
    if (source && source.kind === 'champion') {
      target.damageTakenFromChampions += dealt;
    }
    if (
      dealt > 0 &&
      target.recallPhase === 'moving_home' &&
      target.recallChannelUntil - state.scheduler.time > 0.1
    ) {
      target.recallPhase = 'none';
      target.recallChannelUntil = 0;
      target.recallChannelDuration = 0;
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

function handleChampionDeath(
  state: GameState,
  source: ChampionEntity | null,
  victim: ChampionEntity,
  recorder?: ReplayRecorder,
  via = 'auto',
): void {
  const environmental = via === 'tower' || via === 'minion' || via === 'monster' || via === 'camp';
  let credited = resolveKiller(state, source, victim);
  if (!credited && !environmental) {
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
    const killPay = state.lockedPack.economy.killGold;
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
      }
    }
    const assistPool = Math.max(
      state.lockedPack.economy.assistGold,
      state.lockedPack.economy.killGold * 0.5,
    );
    const assistShare = assisted.size > 0 ? assistPool / assisted.size : 0;
    for (const allyId of assisted) {
      const ally = state.champions.find((champ) => champ.id === allyId);
      if (!ally) {
        continue;
      }
      ally.assists += 1;
      grantGold(state, ally, assistShare, 'assist', recorder);
      assistIds.push(ally.playerId);
    }
  }
  recorder?.record(state, {
    type: 'death',
    actorId: victim.id,
    targetId: credited?.id,
    x: victim.position.x,
    y: victim.position.y,
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
