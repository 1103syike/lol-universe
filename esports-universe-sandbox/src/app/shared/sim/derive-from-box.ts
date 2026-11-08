import { PLAYER_POSITION_LABELS } from '../../core/models/player.model';
import type {
  FightLane,
  KillContext,
  MatchBoxScore,
  PlayerMatchStats,
  TimelineEvent,
} from './match-stats';
import type {
  MatchEvent,
  MatchKeyPlayer,
  MatchPhaseId,
  MatchPhaseReport,
  MatchReport,
  MatchTurningPoint,
} from './report';
import { PHASE_LABELS } from './report';
import type { TeamProfile } from './team-profile';

const PHASE_WINDOWS: Array<{ id: Exclude<MatchPhaseId, 'draft'>; start: number; end: number }> = [
  { id: 'early', start: 0, end: 14 * 60 },
  { id: 'mid', start: 14 * 60, end: 25 * 60 },
  { id: 'late', start: 25 * 60, end: Number.POSITIVE_INFINITY },
];

function goldAt(box: MatchBoxScore, t: number): { home: number; away: number } {
  let sample = box.goldSeries[0] ?? { t: 0, homeGold: 0, awayGold: 0 };
  for (const point of box.goldSeries) {
    if (point.t <= t) {
      sample = point;
    } else {
      break;
    }
  }
  return { home: sample.homeGold, away: sample.awayGold };
}

export function derivePhaseReports(box: MatchBoxScore): MatchPhaseReport[] {
  const draftEdge = 0;
  const phases: MatchPhaseReport[] = [
    {
      id: 'draft',
      edge: draftEdge,
      leaderTeamId: null,
      notes: [],
    },
  ];

  for (const window of PHASE_WINDOWS) {
    const endT = Math.min(box.durationSec, window.end === Number.POSITIVE_INFINITY ? box.durationSec : window.end);
    const startGold = goldAt(box, window.start);
    const endGold = goldAt(box, endT);
    const startDiff = startGold.home - startGold.away;
    const endDiff = endGold.home - endGold.away;
    const edge = (endDiff - (window.id === 'early' ? 0 : startDiff * 0.25)) / 400;
    const notes = box.timeline
      .filter((event) => event.phase === window.id)
      .filter((event) => event.payload?.marker || event.type === 'mistake' || event.type === 'baron')
      .slice(0, 3)
      .map((event) => event.summary);
    const leaderTeamId =
      Math.abs(endDiff) < 400 ? null : endDiff > 0 ? box.homeTeamId : box.awayTeamId;
    phases.push({
      id: window.id,
      edge: Number(edge.toFixed(2)),
      leaderTeamId,
      notes,
    });
  }

  return phases;
}

export function deriveTurningPoints(
  box: MatchBoxScore,
  winnerTeamId: string,
): MatchTurningPoint[] {
  const useful = box.timeline.filter((event) => {
    if (event.teamId === winnerTeamId) {
      return (
        event.type === 'baron' ||
        event.type === 'dragon-soul' ||
        event.type === 'elder' ||
        event.type === 'teamfight' ||
        event.type === 'nexus' ||
        event.type === 'surrender' ||
        event.type === 'coach-call'
      );
    }
    return event.type === 'mistake' && event.teamId === winnerTeamId;
  });

  const ranked = [...useful].sort((left, right) => {
    const score = (event: TimelineEvent): number => {
      if (event.type === 'baron' || event.type === 'elder') return 5;
      if (event.type === 'dragon-soul') return 4;
      if (event.type === 'teamfight' || event.type === 'mistake') return 3;
      if (event.type === 'nexus' || event.type === 'surrender') return 2;
      return 1;
    };
    return score(right) - score(left) || right.t - left.t;
  });

  return ranked.slice(0, 2).map((event) => ({
    phase: event.phase,
    kind: mapTimelineToNarrativeKind(event),
    beneficiaryTeamId: event.teamId ?? winnerTeamId,
    summary: event.summary,
    playerId: event.actorPlayerId,
    gamertag: box.players.find((player) => player.playerId === event.actorPlayerId)?.gamertag,
  }));
}

function mapTimelineToNarrativeKind(event: TimelineEvent): MatchTurningPoint['kind'] {
  if (event.type === 'mistake') return 'mistake';
  if (event.type === 'teamfight') return 'clutch-teamfight';
  if (event.type === 'coach-call') return 'coach-comeback';
  if (event.type === 'baron' || event.type === 'elder' || event.type === 'dragon-soul') {
    return 'clutch-teamfight';
  }
  return 'close-out-variance';
}

export function deriveNarrativeEvents(box: MatchBoxScore): MatchEvent[] {
  return box.timeline
    .filter(
      (event) =>
        event.type === 'mistake' ||
        event.type === 'teamfight' ||
        event.type === 'baron' ||
        event.type === 'coach-call' ||
        event.type === 'dragon-soul',
    )
    .map((event) => ({
      kind: mapTimelineToNarrativeKind(event),
      phase: event.phase,
      teamId: event.teamId,
      beneficiaryTeamId: event.teamId,
      playerId: event.actorPlayerId,
      gamertag: box.players.find((player) => player.playerId === event.actorPlayerId)?.gamertag,
      text: event.summary,
      impact: event.type === 'baron' || event.type === 'teamfight' ? 1 : 0.6,
    }));
}

function playerPeakPhase(
  box: MatchBoxScore,
  playerId: string,
): Exclude<MatchPhaseId, 'draft'> {
  const score: Record<Exclude<MatchPhaseId, 'draft'>, number> = {
    early: 0,
    mid: 0,
    late: 0,
  };
  for (const event of box.timeline) {
    if (event.actorPlayerId !== playerId && !(event.assistPlayerIds ?? []).includes(playerId)) {
      continue;
    }
    if (
      event.type === 'first-blood' ||
      event.type === 'kill' ||
      event.type === 'mistake' ||
      event.type === 'baron' ||
      event.type === 'dragon-soul' ||
      event.type === 'elder' ||
      event.type === 'teamfight'
    ) {
      const weight =
        event.type === 'baron' || event.type === 'elder' || event.type === 'dragon-soul'
          ? 3
          : event.type === 'first-blood' || event.type === 'teamfight'
            ? 2
            : 1;
      score[event.phase] += weight;
    }
  }
  if (score.late >= score.mid && score.late >= score.early) {
    return 'late';
  }
  if (score.mid >= score.early) {
    return 'mid';
  }
  return 'early';
}

export function deriveKeyPlayers(
  box: MatchBoxScore,
  winnerTeamId: string,
  _winnerProfile: TeamProfile,
): MatchKeyPlayer[] {
  const winners = box.players
    .filter((player) => player.teamId === winnerTeamId)
    .slice()
    .sort((left, right) => {
      const leftScore = left.damageToChamps * 0.4 + left.gold * 0.2 + (left.kills * 800 + left.assists * 400);
      const rightScore = right.damageToChamps * 0.4 + right.gold * 0.2 + (right.kills * 800 + right.assists * 400);
      return rightScore - leftScore;
    })
    .slice(0, 3);

  return winners.map((player) => {
    const phase = playerPeakPhase(box, player.playerId);
    const led = box.timeline.some(
      (event) =>
        event.actorPlayerId === player.playerId &&
        (event.type === 'teamfight' ||
          event.type === 'baron' ||
          event.type === 'first-blood' ||
          event.type === 'elder' ||
          event.type === 'dragon-soul'),
    );
    const foe = box.players.find(
      (row) => row.position === player.position && row.teamId !== player.teamId,
    );
    const laneLabel = PLAYER_POSITION_LABELS[player.position];
    let contribution: string;
    if (foe) {
      const goldLead = player.gold - foe.gold;
      const damageLead = player.damageToChamps - foe.damageToChamps;
      const csLead = player.cs - foe.cs;
      if (goldLead >= 1200 || csLead >= 30) {
        const bits: string[] = [];
        if (goldLead >= 600) {
          bits.push(`經濟${goldLead >= 0 ? '+' : ''}${(goldLead / 1000).toFixed(1)}K`);
        }
        if (damageLead >= 1500) {
          bits.push(`傷害${damageLead >= 0 ? '+' : ''}${(damageLead / 1000).toFixed(1)}K`);
        }
        if (csLead >= 20) {
          bits.push(`補刀${csLead >= 0 ? '+' : ''}${Math.round(csLead)}`);
        }
        contribution =
          bits.length > 0
            ? `${PHASE_LABELS[phase]}${laneLabel}對位壓制（${bits.join(' · ')}）`
            : `${PHASE_LABELS[phase]}${laneLabel}對位佔優`;
      } else if (damageLead >= 5000) {
        contribution = `${PHASE_LABELS[phase]}團戰輸出拉滿（傷害 ${(player.damageToChamps / 1000).toFixed(1)}K）`;
      } else if (led) {
        contribution = `${PHASE_LABELS[phase]}打出關鍵參與（${player.kills}/${player.deaths}/${player.assists}）`;
      } else {
        contribution = `${PHASE_LABELS[phase]}貢獻輸出與經濟（傷害 ${(player.damageToChamps / 1000).toFixed(1)}K）`;
      }
    } else {
      contribution = led
        ? `${PHASE_LABELS[phase]}打出關鍵參與（${player.kills}/${player.deaths}/${player.assists}）`
        : `${PHASE_LABELS[phase]}貢獻輸出與經濟（傷害 ${(player.damageToChamps / 1000).toFixed(1)}K）`;
    }
    return {
      teamId: player.teamId,
      playerId: player.playerId,
      gamertag: player.gamertag,
      position: player.position,
      phase,
      reasonKey: `${phase}-box`,
      score: player.damageToChamps + player.gold,
      contribution,
    };
  });
}

export function isUpsetFromBox(box: MatchBoxScore): boolean {
  const mid = goldAt(box, Math.min(box.durationSec, 25 * 60));
  const midDiff = mid.home - mid.away;
  const favored = midDiff >= 0 ? box.homeTeamId : box.awayTeamId;
  return favored !== box.winnerTeamId && Math.abs(midDiff) >= 1200;
}

function clockLabel(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

function roleName(box: MatchBoxScore, playerId: string | undefined): string {
  const player = box.players.find((item) => item.playerId === playerId);
  if (!player) {
    return '選手';
  }
  return `${PLAYER_POSITION_LABELS[player.position]} ${player.gamertag}`;
}

function minuteLabel(t: number): string {
  return `${Math.max(1, Math.floor(t / 60))}分鐘`;
}

function isKillEvent(event: TimelineEvent): boolean {
  return event.type === 'first-blood' || event.type === 'kill' || event.type === 'mistake';
}

function isObjectiveEvent(event: TimelineEvent): boolean {
  return (
    event.type === 'dragon' ||
    event.type === 'dragon-soul' ||
    event.type === 'baron' ||
    event.type === 'elder' ||
    event.type === 'voidgrub' ||
    event.type === 'herald' ||
    event.type === 'inhibitor' ||
    (event.type === 'tower' && (event.payload?.towerTier === 1 || event.payload?.towerTier === 2))
  );
}

function objectiveShortName(event: TimelineEvent): string {
  if (event.type === 'dragon') return '小龍';
  if (event.type === 'dragon-soul') return '龍魂';
  if (event.type === 'baron') return '巴龍';
  if (event.type === 'elder') return '遠古龍';
  if (event.type === 'voidgrub') return '虛空幼體';
  if (event.type === 'herald') return '預示者';
  if (event.type === 'inhibitor') return '兵營';
  if (event.type === 'tower') {
    const lane =
      event.payload?.towerLane === 'top'
        ? '上路'
        : event.payload?.towerLane === 'mid'
          ? '中路'
          : event.payload?.towerLane === 'bot'
            ? '下路'
            : '';
    return `${lane}防禦塔`;
  }
  return '資源';
}

function pickByTime<T>(t: number, options: readonly T[]): T {
  return options[Math.abs(Math.floor(t)) % options.length]!;
}

function playerTag(box: MatchBoxScore, playerId: string | undefined): string {
  const player = box.players.find((item) => item.playerId === playerId);
  return player?.gamertag ?? '選手';
}

function dominantLane(kills: TimelineEvent[]): FightLane | null {
  const lanes = kills.map((event) => event.payload?.fightLane).filter(Boolean) as FightLane[];
  if (lanes.length === 0) {
    return null;
  }
  const score: Record<FightLane, number> = { top: 0, mid: 0, bot: 0, river: 0 };
  for (const lane of lanes) {
    score[lane] += 1;
  }
  let best: FightLane = lanes[0]!;
  for (const lane of Object.keys(score) as FightLane[]) {
    if (score[lane] > score[best]) {
      best = lane;
    }
  }
  return best;
}

function lanePlace(lane: FightLane | null): string {
  if (lane === 'top') return '上路';
  if (lane === 'mid') return '中路';
  if (lane === 'bot') return '下路';
  if (lane === 'river') return '河道';
  return '野區';
}

function annotateClusterContext(
  cluster: TimelineEvent[],
  linkedObjective: TimelineEvent | null,
): TimelineEvent[] {
  const objType = linkedObjective?.type;
  const forced: KillContext | null =
    objType === 'baron'
      ? 'baron'
      : objType === 'elder'
        ? 'elder'
        : objType === 'dragon' || objType === 'dragon-soul'
          ? 'dragon'
          : null;
  if (!forced) {
    return cluster;
  }
  return cluster.map((event) => ({
    ...event,
    payload: { ...event.payload, killContext: event.payload?.killContext ?? forced },
  }));
}

function fightHeadline(
  kills: TimelineEvent[],
  linkedObjective: TimelineEvent | null,
): { flavor: string; place: string } {
  const annotated = annotateClusterContext(kills, linkedObjective);
  const contexts = annotated.map((event) => event.payload?.killContext);
  const lane = dominantLane(annotated);
  const place = lanePlace(lane);
  const t = kills[0]?.t ?? 0;

  if (contexts.includes('baron') || linkedObjective?.type === 'baron') {
    return {
      flavor: pickByTime(t, ['巴龍團敢打敢拼', '巴龍坑正面硬剛', '巴龍點開團互盯']),
      place: '巴龍坑',
    };
  }
  if (
    contexts.includes('dragon') ||
    linkedObjective?.type === 'dragon' ||
    linkedObjective?.type === 'dragon-soul'
  ) {
    return {
      flavor: pickByTime(t, ['龍團敢打敢拼', '龍坑不斷拉扯', '小龍點兩邊互盯']),
      place: pickByTime(t + 1, ['河道', '龍坑']),
    };
  }
  if (contexts.includes('elder') || linkedObjective?.type === 'elder') {
    return { flavor: '遠古龍團硬碰硬', place: '遠古龍坑' };
  }
  if (contexts.includes('teamfight') || kills.length >= 3) {
    return {
      flavor: pickByTime(t, [
        `${place}團戰敢打敢拼`,
        `${place}正面硬剛`,
        `${place}一觸即發`,
      ]),
      place,
    };
  }
  if (contexts.includes('gank')) {
    return {
      flavor: pickByTime(t, [`${place}遊走抓人`, `${place}包抄得手`, `${place}越塔強開`]),
      place,
    };
  }
  if (contexts.includes('mistake')) {
    return { flavor: '抓到對方失誤', place };
  }
  if (contexts.includes('lane')) {
    return {
      flavor: pickByTime(t, [`${place}對線壓制`, `${place}換血後出手`, `${place}線權優勢開打`]),
      place,
    };
  }
  return {
    flavor: pickByTime(t, [`${place}小規模交手`, `${place}趁勢出手`, `${place}找機會開打`]),
    place,
  };
}

function tradePhrase(ourKills: number, theirKills: number): string {
  return `${theirKills}換${ourKills}`;
}

function fightActionPhrase(
  t: number,
  ourKills: number,
  theirKills: number,
  place: string,
): string {
  const trade = tradePhrase(ourKills, theirKills);
  if (ourKills >= 3 && theirKills === 0) {
    return pickByTime(t, [
      `${place}一路追擊完成${trade}，打穿對面`,
      `${place}收割到底完成${trade}大獲全勝`,
    ]);
  }
  if (ourKills > theirKills) {
    return pickByTime(t, [
      `${place}不斷反打追擊完成${trade}`,
      `${place}越打越順完成${trade}`,
      `${place}咬住輸出完成${trade}`,
    ]);
  }
  if (ourKills === theirKills) {
    return pickByTime(t, [
      `${place}來回拉扯打成${trade}`,
      `${place}雙方硬換打成${trade}`,
    ]);
  }
  return pickByTime(t, [
    `${place}硬著頭皮換完${trade}`,
    `${place}賠上人數仍打出${trade}`,
  ]);
}

function describeNamedKill(box: MatchBoxScore, event: TimelineEvent): string {
  const killer = playerTag(box, event.actorPlayerId);
  const victim = playerTag(box, event.victimPlayerId);
  const assists = assistNames(box, event);
  if (event.type === 'mistake') {
    if (assists.length > 0) {
      return `${victim}失誤落單，被${killer}配合${assists[0]}帶走`;
    }
    return `${victim}失誤落單，被${killer}帶走`;
  }
  if (event.type === 'first-blood') {
    if (assists.length >= 2) {
      return `${killer}配合${assists.slice(0, 2).join('、')}擊殺${victim}，拿下一血`;
    }
    if (assists.length === 1) {
      return `${killer}配合${assists[0]}擊殺${victim}，拿下一血`;
    }
    return `${killer}擊殺${victim}，拿下一血`;
  }
  if (assists.length >= 2) {
    return `${killer}配合${assists.slice(0, 2).join('、')}擊殺${victim}`;
  }
  if (assists.length === 1) {
    return `${killer}配合${assists[0]}擊殺${victim}`;
  }
  return `${killer}擊殺${victim}`;
}

function starKillOf(cluster: TimelineEvent[], leadTeamId: string): TimelineEvent {
  const own = cluster.filter((event) => event.teamId === leadTeamId);
  const ranked = (own.length > 0 ? own : cluster).slice().sort((left, right) => {
    const leftScore = (left.assistPlayerIds?.length ?? 0) * 2 + (left.type === 'first-blood' ? 5 : 0);
    const rightScore = (right.assistPlayerIds?.length ?? 0) * 2 + (right.type === 'first-blood' ? 5 : 0);
    return rightScore - leftScore || left.t - right.t;
  });
  return ranked[0] ?? cluster[0]!;
}

function nearbyKillsAround(
  timeline: TimelineEvent[],
  centerT: number,
  windowSec: number,
): TimelineEvent[] {
  return timeline.filter(
    (event) => isKillEvent(event) && Math.abs(event.t - centerT) <= windowSec,
  );
}

function describeObjectiveMoment(
  box: MatchBoxScore,
  event: TimelineEvent,
  team: string,
  nearby: TimelineEvent[],
): string {
  const objName = objectiveShortName(event);
  const ourNear = nearby.filter((kill) => kill.teamId === event.teamId).length;
  const theirNear = nearby.filter((kill) => kill.teamId && kill.teamId !== event.teamId).length;
  const contested = event.payload?.objectiveIntent === 'contest' || (ourNear > 0 && theirNear > 0);
  const afterPick = ourNear >= 1 && theirNear === 0;
  const afterWipe = ourNear >= 3;
  const actor = event.actorPlayerId ? playerTag(box, event.actorPlayerId) : null;
  const pickName =
    afterPick && nearby.find((kill) => kill.teamId === event.teamId)
      ? describeNamedKill(box, nearby.find((kill) => kill.teamId === event.teamId)!)
      : null;

  if (event.type === 'baron') {
    if (afterWipe) {
      return `${team}團戰打出人數差，直接強開巴龍`;
    }
    if (pickName) {
      return `${pickName}後，${team}趁視野空窗轉巴龍`;
    }
    if (contested) {
      return `${team}巴龍坑硬碰硬，最終收下巴龍`;
    }
    return `${team}趁對面收線空檔，偷偷拿下巴龍`;
  }
  if (event.type === 'elder') {
    if (contested || ourNear + theirNear >= 2) {
      return `${team}遠古龍坑敢開，強行拿下遠古龍`;
    }
    return `${team}人數到位，收下遠古龍`;
  }
  if (event.type === 'dragon' || event.type === 'dragon-soul') {
    const label = event.type === 'dragon-soul' ? '龍魂' : '小龍';
    if (afterWipe) {
      return `${team}打完團順勢收下${label}`;
    }
    if (pickName) {
      return `${pickName}後，${team}轉${label}`;
    }
    if (contested) {
      return `${team}龍坑拉扯後拿下${label}`;
    }
    if (actor) {
      return `${team}由${actor}收下${label}`;
    }
    return `${team}趁換線空檔收下${label}`;
  }
  if (event.type === 'herald') {
    if (pickName) {
      return `${pickName}後，${team}轉預示者準備撞塔`;
    }
    return `${team}收下預示者，準備換塔`;
  }
  if (event.type === 'inhibitor') {
    return `${team}拆掉兵營，大門打開準備一波`;
  }
  return `${team}收下${objName}`;
}

function objectiveFollowUp(
  linked: TimelineEvent,
  leadTeamId: string,
  nameOf: (teamId: string | null | undefined) => string,
): string {
  const objTeam = nameOf(linked.teamId);
  const objName = objectiveShortName(linked);
  if (linked.teamId === leadTeamId) {
    if (linked.type === 'baron') {
      return pickByTime(linked.t, ['，順勢強開巴龍', '，直接轉巴龍收下']);
    }
    if (linked.type === 'dragon' || linked.type === 'dragon-soul') {
      return pickByTime(linked.t, [`，順勢收下${objName}`, `，趁亂轉掉${objName}`]);
    }
    if (linked.type === 'tower') {
      return pickByTime(linked.t, [`，推線拆掉${objName}`, `，兵線到了收下${objName}`]);
    }
    return `，順勢拿下${objName}`;
  }
  return pickByTime(linked.t, [
    `，不過${objTeam}趁亂轉走${objName}`,
    `，另一邊${objTeam}換掉${objName}`,
  ]);
}

function assistNames(box: MatchBoxScore, event: TimelineEvent): string[] {
  return (event.assistPlayerIds ?? [])
    .map((id) => box.players.find((player) => player.playerId === id)?.gamertag)
    .filter((name): name is string => Boolean(name));
}

function championIdByPlayer(box: MatchBoxScore): Map<string, string> {
  const map = new Map<string, string>();
  const frame = box.mapTrack?.[0];
  if (frame) {
    for (const champ of frame.champions) {
      map.set(champ.playerId, champ.championId);
    }
  }
  return map;
}

function sideOfTeam(box: MatchBoxScore, teamId: string | null | undefined): 'blue' | 'red' | null {
  if (!teamId) return null;
  if (teamId === box.homeTeamId) return 'blue';
  if (teamId === box.awayTeamId) return 'red';
  return null;
}

function replayActor(
  box: MatchBoxScore,
  playerId: string | undefined,
  champIds: Map<string, string>,
): MatchReplayActor | null {
  if (!playerId) return null;
  const player = box.players.find((item) => item.playerId === playerId);
  if (!player) return null;
  return {
    playerId,
    gamertag: player.gamertag,
    championId: champIds.get(playerId) ?? null,
    side: sideOfTeam(box, player.teamId),
  };
}

function describeReplayKill(event: TimelineEvent, box: MatchBoxScore): string {
  const killer = roleName(box, event.actorPlayerId);
  const victim = roleName(box, event.victimPlayerId);
  const assists = assistNames(box, event);
  const assistBit = assists.length > 0 ? `（助攻：${assists.join('、')}）` : '';
  if (event.type === 'first-blood') {
    return `${clockLabel(event.t)} ${killer} 擊殺 ${victim}${assistBit}，拿下一血`;
  }
  if (event.type === 'mistake') {
    return `${clockLabel(event.t)} ${victim} 失誤被 ${killer} 帶走${assistBit}`;
  }
  return `${clockLabel(event.t)} ${killer} 擊殺 ${victim}${assistBit}`;
}

function objectiveIconOf(event: TimelineEvent): MatchReplayIcon {
  if (event.type === 'dragon' || event.type === 'dragon-soul') return 'dragon';
  if (event.type === 'baron') return 'baron';
  if (event.type === 'elder') return 'elder';
  if (event.type === 'herald') return 'herald';
  if (event.type === 'voidgrub') return 'voidgrub';
  if (event.type === 'inhibitor') return 'inhibitor';
  if (event.type === 'nexus') return 'nexus';
  return 'tower';
}

export type MatchReplayIcon =
  | 'kill'
  | 'tower'
  | 'dragon'
  | 'baron'
  | 'elder'
  | 'herald'
  | 'voidgrub'
  | 'inhibitor'
  | 'nexus';

export interface MatchReplayActor {
  playerId: string;
  gamertag: string;
  championId: string | null;
  side: 'blue' | 'red' | null;
}

export interface MatchReplayLogEntry {
  t: number;
  clock: string;
  text: string;
  kind: 'kill' | 'objective' | 'end';
  side: 'blue' | 'red' | null;
  icon: MatchReplayIcon;
  killer: MatchReplayActor | null;
  victim: MatchReplayActor | null;
  assists: MatchReplayActor[];
  firstBlood?: boolean;
  mistake?: boolean;
  objectiveLabel?: string;
}

export function buildMatchReplayLog(
  box: MatchBoxScore,
  labels: { home: string; away: string },
): MatchReplayLogEntry[] {
  const nameOf = (teamId: string | null | undefined): string => {
    if (teamId === box.homeTeamId) return labels.home;
    if (teamId === box.awayTeamId) return labels.away;
    return '該隊';
  };
  const champIds = championIdByPlayer(box);
  const timeline = box.timeline
    .slice()
    .sort((left, right) => left.t - right.t || left.id.localeCompare(right.id));
  const entries: MatchReplayLogEntry[] = [];
  for (const event of timeline) {
    if (isKillEvent(event)) {
      entries.push({
        t: event.t,
        clock: clockLabel(event.t),
        kind: 'kill',
        text: describeReplayKill(event, box),
        side: sideOfTeam(box, event.teamId),
        icon: 'kill',
        killer: replayActor(box, event.actorPlayerId, champIds),
        victim: replayActor(box, event.victimPlayerId, champIds),
        assists: (event.assistPlayerIds ?? [])
          .map((id) => replayActor(box, id, champIds))
          .filter((actor): actor is MatchReplayActor => Boolean(actor)),
        firstBlood: event.type === 'first-blood',
        mistake: event.type === 'mistake',
      });
      continue;
    }
    if (isObjectiveEvent(event) || event.type === 'nexus') {
      const team = nameOf(event.teamId);
      const icon = objectiveIconOf(event);
      if (event.type === 'nexus') {
        entries.push({
          t: event.t,
          clock: clockLabel(event.t),
          kind: 'end',
          text: `${clockLabel(event.t)} ${team} 推掉主堡，比賽結束`,
          side: sideOfTeam(box, event.teamId),
          icon,
          killer: replayActor(box, event.actorPlayerId, champIds),
          victim: null,
          assists: [],
          objectiveLabel: '主堡',
        });
      } else {
        entries.push({
          t: event.t,
          clock: clockLabel(event.t),
          kind: 'objective',
          text: `${clockLabel(event.t)} ${team} 拿下${objectiveShortName(event)}`,
          side: sideOfTeam(box, event.teamId),
          icon,
          killer: replayActor(box, event.actorPlayerId, champIds),
          victim: null,
          assists: [],
          objectiveLabel: objectiveShortName(event),
        });
      }
    }
  }
  return entries;
}

export function buildMatchDigest(
  box: MatchBoxScore,
  labels: { home: string; away: string },
): string[] {
  const nameOf = (teamId: string | null | undefined): string => {
    if (teamId === box.homeTeamId) return labels.home;
    if (teamId === box.awayTeamId) return labels.away;
    return '該隊';
  };

  const timeline = box.timeline
    .slice()
    .sort((left, right) => left.t - right.t || left.id.localeCompare(right.id));
  const paragraphs: string[] = [];
  const used = new Set<string>();

  const mark = (event: TimelineEvent): void => {
    used.add(event.id);
  };

  let index = 0;
  while (index < timeline.length) {
    const event = timeline[index];
    if (used.has(event.id)) {
      index += 1;
      continue;
    }

    if (isKillEvent(event)) {
      const cluster: TimelineEvent[] = [event];
      mark(event);
      let cursor = index + 1;
      while (cursor < timeline.length) {
        const next = timeline[cursor];
        if (used.has(next.id)) {
          cursor += 1;
          continue;
        }
        if (!isKillEvent(next)) {
          break;
        }
        if (next.t - cluster[0].t > 55 || next.t - cluster[cluster.length - 1].t > 35) {
          break;
        }
        cluster.push(next);
        mark(next);
        cursor += 1;
      }

      let linkedObjective: TimelineEvent | null = null;
      for (let look = index; look < timeline.length; look += 1) {
        const candidate = timeline[look];
        if (used.has(candidate.id) || !isObjectiveEvent(candidate)) {
          continue;
        }
        if (candidate.t < cluster[0].t - 15) {
          continue;
        }
        if (candidate.t - cluster[cluster.length - 1].t > 45) {
          break;
        }
        linkedObjective = candidate;
        mark(candidate);
        break;
      }

      const homeKills = cluster.filter((item) => item.teamId === box.homeTeamId).length;
      const awayKills = cluster.filter((item) => item.teamId === box.awayTeamId).length;
      const leadHome = homeKills >= awayKills;
      const leadTeamId = leadHome ? box.homeTeamId : box.awayTeamId;
      const ourKills = leadHome ? homeKills : awayKills;
      const theirKills = leadHome ? awayKills : homeKills;
      const team = nameOf(leadTeamId);
      const hasFirstBlood = cluster.some((item) => item.type === 'first-blood');
      const totalKills = ourKills + theirKills;
      const worthStory =
        Boolean(linkedObjective) ||
        hasFirstBlood ||
        totalKills >= 2 ||
        cluster.some((item) => item.type === 'mistake') ||
        cluster[0].t >= 18 * 60;
      if (!worthStory) {
        index = cursor;
        continue;
      }

      const headline = fightHeadline(cluster, linkedObjective);
      const star = starKillOf(cluster, leadTeamId);
      const named = describeNamedKill(box, star);
      const trade = tradePhrase(ourKills, theirKills);
      const objectiveFight =
        linkedObjective &&
        (linkedObjective.type === 'dragon' ||
          linkedObjective.type === 'dragon-soul' ||
          linkedObjective.type === 'baron' ||
          linkedObjective.type === 'elder');
      let line = `${minuteLabel(cluster[0].t)}，`;

      if (totalKills >= 3 || (totalKills >= 2 && objectiveFight)) {
        line += `${headline.flavor}，${team}${fightActionPhrase(cluster[0].t, ourKills, theirKills, headline.place)}`;
        line += `，先手是${named}`;
      } else if (totalKills >= 2) {
        const coda =
          ourKills >= 3 && theirKills === 0
            ? `打出${trade}大獲全勝`
            : ourKills > theirKills
              ? `打出${trade}`
              : ourKills === theirKills
                ? `雙方換完${trade}`
                : `硬換${trade}`;
        line += `${named}，${team}${headline.flavor}，${coda}`;
      } else {
        line += named;
        if (cluster[0].payload?.killContext === 'gank') {
          line += `，${team}遊走得手`;
        } else if (cluster[0].payload?.fightLane) {
          line += `，${team}在${lanePlace(cluster[0].payload.fightLane)}得手`;
        }
      }

      if (linkedObjective) {
        line += objectiveFollowUp(linkedObjective, leadTeamId, nameOf);
      }
      paragraphs.push(line);
      index = cursor;
      continue;
    }

    if (isObjectiveEvent(event)) {
      mark(event);
      if (event.type === 'tower') {
        index += 1;
        continue;
      }
      const team = nameOf(event.teamId);
      const nearby = nearbyKillsAround(timeline, event.t, 50);
      paragraphs.push(`${minuteLabel(event.t)}，${describeObjectiveMoment(box, event, team, nearby)}`);
      index += 1;
      continue;
    }

    if (event.type === 'nexus') {
      mark(event);
      const winner = nameOf(event.teamId ?? box.winnerTeamId);
      const score = `${box.home.kills}-${box.away.kills}`;
      paragraphs.push(
        `${minuteLabel(event.t)}，${winner}推掉主堡，以 ${score} 結束比賽`,
      );
      index += 1;
      continue;
    }

    index += 1;
  }

  if (!timeline.some((event) => event.type === 'nexus')) {
    const winner = nameOf(box.winnerTeamId);
    const score = `${box.home.kills}-${box.away.kills}`;
    paragraphs.push(
      `${minuteLabel(box.durationSec)}，${winner}推掉主堡，以 ${score} 結束比賽`,
    );
  }

  return paragraphs;
}

function shareAsPct(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value <= 1.0001 ? value * 100 : value;
}

function eventInvolves(event: TimelineEvent, playerId: string): boolean {
  return event.actorPlayerId === playerId || (event.assistPlayerIds ?? []).includes(playerId);
}

export function pickMvpVerdict(
  report: MatchReport,
  stats: PlayerMatchStats,
  foe: PlayerMatchStats | undefined,
): string {
  const box = report.boxScore;
  const timeline = box.timeline;
  const playerId = stats.playerId;
  const candidates: Array<{ score: number; text: string }> = [];
  const push = (score: number, text: string): void => {
    candidates.push({ score, text });
  };

  const killNear = (t: number, windowSec = 50): TimelineEvent[] =>
    timeline.filter(
      (event) =>
        Math.abs(event.t - t) <= windowSec &&
        (event.type === 'kill' || event.type === 'first-blood' || event.type === 'mistake') &&
        eventInvolves(event, playerId),
    );

  const teamObjectives = (type: TimelineEvent['type']): TimelineEvent[] =>
    timeline.filter((event) => event.type === type && event.teamId === stats.teamId);

  for (const dragon of teamObjectives('dragon')) {
    const near = killNear(dragon.t);
    const took = dragon.actorPlayerId === playerId;
    if (took && near.length >= 1) {
      push(96, '關鍵搶龍');
    } else if (took) {
      push(84, '拿下小龍');
    } else if (near.length >= 3) {
      push(88, '龍團關鍵發揮');
    } else if (near.length >= 2) {
      push(80, '龍團收割');
    }
  }

  for (const soul of teamObjectives('dragon-soul')) {
    const near = killNear(soul.t, 60);
    const took = soul.actorPlayerId === playerId;
    if (took) {
      push(94, '拿下龍魂');
    } else if (near.length >= 2) {
      push(85, '龍魂團收割');
    }
  }

  for (const baron of teamObjectives('baron')) {
    const near = killNear(baron.t, 45);
    const took = baron.actorPlayerId === playerId;
    if (took && near.length >= 1) {
      push(98, '關鍵搶巴龍');
    } else if (took) {
      push(91, '拿下巴龍');
    } else if (near.length >= 3) {
      push(87, '巴龍團關鍵發揮');
    } else if (near.length >= 2) {
      push(79, '巴龍團收割');
    }
  }

  for (const elder of teamObjectives('elder')) {
    const near = killNear(elder.t, 45);
    const took = elder.actorPlayerId === playerId;
    if (took) {
      push(97, '拿下遠古龍');
    } else if (near.length >= 2) {
      push(86, '遠古龍團收割');
    }
  }

  const objectiveKills = timeline.filter(
    (event) =>
      (event.type === 'kill' || event.type === 'first-blood') &&
      eventInvolves(event, playerId) &&
      (event.payload?.killContext === 'dragon' ||
        event.payload?.killContext === 'baron' ||
        event.payload?.killContext === 'elder'),
  );
  if (objectiveKills.filter((event) => event.payload?.killContext === 'baron').length >= 2) {
    push(78, '巴龍團收割');
  } else if (objectiveKills.filter((event) => event.payload?.killContext === 'dragon').length >= 2) {
    push(76, '龍團收割');
  }

  const firstBlood = timeline.find((event) => event.type === 'first-blood');
  if (firstBlood && eventInvolves(firstBlood, playerId)) {
    push(70, '拿下一血');
  }

  const teamfights = timeline.filter(
    (event) => event.type === 'teamfight' && event.teamId === stats.teamId,
  );
  let bestFightKills = 0;
  for (const fight of teamfights) {
    bestFightKills = Math.max(bestFightKills, killNear(fight.t, 14).length);
  }
  if (bestFightKills >= 3) {
    push(93, '團戰關鍵發揮');
  } else if (bestFightKills >= 2) {
    push(80, '團戰收割');
  }

  if (report.turningPoints.some((point) => point.playerId === playerId || point.gamertag === stats.gamertag)) {
    push(86, '打出致勝團');
  }

  const damagePct = shareAsPct(stats.damagePct);
  const kpPct = shareAsPct(stats.kpPct);
  const kdaScore =
    stats.deaths === 0 ? stats.kills + stats.assists : (stats.kills + stats.assists) / stats.deaths;

  if (damagePct >= 32 && stats.kills >= 5) {
    push(76, '傷害打爆全場');
  }
  if (kpPct >= 70 && stats.assists >= 6 && bestFightKills >= 1) {
    push(73, '團戰參與拉滿');
  }
  if (stats.deaths === 0 && kdaScore >= 6 && stats.kills + stats.assists >= 8) {
    push(77, '零死打爆全場');
  } else if (stats.deaths <= 1 && kdaScore >= 6 && stats.kills + stats.assists >= 8) {
    push(72, '高光低死發揮');
  }

  if (foe) {
    const goldLead = stats.gold - foe.gold;
    const damageLead = stats.damageToChamps - foe.damageToChamps;
    const csLead = stats.cs - foe.cs;
    const laneWins =
      (goldLead >= 1000 ? 1 : 0) +
      (csLead >= 25 ? 1 : 0) +
      (stats.kills + stats.assists > foe.kills + foe.assists + 2 ? 1 : 0);
    if (laneWins >= 2 && goldLead >= 2500 && csLead >= 30) {
      push(95, '對位打爆');
    } else if (laneWins >= 2 && goldLead >= 1600) {
      push(83, '對位碾壓');
    } else if (goldLead >= 900 && csLead >= 18) {
      push(62, '對位壓制');
    } else if (damageLead >= 8000 && goldLead < 1500) {
      push(74, '團戰輸出拉滿');
    }
  }

  if (report.isUpset && stats.teamId === report.winnerTeamId) {
    push(81, '帶隊逆轉');
  }

  candidates.sort((left, right) => right.score - left.score);
  return candidates[0]?.text ?? '本場高光';
}
