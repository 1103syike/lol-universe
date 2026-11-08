import type { Coach } from '../../core/models/coach.model';
import type { Player } from '../../core/models/player.model';
import { calculateChemistry } from './chemistry';
import {
  deriveKeyPlayers,
  deriveNarrativeEvents,
  derivePhaseReports,
  deriveTurningPoints,
  isUpsetFromBox,
} from './derive-from-box';
import { assertBoxScore } from './invariants';
import { simulateLiveMatch } from './live-match';
import { resolveMatchupSwings } from './matchup';
import { modifiersFromMatchups } from './match-state';
import { classifyMatchArchetypes } from './match-archetype';
import {
  buildAdvantageSummary,
  buildDecisiveSummary,
  pickPrimaryReasonKey,
} from './narrative';
import { runClassicDraft } from './draft';
import { teamPhasePower } from './phases';
import type { MatchPhaseId, MatchPhaseReport, MatchReport } from './report';
import { REASON_LABELS } from './report';
import { resolvePatchMeta, resolvePatchVersion } from './resolve-patch';
import {
  buildV2Input,
  getSimEngineMode,
  runV2MatchAsync,
  simulateV2Match,
  toMatchReport,
} from '../sim-v2';
import { buildTeamProfile, type TeamProfile } from './team-profile';

export interface MatchSideInput {
  teamId: string;
  players: readonly Player[];
  coach: Coach | null;
}

export interface SimulateGameInput {
  home: MatchSideInput;
  away: MatchSideInput;
  random?: () => number;
  forceWinnerTeamId?: string;
  dateIso?: string;
}

export interface SimulateSeriesInput extends SimulateGameInput {
  need: number;
  onGame?: (winnerTeamId: string, report: MatchReport) => void;
}

export interface SimulateSeriesResult {
  winnerTeamId: string;
  homeWins: number;
  awayWins: number;
  reports: MatchReport[];
}

function findSwing(phases: MatchPhaseReport[]): MatchPhaseId | null {
  let prev: string | null = null;
  for (const phase of phases) {
    if (!phase.leaderTeamId) {
      continue;
    }
    if (prev && prev !== phase.leaderTeamId) {
      return phase.id;
    }
    prev = phase.leaderTeamId;
  }
  return null;
}

function buildSide(input: MatchSideInput, random: () => number): TeamProfile {
  const chemistry = calculateChemistry(input.players, input.coach);
  return buildTeamProfile(input.teamId, input.players, input.coach, random, chemistry);
}

function simulateGameOnce(input: SimulateGameInput, draftBias = 0): MatchReport {
  const random = input.random ?? Math.random;
  const home = buildSide(input.home, random);
  const away = buildSide(input.away, random);
  const matchups = resolveMatchupSwings(home.style, away.style);

  const patch = resolvePatchVersion(input.dateIso);
  const meta = resolvePatchMeta(patch);
  const draft = runClassicDraft({
    home,
    away,
    patch,
    meta,
    random,
  });
  const draftEdge = draft.draftEdge + draftBias;
  const coachNotes = draft.notes.slice(0, 6);
  const styleNotes = matchups.map((item) => item.note).filter(Boolean) as string[];

  const modifiers = modifiersFromMatchups(draftEdge, matchups);
  modifiers.matchupByPhase.early += draft.home.phaseBias.early - draft.away.phaseBias.early;
  modifiers.matchupByPhase.mid += draft.home.phaseBias.mid - draft.away.phaseBias.mid;
  modifiers.matchupByPhase.late += draft.home.phaseBias.late - draft.away.phaseBias.late;

  const { boxScore } = simulateLiveMatch({
    home,
    away,
    random,
    modifiers,
    forceWinnerTeamId: input.forceWinnerTeamId,
  });
  assertBoxScore(boxScore);

  const phases = derivePhaseReports(boxScore);
  const draftNotes = [
    `${patch.label}（${patch.riotPatch}）`,
    ...draft.home.notes.slice(0, 1),
    ...draft.away.notes.slice(0, 1),
  ];
  phases[0] = {
    id: 'draft',
    edge: Number(draftEdge.toFixed(2)),
    leaderTeamId:
      Math.abs(draftEdge) < 0.75 ? null : draftEdge > 0 ? home.teamId : away.teamId,
    notes: draftNotes.slice(0, 3),
  };

  const winnerTeamId = boxScore.winnerTeamId;
  const isUpset = isUpsetFromBox(boxScore);
  const turningPoints = deriveTurningPoints(boxScore, winnerTeamId);
  const events = deriveNarrativeEvents(boxScore);
  const keyPlayers = deriveKeyPlayers(
    boxScore,
    winnerTeamId,
    winnerTeamId === home.teamId ? home : away,
  );
  const swingPhase = findSwing(phases);
  const uniqueCoachNotes = [...new Set(coachNotes)].slice(0, 4);
  const uniqueStyleNotes = [...new Set(styleNotes)].slice(0, 4);
  const primaryReason = pickPrimaryReasonKey(
    phases,
    winnerTeamId,
    uniqueStyleNotes,
    uniqueCoachNotes,
    turningPoints,
    isUpset,
  );
  const advantageSummary = buildAdvantageSummary(phases, home.teamId, away.teamId);
  const decisiveSummary = buildDecisiveSummary({
    phases,
    winnerTeamId,
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    primaryReason,
    keyPlayers,
    turningPoints,
    isUpset,
  });
  const preMatchEdge = draft.home.power - draft.away.power;
  const archetypes = classifyMatchArchetypes({
    box: boxScore,
    preMatchEdge,
  });

  return {
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    winnerTeamId,
    phases,
    keyPlayers,
    mvp: keyPlayers[0] ?? null,
    events,
    turningPoints,
    coachNotes: uniqueCoachNotes,
    styleNotes: uniqueStyleNotes,
    swingPhase,
    primaryReason,
    advantageSummary,
    decisiveSummary,
    homeStyles: home.styleLabels,
    awayStyles: away.styleLabels,
    isUpset,
    archetypes,
    boxScore,
    draft: {
      patchId: patch.id,
      patchLabel: patch.label,
      riotPatch: patch.riotPatch,
      blueTeamId: draft.blueTeamId,
      redTeamId: draft.redTeamId,
      bans: draft.bans,
      home: {
        teamId: draft.home.teamId,
        intent: draft.home.intent,
        power: draft.home.power,
        picks: draft.home.picks,
      },
      away: {
        teamId: draft.away.teamId,
        intent: draft.away.intent,
        power: draft.away.power,
        picks: draft.away.picks,
      },
    },
  };
}

export function simulateGame(input: SimulateGameInput): MatchReport {
  if (getSimEngineMode() === 'v2') {
    return toMatchReport(simulateV2Match(buildV2Input(input)));
  }
  return simulateGameOnce(input);
}

export async function simulateGameAsync(input: SimulateGameInput): Promise<MatchReport> {
  if (getSimEngineMode() === 'v2') {
    return runV2MatchAsync(input);
  }
  return simulateGameOnce(input);
}

export function simulateSeries(input: SimulateSeriesInput): SimulateSeriesResult {
  const reports: MatchReport[] = [];
  let homeWins = 0;
  let awayWins = 0;

  while (homeWins < input.need && awayWins < input.need) {
    const report = simulateGame({
      home: input.home,
      away: input.away,
      random: input.random,
      dateIso: input.dateIso,
      forceWinnerTeamId: input.forceWinnerTeamId,
    });
    reports.push(report);
    input.onGame?.(report.winnerTeamId, report);
    if (report.winnerTeamId === input.home.teamId) {
      homeWins += 1;
    } else {
      awayWins += 1;
    }
  }

  return {
    winnerTeamId: homeWins >= input.need ? input.home.teamId : input.away.teamId,
    homeWins,
    awayWins,
    reports,
  };
}

export function explainReason(reasonKey: string): string {
  return REASON_LABELS[reasonKey] ?? reasonKey;
}

export function pickBubbleWinnerByProfile(
  sides: Array<{ teamId: string; players: readonly Player[]; coach: Coach | null }>,
  random: () => number = Math.random,
): string | null {
  if (sides.length === 0) {
    return null;
  }
  if (sides.length === 1) {
    return sides[0].teamId;
  }

  const weights = sides.map((side) => {
    const chemistry = calculateChemistry(side.players, side.coach);
    const profile = buildTeamProfile(side.teamId, side.players, side.coach, random, chemistry);
    const early = teamPhasePower(profile, 'early').power;
    const mid = teamPhasePower(profile, 'mid').power;
    const late = teamPhasePower(profile, 'late').power;
    return Math.pow(Math.max(1, (early + mid + late) / 3), 1.25);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let index = 0; index < sides.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) {
      return sides[index].teamId;
    }
  }
  return sides[sides.length - 1].teamId;
}
