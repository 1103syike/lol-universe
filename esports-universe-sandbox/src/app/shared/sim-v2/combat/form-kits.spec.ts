import { describe, expect, it } from 'vitest';
import { getForm, setForm, toggleForm } from './form-kits';
import type { ChampionEntity } from '../state/entities';

function stubChampion(): ChampionEntity {
  return {
    id: 'c1',
    kind: 'champion',
    teamId: 'blue',
    side: 'blue',
    playerId: 'p1',
    gamertag: 'test',
    positionLabel: 'MID',
    assignedLane: 'mid',
    championId: 'Jayce',
    position: { x: 0, y: 0 },
    path: [],
    moving: false,
    level: 6,
    exp: 0,
    gold: 500,
    earnedGold: 500,
    hp: 600,
    maxHp: 600,
    mana: 300,
    maxMana: 300,
    ad: 70,
    ap: 0,
    armor: 30,
    mr: 30,
    moveSpeed: 335,
    attackRange: 125,
    attackSpeed: 0.66,
    nextAttackAt: 0,
    nextSmiteAt: 0,
    alive: true,
    respawnAt: 0,
    items: [],
    shopPlan: null,
    abilities: [],
    summonerSpells: [],
    teleportDestination: null,
    statuses: [],
    cs: 0,
    supportSharedRichesCharges: 0,
    supportSharedRichesNextAt: 0,
    kills: 0,
    deaths: 0,
    assists: 0,
    damageDealt: 0,
    damageToChampions: 0,
    damageTaken: 0,
    damageTakenFromChampions: 0,
    healingDone: 0,
    visionScore: 0,
    wardStock: 0,
    nextWardChargeAt: 0,
    controlWardReady: false,
    wardsPlaced: 0,
    currentAction: 'idle',
    recallPhase: 'none',
    recallChannelUntil: 0,
    recallChannelDuration: 0,
    recallHpSnapshot: 0,
    recallCount: 0,
    activitySec: {
      lane: 0,
      jungle: 0,
      fight: 0,
      recallTravel: 0,
      recallBase: 0,
      other: 0,
    },
    campKills: 0,
    junglePetFirstLargeClaimed: false,
    goldBySource: {},
    expBySource: {},
    levelSamples: [],
    threatTable: {},
    knownEnemyPositions: {},
    skills: {
      laning: 70,
      mechanics: 70,
      teamfighting: 70,
      gameSense: 70,
      consistency: 70,
      adaptability: 70,
    },
  };
}

describe('form kits', () => {
  it('toggles Jayce hammer/cannon and updates range', () => {
    const champ = stubChampion();
    expect(getForm(champ, 'Jayce')).toBe('a');
    setForm(champ, 'a', { a: 125, b: 500 }, 'Jayce');
    expect(champ.attackRange).toBe(125);
    expect(toggleForm(champ, { a: 125, b: 500 }, 'Jayce')).toBe('b');
    expect(champ.attackRange).toBe(500);
    expect(toggleForm(champ, { a: 125, b: 500 }, 'Jayce')).toBe('a');
    expect(champ.attackRange).toBe(125);
  });
});
