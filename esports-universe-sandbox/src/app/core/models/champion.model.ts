export type {
  ChampionDefinition,
  ChampionRole,
  ChampionTag,
} from '../data/champions';

export {
  CHAMPIONS,
  CHAMPION_DATA_VERSION,
  CHAMPION_SPRITE_BASE_VERSION,
  CHAMPION_SPRITE_CELL,
  CHAMPION_SPRITE_COLUMNS,
  CHAMPION_SPRITE_HEIGHT,
  CHAMPION_SPRITE_URL,
  CHAMPION_SPRITE_WIDTH,
  getChampionById,
  getChampionByKey,
  listChampions,
} from '../data/champions';

export type {
  ChampionCombatClass,
  ChampionDamageType,
  ChampionKit,
  ChampionScaling,
  ChampionStyleProfile,
} from '../data/champion-kits';

export {
  CHAMPION_KITS,
  getChampionKit,
  listChampionKits,
} from '../data/champion-kits';

export type {
  ChampionMetaEntry,
  CompIntent,
  PatchMetaTable,
  PatchStageId,
  PatchVersion,
} from './patch.model';

export {
  COMP_INTENTS,
  COMP_INTENT_LABELS,
  PATCH_STAGE_IDS,
  PATCH_STAGE_LABELS,
} from './patch.model';

export const CHAMPION_TAG_LABELS: Record<string, string> = {
  Fighter: '戰士',
  Tank: '坦克',
  Mage: '法師',
  Assassin: '刺客',
  Marksman: '射手',
  Support: '輔助',
};

export const CHAMPION_ROLE_LABELS: Record<string, string> = {
  fighter: '戰士',
  tank: '坦克',
  mage: '法師',
  assassin: '刺客',
  marksman: '射手',
  support: '輔助',
};

export function championTileUrl(championId: string): string {
  return `/champions/tiles/${championId}.png`;
}

export function championSplashUrl(championId: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_0.jpg`;
}

export function championSpritePosition(spriteIndex: number): { column: number; row: number } {
  return {
    column: spriteIndex % 16,
    row: Math.floor(spriteIndex / 16),
  };
}
