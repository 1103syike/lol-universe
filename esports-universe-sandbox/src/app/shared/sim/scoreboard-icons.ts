export const SCOREBOARD_SPRITE_URL = '/scoreboard-icons.webp';
export const SCOREBOARD_SPRITE_WIDTH = 366;
export const SCOREBOARD_SPRITE_HEIGHT = 458;
export const SCOREBOARD_CELL = 90;

export type ScoreboardIconId =
  | 'voidgrub'
  | 'dragon'
  | 'baron'
  | 'elder'
  | 'tower'
  | 'herald'
  | 'inhibitor'
  | 'nexus';
export type ScoreboardSide = 'blue' | 'red';

const ICON_POS: Record<ScoreboardIconId, Record<ScoreboardSide, { x: number; y: number }>> = {
  nexus: { blue: { x: 90, y: 0 }, red: { x: 180, y: 0 } },
  voidgrub: { blue: { x: 90, y: 0 }, red: { x: 180, y: 0 } },
  tower: { blue: { x: 270, y: 0 }, red: { x: 0, y: 90 } },
  dragon: { blue: { x: 270, y: 0 }, red: { x: 0, y: 90 } },
  herald: { blue: { x: 270, y: 90 }, red: { x: 0, y: 180 } },
  inhibitor: { blue: { x: 90, y: 180 }, red: { x: 180, y: 180 } },
  baron: { blue: { x: 90, y: 270 }, red: { x: 180, y: 270 } },
  elder: { blue: { x: 270, y: 270 }, red: { x: 0, y: 360 } },
};

export function markerToIcon(marker: string | undefined, eventType?: string): ScoreboardIconId | null {
  if (marker === 'K') {
    return null;
  }
  if (marker === 'B' || eventType === 'baron') {
    return 'baron';
  }
  if (marker === 'E' || eventType === 'elder') {
    return 'elder';
  }
  if (marker === 'T' || eventType === 'tower') {
    return 'tower';
  }
  if (marker === 'D1' || marker === 'D2' || marker === 'D3' || marker === 'D4' || eventType === 'dragon' || eventType === 'dragon-soul') {
    return 'dragon';
  }
  if (eventType === 'herald') {
    return 'herald';
  }
  if (eventType === 'voidgrub') {
    return 'voidgrub';
  }
  if (eventType === 'inhibitor') {
    return 'inhibitor';
  }
  return null;
}

export function scoreboardIconStyle(
  icon: ScoreboardIconId,
  side: ScoreboardSide,
  size = 18,
  options?: { destroyed?: boolean },
): Record<string, string> {
  const pos = ICON_POS[icon][side];
  const scale = size / SCOREBOARD_CELL;
  const style: Record<string, string> = {
    width: `${size}px`,
    height: `${size}px`,
    backgroundImage: `url(${SCOREBOARD_SPRITE_URL})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${SCOREBOARD_SPRITE_WIDTH * scale}px ${SCOREBOARD_SPRITE_HEIGHT * scale}px`,
    backgroundPosition: `${-pos.x * scale}px ${-pos.y * scale}px`,
  };
  if (options?.destroyed) {
    style['filter'] = 'grayscale(1) brightness(0.75) contrast(0.9)';
    style['opacity'] = '0.78';
  }
  return style;
}

export function mapObjectiveIcon(
  campId: string,
): ScoreboardIconId | null {
  if (campId === 'dragon') {
    return 'dragon';
  }
  if (campId === 'baron') {
    return 'baron';
  }
  if (campId === 'herald') {
    return 'herald';
  }
  return null;
}
