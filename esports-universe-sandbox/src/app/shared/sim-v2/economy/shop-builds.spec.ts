import { describe, expect, it } from 'vitest';
import { CHAMPION_KITS } from '../../../core/data/champion-kits';
import { resolveShopPrefer } from './shop-builds';

describe('resolveShopPrefer', () => {
  it('gives Ezreal poke/sheen path instead of Infinity Edge', () => {
    const prefer = resolveShopPrefer({
      championId: 'Ezreal',
      position: 'BOT',
      ownedItems: [],
    });
    expect(prefer).toContain('TrinityForce');
    expect(prefer.some((item) => item === 'TearoftheGoddess' || item === 'Manamune' || item === 'Muramana')).toBe(
      true,
    );
    expect(prefer).not.toContain('InfinityEdge');
  });

  it('gives Maokai tank / support tank items instead of Hydra', () => {
    const prefer = resolveShopPrefer({
      championId: 'Maokai',
      position: 'SUPPORT',
      ownedItems: [],
    });
    expect(
      prefer.some(
        (item) =>
          item === 'HollowRadiance' ||
          item === 'SunfireAegis' ||
          item === 'LocketoftheIronSolari' ||
          item === 'Thornmail',
      ),
    ).toBe(true);
    expect(prefer).not.toContain('Tiamat');
    expect(prefer).not.toContain('TitanicHydra');
  });

  it('gives Elise AP path', () => {
    const prefer = resolveShopPrefer({
      championId: 'Elise',
      position: 'JUNGLE',
      ownedItems: [],
    });
    expect(prefer.some((item) => item === 'Shadowflame' || item === 'Stormsurge' || item === 'HextechRocketbelt')).toBe(
      true,
    );
    expect(prefer).not.toContain('Tiamat');
    expect(prefer).not.toContain('InfinityEdge');
  });

  it('keeps classic crit ADC on IE or YunTal line', () => {
    const prefer = resolveShopPrefer({
      championId: 'Jinx',
      position: 'BOT',
      ownedItems: [],
    });
    expect(
      prefer.includes('InfinityEdge') ||
        prefer.includes('YunTalWildarrows') ||
        prefer.includes('TheCollector'),
    ).toBe(true);
  });

  it('locks Aatrox to the popular op.gg core', () => {
    const prefer = resolveShopPrefer({
      championId: 'Aatrox',
      position: 'TOP',
      ownedItems: [],
    });
    expect(prefer).toContain('Eclipse');
    expect(prefer).toContain('SunderedSky');
    expect(prefer).toContain('DeathsDance');
  });

  it('keeps high-engage supports off enchanter lines', () => {
    const plans = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]) {
      const prefer = resolveShopPrefer({
        championId: 'Thresh',
        position: 'SUPPORT',
        ownedItems: [],
        state: { seed, champions: [] } as never,
        side: 'blue',
        playerId: `thresh-${seed}`,
      });
      plans.add(prefer.includes('MoonstoneRenewer') || prefer.includes('ArdentCenser') ? 'enchanter' : 'engage');
      expect(prefer).not.toContain('MoonstoneRenewer');
      expect(prefer).not.toContain('ArdentCenser');
      expect(prefer.some((item) => item === 'LocketoftheIronSolari' || item === 'SunfireAegis')).toBe(true);
    }
    expect(plans.has('enchanter')).toBe(false);
  });

  it('covers every champion kit with a usable shop plan', () => {
    for (const [championId, kit] of Object.entries(CHAMPION_KITS)) {
      const prefer = resolveShopPrefer({
        championId,
        position: kit.positions[0] ?? 'MID',
        ownedItems: [],
      });
      expect(prefer.length, championId).toBeGreaterThan(3);
    }
  });

  it('locks Camille and Gragas to popular op.gg cores', () => {
    const camille = resolveShopPrefer({
      championId: 'Camille',
      position: 'TOP',
      ownedItems: [],
    });
    expect(camille).toContain('TrinityForce');
    expect(camille).toContain('RavenousHydra');
    const gragas = resolveShopPrefer({
      championId: 'Gragas',
      position: 'TOP',
      ownedItems: [],
    });
    expect(gragas).toContain('RodofAges');
    expect(gragas.some((item) => item === 'CosmicDrive' || item === 'LichBane')).toBe(true);
  });

  it('leans armor pen / on-hit when facing many tanks', () => {
    const tanky = resolveShopPrefer({
      championId: 'Jinx',
      position: 'BOT',
      ownedItems: [],
      state: {
        seed: 42,
        champions: [
          { side: 'blue', championId: 'Jinx', earnedGold: 5000, positionLabel: 'BOT' },
          { side: 'red', championId: 'Ornn', earnedGold: 4000, positionLabel: 'TOP' },
          { side: 'red', championId: 'Sion', earnedGold: 4000, positionLabel: 'JUNGLE' },
          { side: 'red', championId: 'Malphite', earnedGold: 4000, positionLabel: 'MID' },
          { side: 'red', championId: 'Braum', earnedGold: 3000, positionLabel: 'SUPPORT' },
          { side: 'red', championId: 'Ashe', earnedGold: 5000, positionLabel: 'BOT' },
        ],
      } as never,
      side: 'blue',
      playerId: 'bot',
    });
    const joined = tanky.join(',');
    expect(
      joined.includes('LordDominiksRegards') ||
        joined.includes('BladeofTheRuinedKing') ||
        joined.includes('BlackCleaver') ||
        joined.includes('KrakenSlayer'),
    ).toBe(true);
  });
});
