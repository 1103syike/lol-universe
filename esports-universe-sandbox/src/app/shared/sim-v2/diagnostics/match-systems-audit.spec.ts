import { describe, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';

function roster(side: 'blue' | 'red') {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
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

describe('match systems audit', () => {
  it('scans multi-seed role/economy/vision/jungle signals', () => {
    const seeds = [1000, 1100, 1200, 42, 77];
    const rows: string[] = [];
    for (const seed of seeds) {
      const input: SimulateV2Input = {
        versionId: 'demo-a',
        seed,
        blueTeamId: 'blue',
        redTeamId: 'red',
        blue: roster('blue'),
        red: roster('red'),
        maxDurationSec: 1800,
      };
      const { state, replay } = simulateV2Match(input);
      const mins = Math.max(1, state.scheduler.time / 60);
      const wards = state.wards.filter((ward) => ward.alive).length;
      const clears = replay.events.filter((event) => event.type === 'ward_clear').length;
      const places = replay.events.filter((event) => event.type === 'ward_place').length;
      for (const champ of state.champions) {
        const pocketGap = Math.round(champ.earnedGold - champ.gold);
        rows.push(
          [
            `seed=${seed}`,
            champ.side,
            champ.positionLabel,
            champ.championId,
            `lv=${champ.level}`,
            `gpm=${Math.round(champ.earnedGold / mins)}`,
            `earned=${Math.round(champ.earnedGold)}`,
            `pocket=${Math.round(champ.gold)}`,
            `spent≈${pocketGap}`,
            `cs=${champ.cs.toFixed(1)}`,
            `camps=${champ.campKills}`,
            `kda=${champ.kills}/${champ.deaths}/${champ.assists}`,
            `dmg=${Math.round(champ.damageToChampions)}`,
            `items=${champ.items.length}`,
            `wardsPlaced=${champ.wardsPlaced}`,
            `recall=${champ.recallCount}`,
          ].join(' '),
        );
      }
      rows.push(
        `seed=${seed} meta duration=${state.scheduler.time.toFixed(0)}s wardsAlive=${wards} wardPlace=${places} wardClear=${clears}`,
      );
    }
    console.log(rows.join('\n'));
  }, 120_000);
});
