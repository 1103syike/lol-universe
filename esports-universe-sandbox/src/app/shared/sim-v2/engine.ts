import type { MatchDraftReport } from '../sim/report';
import { runAiTick } from './ai/decision';
import { laneApproachOf, spawnChampion, type V2RosterPlayer } from './champion/spawn';
import { basicAttack, castAbility } from './combat/combat';
import { applyDamage } from './combat/damage';
import { tickStatuses } from './combat/executors';
import { tickPassiveGold, tickSupportItemIncome } from './economy/economy';
import { attackCamp, bootstrapCamps, nearestFriendlyCamp, tickMonsters } from './jungle/jungle-system';
import { orderMove, orderMoveOnLane, tickMovement } from './map/movement';
import { dist } from './map/pathfinding';
import type { LaneId } from './types/ids';
import { nearestEnemyMinionOnLane, spawnWave, tickMinions, tryLastHit } from './minion/lane-system';
import { waveIntervalSec } from './version/shared-content';
import {
  attackStructure,
  bootstrapStructures,
  canSiege,
  destroyStructureForSiege,
  nearestAttackableStructure,
  tickStructures,
  wavePressuringStructure,
} from './objectives/structures';
import { ReplayRecorder } from './replay/recorder';
import { createRng } from './rng';
import {
  createEmptyGameState,
  livingChampions,
  pushGoldSample,
  teamGold,
  type GameState,
} from './state/game-state';
import { lockVersion } from './version/registry';
import { updateVision } from './vision/vision';

export interface SimulateV2Input {
  matchId?: string;
  versionId: string;
  seed: string | number;
  blueTeamId: string;
  redTeamId: string;
  blue: readonly V2RosterPlayer[];
  red: readonly V2RosterPlayer[];
  maxDurationSec?: number;
  forceWinnerTeamId?: string;
  draft?: MatchDraftReport;
}

export interface SimulateV2Result {
  state: GameState;
  replay: ReturnType<ReplayRecorder['finish']>;
  draft: MatchDraftReport | null;
}

const GOLD_SAMPLE_INTERVAL_SEC = 15;

const AI_INTERVAL = 1;
const WORLD_DT = 0.5;

export function createMatch(input: SimulateV2Input): { state: GameState; recorder: ReplayRecorder } {
  const pack = lockVersion(input.versionId);
  const rng = createRng(input.seed);
  const matchId = input.matchId ?? `m_${String(input.seed)}`;
  const state = createEmptyGameState(
    matchId,
    pack,
    input.seed,
    rng,
    input.blueTeamId,
    input.redTeamId,
  );
  const recorder = new ReplayRecorder(
    matchId,
    pack.manifest.id,
    input.seed,
    input.blueTeamId,
    input.redTeamId,
  );

  for (const player of input.blue) {
    spawnChampion(state, 'blue', input.blueTeamId, player);
  }
  for (const player of input.red) {
    spawnChampion(state, 'red', input.redTeamId, player);
  }
  for (const champ of state.champions) {
    const target = laneApproachOf(champ.side, champ.positionLabel as V2RosterPlayer['position']);
    if (champ.positionLabel === 'JUNGLE') {
      orderMove(state, champ, target, recorder);
    } else {
      orderMoveOnLane(state, champ, champ.assignedLane as LaneId, target, recorder);
    }
  }
  bootstrapStructures(state);
  bootstrapCamps(state);

  const rules = pack.minions;
  state.scheduler.schedule(rules.firstSpawnSec, 'first_wave', () => {
    spawnWave(state, recorder);
    const scheduleNext = () => {
      const interval = waveIntervalSec(state.scheduler.time);
      state.scheduler.scheduleAfter(interval, 'wave', () => {
        if (state.ended) {
          return;
        }
        spawnWave(state, recorder);
        scheduleNext();
      });
    };
    scheduleNext();
  });

  return { state, recorder };
}

function fountainOf(state: GameState, side: 'blue' | 'red') {
  return side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
}

function tickFountainRegen(state: GameState, dt: number): void {
  for (const champion of state.champions) {
    if (!champion.alive) {
      continue;
    }
    const nearFountain = dist(champion.position, fountainOf(state, champion.side)) < 550;
    if (nearFountain) {
      if (champion.recallPhase === 'moving_home') {
        champion.recallPhase = 'at_base';
        champion.recallChannelUntil = 0;
        champion.moving = false;
        champion.path = [];
      }
      champion.hp = Math.min(champion.maxHp, champion.hp + champion.maxHp * 0.35 * dt);
      if (champion.maxMana > 1) {
        champion.mana = Math.min(champion.maxMana, champion.mana + champion.maxMana * 0.4 * dt);
      }
      continue;
    }
    const inCombat = state.champions.some(
      (enemy) =>
        enemy.alive &&
        enemy.side !== champion.side &&
        dist(champion.position, enemy.position) < champion.attackRange + 240,
    );
    if (!inCombat) {
      champion.hp = Math.min(champion.maxHp, champion.hp + champion.maxHp * 0.028 * dt);
    }
  }
}

function accumulateActivity(state: GameState, dt: number): void {
  for (const champion of state.champions) {
    if (!champion.alive) {
      continue;
    }
    if (champion.recallPhase === 'moving_home') {
      champion.activitySec.recallTravel += dt;
      continue;
    }
    if (champion.recallPhase === 'at_base') {
      champion.activitySec.recallBase += dt;
      continue;
    }
    if (
      champion.currentAction === 'fight' ||
      champion.currentAction === 'trade' ||
      champion.currentAction === 'gank' ||
      champion.currentAction === 'skirmish'
    ) {
      champion.activitySec.fight += dt;
      continue;
    }
    if (
      champion.positionLabel === 'JUNGLE' ||
      champion.currentAction === 'jungle' ||
      champion.currentAction === 'objective' ||
      champion.currentAction === 'path_camp' ||
      champion.currentAction === 'clear_camp'
    ) {
      champion.activitySec.jungle += dt;
      continue;
    }
    if (
      champion.currentAction === 'farm' ||
      champion.currentAction === 'lane' ||
      champion.currentAction === 'siege'
    ) {
      champion.activitySec.lane += dt;
      continue;
    }
    champion.activitySec.other += dt;
  }
}

function isCombatAction(action: string): boolean {
  return (
    action === 'fight' ||
    action === 'trade' ||
    action === 'gank' ||
    action === 'skirmish'
  );
}

function laneIdOfChampion(champion: { positionLabel: string }): 'top' | 'mid' | 'bot' {
  if (champion.positionLabel === 'TOP') {
    return 'top';
  }
  if (champion.positionLabel === 'BOT' || champion.positionLabel === 'SUPPORT') {
    return 'bot';
  }
  return 'mid';
}

function botLanePressure(
  state: GameState,
  champion: (typeof state.champions)[number],
  recorder: ReplayRecorder,
): void {
  if (champion.positionLabel !== 'BOT' || !champion.alive) {
    return;
  }
  if (
    champion.currentAction === 'dead' ||
    champion.currentAction === 'recall' ||
    champion.recallPhase !== 'none'
  ) {
    return;
  }
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  if (hpRatio < 0.28) {
    return;
  }
  let target: (typeof state.champions)[number] | null = null;
  let best = Number.POSITIVE_INFINITY;
  for (const enemy of state.champions) {
    if (!enemy.alive || enemy.side === champion.side) {
      continue;
    }
    if (enemy.positionLabel !== 'BOT' && enemy.positionLabel !== 'SUPPORT') {
      continue;
    }
    const d = dist(champion.position, enemy.position);
    if (d < best) {
      best = d;
      target = enemy;
    }
  }
  if (!target || best > 1600) {
    return;
  }
  if (state.rng() >= 0.16) {
    return;
  }
  const harass =
    champion.ad * (0.18 + champion.skills.mechanics / 420) + champion.level * 2.2 + 10;
  applyDamage(state, champion, target, harass, 'physical', recorder, 'lane_harass');
  if (best <= champion.attackRange + 60 && state.rng() < 0.28) {
    basicAttack(state, champion, target, recorder);
  }
  if (state.rng() < 0.14) {
    castAbility(state, champion, 'Q', target, recorder);
  }
}

function tickActiveCombat(state: GameState, recorder: ReplayRecorder): void {
  for (const champion of livingChampions(state)) {
    botLanePressure(state, champion, recorder);
    const fighting = isCombatAction(champion.currentAction);
    const hpRatio = champion.hp / Math.max(1, champion.maxHp);
    const farming = champion.currentAction === 'farm';
    const jungling =
      champion.currentAction === 'jungle' ||
      champion.currentAction === 'objective' ||
      champion.currentAction === 'clear' ||
      champion.currentAction === 'path_camp' ||
      champion.currentAction === 'clear_camp';
    const laning =
      hpRatio >= 0.45 &&
      (farming ||
        champion.currentAction === 'lane' ||
        champion.currentAction === 'siege');

    if (jungling || (champion.positionLabel === 'JUNGLE' && !fighting && hpRatio > 0.25)) {
      const camp = nearestFriendlyCamp(state, champion);
      if (camp && dist(champion.position, camp.position) <= champion.attackRange + 80) {
        attackCamp(state, champion, camp, recorder);
        if (state.rng() < 0.55) {
          castAbility(state, champion, 'Q', camp, recorder);
        }
        continue;
      }
      if (!fighting && !laning) {
        continue;
      }
    }

    if (!fighting && (farming || laning) && champion.positionLabel !== 'JUNGLE') {
      const laneId = laneIdOfChampion(champion);
      const minion = nearestEnemyMinionOnLane(state, champion, laneId);
      const canSupportFarm =
        champion.positionLabel !== 'SUPPORT' ||
        (farming && minion?.role === 'cannon');
      let lanePoke: (typeof state.champions)[number] | null = null;
      let lanePokeDist = Number.POSITIVE_INFINITY;
      for (const enemy of state.champions) {
        if (!enemy.alive || enemy.side === champion.side) {
          continue;
        }
        const enemyLane =
          enemy.positionLabel === 'TOP'
            ? 'top'
            : enemy.positionLabel === 'MID'
              ? 'mid'
              : enemy.positionLabel === 'BOT' || enemy.positionLabel === 'SUPPORT'
                ? 'bot'
                : null;
        if (enemyLane && enemyLane !== laneId) {
          continue;
        }
        const d = dist(champion.position, enemy.position);
        if (d < lanePokeDist) {
          lanePokeDist = d;
          lanePoke = enemy;
        }
      }
      const pokeRange =
        champion.attackRange +
        (champion.positionLabel === 'BOT' ? 320 : champion.positionLabel === 'TOP' ? 220 : 180);
      const spellRange =
        champion.positionLabel === 'BOT' ? 950 : champion.positionLabel === 'MID' ? 900 : 820;
      const canPoke = !!lanePoke && lanePokeDist <= pokeRange && hpRatio >= 0.32;
      const canSpellPoke =
        !!lanePoke && lanePokeDist <= spellRange && lanePokeDist > pokeRange && hpRatio >= 0.36;
      const pokeChance =
        champion.positionLabel === 'BOT'
          ? 0.34
          : champion.positionLabel === 'MID'
            ? 0.26
            : champion.positionLabel === 'TOP'
              ? 0.4
              : 0.22;
      if (canPoke && state.rng() < pokeChance) {
        basicAttack(state, champion, lanePoke!, recorder);
        if (state.rng() < (champion.positionLabel === 'BOT' ? 0.45 : 0.55)) {
          castAbility(state, champion, 'Q', lanePoke!, recorder);
        }
        if (state.rng() < (champion.positionLabel === 'BOT' ? 0.18 : 0.22)) {
          castAbility(state, champion, 'W', lanePoke!, recorder);
        }
        if (state.rng() < (champion.positionLabel === 'BOT' ? 0.12 : 0.14)) {
          castAbility(state, champion, 'E', lanePoke!, recorder);
        }
        continue;
      }
      if (canSpellPoke && state.rng() < pokeChance * 0.55) {
        castAbility(state, champion, 'Q', lanePoke!, recorder);
        if (state.rng() < 0.22) {
          castAbility(state, champion, 'W', lanePoke!, recorder);
        }
        if (state.rng() < 0.12) {
          castAbility(state, champion, 'E', lanePoke!, recorder);
        }
        continue;
      }
      if (
        champion.positionLabel === 'BOT' &&
        lanePoke &&
        lanePokeDist <= 1400 &&
        hpRatio >= 0.34 &&
        state.rng() < 0.14
      ) {
        const harass =
          champion.ad * (0.2 + champion.skills.mechanics / 380) + champion.level * 2.4 + 10;
        applyDamage(state, champion, lanePoke, harass, 'physical', recorder, 'lane_harass');
      }
      if (
        canSupportFarm &&
        minion &&
        dist(champion.position, minion.position) <= champion.attackRange + 70
      ) {
        tryLastHit(state, champion, minion, recorder);
        if (
          champion.positionLabel !== 'SUPPORT' &&
          minion.alive &&
          (farming || minion.hp > champion.ad * 1.15) &&
          state.rng() < 0.45
        ) {
          castAbility(state, champion, 'Q', minion, recorder);
        }
        if (canPoke && state.rng() < pokeChance * 0.9) {
          basicAttack(state, champion, lanePoke!, recorder);
          if (state.rng() < 0.55) {
            castAbility(state, champion, 'Q', lanePoke!, recorder);
          }
        } else if (canSpellPoke && state.rng() < pokeChance * 0.55) {
          castAbility(state, champion, 'Q', lanePoke!, recorder);
        }
        continue;
      }
    }

    if (!fighting && !laning) {
      continue;
    }
    let target = null as (typeof state.champions)[number] | null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const enemy of state.champions) {
      if (!enemy.alive || enemy.side === champion.side) {
        continue;
      }
      const d = dist(champion.position, enemy.position);
      if (d < bestDist) {
        bestDist = d;
        target = enemy;
      }
    }
    const engageRange = fighting
      ? champion.attackRange + 160
      : champion.attackRange + 90;
    if (!target || bestDist > engageRange) {
      continue;
    }
    basicAttack(state, champion, target, recorder);
    if (champion.positionLabel === 'SUPPORT') {
      const partner = state.champions.find(
        (ally) =>
          ally.alive &&
          ally.side === champion.side &&
          ally.positionLabel === 'BOT' &&
          dist(champion.position, ally.position) < 1100,
      );
      if (partner) {
        castAbility(state, champion, 'W', partner, recorder);
        castAbility(state, champion, 'E', partner, recorder);
      }
      if (fighting && state.rng() < 0.45) {
        castAbility(state, champion, 'Q', target, recorder);
      }
      continue;
    }
    if (fighting || state.rng() < 0.55) {
      castAbility(state, champion, 'Q', target, recorder);
    }
    if (fighting || state.rng() < 0.4) {
      castAbility(state, champion, 'E', target, recorder);
    }
    if (fighting && state.rng() < 0.35) {
      castAbility(state, champion, 'W', target, recorder);
    }
    if (champion.level >= 6 && fighting && state.rng() < 0.28) {
      castAbility(state, champion, 'R', target, recorder);
    }
  }
}

function tickWorld(state: GameState, dt: number, recorder: ReplayRecorder): void {
  tickStatuses(state, dt);
  for (const champion of state.champions) {
    if (!champion.alive || champion.maxMana <= 1) {
      continue;
    }
    champion.mana = Math.min(champion.maxMana, champion.mana + 4 * dt);
  }
  tickFountainRegen(state, dt);
  tickMovement(state, dt, recorder);
  tickActiveCombat(state, recorder);
  tickMinions(state, dt, recorder);
  tickMonsters(state, recorder);
  tickStructures(state, recorder);
  tickPassiveGold(state, dt, recorder);
  tickSupportItemIncome(state, dt, recorder);
  accumulateActivity(state, dt);
  updateVision(state);
}

function livingStructureCount(state: GameState, side: 'blue' | 'red'): number {
  return state.structures.filter((structure) => structure.alive && structure.side === side).length;
}

function ensureSiegeMomentum(state: GameState): void {
  const blueCount = livingStructureCount(state, 'blue');
  const redCount = livingStructureCount(state, 'red');
  const leaderSide =
    blueCount === redCount
      ? teamGold(state, 'blue') >= teamGold(state, 'red')
        ? 'blue'
        : 'red'
      : blueCount < redCount
        ? 'red'
        : 'blue';
  const leader = leaderSide === 'blue' ? state.blue : state.red;
  if (!leader.hasBaron) {
    leader.hasBaron = true;
  }
}

function finishOpenNexus(state: GameState, recorder: ReplayRecorder): boolean {
  for (const champ of livingChampions(state)) {
    const nexus = state.structures.find(
      (structure) =>
        structure.alive &&
        structure.side !== champ.side &&
        structure.structureKind === 'nexus' &&
        canSiege(state, structure),
    );
    if (!nexus) {
      continue;
    }
    destroyStructureForSiege(state, nexus, champ, recorder);
    return state.ended;
  }
  return false;
}

export function simulateV2Match(input: SimulateV2Input): SimulateV2Result {
  const { state, recorder } = createMatch(input);
  const maxDuration = input.maxDurationSec ?? 2700;
  const safetyCap = Math.max(maxDuration + 600, 3600);
  let nextAi = 0;
  let nextSample = GOLD_SAMPLE_INTERVAL_SEC;
  let nextSnapshot = 1;
  let momentumArmed = false;
  pushGoldSample(state);

  while (!state.ended && state.scheduler.time < safetyCap) {
    const now = state.scheduler.time;
    const nextEventT = state.scheduler.peek()?.t ?? Number.POSITIVE_INFINITY;
    const target = Math.min(now + WORLD_DT, nextAi, nextSample, nextSnapshot, nextEventT, safetyCap);
    const dt = target - now;
    if (dt > 0) {
      tickWorld(state, dt, recorder);
      state.scheduler.setTime(target);
    }

    while (state.scheduler.peek() && state.scheduler.peek()!.t <= state.scheduler.time + 1e-9) {
      state.scheduler.step();
      if (state.ended) {
        break;
      }
    }

    if (!state.ended && state.scheduler.time + 1e-9 >= nextAi) {
      runAiTick(state, recorder);
      nextAi = state.scheduler.time + AI_INTERVAL;
    }
    if (!state.ended && state.scheduler.time + 1e-9 >= nextSample) {
      pushGoldSample(state);
      for (const champion of state.champions) {
        champion.levelSamples.push({ t: state.scheduler.time, level: champion.level });
      }
      nextSample = state.scheduler.time + GOLD_SAMPLE_INTERVAL_SEC;
    }
    if (!state.ended && state.scheduler.time + 1e-9 >= nextSnapshot) {
      recorder.snapshot(state);
      nextSnapshot = state.scheduler.time + 1;
    }

    if (!state.ended && state.scheduler.time >= 480) {
      for (const champ of livingChampions(state)) {
        const structure = nearestAttackableStructure(state, champ);
        if (!structure) {
          continue;
        }
        const pressured = wavePressuringStructure(state, champ.side, structure);
        const close = dist(champ.position, structure.position) < champ.attackRange + 160;
        if ((pressured && close) || (state.scheduler.time > 1200 && close && pressured)) {
          attackStructure(state, champ, structure, recorder);
        }
      }
    }

    if (!state.ended && !momentumArmed && state.scheduler.time >= maxDuration) {
      momentumArmed = true;
      ensureSiegeMomentum(state);
    }

    if (!state.ended && state.scheduler.time >= safetyCap - 1) {
      finishOpenNexus(state, recorder);
    }

    if (dt <= 0 && !state.scheduler.peek()) {
      state.scheduler.setTime(Math.min(safetyCap, now + WORLD_DT));
    }
  }

  if (!state.ended) {
    finishOpenNexus(state, recorder);
  }
  if (input.forceWinnerTeamId) {
    state.winnerTeamId = input.forceWinnerTeamId;
  }
  pushGoldSample(state);
  recorder.snapshot(state);
  const replay = recorder.finish(state.winnerTeamId);
  return { state, replay, draft: input.draft ?? null };
}
