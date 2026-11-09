import { CHAMPION_KITS, type ChampionCombatClass } from '../../../core/data/champion-kits';
import { axis01, championIdentity } from '../champion/identity-runtime';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';

export interface JungleClearProfile {
  autoMult: number;
  aoeMult: number;
  largeMult: number;
  petMult: number;
  smiteDamage: number;
  smiteCooldownSec: number;
}

const CLASS_CLEAR: Record<
  ChampionCombatClass,
  { auto: number; aoe: number; large: number; pet: number }
> = {
  fighter: { auto: 1.18, aoe: 1.05, large: 1.08, pet: 1.05 },
  assassin: { auto: 1.22, aoe: 0.78, large: 1.2, pet: 1 },
  mage: { auto: 1.05, aoe: 1.45, large: 1.02, pet: 1.05 },
  marksman: { auto: 1.28, aoe: 0.78, large: 1.22, pet: 0.9 },
  tank: { auto: 1.0, aoe: 1.18, large: 0.98, pet: 1.15 },
  support: { auto: 0.55, aoe: 0.5, large: 0.5, pet: 0.4 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function jungleClearProfile(
  state: GameState,
  champion: ChampionEntity,
): JungleClearProfile {
  const kit = CHAMPION_KITS[champion.championId] ?? null;
  const combatClass = kit?.combatClass ?? 'fighter';
  const identity = championIdentity(state, champion);
  const base = CLASS_CLEAR[combatClass];
  const wave = axis01(identity, 'waveClear');
  const early = axis01(identity, 'early');
  const mechanics = champion.skills.mechanics / 100;
  const isJungler = champion.positionLabel === 'JUNGLE';
  const roleFloor = isJungler ? 1 : 0.42;
  const growth = 0.92 + wave * 0.3 + early * 0.22 + mechanics * 0.14;
  const tankJgBoost = isJungler && combatClass === 'tank' ? 1.04 : 1;
  const mageJgBoost = isJungler && combatClass === 'mage' ? 1.04 : 1;
  const classBoost = tankJgBoost * mageJgBoost;

  const clearPace = isJungler ? 1.12 : 1;
  return {
    autoMult: clamp(base.auto * growth * roleFloor * classBoost * clearPace, 0.35, 1.85),
    aoeMult: clamp(
      base.aoe * (0.85 + wave * 0.5) * roleFloor * classBoost * clearPace,
      0.25,
      2.05,
    ),
    largeMult: clamp(
      base.large * (0.95 + early * 0.28) * roleFloor * classBoost * clearPace,
      0.35,
      1.85,
    ),
    petMult: isJungler ? clamp(base.pet * (0.95 + early * 0.25) * classBoost, 0.75, 1.4) : 0,
    smiteDamage: isJungler ? Math.round(600 + champion.level * 50) : 0,
    smiteCooldownSec: isJungler ? 15 : 9999,
  };
}

export function jungleClearAttackPower(_state: GameState, champion: ChampionEntity): number {
  const kit = CHAMPION_KITS[champion.championId] ?? null;
  const combatClass = kit?.combatClass ?? 'fighter';
  const level = champion.level;
  if (kit?.damageType === 'ap') {
    return Math.max(champion.ad, 54) + champion.ap * 0.9 + level * 5 + 12;
  }
  if (kit?.damageType === 'hybrid') {
    return champion.ad * 0.78 + champion.ap * 0.5 + level * 3 + 8;
  }
  if (combatClass === 'tank' && champion.positionLabel === 'JUNGLE') {
    return champion.ad * 1.04 + level * 2 + 4;
  }
  return champion.ad;
}
