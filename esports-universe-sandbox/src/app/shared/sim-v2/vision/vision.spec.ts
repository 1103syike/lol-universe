import { describe, expect, it } from 'vitest';

import { createMatch } from '../engine';
import {
  findJungleInvadeThreat,
  maybeBuyControlWard,
  placeWard,
  teamHasVisionOfPoint,
  teamSeesChampion,
  updateVision,
  visionCoverScore,
} from './vision';

describe('vision system', () => {
  it('shares ward vision across the team', () => {
    const { state } = createMatch({
      versionId: 'demo-a',
      seed: 77,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
        playerId: `blue_${position}`,
        gamertag: `blue_${position}`,
        position,
        championId: 'Garen',
        laning: 70,
        mechanics: 70,
        teamfighting: 70,
        gameSense: 70,
        consistency: 70,
        adaptability: 70,
      })),
      red: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
        playerId: `red_${position}`,
        gamertag: `red_${position}`,
        position,
        championId: 'Garen',
        laning: 70,
        mechanics: 70,
        teamfighting: 70,
        gameSense: 70,
        consistency: 70,
        adaptability: 70,
      })),
    });

    const support = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'SUPPORT',
    )!;
    const enemyJungler = state.champions.find(
      (champ) => champ.side === 'red' && champ.positionLabel === 'JUNGLE',
    )!;
    const blueMid = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'MID',
    )!;

    const riverSpot = { x: 10800, y: 5700 };
    enemyJungler.position = { ...riverSpot };
    support.position = { x: riverSpot.x - 2000, y: riverSpot.y };
    blueMid.position = { x: 4000, y: 4000 };

    placeWard(state, support, riverSpot, 'stealth');
    updateVision(state);

    expect(teamHasVisionOfPoint(state, 'blue', riverSpot)).toBe(true);
    expect(teamSeesChampion(state, 'blue', enemyJungler)).toBe(true);
    expect(blueMid.knownEnemyPositions[enemyJungler.id]).toBeTruthy();
    expect(support.wardsPlaced).toBe(1);
    expect(state.wards.length).toBe(1);

    const blueBuff = state.lockedPack.monsters.find((camp) => camp.id === 'blue_buff')!;
    enemyJungler.position = { ...blueBuff.position };
    support.position = {
      x: blueBuff.position.x - 350,
      y: blueBuff.position.y,
    };
    updateVision(state);
    const threat = findJungleInvadeThreat(state, support);
    expect(threat?.enemy.id).toBe(enemyJungler.id);
    expect(visionCoverScore(state, support, threat!)).toBeGreaterThan(10);

    support.gold = 200;
    support.controlWardReady = false;
    let bought = false;
    for (let i = 0; i < 24; i += 1) {
      support.gold = 200;
      if (maybeBuyControlWard(state, support)) {
        bought = true;
        break;
      }
    }
    expect(bought).toBe(true);
    expect(support.controlWardReady).toBe(true);
  });
});
