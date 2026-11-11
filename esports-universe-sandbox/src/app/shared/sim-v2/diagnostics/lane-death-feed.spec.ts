import { describe, it } from 'vitest';
import { simulateV2Match, type SimulateV2Input } from '../engine';

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

describe('lane death feed probe', () => {
  it('summarizes repeated deaths by role and via', () => {
    const seeds = [1000, 1100, 1200, 42, 77];
    const lines: string[] = [];
    for (const seed of seeds) {
      const input: SimulateV2Input = {
        versionId: 'demo-a',
        seed,
        blueTeamId: 'blue',
        redTeamId: 'red',
        blue: roster('blue', ['Aatrox', 'LeeSin', 'Ahri', 'Jinx', 'Thresh']),
        red: roster('red', ['Garen', 'Viego', 'Syndra', 'Ashe', 'Leona']),
        maxDurationSec: 1800,
      };
      const { state, replay } = simulateV2Match(input);
      const deaths = replay.events.filter((event) => event.type === 'death');
      const byChamp = new Map<string, { t: number; via: string; killer?: string }[]>();
      for (const event of deaths) {
        const champ = state.champions.find((row) => row.id === event.actorId);
        if (!champ) {
          continue;
        }
        const key = `${champ.side}:${champ.positionLabel}:${champ.championId}`;
        const list = byChamp.get(key) ?? [];
        list.push({
          t: event.t,
          via: String((event.payload as { via?: string } | undefined)?.via ?? '?'),
          killer: event.targetId,
        });
        byChamp.set(key, list);
      }

      lines.push(`--- seed=${seed} t=${state.scheduler.time.toFixed(0)}s deaths=${deaths.length}`);
      for (const champ of state.champions) {
        const key = `${champ.side}:${champ.positionLabel}:${champ.championId}`;
        const list = byChamp.get(key) ?? [];
        let maxGapStreak = 0;
        let streak = 0;
        let prev = -999;
        const gaps: number[] = [];
        for (const death of list) {
          if (prev >= 0) {
            const gap = death.t - prev;
            gaps.push(gap);
            if (gap <= 90) {
              streak += 1;
              maxGapStreak = Math.max(maxGapStreak, streak);
            } else {
              streak = 1;
            }
          } else {
            streak = 1;
            maxGapStreak = 1;
          }
          prev = death.t;
        }
        const viaCount: Record<string, number> = {};
        for (const death of list) {
          viaCount[death.via] = (viaCount[death.via] ?? 0) + 1;
        }
        const avgGap =
          gaps.length > 0 ? gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length : 0;
        lines.push(
          [
            champ.side,
            champ.positionLabel.padEnd(7),
            champ.championId.padEnd(10),
            `kda=${champ.kills}/${champ.deaths}/${champ.assists}`,
            `lv=${champ.level}`,
            `streak<=90s=${maxGapStreak}`,
            `avgGap=${avgGap.toFixed(0)}s`,
            `via=${Object.entries(viaCount)
              .map(([via, count]) => `${via}:${count}`)
              .join(',') || '-'}`,
            `gold=${Math.round(champ.earnedGold)}`,
            `pocket=${Math.round(champ.gold)}`,
            `items=${champ.items.length}`,
          ].join(' '),
        );
      }
    }
    console.log(lines.join('\n'));
  }, 180_000);
});
