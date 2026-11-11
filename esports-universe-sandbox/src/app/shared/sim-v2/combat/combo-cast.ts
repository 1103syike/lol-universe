import { SUMMONER_SPELLS } from '../../../core/data/summoner-spells';
import { dist } from '../map/pathfinding';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MonsterEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import {
  aatroxState,
  ahriState,
  akaliState,
  annieState,
  ezrealState,
  kassadinState,
  leblancState,
  leeSinState,
  pruneSyndraSpheres,
} from './ability-runtime-state';
import { castAbility } from './cast-ability';
import { AATROX_Q_INTER_CAST_SEC, AATROX_SWEET_GAP } from './combo-champions';
import { castFlash, hasSummoner, summonerReady } from './summoner-spells';

type CombatTarget = ChampionEntity | MonsterEntity;

function abilityReady(
  champion: ChampionEntity,
  slot: 'Q' | 'W' | 'E' | 'R',
  now: number,
): boolean {
  const runtime = champion.abilities.find((ability) => ability.slot === slot);
  return !!runtime && runtime.level > 0 && now >= runtime.cooldownUntil;
}

function abilityRange(state: GameState, champion: ChampionEntity, slot: string): number {
  const def = state.lockedPack.champions[champion.championId]?.abilities.find(
    (ability) => ability.slot === slot,
  );
  return def?.range ?? 600;
}

function scheduleFollowUp(
  state: GameState,
  delaySec: number,
  kind: string,
  handler: () => void,
): void {
  const casterAliveId = kind;
  void casterAliveId;
  state.scheduler.scheduleAfter(delaySec, kind, () => {
    if (state.ended) {
      return;
    }
    handler();
  });
}

function castAnnieCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const pyro = annieState(caster).pyromania;
  const gap = dist(caster.position, target.position);
  const rRange = abilityRange(state, caster, 'R');
  const flashRange = SUMMONER_SPELLS.Flash.range;
  const canFlashR =
    target.kind === 'champion' &&
    abilityReady(caster, 'R', now) &&
    hasSummoner(caster, 'Flash') &&
    !!summonerReady(state, caster, 'Flash') &&
    gap > rRange + 40 &&
    gap <= rRange + flashRange - 40;

  if (canFlashR && (pyro >= 3 || target.hp / Math.max(1, target.maxHp) < 0.45)) {
    castFlash(state, caster, target.position, recorder);
    castAbility(state, caster, 'R', target, recorder);
    return true;
  }

  if (abilityReady(caster, 'Q', now)) {
    castAbility(state, caster, 'Q', target, recorder);
  }
  if (abilityReady(caster, 'W', now)) {
    castAbility(state, caster, 'W', target, recorder);
  }
  if (abilityReady(caster, 'E', now)) {
    castAbility(state, caster, 'E', caster, recorder);
  }
  if (
    abilityReady(caster, 'R', now) &&
    (annieState(caster).pyromania >= 3 ||
      target.hp / Math.max(1, target.maxHp) < 0.4)
  ) {
    castAbility(state, caster, 'R', target, recorder);
  }
  return true;
}

function castLeeSinCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const lee = leeSinState(caster);
  const gap = dist(caster.position, target.position);
  const flashReady =
    hasSummoner(caster, 'Flash') && !!summonerReady(state, caster, 'Flash');
  const rReady = abilityReady(caster, 'R', now);
  const qMarked =
    lee.qIsRecast &&
    lee.qMarkTargetId === target.id &&
    lee.qMarkUntil > now;

  if (qMarked && abilityReady(caster, 'Q', now)) {
    castAbility(state, caster, 'Q', target, recorder);
  } else if (abilityReady(caster, 'Q', now) && gap <= abilityRange(state, caster, 'Q') + 40) {
    castAbility(state, caster, 'Q', target, recorder);
    const markTargetId = target.id;
    scheduleFollowUp(state, 0.45, `lee:q2:${caster.id}`, () => {
      const self = state.champions.find((champ) => champ.id === caster.id);
      const marked = state.champions.find((champ) => champ.id === markTargetId);
      const monster = state.monsters.find((unit) => unit.id === markTargetId);
      if (!self?.alive) {
        return;
      }
      const follow = marked?.alive ? marked : monster?.alive ? monster : null;
      const bag = leeSinState(self);
      if (
        !follow ||
        !bag.qIsRecast ||
        bag.qMarkTargetId !== markTargetId ||
        bag.qMarkUntil <= state.scheduler.time
      ) {
        return;
      }
      castAbility(state, self, 'Q', follow, recorder);
    });
  }

  if (abilityReady(caster, 'E', now)) {
    castAbility(state, caster, 'E', target, recorder);
  }
  const wantClearTempo =
    target.kind === 'monster' || caster.hp / Math.max(1, caster.maxHp) < 0.75;
  if (abilityReady(caster, 'W', now) && wantClearTempo) {
    castAbility(state, caster, 'W', caster, recorder);
  }

  if (target.kind === 'champion' && rReady) {
    const alliesBehind = state.champions.some((ally) => {
      if (!ally.alive || ally.side !== caster.side || ally.id === caster.id) {
        return false;
      }
      const toTarget = {
        x: target.position.x - caster.position.x,
        y: target.position.y - caster.position.y,
      };
      const toAlly = {
        x: ally.position.x - target.position.x,
        y: ally.position.y - target.position.y,
      };
      const dot = toTarget.x * toAlly.x + toTarget.y * toAlly.y;
      return dist(ally.position, target.position) < 1400 && dot > 0;
    });
    const wantInsec =
      flashReady &&
      (alliesBehind || target.hp / Math.max(1, target.maxHp) < 0.35) &&
      gap < SUMMONER_SPELLS.Flash.range + 250;

    if (wantInsec) {
      const dx = target.position.x - caster.position.x;
      const dy = target.position.y - caster.position.y;
      const len = Math.hypot(dx, dy) || 1;
      const beyond = {
        x: target.position.x + (dx / len) * 120,
        y: target.position.y + (dy / len) * 120,
      };
      castFlash(state, caster, beyond, recorder);
      castAbility(state, caster, 'R', target, recorder);
      return true;
    }

    if (gap <= abilityRange(state, caster, 'R') + 60) {
      castAbility(state, caster, 'R', target, recorder);
      if (flashReady && leeSinState(caster).rFlashArmedUntil > now) {
        const dx = target.position.x - caster.position.x;
        const dy = target.position.y - caster.position.y;
        const len = Math.hypot(dx, dy) || 1;
        castFlash(
          state,
          caster,
          {
            x: caster.position.x + (dx / len) * SUMMONER_SPELLS.Flash.range,
            y: caster.position.y + (dy / len) * SUMMONER_SPELLS.Flash.range,
          },
          recorder,
        );
      }
    }
  }
  return true;
}

function castSyndraCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const spheres = pruneSyndraSpheres(caster, now);
  if (abilityReady(caster, 'Q', now)) {
    castAbility(state, caster, 'Q', target, recorder);
  }
  const afterQ = pruneSyndraSpheres(caster, state.scheduler.time).length;
  if (afterQ > 0 && abilityReady(caster, 'W', now)) {
    castAbility(state, caster, 'W', target, recorder);
  }
  if (
    target.kind === 'champion' &&
    abilityReady(caster, 'E', now) &&
    (afterQ > 0 || spheres.length > 0)
  ) {
    castAbility(state, caster, 'E', target, recorder);
  } else if (target.kind === 'champion' && abilityReady(caster, 'E', now)) {
    scheduleFollowUp(state, 0.2, `syndra:qe:${caster.id}`, () => {
      const self = state.champions.find((champ) => champ.id === caster.id);
      if (!self?.alive || !target.alive) {
        return;
      }
      if (pruneSyndraSpheres(self, state.scheduler.time).length === 0) {
        return;
      }
      castAbility(state, self, 'E', target, recorder);
    });
  }
  if (
    target.kind === 'champion' &&
    abilityReady(caster, 'R', now) &&
    (pruneSyndraSpheres(caster, state.scheduler.time).length >= 1 ||
      target.hp / Math.max(1, target.maxHp) < 0.35)
  ) {
    castAbility(state, caster, 'R', target, recorder);
  }
  return true;
}

function aatroxHasSweetAngle(
  caster: ChampionEntity,
  target: CombatTarget,
  now: number,
): boolean {
  const bag = aatroxState(caster);
  if (bag.sweetUntil > now) {
    return true;
  }
  const gap = dist(caster.position, target.position);
  return gap >= 250 && gap <= 480;
}

function aatroxShouldOpenR(
  caster: ChampionEntity,
  target: CombatTarget,
  now: number,
): boolean {
  if (target.kind !== 'champion' || !abilityReady(caster, 'R', now)) {
    return false;
  }
  if (aatroxState(caster).rUntil > now) {
    return false;
  }
  const myHp = caster.hp / Math.max(1, caster.maxHp);
  const theirHp = target.hp / Math.max(1, target.maxHp);
  const gap = dist(caster.position, target.position);
  if (theirHp <= 0.5 && gap <= 650) {
    return true;
  }
  if (myHp <= 0.42 && theirHp <= 0.75 && gap <= 550) {
    return true;
  }
  if (theirHp <= 0.65 && myHp >= 0.55 && gap <= 500 && abilityReady(caster, 'Q', now)) {
    return true;
  }
  return false;
}

function aatroxShouldW(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  now: number,
): boolean {
  if (target.kind !== 'champion' || !abilityReady(caster, 'W', now)) {
    return false;
  }
  const gap = dist(caster.position, target.position);
  const wRange = abilityRange(state, caster, 'W');
  if (gap > wRange + 20) {
    return false;
  }
  const bag = aatroxState(caster);
  if (bag.wTetherTargetId === target.id && bag.wTetherUntil > now) {
    return false;
  }
  const theirHp = target.hp / Math.max(1, target.maxHp);
  if (bag.qStage >= 1) {
    return true;
  }
  if (theirHp <= 0.7 && gap <= 520) {
    return true;
  }
  if (target.statuses.some((status) => status.kind === 'stun' || status.kind === 'slow')) {
    return true;
  }
  return gap >= 280 && gap <= 520 && abilityReady(caster, 'Q', now);
}

function aatroxSetupSweet(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  now: number,
  recorder?: ReplayRecorder,
): boolean {
  if (!abilityReady(caster, 'E', now)) {
    return false;
  }
  if (aatroxHasSweetAngle(caster, target, now)) {
    const gap = dist(caster.position, target.position);
    if (gap >= 250 && gap <= 400) {
      return false;
    }
  }
  return castAbility(state, caster, 'E', target, recorder);
}

function scheduleAatroxQFollowUp(
  state: GameState,
  casterId: string,
  target: CombatTarget,
  stageAfter: number,
  recorder?: ReplayRecorder,
): void {
  if (stageAfter !== 1 && stageAfter !== 2) {
    return;
  }
  scheduleFollowUp(
    state,
    AATROX_Q_INTER_CAST_SEC + 0.08,
    `aatrox:q:${casterId}:${stageAfter}`,
    () => {
      const self = state.champions.find((champ) => champ.id === casterId);
      if (!self?.alive || !target.alive) {
        return;
      }
      const bag = aatroxState(self);
      const now = state.scheduler.time;
      if (bag.qStage === 0 || bag.qWindowUntil <= now || !abilityReady(self, 'Q', now)) {
        return;
      }
      aatroxSetupSweet(state, self, target, now, recorder);
      if (
        target.kind === 'champion' &&
        aatroxShouldW(state, self, target, now) &&
        stageAfter === 1
      ) {
        castAbility(state, self, 'W', target, recorder);
      }
      castAbility(state, self, 'Q', target, recorder);
      scheduleAatroxQFollowUp(state, self.id, target, aatroxState(self).qStage, recorder);
    },
  );
}

function castAatroxCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const bag = aatroxState(caster);
  if (bag.qWindowUntil > 0 && now > bag.qWindowUntil) {
    bag.qStage = 0;
    bag.qWindowUntil = 0;
  }

  const gap = dist(caster.position, target.position);
  const inQChain = bag.qStage === 1 || bag.qStage === 2;

  if (aatroxShouldOpenR(caster, target, now)) {
    castAbility(state, caster, 'R', null, recorder);
  }

  if (inQChain && abilityReady(caster, 'Q', now)) {
    aatroxSetupSweet(state, caster, target, now, recorder);
    castAbility(state, caster, 'Q', target, recorder);
    scheduleAatroxQFollowUp(state, caster.id, target, aatroxState(caster).qStage, recorder);
    return true;
  }

  if (aatroxShouldW(state, caster, target, now) && gap <= AATROX_SWEET_GAP + 220) {
    castAbility(state, caster, 'W', target, recorder);
  }

  const needGapClose = gap > 480 && gap <= 780;
  const wantSweetOpen = target.kind === 'champion' && gap >= 200 && gap <= 700;
  if (
    abilityReady(caster, 'E', now) &&
    (needGapClose || (wantSweetOpen && !aatroxHasSweetAngle(caster, target, now)))
  ) {
    castAbility(state, caster, 'E', target, recorder);
  }

  if (abilityReady(caster, 'Q', now) && gap <= 620) {
    if (!aatroxHasSweetAngle(caster, target, now)) {
      aatroxSetupSweet(state, caster, target, now, recorder);
    }
    castAbility(state, caster, 'Q', target, recorder);
    scheduleAatroxQFollowUp(state, caster.id, target, aatroxState(caster).qStage, recorder);
  }

  return true;
}

function ahriIsCharmed(target: CombatTarget): boolean {
  if (target.kind !== 'champion') {
    return false;
  }
  return target.statuses.some((status) => status.id === 'ahri:e:charm');
}

function ahriShouldOpenR(
  caster: ChampionEntity,
  target: CombatTarget,
  now: number,
  gap: number,
): boolean {
  const bag = ahriState(caster);
  if (bag.rWindowUntil > now && bag.rChargesLeft > 0) {
    return true;
  }
  if (!abilityReady(caster, 'R', now)) {
    return false;
  }
  if (target.kind !== 'champion') {
    return gap <= 650;
  }
  const targetHp = target.hp / Math.max(1, target.maxHp);
  const selfHp = caster.hp / Math.max(1, caster.maxHp);
  if (ahriIsCharmed(target)) {
    return true;
  }
  if (targetHp <= 0.45) {
    return true;
  }
  if (selfHp <= 0.35 && gap <= 700) {
    return true;
  }
  return false;
}

function scheduleAhriRFollowUp(
  state: GameState,
  casterId: string,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): void {
  const targetId = target.id;
  scheduleFollowUp(state, 1.05, `ahri:r:${casterId}`, () => {
    const self = state.champions.find((champ) => champ.id === casterId);
    const victim =
      state.champions.find((champ) => champ.id === targetId) ??
      state.monsters.find((monster) => monster.id === targetId);
    if (!self?.alive || !victim || ('alive' in victim && !victim.alive)) {
      return;
    }
    const bag = ahriState(self);
    const now = state.scheduler.time;
    if (bag.rWindowUntil <= now || bag.rChargesLeft <= 0) {
      return;
    }
    if (!abilityReady(self, 'R', now)) {
      return;
    }
    const gap = dist(self.position, victim.position);
    if (gap > 900) {
      return;
    }
    castAbility(state, self, 'R', victim, recorder);
    if (ahriState(self).rChargesLeft > 0) {
      scheduleAhriRFollowUp(state, casterId, victim, recorder);
    }
  });
}

function castAhriCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const bag = ahriState(caster);
  if (bag.rWindowUntil > 0 && now > bag.rWindowUntil) {
    bag.rChargesLeft = 0;
    bag.rWindowUntil = 0;
  }

  const gap = dist(caster.position, target.position);
  const eRange = Math.max(900, abilityRange(state, caster, 'E'));
  const qRange = Math.max(900, abilityRange(state, caster, 'Q'));

  if (abilityReady(caster, 'E', now) && target.kind === 'champion' && gap <= eRange) {
    castAbility(state, caster, 'E', target, recorder);
  }

  if (abilityReady(caster, 'W', now) && gap <= 725) {
    castAbility(state, caster, 'W', target, recorder);
  }

  if (abilityReady(caster, 'Q', now) && gap <= qRange) {
    castAbility(state, caster, 'Q', target, recorder);
  }

  if (ahriShouldOpenR(caster, target, now, gap) && gap <= 900) {
    castAbility(state, caster, 'R', target, recorder);
    if (ahriState(caster).rChargesLeft > 0) {
      scheduleAhriRFollowUp(state, caster.id, target, recorder);
    }
  }

  return true;
}

function castAkaliCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const bag = akaliState(caster);
  const gap = dist(caster.position, target.position);
  if (bag.eMarkedTargetId === target.id && bag.eMarkedUntil > now && abilityReady(caster, 'E', now)) {
    castAbility(state, caster, 'E', target, recorder);
  }
  if (abilityReady(caster, 'Q', now) && gap <= 600) {
    castAbility(state, caster, 'Q', target, recorder);
  }
  if (abilityReady(caster, 'E', now) && gap <= 700) {
    castAbility(state, caster, 'E', target, recorder);
  }
  if (
    abilityReady(caster, 'R', now) &&
    target.kind === 'champion' &&
    (bag.rStage === 1 || target.hp / Math.max(1, target.maxHp) < 0.5 || gap <= 550)
  ) {
    castAbility(state, caster, 'R', target, recorder);
  }
  return true;
}

function castLeblancCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const gap = dist(caster.position, target.position);
  if (abilityReady(caster, 'W', now) && gap > 350 && gap <= 700) {
    castAbility(state, caster, 'W', target, recorder);
  }
  if (abilityReady(caster, 'Q', now) && gap <= 700) {
    castAbility(state, caster, 'Q', target, recorder);
  }
  if (abilityReady(caster, 'E', now) && gap <= 800 && target.kind === 'champion') {
    castAbility(state, caster, 'E', target, recorder);
  }
  if (
    abilityReady(caster, 'R', now) &&
    target.kind === 'champion' &&
    (leblancState(caster).markUntil > now || target.hp / Math.max(1, target.maxHp) < 0.55)
  ) {
    castAbility(state, caster, 'R', target, recorder);
  }
  return true;
}

function castKassadinCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const gap = dist(caster.position, target.position);
  if (abilityReady(caster, 'Q', now) && gap <= 650) {
    castAbility(state, caster, 'Q', target, recorder);
  }
  if (abilityReady(caster, 'E', now) && gap <= 650) {
    castAbility(state, caster, 'E', target, recorder);
  }
  if (abilityReady(caster, 'W', now) && gap <= 350) {
    castAbility(state, caster, 'W', target, recorder);
  }
  if (abilityReady(caster, 'R', now) && gap <= 700) {
    const stacks = kassadinState(caster).rStacks;
    if (stacks > 0 || target.hp / Math.max(1, target.maxHp) < 0.6 || gap > 400) {
      castAbility(state, caster, 'R', target, recorder);
    }
  }
  return true;
}

function castEkkoCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const gap = dist(caster.position, target.position);
  const selfHp = caster.hp / Math.max(1, caster.maxHp);
  if (abilityReady(caster, 'W', now) && gap <= 700 && target.kind === 'champion') {
    castAbility(state, caster, 'W', target, recorder);
  }
  if (abilityReady(caster, 'Q', now) && gap <= 900) {
    castAbility(state, caster, 'Q', target, recorder);
  }
  if (abilityReady(caster, 'E', now) && gap <= 550) {
    castAbility(state, caster, 'E', target, recorder);
  }
  if (abilityReady(caster, 'R', now) && (selfHp < 0.4 || target.hp / Math.max(1, target.maxHp) < 0.35)) {
    castAbility(state, caster, 'R', target, recorder);
  }
  return true;
}

function castPykeCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const gap = dist(caster.position, target.position);
  if (abilityReady(caster, 'Q', now) && gap <= 750 && target.kind === 'champion') {
    castAbility(state, caster, 'Q', target, recorder);
  }
  if (abilityReady(caster, 'E', now) && gap <= 600) {
    castAbility(state, caster, 'E', target, recorder);
  }
  if (abilityReady(caster, 'W', now)) {
    castAbility(state, caster, 'W', target, recorder);
  }
  if (
    abilityReady(caster, 'R', now) &&
    target.kind === 'champion' &&
    target.hp / Math.max(1, target.maxHp) < 0.35
  ) {
    castAbility(state, caster, 'R', target, recorder);
  }
  return true;
}

function castEzrealCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const now = state.scheduler.time;
  const gap = dist(caster.position, target.position);
  const pokeRange = Math.max(1100, abilityRange(state, caster, 'Q'));
  const hasMark = () =>
    ezrealState(caster).wMarkTargetId === target.id && ezrealState(caster).wMarkUntil > state.scheduler.time;

  if (
    abilityReady(caster, 'W', now) &&
    !hasMark() &&
    target.kind === 'champion' &&
    gap <= pokeRange
  ) {
    castAbility(state, caster, 'W', target, recorder);
  }

  if (abilityReady(caster, 'E', now) && (gap > 550 || hasMark()) && gap <= 900) {
    castAbility(state, caster, 'E', target, recorder);
  }

  if (abilityReady(caster, 'Q', now) && gap <= pokeRange) {
    castAbility(state, caster, 'Q', target, recorder);
  }

  const fightGap = dist(caster.position, target.position);
  const targetHp = target.hp / Math.max(1, target.maxHp);
  if (
    abilityReady(caster, 'R', state.scheduler.time) &&
    target.kind === 'champion' &&
    (targetHp < 0.35 || fightGap >= 1200)
  ) {
    castAbility(state, caster, 'R', target, recorder);
  }

  return true;
}

const COMBO_CASTERS: Record<
  string,
  (
    state: GameState,
    caster: ChampionEntity,
    target: CombatTarget,
    recorder?: ReplayRecorder,
  ) => boolean
> = {
  Annie: castAnnieCombo,
  LeeSin: castLeeSinCombo,
  Syndra: castSyndraCombo,
  Aatrox: castAatroxCombo,
  Ahri: castAhriCombo,
  Akali: castAkaliCombo,
  Leblanc: castLeblancCombo,
  Kassadin: castKassadinCombo,
  Ekko: castEkkoCombo,
  Pyke: castPykeCombo,
  Ezreal: castEzrealCombo,
};

export function castChampionCombo(
  state: GameState,
  caster: ChampionEntity,
  target: CombatTarget,
  recorder?: ReplayRecorder,
): boolean {
  const casterFn = COMBO_CASTERS[caster.championId];
  if (!casterFn) {
    return false;
  }
  return casterFn(state, caster, target, recorder);
}

export function hasChampionCombo(championId: string): boolean {
  return championId in COMBO_CASTERS;
}
