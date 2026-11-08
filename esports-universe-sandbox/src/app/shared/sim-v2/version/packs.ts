import { buildCanonicalMap } from './build-map';
import { buildChampionTable } from './champion-factory';
import { buildItemTable } from './item-table';
import { PATCH_STRENGTH_DEMO_A, PATCH_STRENGTH_DEMO_B } from './patch-strength';
import {
  buildEconomy,
  buildMinionRules,
  buildMonsters,
  buildObjectives,
  buildStructures,
} from './shared-content';
import type { VersionPack } from './version-pack';

function checksum(id: string, riotPatch: string): string {
  return `sha:${id}:${riotPatch}`;
}

export const VERSION_PACK_DEMO_A: VersionPack = {
  manifest: {
    id: 'demo-a',
    riotPatch: '14.1',
    label: 'Demo A (14.1)',
    createdAt: '2024-01-10',
    checksum: checksum('demo-a', '14.1'),
    schemaVersion: 1,
  },
  champions: buildChampionTable(
    [
      'Garen',
      'Ashe',
      'Annie',
      'LeeSin',
      'Thresh',
      'Ahri',
      'Jinx',
      'Aatrox',
      'Jayce',
      'Camille',
      'Darius',
      'Ezreal',
      'Syndra',
      'Orianna',
      'Zed',
      'Kennen',
      'Renekton',
      'Jhin',
      'Lux',
      'Nautilus',
      'Leona',
      'Graves',
      'Viego',
    ],
    0,
  ),
  items: buildItemTable(),
  minions: buildMinionRules(0),
  monsters: buildMonsters(),
  structures: buildStructures(),
  objectives: buildObjectives(),
  economy: buildEconomy(500),
  map: buildCanonicalMap(),
  patchStrength: PATCH_STRENGTH_DEMO_A,
};

export const VERSION_PACK_DEMO_B: VersionPack = {
  manifest: {
    id: 'demo-b',
    riotPatch: '14.24',
    label: 'Demo B (14.24)',
    createdAt: '2024-12-01',
    checksum: checksum('demo-b', '14.24'),
    schemaVersion: 1,
  },
  champions: buildChampionTable(
    [
      'Garen',
      'Ashe',
      'Annie',
      'LeeSin',
      'Thresh',
      'Jinx',
      'Ahri',
      'Orianna',
      'Zed',
      'Aatrox',
      'Jayce',
      'Camille',
      'Darius',
      'Ezreal',
      'Syndra',
      'Kennen',
      'Renekton',
      'Jhin',
      'Lux',
      'Nautilus',
      'Leona',
      'Graves',
      'Viego',
    ],
    40,
  ),
  items: buildItemTable(),

  minions: buildMinionRules(20),
  monsters: buildMonsters(),
  structures: buildStructures(),
  objectives: {
    ...buildObjectives(),
    dragonFirstSpawnSec: 300,
    baronSpawnSec: 1200,
  },
  economy: buildEconomy(500),
  map: buildCanonicalMap(),
  patchStrength: PATCH_STRENGTH_DEMO_B,
};

export const ALL_VERSION_PACKS: readonly VersionPack[] = [VERSION_PACK_DEMO_A, VERSION_PACK_DEMO_B];
