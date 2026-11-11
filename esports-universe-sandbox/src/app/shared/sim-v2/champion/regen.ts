import { dist } from '../map/pathfinding';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { ChampionDefinition } from '../version/version-pack';

export const FOUNTAIN_HP_REGEN_PCT_PER_SEC = 0.08;
export const FOUNTAIN_MANA_REGEN_PCT_PER_SEC = 0.1;
export const FOUNTAIN_REGEN_RADIUS = 550;

function growthHp5(def: ChampionDefinition, level: number): number {
  return def.baseHpRegen + Math.max(0, level - 1) * def.hpRegenPerLevel;
}

function growthMp5(def: ChampionDefinition, level: number): number {
  if (def.baseMana <= 0 && def.baseManaRegen <= 0) {
    return 0;
  }
  return def.baseManaRegen + Math.max(0, level - 1) * def.manaRegenPerLevel;
}

export function baseHp5(def: ChampionDefinition, level: number): number {
  return growthHp5(def, level);
}

export function baseMp5(def: ChampionDefinition, level: number): number {
  return growthMp5(def, level);
}

export function itemHpRegenPerSec(state: GameState, champion: ChampionEntity): number {
  let sum = 0;
  for (const itemId of champion.items) {
    const item = state.lockedPack.items[itemId];
    if (!item) {
      continue;
    }
    sum += item.hpRegen ?? 0;
  }
  return sum;
}

export function itemManaRegenPerSec(state: GameState, champion: ChampionEntity): number {
  let sum = 0;
  for (const itemId of champion.items) {
    const item = state.lockedPack.items[itemId];
    if (!item) {
      continue;
    }
    sum += item.manaRegen ?? 0;
  }
  return sum;
}

export function championHpRegenPerSec(state: GameState, champion: ChampionEntity): number {
  const def = state.lockedPack.champions[champion.championId];
  if (!def) {
    return 1.2;
  }
  return growthHp5(def, champion.level) / 5 + itemHpRegenPerSec(state, champion);
}

export function championManaRegenPerSec(state: GameState, champion: ChampionEntity): number {
  if (champion.maxMana <= 1) {
    return 0;
  }
  const def = state.lockedPack.champions[champion.championId];
  if (!def) {
    return 1.6;
  }
  return growthMp5(def, champion.level) / 5 + itemManaRegenPerSec(state, champion);
}

function fountainOf(state: GameState, side: ChampionEntity['side']) {
  return side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
}

export function applyChampionRegen(state: GameState, dt: number): void {
  for (const champion of state.champions) {
    if (!champion.alive) {
      continue;
    }
    const nearFountain =
      dist(champion.position, fountainOf(state, champion.side)) < FOUNTAIN_REGEN_RADIUS;
    if (nearFountain) {
      if (champion.recallPhase === 'moving_home') {
        champion.recallPhase = 'at_base';
        champion.recallChannelUntil = 0;
        champion.recallChannelDuration = 0;
        champion.moving = false;
        champion.path = [];
      }
      champion.hp = Math.min(
        champion.maxHp,
        champion.hp + champion.maxHp * FOUNTAIN_HP_REGEN_PCT_PER_SEC * dt,
      );
      if (champion.maxMana > 1) {
        champion.mana = Math.min(
          champion.maxMana,
          champion.mana + champion.maxMana * FOUNTAIN_MANA_REGEN_PCT_PER_SEC * dt,
        );
      }
      continue;
    }
    const hpGain = championHpRegenPerSec(state, champion) * dt;
    if (hpGain > 0 && champion.hp < champion.maxHp) {
      champion.hp = Math.min(champion.maxHp, champion.hp + hpGain);
    }
    const manaGain = championManaRegenPerSec(state, champion) * dt;
    if (manaGain > 0 && champion.mana < champion.maxMana) {
      champion.mana = Math.min(champion.maxMana, champion.mana + manaGain);
    }
  }
}
