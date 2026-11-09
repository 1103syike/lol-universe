const SLOT_PATH: Record<string, string> = {
  P: 'p',
  Q: 'q',
  W: 'w',
  E: 'e',
  R: 'r',
};

export function abilityIconUrl(championId: string, slot: string): string | null {
  const path = SLOT_PATH[slot.toUpperCase()];
  if (!championId || !path) {
    return null;
  }
  return `https://cdn.communitydragon.org/latest/champion/${championId}/ability-icon/${path}`;
}
