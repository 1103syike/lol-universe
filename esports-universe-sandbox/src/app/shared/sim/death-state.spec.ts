import { describe, expect, it } from 'vitest';
import {
  aliveViews,
  countAlive,
  isPlayerAlive,
  markPlayerDead,
  respawnDurationAt,
} from './death-state';
import { applyTimelineEvent, type ApplyEventState } from './apply-event';
import { createTimelineEvent } from './timeline';
import type { PlayerRuntimeStats } from './match-stats';
import type { TeamProfile } from './team-profile';
import type { Player } from '../../core/models/player.model';
import type { SimPlayerView } from './team-profile';
import { SIM_BALANCE } from './balance';

function runtime(
  id: string,
  teamId: string,
  deadUntilSec = 0,
): PlayerRuntimeStats {
  return {
    playerId: id,
    teamId,
    gamertag: id,
    position: 'TOP',
    kills: 0,
    deaths: 0,
    assists: 0,
    damageToChamps: 0,
    gold: 500,
    cs: 0,
    visionScore: 0,
    deadUntilSec,
    items: [],
  };
}

describe('death state phase F', () => {
  it('復活時間隨比賽進行增加且有上限', () => {
    const early = respawnDurationAt(5 * 60);
    const late = respawnDurationAt(35 * 60);
    expect(early).toBeGreaterThanOrEqual(SIM_BALANCE.respawnBaseSec);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThanOrEqual(SIM_BALANCE.respawnMaxSec);
  });

  it('死亡後未到 deadUntilSec 前不算存活', () => {
    const player = runtime('p1', 'home');
    markPlayerDead(player, 600);
    expect(isPlayerAlive(player, 600)).toBe(false);
    expect(isPlayerAlive(player, player.deadUntilSec - 1)).toBe(false);
    expect(isPlayerAlive(player, player.deadUntilSec)).toBe(true);
  });

  it('apply kill 會寫入死亡狀態', () => {
    const victim = runtime('v1', 'away');
    const killer = runtime('k1', 'home');
    const state: ApplyEventState = {
      players: [killer, victim],
      homeTeamId: 'home',
      awayTeamId: 'away',
      appliedIds: new Set(),
    };
    applyTimelineEvent(
      state,
      createTimelineEvent({
        t: 900,
        type: 'kill',
        teamId: 'home',
        actorPlayerId: 'k1',
        victimPlayerId: 'v1',
        victimTeamId: 'away',
        payload: { killGold: 300 },
        summary: 'test',
      }),
    );
    expect(victim.deaths).toBe(1);
    expect(victim.deadUntilSec).toBeGreaterThan(900);
    expect(isPlayerAlive(victim, 900)).toBe(false);
    expect(countAlive(state.players, 'away', 900)).toBe(0);
  });

  it('aliveViews 會排除尚未復活的選手', () => {
    const profile = {
      teamId: 'home',
      players: [
        {
          player: { id: 'a', gamertag: 'a', position: 'TOP', teamId: 'home' } as Player,
          effective: {
            laning: 80,
            mechanics: 80,
            teamfighting: 80,
            consistency: 80,
            gameSense: 80,
            adaptability: 80,
          },
          archetype: 'balanced',
        },
        {
          player: { id: 'b', gamertag: 'b', position: 'MID', teamId: 'home' } as Player,
          effective: {
            laning: 80,
            mechanics: 80,
            teamfighting: 80,
            consistency: 80,
            gameSense: 80,
            adaptability: 80,
          },
          archetype: 'balanced',
        },
      ],
    } as TeamProfile;
    const players = [runtime('a', 'home', 1200), runtime('b', 'home', 0)];
    const views = aliveViews(profile, players, 1000);
    expect(views.map((view) => view.player.id)).toEqual(['b']);
  });
});
