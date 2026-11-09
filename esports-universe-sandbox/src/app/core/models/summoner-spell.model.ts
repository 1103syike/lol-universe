import {
  SUMMONER_SPELLS,
  SUMMONER_SPRITE_CELL,
  SUMMONER_SPRITE_COLUMNS,
  SUMMONER_SPRITE_URL,
  type SummonerSpellDefinition,
  type SummonerSpellId,
} from '../data/summoner-spells';

export function getSummonerSpell(id: string): SummonerSpellDefinition | null {
  return SUMMONER_SPELLS[id as SummonerSpellId] ?? null;
}

export function summonerSpriteStyle(
  spellId: string,
  size = 22,
): Record<string, string> | null {
  const spell = getSummonerSpell(spellId);
  if (!spell) {
    return null;
  }
  const scale = size / SUMMONER_SPRITE_CELL;
  const column = spell.spriteIndex % SUMMONER_SPRITE_COLUMNS;
  const row = Math.floor(spell.spriteIndex / SUMMONER_SPRITE_COLUMNS);
  return {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${SUMMONER_SPRITE_URL})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${SUMMONER_SPRITE_COLUMNS * SUMMONER_SPRITE_CELL * scale}px auto`,
    backgroundPosition: `-${column * size}px -${row * size}px`,
  };
}
