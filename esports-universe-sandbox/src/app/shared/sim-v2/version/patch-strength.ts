import { CHAMPIONS } from '../../../core/data/champions';
import type { PatchMetaTable } from '../../../core/models/patch.model';
import type { PatchChampionStrength, PatchStrengthTable } from './version-pack';

const DEFAULT: PatchChampionStrength = { power: 48, presence: 0.08 };

function fill(
  highlights: Record<string, PatchChampionStrength>,
  soft: Record<string, number> = {},
): PatchStrengthTable {
  const table: Record<string, PatchChampionStrength> = {};
  for (const champ of CHAMPIONS) {
    const hit = highlights[champ.id];
    if (hit) {
      table[champ.id] = hit;
      continue;
    }
    const softPower = soft[champ.id];
    if (softPower !== undefined) {
      table[champ.id] = {
        power: softPower,
        presence: Math.max(0.04, Math.min(0.55, softPower / 160)),
      };
      continue;
    }
    table[champ.id] = { ...DEFAULT };
  }
  return table;
}

export function fillPatchStrengthFromMeta(meta: PatchMetaTable): PatchStrengthTable {
  const highlights: Record<string, PatchChampionStrength> = {};
  for (const [championId, entry] of Object.entries(meta)) {
    highlights[championId] = {
      power: entry.power,
      presence: entry.presence,
    };
  }
  return fill(highlights);
}

export const PATCH_STRENGTH_DEMO_A: PatchStrengthTable = fill(
  {
    Garen: { power: 62, presence: 0.28 },
    Renekton: { power: 70, presence: 0.34 },
    Aatrox: { power: 66, presence: 0.3 },
    LeeSin: { power: 72, presence: 0.4 },
    Elise: { power: 68, presence: 0.28 },
    JarvanIV: { power: 64, presence: 0.26 },
    Ahri: { power: 68, presence: 0.32 },
    Annie: { power: 60, presence: 0.22 },
    Orianna: { power: 74, presence: 0.36 },
    Syndra: { power: 66, presence: 0.28 },
    Lucian: { power: 70, presence: 0.34 },
    Kaisa: { power: 52, presence: 0.3 },
    Jinx: { power: 58, presence: 0.22 },
    Ashe: { power: 64, presence: 0.28 },
    Varus: { power: 68, presence: 0.3 },
    Thresh: { power: 72, presence: 0.38 },
    Nautilus: { power: 66, presence: 0.3 },
    Rakan: { power: 62, presence: 0.24 },
    Belveth: { power: 55, presence: 0.16 },
    Smolder: { power: 42, presence: 0.08 },
    Azir: { power: 58, presence: 0.18 },
    Zed: { power: 60, presence: 0.26 },
  },
  {
    Ambessa: 40,
    Aurora: 38,
    Aphelios: 56,
    Ezreal: 60,
    MissFortune: 54,
    Sejuani: 58,
    Maokai: 55,
    Ornn: 57,
    Sion: 50,
    Camille: 58,
    Jax: 52,
    Graves: 60,
    Viego: 58,
    Kindred: 54,
    XinZhao: 56,
    Lulu: 60,
    Alistar: 55,
  },
);

export const PATCH_STRENGTH_DEMO_B: PatchStrengthTable = fill(
  {
    Ambessa: { power: 78, presence: 0.42 },
    Aatrox: { power: 74, presence: 0.36 },
    Jax: { power: 70, presence: 0.3 },
    Camille: { power: 72, presence: 0.32 },
    Belveth: { power: 80, presence: 0.38 },
    Viego: { power: 72, presence: 0.34 },
    Kindred: { power: 68, presence: 0.28 },
    Sejuani: { power: 70, presence: 0.3 },
    Maokai: { power: 66, presence: 0.26 },
    Aurora: { power: 76, presence: 0.36 },
    Ahri: { power: 70, presence: 0.32 },
    Azir: { power: 74, presence: 0.34 },
    Orianna: { power: 68, presence: 0.28 },
    Syndra: { power: 64, presence: 0.24 },
    Zed: { power: 58, presence: 0.2 },
    Smolder: { power: 78, presence: 0.4 },
    Jinx: { power: 76, presence: 0.36 },
    Aphelios: { power: 72, presence: 0.3 },
    Kaisa: { power: 46, presence: 0.18 },
    Lucian: { power: 55, presence: 0.2 },
    Ashe: { power: 60, presence: 0.22 },
    Ezreal: { power: 58, presence: 0.24 },
    Rakan: { power: 74, presence: 0.34 },
    Lulu: { power: 72, presence: 0.32 },
    Nautilus: { power: 68, presence: 0.3 },
    Thresh: { power: 62, presence: 0.26 },
    Renekton: { power: 52, presence: 0.16 },
    Garen: { power: 48, presence: 0.12 },
    LeeSin: { power: 60, presence: 0.28 },
    Elise: { power: 50, presence: 0.14 },
    Annie: { power: 48, presence: 0.12 },
    Varus: { power: 64, presence: 0.26 },
    MissFortune: { power: 66, presence: 0.28 },
    Ornn: { power: 70, presence: 0.3 },
    Sion: { power: 68, presence: 0.28 },
  },
  {
    Graves: 62,
    JarvanIV: 58,
    XinZhao: 52,
    Alistar: 60,
    Blitzcrank: 48,
  },
);

export function patchMultiplier(power: number): number {
  return 0.82 + (power / 100) * 0.4;
}

export function getPatchStrength(
  table: PatchStrengthTable,
  championId: string,
): PatchChampionStrength {
  return table[championId] ?? DEFAULT;
}
