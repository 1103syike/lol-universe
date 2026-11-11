import { CHAMPION_COMBAT_BY_ID } from '../../../core/data/champion-combat';
import { combatProfile } from '../champion/combat-profile';
import { combatPowerMult } from '../champion/identity-runtime';
import {
  grantExp,
  grantGold,
  nearestSharedRichesAlly,
  paySharedRichesMinionKill,
  tryPaySharedRichesCombat,
} from '../economy/economy';
import { jungleMonsterDamageMult } from '../jungle/jungle-clear-profile';
import { finalizeMonsterKill } from '../jungle/jungle-system';
import type {
  ChampionEntity,
  MinionEntity,
  MonsterEntity,
  StructureEntity,
} from '../state/entities';
import { pushGoldSample, type GameState } from '../state/game-state';
import type { ReplayRecorder } from '../replay/recorder';
import { noteAhriChampionTakedown, noteAhriFragmentKill } from './ahri-passives';

type DamageSource = ChampionEntity | MinionEntity | MonsterEntity | StructureEntity | null;

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

const SOFT_LASTHIT_TICK_SLACK = 120;

function softLastHitReach(champ: ChampionEntity, farming: boolean): number {
  if (champ.positionLabel === 'SUPPORT') {
    return champ.attackRange + (farming ? 140 : 80);
  }
  if (champ.positionLabel === 'JUNGLE') {
    return champ.attackRange + (farming ? 160 : 100);
  }
  return champ.attackRange + (farming ? SOFT_LASTHIT_TICK_SLACK : 50);
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
    const lane = laneOfChampion(champ);
    if (champ.positionLabel !== 'JUNGLE' && lane !== minion.lane) {
      continue;
    }
    if (
      champ.currentAction === 'dead' ||
      champ.currentAction === 'recall' ||
      champ.currentAction === 'stunned' ||
      champ.positionLabel === 'SUPPORT'
    ) {
      continue;
    }
    const farming =
      champ.currentAction === 'farm' ||
      champ.currentAction === 'lane' ||
      champ.currentAction === 'wave_freeze' ||
      champ.currentAction === 'wave_shove' ||
      champ.currentAction === 'siege' ||
      champ.currentAction === 'clear';
    const d = Math.hypot(champ.position.x - minion.position.x, champ.position.y - minion.position.y);
    if (d > softLastHitReach(champ, farming)) {
      continue;
    }
    const roleBias =
      champ.positionLabel === 'BOT'
        ? 40
        : champ.positionLabel === 'MID'
          ? 32
          : champ.positionLabel === 'TOP'
            ? 34
            : champ.positionLabel === 'JUNGLE'
              ? 18
              : 8;
    const actionBias = farming ? 36 : 14;
    const score = champ.skills.laning + actionBias + roleBias - d / 40;
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
    best.currentAction === 'wave_freeze' ||
    best.currentAction === 'wave_shove' ||
    best.currentAction === 'siege' ||
    best.currentAction === 'clear';
  const fighting =
    best.currentAction === 'fight' ||
    best.currentAction === 'trade' ||
    best.currentAction === 'gank' ||
    best.currentAction === 'skirmish' ||
    best.currentAction === 'roam';
  const t = state.scheduler.time;
  const earlyBoost = t < 240 ? 0.03 : 0;
  const latePenalty = t >= 1200 ? 0.04 : t >= 900 ? 0.02 : 0;
  const roleBonus =
    best.positionLabel === 'BOT'
      ? 0.06
      : best.positionLabel === 'MID'
        ? 0.03
        : best.positionLabel === 'TOP'
          ? 0.02
          : 0;
  const chance =
    (best.positionLabel === 'JUNGLE' ? 0.22 : 0.52) +
    best.skills.laning / 420 +
    (farming ? 0.1 : 0.02) +
    earlyBoost +
    roleBonus -
    (fighting ? 0.1 : 0) -
    latePenalty;
  const cap = best.positionLabel === 'JUNGLE' ? 0.42 : best.positionLabel === 'BOT' ? 0.82 : 0.76;
  return state.rng() < Math.min(cap, Math.max(0.14, chance)) ? best : null;
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
  const d = Math.hypot(owner.position.x - minion.position.x, owner.position.y - minion.position.y);
  const farming =
    owner.currentAction === 'farm' ||
    owner.currentAction === 'lane' ||
    owner.currentAction === 'wave_freeze' ||
    owner.currentAction === 'wave_shove' ||
    owner.currentAction === 'siege' ||
    owner.currentAction === 'idle';
  if (d > softLastHitReach(owner, farming)) {
    return null;
  }
  const fighting =
    owner.currentAction === 'fight' ||
    owner.currentAction === 'trade' ||
    owner.currentAction === 'gank' ||
    owner.currentAction === 'skirmish' ||
    owner.currentAction === 'roam';
  const t = state.scheduler.time;
  const base = role === 'BOT' ? 0.42 : role === 'MID' ? 0.36 : 0.36;
  const earlyBoost = t < 240 ? 0.03 : 0;
  const latePenalty = t >= 1200 ? 0.03 : t >= 900 ? 0.015 : 0;
  const chance =
    base +
    owner.skills.laning / 520 +
    (farming ? 0.08 : 0) +
    earlyBoost -
    (fighting ? 0.28 : 0) -
    latePenalty;
  return state.rng() < Math.min(0.62, Math.max(0.1, chance)) ? owner : null;
}

function creditLaneFarmBonuses(
  state: GameState,
  credited: ChampionEntity,
  minionGold: number,
  recorder?: ReplayRecorder,
): void {
  if (credited.positionLabel === 'BOT') {
    grantGold(state, credited, Math.round(minionGold * 0.14), 'lane_quest', recorder);
  } else if (credited.positionLabel === 'MID') {
    grantGold(state, credited, Math.round(minionGold * 0.05), 'lane_quest', recorder);
  } else if (credited.positionLabel === 'TOP') {
    grantGold(state, credited, Math.round(minionGold * 0.04), 'lane_quest', recorder);
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
    const supportGap = Math.hypot(
      source.position.x - minion.position.x,
      source.position.y - minion.position.y,
    );
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
          gap: Math.round(supportGap),
          attackRange: source.attackRange,
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
      const redirectGap = Math.hypot(
        redirect.position.x - minion.position.x,
        redirect.position.y - minion.position.y,
      );
      recorder?.record(state, {
        type: 'minion_death',
        actorId: redirect.id,
        targetId: minion.id,
        amount: minion.gold,
        payload: {
          via: 'support_redirect',
          cs: redirect.cs,
          supportId: source.id,
          gap: Math.round(redirectGap),
          attackRange: redirect.attackRange,
        },
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
    const creditGap = Math.hypot(
      credited.position.x - minion.position.x,
      credited.position.y - minion.position.y,
    );
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
            gap: Math.round(creditGap),
            attackRange: credited.attackRange,
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
    noteAhriFragmentKill(credited);
    recorder?.record(state, {
      type: 'minion_death',
      actorId: credited.id,
      targetId: minion.id,
      amount: minion.gold,
      payload: {
        via: creditVia,
        cs: credited.cs,
        gap: Math.round(creditGap),
        attackRange: credited.attackRange,
      },
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

export function damageDrawsMinionCallForHelp(via: string): boolean {
  if (via === 'auto' || via === 'ignite') {
    return true;
  }
  const match = /^([A-Za-z]+):([QWERPqwerp])(?::|$)/.exec(via);
  if (!match) {
    return false;
  }
  const championId = match[1];
  const slot = match[2].toUpperCase() as 'Q' | 'W' | 'E' | 'R' | 'P';
  if (slot === 'P') {
    return true;
  }
  const combat =
    CHAMPION_COMBAT_BY_ID[championId] ??
    Object.values(CHAMPION_COMBAT_BY_ID).find(
      (entry) => entry.id.toLowerCase() === championId.toLowerCase(),
    );
  const ability = combat?.abilities.find((item) => item.slot === slot);
  if (!ability) {
    return true;
  }
  return !ability.tags.includes('skillshot');
}

function noteThreat(
  victim: ChampionEntity,
  source: ChampionEntity,
  amount: number,
  at: number,
  callHelp: boolean,
): void {
  const prev = victim.threatTable[source.id];
  victim.threatTable[source.id] = {
    amount: (prev?.amount ?? 0) + amount,
    at,
    callHelp: Boolean(prev?.callHelp) || callHelp,
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
  source: DamageSource,
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
    'armor' in target && typeof (target as { armor?: number }).armor === 'number'
      ? ((target as { armor: number }).armor ?? 0)
      : 0;
  const mr =
    'mr' in target && typeof (target as { mr?: number }).mr === 'number'
      ? ((target as { mr: number }).mr ?? 0)
      : 0;
  let powerScaled = raw;
  const champSource = source?.kind === 'champion' ? source : null;
  if (champSource && target.kind === 'champion') {
    const profile = combatProfile(state, champSource);
    powerScaled *= combatPowerMult(state, champSource) * profile.damageDealtMult;
    if (via === 'auto') {
      powerScaled *= profile.autoMult;
    }
    const exhausted = champSource.statuses.find((status) => status.kind === 'exhaust');
    if (exhausted) {
      powerScaled *= Math.max(0.4, 1 - exhausted.magnitude);
    }
  }
  if (champSource && target.kind === 'monster') {
    powerScaled *= jungleMonsterDamageMult(champSource);
  }
  if (target.kind === 'champion') {
    const takenProfile = combatProfile(state, target);
    powerScaled *= takenProfile.damageTakenMult;
  }
  const scaledRaw =
    target.kind === 'champion' && via !== 'minion'
      ? powerScaled * CHAMPION_DAMAGE_SCALE
      : powerScaled;
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
  if (champSource) {
    champSource.damageDealt += dealt;
    if (target.kind === 'champion') {
      champSource.damageToChampions += dealt;
      noteThreat(
        target,
        champSource,
        dealt,
        state.scheduler.time,
        damageDrawsMinionCallForHelp(via),
      );
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
            champSource.position.x - structure.position.x,
            champSource.position.y - structure.position.y,
          );
          if (towerGap > structure.range) {
            continue;
          }
          structure.aggroTargetId = champSource.id;
          structure.aggroUntil = state.scheduler.time + 3.2;
        }
      }
      if (champSource.positionLabel === 'SUPPORT' && dealt > 0) {
        tryPaySharedRichesCombat(state, champSource, recorder);
      }
    }
  }
  if (target.kind === 'champion') {
    target.damageTaken += dealt;
    if (champSource) {
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
    payload: {
      raw,
      damageType,
      via,
      hpAfter: target.hp,
      minionRole: source?.kind === 'minion' ? source.role : undefined,
      minionSide: source?.kind === 'minion' ? source.side : undefined,
      monsterUnitKind: source?.kind === 'monster' ? source.unitKind : undefined,
      monsterCampId: source?.kind === 'monster' ? source.campId : undefined,
      dragonType: source?.kind === 'monster' ? source.dragonType : undefined,
      structureKind: source?.kind === 'structure' ? source.structureKind : undefined,
      structureSide: source?.kind === 'structure' ? source.side : undefined,
    },
  });
  if (target.hp <= 0) {
    if (target.kind === 'champion') {
      target.alive = false;
      handleChampionDeath(state, source, target, recorder, via);
    } else if (target.kind === 'minion') {
      target.alive = false;
      creditMinionKill(state, champSource, target, recorder, via);
    } else if (target.kind === 'monster') {
      finalizeMonsterKill(state, champSource, target, recorder);
    } else {
      target.alive = false;
    }
  }
  return dealt;
}

function handleChampionDeath(
  state: GameState,
  source: DamageSource,
  victim: ChampionEntity,
  recorder?: ReplayRecorder,
  via = 'auto',
): void {
  const environmental =
    via === 'tower' ||
    via === 'minion' ||
    via === 'monster' ||
    via === 'camp' ||
    via === 'fountain';
  const champSource = source?.kind === 'champion' ? source : null;
  const minionSource = source?.kind === 'minion' ? source : null;
  const monsterSource = source?.kind === 'monster' ? source : null;
  const structureSource = source?.kind === 'structure' ? source : null;
  let credited = resolveKiller(state, champSource, victim);
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
    noteAhriChampionTakedown(credited, t);
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
      noteAhriChampionTakedown(ally, t);
      assistIds.push(ally.playerId);
    }
  }
  recorder?.record(state, {
    type: 'death',
    actorId: victim.id,
    targetId: credited?.id,
    x: victim.position.x,
    y: victim.position.y,
    payload: {
      respawnAt: victim.respawnAt,
      assistPlayerIds: assistIds,
      via,
      minionRole: minionSource?.role,
      minionSide: minionSource?.side,
      monsterUnitKind: monsterSource?.unitKind,
      monsterCampId: monsterSource?.campId,
      dragonType: monsterSource?.dragonType,
      structureKind: structureSource?.structureKind,
      structureSide: structureSource?.side,
    },
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
