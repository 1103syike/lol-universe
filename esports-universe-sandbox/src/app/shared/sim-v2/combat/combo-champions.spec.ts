import { describe, expect, it } from 'vitest';
import { createMatch, type SimulateV2Input } from '../engine';
import { annieState, aatroxState, ahriState, ezrealState, leeSinState, pruneSyndraSpheres } from './ability-runtime-state';
import { castAbility, basicAttack } from './cast-ability';
import { castChampionCombo } from './combo-cast';
import { noteAhriFragmentKill } from './ahri-passives';
import { castFlash } from './summoner-spells';

function roster(
  side: 'blue' | 'red',
  picks: { top: string; jg: string; mid: string; bot: string; sup: string },
) {
  return (
    [
      ['TOP', picks.top],
      ['JUNGLE', picks.jg],
      ['MID', picks.mid],
      ['BOT', picks.bot],
      ['SUPPORT', picks.sup],
    ] as const
  ).map(([position, championId]) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId,
    laning: 75,
    mechanics: 80,
    teamfighting: 75,
    gameSense: 75,
    consistency: 70,
    adaptability: 70,
  }));
}

function matchInput(): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed: 77,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', {
      top: 'Aatrox',
      jg: 'LeeSin',
      mid: 'Annie',
      bot: 'Ezreal',
      sup: 'Thresh',
    }),
    red: roster('red', {
      top: 'Garen',
      jg: 'Viego',
      mid: 'Ahri',
      bot: 'Syndra',
      sup: 'Leona',
    }),
    maxDurationSec: 60,
  };
}

function unlockAll(champ: {
  level: number;
  mana: number;
  maxMana: number;
  abilities: Array<{ slot: string; level: number; cooldownUntil: number }>;
}) {
  champ.level = Math.max(champ.level, 6);
  if (champ.maxMana > 1) {
    champ.mana = champ.maxMana;
  }
  for (const ability of champ.abilities) {
    if (ability.slot === 'P') {
      continue;
    }
    ability.level = ability.slot === 'R' ? 3 : 5;
    ability.cooldownUntil = 0;
  }
}

describe('champion combos', () => {
  it('LeeSin Q marks then Q2 dashes, and R arms flash window', () => {
    const { state } = createMatch(matchInput());
    const lee = state.champions.find((champ) => champ.championId === 'LeeSin')!;
    const victim = state.champions.find((champ) => champ.championId === 'Viego')!;
    unlockAll(lee);
    lee.position = { x: 7000, y: 7000 };
    victim.position = { x: 7600, y: 7000 };
    const before = { ...lee.position };
    expect(castAbility(state, lee, 'Q', victim)).toBe(true);
    const bag = leeSinState(lee);
    expect(bag.qIsRecast).toBe(true);
    expect(bag.qMarkTargetId).toBe(victim.id);
    expect(Math.hypot(lee.position.x - before.x, lee.position.y - before.y)).toBeLessThan(30);
    expect(castAbility(state, lee, 'Q', victim)).toBe(true);
    expect(Math.hypot(lee.position.x - victim.position.x, lee.position.y - victim.position.y)).toBeLessThan(
      220,
    );
    expect(leeSinState(lee).qIsRecast).toBe(false);
    unlockAll(lee);
    victim.position = { x: lee.position.x + 250, y: lee.position.y };
    expect(castAbility(state, lee, 'R', victim)).toBe(true);
    expect(leeSinState(lee).rFlashArmedUntil).toBeGreaterThan(state.scheduler.time);
  });

  it('Annie stacks pyromania and Flash-R reaches out-of-range target', () => {
    const { state } = createMatch(matchInput());
    const annie = state.champions.find((champ) => champ.championId === 'Annie')!;
    const victim = state.champions.find((champ) => champ.championId === 'Ahri')!;
    unlockAll(annie);
    annie.position = { x: 7000, y: 7000 };
    victim.position = { x: 7600, y: 7000 };
    annieState(annie).pyromania = 0;
    castAbility(state, annie, 'Q', victim);
    castAbility(state, annie, 'W', victim);
    castAbility(state, annie, 'E', annie);
    expect(annieState(annie).pyromania).toBe(3);
    victim.position = { x: annie.position.x + 900, y: annie.position.y };
    victim.hp = victim.maxHp;
    const beforeHp = victim.hp;
    unlockAll(annie);
    for (const spell of annie.summonerSpells) {
      spell.cooldownUntil = 0;
    }
    castChampionCombo(state, annie, victim);
    expect(victim.hp).toBeLessThan(beforeHp);
    expect(Math.hypot(annie.position.x - 7000, annie.position.y - 7000)).toBeGreaterThan(80);
  });

  it('Syndra Q leaves a sphere that amplifies E stun and R bolts', () => {
    const { state } = createMatch(matchInput());
    const syndra = state.champions.find((champ) => champ.championId === 'Syndra')!;
    const victim = state.champions.find((champ) => champ.championId === 'Annie')!;
    unlockAll(syndra);
    syndra.ap = 300;
    syndra.position = { x: 8000, y: 8000 };
    victim.alive = true;
    victim.hp = victim.maxHp;
    victim.position = { x: 8400, y: 8000 };

    expect(castAbility(state, syndra, 'Q', victim)).toBe(true);
    expect(pruneSyndraSpheres(syndra, state.scheduler.time).length).toBe(1);

    unlockAll(syndra);
    victim.alive = true;
    victim.hp = victim.maxHp;
    victim.position = { x: 8400, y: 8000 };
    expect(castAbility(state, syndra, 'E', victim)).toBe(true);
    expect(victim.statuses.some((status) => status.kind === 'stun')).toBe(true);
    expect(pruneSyndraSpheres(syndra, state.scheduler.time).length).toBe(0);

    unlockAll(syndra);
    victim.alive = true;
    victim.hp = victim.maxHp;
    victim.position = { x: 8400, y: 8000 };
    expect(castAbility(state, syndra, 'Q', victim)).toBe(true);
    unlockAll(syndra);
    expect(castAbility(state, syndra, 'Q', victim)).toBe(true);
    const spheres = pruneSyndraSpheres(syndra, state.scheduler.time).length;
    expect(spheres).toBe(2);

    victim.alive = true;
    victim.hp = victim.maxHp;
    victim.position = { x: 8400, y: 8000 };
    const before = victim.hp;
    unlockAll(syndra);
    expect(castAbility(state, syndra, 'R', victim)).toBe(true);
    expect(victim.hp).toBeLessThan(before);
    expect(pruneSyndraSpheres(syndra, state.scheduler.time).length).toBe(0);
  });

  it('Aatrox Q advances stages and E dashes into sweetspot window', () => {
    const { state } = createMatch(matchInput());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(aatrox);
    aatrox.position = { x: 6000, y: 6000 };
    victim.position = { x: 6400, y: 6000 };
    castAbility(state, aatrox, 'E', victim);
    expect(Math.hypot(aatrox.position.x - 6000, aatrox.position.y - 6000)).toBeGreaterThan(80);
    expect(aatroxState(aatrox).sweetUntil).toBeGreaterThan(state.scheduler.time);
    castAbility(state, aatrox, 'Q', victim);
    expect(aatroxState(aatrox).qStage).toBe(1);
    expect(victim.statuses.some((status) => status.id.includes('aatrox:q1:knock'))).toBe(true);
    expect(castAbility(state, aatrox, 'Q', victim)).toBe(false);
    state.scheduler.runUntil(state.scheduler.time + 1);
    castAbility(state, aatrox, 'Q', victim);
    expect(aatroxState(aatrox).qStage).toBe(2);
    expect(castAbility(state, aatrox, 'Q', victim)).toBe(false);
    state.scheduler.runUntil(state.scheduler.time + 1);
    castAbility(state, aatrox, 'Q', victim);
    expect(aatroxState(aatrox).qStage).toBe(0);
  });

  it('Aatrox W tethers then pulls if target stays', () => {
    const { state } = createMatch(matchInput());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(aatrox);
    aatrox.position = { x: 6000, y: 6000 };
    victim.position = { x: 6300, y: 6000 };
    const before = victim.hp;
    castAbility(state, aatrox, 'W', victim);
    expect(victim.hp).toBeLessThan(before);
    expect(aatroxState(aatrox).wTetherTargetId).toBe(victim.id);
    const mid = victim.hp;
    state.scheduler.runUntil(state.scheduler.time + 1.6);
    expect(victim.hp).toBeLessThan(mid);
  });

  it('Aatrox R is a steroid, not a damage nuke', () => {
    const { state } = createMatch(matchInput());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(aatrox);
    aatrox.position = { x: 6000, y: 6000 };
    victim.position = { x: 6100, y: 6000 };
    victim.hp = victim.maxHp;
    const before = victim.hp;
    expect(castAbility(state, aatrox, 'R', null)).toBe(true);
    expect(victim.hp).toBe(before);
    expect(aatroxState(aatrox).rUntil).toBeGreaterThan(state.scheduler.time);
    expect(aatrox.statuses.some((status) => status.id === 'aatrox:r:ms')).toBe(true);
  });

  it('Aatrox combo holds R at full HP poke and opens it to finish', () => {
    const { state } = createMatch(matchInput());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(aatrox);
    aatrox.position = { x: 6000, y: 6000 };
    victim.position = { x: 6400, y: 6000 };
    aatrox.hp = aatrox.maxHp;
    victim.hp = victim.maxHp;
    castChampionCombo(state, aatrox, victim);
    expect(aatroxState(aatrox).rUntil).toBeLessThanOrEqual(state.scheduler.time);
    expect(aatroxState(aatrox).qStage).toBeGreaterThan(0);

    aatrox.abilities.forEach((ability) => {
      ability.cooldownUntil = 0;
    });
    victim.hp = victim.maxHp * 0.4;
    castChampionCombo(state, aatrox, victim);
    expect(aatroxState(aatrox).rUntil).toBeGreaterThan(state.scheduler.time);
  });

  it('Aatrox E stops near sweetspot distance instead of stacking on target', () => {
    const { state } = createMatch(matchInput());
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(aatrox);
    aatrox.position = { x: 6000, y: 6000 };
    victim.position = { x: 6500, y: 6000 };
    const beforeGap = Math.hypot(aatrox.position.x - victim.position.x, aatrox.position.y - victim.position.y);
    castAbility(state, aatrox, 'E', victim);
    const gap = Math.hypot(aatrox.position.x - victim.position.x, aatrox.position.y - victim.position.y);
    expect(gap).toBeLessThan(beforeGap);
    expect(gap).toBeGreaterThan(250);
    expect(gap).toBeLessThan(420);
    expect(aatroxState(aatrox).sweetUntil).toBeGreaterThan(state.scheduler.time);
  });

  it('Ahri Q return deals full true damage and W grants movespeed', () => {
    const { state } = createMatch(matchInput());
    const ahri = state.champions.find((champ) => champ.championId === 'Ahri')!;
    const victim = state.champions.find((champ) => champ.championId === 'Annie')!;
    unlockAll(ahri);
    ahri.position = { x: 6000, y: 6000 };
    victim.position = { x: 6500, y: 6000 };
    victim.hp = victim.maxHp;
    const before = victim.hp;
    castAbility(state, ahri, 'Q', victim);
    const afterQ = victim.hp;
    expect(afterQ).toBeLessThan(before);
    const qDrop = before - afterQ;
    victim.hp = victim.maxHp;
    castAbility(state, ahri, 'W', victim);
    expect(ahri.statuses.some((status) => status.id === 'ahri:w:ms')).toBe(true);
    expect(victim.hp).toBeLessThan(victim.maxHp);
    expect(qDrop).toBeGreaterThan(40);
  });

  it('Ahri E charms then combo opens Spirit Rush, holding R on full HP poke', () => {
    const { state } = createMatch(matchInput());
    const ahri = state.champions.find((champ) => champ.championId === 'Ahri')!;
    const victim = state.champions.find((champ) => champ.championId === 'Annie')!;
    unlockAll(ahri);
    ahri.position = { x: 6000, y: 6000 };
    victim.position = { x: 6800, y: 6000 };
    ahri.hp = ahri.maxHp;
    victim.hp = victim.maxHp;
    const r = ahri.abilities.find((ability) => ability.slot === 'R')!;
    r.cooldownUntil = 9999;
    castChampionCombo(state, ahri, victim);
    expect(ahriState(ahri).rChargesLeft).toBe(0);

    r.cooldownUntil = 0;
    ahri.abilities.forEach((ability) => {
      ability.cooldownUntil = 0;
    });
    victim.hp = victim.maxHp;
    victim.position = { x: 6400, y: 6000 };
    castAbility(state, ahri, 'E', victim);
    expect(victim.statuses.some((status) => status.id === 'ahri:e:charm')).toBe(true);
    castChampionCombo(state, ahri, victim);
    expect(ahriState(ahri).rChargesLeft).toBeGreaterThan(0);
    expect(ahriState(ahri).rWindowUntil).toBeGreaterThan(state.scheduler.time);
  });

  it('Ahri R can be recast twice inside the window', () => {
    const { state } = createMatch(matchInput());
    const ahri = state.champions.find((champ) => champ.championId === 'Ahri')!;
    const victim = state.champions.find((champ) => champ.championId === 'Annie')!;
    unlockAll(ahri);
    ahri.position = { x: 6000, y: 6000 };
    victim.position = { x: 6300, y: 6000 };
    expect(castAbility(state, ahri, 'R', victim)).toBe(true);
    expect(ahriState(ahri).rChargesLeft).toBe(2);
    expect(castAbility(state, ahri, 'R', victim)).toBe(false);
    state.scheduler.runUntil(state.scheduler.time + 1.05);
    expect(castAbility(state, ahri, 'R', victim)).toBe(true);
    expect(ahriState(ahri).rChargesLeft).toBe(1);
    state.scheduler.runUntil(state.scheduler.time + 1.05);
    expect(castAbility(state, ahri, 'R', victim)).toBe(true);
    expect(ahriState(ahri).rChargesLeft).toBe(0);
  });

  it('Ahri passive heals after nine essence fragments', () => {
    const { state } = createMatch(matchInput());
    const ahri = state.champions.find((champ) => champ.championId === 'Ahri')!;
    ahri.hp = ahri.maxHp * 0.5;
    const before = ahri.hp;
    for (let i = 0; i < 9; i += 1) {
      noteAhriFragmentKill(ahri);
    }
    expect(ahriState(ahri).essenceStacks).toBe(0);
    expect(ahri.hp).toBeGreaterThan(before);
  });

  it('Ezreal Q refunds cooldowns and W mark detonates on Q', () => {
    const { state } = createMatch(matchInput());
    const ez = state.champions.find((champ) => champ.championId === 'Ezreal')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(ez);
    ez.position = { x: 6000, y: 6000 };
    victim.position = { x: 6600, y: 6000 };
    victim.hp = victim.maxHp;
    castAbility(state, ez, 'W', victim);
    expect(ezrealState(ez).wMarkTargetId).toBe(victim.id);
    const before = victim.hp;
    const e = ez.abilities.find((ability) => ability.slot === 'E')!;
    e.cooldownUntil = state.scheduler.time + 10;
    castAbility(state, ez, 'Q', victim);
    expect(victim.hp).toBeLessThan(before);
    expect(ezrealState(ez).wMarkTargetId).toBeNull();
    expect(e.cooldownUntil).toBeLessThan(state.scheduler.time + 10);
    expect(ezrealState(ez).passiveStacks).toBeGreaterThan(0);
  });

  it('Ezreal E blinks and AA can detonate W mark', () => {
    const { state } = createMatch(matchInput());
    const ez = state.champions.find((champ) => champ.championId === 'Ezreal')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(ez);
    ez.position = { x: 6000, y: 6000 };
    victim.position = { x: 6400, y: 6000 };
    castAbility(state, ez, 'W', victim);
    const before = { ...ez.position };
    castAbility(state, ez, 'E', victim);
    expect(Math.hypot(ez.position.x - before.x, ez.position.y - before.y)).toBeGreaterThan(80);
    castAbility(state, ez, 'W', victim);
    victim.position = { ...ez.position, x: ez.position.x + 100 };
    victim.hp = victim.maxHp;
    const markedHp = victim.hp;
    ez.nextAttackAt = 0;
    basicAttack(state, ez, victim);
    expect(victim.hp).toBeLessThan(markedHp);
    expect(ezrealState(ez).wMarkTargetId).toBeNull();
  });

  it('Ezreal combo prefers W then Q and holds R at full HP close poke', () => {
    const { state } = createMatch(matchInput());
    const ez = state.champions.find((champ) => champ.championId === 'Ezreal')!;
    const victim = state.champions.find((champ) => champ.championId === 'Garen')!;
    unlockAll(ez);
    ez.position = { x: 6000, y: 6000 };
    victim.position = { x: 6500, y: 6000 };
    ez.hp = ez.maxHp;
    victim.hp = victim.maxHp;
    victim.maxHp = 5000;
    victim.hp = 5000;
    const r = ez.abilities.find((ability) => ability.slot === 'R')!;
    castChampionCombo(state, ez, victim);
    expect(ezrealState(ez).passiveStacks).toBeGreaterThan(0);
    expect(r.cooldownUntil).toBeLessThanOrEqual(state.scheduler.time);
  });

  it('does not treat Flash as free chase before combo champions spend it', () => {
    const { state } = createMatch(matchInput());
    const lee = state.champions.find((champ) => champ.championId === 'LeeSin')!;
    unlockAll(lee);
    const flash = lee.summonerSpells.find((spell) => spell.id === 'Flash')!;
    flash.cooldownUntil = 0;
    const ok = castFlash(state, lee, { x: lee.position.x + 400, y: lee.position.y });
    expect(ok).toBe(true);
    expect(flash.cooldownUntil).toBeGreaterThan(state.scheduler.time);
  });
});
