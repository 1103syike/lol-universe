import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import { getMatchAiRuntime } from './runtime';

export type LaningPhaseKind =
  | 'hold_wave'
  | 'last_hit'
  | 'trade_window'
  | 'reset_aggro'
  | 'tower_farm'
  | 'commit_allin';

export interface LaningPhaseState {
  kind: LaningPhaseKind;
  until: number;
  enteredAt: number;
}

const TRADE_WINDOW_SEC = 1.35;
const RESET_AGGRO_SEC = 1.6;
const COMMIT_ALLIN_SEC = 4.5;

export function getLaningPhase(
  state: GameState,
  championId: string,
): LaningPhaseState | null {
  return getMatchAiRuntime(state).laningPhase.get(championId) ?? null;
}

export function setLaningPhase(
  state: GameState,
  champion: ChampionEntity,
  kind: LaningPhaseKind,
  durationSec: number,
): void {
  const now = state.scheduler.time;
  getMatchAiRuntime(state).laningPhase.set(champion.id, {
    kind,
    enteredAt: now,
    until: now + Math.max(0.2, durationSec),
  });
}

export function clearLaningPhase(state: GameState, championId: string): void {
  getMatchAiRuntime(state).laningPhase.delete(championId);
}

export function refreshLaningPhaseClock(state: GameState, champion: ChampionEntity): LaningPhaseState {
  const runtime = getMatchAiRuntime(state);
  const now = state.scheduler.time;
  let phase = runtime.laningPhase.get(champion.id);
  if (!phase || phase.until <= now) {
    if (phase?.kind === 'trade_window') {
      phase = {
        kind: 'reset_aggro',
        enteredAt: now,
        until: now + RESET_AGGRO_SEC,
      };
    } else if (phase?.kind === 'reset_aggro' || phase?.kind === 'commit_allin') {
      phase = {
        kind: 'hold_wave',
        enteredAt: now,
        until: now + 2,
      };
    } else {
      phase = {
        kind: 'hold_wave',
        enteredAt: now,
        until: now + 2,
      };
    }
    runtime.laningPhase.set(champion.id, phase);
  }
  return phase;
}

export function enterTradeWindow(state: GameState, champion: ChampionEntity): void {
  setLaningPhase(state, champion, 'trade_window', TRADE_WINDOW_SEC);
}

export function enterResetAggro(state: GameState, champion: ChampionEntity): void {
  setLaningPhase(state, champion, 'reset_aggro', RESET_AGGRO_SEC);
}

export function enterTowerFarm(state: GameState, champion: ChampionEntity): void {
  setLaningPhase(state, champion, 'tower_farm', 2.5);
}

export function enterLastHit(state: GameState, champion: ChampionEntity): void {
  setLaningPhase(state, champion, 'last_hit', 2);
}

export function enterCommitAllIn(state: GameState, champion: ChampionEntity): void {
  setLaningPhase(state, champion, 'commit_allin', COMMIT_ALLIN_SEC);
}

export function enterHoldWave(state: GameState, champion: ChampionEntity): void {
  setLaningPhase(state, champion, 'hold_wave', 2);
}

export function isFullCombatLaningPhase(phase: LaningPhaseState | null): boolean {
  return phase?.kind === 'commit_allin';
}

export function isTradeLaningPhase(phase: LaningPhaseState | null): boolean {
  return phase?.kind === 'trade_window';
}

export function isResetAggroPhase(phase: LaningPhaseState | null): boolean {
  return phase?.kind === 'reset_aggro';
}

export function isFarmingLaningPhase(phase: LaningPhaseState | null): boolean {
  const kind = phase?.kind ?? 'hold_wave';
  return (
    kind === 'hold_wave' ||
    kind === 'last_hit' ||
    kind === 'tower_farm' ||
    kind === 'reset_aggro'
  );
}
