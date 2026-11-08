export const PATCH_STAGE_IDS = [
  'spring-regular',
  'msi',
  'summer-regular',
  'worlds',
] as const;

export type PatchStageId = (typeof PATCH_STAGE_IDS)[number];

export const PATCH_STAGE_LABELS: Record<PatchStageId, string> = {
  'spring-regular': '春季例行賽',
  msi: 'MSI',
  'summer-regular': '夏季例行賽',
  worlds: '世界賽',
};

export interface PatchVersion {
  id: string;
  year: number;
  stage: PatchStageId;
  riotPatch: string;
  label: string;
  startsOn: string;
  endsOn: string;
}

export interface ChampionMetaEntry {
  presence: number;
  pickRate: number;
  banRate: number;
  winRate: number;
  power: number;
}

export type PatchMetaTable = Readonly<Record<string, ChampionMetaEntry>>;

export const COMP_INTENTS = [
  'poke',
  'teamfight',
  'late',
  'early',
  'split',
  'balanced',
] as const;

export type CompIntent = (typeof COMP_INTENTS)[number];

export const COMP_INTENT_LABELS: Record<CompIntent, string> = {
  poke: '消耗陣',
  teamfight: '打團陣',
  late: '後期陣',
  early: '前期陣',
  split: '單帶陣',
  balanced: '均衡陣',
};
