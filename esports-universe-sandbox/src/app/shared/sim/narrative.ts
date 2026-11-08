import type { PlayerPosition } from '../../core/models/player.model';
import type {
  MatchEvent,
  MatchKeyPlayer,
  MatchPhaseId,
  MatchPhaseReport,
  MatchTurningPoint,
} from './report';
import { PHASE_LABELS, REASON_LABELS } from './report';
import type { SimPlayerView } from './team-profile';

function sideLabel(teamId: string, homeTeamId: string, awayTeamId: string): string {
  if (teamId === homeTeamId) {
    return '主隊';
  }
  if (teamId === awayTeamId) {
    return '客隊';
  }
  return '該隊';
}

const PHASE_STORY_LED: Record<Exclude<MatchPhaseId, 'draft'>, Partial<Record<PlayerPosition, string>>> = {
  early: {
    TOP: '在上路建立優勢，幫助隊伍拉開前期差距',
    JUNGLE: '帶動前期節奏，協助隊伍建立地圖優勢',
    MID: '壓制中路對線，為隊伍創造前期主動權',
    BOT: '下路對線取得優勢，累積前期經濟',
    SUPPORT: '佈置前期視野與遊走，協助隊伍打開節奏',
  },
  mid: {
    TOP: '邊線牽制得當，支援隊伍中期資源交換',
    JUNGLE: '持續掌握資源交換，維持隊伍中期優勢',
    MID: '中野聯動順暢，幫助隊伍掌控中期節奏',
    BOT: '在中期團戰穩定輸出，擴大隊伍領先',
    SUPPORT: '視野與資源控制到位，穩住中期運營',
  },
  late: {
    TOP: '後期邊線與進場到位，支援決勝團戰',
    JUNGLE: '後期開團與切入奏效，帶動決勝節奏',
    MID: '後期團戰輸出穩定，幫助隊伍收束勝局',
    BOT: '在後期決勝團戰打出關鍵輸出，協助鎖定勝局',
    SUPPORT: '決勝開團與保護到位，撐起後期團戰結構',
  },
};

const PHASE_STORY_TRAIL: Record<Exclude<MatchPhaseId, 'draft'>, Partial<Record<PlayerPosition, string>>> = {
  early: {
    TOP: '前期上路勉力支撐，試圖減緩劣勢擴大',
    JUNGLE: '前期尋找反打機會，試圖止血節奏',
    MID: '前期中路苦撐對線，等待轉折窗口',
    BOT: '前期下路守勢應戰，避免崩線',
    SUPPORT: '前期以視野與保護優先，減緩地圖壓力',
  },
  mid: {
    TOP: '中期邊線盡力牽制，為隊友爭取喘息',
    JUNGLE: '中期積極尋找資源反打，試圖翻轉節奏',
    MID: '中期維持聯動，等待對手露出破綻',
    BOT: '中期團戰尋找輸出空間，避免差距被拉開',
    SUPPORT: '中期以視野換資源，爭取追趕機會',
  },
  late: {
    TOP: '後期尋找進場與牽制點，試圖製造翻盤空間',
    JUNGLE: '後期積極尋找開團時機，嘗試扭轉局勢',
    MID: '後期團戰力拚輸出，爭取最後翻盤機會',
    BOT: '後期決勝團中尋求收割機會，力拚逆轉',
    SUPPORT: '後期保護與開團並重，試圖創造決勝窗口',
  },
};

export function describePlayerStory(input: {
  view: SimPlayerView;
  phase: Exclude<MatchPhaseId, 'draft'>;
  teamLedPhase: boolean;
  events: MatchEvent[];
  isWinnerTeam: boolean;
  isUpset: boolean;
}): string {
  const fromEvent = input.events.find(
    (event) =>
      event.playerId === input.view.player.id &&
      event.phase === input.phase &&
      (event.kind === 'clutch-teamfight' ||
        event.kind === 'clutch-adapt' ||
        event.kind === 'mistake'),
  );
  if (fromEvent && fromEvent.kind === 'clutch-teamfight') {
    return input.isUpset
      ? '在後期決勝團戰中打出關鍵輸出，成功收割殘局完成逆轉'
      : '在後期團戰打出關鍵輸出，幫助隊伍鎖定勝局';
  }
  if (fromEvent && fromEvent.kind === 'clutch-adapt') {
    return '在決勝時刻臨場調整成功，幫助隊伍扭轉不利局勢';
  }
  if (fromEvent && fromEvent.kind === 'mistake' && !input.isWinnerTeam) {
    return `在${PHASE_LABELS[input.phase]}出現重大失誤，讓對手抓住翻盤機會`;
  }

  const table = input.teamLedPhase ? PHASE_STORY_LED : PHASE_STORY_TRAIL;
  return table[input.phase][input.view.player.position] ?? '在該階段發揮影響戰局';
}

export function buildAdvantageSummary(
  phases: MatchPhaseReport[],
  homeTeamId: string,
  awayTeamId: string,
): string {
  const led: { side: string; phases: string[] }[] = [
    { side: '主隊', phases: [] },
    { side: '客隊', phases: [] },
  ];
  const even: string[] = [];

  for (const phase of phases) {
    const label = PHASE_LABELS[phase.id];
    if (!phase.leaderTeamId || Math.abs(phase.edge) < 0.75) {
      even.push(label);
      continue;
    }
    const bucket = phase.leaderTeamId === homeTeamId ? led[0] : led[1];
    bucket.phases.push(label);
  }

  const parts: string[] = [];
  for (const item of led) {
    if (item.phases.length === 0) {
      continue;
    }
    if (item.phases.length >= 3) {
      parts.push(`${item.side}在${item.phases.join('、')}持續領先`);
    } else {
      parts.push(`${item.side}於${item.phases.join('、')}取得優勢`);
    }
  }
  if (even.length > 0) {
    parts.push(`${even.join('、')}接近膠著`);
  }
  if (parts.length === 0) {
    return '雙方各階段勢均力敵。';
  }
  return `${parts.join('；')}。`;
}

export function buildDecisiveSummary(input: {
  phases: MatchPhaseReport[];
  winnerTeamId: string;
  homeTeamId: string;
  awayTeamId: string;
  primaryReason: string;
  keyPlayers: MatchKeyPlayer[];
  turningPoints: MatchTurningPoint[];
  isUpset: boolean;
}): string {
  const winner = sideLabel(input.winnerTeamId, input.homeTeamId, input.awayTeamId);
  const playPhases = input.phases.filter((phase) => phase.id !== 'draft');
  const winnerLeads = playPhases.filter((phase) => phase.leaderTeamId === input.winnerTeamId);
  const turn = input.turningPoints[0];

  if (input.isUpset) {
    if (turn) {
      return `${winner}多數階段處於下風，最終依靠比賽轉折取勝：${turn.summary}。`;
    }
    return `${winner}多數階段處於下風，仍在決勝時刻以細微差距完成逆轉。`;
  }

  if (input.primaryReason === 'comeback-coach' && turn) {
    return `${winner}一度落後，${turn.summary}。`;
  }

  if (input.primaryReason === 'mistake-swing' && turn) {
    return `${winner}把握轉折機會取勝：${turn.summary}。`;
  }

  if (winnerLeads.length >= 2) {
    const ledNames = winnerLeads.map((phase) => PHASE_LABELS[phase.id]);
    const seal = turn?.summary ?? (REASON_LABELS[input.primaryReason] ?? '關鍵階段發揮更好');
    return `${winner}在${ledNames.join('、')}建立並維持優勢；${seal}。`;
  }

  if (turn) {
    return `${winner}在細微差距下取勝；${turn.summary}。`;
  }

  return `${winner}險勝；${REASON_LABELS[input.primaryReason] ?? '關鍵局細微差距定勝負'}。`;
}

export function pickPrimaryReasonKey(
  phases: MatchPhaseReport[],
  winnerTeamId: string,
  styleNotes: string[],
  coachNotes: string[],
  turningPoints: MatchTurningPoint[],
  isUpset: boolean,
): string {
  const playPhases = phases.filter((phase) => phase.id !== 'draft');
  const winnerLeads = playPhases.filter((phase) => phase.leaderTeamId === winnerTeamId);
  const opponentLeads = playPhases.filter(
    (phase) => phase.leaderTeamId && phase.leaderTeamId !== winnerTeamId,
  );
  const avgAbsEdge =
    playPhases.reduce((sum, phase) => sum + Math.abs(phase.edge), 0) / Math.max(1, playPhases.length);
  const topTurn = turningPoints[0];

  if (isUpset && topTurn?.kind === 'coach-comeback') {
    return 'comeback-coach';
  }
  if (isUpset && topTurn?.kind === 'mistake') {
    return 'mistake-swing';
  }
  if (isUpset && (topTurn?.kind === 'clutch-teamfight' || topTurn?.kind === 'clutch-adapt')) {
    return 'late-teamfight';
  }
  if (isUpset) {
    return 'even-close';
  }

  const trailedMost = opponentLeads.length >= 2 && winnerLeads.length <= 1;
  const coachComeback = coachNotes.some((note) => note.includes('逆轉') || note.includes('臨場'));
  if (trailedMost && coachComeback) {
    return 'comeback-coach';
  }

  if (topTurn?.kind === 'mistake' && avgAbsEdge < 12) {
    return 'mistake-swing';
  }

  if (winnerLeads.length >= 2) {
    const strongest = [...winnerLeads].sort((left, right) => Math.abs(right.edge) - Math.abs(left.edge))[0];
    if (strongest.notes.some((note) => note.includes('分推')) || topTurn?.kind === 'split-push') {
      return 'late-split';
    }
    if (strongest.id === 'mid') {
      return 'mid-control';
    }
    if (strongest.id === 'early') {
      return 'early-pressure';
    }
    if (strongest.id === 'late' || winnerLeads.some((phase) => phase.id === 'late')) {
      return 'late-teamfight';
    }
    return 'mid-control';
  }

  if (styleNotes.length > 0 || topTurn?.kind === 'style-swing') {
    return 'style-counter';
  }

  const late = phases.find((phase) => phase.id === 'late');
  if (late && late.leaderTeamId === winnerTeamId) {
    return late.notes.some((note) => note.includes('分推')) ? 'late-split' : 'late-teamfight';
  }

  return 'even-close';
}
