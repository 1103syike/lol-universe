export type SummonerSpellId =
  | 'Flash'
  | 'Ignite'
  | 'Teleport'
  | 'Smite'
  | 'Heal'
  | 'Exhaust'
  | 'Ghost'
  | 'Barrier'
  | 'Cleanse';

export type SummonerSpellSlot = 'D' | 'F';

export interface SummonerSpellDefinition {
  id: SummonerSpellId;
  name: string;
  nameZh: string;
  cooldownSec: number;
  range: number;
  spriteIndex: number;
  descriptionZh: string;
}

export const SUMMONER_SPRITE_URL = '/summoners/summoner-sprite.png';
export const SUMMONER_SPRITE_COLUMNS = 5;
export const SUMMONER_SPRITE_CELL = 328 / 5;

export const SUMMONER_SPELLS: Record<SummonerSpellId, SummonerSpellDefinition> = {
  Flash: {
    id: 'Flash',
    name: 'Flash',
    nameZh: '閃現',
    cooldownSec: 300,
    range: 400,
    spriteIndex: 1 * 5 + 4,
    descriptionZh: '短暫朝目標方向閃現一小段距離。',
  },
  Ignite: {
    id: 'Ignite',
    name: 'Ignite',
    nameZh: '點燃',
    cooldownSec: 180,
    range: 600,
    spriteIndex: 2 * 5 + 3,
    descriptionZh: '點燃敵方英雄，造成真實傷害並降低治療效果。',
  },
  Teleport: {
    id: 'Teleport',
    name: 'Teleport',
    nameZh: '傳送',
    cooldownSec: 360,
    range: 25000,
    spriteIndex: 4 * 5 + 1,
    descriptionZh: '導引後傳送到友方防禦塔、小兵或眼位附近。',
  },
  Smite: {
    id: 'Smite',
    name: 'Smite',
    nameZh: '重擊',
    cooldownSec: 90,
    range: 500,
    spriteIndex: 3 * 5 + 4,
    descriptionZh: '對野怪／史詩野怪造成真實傷害，打野核心技能。',
  },
  Heal: {
    id: 'Heal',
    name: 'Heal',
    nameZh: '治癒',
    cooldownSec: 240,
    range: 850,
    spriteIndex: 2 * 5 + 2,
    descriptionZh: '立即治療自己與附近一名友軍，並短暫加速。',
  },
  Exhaust: {
    id: 'Exhaust',
    name: 'Exhaust',
    nameZh: '虛弱',
    cooldownSec: 210,
    range: 650,
    spriteIndex: 1 * 5 + 3,
    descriptionZh: '削弱敵方英雄，降低其移動速度與傷害。',
  },
  Ghost: {
    id: 'Ghost',
    name: 'Ghost',
    nameZh: '鬼步',
    cooldownSec: 210,
    range: 0,
    spriteIndex: 2 * 5 + 1,
    descriptionZh: '一段時間內大幅提升移動速度，可穿越單位。',
  },
  Barrier: {
    id: 'Barrier',
    name: 'Barrier',
    nameZh: '光盾',
    cooldownSec: 180,
    range: 0,
    spriteIndex: 0 * 5 + 1,
    descriptionZh: '為自己加上護盾，吸收即將到來的傷害。',
  },
  Cleanse: {
    id: 'Cleanse',
    name: 'Cleanse',
    nameZh: '淨化',
    cooldownSec: 210,
    range: 0,
    spriteIndex: 1 * 5 + 2,
    descriptionZh: '移除身上的召喚師減益與大部分控制效果。',
  },
};

export const ROLE_SUMMONER_LOADOUTS: Record<
  'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT',
  readonly [SummonerSpellId, SummonerSpellId]
> = {
  TOP: ['Teleport', 'Flash'],
  JUNGLE: ['Smite', 'Flash'],
  MID: ['Teleport', 'Flash'],
  BOT: ['Heal', 'Flash'],
  SUPPORT: ['Exhaust', 'Flash'],
};

const MID_IGNITE_CHAMPIONS = new Set<string>([
  'Akali',
  'Diana',
  'Ekko',
  'Fizz',
  'Kassadin',
  'Katarina',
  'Leblanc',
  'Pantheon',
  'Qiyana',
  'Sylas',
  'Talon',
  'Zed',
]);

const TOP_IGNITE_CHAMPIONS = new Set<string>([
  'Darius',
  'Sett',
  'Renekton',
  'Riven',
  'Camille',
  'Jax',
  'Tryndamere',
  'Yone',
]);

const SUPPORT_IGNITE_CHAMPIONS = new Set<string>([
  'Pyke',
  'Nautilus',
  'Leona',
  'Blitzcrank',
  'Rell',
  'Thresh',
  'Pantheon',
  'Alistar',
]);

export function pickSummonerPair(
  position: 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT',
  championId: string,
): readonly [SummonerSpellId, SummonerSpellId] {
  if (position === 'MID' && MID_IGNITE_CHAMPIONS.has(championId)) {
    return ['Ignite', 'Flash'];
  }
  if (position === 'TOP' && TOP_IGNITE_CHAMPIONS.has(championId)) {
    return ['Ignite', 'Flash'];
  }
  if (position === 'SUPPORT' && SUPPORT_IGNITE_CHAMPIONS.has(championId)) {
    return ['Ignite', 'Flash'];
  }
  if (position === 'BOT') {
    return ['Heal', 'Flash'];
  }
  return ROLE_SUMMONER_LOADOUTS[position];
}

export function assignSummonerSlots(
  pair: readonly [SummonerSpellId, SummonerSpellId],
): Array<{ id: SummonerSpellId; slot: SummonerSpellSlot }> {
  const flash = pair.find((spell) => spell === 'Flash');
  const other = pair.find((spell) => spell !== 'Flash');
  if (flash && other) {
    return [
      { id: other, slot: 'D' },
      { id: flash, slot: 'F' },
    ];
  }
  return [
    { id: pair[0], slot: 'D' },
    { id: pair[1], slot: 'F' },
  ];
}
