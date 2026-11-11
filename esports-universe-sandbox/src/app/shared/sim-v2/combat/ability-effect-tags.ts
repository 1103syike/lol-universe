import { CHAMPION_COMBAT_BY_ID } from '../../../core/data/champion-combat';

export type AbilitySlotEffects = {
  selfDash: boolean;
  pull: boolean;
  knockup: boolean;
  knockback: boolean;
  hardCc: boolean;
  softCc: boolean;
  aoe: boolean;
  dashRange: number;
};

export type ChampionAbilityEffects = Partial<
  Record<'Q' | 'W' | 'E' | 'R', AbilitySlotEffects>
>;

function has(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function parseEffects(description: string, range: number): AbilitySlotEffects {
  const text = description ?? '';
  const selfDash = has(text, [
    /\bdashes?\b/i,
    /\bleaps?\b/i,
    /\bblinks?\b/i,
    /\bflies\b/i,
    /\brushes\b/i,
    /\bcharges?\b(?!\s+up\b)/i,
    /pull(?:s|ing)? (?:her|him|them)self/i,
    /pulling \w+ to (?:them|her|him)/i,
    /dash(?:es)? (?:to|toward|towards|in the direction)/i,
  ]);
  const knockup = has(text, [
    /knock(?:s|ing)? them up/i,
    /knock(?:s|ing)? up/i,
    /knocked up/i,
    /\bairborne\b/i,
  ]);
  const knockback = has(text, [
    /knock(?:s|ing)? them (?:back|aside|away)/i,
    /knock(?:s|ing)? (?:back|aside)/i,
    /knocks? all units away/i,
    /knocking them down/i,
  ]);
  const pull = has(text, [
    /pull(?:s|ing)? them/i,
    /pulling the target/i,
    /drags? them/i,
    /pull(?:s|ing)? the first enemy/i,
    /catches? the first enemy hit[\s\S]{0,80}pull/i,
  ]);
  const hardCc =
    knockup ||
    has(text, [
      /\bstuns?\b/i,
      /\bstunning\b/i,
      /\bstunned\b/i,
      /\broots?\b/i,
      /\brooting\b/i,
      /\bcharms?\b/i,
      /\bcharming\b/i,
      /\bsuppress(?:es|ion|ing)?\b/i,
      /\bstasis\b/i,
    ]);
  const softCc = has(text, [/\bslow(?:s|ing|ed)?\b/i]);
  const aoe = has(text, [
    /nearby enemies/i,
    /enemies (?:hit|within|around|in)/i,
    /area/i,
    /around (?:her|him|them)/i,
    /in a (?:cone|circle|radius)/i,
  ]);
  return {
    selfDash,
    pull,
    knockup,
    knockback,
    hardCc,
    softCc,
    aoe,
    dashRange: Math.max(350, Math.min(1200, Math.round(range || 650))),
  };
}

const cache = new Map<string, AbilitySlotEffects | null>();

export function abilityEffectsOf(
  championId: string,
  slot: 'Q' | 'W' | 'E' | 'R' | 'P',
): AbilitySlotEffects | null {
  if (slot === 'P') {
    return null;
  }
  const key = `${championId}:${slot}`;
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }
  const ability = CHAMPION_COMBAT_BY_ID[championId]?.abilities.find((item) => item.slot === slot);
  if (!ability) {
    cache.set(key, null);
    return null;
  }
  const effects = parseEffects(ability.description, ability.range);
  cache.set(key, effects);
  return effects;
}

export function buildChampionAbilityEffects(): Record<string, ChampionAbilityEffects> {
  const out: Record<string, ChampionAbilityEffects> = {};
  for (const [id, combat] of Object.entries(CHAMPION_COMBAT_BY_ID)) {
    const slots: ChampionAbilityEffects = {};
    for (const ability of combat.abilities) {
      if (ability.slot === 'P') {
        continue;
      }
      slots[ability.slot] = parseEffects(ability.description, ability.range);
    }
    out[id] = slots;
  }
  return out;
}

export const CHAMPION_ABILITY_EFFECTS: Record<string, ChampionAbilityEffects> =
  buildChampionAbilityEffects();
