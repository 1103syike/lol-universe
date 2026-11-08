import { dist } from '../map/pathfinding';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';

const SIGHT = 900;

export function updateVision(state: GameState): void {
  const t = state.scheduler.time;
  for (const viewer of state.champions) {
    if (!viewer.alive) {
      continue;
    }
    for (const enemy of state.champions) {
      if (enemy.side === viewer.side || !enemy.alive) {
        continue;
      }
      if (dist(viewer.position, enemy.position) <= SIGHT) {
        viewer.knownEnemyPositions[enemy.id] = {
          position: { ...enemy.position },
          seenAt: t,
        };
        viewer.visionScore += 0.02;
      }
    }
  }
}

export function knownEnemies(champion: ChampionEntity, now: number, maxAge = 8): string[] {
  return Object.entries(champion.knownEnemyPositions)
    .filter(([, info]) => now - info.seenAt <= maxAge)
    .map(([id]) => id);
}
