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
  marksman: 1.28,
  mage: 1.28,
  assassin: 1.22,
  fighter: 1.28,
  tank: 0.82,
  support: 0.78,
};

const CLASS_AUTO: Record<ChampionCombatClass, number> = {
  marksman: 1.08,
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
  damageDealtMult *= 0.88 + closeout * 0.18;
  if (combatClass === 'marksman' || combatClass === 'mage') {
    damageDealtMult *= 0.94 + team.engage * 0.1 + team.frontline * 0.1;
  } else if (combatClass === 'fighter') {
    damageDealtMult *= 0.96 + poke * 0.05 + skirmish * 0.06;
  } else if (combatClass === 'assassin') {
    damageDealtMult *= 0.94 + skirmish * 0.08;
  } else if (combatClass === 'tank') {
    damageDealtMult *= 0.9 + team.engage * 0.05;
  } else {
    damageDealtMult *= 0.86 + peel * 0.08;
  }
  damageDealtMult = clamp(damageDealtMult, 0.55, 1.4);

  let damageTakenMult = combatClass === 'tank' ? 0.9 : combatClass === 'fighter' ? 0.96 : 1;
  if (combatClass === 'mage' || combatClass === 'marksman') {
    damageTakenMult *= 1.02;
  }
  damageTakenMult = clamp(damageTakenMult, 0.75, 1.15);

  let autoMult = CLASS_AUTO[combatClass];
  autoMult *= 0.96 + laning * 0.14;
  if (combatClass === 'marksman') {
    autoMult *= 1.02 + team.frontline * 0.08;
  }
  autoMult = clamp(autoMult, 0.55, 1.35);

  const pokeAppetite = clamp(0.24 + poke * 0.55 + team.poke * 0.22 + laning * 0.14, 0.16, 0.95);
  const allInAppetite = clamp(
    0.12 + skirmish * 0.28 + engage * 0.24 + team.engage * 0.18 - peel * 0.14,
    0.1,
    0.78,
  );

  let disengageHp = 0.78 - allInAppetite * 0.08 - pokeAppetite * 0.03;
  if (combatClass === 'tank') {
    disengageHp -= 0.03;
  }
  if (combatClass === 'fighter') {
    disengageHp -= 0.02;
  }
  if (combatClass === 'mage') {
    disengageHp += 0.04 - team.frontline * 0.03;
  }
  if (combatClass === 'marksman' || champion.positionLabel === 'BOT') {
    disengageHp += 0.02;
  }
  if (champion.positionLabel === 'MID') {
    disengageHp += 0.05;
  }
  disengageHp = clamp(disengageHp, 0.58, 0.84);

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
