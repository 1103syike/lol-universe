import type { DragonType } from './match-stats';

export type MonsterIconId =
  | 'gromp'
  | 'wolf'
  | 'raptor'
  | 'krug'
  | 'baron'
  | 'elder'
  | 'dragon'
  | `dragon_${DragonType}`;

export function monsterIconUrl(id: MonsterIconId): string {
  return `/monsters/${id}.webp`;
}

export function dragonTypeLabel(type: DragonType | null | undefined): string {
  switch (type) {
    case 'infernal':
      return '煉獄龍';
    case 'mountain':
      return '山嶺龍';
    case 'ocean':
      return '海洋龍';
    case 'cloud':
      return '雲端龍';
    case 'hextech':
      return '海克斯龍';
    case 'chemtech':
      return '煉金龍';
    default:
      return '小龍';
  }
}

export function monsterUnitIconId(
  unitKind: string | null | undefined,
  campId?: string | null,
  dragonType?: DragonType | null,
): MonsterIconId | null {
  if (campId === 'baron' || unitKind === 'baron') {
    return 'baron';
  }
  if (campId === 'elder' || unitKind === 'elder') {
    return 'elder';
  }
  if (campId === 'dragon' || unitKind === 'dragon') {
    if (
      dragonType === 'infernal' ||
      dragonType === 'mountain' ||
      dragonType === 'ocean' ||
      dragonType === 'cloud' ||
      dragonType === 'hextech' ||
      dragonType === 'chemtech'
    ) {
      return `dragon_${dragonType}`;
    }
    return 'dragon_infernal';
  }
  if (
    unitKind === 'ancient_krug' ||
    unitKind === 'krug' ||
    unitKind === 'mini_krug' ||
    campId === 'krugs' ||
    campId === 'red_krugs'
  ) {
    return 'krug';
  }
  if (
    unitKind === 'crimson_raptor' ||
    unitKind === 'raptor' ||
    campId === 'raptors' ||
    campId === 'red_raptors'
  ) {
    return 'raptor';
  }
  if (
    unitKind === 'greater_murk_wolf' ||
    unitKind === 'murk_wolf' ||
    campId === 'wolves' ||
    campId === 'red_wolves'
  ) {
    return 'wolf';
  }
  if (unitKind === 'gromp' || campId === 'gromp' || campId === 'red_gromp') {
    return 'gromp';
  }
  if (unitKind === 'blue_sentinel' || unitKind === 'red_brambleback') {
    return 'gromp';
  }
  if (unitKind === 'rift_scuttler') {
    return 'wolf';
  }
  if (unitKind === 'herald' || campId === 'herald') {
    return 'baron';
  }
  return null;
}

export function monsterIconLabel(
  unitKind: string | null | undefined,
  campId?: string | null,
  dragonType?: DragonType | null,
): string {
  if (campId === 'baron' || unitKind === 'baron') {
    return '巴龍';
  }
  if (campId === 'elder' || unitKind === 'elder') {
    return '遠古龍';
  }
  if (campId === 'dragon' || unitKind === 'dragon') {
    return dragonTypeLabel(dragonType);
  }
  if (campId === 'herald' || unitKind === 'herald') {
    return '預示者';
  }
  if (unitKind === 'gromp' || campId === 'gromp' || campId === 'red_gromp') {
    return '魔沼蛙';
  }
  if (
    unitKind === 'greater_murk_wolf' ||
    unitKind === 'murk_wolf' ||
    campId === 'wolves' ||
    campId === 'red_wolves'
  ) {
    return '暗影狼';
  }
  if (
    unitKind === 'crimson_raptor' ||
    unitKind === 'raptor' ||
    campId === 'raptors' ||
    campId === 'red_raptors'
  ) {
    return '鋒喙鳥';
  }
  if (
    unitKind === 'ancient_krug' ||
    unitKind === 'krug' ||
    unitKind === 'mini_krug' ||
    campId === 'krugs' ||
    campId === 'red_krugs'
  ) {
    return '石甲蟲';
  }
  if (unitKind === 'blue_sentinel') {
    return '藍buff';
  }
  if (unitKind === 'red_brambleback') {
    return '紅buff';
  }
  if (unitKind === 'rift_scuttler') {
    return '河蟹';
  }
  return '野怪';
}

export function monsterIconStyle(id: MonsterIconId, size = 34): Record<string, string> {
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${monsterIconUrl(id)})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
    backgroundSize: 'cover',
    borderRadius: '0.28rem',
  };
}
