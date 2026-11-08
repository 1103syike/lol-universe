import { CHAMPION_KITS } from '../../../core/data/champion-kits';
import { CHAMPIONS } from '../../../core/data/champions';
import type { ChampionId, ImplementationStatus } from '../types/ids';
import { buildChampionIdentity } from './champion-identity';
import type { AbilityDefinition, ChampionDefinition } from './version-pack';

function isMagicKit(championId: string, tags: readonly string[]): boolean {
  const kit = CHAMPION_KITS[championId];
  if (kit) {
    if (kit.damageType === 'ap') {
      return true;
    }
    if (kit.damageType === 'ad' || kit.damageType === 'true') {
      return false;
    }
    if (kit.damageType === 'hybrid') {
      return kit.combatClass === 'mage' || tags.includes('Mage');
    }
  }
  if (tags.includes('Marksman')) {
    return false;
  }
  if (tags.includes('Mage')) {
    return true;
  }
  if (tags.includes('Support') && !tags.includes('Fighter')) {
    return true;
  }
  return false;
}

function isRanged(tags: readonly string[]): boolean {
  return tags.includes('Marksman') || tags.includes('Mage');
}

function usesMana(resource: string): boolean {
  const key = resource.toLowerCase();
  return key.includes('mana') || key === '';
}

function abilities(
  name: string,
  magic: boolean,
  manaUser: boolean,
  status: ImplementationStatus,
  combatClass: string,
): AbilityDefinition[] {
  const dtype = magic ? 'magic' : 'physical';
  const mana = manaUser ? 1 : 0;
  const support = combatClass === 'support';
  const marksman = combatClass === 'marksman';
  const mage = combatClass === 'mage';
  const qBase = support ? 40 : marksman ? 50 : mage ? 70 : 60;
  const qPer = support ? 15 : marksman ? 22 : mage ? 35 : 28;
  const eBase = support ? 30 : marksman ? 40 : mage ? 55 : 50;
  const ePer = support ? 12 : marksman ? 18 : mage ? 28 : 24;
  const rBase = support ? 70 : marksman ? 120 : mage ? 150 : 130;
  const rPer = support ? 30 : marksman ? 60 : mage ? 100 : 70;
  return [
    {
      slot: 'P',
      name: `${name} Passive`,
      cooldownSec: 0,
      manaCost: 0,
      range: 0,
      damageBase: 0,
      damagePerLevel: 0,
      damageType: dtype,
      tags: ['passive'],
      implementationStatus: status,
    },
    {
      slot: 'Q',
      name: `${name} Q`,
      cooldownSec: support ? 8 : 6,
      manaCost: 50 * mana,
      range: 625,
      damageBase: qBase,
      damagePerLevel: qPer,
      damageType: dtype,
      tags: support ? ['damage', 'skillshot', 'utility'] : ['damage', 'skillshot'],
      implementationStatus: status,
    },
    {
      slot: 'W',
      name: `${name} W`,
      cooldownSec: 10,
      manaCost: 60 * mana,
      range: 700,
      damageBase: support ? 0 : 40,
      damagePerLevel: support ? 0 : 20,
      damageType: dtype,
      tags: support ? ['utility'] : mage ? ['damage', 'utility'] : ['utility'],
      implementationStatus: status === 'full' ? 'partial' : status,
    },
    {
      slot: 'E',
      name: `${name} E`,
      cooldownSec: support ? 12 : 8,
      manaCost: 45 * mana,
      range: 550,
      damageBase: eBase,
      damagePerLevel: ePer,
      damageType: dtype,
      tags: support ? ['utility'] : ['damage'],
      implementationStatus: status,
    },
    {
      slot: 'R',
      name: `${name} R`,
      cooldownSec: support ? 90 : 70,
      manaCost: 100 * mana,
      range: 800,
      damageBase: rBase,
      damagePerLevel: rPer,
      damageType: dtype,
      tags: support ? ['utility', 'ultimate'] : ['damage', 'ultimate'],
      implementationStatus: status,
    },
  ];
}

export function buildChampionTable(
  fullIds: readonly ChampionId[],
  hpBias = 0,
): Record<string, ChampionDefinition> {
  const full = new Set(fullIds);
  const table: Record<string, ChampionDefinition> = {};
  for (const champ of CHAMPIONS) {
    const magic = isMagicKit(champ.id, champ.tags);
    const ranged = isRanged(champ.tags);
    const manaUser = usesMana(champ.resource);
    const status: ImplementationStatus = full.has(champ.id) ? 'full' : 'partial';
    const combatClass = CHAMPION_KITS[champ.id]?.combatClass
      ?? (champ.tags.includes('Marksman')
        ? 'marksman'
        : champ.tags.includes('Mage')
          ? 'mage'
          : champ.tags.includes('Tank')
            ? 'tank'
            : champ.tags.includes('Support')
              ? 'support'
              : 'fighter');
    table[champ.id] = {
      id: champ.id,
      name: champ.name,
      tags: [...champ.tags],
      primaryDamage: magic ? 'magic' : 'physical',
      baseHp: (champ.tags.includes('Tank') ? 680 : 610) + hpBias,
      hpPerLevel: champ.tags.includes('Tank') ? 112 : 102,
      baseMana: manaUser ? 340 : 0,
      manaPerLevel: manaUser ? 45 : 0,
      baseAd: magic ? 53 : champ.tags.includes('Marksman') ? 59 : 62,
      adPerLevel: magic ? 3.1 : champ.tags.includes('Marksman') ? 3.4 : 3.6,
      baseArmor: champ.tags.includes('Tank') ? 36 : 27,
      armorPerLevel: champ.tags.includes('Tank') ? 4.7 : 4.3,
      baseMr: champ.tags.includes('Tank') ? 32 : 30,
      mrPerLevel: champ.tags.includes('Tank') ? 2.05 : 1.3,
      moveSpeed: 340,
      attackRange: ranged ? 550 : 175,
      attackSpeed: champ.tags.includes('Marksman') ? 0.75 : 0.72,
      abilities: abilities(champ.name, magic, manaUser, status, combatClass),
      implementationStatus: status,
      identity: buildChampionIdentity(champ.id),
    };
  }
  return table;
}
