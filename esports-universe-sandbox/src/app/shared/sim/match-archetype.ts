import type { MatchBoxScore, TimelineEvent } from './match-stats';

export const MATCH_ARCHETYPE_IDS = [
  'comeback',
  'epic-battle',
  'stomp',
  'upset',
  'narrow-victory',
  'marathon',
  'macro-game',
  'bloodbath',
  'split-push',
  'objective-war',
  'base-defense',
  'backdoor',
  'decisive-fight',
  'miracle-steal',
  'perfect-game',
  'late-snowball',
] as const;

export type MatchArchetypeId = (typeof MATCH_ARCHETYPE_IDS)[number];

export const MATCH_ARCHETYPE_LABELS: Record<MatchArchetypeId, string> = {
  comeback: '翻盤局',
  'epic-battle': '史詩大戰',
  stomp: '輾壓局',
  upset: '爆冷門',
  'narrow-victory': '驚險守勝',
  marathon: '超長局',
  'macro-game': '運營局',
  bloodbath: '大亂鬥',
  'split-push': '分推局',
  'objective-war': '物件爭奪戰',
  'base-defense': '守家大戰',
  backdoor: '偷家局',
  'decisive-fight': '一波定勝負',
  'miracle-steal': '奇蹟搶龍',
  'perfect-game': '完美局',
  'late-snowball': '後期雪球',
};

export const ARCHETYPE_THRESHOLDS = {
  earlySec: 14 * 60,
  midSec: 25 * 60,
  lateSec: 30 * 60,
  comebackDeficitGold: 3500,
  comebackLeadGold: 1500,
  stompEarlyLeadGold: 2500,
  stompSustainLeadGold: 2200,
  stompLeadShare: 0.55,
  epicAbsGoldCap: 1800,
  epicCloseShare: 0.55,
  epicLeadFlips: 3,
  epicMinTeamfights: 4,
  epicMinDurationSec: 32 * 60,
  narrowLateLeadGold: 2800,
  narrowEndLeadGold: 900,
  marathonSec: 34 * 60,
  bloodbathKillsPerMin: 1.35,
  bloodbathTeamfightsPerMin: 0.22,
  bloodbathMinKills: 28,
  macroMaxKillsPerMin: 0.85,
  macroMaxTeamfightsPerMin: 0.14,
  macroMinTowers: 7,
  objectiveContests: 3,
  objectiveMajorContests: 2,
  splitSideTowers: 4,
  splitQuietShare: 0.6,
  baseHoldEvents: 2,
  baseInhibLeadSec: 4 * 60,
  decisiveWindowSec: 75,
  decisiveMinKills: 5,
  miracleSwingGold: 1200,
  perfectMaxWinnerDeaths: 2,
  upsetPowerGap: 8,
  fightLookbackSec: 55,
  lateSnowballEarlyAbsGold: 2500,
  lateSnowballEarlyLeadCap: 1800,
  lateSnowballEndLeadGold: 4500,
  lateSnowballSwingGold: 3500,
} as const;

export interface MatchArchetypeTag {
  id: MatchArchetypeId;
  label: string;
  reason: string;
  score: number;
}

export interface MatchArchetypeMetrics {
  durationSec: number;
  durationMin: number;
  totalKills: number;
  killsPerMin: number;
  teamfightCount: number;
  teamfightsPerMin: number;
  earlyGoldDiff: number;
  midGoldDiff: number;
  lateGoldDiff: number;
  endGoldDiff: number;
  winnerMaxDeficit: number;
  winnerMaxLead: number;
  leadFlipCount: number;
  closeGoldShare: number;
  leadSustainShare: number;
  contestedObjectives: number;
  majorContestedObjectives: number;
  sideLaneTowers: number;
  quietSideTowers: number;
  baseHoldCount: number;
  firstInhibToEndSec: number | null;
  winnerDeaths: number;
  endMethod: 'siege' | 'backdoor' | 'timeout' | 'surrender' | 'unknown';
  lastFightKills: number;
  miracleSteals: number;
  preMatchEdge: number | null;
}

export interface MatchArchetypeResult {
  primaryArchetype: MatchArchetypeTag | null;
  secondaryTags: MatchArchetypeTag[];
  metrics: MatchArchetypeMetrics;
  reasons: string[];
  insufficient: string[];
}

export interface MatchArchetypeInput {
  box: MatchBoxScore;
  homeLabel?: string;
  awayLabel?: string;
  preMatchEdge?: number | null;
}

interface Candidate extends MatchArchetypeTag {
  primaryEligible: boolean;
}

function goldAt(box: MatchBoxScore, t: number): number {
  let sample = box.goldSeries[0] ?? { t: 0, homeGold: 0, awayGold: 0 };
  for (const point of box.goldSeries) {
    if (point.t <= t) {
      sample = point;
    } else {
      break;
    }
  }
  return sample.homeGold - sample.awayGold;
}

function goldSeriesDiffs(box: MatchBoxScore): number[] {
  return box.goldSeries.map((sample) => sample.homeGold - sample.awayGold);
}

function teamLabel(input: MatchArchetypeInput, teamId: string): string {
  if (teamId === input.box.homeTeamId) {
    return input.homeLabel ?? '主隊';
  }
  if (teamId === input.box.awayTeamId) {
    return input.awayLabel ?? '客隊';
  }
  return '隊伍';
}

function isFightEvent(event: TimelineEvent): boolean {
  return (
    event.type === 'teamfight' ||
    event.type === 'kill' ||
    event.type === 'first-blood' ||
    event.type === 'mistake' ||
    (event.type === 'combat' && event.payload?.intensity === 'teamfight')
  );
}

function isMajorObjective(event: TimelineEvent): boolean {
  return (
    event.type === 'dragon' ||
    event.type === 'dragon-soul' ||
    event.type === 'baron' ||
    event.type === 'elder'
  );
}

function isContested(event: TimelineEvent): boolean {
  const intent = event.payload?.objectiveIntent;
  const opponent = event.payload?.opponentIntent;
  if (intent === 'contest' && opponent === 'contest') {
    return true;
  }
  return event.payload?.decisionOutcome === 'fight';
}

function signedFor(teamId: string, box: MatchBoxScore, homeMinusAway: number): number {
  return teamId === box.homeTeamId ? homeMinusAway : -homeMinusAway;
}

function formatGold(value: number): string {
  return Math.round(Math.abs(value)).toLocaleString('en-US');
}

export function buildMatchArchetypeMetrics(
  box: MatchBoxScore,
  preMatchEdge: number | null = null,
): MatchArchetypeMetrics {
  const durationSec = Math.max(1, box.durationSec);
  const durationMin = durationSec / 60;
  const totalKills = box.home.kills + box.away.kills;
  const teamfightCount = box.timeline.filter(
    (event) =>
      event.type === 'teamfight' ||
      (event.type === 'combat' && event.payload?.intensity === 'teamfight') ||
      (isKillTypeLike(event) && event.payload?.intensity === 'teamfight'),
  ).length;
  const diffs = goldSeriesDiffs(box);
  const earlyGoldDiff = goldAt(box, Math.min(durationSec, ARCHETYPE_THRESHOLDS.earlySec));
  const midGoldDiff = goldAt(box, Math.min(durationSec, ARCHETYPE_THRESHOLDS.midSec));
  const lateGoldDiff = goldAt(
    box,
    Math.min(durationSec, Math.max(ARCHETYPE_THRESHOLDS.midSec, durationSec - 5 * 60)),
  );
  const endGoldDiff = goldAt(box, durationSec);
  const winnerId = box.winnerTeamId;

  let winnerMaxDeficit = 0;
  let winnerMaxLead = 0;
  let leadFlipCount = 0;
  let closeSamples = 0;
  let leadSustainSamples = 0;
  let previousSign = 0;
  for (const diff of diffs) {
    const signed = signedFor(winnerId, box, diff);
    winnerMaxDeficit = Math.max(winnerMaxDeficit, -signed);
    winnerMaxLead = Math.max(winnerMaxLead, signed);
    if (Math.abs(diff) <= ARCHETYPE_THRESHOLDS.epicAbsGoldCap) {
      closeSamples += 1;
    }
    if (signed >= ARCHETYPE_THRESHOLDS.stompSustainLeadGold) {
      leadSustainSamples += 1;
    }
    const sign = signed > 800 ? 1 : signed < -800 ? -1 : 0;
    if (sign !== 0 && previousSign !== 0 && sign !== previousSign) {
      leadFlipCount += 1;
    }
    if (sign !== 0) {
      previousSign = sign;
    }
  }

  const contested = box.timeline.filter((event) => isMajorObjective(event) && isContested(event));
  const majorContested = contested.filter(
    (event) => event.type === 'baron' || event.type === 'elder' || event.type === 'dragon-soul',
  );

  const sideTowers = box.timeline.filter(
    (event) =>
      event.type === 'tower' &&
      (event.payload?.towerLane === 'top' || event.payload?.towerLane === 'bot') &&
      event.payload?.towerTier !== 'nexus',
  );
  const quietSideTowers = sideTowers.filter((tower) => {
    if (tower.payload?.pushStyle === 'split') {
      return true;
    }
    if (tower.payload?.pushStyle === 'grouped') {
      return false;
    }
    return !box.timeline.some(
      (event) =>
        isFightEvent(event) &&
        Math.abs(event.t - tower.t) <= ARCHETYPE_THRESHOLDS.fightLookbackSec,
    );
  });

  const baseHoldCount = box.timeline.filter(
    (event) => event.type === 'base-hold' || event.payload?.structureHold === true,
  ).length;

  const firstInhib = box.timeline.find((event) => event.type === 'inhibitor');
  const endEvent = [...box.timeline].reverse().find((event) => event.type === 'nexus' || event.type === 'surrender');
  const firstInhibToEndSec =
    firstInhib && endEvent ? Math.max(0, endEvent.t - firstInhib.t) : null;

  const endMethod =
    endEvent?.type === 'surrender'
      ? 'surrender'
      : endEvent?.payload?.endMethod === 'backdoor' ||
          endEvent?.payload?.endMethod === 'timeout' ||
          endEvent?.payload?.endMethod === 'siege'
        ? endEvent.payload.endMethod
        : endEvent
          ? 'siege'
          : 'unknown';

  const lastFightWindow = box.timeline.filter(
    (event) => isFightEvent(event) && endEvent && event.t >= endEvent.t - ARCHETYPE_THRESHOLDS.decisiveWindowSec,
  );
  const lastFightKills = lastFightWindow.filter((event) => isKillTypeLike(event)).length;

  let miracleSteals = 0;
  for (const event of contested) {
    if (!event.teamId) {
      continue;
    }
    const gap = signedFor(event.teamId, box, goldAt(box, event.t));
    if (gap > -ARCHETYPE_THRESHOLDS.comebackDeficitGold) {
      continue;
    }
    const after = goldAt(box, Math.min(durationSec, event.t + 90));
    const swing = signedFor(event.teamId, box, after) - gap;
    if (swing >= ARCHETYPE_THRESHOLDS.miracleSwingGold || event.teamId === winnerId) {
      miracleSteals += 1;
    }
  }

  const winnerDeaths =
    winnerId === box.homeTeamId ? box.home.deaths : box.away.deaths;

  return {
    durationSec,
    durationMin,
    totalKills,
    killsPerMin: totalKills / durationMin,
    teamfightCount,
    teamfightsPerMin: teamfightCount / durationMin,
    earlyGoldDiff,
    midGoldDiff,
    lateGoldDiff,
    endGoldDiff,
    winnerMaxDeficit,
    winnerMaxLead,
    leadFlipCount,
    closeGoldShare: diffs.length > 0 ? closeSamples / diffs.length : 0,
    leadSustainShare: diffs.length > 0 ? leadSustainSamples / diffs.length : 0,
    contestedObjectives: contested.length,
    majorContestedObjectives: majorContested.length,
    sideLaneTowers: sideTowers.length,
    quietSideTowers: quietSideTowers.length,
    baseHoldCount,
    firstInhibToEndSec,
    winnerDeaths,
    endMethod,
    lastFightKills,
    miracleSteals,
    preMatchEdge,
  };
}

function isKillTypeLike(event: TimelineEvent): boolean {
  return event.type === 'kill' || event.type === 'first-blood' || event.type === 'mistake';
}

function collectCandidates(input: MatchArchetypeInput, metrics: MatchArchetypeMetrics): Candidate[] {
  const { box } = input;
  const winner = teamLabel(input, box.winnerTeamId);
  const loserId = box.winnerTeamId === box.homeTeamId ? box.awayTeamId : box.homeTeamId;
  const loser = teamLabel(input, loserId);
  const candidates: Candidate[] = [];
  const T = ARCHETYPE_THRESHOLDS;

  const winnerEarly = signedFor(box.winnerTeamId, box, metrics.earlyGoldDiff);
  const winnerMid = signedFor(box.winnerTeamId, box, metrics.midGoldDiff);
  const winnerLate = signedFor(box.winnerTeamId, box, metrics.lateGoldDiff);
  const winnerEnd = signedFor(box.winnerTeamId, box, metrics.endGoldDiff);

  if (metrics.winnerMaxDeficit >= T.comebackDeficitGold && winnerEnd >= T.comebackLeadGold) {
    const earlyHole = winnerEarly <= -T.comebackDeficitGold * 0.5;
    candidates.push({
      id: 'comeback',
      label: MATCH_ARCHETYPE_LABELS.comeback,
      score: 90 + Math.min(20, metrics.winnerMaxDeficit / 400) + (earlyHole ? 4 : 0),
      primaryEligible: true,
      reason: earlyHole
        ? `${winner} 前期一度落後超過 ${formatGold(metrics.winnerMaxDeficit)} 金幣，最終逆轉取勝`
        : `${winner} 過程中一度落後超過 ${formatGold(metrics.winnerMaxDeficit)} 金幣，最終逆轉取勝`,
    });
  }

  if (
    Math.abs(metrics.earlyGoldDiff) <= T.lateSnowballEarlyAbsGold &&
    winnerEarly <= T.lateSnowballEarlyLeadCap &&
    winnerEnd >= T.lateSnowballEndLeadGold &&
    winnerEnd - Math.max(0, winnerEarly) >= T.lateSnowballSwingGold &&
    metrics.winnerMaxDeficit < T.comebackDeficitGold
  ) {
    candidates.push({
      id: 'late-snowball',
      label: MATCH_ARCHETYPE_LABELS['late-snowball'],
      score: 76 + Math.min(18, (winnerEnd - T.lateSnowballEndLeadGold) / 400),
      primaryEligible: true,
      reason: `${winner} 前中期經濟接近，終局一口氣拉開到 ${formatGold(winnerEnd)} 金幣優勢`,
    });
  }

  if (
    metrics.durationSec >= T.epicMinDurationSec &&
    metrics.closeGoldShare >= T.epicCloseShare &&
    metrics.leadFlipCount >= T.epicLeadFlips &&
    metrics.teamfightCount >= T.epicMinTeamfights
  ) {
    candidates.push({
      id: 'epic-battle',
      label: MATCH_ARCHETYPE_LABELS['epic-battle'],
      score: 82 + metrics.leadFlipCount * 2,
      primaryEligible: true,
      reason: `雙方經濟長期接近（接近樣本 ${(metrics.closeGoldShare * 100).toFixed(0)}%），優勢來回切換 ${metrics.leadFlipCount} 次`,
    });
  }

  if (
    winnerEarly >= T.stompEarlyLeadGold &&
    metrics.leadSustainShare >= T.stompLeadShare &&
    metrics.winnerMaxDeficit < T.comebackDeficitGold * 0.45 &&
    winnerEnd >= T.stompSustainLeadGold
  ) {
    candidates.push({
      id: 'stomp',
      label: MATCH_ARCHETYPE_LABELS.stomp,
      score: 88 + Math.min(15, winnerEarly / 500),
      primaryEligible: true,
      reason: `${winner} 前期便領先約 ${formatGold(winnerEarly)} 金幣，並在 ${(metrics.leadSustainShare * 100).toFixed(0)}% 的時間維持優勢`,
    });
  }

  if (
    metrics.preMatchEdge != null &&
    Math.abs(metrics.preMatchEdge) >= T.upsetPowerGap
  ) {
    const favoriteIsHome = metrics.preMatchEdge > 0;
    const underdogWon =
      (favoriteIsHome && box.winnerTeamId === box.awayTeamId) ||
      (!favoriteIsHome && box.winnerTeamId === box.homeTeamId);
    if (underdogWon) {
      candidates.push({
        id: 'upset',
        label: MATCH_ARCHETYPE_LABELS.upset,
        score: 78 + Math.min(15, Math.abs(metrics.preMatchEdge)),
        primaryEligible: true,
        reason: `${winner} 以賽前戰力劣勢（差距 ${Math.abs(metrics.preMatchEdge).toFixed(1)}）擊敗 ${loser}`,
      });
    }
  }

  if (
    winnerMid >= T.narrowLateLeadGold &&
    winnerEnd <= T.narrowEndLeadGold &&
    winnerEnd > 0 &&
    metrics.winnerMaxDeficit < T.comebackDeficitGold
  ) {
    candidates.push({
      id: 'narrow-victory',
      label: MATCH_ARCHETYPE_LABELS['narrow-victory'],
      score: 70 + Math.max(0, T.narrowLateLeadGold - winnerEnd) / 200,
      primaryEligible: true,
      reason: `${winner} 中後期領先約 ${formatGold(winnerMid)}，終局僅剩 ${formatGold(winnerEnd)} 金幣優勢驚險守勝`,
    });
  }

  if (metrics.durationSec >= T.marathonSec) {
    candidates.push({
      id: 'marathon',
      label: MATCH_ARCHETYPE_LABELS.marathon,
      score: 60 + (metrics.durationSec - T.marathonSec) / 30,
      primaryEligible: true,
      reason: `比賽時長 ${Math.floor(metrics.durationSec / 60)}:${String(metrics.durationSec % 60).padStart(2, '0')}，明顯長於常規對局`,
    });
  }

  if (
    metrics.killsPerMin <= T.macroMaxKillsPerMin &&
    metrics.teamfightsPerMin <= T.macroMaxTeamfightsPerMin &&
    box.home.towers + box.away.towers >= T.macroMinTowers
  ) {
    candidates.push({
      id: 'macro-game',
      label: MATCH_ARCHETYPE_LABELS['macro-game'],
      score: 74 + (T.macroMaxKillsPerMin - metrics.killsPerMin) * 10,
      primaryEligible: true,
      reason: `擊殺節奏僅 ${metrics.killsPerMin.toFixed(2)}/分，透過防禦塔與資源推進取勝`,
    });
  }

  if (
    metrics.totalKills >= T.bloodbathMinKills &&
    metrics.killsPerMin >= T.bloodbathKillsPerMin &&
    metrics.teamfightsPerMin >= T.bloodbathTeamfightsPerMin
  ) {
    candidates.push({
      id: 'bloodbath',
      label: MATCH_ARCHETYPE_LABELS.bloodbath,
      score: 80 + metrics.killsPerMin * 4,
      primaryEligible: true,
      reason: `全場 ${metrics.totalKills} 殺（${metrics.killsPerMin.toFixed(2)}/分），交戰頻繁`,
    });
  }

  const quietShare =
    metrics.sideLaneTowers > 0 ? metrics.quietSideTowers / metrics.sideLaneTowers : 0;
  if (
    metrics.sideLaneTowers >= T.splitSideTowers &&
    quietShare >= T.splitQuietShare &&
    metrics.quietSideTowers >= 3
  ) {
    candidates.push({
      id: 'split-push',
      label: MATCH_ARCHETYPE_LABELS['split-push'],
      score: 72 + metrics.quietSideTowers,
      primaryEligible: true,
      reason: `邊線塔拆除 ${metrics.sideLaneTowers} 座，其中 ${metrics.quietSideTowers} 座在無近期團戰情況下取得`,
    });
  }

  if (
    metrics.contestedObjectives >= T.objectiveContests ||
    metrics.majorContestedObjectives >= T.objectiveMajorContests
  ) {
    const heavyWar =
      metrics.contestedObjectives >= T.objectiveContests + 1 ||
      metrics.majorContestedObjectives >= T.objectiveMajorContests + 1;
    candidates.push({
      id: 'objective-war',
      label: MATCH_ARCHETYPE_LABELS['objective-war'],
      score: 64 + metrics.contestedObjectives * 2,
      primaryEligible: heavyWar,
      reason: `關鍵物件發生 ${metrics.contestedObjectives} 次實質爭奪（含大型物件 ${metrics.majorContestedObjectives} 次）`,
    });
  }

  const heldByDefense =
    metrics.baseHoldCount >= T.baseHoldEvents ||
    (metrics.firstInhibToEndSec != null &&
      metrics.firstInhibToEndSec >= T.baseInhibLeadSec &&
      box.timeline.filter((event) => event.type === 'tower' && event.payload?.towerTier === 'nexus')
        .length >= 2);
  if (heldByDefense) {
    candidates.push({
      id: 'base-defense',
      label: MATCH_ARCHETYPE_LABELS['base-defense'],
      score: 73 + metrics.baseHoldCount * 3,
      primaryEligible: true,
      reason:
        metrics.baseHoldCount >= T.baseHoldEvents
          ? `${loser} 多次守住高地推進（守家紀錄 ${metrics.baseHoldCount} 次）`
          : `首座兵營倒塌後仍僵持 ${Math.round((metrics.firstInhibToEndSec ?? 0) / 60)} 分鐘才結束`,
    });
  }

  if (metrics.endMethod === 'backdoor') {
    candidates.push({
      id: 'backdoor',
      label: MATCH_ARCHETYPE_LABELS.backdoor,
      score: 92,
      primaryEligible: true,
      reason: `${winner} 以非正面攻城節奏推掉主堡`,
    });
  }

  if (metrics.lastFightKills >= T.decisiveMinKills) {
    candidates.push({
      id: 'decisive-fight',
      label: MATCH_ARCHETYPE_LABELS['decisive-fight'],
      score: 68 + metrics.lastFightKills,
      primaryEligible: false,
      reason: `終局前 ${T.decisiveWindowSec} 秒內爆發 ${metrics.lastFightKills} 次擊殺，直接打開結束條件`,
    });
  }

  if (metrics.miracleSteals > 0) {
    candidates.push({
      id: 'miracle-steal',
      label: MATCH_ARCHETYPE_LABELS['miracle-steal'],
      score: 84 + metrics.miracleSteals * 4,
      primaryEligible: false,
      reason: `劣勢方搶下 ${metrics.miracleSteals} 次遭爭奪的關鍵物件並改變經濟走勢`,
    });
  }

  if (
    metrics.winnerDeaths <= T.perfectMaxWinnerDeaths &&
    winnerEarly >= T.stompEarlyLeadGold * 0.6 &&
    metrics.leadSustainShare >= 0.8
  ) {
    candidates.push({
      id: 'perfect-game',
      label: MATCH_ARCHETYPE_LABELS['perfect-game'],
      score: 86,
      primaryEligible: true,
      reason: `${winner} 全場僅死亡 ${metrics.winnerDeaths} 次，並從頭維持壓制`,
    });
  }

  return candidates;
}

const CONFLICT_PAIRS: Array<[MatchArchetypeId, MatchArchetypeId]> = [
  ['stomp', 'comeback'],
  ['stomp', 'epic-battle'],
  ['stomp', 'narrow-victory'],
  ['stomp', 'late-snowball'],
  ['comeback', 'late-snowball'],
  ['bloodbath', 'macro-game'],
  ['perfect-game', 'comeback'],
  ['perfect-game', 'narrow-victory'],
  ['perfect-game', 'late-snowball'],
];

function conflictsWith(left: MatchArchetypeId, right: MatchArchetypeId): boolean {
  return CONFLICT_PAIRS.some(
    ([a, b]) => (a === left && b === right) || (a === right && b === left),
  );
}

export function classifyMatchArchetypes(input: MatchArchetypeInput): MatchArchetypeResult {
  const metrics = buildMatchArchetypeMetrics(input.box, input.preMatchEdge ?? null);
  const insufficient: string[] = [];
  if (input.preMatchEdge == null) {
    insufficient.push('upset：缺少賽前戰力差，無法可靠判定爆冷門');
  }

  const ranked = collectCandidates(input, metrics).sort((left, right) => right.score - left.score);
  const primary =
    ranked.find((item) => item.primaryEligible) ?? null;

  const secondary: MatchArchetypeTag[] = [];
  for (const item of ranked) {
    if (primary && item.id === primary.id) {
      continue;
    }
    if (primary && conflictsWith(primary.id, item.id)) {
      continue;
    }
    if (secondary.some((tag) => conflictsWith(tag.id, item.id))) {
      continue;
    }
    secondary.push({
      id: item.id,
      label: item.label,
      reason: item.reason,
      score: item.score,
    });
    if (secondary.length >= 2) {
      break;
    }
  }

  const reasons = [
    ...(primary ? [primary.reason] : []),
    ...secondary.map((tag) => tag.reason),
  ];

  return {
    primaryArchetype: primary
      ? {
          id: primary.id,
          label: primary.label,
          reason: primary.reason,
          score: primary.score,
        }
      : null,
    secondaryTags: secondary,
    metrics,
    reasons,
    insufficient,
  };
}
