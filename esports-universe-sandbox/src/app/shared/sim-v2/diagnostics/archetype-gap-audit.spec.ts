import { describe, expect, it } from 'vitest';
import {
  buildMatchArchetypeMetrics,
  classifyMatchArchetypes,
  MATCH_ARCHETYPE_LABELS,
  type MatchArchetypeId,
} from '../../sim/match-archetype';
import { toMatchReport } from '../adapter/to-match-report';
import { simulateV2Match } from '../engine';

function roster(sideId: string, power = 72) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${sideId}_${position}`,
    gamertag: `${sideId}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Ahri'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: power + (index - 2),
    mechanics: power,
    teamfighting: power,
    gameSense: power,
    consistency: power - 2,
    adaptability: power - 4,
  }));
}

function goldAt(
  series: Array<{ t: number; homeGold: number; awayGold: number }>,
  t: number,
): number {
  let sample = series[0] ?? { t: 0, homeGold: 0, awayGold: 0 };
  for (const point of series) {
    if (point.t <= t) sample = point;
    else break;
  }
  return sample.homeGold - sample.awayGold;
}

function signedForWinner(boxWinnerHome: boolean, homeMinusAway: number): number {
  return boxWinnerHome ? homeMinusAway : -homeMinusAway;
}

type MissHint = {
  id: string;
  label: string;
  why: string;
};

function findMissedTraits(input: {
  durationSec: number;
  totalKills: number;
  kpm: number;
  winnerMaxDeficit: number;
  winnerMaxLead: number;
  earlyAbs: number;
  midAbs: number;
  endAbs: number;
  winnerEarly: number;
  winnerEnd: number;
  leadFlipCount: number;
  closeShare: number;
  dragons: number;
  barons: number;
  towers: number;
  teamfights: number;
  medalIds: MatchArchetypeId[];
}): MissHint[] {
  const misses: MissHint[] = [];
  const has = (id: MatchArchetypeId) => input.medalIds.includes(id);
  const minutes = input.durationSec / 60;

  if (
    input.winnerEarly < 800 &&
    input.winnerEnd >= 4500 &&
    input.earlyAbs <= 2200 &&
    !has('comeback') &&
    !has('stomp') &&
    !has('late-snowball')
  ) {
    misses.push({
      id: 'late-snowball',
      label: '後期雪球',
      why: `前中期接近（早期|Δ| ${Math.round(input.earlyAbs)}），終局拉開到 ${Math.round(input.winnerEnd)}`,
    });
  }

  if (
    input.winnerMaxDeficit >= 2200 &&
    input.winnerMaxDeficit < 3500 &&
    input.winnerEnd >= 1500 &&
    !has('comeback')
  ) {
    misses.push({
      id: 'soft-comeback',
      label: '輕度翻盤',
      why: `最大落後 ${Math.round(input.winnerMaxDeficit)} 未達翻盤門檻 3500`,
    });
  }

  if (
    input.winnerEarly >= 2000 &&
    input.winnerEarly < 2800 &&
    input.winnerEnd >= 2500 &&
    !has('stomp')
  ) {
    misses.push({
      id: 'soft-stomp',
      label: '輕度輾壓',
      why: `前期領先 ${Math.round(input.winnerEarly)} 未達輾壓門檻 2800`,
    });
  }

  if (minutes >= 33 && minutes < 35 && !has('marathon')) {
    misses.push({
      id: 'long-game',
      label: '長局',
      why: `時長 ${minutes.toFixed(1)} 分接近超長局門檻 35`,
    });
  }

  if (minutes <= 24 && input.winnerEnd >= 4000 && !has('stomp') && !has('perfect-game')) {
    misses.push({
      id: 'quick-close',
      label: '速戰速決',
      why: `${minutes.toFixed(1)} 分結束且終局領先 ${Math.round(input.winnerEnd)}`,
    });
  }

  if (
    input.closeShare >= 0.5 &&
    input.leadFlipCount >= 2 &&
    minutes >= 30 &&
    !has('epic-battle')
  ) {
    misses.push({
      id: 'near-epic',
      label: '拉鋸局',
      why: `接近樣本 ${(input.closeShare * 100).toFixed(0)}%、切換 ${input.leadFlipCount} 次，但未達史詩門檻`,
    });
  }

  if (input.kpm >= 1.1 && input.kpm < 1.35 && input.totalKills >= 24 && !has('bloodbath')) {
    misses.push({
      id: 'near-bloodbath',
      label: '高節奏',
      why: `KPM ${input.kpm.toFixed(2)} / 總殺 ${input.totalKills} 接近大亂鬥`,
    });
  }

  if (input.kpm <= 0.95 && input.towers >= 7 && !has('macro-game')) {
    misses.push({
      id: 'near-macro',
      label: '運營味',
      why: `KPM ${input.kpm.toFixed(2)}、塔 ${input.towers}，接近運營局`,
    });
  }

  if (input.barons + input.dragons >= 5 && !has('objective-war')) {
    misses.push({
      id: 'objective-heavy',
      label: '資源局',
      why: `龍+巴龍共 ${input.barons + input.dragons}，但 V2 無 contest 標記所以物件爭奪戰掛不上`,
    });
  }

  if (input.teamfights >= 5 && !has('decisive-fight') && !has('bloodbath') && !has('epic-battle')) {
    misses.push({
      id: 'fight-heavy',
      label: '多團戰',
      why: `合成團戰 ${input.teamfights} 場，但沒有對應徽章`,
    });
  }

  return misses;
}

describe('archetype gap audit (20 V2 games)', () => {
  it('找出有特點卻沒掛徽章的局', () => {
    const rows: Array<{
      seed: number;
      minutes: number;
      score: string;
      medals: string[];
      misses: MissHint[];
      traits: string[];
    }> = [];

    for (let i = 0; i < 20; i += 1) {
      const seed = 2200 + i * 37;
      const bluePower = 68 + (i % 5) * 3;
      const redPower = 70 + ((i * 2) % 5) * 3;
      const result = simulateV2Match({
        versionId: 'demo-a',
        seed,
        blueTeamId: 'blue',
        redTeamId: 'red',
        blue: roster('blue', bluePower),
        red: roster('red', redPower),
        maxDurationSec: 2400,
      });
      const report = toMatchReport(result);
      const box = report.boxScore;
      const classified = classifyMatchArchetypes({
        box,
        preMatchEdge: report.draft ? report.draft.home.power - report.draft.away.power : bluePower - redPower,
      });
      const metrics = buildMatchArchetypeMetrics(box, classified.metrics.preMatchEdge);
      const medals = [
        ...(classified.primaryArchetype ? [classified.primaryArchetype] : []),
        ...classified.secondaryTags,
      ];
      const medalIds = medals.map((m) => m.id);
      const winnerIsHome = box.winnerTeamId === box.homeTeamId;
      const early = goldAt(box.goldSeries, Math.min(box.durationSec, 14 * 60));
      const mid = goldAt(box.goldSeries, Math.min(box.durationSec, 25 * 60));
      const end = goldAt(box.goldSeries, box.durationSec);
      const winnerEarly = signedForWinner(winnerIsHome, early);
      const winnerEnd = signedForWinner(winnerIsHome, end);
      const misses = findMissedTraits({
        durationSec: box.durationSec,
        totalKills: metrics.totalKills,
        kpm: metrics.killsPerMin,
        winnerMaxDeficit: metrics.winnerMaxDeficit,
        winnerMaxLead: metrics.winnerMaxLead,
        earlyAbs: Math.abs(early),
        midAbs: Math.abs(mid),
        endAbs: Math.abs(end),
        winnerEarly,
        winnerEnd,
        leadFlipCount: metrics.leadFlipCount,
        closeShare: metrics.closeGoldShare,
        dragons: box.home.dragons + box.away.dragons,
        barons: box.home.barons + box.away.barons,
        towers: box.home.towers + box.away.towers,
        teamfights: metrics.teamfightCount,
        medalIds,
      });

      const traits: string[] = [];
      if (Math.abs(early) < 1500 && Math.abs(end) > 5000) traits.push('late-swing');
      if (metrics.winnerMaxDeficit >= 2500) traits.push(`deficit:${Math.round(metrics.winnerMaxDeficit)}`);
      if (metrics.killsPerMin >= 1.2) traits.push(`kpm:${metrics.killsPerMin.toFixed(2)}`);
      if (box.durationSec / 60 >= 34) traits.push('long');
      if (box.durationSec / 60 <= 24) traits.push('short');
      if (box.home.dragons + box.away.dragons + box.home.barons + box.away.barons >= 5) {
        traits.push('obj-heavy');
      }

      rows.push({
        seed,
        minutes: +(box.durationSec / 60).toFixed(1),
        score: `${box.home.kills}-${box.away.kills}`,
        medals: medals.map((m) => MATCH_ARCHETYPE_LABELS[m.id] ?? m.id),
        misses,
        traits,
      });
    }

    const blank = rows.filter((r) => r.medals.length === 0);
    const blankWithMiss = blank.filter((r) => r.misses.length > 0);
    const missCounts: Record<string, number> = {};
    for (const row of rows) {
      for (const miss of row.misses) {
        missCounts[miss.id] = (missCounts[miss.id] ?? 0) + 1;
      }
    }

    const summary = {
      games: rows.length,
      blankMedals: blank.length,
      blankButDistinctive: blankWithMiss.length,
      missCounts,
      samples: rows.map((r) => ({
        seed: r.seed,
        minutes: r.minutes,
        score: r.score,
        medals: r.medals,
        misses: r.misses.map((m) => `${m.label}:${m.why}`),
        traits: r.traits,
      })),
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(summary, null, 2));

    expect(rows.length).toBe(20);
  }, 600_000);
});
