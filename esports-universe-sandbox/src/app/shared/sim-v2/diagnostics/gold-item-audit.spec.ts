import { describe, expect, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import { countLegendaries, isLegendaryItem } from '../economy/economy';
import { resolveShopPreferForChampion } from '../economy/shop-builds';

function roster(side: 'blue' | 'red', bots: string[]) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: bots[index],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function inventoryFullCost(
  items: readonly string[],
  catalog: Record<string, { cost: number } | undefined>,
): number {
  let total = 0;
  for (const itemId of items) {
    total += catalog[itemId]?.cost ?? 0;
  }
  return total;
}

function onPlanHits(
  owned: readonly string[],
  plan: readonly string[],
  catalog: Record<
    string,
    { cost: number; buildsFrom: readonly string[]; buildsInto?: readonly string[]; tags?: readonly string[] } | undefined
  >,
): { ownedGoals: number; planGoals: number; strayNonBoots: string[] } {
  const planGoals = plan.filter((id) => isLegendaryItem(catalog[id]) || id.includes('Boot') || id === 'WorldAtlas');
  const ownedGoals = owned.filter((id) => plan.includes(id) || isLegendaryItem(catalog[id]));
  const strayNonBoots = owned.filter((id) => {
    if (plan.includes(id)) {
      return false;
    }
    if (id === 'Boots' || catalog[id]?.tags?.includes('Boots')) {
      return false;
    }
    if ((['DoransBlade', 'DoransRing', 'DoransShield', 'LongSword'] as const).includes(id as never)) {
      return false;
    }
    const item = catalog[id];
    if (!item) {
      return true;
    }
    if (isLegendaryItem(item) && !plan.includes(id)) {
      return true;
    }
    return item.buildsFrom.length === 0 && !plan.includes(id);
  });
  return {
    ownedGoals: ownedGoals.length,
    planGoals: planGoals.length,
    strayNonBoots,
  };
}

describe('gold ↔ item spend audit', () => {
  it('checks multi-seed pocket/spend/legendaries/plan adherence', () => {
    const seeds = [1000, 1100, 1200, 42, 77];
    const comps = [
      {
        blue: ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh'],
        red: ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona'],
      },
      {
        blue: ['Darius', 'Graves', 'Annie', 'Ezreal', 'Nautilus'],
        red: ['Renekton', 'LeeSin', 'Orianna', 'Jhin', 'Lux'],
      },
    ] as const;

    const rows: string[] = [];
    const flags: string[] = [];
    let champSamples = 0;
    let highPocketWhileEmptyish = 0;
    let lowSpendHighEarn = 0;
    let zeroLegendariesCarry = 0;
    let totalLegendaries = 0;
    let totalEarned = 0;
    let totalPocket = 0;
    let totalInvCost = 0;
    const roleLeg: Record<string, number[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      BOT: [],
      SUPPORT: [],
    };

    for (const seed of seeds) {
      for (const [compIndex, comp] of comps.entries()) {
        const input: SimulateV2Input = {
          versionId: 'demo-a',
          seed: seed + compIndex * 17,
          blueTeamId: 'blue',
          redTeamId: 'red',
          blue: roster('blue', [...comp.blue]),
          red: roster('red', [...comp.red]),
          maxDurationSec: 1800,
        };
        const { state, replay } = simulateV2Match(input);
        const mins = Math.max(1, state.scheduler.time / 60);
        const buys = replay.events.filter((event) => event.type === 'item_buy');
        const sold = buys.filter((event) => !!(event.payload as { sold?: boolean } | undefined)?.sold).length;
        const realBuys = buys.length - sold;

        rows.push(
          `--- seed=${seed}+${compIndex} t=${state.scheduler.time.toFixed(0)}s buys=${realBuys} sells=${sold}`,
        );

        for (const champ of state.champions) {
          champSamples += 1;
          const earned = champ.earnedGold;
          const pocket = champ.gold;
          const spentApprox = earned - pocket;
          const invCost = inventoryFullCost(champ.items, state.lockedPack.items);
          const legs = countLegendaries(state, champ);
          const plan = resolveShopPreferForChampion(state, champ);
          const planCheck = onPlanHits(champ.items, plan, state.lockedPack.items);
          const spendRatio = earned > 0 ? spentApprox / earned : 0;
          const valueGap = spentApprox - invCost;

          totalEarned += earned;
          totalPocket += pocket;
          totalInvCost += invCost;
          totalLegendaries += legs;
          roleLeg[champ.positionLabel].push(legs);

          rows.push(
            [
              champ.side,
              champ.positionLabel.padEnd(7),
              champ.championId.padEnd(10),
              `lv${champ.level}`,
              `earn=${Math.round(earned)}`,
              `pocket=${Math.round(pocket)}`,
              `spent≈${Math.round(spentApprox)}`,
              `invCost=${Math.round(invCost)}`,
              `gap=${Math.round(valueGap)}`,
              `spend%=${Math.round(spendRatio * 100)}`,
              `legs=${legs}`,
              `items=[${champ.items.join(',')}]`,
              `planHit=${planCheck.ownedGoals}/${Math.min(6, planCheck.planGoals)}`,
              `stray=${planCheck.strayNonBoots.join('|') || '-'}`,
              `recall=${champ.recallCount}`,
            ].join(' '),
          );

          if (pocket >= 1800 && legs <= 1 && champ.positionLabel !== 'SUPPORT') {
            highPocketWhileEmptyish += 1;
            flags.push(
              `HOARD ${champ.side} ${champ.positionLabel} ${champ.championId} pocket=${Math.round(pocket)} legs=${legs} items=${champ.items.join(',')}`,
            );
          }
          if (earned >= 9000 && spendRatio < 0.55 && champ.positionLabel !== 'SUPPORT') {
            lowSpendHighEarn += 1;
            flags.push(
              `LOW_SPEND ${champ.side} ${champ.positionLabel} ${champ.championId} earn=${Math.round(earned)} spend%=${Math.round(spendRatio * 100)}`,
            );
          }
          if (
            mins >= 20 &&
            earned >= 8000 &&
            legs === 0 &&
            (champ.positionLabel === 'MID' || champ.positionLabel === 'BOT' || champ.positionLabel === 'TOP')
          ) {
            zeroLegendariesCarry += 1;
            flags.push(
              `NO_LEG ${champ.side} ${champ.positionLabel} ${champ.championId} earn=${Math.round(earned)} items=${champ.items.join(',')}`,
            );
          }
          if (valueGap < -800) {
            flags.push(
              `VALUE_OVER ${champ.side} ${champ.positionLabel} ${champ.championId} spent≈${Math.round(spentApprox)} inv=${Math.round(invCost)}`,
            );
          }
        }
      }
    }

    const avgSpendPct = totalEarned > 0 ? (totalEarned - totalPocket) / totalEarned : 0;
    const avgLegsPerChamp = totalLegendaries / Math.max(1, champSamples);
    const avgLegsPerGame = totalLegendaries / (seeds.length * comps.length);
    const roleAvg = Object.fromEntries(
      Object.entries(roleLeg).map(([role, vals]) => [
        role,
        Number((vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)).toFixed(2)),
      ]),
    );

    console.log(rows.join('\n'));
    console.log('FLAGS\n' + (flags.length ? flags.join('\n') : '(none)'));
    console.log(
      JSON.stringify(
        {
          champSamples,
          avgSpendPct: Number((avgSpendPct * 100).toFixed(1)),
          avgPocket: Math.round(totalPocket / champSamples),
          avgInvCost: Math.round(totalInvCost / champSamples),
          avgLegsPerChamp: Number(avgLegsPerChamp.toFixed(2)),
          avgLegsPerGame: Number(avgLegsPerGame.toFixed(2)),
          roleAvgLegs: roleAvg,
          highPocketWhileEmptyish,
          lowSpendHighEarn,
          zeroLegendariesCarry,
          flagCount: flags.length,
        },
        null,
        2,
      ),
    );

    expect(avgSpendPct).toBeGreaterThan(0.55);
    expect(avgLegsPerGame).toBeGreaterThanOrEqual(12);
    expect(roleAvg.BOT).toBeGreaterThanOrEqual(1.5);
    expect(roleAvg.MID).toBeGreaterThanOrEqual(1.5);
    expect(Math.abs(totalInvCost - (totalEarned - totalPocket)) / Math.max(1, totalEarned)).toBeLessThan(
      0.08,
    );
  }, 180_000);
});
