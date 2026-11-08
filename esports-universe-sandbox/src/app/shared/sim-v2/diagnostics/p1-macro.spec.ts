import { describe, expect, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import { runV2DiagMatch } from './pro-feel-audit';

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function roster(side: 'blue' | 'red') {
  const prefix = side;
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${prefix}_${position}`,
    gamertag: `${prefix}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function summarizeMatch(seed: number) {
  const input: SimulateV2Input = {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec: 1800,
  };
  const { state } = simulateV2Match(input);
  const totalDamage = state.champions.reduce((sum, champ) => sum + champ.damageToChampions, 0);
  const teamKills = {
    blue: state.champions.filter((champ) => champ.side === 'blue').reduce((s, c) => s + c.kills, 0),
    red: state.champions.filter((champ) => champ.side === 'red').reduce((s, c) => s + c.kills, 0),
  };
  const kps = state.champions.map((champ) => {
    const team = champ.side === 'blue' ? teamKills.blue : teamKills.red;
    return team <= 0 ? 0 : (champ.kills + champ.assists) / team;
  });
  return {
    totalDamage,
    avgDamage: totalDamage / 10,
    totalKills: teamKills.blue + teamKills.red,
    avgKp: mean(kps),
    withDamage: state.champions.filter((champ) => champ.damageToChampions > 2000).length,
    withKp: kps.filter((kp) => kp >= 0.35).length,
    supportKp: mean(
      state.champions
        .filter((champ) => champ.positionLabel === 'SUPPORT')
        .map((champ) => {
          const team = champ.side === 'blue' ? teamKills.blue : teamKills.red;
          return team <= 0 ? 0 : (champ.kills + champ.assists) / team;
        }),
    ),
  };
}

describe('V2 P1 match loop', () => {
  it('produces fights, towers or objectives, and earned-gold scale', () => {
    const diag = runV2DiagMatch('even', 1000);
    expect(diag.totalKills).toBeGreaterThanOrEqual(8);
    expect(diag.damageToChamps).toBeGreaterThan(20000);
    expect(diag.towers + diag.dragons).toBeGreaterThan(0);
    expect(diag.avgFinalGold).toBeGreaterThan(3000);
    expect(mean(diag.levelsAtEnd)).toBeGreaterThanOrEqual(3.5);
    expect(diag.minionLastHitsApprox).toBeGreaterThan(40);
  }, 180_000);

  it('keeps support poorer with support-item economy', () => {
    const input: SimulateV2Input = {
      versionId: 'demo-a',
      seed: 1000,
      blueTeamId: 'blue',
      redTeamId: 'red',
      blue: roster('blue'),
      red: roster('red'),
      maxDurationSec: 2400,
    };
    const { state } = simulateV2Match(input);
    const supports = state.champions.filter((champ) => champ.positionLabel === 'SUPPORT');
    const carries = state.champions.filter(
      (champ) => champ.positionLabel === 'BOT' || champ.positionLabel === 'MID',
    );
    const avgSupportGold = mean(supports.map((champ) => champ.earnedGold));
    const avgBotGold = mean(
      state.champions.filter((champ) => champ.positionLabel === 'BOT').map((champ) => champ.earnedGold),
    );
    const supportCs = mean(supports.map((champ) => champ.cs));
    const hasSupportItem = supports.every((champ) =>
      champ.items.some((itemId) =>
        [
          'WorldAtlas',
          'RunicCompass',
          'BountyofWorlds',
          'DreamMaker',
          'CelestialOpposition',
          'Bloodsong',
          'ZazZaksRealmspike',
          'SolsticeSleigh',
        ].includes(itemId),
      ),
    );
    const noCarryMythic = supports.every(
      (champ) => !champ.items.some((itemId) => ['InfinityEdge', "RabadonsDeathcap", 'BFSword'].includes(itemId)),
    );
    // eslint-disable-next-line no-console
    console.log({
      avgSupportGold: Math.round(avgSupportGold),
      avgBotGold: Math.round(avgBotGold),
      avgCarryGold: Math.round(mean(carries.map((champ) => champ.earnedGold))),
      supportCs: Number(supportCs.toFixed(1)),
      supportItems: supports.map((champ) => champ.items),
      supportDmg: supports.map((champ) => Math.round(champ.damageToChampions)),
      supportSources: supports.map((champ) => champ.goldBySource),
    });
    expect(hasSupportItem).toBe(true);
    expect(noCarryMythic).toBe(true);
    expect(supportCs).toBeLessThan(40);
    expect(avgSupportGold).toBeLessThan(9500);
  }, 180_000);

  it('spreads damage and kill participation more like a real game', () => {
    const samples = [1000, 1001, 1002].map(summarizeMatch);
    const avgDamage = mean(samples.map((sample) => sample.avgDamage));
    const avgKills = mean(samples.map((sample) => sample.totalKills));
    const avgKp = mean(samples.map((sample) => sample.avgKp));
    const withDamage = mean(samples.map((sample) => sample.withDamage));
    const withKp = mean(samples.map((sample) => sample.withKp));
    // eslint-disable-next-line no-console
    console.log({
      avgDamage: Math.round(avgDamage),
      avgKills: Number(avgKills.toFixed(1)),
      avgKp: Number(avgKp.toFixed(2)),
      withDamage: Number(withDamage.toFixed(1)),
      withKp: Number(withKp.toFixed(1)),
      samples: samples.map((sample) => ({
        dmg: Math.round(sample.avgDamage),
        kills: sample.totalKills,
        kp: Number(sample.avgKp.toFixed(2)),
        supportKp: Number(sample.supportKp.toFixed(2)),
      })),
    });
    expect(avgDamage).toBeGreaterThan(3500);
    expect(withDamage).toBeGreaterThanOrEqual(6);
    expect(withKp).toBeGreaterThanOrEqual(5);
    expect(avgKp).toBeGreaterThan(0.45);
    expect(avgKills).toBeGreaterThan(10);
    expect(avgKills).toBeLessThan(36);
  }, 180_000);
});
