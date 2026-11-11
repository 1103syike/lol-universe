import type { PatchStageId, PatchVersion } from '../../core/models/patch.model';
import { PATCH_STAGE_LABELS } from '../../core/models/patch.model';
import {
  PATCH_META_2021_MSI,
  PATCH_META_2021_SPRING,
  PATCH_META_2021_SUMMER,
  PATCH_META_2021_WORLDS,
} from '../../core/data/patch-meta-2021';
import type { PatchMetaTable } from '../../core/models/patch.model';

const PATCHES_2021: readonly PatchVersion[] = [
  {
    id: '2021-spring',
    year: 2021,
    stage: 'spring-regular',
    riotPatch: '11.5',
    label: `2021 ${PATCH_STAGE_LABELS['spring-regular']}`,
    startsOn: '2021-01-01',
    endsOn: '2021-05-05',
  },
  {
    id: '2021-msi',
    year: 2021,
    stage: 'msi',
    riotPatch: '11.9',
    label: `2021 ${PATCH_STAGE_LABELS.msi}`,
    startsOn: '2021-05-06',
    endsOn: '2021-05-23',
  },
  {
    id: '2021-summer',
    year: 2021,
    stage: 'summer-regular',
    riotPatch: '11.14',
    label: `2021 ${PATCH_STAGE_LABELS['summer-regular']}`,
    startsOn: '2021-05-24',
    endsOn: '2021-10-04',
  },
  {
    id: '2021-worlds',
    year: 2021,
    stage: 'worlds',
    riotPatch: '11.19',
    label: `2021 ${PATCH_STAGE_LABELS.worlds}`,
    startsOn: '2021-10-05',
    endsOn: '2021-12-31',
  },
];

const META_BY_PATCH_ID: Record<string, PatchMetaTable> = {
  '2021-spring': PATCH_META_2021_SPRING,
  '2021-msi': PATCH_META_2021_MSI,
  '2021-summer': PATCH_META_2021_SUMMER,
  '2021-worlds': PATCH_META_2021_WORLDS,
};

const DEFAULT_META: ChampionMetaSoft = {
  presence: 0.02,
  pickRate: 0.01,
  banRate: 0.005,
  winRate: 0.48,
  power: 28,
};

type ChampionMetaSoft = {
  presence: number;
  pickRate: number;
  banRate: number;
  winRate: number;
  power: number;
};

function stageWindowsForYear(year: number): readonly PatchVersion[] {
  if (year === 2021) {
    return PATCHES_2021;
  }
  return [
    {
      id: `${year}-spring`,
      year,
      stage: 'spring-regular',
      riotPatch: '11.5',
      label: `${year} ${PATCH_STAGE_LABELS['spring-regular']}`,
      startsOn: `${year}-01-01`,
      endsOn: `${year}-05-05`,
    },
    {
      id: `${year}-msi`,
      year,
      stage: 'msi',
      riotPatch: '11.9',
      label: `${year} ${PATCH_STAGE_LABELS.msi}`,
      startsOn: `${year}-05-06`,
      endsOn: `${year}-05-23`,
    },
    {
      id: `${year}-summer`,
      year,
      stage: 'summer-regular',
      riotPatch: '11.14',
      label: `${year} ${PATCH_STAGE_LABELS['summer-regular']}`,
      startsOn: `${year}-05-24`,
      endsOn: `${year}-10-04`,
    },
    {
      id: `${year}-worlds`,
      year,
      stage: 'worlds',
      riotPatch: '11.19',
      label: `${year} ${PATCH_STAGE_LABELS.worlds}`,
      startsOn: `${year}-10-05`,
      endsOn: `${year}-12-31`,
    },
  ];
}

function mapStageTo2021(stage: PatchStageId): string {
  switch (stage) {
    case 'spring-regular':
      return '2021-spring';
    case 'msi':
      return '2021-msi';
    case 'summer-regular':
      return '2021-summer';
    case 'worlds':
      return '2021-worlds';
  }
}

export function resolvePatchVersion(dateIso: string | null | undefined): PatchVersion {
  const raw = (dateIso ?? '2021-01-13').slice(0, 10);
  const year = Number(raw.slice(0, 4)) || 2021;
  const windows = stageWindowsForYear(year);
  for (const patch of windows) {
    if (raw >= patch.startsOn && raw <= patch.endsOn) {
      return patch;
    }
  }
  return windows[0];
}

export function resolvePatchMeta(patch: PatchVersion): PatchMetaTable {
  if (META_BY_PATCH_ID[patch.id]) {
    return META_BY_PATCH_ID[patch.id];
  }
  return META_BY_PATCH_ID[mapStageTo2021(patch.stage)] ?? PATCH_META_2021_SPRING;
}

export function championMetaOf(
  meta: PatchMetaTable,
  championId: string,
): ChampionMetaSoft {
  return meta[championId] ?? DEFAULT_META;
}

export function hasChampionMetaEntry(
  meta: PatchMetaTable,
  championId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(meta, championId);
}

export function listPatchVersions(year = 2021): readonly PatchVersion[] {
  return stageWindowsForYear(year);
}
