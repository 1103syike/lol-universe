export type { ItemDefinition, ItemTag } from '../data/items';

export {
  ITEMS,
  ITEMS_BY_ID,
  ITEMS_BY_KEY,
  ITEM_DATA_VERSION,
  ITEM_SPRITE_CELL,
  ITEM_SPRITE_COLUMNS,
  ITEM_SPRITE_HEIGHT,
  ITEM_SPRITE_URL,
  ITEM_SPRITE_WIDTH,
  itemSpritePosition,
} from '../data/items';

import { ITEMS_BY_ID, ITEM_SPRITE_CELL, ITEM_SPRITE_COLUMNS, ITEM_SPRITE_URL } from '../data/items';

export function getItemById(id: string) {
  return ITEMS_BY_ID[id] ?? null;
}

export function itemTileUrl(itemId: string): string | null {
  const item = getItemById(itemId);
  return item ? `/items/tiles/${item.key}.png` : null;
}

export function itemSpriteStyle(itemId: string, size = 22): Record<string, string> | null {
  const item = getItemById(itemId);
  if (!item) {
    return null;
  }
  const scale = size / ITEM_SPRITE_CELL;
  const column = item.spriteIndex % ITEM_SPRITE_COLUMNS;
  const row = Math.floor(item.spriteIndex / ITEM_SPRITE_COLUMNS);
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${ITEM_SPRITE_URL})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${ITEM_SPRITE_COLUMNS * ITEM_SPRITE_CELL * scale}px auto`,
    backgroundPosition: `-${column * size}px -${row * size}px`,
  };
}
