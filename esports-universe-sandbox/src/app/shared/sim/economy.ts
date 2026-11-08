import type { PlayerPosition } from '../../core/models/player.model';
import { SIM_BALANCE } from './balance';
import type { GoldSample, GoldSeries, PlayerRuntimeStats, TimelineEvent } from './match-stats';
import type { PlayPhaseId } from './match-stats';
import type { TeamProfile, SimPlayerView } from './team-profile';
import { createTimelineEvent, formatClock } from './timeline';

const CS_PER_MIN: Record<PlayerPosition, number> = {
  TOP: 7.1,
  JUNGLE: 6.3,
  MID: 8.0,
  BOT: 8.6,
  SUPPORT: 1.05,
};

const CS_GOLD_WEIGHT: Record<PlayerPosition, number> = {
  TOP: 1.0,
  JUNGLE: 0.9,
  MID: 1.08,
  BOT: 1.15,
  SUPPORT: 0.22,
};

const VISION_PER_MIN: Record<PlayerPosition, number> = {
  TOP: 0.7,
  JUNGLE: 1.8,
  MID: 0.9,
  BOT: 0.75,
  SUPPORT: 2.6,
};

const PHASE_INCOME: Record<PlayPhaseId, number> = {
  early: 0.92,
  mid: 1.0,
  late: 1.06,
};

export function startingPlayerGold(profile: TeamProfile): PlayerRuntimeStats[] {
  return profile.players.map((view) => ({
    playerId: view.player.id,
    teamId: profile.teamId,
    gamertag: view.player.gamertag,
    position: view.player.position,
    kills: 0,
    deaths: 0,
    assists: 0,
    damageToChamps: 0,
    gold: SIM_BALANCE.startingGold,
    cs: 0,
    visionScore: view.player.position === 'SUPPORT' || view.player.position === 'JUNGLE' ? 2 : 0,
    deadUntilSec: 0,
    items: [],
  }));
}

export function buildIncomeEvent(input: {
  t: number;
  phase: PlayPhaseId;
  profile: TeamProfile;
  homeTeamId: string;
  awayTeamId: string;
  random?: () => number;
}): TimelineEvent {
  const random = input.random ?? Math.random;
  const tickMinutes = SIM_BALANCE.tickSeconds / 60;
  const playerGold: Record<string, number> = {};
  const playerCs: Record<string, number> = {};
  const playerVision: Record<string, number> = {};
  let teamDelta = 0;

  for (const view of input.profile.players) {
    const laning = view.effective.laning / 120;
    const mechanics = view.effective.mechanics / 120;
    const gameSense = view.effective.gameSense / 120;
    const form = 0.9 + laning * 0.2;
    const phase = PHASE_INCOME[input.phase];
    const csFactor = CS_GOLD_WEIGHT[view.player.position] * (0.88 + laning * 0.18);
    const goldGain =
      (SIM_BALANCE.passiveGoldPerTick +
        SIM_BALANCE.csGoldPerTickBase * csFactor * (0.8 + mechanics * 0.4)) *
      phase;
    const csRaw = CS_PER_MIN[view.player.position] * tickMinutes * form * phase;
    const visionRaw =
      VISION_PER_MIN[view.player.position] * tickMinutes * (0.88 + gameSense * 0.28) * phase;
    const csGain = rollTickAmount(csRaw, random);
    const visionGain = rollTickAmount(visionRaw, random);
    playerGold[view.player.id] = goldGain;
    playerCs[view.player.id] = csGain;
    playerVision[view.player.id] = visionGain;
    teamDelta += goldGain;
  }

  const isHome = input.profile.teamId === input.homeTeamId;
  return createTimelineEvent({
    t: input.t,
    type: 'income',
    teamId: input.profile.teamId,
    payload: {
      playerGold,
      playerCs,
      playerVision,
      goldDeltaHome: isHome ? teamDelta : 0,
      goldDeltaAway: isHome ? 0 : teamDelta,
    },
    summary: `${formatClock(input.t)} · 收入｜${isHome ? '主隊' : '客隊'}線上與野區經濟 +${Math.round(teamDelta)}`,
  });
}

function rollTickAmount(raw: number, random: () => number): number {
  if (raw <= 0) {
    return 0;
  }
  const whole = Math.floor(raw);
  const fraction = raw - whole;
  return whole + (random() < fraction ? 1 : 0);
}

export function teamGold(players: PlayerRuntimeStats[], teamId: string): number {
  return players.filter((player) => player.teamId === teamId).reduce((sum, player) => sum + player.gold, 0);
}

export function sampleGold(
  t: number,
  players: PlayerRuntimeStats[],
  homeTeamId: string,
  awayTeamId: string,
): GoldSample {
  return {
    t,
    homeGold: teamGold(players, homeTeamId),
    awayGold: teamGold(players, awayTeamId),
  };
}

export function pushGoldSample(series: GoldSeries, sample: GoldSample): void {
  const last = series[series.length - 1];
  if (last && last.t === sample.t) {
    last.homeGold = sample.homeGold;
    last.awayGold = sample.awayGold;
    return;
  }
  series.push(sample);
}

export function combatPower(view: SimPlayerView, phase: PlayPhaseId): number {
  if (phase === 'early') {
    return view.effective.laning * 0.4 + view.effective.mechanics * 0.35 + view.effective.gameSense * 0.25;
  }
  if (phase === 'mid') {
    return (
      view.effective.gameSense * 0.3 +
      view.effective.mechanics * 0.25 +
      view.effective.teamfighting * 0.25 +
      view.effective.laning * 0.2
    );
  }
  return (
    view.effective.teamfighting * 0.4 +
    view.effective.gameSense * 0.25 +
    view.effective.mechanics * 0.2 +
    view.effective.consistency * 0.15
  );
}
