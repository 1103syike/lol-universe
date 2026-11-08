import type {
  EconomyRules,
  MinionWaveRules,
  MonsterCampDefinition,
  ObjectiveRules,
  StructureDefinition,
} from './version-pack';
import { applyMapPoint, DEFAULT_MAP_LAYOUT } from './map-layout';


export function buildMinionRules(bias = 0): MinionWaveRules {
  return {
    firstSpawnSec: 30,
    intervalSec: 30,
    meleeHp: 520 + bias,
    meleeAd: 10,
    meleeGold: 19,
    casterHp: 320 + bias,
    casterAd: 20,
    casterGold: 15,
    cannonHp: 980 + bias,
    cannonAd: 36,
    cannonGold: 65,
    cannonEveryNWaves: 3,
    moveSpeed: 325,
    attackRange: 110,
    attackIntervalSec: 1.0,
  };
}

export function waveIntervalSec(timeSec: number): number {
  if (timeSec >= 30 * 60) {
    return 20;
  }
  if (timeSec >= 14 * 60) {
    return 25;
  }
  return 30;
}

export function shouldSpawnCannon(timeSec: number, waveIndex: number): boolean {
  if (waveIndex < 3) {
    return false;
  }
  if (timeSec >= 25 * 60) {
    return true;
  }
  if (timeSec >= 14 * 60) {
    return (waveIndex - 3) % 2 === 0;
  }
  return waveIndex % 3 === 0;
}

export function buildMonsters(): MonsterCampDefinition[] {
  const camps: MonsterCampDefinition[] = [
    {
      id: 'blue_buff',
      name: 'Blue Sentinel',
      side: 'blue',
      position: { x: 3800, y: 7800 },
      firstSpawnSec: 90,
      respawnSec: 300,
      hp: 2100,
      ad: 70,
      gold: 100,
      exp: 110,
    },
    {
      id: 'red_buff',
      name: 'Red Brambleback',
      side: 'blue',
      position: { x: 7600, y: 4000 },
      firstSpawnSec: 90,
      respawnSec: 300,
      hp: 2100,
      ad: 80,
      gold: 100,
      exp: 110,
    },
    {
      id: 'gromp',
      name: 'Gromp',
      side: 'blue',
      position: { x: 2200, y: 8400 },
      firstSpawnSec: 102,
      respawnSec: 135,
      hp: 1800,
      ad: 75,
      gold: 105,
      exp: 100,
    },
    {
      id: 'wolves',
      name: 'Murk Wolves',
      side: 'blue',
      position: { x: 3800, y: 6200 },
      firstSpawnSec: 90,
      respawnSec: 135,
      hp: 1300,
      ad: 40,
      gold: 95,
      exp: 95,
    },
    {
      id: 'raptors',
      name: 'Raptors',
      side: 'blue',
      position: { x: 6900, y: 5200 },
      firstSpawnSec: 90,
      respawnSec: 135,
      hp: 1200,
      ad: 35,
      gold: 95,
      exp: 95,
    },
    {
      id: 'krugs',
      name: 'Krugs',
      side: 'blue',
      position: { x: 8400, y: 2500 },
      firstSpawnSec: 102,
      respawnSec: 135,
      hp: 1600,
      ad: 60,
      gold: 110,
      exp: 105,
    },
    {
      id: 'red_blue_buff',
      name: 'Blue Sentinel',
      side: 'red',
      position: { x: 11200, y: 7200 },
      firstSpawnSec: 90,
      respawnSec: 300,
      hp: 2100,
      ad: 70,
      gold: 100,
      exp: 110,
    },
    {
      id: 'red_red_buff',
      name: 'Red Brambleback',
      side: 'red',
      position: { x: 7400, y: 11000 },
      firstSpawnSec: 90,
      respawnSec: 300,
      hp: 2100,
      ad: 80,
      gold: 100,
      exp: 110,
    },
    {
      id: 'red_gromp',
      name: 'Gromp',
      side: 'red',
      position: { x: 12800, y: 6600 },
      firstSpawnSec: 102,
      respawnSec: 135,
      hp: 1800,
      ad: 75,
      gold: 105,
      exp: 100,
    },
    {
      id: 'red_wolves',
      name: 'Murk Wolves',
      side: 'red',
      position: { x: 11200, y: 8800 },
      firstSpawnSec: 90,
      respawnSec: 135,
      hp: 1300,
      ad: 40,
      gold: 95,
      exp: 95,
    },
    {
      id: 'red_raptors',
      name: 'Raptors',
      side: 'red',
      position: { x: 8100, y: 9800 },
      firstSpawnSec: 90,
      respawnSec: 135,
      hp: 1200,
      ad: 35,
      gold: 95,
      exp: 95,
    },
    {
      id: 'red_krugs',
      name: 'Krugs',
      side: 'red',
      position: { x: 6600, y: 12500 },
      firstSpawnSec: 102,
      respawnSec: 135,
      hp: 1600,
      ad: 60,
      gold: 110,
      exp: 105,
    },
    {
      id: 'scuttle_top',
      name: 'Rift Scuttler Top',
      side: 'neutral',
      position: { x: 4400, y: 9600 },
      firstSpawnSec: 210,
      respawnSec: 150,
      hp: 1200,
      ad: 0,
      gold: 90,
      exp: 40,
    },
    {
      id: 'scuttle_bot',
      name: 'Rift Scuttler Bot',
      side: 'neutral',
      position: { x: 10500, y: 5200 },
      firstSpawnSec: 210,
      respawnSec: 150,
      hp: 1200,
      ad: 0,
      gold: 90,
      exp: 40,
    },
    {
      id: 'dragon',
      name: 'Dragon',
      side: 'neutral',
      position: { x: 9866, y: 4414 },
      firstSpawnSec: 300,
      respawnSec: 300,
      hp: 6000,
      ad: 110,
      gold: 25,
      exp: 0,
    },
    {
      id: 'herald',
      name: 'Rift Herald',
      side: 'neutral',
      position: { x: 4950, y: 10420 },
      firstSpawnSec: 480,
      respawnSec: 360,
      hp: 7000,
      ad: 120,
      gold: 0,
      exp: 0,
    },
    {
      id: 'baron',
      name: 'Baron Nashor',
      side: 'neutral',
      position: { x: 5007, y: 10471 },
      firstSpawnSec: 1200,
      respawnSec: 360,
      hp: 12000,
      ad: 180,
      gold: 300,
      exp: 0,
    },
  ];

  for (const camp of camps) {
    if (camp.id === 'dragon') {
      camp.position = { ...DEFAULT_MAP_LAYOUT.objectives.dragon };
      continue;
    }
    if (camp.id === 'baron') {
      camp.position = { ...DEFAULT_MAP_LAYOUT.objectives.baron };
      continue;
    }
    if (camp.id === 'herald') {
      camp.position = { ...DEFAULT_MAP_LAYOUT.objectives.herald };
      continue;
    }
    camp.position = applyMapPoint(DEFAULT_MAP_LAYOUT.camps, camp.id, camp.position);
  }
  return camps;
}

export function buildStructures(): StructureDefinition[] {
  const structures: StructureDefinition[] = [
    {
      id: 'blue_top_outer',
      kind: 'outer_tower',
      side: 'blue',
      lane: 'top',
      position: { x: 1650, y: 10550 },
      hp: 4000,
      ad: 160,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_mid_outer',
      kind: 'outer_tower',
      side: 'blue',
      lane: 'mid',
      position: { x: 5840, y: 6040 },
      hp: 4000,
      ad: 160,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_bot_outer',
      kind: 'outer_tower',
      side: 'blue',
      lane: 'bot',
      position: { x: 10550, y: 1650 },
      hp: 4000,
      ad: 160,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_top_inner',
      kind: 'inner_tower',
      side: 'blue',
      lane: 'top',
      position: { x: 2100, y: 7050 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_mid_inner',
      kind: 'inner_tower',
      side: 'blue',
      lane: 'mid',
      position: { x: 4550, y: 4700 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_bot_inner',
      kind: 'inner_tower',
      side: 'blue',
      lane: 'bot',
      position: { x: 7350, y: 2100 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_top_inhib_tower',
      kind: 'inhib_tower',
      side: 'blue',
      lane: 'top',
      position: { x: 2150, y: 4550 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_mid_inhib_tower',
      kind: 'inhib_tower',
      side: 'blue',
      lane: 'mid',
      position: { x: 3450, y: 3550 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_bot_inhib_tower',
      kind: 'inhib_tower',
      side: 'blue',
      lane: 'bot',
      position: { x: 4550, y: 2150 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'blue_inhib_top',
      kind: 'inhibitor',
      side: 'blue',
      lane: 'top',
      position: { x: 2050, y: 3850 },
      hp: 4000,
      ad: 0,
      range: 0,
      gold: 50,
    },
    {
      id: 'blue_inhib_mid',
      kind: 'inhibitor',
      side: 'blue',
      lane: 'mid',
      position: { x: 3050, y: 3100 },
      hp: 4000,
      ad: 0,
      range: 0,
      gold: 50,
    },
    {
      id: 'blue_inhib_bot',
      kind: 'inhibitor',
      side: 'blue',
      lane: 'bot',
      position: { x: 3850, y: 2050 },
      hp: 4000,
      ad: 0,
      range: 0,
      gold: 50,
    },
    {
      id: 'blue_nexus_t1',
      kind: 'nexus_tower',
      side: 'blue',
      position: { x: 2150, y: 2650 },
      hp: 3400,
      ad: 180,
      range: 750,
      gold: 50,
    },
    {
      id: 'blue_nexus_t2',
      kind: 'nexus_tower',
      side: 'blue',
      position: { x: 2650, y: 2150 },
      hp: 3400,
      ad: 180,
      range: 750,
      gold: 50,
    },
    {
      id: 'blue_nexus',
      kind: 'nexus',
      side: 'blue',
      position: { x: 1950, y: 1950 },
      hp: 6800,
      ad: 0,
      range: 0,
      gold: 50,
    },
    {
      id: 'red_top_outer',
      kind: 'outer_tower',
      side: 'red',
      lane: 'top',
      position: { x: 4750, y: 13100 },
      hp: 4000,
      ad: 160,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_mid_outer',
      kind: 'outer_tower',
      side: 'red',
      lane: 'mid',
      position: { x: 8960, y: 8960 },
      hp: 4000,
      ad: 160,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_bot_outer',
      kind: 'outer_tower',
      side: 'red',
      lane: 'bot',
      position: { x: 13100, y: 4750 },
      hp: 4000,
      ad: 160,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_top_inner',
      kind: 'inner_tower',
      side: 'red',
      lane: 'top',
      position: { x: 7950, y: 12900 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_mid_inner',
      kind: 'inner_tower',
      side: 'red',
      lane: 'mid',
      position: { x: 10300, y: 10300 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_bot_inner',
      kind: 'inner_tower',
      side: 'red',
      lane: 'bot',
      position: { x: 12900, y: 7950 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_top_inhib_tower',
      kind: 'inhib_tower',
      side: 'red',
      lane: 'top',
      position: { x: 10450, y: 12850 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_mid_inhib_tower',
      kind: 'inhib_tower',
      side: 'red',
      lane: 'mid',
      position: { x: 11450, y: 11450 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_bot_inhib_tower',
      kind: 'inhib_tower',
      side: 'red',
      lane: 'bot',
      position: { x: 12850, y: 10450 },
      hp: 3300,
      ad: 170,
      range: 750,
      gold: 150,
    },
    {
      id: 'red_inhib_top',
      kind: 'inhibitor',
      side: 'red',
      lane: 'top',
      position: { x: 11150, y: 12950 },
      hp: 4000,
      ad: 0,
      range: 0,
      gold: 50,
    },
    {
      id: 'red_inhib_mid',
      kind: 'inhibitor',
      side: 'red',
      lane: 'mid',
      position: { x: 11900, y: 11900 },
      hp: 4000,
      ad: 0,
      range: 0,
      gold: 50,
    },
    {
      id: 'red_inhib_bot',
      kind: 'inhibitor',
      side: 'red',
      lane: 'bot',
      position: { x: 12950, y: 11150 },
      hp: 4000,
      ad: 0,
      range: 0,
      gold: 50,
    },
    {
      id: 'red_nexus_t1',
      kind: 'nexus_tower',
      side: 'red',
      position: { x: 12350, y: 12850 },
      hp: 3400,
      ad: 180,
      range: 750,
      gold: 50,
    },
    {
      id: 'red_nexus_t2',
      kind: 'nexus_tower',
      side: 'red',
      position: { x: 13000, y: 13000 },
      hp: 3400,
      ad: 180,
      range: 750,
      gold: 50,
    },
    {
      id: 'red_nexus',
      kind: 'nexus',
      side: 'red',
      position: { x: 13200, y: 13500 },
      hp: 6800,
      ad: 0,
      range: 0,
      gold: 50,
    },
  ];

  for (const structure of structures) {
    structure.position = applyMapPoint(
      DEFAULT_MAP_LAYOUT.structures,
      structure.id,
      structure.position,
    );
    if (structure.kind === 'outer_tower') {
      structure.hp = 3200;
    } else if (structure.kind === 'inner_tower') {
      structure.hp = 2800;
    } else if (structure.kind === 'inhib_tower') {
      structure.hp = 2900;
    }
  }
  return structures;
}

export function buildObjectives(): ObjectiveRules {
  return {
    dragonFirstSpawnSec: 300,
    dragonRespawnSec: 300,
    heraldSpawnSec: 480,
    heraldDespawnSec: 1195,
    baronSpawnSec: 1200,
    baronRespawnSec: 360,
    dragonPosition: { ...DEFAULT_MAP_LAYOUT.objectives.dragon },
    baronPosition: { ...DEFAULT_MAP_LAYOUT.objectives.baron },
    heraldPosition: { ...DEFAULT_MAP_LAYOUT.objectives.herald },
  };
}

export function buildEconomy(startGold = 500): EconomyRules {
  return {
    startingGold: startGold,
    passiveGoldPerSec: 2.04,
    killGold: 270,
    assistGold: 130,
    xpPerLevel: [0, 280, 660, 1140, 1720, 2400, 3180, 4060, 5040, 6120, 7300, 8580, 9960, 11440, 13020, 14700, 16480, 18360],
  };
}
