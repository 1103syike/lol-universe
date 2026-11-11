import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { decideForChampion } from './decision';

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

describe('contact fight override', () => {
  it('makes nearby enemies fight instead of clearing past each other', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 21,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'Graves', 'Annie', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'LeeSin', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(420);
    const annie = state.champions.find((champ) => champ.championId === 'Annie')!;
    const lee = state.champions.find((champ) => champ.championId === 'LeeSin')!;
    const point = { x: 7200, y: 7200 };
    annie.position = { ...point };
    annie.hp = annie.maxHp;
    annie.alive = true;
    annie.recallPhase = 'none';
    annie.currentAction = 'lane';
    annie.deaths = 0;
    annie.kills = 0;
    annie.earnedGold = 3000;
    lee.position = { x: point.x + 180, y: point.y };
    lee.hp = lee.maxHp;
    lee.alive = true;
    lee.recallPhase = 'none';
    lee.currentAction = 'clear';
    lee.deaths = 0;
    lee.kills = 0;
    lee.earnedGold = 3000;

    decideForChampion(state, annie);
    decideForChampion(state, lee);

    expect(['fight', 'trade', 'skirmish', 'gank', 'tower_bail']).toContain(annie.currentAction);
    expect(['fight', 'trade', 'skirmish', 'gank', 'tower_bail']).toContain(lee.currentAction);
  });

  it('finishes a low-hp recalling mid instead of shopping recall across lanes', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 33,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'Graves', 'Annie', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'LeeSin', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(540);
    const annie = state.champions.find((champ) => champ.championId === 'Annie')!;
    const ashe = state.champions.find((champ) => champ.championId === 'Ashe')!;
    const point = { x: 7600, y: 6800 };
    annie.position = { ...point };
    annie.hp = annie.maxHp * 0.12;
    annie.alive = true;
    annie.recallPhase = 'moving_home';
    annie.recallChannelDuration = 8;
    annie.recallChannelUntil = state.scheduler.time + 6;
    annie.recallHpSnapshot = annie.hp;
    annie.currentAction = 'recall';
    annie.deaths = 1;
    annie.kills = 0;
    annie.earnedGold = 2200;
    annie.gold = 180;
    ashe.position = { x: point.x + 160, y: point.y + 40 };
    ashe.hp = ashe.maxHp * 0.82;
    ashe.alive = true;
    ashe.recallPhase = 'none';
    ashe.currentAction = 'lane';
    ashe.deaths = 0;
    ashe.kills = 1;
    ashe.earnedGold = 3600;
    ashe.gold = 1600;

    decideForChampion(state, ashe);

    expect(['fight', 'trade', 'skirmish', 'gank', 'tower_bail']).toContain(ashe.currentAction);
    expect(ashe.recallPhase).toBe('none');
  });

  it('does not hard-commit when low hp and outnumbered', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 44,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Aatrox', 'Graves', 'Annie', 'Jinx', 'Thresh']),
      red: roster('r', ['Garen', 'LeeSin', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(600);
    const annie = state.champions.find((champ) => champ.championId === 'Annie')!;
    const ashe = state.champions.find((champ) => champ.championId === 'Ashe')!;
    const leona = state.champions.find((champ) => champ.championId === 'Leona')!;
    const syndra = state.champions.find((champ) => champ.championId === 'Syndra')!;
    const point = { x: 7400, y: 7000 };
    annie.position = { ...point };
    annie.hp = annie.maxHp * 0.24;
    annie.alive = true;
    annie.recallPhase = 'none';
    annie.currentAction = 'lane';
    annie.deaths = 2;
    annie.kills = 0;
    annie.earnedGold = 2400;
    ashe.position = { x: point.x + 140, y: point.y };
    ashe.hp = ashe.maxHp * 0.85;
    ashe.alive = true;
    ashe.recallPhase = 'none';
    leona.position = { x: point.x + 180, y: point.y + 80 };
    leona.hp = leona.maxHp * 0.9;
    leona.alive = true;
    leona.recallPhase = 'none';
    syndra.position = { x: point.x + 120, y: point.y - 90 };
    syndra.hp = syndra.maxHp * 0.8;
    syndra.alive = true;
    syndra.recallPhase = 'none';

    decideForChampion(state, annie);

    expect(['lane', 'retreat', 'recall', 'tower_bail']).toContain(annie.currentAction);
  });
});
