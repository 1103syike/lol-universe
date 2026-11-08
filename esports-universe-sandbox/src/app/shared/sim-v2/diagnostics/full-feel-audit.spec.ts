import { describe, expect, it } from 'vitest';
import type { Player } from '../../../core/models/player.model';
import { buildMatchDigest, pickMvpVerdict } from '../../sim/derive-from-box';
import { simulateGame } from '../../sim/match-engine';
import type { MatchReport } from '../../sim/report';
import { toMatchReport } from '../adapter/to-match-report';
import { simulateV2Match } from '../engine';

function fakePlayer(id: string, position: Player['position'], teamId: string): Player {
  const attr = (n: number) => ({ current: n, potential: n, growthRate: 0 });
  return {
    id,
    gamertag: id,
    realName: id,
    teamId,
    position,
    nationality: 'TW',
    age: 20,
    form: 72,
    morale: 70,
    rarity: 'rare',
    fatigue: 0,
    attributes: {
      laning: attr(70),
      mechanics: attr(70),
      teamfighting: attr(70),
      gameSense: attr(70),
      consistency: attr(70),
      adaptability: attr(70),
    },
  } as Player;
}

function side(teamId: string) {
  return {
    teamId,
    coach: null,
    players: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      fakePlayer(`${teamId}_${position}`, position, teamId),
    ),
  };
}

function roster(sideId: string) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
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
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
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

function sharePct(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value <= 1.0001 ? value * 100 : value;
}

function auditReport(seed: number, report: MatchReport): string[] {
  const flags: string[] = [];
  const box = report.boxScore;
  const minutes = Math.max(1, box.durationSec / 60);
  const winnerHome = box.winnerTeamId === box.homeTeamId;
  const endDiff = goldAt(box.goldSeries, box.durationSec);
  const midDiff = goldAt(box.goldSeries, Math.min(box.durationSec, 15 * 60));
  const t18 = goldAt(box.goldSeries, Math.min(box.durationSec, 18 * 60));
  const winnerMid = winnerHome ? midDiff : -midDiff;
  const winner18 = winnerHome ? t18 : -t18;
  const winnerEnd = winnerHome ? endDiff : -endDiff;
  const tag = `s${seed} ${minutes.toFixed(1)}m`;

  if (minutes < 20) flags.push(`${tag} too-short`);
  if (minutes > 55) flags.push(`${tag} too-long`);
  if (minutes < 23 && winnerMid < -2000) {
    flags.push(`${tag} short-while-behind mid=${Math.round(winnerMid)}`);
  }
  if (minutes <= 25 && winner18 < -2500 && winnerEnd > -800) {
    flags.push(`${tag} late-flip-closeout 18=${Math.round(winner18)} end=${Math.round(winnerEnd)}`);
  }

  const totalKills = box.home.kills + box.away.kills;
  const kpm = totalKills / minutes;
  if (kpm > 2.2) flags.push(`${tag} hyper-kills kpm=${kpm.toFixed(2)}`);
  if (kpm < 0.25 && minutes > 25) flags.push(`${tag} dead-game kpm=${kpm.toFixed(2)}`);

  for (const p of box.players) {
    const gpm = p.gold / minutes;
    const dpm = p.damageToChamps / minutes;
    const csm = p.cs / minutes;
    if (p.position === 'SUPPORT' && gpm > 360) flags.push(`${tag} supp-rich gpm=${gpm.toFixed(0)}`);
    if (p.position === 'BOT' && gpm < 300 && minutes > 22) flags.push(`${tag} bot-poor gpm=${gpm.toFixed(0)}`);
    if (p.position === 'BOT' && dpm > 1100) flags.push(`${tag} bot-dpm-insane dpm=${dpm.toFixed(0)}`);
    if ((p.position === 'TOP' || p.position === 'MID') && dpm > 1100) {
      flags.push(`${tag} ${p.position.toLowerCase()}-dpm-insane dpm=${dpm.toFixed(0)}`);
    }
    if (p.position !== 'SUPPORT' && csm > 13.5) flags.push(`${tag} cs-insane ${p.position} csm=${csm.toFixed(1)}`);
    if (p.position === 'JUNGLE' && gpm < 220 && p.teamId === box.winnerTeamId) {
      flags.push(`${tag} win-jg-starved gpm=${gpm.toFixed(0)}`);
    }
    if (sharePct(p.damagePct) > 55) flags.push(`${tag} dmg-share ${p.position} ${sharePct(p.damagePct).toFixed(0)}%`);
    if (sharePct(p.goldPct) > 40) flags.push(`${tag} gold-share ${p.position} ${sharePct(p.goldPct).toFixed(0)}%`);
    if (p.deaths >= 16) flags.push(`${tag} feed ${p.position} ${p.deaths}D`);
  }

  for (const pos of ['TOP', 'MID', 'BOT'] as const) {
    const pair = box.players.filter((p) => p.position === pos);
    if (pair.length < 2) continue;
    const goldGap = Math.abs(pair[0].gold - pair[1].gold);
    const dmgGap = Math.abs(pair[0].damageToChamps - pair[1].damageToChamps);
    const dpmGap = dmgGap / minutes;
    if (goldGap < 1200 && dpmGap > 420) {
      flags.push(
        `${tag} lane-dmg-without-gold ${pos} goldΔ=${Math.round(goldGap)} dpmΔ=${Math.round(dpmGap)}`,
      );
    }
  }

  const digest = buildMatchDigest(box, { home: 'H', away: 'A' });
  if (digest.length < 2) flags.push(`${tag} story-too-short`);
  if (!digest.some((line) => line.includes('主堡') || line.includes('結束'))) {
    flags.push(`${tag} story-no-end`);
  }
  const earlyLines = digest.filter((line) => {
    const m = line.match(/^(\d+)分鐘/);
    return m ? Number(m[1]) <= 8 : false;
  }).length;
  if (earlyLines > 8) flags.push(`${tag} story-early-spam ${earlyLines}`);

  const mvp = report.mvp;
  if (!mvp) {
    flags.push(`${tag} no-mvp`);
  } else {
    const stats = box.players.find((p) => p.playerId === mvp.playerId);
    if (stats && stats.teamId !== box.winnerTeamId) flags.push(`${tag} mvp-loser`);
    const foe = stats
      ? box.players.find((p) => p.position === stats.position && p.teamId !== stats.teamId)
      : undefined;
    const verdict = stats ? pickMvpVerdict(report, stats, foe) : null;
    if (verdict === '對位打爆' && foe && stats) {
      const goldLead = stats.gold - foe.gold;
      const csLead = stats.cs - foe.cs;
      if (goldLead < 2000 || csLead < 25) {
        flags.push(`${tag} mvp-fake-stomp gold+${Math.round(goldLead)} cs+${Math.round(csLead)}`);
      }
    }
    if (verdict === '對位碾壓' && foe && stats && stats.gold - foe.gold < 1200) {
      flags.push(`${tag} mvp-weak-lane gold+${Math.round(stats.gold - foe.gold)}`);
    }
    if (stats && sharePct(stats.damagePct) < 12 && stats.kills + stats.assists < 5) {
      flags.push(`${tag} mvp-low-impact`);
    }
  }

  const swings = box.goldSeries.filter((_, i, arr) => {
    if (i === 0) return false;
    const prev = arr[i - 1].homeGold - arr[i - 1].awayGold;
    const cur = arr[i].homeGold - arr[i].awayGold;
    return Math.abs(cur - prev) > 4500 && arr[i].t - arr[i - 1].t <= 60;
  });
  if (swings.length > 0) flags.push(`${tag} gold-spike x${swings.length}`);

  return flags;
}

describe('full feel audit', () => {
  it('scans 24 drafted games for economy damage flow story mvp weirdness', () => {
    const allFlags: string[] = [];
    const summaries: string[] = [];

    for (let seed = 1; seed <= 24; seed += 1) {
      let s = seed * 11003;
      const rng = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
      };
      const report = simulateGame({
        home: side('H'),
        away: side('A'),
        random: rng,
        dateIso: '2024-06-01',
      });
      const flags = auditReport(seed, report);
      allFlags.push(...flags);
      const box = report.boxScore;
      const minutes = box.durationSec / 60;
      const mvpStats = report.mvp
        ? box.players.find((p) => p.playerId === report.mvp!.playerId)
        : undefined;
      const foe = mvpStats
        ? box.players.find((p) => p.position === mvpStats.position && p.teamId !== mvpStats.teamId)
        : undefined;
      const verdict = mvpStats ? pickMvpVerdict(report, mvpStats, foe) : '?';
      summaries.push(
        `s${seed} ${minutes.toFixed(1)}m K=${box.home.kills}-${box.away.kills} endΔ=${Math.round(goldAt(box.goldSeries, box.durationSec))} mvp=${report.mvp?.position}/${verdict} flags=${flags.length}`,
      );
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ summaries, allFlags, flagCount: allFlags.length }, null, 2));

    const critical = allFlags.filter(
      (f) =>
        f.includes('short-while-behind') ||
        f.includes('late-flip') ||
        f.includes('mvp-fake-stomp') ||
        f.includes('mvp-loser') ||
        f.includes('too-short') ||
        f.includes('hyper-kills') ||
        f.includes('bot-dpm-insane') ||
        f.includes('gold-spike'),
    );
    expect(critical.length).toBeLessThanOrEqual(4);
    expect(allFlags.filter((f) => f.includes('story-no-end')).length).toBe(0);
    expect(allFlags.filter((f) => f.includes('mvp-fake-stomp') || f.includes('mvp-loser')).length).toBe(0);
  }, 700_000);

  it('checks damage taken shape on 8 fixed rosters', () => {
    const flags: string[] = [];
    for (const seed of [1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700]) {
      const result = simulateV2Match({
        versionId: 'demo-a',
        seed,
        blueTeamId: 'blue',
        redTeamId: 'red',
        blue: roster('blue'),
        red: roster('red'),
        maxDurationSec: 2100,
      });
      const report = toMatchReport(result);
      const minutes = Math.max(1, report.boxScore.durationSec / 60);
      for (const champ of result.state.champions) {
        const dtpm = champ.damageTaken / minutes;
        const dpm = champ.damageToChampions / minutes;
        if (champ.positionLabel === 'SUPPORT' && dtpm > 1400) {
          flags.push(`s${seed} supp-dtpm ${dtpm.toFixed(0)}`);
        }
        if (champ.positionLabel === 'BOT' && dtpm > 1100) {
          flags.push(`s${seed} bot-dtpm ${dtpm.toFixed(0)}`);
        }
        if (champ.positionLabel === 'TOP' && dtpm < 250 && minutes > 20) {
          flags.push(`s${seed} top-no-tank ${dtpm.toFixed(0)}`);
        }
        if (champ.positionLabel === 'MID' && dtpm > 1400) {
          flags.push(`s${seed} mid-dtpm ${dtpm.toFixed(0)}`);
        }
        if (dpm > 1300) flags.push(`s${seed} ${champ.positionLabel}-dpm ${dpm.toFixed(0)}`);
      }
      flags.push(...auditReport(seed, report).filter((f) => !f.includes('story-early')));
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ takenFlags: flags }, null, 2));
    expect(flags.filter((f) => f.includes('bot-dpm-insane') || f.includes('fake-stomp')).length).toBeLessThanOrEqual(3);
    expect(flags.filter((f) => f.includes('too-short') || f.includes('short-while-behind')).length).toBe(0);
  }, 400_000);
});
