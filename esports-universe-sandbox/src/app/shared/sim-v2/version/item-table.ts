import { ITEMS } from '../../../core/data/items';
import type { ItemDefinition } from './version-pack';

export function buildItemTable(): Record<string, ItemDefinition> {
  const table: Record<string, ItemDefinition> = {};
  for (const item of ITEMS) {
    table[item.id] = {
      id: item.id,
      name: item.name,
      nameZh: item.nameZh,
      key: item.key,
      spriteIndex: item.spriteIndex,
      cost: item.cost,
      combineCost: item.combineCost,
      purchasable: item.purchasable,
      buildsFrom: item.buildsFrom,
      buildsInto: item.buildsInto,
      tags: item.tags,
      ad: item.ad,
      ap: item.ap,
      hp: item.hp,
      mana: item.mana,
      armor: item.armor,
      mr: item.mr,
      attackSpeed: item.attackSpeed,
      moveSpeed: item.moveSpeed,
      crit: item.crit,
      lifeSteal: item.lifeSteal,
      hpRegen: item.hpRegen,
      manaRegen: item.manaRegen,
    };
  }
  return table;
}
