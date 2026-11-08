import type { AttributeKey, PlayerPosition } from '../../core/models/player.model';
import { SIM_BALANCE } from './balance';
import type { MatchPhaseId, MatchKeyPlayer } from './report';
import type { TeamProfile, SimPlayerView } from './team-profile';

type PhaseWeights = Partial<Record<AttributeKey, number>>;
type PositionWeights = Partial<Record<PlayerPosition, number>>;

const PHASE_ATTR_WEIGHTS: Record<Exclude<MatchPhaseId, 'draft'>, PhaseWeights> = {
  early: { laning: 0.4, mechanics: 0.3, gameSense: 0.2, teamfighting: 0.1 },
  mid: { gameSense: 0.3, mechanics: 0.25, teamfighting: 0.25, laning: 0.1, consistency: 0.1 },
  late: { teamfighting: 0.35, gameSense: 0.25, consistency: 0.2, mechanics: 0.1, adaptability: 0.1 },
};

const PHASE_POS_WEIGHTS: Record<Exclude<MatchPhaseId, 'draft'>, PositionWeights> = {
  early: { TOP: 1.15, JUNGLE: 1.2, MID: 1.2, BOT: 0.9, SUPPORT: 0.85 },
  mid: { TOP: 0.95, JUNGLE: 1.25, MID: 1.2, BOT: 1, SUPPORT: 1.05 },
  late: { TOP: 1.05, JUNGLE: 0.95, MID: 1.05, BOT: 1.2, SUPPORT: 1.1 },
};

function playerPhaseScore(view: SimPlayerView, phase: Exclude<MatchPhaseId, 'draft'>): number {
  const attrs = PHASE_ATTR_WEIGHTS[phase];
  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(attrs)) {
    total += view.effective[key as AttributeKey] * (weight ?? 0);
    weightSum += weight ?? 0;
  }
  const base = weightSum > 0 ? total / weightSum : 0;
  const posWeight = PHASE_POS_WEIGHTS[phase][view.player.position] ?? 1;
  return base * posWeight;
}

export function teamPhasePower(profile: TeamProfile, phase: Exclude<MatchPhaseId, 'draft'>): {
  power: number;
  best: MatchKeyPlayer | null;
} {
  let sum = 0;
  let best: MatchKeyPlayer | null = null;
  for (const view of profile.players) {
    const score = playerPhaseScore(view, phase);
    sum += score;
    if (!best || score > best.score) {
      best = {
        teamId: profile.teamId,
        playerId: view.player.id,
        gamertag: view.player.gamertag,
        position: view.player.position,
        phase,
        reasonKey: `${phase}-carry`,
        score,
        contribution: '',
      };
    }
  }
  const specialtyBoost = specialtyPhaseBoost(profile, phase);
  const power = (sum / Math.max(1, profile.players.length)) * profile.chemistry * (1 + specialtyBoost);
  return { power, best };
}

function specialtyPhaseBoost(profile: TeamProfile, phase: Exclude<MatchPhaseId, 'draft'>): number {
  const coach = profile.coach;
  if (!coach || coach.specialties.length === 0) {
    return 0;
  }
  const map: Record<Exclude<MatchPhaseId, 'draft'>, AttributeKey[]> = {
    early: ['laning', 'mechanics'],
    mid: ['gameSense', 'mechanics'],
    late: ['teamfighting', 'gameSense'],
  };
  const wanted = map[phase];
  const hit = coach.specialties.some((key) => wanted.includes(key));
  return hit ? SIM_BALANCE.specialtyBonus : 0;
}

export function draftPower(profile: TeamProfile, rival: TeamProfile): { power: number; notes: string[] } {
  const coach = profile.coach;
  const notes: string[] = [];
  let power = 70;
  if (coach) {
    power += (coach.attributes.draftStrategy / 120) * SIM_BALANCE.coachDraftWeight * 40;
    power += (coach.attributes.metaAdaptation / 120) * SIM_BALANCE.coachMetaWeight * 30;
    power += (coach.attributes.tacticalPlanning / 120) * SIM_BALANCE.coachTacticsWeight * 25;
    if (coach.attributes.draftStrategy >= 90) {
      notes.push('BP 策略準備充分');
    }
    if (coach.attributes.metaAdaptation >= 90) {
      notes.push('版本理解到位');
    }
  } else {
    power -= 4;
  }

  const adaptability = profile.players.reduce((sum, view) => sum + view.effective.adaptability, 0) /
    Math.max(1, profile.players.length);
  const pressure = rival.style.earlyAggression * 120;
  const adaptFactor = 1 - SIM_BALANCE.adaptabilityPressureScale * Math.max(0, (pressure - adaptability) / 120);
  power *= Math.max(0.85, adaptFactor);
  power *= 0.92 + profile.style.balanced * 0.16;
  return { power, notes };
}

export function maybeMistake(
  profile: TeamProfile,
  pressure: number,
  random: () => number,
): SimPlayerView | null {
  const consistency =
    profile.players.reduce((sum, view) => sum + view.effective.consistency, 0) /
    Math.max(1, profile.players.length);
  const low = consistency < 72;
  const chance =
    SIM_BALANCE.mistakeChanceBase +
    (low ? SIM_BALANCE.mistakeChanceLowConsistency : 0) +
    Math.max(0, pressure - 80) / 800;
  if (random() > chance) {
    return null;
  }
  return profile.players.slice().sort((left, right) => left.effective.consistency - right.effective.consistency)[0] ?? null;
}

export function leadershipComeback(profile: TeamProfile, trailing: boolean): number {
  if (!trailing || !profile.coach) {
    return 0;
  }
  return (profile.coach.attributes.inGameLeadership / 120) * SIM_BALANCE.coachLeadershipComeback * 12;
}
