import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { ItemId } from '../types/ids';
import type { ReplayRecorder } from '../replay/recorder';
import { dist } from '../map/pathfinding';
export { investAbilityPoints } from '../champion/skill-order';
import { investAbilityPoints } from '../champion/skill-order';

export function grantGold(
  state: GameState,
  champion: ChampionEntity,
  amount: number,
  reason: string,
  recorder?: ReplayRecorder,
): void {
  if (amount <= 0) {
    return;
  }
  champion.gold += amount;
  champion.earnedGold += amount;
  champion.goldBySource[reason] = (champion.goldBySource[reason] ?? 0) + amount;
  recorder?.record(state, {
    type: 'gold',
    actorId: champion.id,
    amount,
    payload: { reason, goldAfter: champion.gold, earnedGold: champion.earnedGold },
  });
}

export function grantExp(
  state: GameState,
  champion: ChampionEntity,
  amount: number,
  recorder?: ReplayRecorder,
  reason = 'combat',
): void {
  if (amount <= 0 || !champion.alive) {
    return;
  }
  champion.exp += amount;
  champion.expBySource[reason] = (champion.expBySource[reason] ?? 0) + amount;
  const curve = state.lockedPack.economy.xpPerLevel;
  const levelBefore = champion.level;
  let leveled = false;
  while (champion.level < curve.length && champion.exp >= curve[champion.level]) {
    champion.level += 1;
    leveled = true;
  }
  if (leveled) {
    investAbilityPoints(champion);
    recomputeItemStats(state, champion);
    champion.levelSamples.push({ t: state.scheduler.time, level: champion.level });
  }
  recorder?.record(state, {
    type: 'exp',
    actorId: champion.id,
    amount,
    payload: { level: champion.level, exp: champion.exp, reason },
  });
  if (leveled) {
    recorder?.record(state, {
      type: 'level_up',
      actorId: champion.id,
      amount: champion.level - levelBefore,
      payload: {
        level: champion.level,
        from: levelBefore,
        exp: champion.exp,
        abilities: champion.abilities.map((ability) => ({
          slot: ability.slot,
          level: ability.level,
        })),
      },
    });
  }
}

const PASSIVE_GOLD_START_SEC = 65;

export function tickPassiveGold(state: GameState, dt: number, recorder?: ReplayRecorder): void {
  if (state.scheduler.time < PASSIVE_GOLD_START_SEC) {
    return;
  }
  const rate = state.lockedPack.economy.passiveGoldPerSec * dt;
  for (const champion of state.champions) {
    grantGold(state, champion, rate, 'passive', recorder);
  }
}

const SUPPORT_QUEST_LINE = [
  'WorldAtlas',
  'RunicCompass',
  'BountyofWorlds',
] as const;

const SUPPORT_FINISHED = [
  'DreamMaker',
  'CelestialOpposition',
  'Bloodsong',
  'ZazZaksRealmspike',
  'SolsticeSleigh',
] as const;

function growthStat(base: number, perLevel: number, level: number): number {
  if (level <= 1) {
    return base;
  }
  const steps = level - 1;
  return base + perLevel * steps * (0.7025 + 0.0175 * steps);
}

export function recomputeItemStats(state: GameState, champion: ChampionEntity): void {
  const def = state.lockedPack.champions[champion.championId];
  if (!def) {
    return;
  }
  let ad = growthStat(def.baseAd, def.adPerLevel, champion.level);
  let ap = 0;
  let hpBonus = 0;
  let manaBonus = 0;
  let armor = growthStat(def.baseArmor, def.armorPerLevel, champion.level);
  let mr = growthStat(def.baseMr, def.mrPerLevel, champion.level);
  let as = def.attackSpeed;
  let ms = def.moveSpeed;
  for (const itemId of champion.items) {
    const item = state.lockedPack.items[itemId];
    if (!item) {
      continue;
    }
    ad += item.ad;
    ap += item.ap;
    hpBonus += item.hp;
    manaBonus += item.mana ?? 0;
    armor += item.armor;
    mr += item.mr;
    as += item.attackSpeed;
    ms += item.moveSpeed;
  }
  const ratio = champion.maxHp > 0 ? champion.hp / champion.maxHp : 1;
  const manaRatio = champion.maxMana > 0 ? champion.mana / champion.maxMana : 1;
  champion.ad = ad;
  champion.ap = ap;
  champion.armor = armor;
  champion.mr = mr;
  champion.attackSpeed = as;
  champion.moveSpeed = ms;
  champion.maxHp = growthStat(def.baseHp, def.hpPerLevel, champion.level) + hpBonus;
  champion.hp = Math.min(champion.maxHp, champion.maxHp * ratio);
  if (def.baseMana > 0) {
    champion.maxMana = growthStat(def.baseMana, def.manaPerLevel, champion.level) + manaBonus;
    champion.mana = Math.min(champion.maxMana, champion.maxMana * manaRatio);
  }
}

function purchasePrice(item: { cost: number; combineCost: number; buildsFrom: readonly string[] }): number {
  return item.buildsFrom.length > 0 ? item.combineCost : item.cost;
}

function itemCount(items: readonly string[], itemId: string): number {
  let count = 0;
  for (const id of items) {
    if (id === itemId) {
      count += 1;
    }
  }
  return count;
}

function consumeParts(items: string[], buildsFrom: readonly string[]): boolean {
  const pool = [...items];
  for (const part of buildsFrom) {
    const index = pool.indexOf(part);
    if (index < 0) {
      return false;
    }
    pool.splice(index, 1);
  }
  items.length = 0;
  items.push(...pool);
  return true;
}

function hasParts(items: readonly string[], buildsFrom: readonly string[]): boolean {
  const pool = [...items];
  for (const part of buildsFrom) {
    const index = pool.indexOf(part);
    if (index < 0) {
      return false;
    }
    pool.splice(index, 1);
  }
  return true;
}

function hasSupportQuestProgress(champion: ChampionEntity): boolean {
  return (
    SUPPORT_QUEST_LINE.some((id) => champion.items.includes(id)) ||
    SUPPORT_FINISHED.some((id) => champion.items.includes(id))
  );
}

function isSupportExclusive(itemId: ItemId): boolean {
  return (
    itemId === 'WorldAtlas' ||
    itemId === 'RunicCompass' ||
    itemId === 'BountyofWorlds' ||
    SUPPORT_FINISHED.includes(itemId as (typeof SUPPORT_FINISHED)[number])
  );
}

const BOOT_UPGRADES = [
  'PlatedSteelcaps',
  'BerserkersGreaves',
  'BootsofSwiftness',
  'SorcerersShoes',
  'MercurysTreads',
  'IonianBootsofLucidity',
  'MobilityBoots',
] as const;

const STARTER_ITEMS = ['DoransBlade', 'DoransRing', 'DoransShield'] as const;

export function isLegendaryItem(item: {
  cost: number;
  buildsFrom: readonly string[];
  buildsInto?: readonly string[];
  tags?: readonly string[];
} | null | undefined): boolean {
  if (!item || item.buildsFrom.length === 0) {
    return false;
  }
  if (item.tags?.includes('Boots')) {
    return false;
  }
  if ((item.buildsInto?.length ?? 0) > 0 && item.cost < 2500) {
    return false;
  }
  return item.cost >= 2200;
}

export function countLegendaries(
  state: GameState,
  champion: ChampionEntity,
): number {
  let count = 0;
  for (const itemId of champion.items) {
    if (isLegendaryItem(state.lockedPack.items[itemId])) {
      count += 1;
    }
  }
  return count;
}

function isBootItem(itemId: string, item: { tags?: readonly string[] } | null | undefined): boolean {
  return itemId === 'Boots' || !!item?.tags?.includes('Boots') || BOOT_UPGRADES.includes(itemId as (typeof BOOT_UPGRADES)[number]);
}

function hasAnyBoots(state: GameState, champion: ChampionEntity): boolean {
  return champion.items.some((id) => isBootItem(id, state.lockedPack.items[id]));
}

function hasUpgradedBoots(champion: ChampionEntity): boolean {
  return BOOT_UPGRADES.some((id) => champion.items.includes(id));
}

function preferredBootUpgrade(prefer: readonly ItemId[]): ItemId | null {
  for (const itemId of prefer) {
    if (itemId !== 'Boots' && BOOT_UPGRADES.includes(itemId as (typeof BOOT_UPGRADES)[number])) {
      return itemId;
    }
  }
  return null;
}

function bootUpgradeParts(
  state: GameState,
  prefer: readonly ItemId[],
): Set<string> {
  const bootUpgrade = preferredBootUpgrade(prefer);
  if (!bootUpgrade) {
    return new Set();
  }
  const parts = new Set<string>();
  collectRecipeParts(state, bootUpgrade, parts);
  return parts;
}

function bootPurchaseBias(
  state: GameState,
  champion: ChampionEntity,
  itemId: ItemId,
  prefer: readonly ItemId[],
): number {
  const item = state.lockedPack.items[itemId];
  const upgradeParts = bootUpgradeParts(state, prefer);
  const inBootPath = isBootItem(itemId, item) || upgradeParts.has(itemId);
  if (!inBootPath) {
    return 0;
  }
  if (!hasAnyBoots(state, champion)) {
    return itemId === 'Boots' ? -30 : -8;
  }
  if (hasUpgradedBoots(champion)) {
    return 0;
  }
  if (itemId === 'Boots') {
    return 0;
  }
  const legendaries = countLegendaries(state, champion);
  if (legendaries <= 0) {
    return isBootItem(itemId, item) ? 3 : 0;
  }
  if (legendaries === 1) {
    return -10;
  }
  if (legendaries === 2) {
    return -4;
  }
  return -1;
}

function collectRecipeParts(
  state: GameState,
  itemId: ItemId,
  sink: Set<string>,
): void {
  const item = state.lockedPack.items[itemId];
  if (!item) {
    return;
  }
  sink.add(itemId);
  for (const part of item.buildsFrom) {
    collectRecipeParts(state, part, sink);
  }
}

export function focusShopPrefer(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): ItemId[] {
  const focus: ItemId[] = [];
  const ownsBoots = hasAnyBoots(state, champion);
  if (!ownsBoots) {
    focus.push('Boots');
  }
  if (!hasSupportQuestProgress(champion) && champion.positionLabel === 'SUPPORT') {
    focus.push('WorldAtlas');
  }
  const goals = primaryShopGoals(state, champion, prefer);
  for (const target of goals) {
    const parts = new Set<string>();
    collectRecipeParts(state, target, parts);
    for (const partId of parts) {
      focus.push(partId as ItemId);
    }
  }
  if (!hasUpgradedBoots(champion)) {
    const bootUpgrade = preferredBootUpgrade(prefer);
    if (bootUpgrade && !goals.includes(bootUpgrade)) {
      const parts = new Set<string>();
      collectRecipeParts(state, bootUpgrade, parts);
      for (const partId of parts) {
        focus.push(partId as ItemId);
      }
    } else if (ownsBoots && !preferredBootUpgrade(prefer)) {
      focus.push('Boots');
    }
  }
  return [...new Set(focus)];
}

export function canFinishPreferredLegendary(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): boolean {
  const focus = focusShopPrefer(state, champion, prefer);
  return focus.some((itemId) => {
    const item = state.lockedPack.items[itemId];
    return (
      !!item &&
      isLegendaryItem(item) &&
      hasParts(champion.items, item.buildsFrom) &&
      champion.gold >= purchasePrice(item)
    );
  });
}

export type PendingShopPurchase = {
  itemId: ItemId;
  price: number;
  deficit: number;
  isLegendary: boolean;
  isBoot: boolean;
};

function candidatePendingPurchases(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): PendingShopPurchase[] {
  const focus = focusShopPrefer(state, champion, prefer);
  const out: PendingShopPurchase[] = [];
  for (const itemId of focus) {
    const item = state.lockedPack.items[itemId];
    if (!item || !item.purchasable) {
      continue;
    }
    if (preferGoalOwned(state, champion, focus, itemId)) {
      continue;
    }
    const owned = itemCount(champion.items, itemId);
    const useful = maxUsefulCopies(state, champion, focus, itemId);
    if (useful <= 0 || owned >= useful) {
      continue;
    }
    if (item.buildsFrom.length > 0 && !hasParts(champion.items, item.buildsFrom)) {
      continue;
    }
    const slotsAfter = champion.items.length - item.buildsFrom.length + 1;
    if (slotsAfter > 6) {
      continue;
    }
    const price = purchasePrice(item);
    out.push({
      itemId,
      price,
      deficit: Math.max(0, price - champion.gold),
      isLegendary: isLegendaryItem(item),
      isBoot: isBootItem(itemId, item),
    });
  }
  return out;
}

export function nextFocusPurchaseCost(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): number {
  let best = 0;
  for (const entry of candidatePendingPurchases(state, champion, prefer)) {
    if (entry.deficit === 0 && entry.price > best) {
      best = entry.price;
    }
  }
  return best;
}

function missingRecipeParts(
  ownedItems: readonly string[],
  buildsFrom: readonly string[],
): string[] {
  const pool = [...ownedItems];
  const missing: string[] = [];
  for (const part of buildsFrom) {
    const index = pool.indexOf(part);
    if (index < 0) {
      missing.push(part);
      continue;
    }
    pool.splice(index, 1);
  }
  return missing;
}

function pickPendingEntry(
  state: GameState,
  champion: ChampionEntity,
  itemId: ItemId,
): PendingShopPurchase | null {
  const item = state.lockedPack.items[itemId];
  if (!item?.purchasable) {
    return null;
  }
  if (item.buildsFrom.length > 0 && !hasParts(champion.items, item.buildsFrom)) {
    let bestPart: PendingShopPurchase | null = null;
    for (const partId of missingRecipeParts(champion.items, item.buildsFrom)) {
      const nested = pickPendingEntry(state, champion, partId);
      if (!nested) {
        continue;
      }
      if (
        !bestPart ||
        nested.deficit < bestPart.deficit ||
        (nested.deficit === bestPart.deficit && nested.price > bestPart.price)
      ) {
        bestPart = nested;
      }
    }
    return bestPart;
  }
  const price = purchasePrice(item);
  return {
    itemId,
    price,
    deficit: Math.max(0, price - champion.gold),
    isLegendary: isLegendaryItem(item),
    isBoot: isBootItem(itemId, item),
  };
}

function pendingForItem(
  state: GameState,
  champion: ChampionEntity,
  itemId: ItemId,
): PendingShopPurchase | null {
  const item = state.lockedPack.items[itemId];
  if (!item || !item.purchasable) {
    return null;
  }
  if (isLegendaryItem(item) && champion.items.includes(itemId)) {
    return null;
  }
  if (item.buildsFrom.length > 0) {
    if (!hasParts(champion.items, item.buildsFrom)) {
      return pickPendingEntry(state, champion, itemId);
    }
    if (champion.items.includes(itemId) && isLegendaryItem(item)) {
      return null;
    }
    const price = purchasePrice(item);
    return {
      itemId,
      price,
      deficit: Math.max(0, price - champion.gold),
      isLegendary: isLegendaryItem(item),
      isBoot: isBootItem(itemId, item),
    };
  }
  if (champion.items.includes(itemId)) {
    return null;
  }
  const price = purchasePrice(item);
  return {
    itemId,
    price,
    deficit: Math.max(0, price - champion.gold),
    isLegendary: false,
    isBoot: isBootItem(itemId, item),
  };
}

export function nextPendingPurchase(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): PendingShopPurchase | null {
  const focus = focusShopPrefer(state, champion, prefer);
  for (const itemId of focus) {
    const item = state.lockedPack.items[itemId];
    if (!item || preferGoalOwned(state, champion, prefer, itemId)) {
      continue;
    }
    if (!isLegendaryItem(item)) {
      continue;
    }
    const pending = pendingForItem(state, champion, itemId);
    if (pending) {
      return pending;
    }
  }
  if (!hasUpgradedBoots(champion)) {
    const bootUpgrade = preferredBootUpgrade(prefer);
    if (bootUpgrade) {
      const pending = pendingForItem(state, champion, bootUpgrade);
      if (pending) {
        return pending;
      }
    }
  }
  const candidates = candidatePendingPurchases(state, champion, prefer);
  if (candidates.length === 0) {
    return null;
  }
  candidates.sort((left, right) => {
    if (left.deficit !== right.deficit) {
      return left.deficit - right.deficit;
    }
    return right.price - left.price;
  });
  return candidates[0] ?? null;
}

export function hasMeaningfulShopBuy(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): boolean {
  if (canFinishPreferredLegendary(state, champion, prefer)) {
    return true;
  }
  const affordable = nextFocusPurchaseCost(state, champion, prefer);
  if (affordable >= 800) {
    return true;
  }
  if (canBuyAnyPreferred(state, champion, prefer) && champion.gold >= 700) {
    return true;
  }
  const pending = nextPendingPurchase(state, champion, prefer);
  if (!pending) {
    return false;
  }
  if (pending.deficit === 0 && (pending.isBoot || pending.isLegendary || pending.price >= 350)) {
    return true;
  }
  return pending.deficit > 0 && pending.deficit <= 450 && (pending.isLegendary || pending.isBoot || pending.price >= 700);
}

function preferGoalOwned(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
  itemId: ItemId,
): boolean {
  const item = state.lockedPack.items[itemId];
  if (!item) {
    return true;
  }
  return remainingNeedAcrossPrefer(state, champion, prefer, itemId) <= 0;
}

function countRemainingNeed(
  state: GameState,
  recipeId: ItemId,
  partId: ItemId,
  pool: string[],
): number {
  if (recipeId === partId) {
    const index = pool.indexOf(partId);
    if (index >= 0) {
      pool.splice(index, 1);
      return 0;
    }
    return 1;
  }
  const recipe = state.lockedPack.items[recipeId];
  if (!recipe) {
    return 0;
  }
  if (recipe.buildsFrom.length > 0) {
    const ownedIndex = pool.indexOf(recipeId);
    if (ownedIndex >= 0) {
      pool.splice(ownedIndex, 1);
      return 0;
    }
  }
  let need = 0;
  for (const part of recipe.buildsFrom) {
    need += countRemainingNeed(state, part, partId, pool);
  }
  return need;
}

function isShopGoalItem(
  state: GameState,
  itemId: ItemId,
  item: { cost: number; buildsFrom: readonly string[]; buildsInto?: readonly string[]; tags?: readonly string[] },
): boolean {
  if (isBootItem(itemId, item)) {
    return itemId !== 'Boots';
  }
  if ((STARTER_ITEMS as readonly string[]).includes(itemId as (typeof STARTER_ITEMS)[number])) {
    return false;
  }
  if (
    (SUPPORT_QUEST_LINE as readonly string[]).includes(itemId) ||
    (SUPPORT_FINISHED as readonly string[]).includes(itemId)
  ) {
    return true;
  }
  return isLegendaryItem(item);
}

function partFeedsOwnedLegendary(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
  partId: ItemId,
): boolean {
  for (const preferId of prefer) {
    const item = state.lockedPack.items[preferId];
    if (!item || !isLegendaryItem(item) || !champion.items.includes(preferId)) {
      continue;
    }
    const parts = new Set<string>();
    collectRecipeParts(state, preferId, parts);
    if (parts.has(partId)) {
      return true;
    }
  }
  return false;
}

function supportQuestGoalOwned(champion: ChampionEntity, itemId: ItemId): boolean {
  if (
    (SUPPORT_QUEST_LINE as readonly string[]).includes(itemId) ||
    (SUPPORT_FINISHED as readonly string[]).includes(itemId)
  ) {
    return hasSupportQuestProgress(champion);
  }
  return false;
}

function primaryShopGoals(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): ItemId[] {
  const goals: ItemId[] = [];
  for (const preferId of prefer) {
    const item = state.lockedPack.items[preferId];
    if (!item || champion.items.includes(preferId) || supportQuestGoalOwned(champion, preferId)) {
      continue;
    }
    if (!isShopGoalItem(state, preferId, item)) {
      continue;
    }
    if (isBootItem(preferId, item)) {
      continue;
    }
    goals.push(preferId);
    break;
  }
  if (!hasUpgradedBoots(champion)) {
    const bootUpgrade = preferredBootUpgrade(prefer);
    if (bootUpgrade && !champion.items.includes(bootUpgrade)) {
      goals.push(bootUpgrade);
    }
  }
  return goals;
}

function remainingNeedAcrossPrefer(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
  itemId: ItemId,
): number {
  const goals = primaryShopGoals(state, champion, prefer);
  if (goals.length === 0) {
    return 0;
  }
  let max = 0;
  for (const preferId of goals) {
    const pool = [...champion.items];
    const need =
      preferId === itemId
        ? Math.max(0, 1 - itemCount(champion.items, itemId))
        : countRemainingNeed(state, preferId, itemId, pool);
    if (need > max) {
      max = need;
    }
  }
  return max;
}

function maxUsefulCopies(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
  itemId: ItemId,
): number {
  const item = state.lockedPack.items[itemId];
  if (!item) {
    return 0;
  }
  const owned = itemCount(champion.items, itemId);
  const remaining = remainingNeedAcrossPrefer(state, champion, prefer, itemId);
  if (remaining > 0) {
    return owned + remaining;
  }
  return owned;
}

function leafCompletesFocusEpic(
  state: GameState,
  champion: ChampionEntity,
  leafId: ItemId,
  prefer: readonly ItemId[],
): ItemId | null {
  const leaf = state.lockedPack.items[leafId];
  if (!leaf || leaf.buildsFrom.length > 0) {
    return null;
  }
  for (const itemId of prefer) {
    const item = state.lockedPack.items[itemId];
    if (!item || item.buildsFrom.length === 0 || champion.items.includes(itemId)) {
      continue;
    }
    if (!item.buildsFrom.includes(leafId)) {
      continue;
    }
    const pool = [...champion.items, leafId];
    if (!hasParts(pool, item.buildsFrom)) {
      continue;
    }
    return itemId;
  }
  return null;
}

export function canTryBuyItem(
  state: GameState,
  champion: ChampionEntity,
  itemId: ItemId,
  prefer: readonly ItemId[] = [],
): boolean {
  const fountain =
    champion.side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
  if (dist(champion.position, fountain) > 600) {
    return false;
  }
  const item = state.lockedPack.items[itemId];
  if (!item || !item.purchasable) {
    return false;
  }
  if (itemId === 'Boots' && BOOT_UPGRADES.some((id) => champion.items.includes(id))) {
    return false;
  }
  if (prefer.length > 0 && preferGoalOwned(state, champion, prefer, itemId)) {
    return false;
  }
  if (
    prefer.length > 0 &&
    item.buildsFrom.length === 0 &&
    !isBootItem(itemId, item) &&
    !(STARTER_ITEMS as readonly string[]).includes(itemId as (typeof STARTER_ITEMS)[number]) &&
    remainingNeedAcrossPrefer(state, champion, prefer, itemId) <= 0
  ) {
    return false;
  }
  const owned = itemCount(champion.items, itemId);
  const useful =
    prefer.length > 0
      ? maxUsefulCopies(state, champion, prefer, itemId)
      : item.buildsFrom.length === 0
        ? 2
        : 1;
  if (useful <= 0 || owned >= useful) {
    return false;
  }
  const isComponent = item.buildsFrom.length === 0;
  if (isSupportExclusive(itemId) && hasSupportQuestProgress(champion)) {
    return false;
  }
  if (!hasParts(champion.items, item.buildsFrom)) {
    return false;
  }
  const slotsAfter = champion.items.length - item.buildsFrom.length + 1;
  if (slotsAfter > 6) {
    if (!isComponent || prefer.length === 0) {
      return false;
    }
    const epicId = leafCompletesFocusEpic(state, champion, itemId, prefer);
    if (!epicId) {
      return false;
    }
    const epic = state.lockedPack.items[epicId];
    if (!epic) {
      return false;
    }
    const slotsAfterCombine =
      champion.items.length + 1 - epic.buildsFrom.length + 1;
    if (slotsAfterCombine > 6) {
      return false;
    }
    return champion.gold >= purchasePrice(item) + purchasePrice(epic);
  }
  return champion.gold >= purchasePrice(item);
}

export function tryBuyItem(
  state: GameState,
  champion: ChampionEntity,
  itemId: ItemId,
  recorder?: ReplayRecorder,
  prefer: readonly ItemId[] = [],
): boolean {
  if (!canTryBuyItem(state, champion, itemId, prefer)) {
    return false;
  }
  const item = state.lockedPack.items[itemId];
  if (!item) {
    return false;
  }
  const overflowEpicId =
    item.buildsFrom.length === 0 && champion.items.length >= 6
      ? leafCompletesFocusEpic(state, champion, itemId, prefer)
      : null;
  const price = purchasePrice(item);
  champion.gold -= price;
  if (item.buildsFrom.length > 0) {
    consumeParts(champion.items, item.buildsFrom);
  }
  champion.items.push(itemId);
  recorder?.record(state, {
    type: 'item_buy',
    actorId: champion.id,
    payload: { itemId, goldLeft: champion.gold, price },
  });
  if (overflowEpicId) {
    tryBuyItem(state, champion, overflowEpicId, recorder, prefer);
  }
  recomputeItemStats(state, champion);
  return true;
}

export function canBuyAnyPreferred(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): boolean {
  const focus = focusShopPrefer(state, champion, prefer);
  return focus.some((itemId) => canTryBuyItem(state, champion, itemId, focus));
}

function supportFinishedChoice(state: GameState, champion: ChampionEntity): ItemId {
  const champDef = state.lockedPack.champions[champion.championId];
  const name = champDef?.name?.toLowerCase() ?? champion.championId.toLowerCase();
  if (/lulu|nami|soraka|yuumi|janna|milio|renata|sona/.test(name)) {
    return 'DreamMaker';
  }
  if (/thresh|leona|nautilus|rell|alistar|braum|rakan/.test(name)) {
    return 'CelestialOpposition';
  }
  if (/pyke|pantheon|karma|senna|swain|brand|zyra|xerath|lux/.test(name)) {
    return champion.ad >= champion.ap ? 'Bloodsong' : 'ZazZaksRealmspike';
  }
  if (champion.ap > champion.ad + 15) {
    return 'ZazZaksRealmspike';
  }
  if (champion.ad > champion.ap + 10) {
    return 'Bloodsong';
  }
  return 'CelestialOpposition';
}

export function maybeUpgradeSupportQuest(
  state: GameState,
  champion: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (champion.positionLabel !== 'SUPPORT') {
    return false;
  }
  const questGold = champion.goldBySource['support_quest'] ?? 0;
  if (champion.items.includes('WorldAtlas') && questGold >= 500) {
    const index = champion.items.indexOf('WorldAtlas');
    champion.items.splice(index, 1, 'RunicCompass');
    recomputeItemStats(state, champion);
    recorder?.record(state, {
      type: 'item_buy',
      actorId: champion.id,
      payload: { itemId: 'RunicCompass', via: 'support_quest' },
    });
    return true;
  }
  if (champion.items.includes('RunicCompass') && questGold >= 1000) {
    const index = champion.items.indexOf('RunicCompass');
    champion.items.splice(index, 1, 'BountyofWorlds');
    recomputeItemStats(state, champion);
    recorder?.record(state, {
      type: 'item_buy',
      actorId: champion.id,
      payload: { itemId: 'BountyofWorlds', via: 'support_quest' },
    });
    return true;
  }
  if (champion.items.includes('BountyofWorlds') && questGold >= 1000) {
    const finished = supportFinishedChoice(state, champion);
    if (!state.lockedPack.items[finished]) {
      return false;
    }
    const index = champion.items.indexOf('BountyofWorlds');
    champion.items.splice(index, 1, finished);
    recomputeItemStats(state, champion);
    recorder?.record(state, {
      type: 'item_buy',
      actorId: champion.id,
      payload: { itemId: finished, via: 'support_quest' },
    });
    return true;
  }
  return false;
}

function sellOwnedItem(
  state: GameState,
  champion: ChampionEntity,
  itemId: ItemId,
  recorder?: ReplayRecorder,
): boolean {
  const index = champion.items.indexOf(itemId);
  if (index < 0) {
    return false;
  }
  const item = state.lockedPack.items[itemId];
  champion.items.splice(index, 1);
  const refund = Math.floor((item?.cost ?? 400) * 0.7);
  champion.gold += refund;
  recomputeItemStats(state, champion);
  recorder?.record(state, {
    type: 'item_buy',
    actorId: champion.id,
    payload: { itemId, sold: true, refund },
  });
  return true;
}

function sellStarterIfNeeded(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
  recorder?: ReplayRecorder,
): boolean {
  const hasStarter = STARTER_ITEMS.some((id) => champion.items.includes(id));
  if (!hasStarter) {
    return false;
  }
  const wantsComplete = prefer.some((itemId) => {
    const item = state.lockedPack.items[itemId];
    return (
      !!item &&
      item.buildsFrom.length > 0 &&
      !preferGoalOwned(state, champion, prefer, itemId) &&
      hasParts(champion.items, item.buildsFrom) &&
      champion.gold >= purchasePrice(item)
    );
  });
  const needsSlot =
    champion.items.length >= 4 ||
    champion.gold >= 900 ||
    wantsComplete ||
    countLegendaries(state, champion) >= 1;
  if (!needsSlot) {
    return false;
  }
  for (const starterId of STARTER_ITEMS) {
    if (sellOwnedItem(state, champion, starterId, recorder)) {
      return true;
    }
  }
  return false;
}

function collectRemainingRecipeParts(
  state: GameState,
  recipeId: ItemId,
  pool: string[],
  sink: Set<string>,
): void {
  const recipe = state.lockedPack.items[recipeId];
  if (!recipe) {
    return;
  }
  sink.add(recipeId);
  if (recipe.buildsFrom.length > 0) {
    const ownedIndex = pool.indexOf(recipeId);
    if (ownedIndex >= 0) {
      pool.splice(ownedIndex, 1);
      return;
    }
  }
  for (const part of recipe.buildsFrom) {
    collectRemainingRecipeParts(state, part, pool, sink);
  }
}

function usefulPartsForCurrentGoals(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
): Set<string> {
  const useful = new Set<string>();
  for (const goalId of primaryShopGoals(state, champion, prefer)) {
    collectRemainingRecipeParts(state, goalId, [...champion.items], useful);
  }
  for (const itemId of BOOT_UPGRADES) {
    useful.add(itemId);
  }
  useful.add('Boots');
  return useful;
}

function sellOrphanComponents(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
  recorder?: ReplayRecorder,
): boolean {
  if (prefer.length === 0) {
    return false;
  }
  const goals = primaryShopGoals(state, champion, prefer);
  const needsRoom =
    champion.items.length >= 6 ||
    (champion.items.length >= 5 && goals.length > 0) ||
    (champion.items.length >= 4 && goals.length > 0 && champion.gold >= 900);
  if (!needsRoom) {
    return false;
  }
  const useful = usefulPartsForCurrentGoals(state, champion, prefer);
  for (const itemId of [...champion.items]) {
    if (useful.has(itemId)) {
      continue;
    }
    if ((STARTER_ITEMS as readonly string[]).includes(itemId)) {
      continue;
    }
    const item = state.lockedPack.items[itemId];
    if (isLegendaryItem(item) || isBootItem(itemId, item)) {
      continue;
    }
    if (
      (SUPPORT_QUEST_LINE as readonly string[]).includes(itemId) ||
      (SUPPORT_FINISHED as readonly string[]).includes(itemId)
    ) {
      continue;
    }
    if (partFeedsOwnedLegendary(state, champion, prefer, itemId) && remainingNeedAcrossPrefer(state, champion, prefer, itemId) <= 0) {
      if (sellOwnedItem(state, champion, itemId, recorder)) {
        return true;
      }
      continue;
    }
    if (sellOwnedItem(state, champion, itemId, recorder)) {
      return true;
    }
  }
  return false;
}

export function buyAffordableItems(
  state: GameState,
  champion: ChampionEntity,
  prefer: readonly ItemId[],
  recorder?: ReplayRecorder,
): number {
  maybeUpgradeSupportQuest(state, champion, recorder);
  const focus = focusShopPrefer(state, champion, prefer);
  let bought = 0;
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    sellStarterIfNeeded(state, champion, focus, recorder);
    sellOrphanComponents(state, champion, prefer, recorder);
    const order = [...focus].sort((left, right) => {
      const leftItem = state.lockedPack.items[left];
      const rightItem = state.lockedPack.items[right];
      const leftBootBias = bootPurchaseBias(state, champion, left, prefer);
      const rightBootBias = bootPurchaseBias(state, champion, right, prefer);
      if (leftBootBias !== rightBootBias) {
        return leftBootBias - rightBootBias;
      }
      const leftReady =
        !!leftItem &&
        leftItem.buildsFrom.length > 0 &&
        !preferGoalOwned(state, champion, focus, left) &&
        hasParts(champion.items, leftItem.buildsFrom)
          ? 0
          : 1;
      const rightReady =
        !!rightItem &&
        rightItem.buildsFrom.length > 0 &&
        !preferGoalOwned(state, champion, focus, right) &&
        hasParts(champion.items, rightItem.buildsFrom)
          ? 0
          : 1;
      if (leftReady !== rightReady) {
        return leftReady - rightReady;
      }
      const leftOwned = champion.items.includes(left) ? 1 : 0;
      const rightOwned = champion.items.includes(right) ? 1 : 0;
      if (leftOwned !== rightOwned) {
        return leftOwned - rightOwned;
      }
      const leftLegendary = isLegendaryItem(leftItem) ? 0 : 1;
      const rightLegendary = isLegendaryItem(rightItem) ? 0 : 1;
      if (leftLegendary !== rightLegendary) {
        return leftLegendary - rightLegendary;
      }
      const leftCompletes =
        leftItem && leftItem.buildsFrom.length === 0 && leafCompletesFocusEpic(state, champion, left, focus)
          ? 0
          : 1;
      const rightCompletes =
        rightItem &&
        rightItem.buildsFrom.length === 0 &&
        leafCompletesFocusEpic(state, champion, right, focus)
          ? 0
          : 1;
      if (leftCompletes !== rightCompletes) {
        return leftCompletes - rightCompletes;
      }
      const leftMissing =
        leftItem && leftItem.buildsFrom.length === 0 && !champion.items.includes(left)
          ? leftItem.cost
          : 0;
      const rightMissing =
        rightItem && rightItem.buildsFrom.length === 0 && !champion.items.includes(right)
          ? rightItem.cost
          : 0;
      if (leftMissing !== rightMissing) {
        return rightMissing - leftMissing;
      }
      return (rightItem?.cost ?? 0) - (leftItem?.cost ?? 0);
    });
    let purchased = false;
    for (const itemId of order) {
      if (tryBuyItem(state, champion, itemId, recorder, focus)) {
        bought += 1;
        purchased = true;
        break;
      }
    }
    if (!purchased) {
      break;
    }
  }
  maybeUpgradeSupportQuest(state, champion, recorder);
  return bought;
}

const SHARED_RICHES_MAX_CHARGES = 3;
const SHARED_RICHES_CHARGE_SEC = 20;
const SHARED_RICHES_ALLY_RANGE = 1050;
const SHARED_RICHES_GOLD = 18;

export function hasSupportSharedRichesItem(champion: ChampionEntity): boolean {
  return (
    SUPPORT_QUEST_LINE.some((id) => champion.items.includes(id)) ||
    SUPPORT_FINISHED.some((id) => champion.items.includes(id))
  );
}

export function nearestSharedRichesAlly(
  state: GameState,
  support: ChampionEntity,
): ChampionEntity | null {
  let best: ChampionEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const ally of state.champions) {
    if (!ally.alive || ally.side !== support.side || ally.id === support.id) {
      continue;
    }
    const gap = dist(ally.position, support.position);
    if (gap > SHARED_RICHES_ALLY_RANGE || gap >= bestDist) {
      continue;
    }
    best = ally;
    bestDist = gap;
  }
  return best;
}

export function supportCanSharedRichesExecute(
  state: GameState,
  support: ChampionEntity,
): boolean {
  return (
    support.positionLabel === 'SUPPORT' &&
    hasSupportSharedRichesItem(support) &&
    support.supportSharedRichesCharges > 0 &&
    nearestSharedRichesAlly(state, support) !== null
  );
}

export function tryConsumeSharedRichesCharge(
  state: GameState,
  support: ChampionEntity,
): boolean {
  if (!supportCanSharedRichesExecute(state, support)) {
    return false;
  }
  support.supportSharedRichesCharges -= 1;
  if (
    support.supportSharedRichesCharges < SHARED_RICHES_MAX_CHARGES &&
    support.supportSharedRichesNextAt <= state.scheduler.time
  ) {
    support.supportSharedRichesNextAt = state.scheduler.time + SHARED_RICHES_CHARGE_SEC;
  }
  return true;
}

export function tryPaySharedRichesCombat(
  state: GameState,
  support: ChampionEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (!tryConsumeSharedRichesCharge(state, support)) {
    return false;
  }
  grantGold(state, support, SHARED_RICHES_GOLD, 'support_item', recorder);
  support.goldBySource['support_quest'] =
    (support.goldBySource['support_quest'] ?? 0) + SHARED_RICHES_GOLD;
  return true;
}

export function paySharedRichesMinionKill(
  state: GameState,
  support: ChampionEntity,
  minionGold: number,
  recorder?: ReplayRecorder,
): ChampionEntity | null {
  if (!tryConsumeSharedRichesCharge(state, support)) {
    return null;
  }
  grantGold(state, support, SHARED_RICHES_GOLD, 'support_item', recorder);
  support.goldBySource['support_quest'] =
    (support.goldBySource['support_quest'] ?? 0) + SHARED_RICHES_GOLD;
  const ally = nearestSharedRichesAlly(state, support);
  if (ally) {
    grantGold(state, ally, minionGold, 'cs', recorder);
  }
  return ally;
}

export function tickSupportSharedRiches(state: GameState): void {
  const now = state.scheduler.time;
  for (const champion of state.champions) {
    if (champion.positionLabel !== 'SUPPORT' || !hasSupportSharedRichesItem(champion)) {
      continue;
    }
    if (champion.supportSharedRichesNextAt <= 0) {
      champion.supportSharedRichesNextAt = Math.max(now, 65);
    }
    while (
      champion.supportSharedRichesCharges < SHARED_RICHES_MAX_CHARGES &&
      now + 1e-9 >= champion.supportSharedRichesNextAt
    ) {
      champion.supportSharedRichesCharges += 1;
      champion.supportSharedRichesNextAt += SHARED_RICHES_CHARGE_SEC;
    }
  }
}

export function shareSupportGold(
  _state: GameState,
  _earner: ChampionEntity,
  _amount: number,
  _recorder?: ReplayRecorder,
): void {
}

export function tickSupportItemIncome(state: GameState, dt: number, recorder?: ReplayRecorder): void {
  tickSupportSharedRiches(state);
  for (const champion of state.champions) {
    if (!champion.alive || champion.positionLabel !== 'SUPPORT') {
      continue;
    }
    if (!hasSupportSharedRichesItem(champion)) {
      continue;
    }
    const rate = 0.58 * dt;
    grantGold(state, champion, rate, 'support_item', recorder);
    champion.goldBySource['support_quest'] = (champion.goldBySource['support_quest'] ?? 0) + rate;
  }
}
