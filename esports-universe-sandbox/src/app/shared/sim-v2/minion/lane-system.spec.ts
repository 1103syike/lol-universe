import { describe, expect, it } from 'vitest';
import { applyDamage, damageDrawsMinionCallForHelp } from '../combat/damage';
import { createMatch } from '../engine';
import { minionAttackStructure } from '../objectives/structures';
import { minionRawDamageToChampion, tickMinions } from './lane-system';

function roster(side: 'b' | 'r', bots: string[]) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: bots[index],
    laning: 70,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 70,
    adaptability: 70,
  }));
}

function makeMinion(
  overrides: Partial<{
    id: string;
    side: 'blue' | 'red';
    lane: 'top' | 'mid' | 'bot';
    role: 'melee' | 'caster' | 'cannon' | 'super';
    x: number;
    y: number;
    ad: number;
    attackRange: number;
  }>,
) {
  return {
    id: overrides.id ?? 'minion',
    kind: 'minion' as const,
    side: overrides.side ?? 'blue',
    lane: overrides.lane ?? 'mid',
    role: overrides.role ?? 'melee',
    position: { x: overrides.x ?? 5000, y: overrides.y ?? 5000 },
    pathIndex: 0,
    hp: 500,
    maxHp: 500,
    ad: overrides.ad ?? 40,
    moveSpeed: 325,
    attackRange: overrides.attackRange ?? 110,
    nextAttackAt: 0,
    alive: true,
    gold: 21,
    targetId: null,
    aggroUntil: 0,
    aggroAnchor: null,
  };
}

describe('minion call-for-help', () => {
  it('does not free-aggro a champion standing nearby without call-for-help', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 3,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    garen.position = { x: 5000, y: 5000 };
    garen.threatTable = {};
    garen.hp = garen.maxHp;
    state.minions = [makeMinion({ id: 'blue_melee', x: 5050, y: 5000, ad: 40 })];
    const hpBefore = garen.hp;
    tickMinions(state, 0.25);
    expect(garen.hp).toBe(hpBefore);
  });

  it('ally minions lock the attacker after champ-to-champ damage', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 5,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    aatrox.position = { x: 5000, y: 5000 };
    garen.position = { x: 5200, y: 5000 };
    aatrox.hp = aatrox.maxHp;
    garen.hp = garen.maxHp;
    garen.threatTable = {};
    aatrox.threatTable = {};
    state.minions = [
      makeMinion({
        id: 'red_caster',
        side: 'red',
        role: 'caster',
        x: 5150,
        y: 5000,
        ad: 21,
        attackRange: 550,
      }),
    ];
    applyDamage(state, aatrox, garen, 40, 'physical', undefined, 'auto');
    const attackerHpBefore = aatrox.hp;
    tickMinions(state, 0.25);
    expect(aatrox.hp).toBeLessThan(attackerHpBefore);
    expect(state.minions[0].targetId).toBe(aatrox.id);
  });

  it('does not call for help from skillshot damage', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 8,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Ornn', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Aatrox', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const ornn = state.champions.find((champ) => champ.championId === 'Ornn')!;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    ornn.position = { x: 5000, y: 5000 };
    aatrox.position = { x: 5200, y: 5000 };
    ornn.threatTable = {};
    aatrox.threatTable = {};
    state.minions = [
      makeMinion({
        id: 'red_caster',
        side: 'red',
        role: 'caster',
        x: 5150,
        y: 5000,
        ad: 21,
        attackRange: 550,
      }),
    ];
    expect(damageDrawsMinionCallForHelp('Ornn:Q')).toBe(false);
    expect(damageDrawsMinionCallForHelp('Annie:Q')).toBe(true);
    expect(damageDrawsMinionCallForHelp('auto')).toBe(true);
    applyDamage(state, ornn, aatrox, 40, 'physical', undefined, 'Ornn:Q');
    expect(aatrox.threatTable[ornn.id]?.callHelp).toBeFalsy();
    const hpBefore = ornn.hp;
    tickMinions(state, 0.25);
    expect(ornn.hp).toBe(hpBefore);
    expect(state.minions[0].targetId).toBeNull();
  });

  it('stops chasing a champion after leash distance from aggro anchor', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 11,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    aatrox.position = { x: 5000, y: 5000 };
    garen.position = { x: 5200, y: 5000 };
    const red = makeMinion({
      id: 'red_melee',
      side: 'red',
      x: 5100,
      y: 5000,
      ad: 12,
      attackRange: 110,
    });
    state.minions = [red];
    applyDamage(state, aatrox, garen, 30, 'physical', undefined, 'auto');
    tickMinions(state, 0.25);
    expect(red.targetId).toBe(aatrox.id);
    expect(red.aggroAnchor).toBeTruthy();

    const start = { x: 5100, y: 5000 };
    let dropped = false;
    let chasedWhileAggro = 0;
    for (let i = 0; i < 64; i += 1) {
      aatrox.position = {
        x: red.position.x + 420,
        y: red.position.y,
      };
      const hadAggro = red.targetId === aatrox.id;
      const before = { ...red.position };
      red.nextAttackAt = 0;
      tickMinions(state, 0.25);
      if (hadAggro && red.targetId) {
        chasedWhileAggro = Math.max(
          chasedWhileAggro,
          Math.hypot(red.position.x - start.x, red.position.y - start.y),
        );
      }
      if (hadAggro && !red.targetId) {
        dropped = true;
        chasedWhileAggro = Math.max(
          chasedWhileAggro,
          Math.hypot(before.x - start.x, before.y - start.y),
        );
        break;
      }
    }
    expect(dropped).toBe(true);
    expect(chasedWhileAggro).toBeGreaterThan(200);
    expect(chasedWhileAggro).toBeLessThanOrEqual(390 + 1);
    expect(red.targetId).toBeNull();
  });

  it('allied minions focus enemy minions that are attacking a champion', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 12,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    aatrox.position = { x: 5000, y: 5000 };
    const attacker = makeMinion({
      id: 'red_on_champ',
      side: 'red',
      x: 5050,
      y: 5000,
      ad: 12,
      attackRange: 110,
    });
    attacker.targetId = aatrox.id;
    attacker.aggroUntil = state.scheduler.time + 3;
    attacker.aggroAnchor = { ...attacker.position };
    const idle = makeMinion({
      id: 'red_idle',
      side: 'red',
      x: 5030,
      y: 5020,
      ad: 12,
      attackRange: 110,
    });
    const ally = makeMinion({
      id: 'blue_focus',
      side: 'blue',
      x: 5000,
      y: 5010,
      ad: 40,
      attackRange: 110,
    });
    state.minions = [attacker, idle, ally];
    const idleHp = idle.hp;
    const attackerHp = attacker.hp;
    tickMinions(state, 0.25);
    expect(ally.targetId).toBe(attacker.id);
    expect(attacker.hp).toBeLessThan(attackerHp);
    expect(idle.hp).toBe(idleHp);
  });

  it('drops champion aggro when attacker walks out of acquire range', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 9,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    aatrox.position = { x: 5000, y: 5000 };
    garen.position = { x: 5200, y: 5000 };
    state.minions = [
      makeMinion({
        id: 'red_melee',
        side: 'red',
        x: 5100,
        y: 5000,
        ad: 12,
        attackRange: 110,
      }),
    ];
    applyDamage(state, aatrox, garen, 30, 'physical', undefined, 'auto');
    tickMinions(state, 0.25);
    expect(state.minions[0].targetId).toBe(aatrox.id);

    aatrox.position = { x: 4300, y: 5000 };
    const red = state.minions[0];
    red.nextAttackAt = 0;
    tickMinions(state, 0.25);
    expect(red.targetId).toBeNull();
  });

  it('drops champion aggro after hold window without fresh damage', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 6,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    aatrox.position = { x: 5000, y: 5000 };
    garen.position = { x: 5200, y: 5000 };
    state.minions = [
      makeMinion({
        id: 'red_melee',
        side: 'red',
        x: 5100,
        y: 5000,
        ad: 12,
        attackRange: 110,
      }),
      makeMinion({
        id: 'blue_wave',
        side: 'blue',
        x: 5080,
        y: 5020,
        ad: 12,
        attackRange: 110,
      }),
    ];
    applyDamage(state, aatrox, garen, 30, 'physical', undefined, 'auto');
    tickMinions(state, 0.25);
    expect(state.minions.find((m) => m.id === 'red_melee')!.targetId).toBe(aatrox.id);

    garen.threatTable = {};
    state.scheduler.setTime(state.scheduler.time + 3.2);
    const red = state.minions.find((m) => m.id === 'red_melee')!;
    red.nextAttackAt = 0;
    tickMinions(state, 0.25);
    expect(red.targetId).toBe('blue_wave');
  });

  it('switches from sticky champion to enemy minion attacking an ally', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 21,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    aatrox.position = { x: 5000, y: 5000 };
    garen.position = { x: 5200, y: 5000 };
    const red = makeMinion({
      id: 'red_defender',
      side: 'red',
      x: 5100,
      y: 5000,
      ad: 20,
      attackRange: 110,
    });
    const ally = makeMinion({
      id: 'red_ally',
      side: 'red',
      x: 5080,
      y: 5020,
      ad: 12,
      attackRange: 110,
    });
    const blueWave = makeMinion({
      id: 'blue_siege',
      side: 'blue',
      x: 5120,
      y: 5010,
      ad: 12,
      attackRange: 110,
    });
    blueWave.targetId = ally.id;
    blueWave.aggroUntil = state.scheduler.time + 3;
    state.minions = [red, ally, blueWave];
    applyDamage(state, aatrox, garen, 30, 'physical', undefined, 'auto');
    tickMinions(state, 0.25);
    expect(red.targetId).toBe(aatrox.id);

    garen.threatTable = {};
    red.aggroUntil = state.scheduler.time + 2;
    red.nextAttackAt = 0;
    tickMinions(state, 0.25);
    expect(red.targetId).toBe(blueWave.id);
  });

  it('lets cross-lane minions fight when inside acquire range', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 22,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const mid = makeMinion({
      id: 'blue_mid',
      side: 'blue',
      lane: 'mid',
      x: 5000,
      y: 5000,
      ad: 40,
      attackRange: 110,
    });
    const bot = makeMinion({
      id: 'red_bot',
      side: 'red',
      lane: 'bot',
      x: 5100,
      y: 5050,
      ad: 12,
      attackRange: 110,
    });
    state.minions = [mid, bot];
    const botHp = bot.hp;
    tickMinions(state, 0.25);
    expect(bot.hp).toBeLessThan(botHp);
    expect(mid.targetId).toBe(bot.id);
  });

  it('ignores champion call-for-help while attacking a tower', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 23,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    const tower = state.structures.find(
      (item) => item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    aatrox.position = { x: tower.position.x - 160, y: tower.position.y };
    garen.position = { x: tower.position.x - 120, y: tower.position.y + 30 };
    aatrox.threatTable = {};
    garen.threatTable = {};
    const blue = makeMinion({
      id: 'blue_siege',
      side: 'blue',
      lane: 'mid',
      x: tower.position.x,
      y: tower.position.y,
      ad: 40,
      attackRange: 110,
    });
    blue.targetId = tower.id;
    blue.aggroUntil = state.scheduler.time + 3;
    state.minions = [blue];
    applyDamage(state, garen, aatrox, 40, 'physical', undefined, 'auto');
    expect(aatrox.threatTable[garen.id]?.callHelp).toBeTruthy();
    const towerHp = tower.hp;
    blue.nextAttackAt = 0;
    tickMinions(state, 0.25);
    expect(blue.targetId).toBe(tower.id);
    expect(tower.hp).toBeLessThan(towerHp);
  });

  it('keeps three early caster hits near one baseline auto band', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 7,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    const garen = state.champions.find((champ) => champ.championId === 'Garen')!;
    garen.level = 1;
    garen.armor = 35;
    garen.hp = garen.maxHp;
    const caster = makeMinion({
      id: 'caster',
      role: 'caster',
      ad: 21,
      attackRange: 550,
      x: garen.position.x + 100,
      y: garen.position.y,
    });
    const hpBefore = garen.hp;
    for (let i = 0; i < 3; i += 1) {
      applyDamage(
        state,
        caster,
        garen,
        minionRawDamageToChampion(caster),
        'physical',
        undefined,
        'minion',
      );
    }
    const threeCaster = hpBefore - garen.hp;
    const baselineAd = 65;
    const armorFactor = 100 / (100 + garen.armor);
    const baselineAuto = baselineAd * 0.88 * armorFactor;
    const ratio = threeCaster / Math.max(1, baselineAuto);
    expect(ratio).toBeGreaterThanOrEqual(0.45);
    expect(ratio).toBeLessThanOrEqual(0.9);
  });

  it('damages an outer tower without an allied champion nearby', () => {
    const state = createMatch({
      versionId: 'demo-a',
      seed: 4,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    }).state;
    for (const champ of state.champions) {
      champ.position = { ...state.lockedPack.map.blueFountain };
      champ.recallPhase = 'at_base';
    }
    const tower = state.structures.find(
      (item) => item.side === 'red' && item.structureKind === 'outer_tower' && item.lane === 'mid',
    )!;
    const hpBefore = tower.hp;
    const minion = makeMinion({
      id: 'blue_melee',
      x: tower.position.x,
      y: tower.position.y,
      ad: 40,
    });
    state.minions = [minion];
    minionAttackStructure(state, minion, tower);
    expect(tower.hp).toBeLessThan(hpBefore);

    const hpMid = tower.hp;
    tickMinions(state, 0.25);
    expect(tower.hp).toBeLessThanOrEqual(hpMid);
  });
});
