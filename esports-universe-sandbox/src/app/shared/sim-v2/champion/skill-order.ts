import { levelAbility } from '../combat/combat';
import type { ChampionEntity } from '../state/entities';
import type { AbilitySlot } from '../types/ids';
import opggSkillOrders from './opgg-skill-orders.json';

export type BasicSkill = 'Q' | 'W' | 'E';

export interface ChampionSkillOrder {
  role: 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT' | 'ANY';
  maxOrder: readonly [BasicSkill, BasicSkill, BasicSkill];
  path?: readonly AbilitySlot[];
  source: string;
}

const DEFAULT_ORDER: readonly [BasicSkill, BasicSkill, BasicSkill] = ['Q', 'E', 'W'];

type OpggRow = {
  role: ChampionSkillOrder['role'];
  maxOrder: BasicSkill[];
  path?: AbilitySlot[];
  source: string;
};

const ORDER_BY_CHAMPION: Readonly<Record<string, readonly ChampionSkillOrder[]>> = Object.fromEntries(
  Object.entries(
    (opggSkillOrders as { champions: Record<string, OpggRow[]> }).champions,
  ).map(([championId, rows]) => [
    championId,
    rows.map((row) => ({
      role: row.role,
      maxOrder: row.maxOrder as [BasicSkill, BasicSkill, BasicSkill],
      path: row.path,
      source: row.source,
    })),
  ]),
);

function resolveSkillPlan(
  championId: string,
  role: ChampionEntity['positionLabel'],
): ChampionSkillOrder {
  const rows = ORDER_BY_CHAMPION[championId];
  if (!rows || rows.length === 0) {
    return { role: 'ANY', maxOrder: DEFAULT_ORDER, source: 'default QEW' };
  }
  const exact = rows.find((row) => row.role === role);
  if (exact) {
    return exact;
  }
  const any = rows.find((row) => row.role === 'ANY');
  return any ?? rows[0]!;
}

export function resolveSkillMaxOrder(
  championId: string,
  role: ChampionEntity['positionLabel'],
): readonly [BasicSkill, BasicSkill, BasicSkill] {
  return resolveSkillPlan(championId, role).maxOrder;
}

function abilityLevel(champion: ChampionEntity, slot: AbilitySlot): number {
  return champion.abilities.find((ability) => ability.slot === slot)?.level ?? 0;
}

function wantedRRank(level: number): number {
  if (level >= 16) {
    return 3;
  }
  if (level >= 11) {
    return 2;
  }
  if (level >= 6) {
    return 1;
  }
  return 0;
}

function canPutPoint(champion: ChampionEntity, slot: 'Q' | 'W' | 'E' | 'R'): boolean {
  const current = abilityLevel(champion, slot);
  if (slot === 'R') {
    if (champion.championId === 'Udyr') {
      return current < 6;
    }
    return champion.level >= 6 && current < wantedRRank(champion.level);
  }
  if (current >= 5) {
    return false;
  }
  return current < Math.floor(champion.level / 2) + 1;
}

function tryLevel(champion: ChampionEntity, slot: 'Q' | 'W' | 'E' | 'R'): boolean {
  if (!canPutPoint(champion, slot)) {
    return false;
  }
  const before = abilityLevel(champion, slot);
  levelAbility(champion, slot);
  return abilityLevel(champion, slot) > before;
}

function nextFromMaxOrder(
  champion: ChampionEntity,
  maxOrder: readonly [BasicSkill, BasicSkill, BasicSkill],
): 'Q' | 'W' | 'E' | 'R' | null {
  const basicLearned =
    (abilityLevel(champion, 'Q') > 0 ? 1 : 0) +
    (abilityLevel(champion, 'W') > 0 ? 1 : 0) +
    (abilityLevel(champion, 'E') > 0 ? 1 : 0);

  if (canPutPoint(champion, 'R') && champion.championId !== 'Udyr') {
    return 'R';
  }

  if (basicLearned < 3) {
    for (const slot of maxOrder) {
      if (abilityLevel(champion, slot) === 0 && canPutPoint(champion, slot)) {
        return slot;
      }
    }
    for (const slot of ['Q', 'W', 'E'] as const) {
      if (abilityLevel(champion, slot) === 0 && canPutPoint(champion, slot)) {
        return slot;
      }
    }
  }

  for (const slot of maxOrder) {
    if (canPutPoint(champion, slot)) {
      return slot;
    }
  }
  for (const slot of ['Q', 'W', 'E', 'R'] as const) {
    if (canPutPoint(champion, slot)) {
      return slot;
    }
  }
  return null;
}

function pathSlotAt(
  path: readonly AbilitySlot[] | undefined,
  investedBefore: number,
): 'Q' | 'W' | 'E' | 'R' | null {
  if (!path || investedBefore < 0 || investedBefore >= path.length) {
    return null;
  }
  const slot = path[investedBefore];
  if (slot === 'Q' || slot === 'W' || slot === 'E' || slot === 'R') {
    return slot;
  }
  return null;
}

export function investAbilityPoints(champion: ChampionEntity): void {
  const expected = champion.level;
  let invested = champion.abilities.reduce(
    (sum, ability) => sum + (ability.slot === 'P' ? 0 : ability.level),
    0,
  );
  const plan = resolveSkillPlan(champion.championId, champion.positionLabel);
  while (invested < expected) {
    const fromPath = pathSlotAt(plan.path, invested);
    if (fromPath && tryLevel(champion, fromPath)) {
      invested += 1;
      continue;
    }
    const fallback = nextFromMaxOrder(champion, plan.maxOrder);
    if (!fallback || !tryLevel(champion, fallback)) {
      break;
    }
    invested += 1;
  }
}
