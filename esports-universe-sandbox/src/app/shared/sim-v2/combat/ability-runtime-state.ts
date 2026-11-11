import type {
  AatroxAbilityBag,
  AhriAbilityBag,
  AkaliAbilityBag,
  AniviaAbilityBag,
  AnnieAbilityBag,
  CamilleAbilityBag,
  ChampionEntity,
  EkkoAbilityBag,
  EzrealAbilityBag,
  KassadinAbilityBag,
  LeblancAbilityBag,
  LeeSinAbilityBag,
  SyndraAbilityBag,
  SyndraSphere,
} from '../state/entities';

export function leeSinState(champion: ChampionEntity): LeeSinAbilityBag {
  if (!champion.abilityBag.leeSin) {
    champion.abilityBag.leeSin = {
      qMarkTargetId: null,
      qMarkUntil: 0,
      qIsRecast: false,
      rFlashArmedUntil: 0,
    };
  }
  return champion.abilityBag.leeSin;
}

export function annieState(champion: ChampionEntity): AnnieAbilityBag {
  if (!champion.abilityBag.annie) {
    champion.abilityBag.annie = { pyromania: 0 };
  }
  return champion.abilityBag.annie;
}

export function syndraState(champion: ChampionEntity): SyndraAbilityBag {
  if (!champion.abilityBag.syndra) {
    champion.abilityBag.syndra = { spheres: [], nextSphereId: 1 };
  }
  return champion.abilityBag.syndra;
}

export function aatroxState(champion: ChampionEntity): AatroxAbilityBag {
  if (!champion.abilityBag.aatrox) {
    champion.abilityBag.aatrox = {
      qStage: 0,
      qWindowUntil: 0,
      sweetUntil: 0,
      wTetherTargetId: null,
      wTetherUntil: 0,
      wAnchorX: 0,
      wAnchorY: 0,
      rUntil: 0,
      rHealMult: 1,
      passiveReadyAt: 0,
    };
  } else {
    const bag = champion.abilityBag.aatrox;
    bag.sweetUntil ??= 0;
    bag.wTetherTargetId ??= null;
    bag.wTetherUntil ??= 0;
    bag.wAnchorX ??= 0;
    bag.wAnchorY ??= 0;
    bag.rUntil ??= 0;
    bag.rHealMult ??= 1;
    bag.passiveReadyAt ??= 0;
  }
  return champion.abilityBag.aatrox;
}

export function camilleState(champion: ChampionEntity): CamilleAbilityBag {
  if (!champion.abilityBag.camille) {
    champion.abilityBag.camille = { qEmpoweredUntil: 0 };
  }
  return champion.abilityBag.camille;
}

export function akaliState(champion: ChampionEntity): AkaliAbilityBag {
  if (!champion.abilityBag.akali) {
    champion.abilityBag.akali = {
      eMarkedTargetId: null,
      eMarkedUntil: 0,
      rStage: 0,
      rWindowUntil: 0,
    };
  }
  return champion.abilityBag.akali;
}

export function aniviaState(champion: ChampionEntity): AniviaAbilityBag {
  if (!champion.abilityBag.anivia) {
    champion.abilityBag.anivia = { chilledTargetId: null, chilledUntil: 0 };
  }
  return champion.abilityBag.anivia;
}

export function ahriState(champion: ChampionEntity): AhriAbilityBag {
  if (!champion.abilityBag.ahri) {
    champion.abilityBag.ahri = {
      essenceStacks: 0,
      rChargesLeft: 0,
      rWindowUntil: 0,
    };
  }
  return champion.abilityBag.ahri;
}

export function leblancState(champion: ChampionEntity): LeblancAbilityBag {
  if (!champion.abilityBag.leblanc) {
    champion.abilityBag.leblanc = { markTargetId: null, markUntil: 0 };
  }
  return champion.abilityBag.leblanc;
}

export function kassadinState(champion: ChampionEntity): KassadinAbilityBag {
  if (!champion.abilityBag.kassadin) {
    champion.abilityBag.kassadin = { rStacks: 0, rStackUntil: 0 };
  }
  return champion.abilityBag.kassadin;
}

export function ekkoState(champion: ChampionEntity): EkkoAbilityBag {
  if (!champion.abilityBag.ekko) {
    champion.abilityBag.ekko = { wSlowUntil: 0 };
  }
  return champion.abilityBag.ekko;
}

export function ezrealState(champion: ChampionEntity): EzrealAbilityBag {
  if (!champion.abilityBag.ezreal) {
    champion.abilityBag.ezreal = {
      wMarkTargetId: null,
      wMarkUntil: 0,
      passiveStacks: 0,
      passiveUntil: 0,
    };
  }
  return champion.abilityBag.ezreal;
}

export function pruneSyndraSpheres(champion: ChampionEntity, now: number): SyndraSphere[] {
  const state = syndraState(champion);
  state.spheres = state.spheres.filter((sphere) => sphere.expiresAt > now);
  return state.spheres;
}

export function clearLeeSinMark(champion: ChampionEntity): void {
  const state = leeSinState(champion);
  state.qMarkTargetId = null;
  state.qMarkUntil = 0;
  state.qIsRecast = false;
}
