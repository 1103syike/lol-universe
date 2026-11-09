import type { GameState } from '../state/game-state';

export function matchKillTotal(state: GameState): number {
  return state.champions.reduce((sum, champ) => sum + champ.kills, 0);
}

export function expectedKillsAt(timeSec: number): number {
  const mins = Math.max(0, timeSec / 60);
  return Math.min(28, 2.8 + mins * 0.7);
}

export function killOverpace(state: GameState): number {
  const kills = matchKillTotal(state);
  const expected = expectedKillsAt(state.scheduler.time);
  return kills / Math.max(1, expected);
}
