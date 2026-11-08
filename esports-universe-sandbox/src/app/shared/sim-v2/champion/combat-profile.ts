import { CHAMPION_KITS, type ChampionCombatClass, type ChampionKit } from '../../../core/data/champion-kits';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { TeamSide } from '../types/ids';
import { axis01, championIdentity } from './identity-runtime';

export interface TeamCombatStyle {
  poke: number;
  engage: number;
  peel: number;
  frontline: number;
  carryCount: number;
}

export interface CombatProfile {
  damageDealtMult: number;
  damageTakenMult: number;
  autoMult: number;
  pokeAppetite: number;
  allInAppetite: number;
  disengageHp: number;
  farmContest: number;
}

const CLASS_DAMAGE: Record<ChampionCombatClass, number> = {
  marksman: 1.55,
  mage: 1.35,
  assassin: 1.22,
  fighter: 1.32,
  tank: 0.82,
  support: 0.78,
};

const CLASS_AUTO: Record<ChampionCombatClass, number> = {
  marksman: 1.22,
  mage: 0.78,
  assassin: 1.0,
  fighter: 1.05,
  tank: 0.78,
  support: 0.6,
};

function kitOf(championId: string): ChampionKit | null {
  return CHAMPION_KITS[championId] ?? null;
}

function classOf(championId: string): ChampionCombatClass {
  return kitOf(championId)?.combatClass ?? 'fighter';
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function teamCombatStyle(state: GameState, side: TeamSide): TeamCombatStyle {
  const allies = state.champions.filter((champ) => champ.side === side);
  if (allies.length === 0) {
    return { poke: 0.45, engage: 0.45, peel: 0.4, frontline: 0.3, carryCount: 1 };
  }
  let poke = 0;
  let engage = 0;
  let peel = 0;
  let frontline = 0;
  let carryCount = 0;
  for (const ally of allies) {
    const kit = kitOf(ally.championId);
    const identity = championIdentity(state, ally);
    const combatClass = kit?.combatClass ?? classOf(ally.championId);
    poke += (kit?.style.poke ?? 45) / 100;
    engage += ((kit?.style.engage ?? 45) + identity.engage) / 200;
    peel += identity.peel / 100;
    if (combatClass === 'tank' || identity.engage > 75) {
      frontline += 1;
    }
    if (
      combatClass === 'marksman' ||
      (combatClass === 'mage' && identity.late >= 75) ||
      (combatClass === 'fighter' && identity.closeout >= 78)
    ) {
      carryCount += 1;
    }
  }
  const n = allies.length;
  return {
    poke: poke / n,
    engage: engage / n,
    peel: peel / n,
    frontline: frontline / n,
    carryCount,
  };
}

function personalDamageBase(kit: ChampionKit | null, combatClass: ChampionCombatClass): number {
  const poke = (kit?.style.poke ?? 40) / 100;
  const teamfight = (kit?.style.teamfight ?? 55) / 100;
  const laning = (kit?.style.laning ?? 55) / 100;
  const classBase = CLASS_DAMAGE[combatClass];
  if (combatClass === 'fighter') {
    return classBase + poke * 0.28 + teamfight * 0.14 + laning * 0.08;
  }
  if (combatClass === 'tank') {
    return classBase + poke * 0.18 + teamfight * 0.08;
  }
  if (combatClass === 'support') {
    return classBase + poke * 0.08;
  }
  return classBase + poke * 0.06;
}

export function combatProfile(state: GameState, champion: ChampionEntity): CombatProfile {
  const kit = kitOf(champion.championId);
  const identity = championIdentity(state, champion);
  const combatClass = kit?.combatClass ?? classOf(champion.championId);
  const team = teamCombatStyle(state, champion.side);
  const poke = (kit?.style.poke ?? 40) / 100;
  const engage = ((kit?.style.engage ?? 45) / 100 + axis01(identity, 'engage')) / 2;
  const skirmish = axis01(identity, 'skirmish');
  const closeout = axis01(identity, 'closeout');
  const peel = axis01(identity, 'peel');
  const laning = axis01(identity, 'laning');

  let damageDealtMult = personalDamageBase(kit, combatClass);
  damageDealtMult *= 0.84 + closeout * 0.22;
  if (combatClass === 'marksman' || combatClass === 'mage') {
    damageDealtMult *= 0.92 + team.engage * 0.12 + team.frontline * 0.08;
    if (team.carryCount >= 2) {
      damageDealtMult *= 0.96;
    }
  } else if (combatClass === 'fighter') {
    damageDealtMult *= 0.94 + poke * 0.06 + skirmish * 0.08 + team.poke * 0.04;
  } else if (combatClass === 'assassin') {
    damageDealtMult *= 0.92 + skirmish * 0.08;
  } else if (combatClass === 'tank') {
    damageDealtMult *= 0.9 + team.engage * 0.06;
  } else {
    damageDealtMult *= 0.88 + peel * 0.06;
  }
  if (champion.positionLabel === 'BOT') {
    damageDealtMult *= 1.08;
  } else if (champion.positionLabel === 'TOP') {
    damageDealtMult *= 1.22;
  } else if (champion.positionLabel === 'MID') {
    damageDealtMult *= 0.7;
  } else if (champion.positionLabel === 'SUPPORT') {
    damageDealtMult *= 0.8;
  }
  damageDealtMult = clamp(damageDealtMult, 0.5, 1.7);

  let damageTakenMult = 1;
  if (champion.positionLabel === 'TOP') {
    damageTakenMult = 0.78;
  } else if (champion.positionLabel === 'MID') {
    damageTakenMult = 0.52;
  } else if (champion.positionLabel === 'JUNGLE') {
    damageTakenMult = 0.9;
  } else if (champion.positionLabel === 'BOT') {
    damageTakenMult = 0.95;
  } else if (champion.positionLabel === 'SUPPORT') {
    damageTakenMult = 0.94;
  }
  if (combatClass === 'tank') {
    damageTakenMult *= 0.92;
  } else if (combatClass === 'mage' || combatClass === 'marksman') {
    damageTakenMult *= 0.95;
  }
  damageTakenMult = clamp(damageTakenMult, 0.45, 1.15);

  let autoMult = CLASS_AUTO[combatClass];
  autoMult *= 0.96 + laning * 0.16;
  if (combatClass === 'marksman') {
    autoMult *= 1.04 + team.frontline * 0.1;
  }
  if (combatClass === 'fighter') {
    autoMult *= 1.06;
  }
  if (champion.positionLabel === 'BOT') {
    autoMult *= 1.02;
  } else if (champion.positionLabel === 'TOP') {
    autoMult *= 1.05;
  }
  autoMult = clamp(autoMult, 0.5, 1.45);

  const pokeAppetite = clamp(0.24 + poke * 0.55 + team.poke * 0.22 + laning * 0.14, 0.16, 0.95);
  const allInAppetite = clamp(
    0.12 + skirmish * 0.28 + engage * 0.24 + team.engage * 0.18 - peel * 0.14,
    0.1,
    0.78,
  );

  let disengageHp = 0.7 - allInAppetite * 0.12 - pokeAppetite * 0.05;
  if (combatClass === 'tank') {
    disengageHp -= 0.04;
  }
  if (combatClass === 'fighter') {
    disengageHp -= 0.05;
  }
  if (combatClass === 'mage') {
    disengageHp += 0.02 - team.frontline * 0.04;
  }
  if (combatClass === 'marksman' || champion.positionLabel === 'BOT') {
    disengageHp -= 0.06;
  }
  if (champion.positionLabel === 'MID') {
    disengageHp += 0.07;
  }
  disengageHp = clamp(disengageHp, 0.42, 0.76);

  const roleFarmBias =
    champion.positionLabel === 'SUPPORT'
      ? 12
      : champion.positionLabel === 'JUNGLE'
        ? 18
        : combatClass === 'marksman'
          ? 28
          : champion.positionLabel === 'TOP'
            ? 40
            : 46;
  const farmContest = clamp(
    roleFarmBias * (0.45 + pokeAppetite * 0.4 + allInAppetite * 0.18) * (0.78 + team.poke * 0.2),
    8,
    78,
  );

  return {
    damageDealtMult,
    damageTakenMult,
    autoMult,
    pokeAppetite,
    allInAppetite,
    disengageHp,
    farmContest,
  };
}
