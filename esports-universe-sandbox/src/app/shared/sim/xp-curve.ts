export const XP_PER_LEVEL: readonly number[] = [
  0, 280, 660, 1140, 1720, 2400, 3180, 4060, 5040, 6120, 7300, 8580, 9960, 11440,
  13020, 14700, 16480, 18360,
];

export function xpProgressInLevel(level: number, exp: number): number {
  const clamped = Math.max(1, Math.floor(level || 1));
  if (clamped >= XP_PER_LEVEL.length) {
    return 1;
  }
  const floor = XP_PER_LEVEL[clamped - 1] ?? 0;
  const ceil = XP_PER_LEVEL[clamped] ?? floor + 1;
  if (ceil <= floor) {
    return 1;
  }
  return Math.max(0, Math.min(1, ((exp ?? 0) - floor) / (ceil - floor)));
}

export function xpIntoLevel(level: number, exp: number): number {
  const clamped = Math.max(1, Math.floor(level || 1));
  const floor = XP_PER_LEVEL[Math.min(clamped, XP_PER_LEVEL.length) - 1] ?? 0;
  return Math.max(0, (exp ?? 0) - floor);
}

export function xpNeededForLevel(level: number): number {
  const clamped = Math.max(1, Math.floor(level || 1));
  if (clamped >= XP_PER_LEVEL.length) {
    return 0;
  }
  const floor = XP_PER_LEVEL[clamped - 1] ?? 0;
  const ceil = XP_PER_LEVEL[clamped] ?? floor;
  return Math.max(0, ceil - floor);
}
