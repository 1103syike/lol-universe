import type { ChampionEntity } from '../state/entities';
import { ahriState } from './ability-runtime-state';
import { heal } from './ability-helpers';

function levelScale(level: number, min: number, max: number): number {
  const t = Math.max(0, Math.min(1, (Math.max(1, level) - 1) / 17));
  return min + (max - min) * t;
}

export function noteAhriFragmentKill(champion: ChampionEntity): void {
  if (champion.championId !== 'Ahri' || !champion.alive) {
    return;
  }
  const bag = ahriState(champion);
  bag.essenceStacks += 1;
  if (bag.essenceStacks < 9) {
    return;
  }
  bag.essenceStacks = 0;
  heal(champion, levelScale(champion.level, 35, 95) + champion.ap * 0.2, champion);
}

export function noteAhriChampionTakedown(champion: ChampionEntity, now: number): void {
  if (champion.championId !== 'Ahri' || !champion.alive) {
    return;
  }
  heal(champion, levelScale(champion.level, 75, 165) + champion.ap * 0.3, champion);
  const bag = ahriState(champion);
  if (bag.rWindowUntil <= now) {
    return;
  }
  bag.rChargesLeft = Math.min(3, bag.rChargesLeft + 1);
  bag.rWindowUntil = Math.min(bag.rWindowUntil + 10, now + 15);
}
