import { describe, expect, it } from 'vitest';
import { createMatch } from '../engine';
import { dist } from '../map/pathfinding';
import { decideForChampion } from './decision';

function roster(side: 'b' | 'r', bots: string[]) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: bots[index],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 70,
    adaptability: 70,
  }));
}

describe('early lane short trade', () => {
  it('does not hard-commit when equal-hp lane opponents meet early', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 42,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Ornn', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Aatrox', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(110);
    const ornn = state.champions.find((champ) => champ.championId === 'Ornn')!;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const lanePoint = { x: 2100, y: 11800 };
    ornn.position = { ...lanePoint };
    aatrox.position = { x: lanePoint.x + 220, y: lanePoint.y - 40 };
    ornn.hp = ornn.maxHp;
    aatrox.hp = aatrox.maxHp;
    ornn.alive = true;
    aatrox.alive = true;
    ornn.recallPhase = 'none';
    aatrox.recallPhase = 'none';
    ornn.currentAction = 'lane';
    aatrox.currentAction = 'lane';
    ornn.assignedLane = 'top';
    aatrox.assignedLane = 'top';

    decideForChampion(state, ornn);
    decideForChampion(state, aatrox);

    expect(['trade', 'farm', 'lane', 'wave_freeze', 'wave_shove', 'tower_bail']).toContain(
      ornn.currentAction,
    );
    expect(ornn.currentAction).not.toBe('fight');
    expect(aatrox.currentAction).not.toBe('fight');
  });

  it('steps away after short trade when already in poke range', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 43,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('b', ['Ornn', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
      red: roster('r', ['Aatrox', 'Viego', 'Syndra', 'Ashe', 'Leona']),
    });
    state.scheduler.setTime(120);
    const ornn = state.champions.find((champ) => champ.championId === 'Ornn')!;
    const aatrox = state.champions.find((champ) => champ.championId === 'Aatrox')!;
    const fountain = state.lockedPack.map.blueFountain;
    const lanePoint = { x: 2400, y: 11600 };
    ornn.position = { ...lanePoint };
    aatrox.position = { x: lanePoint.x + 280, y: lanePoint.y };
    ornn.hp = ornn.maxHp * 0.9;
    aatrox.hp = aatrox.maxHp * 0.9;
    ornn.alive = true;
    aatrox.alive = true;
    ornn.recallPhase = 'none';
    aatrox.recallPhase = 'none';
    ornn.assignedLane = 'top';
    aatrox.assignedLane = 'top';

    decideForChampion(state, ornn);

    expect(ornn.currentAction).toBe('trade');
    expect(ornn.path.length + (ornn.moving ? 1 : 0)).toBeGreaterThan(0);
    const goal =
      ornn.path.length > 0 ? ornn.path[ornn.path.length - 1] : ornn.position;
    expect(dist(goal, fountain)).toBeLessThan(dist(aatrox.position, fountain) + 80);
  });
});
