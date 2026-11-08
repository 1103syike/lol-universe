import { SIM_BALANCE } from './balance';
import type { MatchState } from './match-state';
import type { ObjectiveMethod, PlayPhaseId } from './match-stats';
import type { TeamProfile } from './team-profile';
import { combatPower } from './economy';

export type ObjectiveIntent = 'contest' | 'trade' | 'give-up';

export type ContestableObjective = 'dragon' | 'voidgrub' | 'herald' | 'baron' | 'elder';

export type ObjectiveDecisionOutcome = 'fight' | 'free-take' | 'trade-take' | 'defer';

export type { ObjectiveMethod };

export interface SideObjectiveChoice {
  intent: ObjectiveIntent;
  method: ObjectiveMethod | null;
  strength: number;
  reasons: string[];
}

export interface ObjectiveDecision {
  kind: ContestableObjective;
  home: SideObjectiveChoice;
  away: SideObjectiveChoice;
  outcome: ObjectiveDecisionOutcome;
  takerIsHome: boolean | null;
  traderIsHome: boolean | null;
  method: ObjectiveMethod | null;
  reasonSummary: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function objectiveWeight(kind: ContestableObjective, style: TeamProfile['style']): number {
  if (kind === 'baron' || kind === 'elder') {
    return style.resourceControl * 22 + style.teamfightExecute * 18;
  }
  if (kind === 'herald' || kind === 'voidgrub') {
    return style.resourceControl * 16 + style.jungleMidSync * 14 + style.earlyAggression * 10;
  }
  return style.resourceControl * 20 + style.teamfightExecute * 10 + style.jungleMidSync * 8;
}

function sideStrength(input: {
  kind: ContestableObjective;
  profile: TeamProfile;
  phase: PlayPhaseId;
  state: MatchState;
  isHome: boolean;
  edge: number;
}): number {
  const roster =
    input.profile.players.reduce((sum, view) => sum + combatPower(view, input.phase), 0) /
    Math.max(1, input.profile.players.length);
  const styleScore = objectiveWeight(input.kind, input.profile.style);
  const gapBias = input.isHome
    ? input.state.goldGap / 2200 + input.state.towerGap * 1.4 + input.state.killGap * 0.55
    : -input.state.goldGap / 2200 - input.state.towerGap * 1.4 - input.state.killGap * 0.55;
  const edgeBias = input.isHome ? input.edge / 4 : -input.edge / 4;
  return roster + styleScore + gapBias * 3 + edgeBias;
}

function withMethod(
  choice: Omit<SideObjectiveChoice, 'method'>,
  profile: TeamProfile,
  phase: PlayPhaseId,
  random: () => number,
): SideObjectiveChoice {
  if (choice.intent !== 'contest') {
    return { ...choice, method: null };
  }
  const method = pickObjectiveMethod(profile, phase, random);
  return {
    ...choice,
    method,
    reasons: [...choice.reasons, methodReason(method)],
  };
}

export function pickObjectiveMethod(
  profile: TeamProfile,
  phase: PlayPhaseId,
  random: () => number,
): ObjectiveMethod {
  const style = profile.style;
  const weights: Array<{ method: ObjectiveMethod; weight: number }> = [
    { method: 'direct', weight: 0.9 + style.teamfightExecute * 0.35 },
    {
      method: 'fake-start',
      weight: style.splitPush * 0.85 + style.lanePressure * 0.35 + (phase === 'mid' ? 0.2 : 0),
    },
    {
      method: 'engage-ambush',
      weight:
        style.jungleMidSync * 0.95 +
        style.earlyAggression * 0.7 +
        (phase === 'early' ? 0.35 : phase === 'mid' ? 0.2 : 0.05),
    },
    {
      method: 'vision-first',
      weight:
        style.resourceControl * 0.9 +
        style.jungleMidSync * 0.35 +
        (phase === 'late' ? 0.35 : 0.1),
    },
  ];
  const total = weights.reduce((sum, row) => sum + Math.max(0.05, row.weight), 0);
  let roll = random() * total;
  for (const row of weights) {
    roll -= Math.max(0.05, row.weight);
    if (roll <= 0) {
      return row.method;
    }
  }
  return 'direct';
}

export function methodLabel(method: ObjectiveMethod): string {
  if (method === 'fake-start') return '假開';
  if (method === 'engage-ambush') return '埋伏開團';
  if (method === 'vision-first') return '先做視野';
  return '正面硬接';
}

function methodReason(method: ObjectiveMethod): string {
  if (method === 'fake-start') return '以假開試探，準備撤離或反打';
  if (method === 'engage-ambush') return '卡視野埋伏，尋求先手開團';
  if (method === 'vision-first') return '先清視野再穩拿物件';
  return '直接正面爭奪';
}

function pickIntent(input: {
  kind: ContestableObjective;
  mine: number;
  theirs: number;
  profile: TeamProfile;
  canRotate: boolean;
  phase: PlayPhaseId;
  aliveCount: number;
  random: () => number;
}): SideObjectiveChoice {
  const delta = input.mine - input.theirs;
  const reasons: string[] = [];
  const splitLean = input.profile.style.splitPush;
  const laneLean = input.profile.style.lanePressure;
  const resourceLean = input.profile.style.resourceControl;

  if (input.aliveCount <= 0) {
    reasons.push('全隊陣亡，無法參與爭奪');
    return { intent: 'give-up', method: null, strength: input.mine, reasons };
  }
  if (input.aliveCount === 1) {
    reasons.push('僅剩一人存活，放棄正面爭奪');
    if (input.canRotate || splitLean > 0.5) {
      return { intent: 'trade', method: null, strength: input.mine, reasons };
    }
    return { intent: 'give-up', method: null, strength: input.mine, reasons };
  }
  if (input.aliveCount === 2) {
    if (delta < 8 || input.random() < 0.72) {
      reasons.push('存活人數不足，優先交換或放棄');
      if (input.canRotate || splitLean > 0.45 || laneLean > 0.5) {
        return { intent: 'trade', method: null, strength: input.mine, reasons };
      }
      return { intent: 'give-up', method: null, strength: input.mine, reasons };
    }
  }

  if (delta >= 10) {
    reasons.push('戰力與節奏領先，正面爭奪');
    return withMethod(
      { intent: 'contest', strength: input.mine, reasons },
      input.profile,
      input.phase,
      input.random,
    );
  }

  if (delta <= -18) {
    if ((splitLean > 0.55 || laneLean > 0.58 || input.canRotate) && input.random() < 0.72) {
      reasons.push('劣勢明顯，改換另一側資源');
      return { intent: 'trade', method: null, strength: input.mine, reasons };
    }
    reasons.push('條件不利，選擇放棄避免團滅');
    return { intent: 'give-up', method: null, strength: input.mine, reasons };
  }

  if (delta <= -8) {
    if (input.canRotate && splitLean + laneLean > resourceLean + 0.15) {
      reasons.push('可轉線且分推／線權較強，優先交換');
      return { intent: 'trade', method: null, strength: input.mine, reasons };
    }
    if (input.random() < 0.45 + splitLean * 0.25) {
      reasons.push('弱勢下選擇交換而非硬接');
      return { intent: 'trade', method: null, strength: input.mine, reasons };
    }
    if (input.random() < 0.35) {
      reasons.push('評估風險後放棄此波');
      return { intent: 'give-up', method: null, strength: input.mine, reasons };
    }
    reasons.push('雖落後仍嘗試干擾爭奪');
    return withMethod(
      { intent: 'contest', strength: input.mine, reasons },
      input.profile,
      input.phase,
      input.random,
    );
  }

  if (input.kind === 'voidgrub' || input.kind === 'herald') {
    if (resourceLean < 0.42 && input.random() < 0.28) {
      reasons.push('前期資源優先級不高，暫緩爭奪');
      return { intent: 'give-up', method: null, strength: input.mine, reasons };
    }
  }

  if (splitLean > 0.62 && input.canRotate && input.random() < 0.22) {
    reasons.push('陣容偏分推，用邊線換物件');
    return { intent: 'trade', method: null, strength: input.mine, reasons };
  }

  reasons.push('雙方條件接近，選擇正面爭奪');
  return withMethod(
    { intent: 'contest', strength: input.mine, reasons },
    input.profile,
    input.phase,
    input.random,
  );
}

function intentLabel(intent: ObjectiveIntent): string {
  if (intent === 'contest') {
    return '爭奪';
  }
  if (intent === 'trade') {
    return '交換';
  }
  return '放棄';
}

function resolveMethod(
  home: SideObjectiveChoice,
  away: SideObjectiveChoice,
  homeStrength: number,
  awayStrength: number,
): ObjectiveMethod | null {
  if (home.method && away.method) {
    return homeStrength >= awayStrength ? home.method : away.method;
  }
  return home.method ?? away.method;
}

function applyMethodToFight(input: {
  method: ObjectiveMethod | null;
  methodSideIsHome: boolean | null;
  homeFavored: number;
  random: () => number;
}): { takerIsHome: boolean; favored: number; note: string } {
  let favored = input.homeFavored;
  if (input.method === 'vision-first' && input.methodSideIsHome !== null) {
    favored += input.methodSideIsHome ? 0.08 : -0.08;
    const takerIsHome = input.random() < clamp(favored, 0.12, 0.88);
    return {
      takerIsHome,
      favored,
      note: `以${methodLabel('vision-first')}穩場後由${takerIsHome ? '主隊' : '客隊'}拿走`,
    };
  }
  if (input.method === 'engage-ambush' && input.methodSideIsHome !== null) {
    favored += input.methodSideIsHome ? 0.1 : -0.1;
    const takerIsHome = input.random() < clamp(favored, 0.12, 0.88);
    return {
      takerIsHome,
      favored,
      note: `${methodLabel('engage-ambush')}奏效，${takerIsHome ? '主隊' : '客隊'}打出資源團優勢`,
    };
  }
  if (input.method === 'fake-start') {
    if (input.random() < 0.32) {
      const stealHome = input.methodSideIsHome === true ? false : true;
      return {
        takerIsHome: stealHome,
        favored,
        note: '假開後對手接手／反打得手',
      };
    }
    const takerIsHome = input.random() < clamp(favored, 0.12, 0.88);
    return {
      takerIsHome,
      favored,
      note: `假開試探後仍由${takerIsHome ? '主隊' : '客隊'}收走物件`,
    };
  }
  const takerIsHome = input.random() < clamp(favored, 0.12, 0.88);
  return {
    takerIsHome,
    favored,
    note: `雙方皆爭奪，${takerIsHome ? '主隊' : '客隊'}在資源團中勝出`,
  };
}

function decisionBase(
  kind: ContestableObjective,
  home: SideObjectiveChoice,
  away: SideObjectiveChoice,
  partial: Omit<ObjectiveDecision, 'kind' | 'home' | 'away' | 'method'>,
  method: ObjectiveMethod | null,
): ObjectiveDecision {
  return {
    kind,
    home,
    away,
    method,
    ...partial,
  };
}

export function decideObjective(input: {
  kind: ContestableObjective;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  state: MatchState;
  edge: number;
  random: () => number;
}): ObjectiveDecision {
  const homeStrength = sideStrength({
    kind: input.kind,
    profile: input.home,
    phase: input.phase,
    state: input.state,
    isHome: true,
    edge: input.edge,
  });
  const awayStrength = sideStrength({
    kind: input.kind,
    profile: input.away,
    phase: input.phase,
    state: input.state,
    isHome: false,
    edge: input.edge,
  });

  const home = pickIntent({
    kind: input.kind,
    mine: homeStrength,
    theirs: awayStrength,
    profile: input.home,
    canRotate: input.state.canRotateHome,
    phase: input.phase,
    aliveCount: input.state.homeAlive,
    random: input.random,
  });
  const away = pickIntent({
    kind: input.kind,
    mine: awayStrength,
    theirs: homeStrength,
    profile: input.away,
    canRotate: input.state.canRotateAway,
    phase: input.phase,
    aliveCount: input.state.awayAlive,
    random: input.random,
  });

  const method = resolveMethod(home, away, homeStrength, awayStrength);
  const methodSideIsHome =
    method === null
      ? null
      : home.method === method && away.method !== method
        ? true
        : away.method === method && home.method !== method
          ? false
          : homeStrength >= awayStrength;
  const homeFavored = clamp(1 / (1 + Math.exp(-(homeStrength - awayStrength) / 18)), 0.12, 0.88);

  if (home.intent === 'give-up' && away.intent === 'give-up') {
    return decisionBase(
      input.kind,
      home,
      away,
      {
        outcome: 'defer',
        takerIsHome: null,
        traderIsHome: null,
        reasonSummary: '雙方皆放棄此波物件，暫時不開打',
      },
      null,
    );
  }

  if (home.intent === 'trade' && away.intent === 'trade') {
    return decisionBase(
      input.kind,
      home,
      away,
      {
        outcome: 'defer',
        takerIsHome: null,
        traderIsHome: input.home.style.lanePressure >= input.away.style.lanePressure,
        reasonSummary: '雙方都想交換，物件暫時懸空，各自推線',
      },
      null,
    );
  }

  if (home.intent === 'contest' && away.intent === 'give-up') {
    const methodNote = home.method ? `（${methodLabel(home.method)}）` : '';
    return decisionBase(
      input.kind,
      home,
      away,
      {
        outcome: 'free-take',
        takerIsHome: true,
        traderIsHome: null,
        reasonSummary: `主隊${intentLabel('contest')}${methodNote}、客隊放棄，主隊趁勢拿走`,
      },
      home.method,
    );
  }

  if (away.intent === 'contest' && home.intent === 'give-up') {
    const methodNote = away.method ? `（${methodLabel(away.method)}）` : '';
    return decisionBase(
      input.kind,
      home,
      away,
      {
        outcome: 'free-take',
        takerIsHome: false,
        traderIsHome: null,
        reasonSummary: `客隊${intentLabel('contest')}${methodNote}、主隊放棄，客隊趁勢拿走`,
      },
      away.method,
    );
  }

  if (home.intent === 'contest' && away.intent === 'trade') {
    const methodNote = home.method ? `以${methodLabel(home.method)}` : '爭奪物件';
    return decisionBase(
      input.kind,
      home,
      away,
      {
        outcome: 'trade-take',
        takerIsHome: true,
        traderIsHome: false,
        reasonSummary: `主隊${methodNote}，客隊改換另一側資源`,
      },
      home.method,
    );
  }

  if (away.intent === 'contest' && home.intent === 'trade') {
    const methodNote = away.method ? `以${methodLabel(away.method)}` : '爭奪物件';
    return decisionBase(
      input.kind,
      home,
      away,
      {
        outcome: 'trade-take',
        takerIsHome: false,
        traderIsHome: true,
        reasonSummary: `客隊${methodNote}，主隊改換另一側資源`,
      },
      away.method,
    );
  }

  if (
    (home.intent === 'give-up' && away.intent === 'trade') ||
    (away.intent === 'give-up' && home.intent === 'trade')
  ) {
    const traderIsHome = home.intent === 'trade';
    return decisionBase(
      input.kind,
      home,
      away,
      {
        outcome: 'defer',
        takerIsHome: null,
        traderIsHome,
        reasonSummary: `${traderIsHome ? '主隊' : '客隊'}選擇交換，對手放棄，物件暫緩`,
      },
      null,
    );
  }

  const fight = applyMethodToFight({
    method,
    methodSideIsHome,
    homeFavored,
    random: input.random,
  });
  return decisionBase(
    input.kind,
    home,
    away,
    {
      outcome: 'fight',
      takerIsHome: fight.takerIsHome,
      traderIsHome: method === 'fake-start' ? methodSideIsHome : null,
      reasonSummary: fight.note,
    },
    method,
  );
}

export function objectiveKindLabel(kind: ContestableObjective): string {
  if (kind === 'dragon') {
    return '小龍';
  }
  if (kind === 'voidgrub') {
    return '虛空幼體';
  }
  if (kind === 'herald') {
    return '預示者';
  }
  if (kind === 'baron') {
    return '巴龍';
  }
  return '遠古巨龍';
}

export const OBJECTIVE_DEFER_SEC = SIM_BALANCE.tickSeconds * 2;
