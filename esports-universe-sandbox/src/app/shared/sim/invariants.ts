import { recountDamageFromTimeline, recountKillsFromTimeline } from './reduce-stats';
import type { MatchBoxScore, TimelineEvent } from './match-stats';
import { isEndType, isKillType } from './timeline';

export interface InvariantIssue {
  code: string;
  message: string;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function validateBoxScore(box: MatchBoxScore): InvariantIssue[] {
  const issues: InvariantIssue[] = [];
  const homePlayers = box.players.filter((player) => player.teamId === box.homeTeamId);
  const awayPlayers = box.players.filter((player) => player.teamId === box.awayTeamId);

  if (sum(homePlayers.map((player) => player.kills)) !== box.home.kills) {
    issues.push({ code: 'home-kills', message: '主隊選手擊殺加總與隊伍擊殺不一致' });
  }
  if (sum(awayPlayers.map((player) => player.kills)) !== box.away.kills) {
    issues.push({ code: 'away-kills', message: '客隊選手擊殺加總與隊伍擊殺不一致' });
  }
  if (sum(homePlayers.map((player) => player.deaths)) !== box.home.deaths) {
    issues.push({ code: 'home-deaths', message: '主隊選手死亡加總與隊伍死亡不一致' });
  }
  if (sum(awayPlayers.map((player) => player.deaths)) !== box.away.deaths) {
    issues.push({ code: 'away-deaths', message: '客隊選手死亡加總與隊伍死亡不一致' });
  }
  const totalKills = box.home.kills + box.away.kills;
  const totalDeaths = box.home.deaths + box.away.deaths;
  if (totalKills > totalDeaths) {
    issues.push({ code: 'kill-death-parity', message: '雙方擊殺總和大於死亡總和' });
  }

  const playerGoldHome = sum(homePlayers.map((player) => player.gold));
  const playerGoldAway = sum(awayPlayers.map((player) => player.gold));
  if (Math.abs(playerGoldHome - box.home.totalGold) > 1) {
    issues.push({ code: 'home-gold', message: '主隊選手經濟加總與隊伍總經濟不一致' });
  }
  if (Math.abs(playerGoldAway - box.away.totalGold) > 1) {
    issues.push({ code: 'away-gold', message: '客隊選手經濟加總與隊伍總經濟不一致' });
  }

  const last = box.goldSeries[box.goldSeries.length - 1];
  if (!last) {
    issues.push({ code: 'gold-series-empty', message: '缺少經濟曲線' });
  } else {
    if (Math.abs(last.homeGold - box.home.totalGold) > 1) {
      issues.push({ code: 'gold-series-home', message: '經濟曲線終點與主隊總經濟不一致' });
    }
    if (Math.abs(last.awayGold - box.away.totalGold) > 1) {
      issues.push({ code: 'gold-series-away', message: '經濟曲線終點與客隊總經濟不一致' });
    }
    if (Math.abs(box.durationSec - last.t) > 30) {
      issues.push({ code: 'duration', message: '比賽時長與經濟曲線終點時間不一致' });
    }
  }

  const track = box.mapTrack;
  if (track && track.length > 0) {
    const endFrame = track[track.length - 1];
    const hasEarned = endFrame.champions.some(
      (champ) => typeof champ.earnedGold === 'number' && champ.earnedGold > 0,
    );
    if (hasEarned) {
      for (const player of box.players) {
        const champ = endFrame.champions.find((row) => row.playerId === player.playerId);
        if (!champ) {
          issues.push({
            code: 'map-track-missing-player',
            message: `地圖軌跡終幀缺少選手 ${player.gamertag}`,
          });
          continue;
        }
        if (Math.abs((champ.earnedGold ?? 0) - player.gold) > 1) {
          issues.push({
            code: 'map-track-earned-gold',
            message: `${player.gamertag} 地圖 earnedGold 與對陣經濟不一致`,
          });
        }
      }
      const trackHome = sum(
        endFrame.champions
          .filter((champ) => champ.teamId === box.homeTeamId)
          .map((champ) => champ.earnedGold ?? 0),
      );
      const trackAway = sum(
        endFrame.champions
          .filter((champ) => champ.teamId === box.awayTeamId)
          .map((champ) => champ.earnedGold ?? 0),
      );
      if (Math.abs(trackHome - box.home.totalGold) > 1) {
        issues.push({ code: 'map-track-home-gold', message: '地圖終幀主隊 earnedGold 加總不一致' });
      }
      if (Math.abs(trackAway - box.away.totalGold) > 1) {
        issues.push({ code: 'map-track-away-gold', message: '地圖終幀客隊 earnedGold 加總不一致' });
      }
    }
  }

  let homeTowers = 0;
  let awayTowers = 0;
  let homeDragons = 0;
  let awayDragons = 0;
  let homeBarons = 0;
  let awayBarons = 0;
  let homeElders = 0;
  let awayElders = 0;
  let homeSoul = false;
  let awaySoul = false;
  const seenIds = new Set<string>();

  for (const event of box.timeline) {
    if (seenIds.has(event.id)) {
      issues.push({ code: 'duplicate-event', message: `事件 id 重複套用：${event.id}` });
    }
    seenIds.add(event.id);

    if (event.type === 'tower') {
      if (event.teamId === box.homeTeamId) homeTowers += 1;
      if (event.teamId === box.awayTeamId) awayTowers += 1;
    }
    if (event.type === 'dragon' || event.type === 'dragon-soul') {
      if (event.teamId === box.homeTeamId) homeDragons += 1;
      if (event.teamId === box.awayTeamId) awayDragons += 1;
      if (event.type === 'dragon-soul') {
        if (event.teamId === box.homeTeamId) homeSoul = true;
        if (event.teamId === box.awayTeamId) awaySoul = true;
      }
    }
    if (event.type === 'baron') {
      if (event.teamId === box.homeTeamId) homeBarons += 1;
      if (event.teamId === box.awayTeamId) awayBarons += 1;
    }
    if (event.type === 'elder') {
      if (event.teamId === box.homeTeamId) homeElders += 1;
      if (event.teamId === box.awayTeamId) awayElders += 1;
    }
  }

  if (homeTowers !== box.home.towers || awayTowers !== box.away.towers) {
    issues.push({ code: 'tower-events', message: '防禦塔事件數與隊伍統計不一致' });
  }
  if (homeDragons !== box.home.dragons || awayDragons !== box.away.dragons) {
    issues.push({ code: 'dragon-events', message: '小龍事件數與隊伍統計不一致' });
  }
  if (homeBarons !== box.home.barons || awayBarons !== box.away.barons) {
    issues.push({ code: 'baron-events', message: '巴龍事件數與隊伍統計不一致' });
  }
  if (homeElders !== box.home.elders || awayElders !== box.away.elders) {
    issues.push({ code: 'elder-events', message: '遠古龍事件數與隊伍統計不一致' });
  }
  if (homeSoul !== box.home.dragonSoul || awaySoul !== box.away.dragonSoul) {
    issues.push({ code: 'soul-events', message: '龍魂標記與隊伍統計不一致' });
  }

  const recounted = recountKillsFromTimeline(box.timeline);
  const damageFromTimeline = recountDamageFromTimeline(box.timeline);
  for (const player of box.players) {
    const kills = recounted.killsByPlayer.get(player.playerId) ?? 0;
    const deaths = recounted.deathsByPlayer.get(player.playerId) ?? 0;
    const assists = recounted.assistsByPlayer.get(player.playerId) ?? 0;
    const damage = damageFromTimeline.get(player.playerId) ?? 0;
    if (kills !== player.kills) {
      issues.push({
        code: 'timeline-kills',
        message: `${player.gamertag} timeline 擊殺 ${kills} ≠ 選手 ${player.kills}`,
      });
    }
    if (deaths !== player.deaths) {
      issues.push({
        code: 'timeline-deaths',
        message: `${player.gamertag} timeline 死亡 ${deaths} ≠ 選手 ${player.deaths}`,
      });
    }
    if (assists !== player.assists) {
      issues.push({
        code: 'timeline-assists',
        message: `${player.gamertag} timeline 助攻 ${assists} ≠ 選手 ${player.assists}`,
      });
    }
    if (Math.abs(damage - player.damageToChamps) > 1) {
      issues.push({
        code: 'timeline-damage',
        message: `${player.gamertag} combat 傷害 ${Math.round(damage)} ≠ 選手 ${Math.round(player.damageToChamps)}`,
      });
    }
  }

  const homeDamage = sum(homePlayers.map((player) => player.damageToChamps));
  const awayDamage = sum(awayPlayers.map((player) => player.damageToChamps));
  const hasCombat = box.timeline.some((event) => event.type === 'combat');
  if (hasCombat && (homeDamage <= 0 || awayDamage <= 0)) {
    issues.push({ code: 'zero-team-damage', message: '其中一方隊伍總傷害為 0' });
  }

  for (const sample of box.goldSeries) {
    if (sample.homeGold < 0 || sample.awayGold < 0) {
      issues.push({ code: 'negative-gold', message: '經濟曲線出現負值' });
      break;
    }
  }
  for (const player of box.players) {
    if (!Number.isFinite(player.kda) || player.gold < 0 || player.cs < 0) {
      issues.push({ code: 'player-nan', message: `${player.gamertag} 出現非法個人數據` });
    }
  }

  const end = [...box.timeline].reverse().find((event) => isEndType(event.type));
  if (!end || !end.teamId) {
    issues.push({ code: 'missing-end', message: '缺少結束事件 nexus/surrender' });
  } else if (end.teamId !== box.winnerTeamId) {
    issues.push({ code: 'winner-mismatch', message: '勝者與結束事件受益方不一致' });
  }

  return issues;
}

export function assertBoxScore(box: MatchBoxScore): void {
  const issues = validateBoxScore(box);
  if (issues.length > 0) {
    throw new Error(issues.map((issue) => `${issue.code}: ${issue.message}`).join('; '));
  }
}

export function timelineKillDeathBalance(timeline: TimelineEvent[]): boolean {
  let kills = 0;
  let deaths = 0;
  for (const event of timeline) {
    if (isKillType(event.type) || event.type === 'mistake') {
      if (event.actorPlayerId) kills += 1;
      if (event.victimPlayerId) deaths += 1;
    }
  }
  return kills === deaths;
}
