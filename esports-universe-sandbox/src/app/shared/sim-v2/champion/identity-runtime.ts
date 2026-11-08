import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import { identityPhasePower } from '../version/champion-identity';
import { getPatchStrength, patchMultiplier } from '../version/patch-strength';
import type { ChampionIdentity } from '../version/version-pack';

const FALLBACK_IDENTITY: ChampionIdentity = {
  laning: 55,
  skirmish: 55,
  teamfight: 55,
  closeout: 55,
  splitPush: 45,
  gankThreat: 45,
  objective: 50,
  waveClear: 50,
  mobility: 45,
  engage: 40,
  peel: 40,
  early: 55,
  mid: 60,
  late: 60,
};

export function championIdentity(state: GameState, champion: ChampionEntity): ChampionIdentity {
  return state.lockedPack.champions[champion.championId]?.identity ?? FALLBACK_IDENTITY;
}

export function combatPowerMult(state: GameState, champion: ChampionEntity): number {
  const identity = championIdentity(state, champion);
  const phase = identityPhasePower(identity, state.scheduler.time);
  const patch = getPatchStrength(state.lockedPack.patchStrength, champion.championId);
  const closeout =
    state.scheduler.time > 1200 ? 0.92 + identity.closeout / 400 : 0.96 + identity.closeout / 800;
  return phase * patchMultiplier(patch.power) * closeout;
}

export function axis01(identity: ChampionIdentity, key: keyof ChampionIdentity): number {
  return identity[key] / 100;
}
