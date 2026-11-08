import type { AbilitySlot, CampId, ChampionId, ImplementationStatus, ItemId, LaneId } from '../types/ids';

export interface Vec2 {
  x: number;
  y: number;
}

export interface AbilityDefinition {
  slot: AbilitySlot;
  name: string;
  cooldownSec: number;
  manaCost: number;
  range: number;
  damageBase: number;
  damagePerLevel: number;
  damageType: 'physical' | 'magic' | 'true';
  tags: readonly string[];
  implementationStatus: ImplementationStatus;
}

export interface ChampionIdentity {
  laning: number;
  skirmish: number;
  teamfight: number;
  closeout: number;
  splitPush: number;
  gankThreat: number;
  objective: number;
  waveClear: number;
  mobility: number;
  engage: number;
  peel: number;
  early: number;
  mid: number;
  late: number;
}

export interface ChampionDefinition {
  id: ChampionId;
  name: string;
  tags: readonly string[];
  primaryDamage: 'physical' | 'magic';
  baseHp: number;
  hpPerLevel: number;
  baseMana: number;
  manaPerLevel: number;
  baseAd: number;
  adPerLevel: number;
  baseArmor: number;
  armorPerLevel: number;
  baseMr: number;
  mrPerLevel: number;
  moveSpeed: number;
  attackRange: number;
  attackSpeed: number;
  abilities: readonly AbilityDefinition[];
  implementationStatus: ImplementationStatus;
  identity: ChampionIdentity;
}

export interface PatchChampionStrength {
  power: number;
  presence: number;
}

export type PatchStrengthTable = Readonly<Record<string, PatchChampionStrength>>;

export interface ItemDefinition {
  id: ItemId;
  name: string;
  nameZh?: string;
  key?: number;
  spriteIndex?: number;
  cost: number;
  combineCost: number;
  purchasable: boolean;
  buildsFrom: readonly ItemId[];
  buildsInto?: readonly ItemId[];
  tags: readonly string[];
  ad: number;
  ap: number;
  hp: number;
  mana: number;
  armor: number;
  mr: number;
  attackSpeed: number;
  moveSpeed: number;
  crit?: number;
  lifeSteal?: number;
  hpRegen?: number;
  manaRegen?: number;
}

export interface MinionWaveRules {
  firstSpawnSec: number;
  intervalSec: number;
  meleeHp: number;
  meleeAd: number;
  meleeGold: number;
  casterHp: number;
  casterAd: number;
  casterGold: number;
  cannonHp: number;
  cannonAd: number;
  cannonGold: number;
  cannonEveryNWaves: number;
  moveSpeed: number;
  attackRange: number;
  attackIntervalSec: number;
}

export interface MonsterCampDefinition {
  id: CampId;
  name: string;
  side: 'blue' | 'red' | 'neutral';
  position: Vec2;
  firstSpawnSec: number;
  respawnSec: number;
  hp: number;
  ad: number;
  gold: number;
  exp: number;
}

export interface StructureDefinition {
  id: string;
  kind: 'outer_tower' | 'inner_tower' | 'inhib_tower' | 'nexus_tower' | 'inhibitor' | 'nexus';
  side: 'blue' | 'red';
  lane?: LaneId;
  position: Vec2;
  hp: number;
  ad: number;
  range: number;
  gold: number;
}

export interface ObjectiveRules {
  dragonFirstSpawnSec: number;
  dragonRespawnSec: number;
  heraldSpawnSec: number;
  heraldDespawnSec: number;
  baronSpawnSec: number;
  baronRespawnSec: number;
  dragonPosition: Vec2;
  baronPosition: Vec2;
  heraldPosition: Vec2;
}

export interface EconomyRules {
  startingGold: number;
  passiveGoldPerSec: number;
  killGold: number;
  assistGold: number;
  xpPerLevel: readonly number[];
}

export interface MapDefinition {
  width: number;
  height: number;
  cellSize: number;
  walkable: ReadonlyArray<ReadonlyArray<0 | 1>>;
  bushes: readonly Vec2[];
  blueFountain: Vec2;
  redFountain: Vec2;
  lanePaths: Record<LaneId, readonly Vec2[]>;
}

export interface VersionManifest {
  id: string;
  riotPatch: string;
  label: string;
  createdAt: string;
  checksum: string;
  schemaVersion: number;
}

export interface VersionPack {
  manifest: VersionManifest;
  champions: Readonly<Record<string, ChampionDefinition>>;
  items: Readonly<Record<string, ItemDefinition>>;
  minions: MinionWaveRules;
  monsters: readonly MonsterCampDefinition[];
  structures: readonly StructureDefinition[];
  objectives: ObjectiveRules;
  economy: EconomyRules;
  map: MapDefinition;
  patchStrength: PatchStrengthTable;
}
