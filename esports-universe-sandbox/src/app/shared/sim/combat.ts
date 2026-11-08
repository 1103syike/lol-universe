import { PLAYER_POSITION_LABELS } from '../../core/models/player.model';
import { SIM_BALANCE } from './balance';
import {
  pickLanePair,
  pickSkirmishParticipantsByPresence,
  resolveFightDamage,
  type CombatIntensity,
} from './damage';
import { aliveViews } from './death-state';
import { combatPower } from './economy';
import { localesCompatible, presenceOf } from './map-presence';
import type {
  FightLane,
  KillContext,
  PlayerRuntimeStats,
  TimelineEvent,
} from './match-stats';
import type { PlayPhaseId } from './match-stats';
import type { MatchState } from './match-state';
import { liveEdgeBias } from './match-state';
import { createTimelineEvent, formatClock } from './timeline';
import type { SimPlayerView, TeamProfile } from './team-profile';

function pickWeighted<T>(items: T[], weightOf: (item: T) => number, random: () => number): T {
  const total = items.reduce((sum, item) => sum + Math.max(0.01, weightOf(item)), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= Math.max(0.01, weightOf(item));
    if (roll <= 0) {
      return item;
    }
  }
  return items[items.length - 1];
}

function teamFightScore(profile: TeamProfile, phase: PlayPhaseId, state: MatchState): number {
  const avg =
    profile.players.reduce((sum, view) => sum + combatPower(view, phase), 0) /
    Math.max(1, profile.players.length);
  const style =
    phase === 'early'
      ? profile.style.earlyAggression * 12 + profile.style.lanePressure * 10
      : phase === 'mid'
        ? profile.style.jungleMidSync * 12 + profile.style.resourceControl * 10
        : profile.style.teamfightExecute * 14 + profile.style.lateScaling * 8 + profile.style.splitPush * 6;
  const forHome = profile.teamId === state.homeTeamId;
  const chemistryBoost = (profile.chemistry - 1) * 8;
  const skill = 80 + (avg - 80) * SIM_BALANCE.playerSkillFightScale;
  return (
    skill +
    style * SIM_BALANCE.styleFightScale +
    chemistryBoost +
    liveEdgeBias(state, forHome)
  );
}

function fightChanceScale(t: number, phase: PlayPhaseId, _home: TeamProfile, _away: TeamProfile): number {
  if (t < SIM_BALANCE.minKillSec) {
    return 0;
  }
  if (phase === 'early') {
    return SIM_BALANCE.earlyKillChanceScale;
  }
  if (phase === 'mid') {
    return SIM_BALANCE.midKillChanceScale;
  }
  return 1;
}

function chooseIntensity(
  phase: PlayPhaseId,
  home: TeamProfile,
  away: TeamProfile,
  homeAlive: number,
  awayAlive: number,
  random: () => number,
  options?: { allowTeamfight?: boolean },
): CombatIntensity {
  if (Math.min(homeAlive, awayAlive) < 3) {
    return random() < 0.55 ? 'skirmish' : 'gank';
  }
  if (phase === 'early') {
    return random() < 0.68 ? 'skirmish' : 'gank';
  }
  const allowTeamfight = options?.allowTeamfight !== false;
  const teamfightBias =
    (home.style.teamfightExecute + away.style.teamfightExecute) * 0.12 +
    (phase === 'late' ? 0.08 : 0.05);
  if (
    allowTeamfight &&
    random() < SIM_BALANCE.teamfightChanceBase + teamfightBias
  ) {
    return 'teamfight';
  }
  const gankBias = phase === 'late' ? 0.48 : 0.45;
  return random() < gankBias ? 'gank' : 'skirmish';
}

function behindFightScale(goldGap: number, killGap: number): number {
  const goldAbs = Math.abs(goldGap);
  const killAbs = Math.abs(killGap);
  if (
    goldAbs >= SIM_BALANCE.behindFightGoldCrush ||
    killAbs >= SIM_BALANCE.behindFightKillCrush
  ) {
    return 0.84;
  }
  if (
    goldAbs >= SIM_BALANCE.behindFightGoldHard ||
    killAbs >= SIM_BALANCE.behindFightKillHard
  ) {
    return 0.92;
  }
  if (
    goldAbs >= SIM_BALANCE.behindFightGoldSoft ||
    killAbs >= SIM_BALANCE.behindFightKillSoft
  ) {
    return 0.97;
  }
  return 1;
}

function compressFightPressure(
  rawPressure: number,
  goldGap: number,
  killGap: number,
  draftEdge: number,
  matchupEdge: number,
): number {
  const goldAbs = Math.abs(goldGap);
  const killAbs = Math.abs(killGap);
  let compress: number = SIM_BALANCE.fightPressureCompressClose;
  if (
    goldAbs >= SIM_BALANCE.stompGoldCrush ||
    killAbs >= SIM_BALANCE.behindFightKillCrush
  ) {
    compress = 1;
  } else if (
    goldAbs >= SIM_BALANCE.stompGoldHard ||
    killAbs >= SIM_BALANCE.behindFightKillHard
  ) {
    compress = SIM_BALANCE.fightPressureCompressHard;
  } else if (
    goldAbs >= SIM_BALANCE.stompGoldSoft ||
    killAbs >= SIM_BALANCE.behindFightKillSoft
  ) {
    compress = SIM_BALANCE.fightPressureCompressSoft;
  }
  const intentionalStomp =
    Math.abs(draftEdge) >= 3.0 || Math.abs(matchupEdge) >= 1.2;
  if (intentionalStomp) {
    compress = Math.max(compress, 0.72);
  }
  return 0.5 + (rawPressure - 0.5) * compress;
}

function deriveKillContext(
  intensity: CombatIntensity,
  killer: SimPlayerView,
  victim: SimPlayerView,
  assists: SimPlayerView[],
): { context: KillContext; fightLane?: FightLane } {
  if (intensity === 'teamfight') {
    return { context: 'teamfight', fightLane: 'river' };
  }
  const victimLane = victim.player.position === 'SUPPORT' ? 'BOT' : victim.player.position;
  const fightLane: FightLane =
    victimLane === 'TOP' ? 'top' : victimLane === 'MID' ? 'mid' : victimLane === 'BOT' ? 'bot' : 'river';
  const junglerInvolved =
    killer.player.position === 'JUNGLE' ||
    assists.some((view) => view.player.position === 'JUNGLE');
  if (intensity === 'gank' || (intensity === 'skirmish' && junglerInvolved)) {
    return { context: 'gank', fightLane };
  }
  const killerLane = killer.player.position === 'SUPPORT' ? 'BOT' : killer.player.position;
  const supportHelp = assists.some((view) => view.player.position === 'SUPPORT');
  if (killerLane === victimLane && (killerLane === 'TOP' || killerLane === 'MID' || killerLane === 'BOT')) {
    return {
      context: 'lane',
      fightLane: killerLane === 'TOP' ? 'top' : killerLane === 'MID' ? 'mid' : 'bot',
    };
  }
  if (supportHelp && (killer.player.position === 'BOT' || killer.player.position === 'SUPPORT')) {
    return { context: 'lane', fightLane: 'bot' };
  }
  return { context: 'lane', fightLane };
}

function describeKillSummary(input: {
  t: number;
  isFirstBlood: boolean;
  killer: PlayerRuntimeStats;
  victim: PlayerRuntimeStats;
  killerView: SimPlayerView;
  victimView: SimPlayerView;
  assists: SimPlayerView[];
  context: KillContext;
}): string {
  const killerRole = PLAYER_POSITION_LABELS[input.killerView.player.position];
  const victimRole = PLAYER_POSITION_LABELS[input.victimView.player.position];
  const support = input.assists.find((view) => view.player.position === 'SUPPORT');
  const prefix = `${formatClock(input.t)} · ${input.isFirstBlood ? 'First Blood' : '擊殺'}`;
  if (input.context === 'lane' && support && input.killerView.player.position === 'BOT') {
    return `${prefix}｜${killerRole} ${input.killer.gamertag} 在輔助 ${support.player.gamertag} 協助下，線殺 ${victimRole} ${input.victim.gamertag}`;
  }
  if (input.context === 'lane') {
    return `${prefix}｜${killerRole} ${input.killer.gamertag} 線殺 ${victimRole} ${input.victim.gamertag}`;
  }
  if (input.context === 'gank') {
    const jungler =
      input.assists.find((view) => view.player.position === 'JUNGLE') ??
      (input.killerView.player.position === 'JUNGLE' ? input.killerView : null);
    const laneLabel =
      input.victimView.player.position === 'TOP'
        ? '上路'
        : input.victimView.player.position === 'MID'
          ? '中路'
          : input.victimView.player.position === 'BOT' || input.victimView.player.position === 'SUPPORT'
            ? '下路'
            : '邊線';
    const junglerName = jungler ? `打野 ${jungler.player.gamertag}` : '打野';
    if (input.killerView.player.position === 'JUNGLE') {
      return `${prefix}｜${junglerName} 抓${laneLabel}，擊殺 ${victimRole} ${input.victim.gamertag}`;
    }
    return `${prefix}｜${junglerName} 抓${laneLabel}，${killerRole} ${input.killer.gamertag} 配合擊殺 ${victimRole} ${input.victim.gamertag}`;
  }
  if (input.context === 'dragon') {
    return `${prefix}｜小龍團中，${killerRole} ${input.killer.gamertag} 擊殺 ${victimRole} ${input.victim.gamertag}`;
  }
  if (input.context === 'baron') {
    return `${prefix}｜巴龍團中，${killerRole} ${input.killer.gamertag} 擊殺 ${victimRole} ${input.victim.gamertag}`;
  }
  if (input.context === 'elder') {
    return `${prefix}｜遠古龍團中，${killerRole} ${input.killer.gamertag} 擊殺 ${victimRole} ${input.victim.gamertag}`;
  }
  if (input.context === 'teamfight') {
    return `${prefix}｜團戰中，${killerRole} ${input.killer.gamertag} 擊殺 ${victimRole} ${input.victim.gamertag}`;
  }
  return `${prefix}｜${killerRole} ${input.killer.gamertag} 擊殺 ${victimRole} ${input.victim.gamertag}`;
}

function buildCombatEvent(input: {
  t: number;
  intensity: CombatIntensity;
  homeWins: boolean;
  damageByPlayer: Record<string, number>;
  homeTotal: number;
  awayTotal: number;
  homeTeamId: string;
  awayTeamId: string;
}): TimelineEvent {
  const label =
    input.intensity === 'poke'
      ? '對線換血'
      : input.intensity === 'gank'
        ? 'Gank 交戰'
        : input.intensity === 'teamfight'
          ? '團戰輸出'
          : '小規模交戰';
  return createTimelineEvent({
    t: input.t,
    type: 'combat',
    teamId: input.homeWins ? input.homeTeamId : input.awayTeamId,
    payload: {
      damageByPlayer: input.damageByPlayer,
      goldDeltaHome: 0,
      goldDeltaAway: 0,
    },
    summary: `${formatClock(input.t)} · ${label}｜主隊 ${Math.round(input.homeTotal)} / 客隊 ${Math.round(input.awayTotal)}`,
  });
}

export function maybeLanePoke(input: {
  t: number;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  state: MatchState;
  random: () => number;
}): TimelineEvent | null {
  if (input.t < SIM_BALANCE.firstWaveSec) {
    return null;
  }
  const pokeChance =
    SIM_BALANCE.lanePokeChance *
    (0.7 + (input.home.style.lanePressure + input.away.style.lanePressure) * 0.35);
  if (input.random() > pokeChance) {
    return null;
  }
  const homeAlive = aliveViews(input.home, input.players, input.t);
  const awayAlive = aliveViews(input.away, input.players, input.t);
  if (homeAlive.length === 0 || awayAlive.length === 0) {
    return null;
  }
  const pair = pickLanePair(homeAlive, awayAlive, input.random);
  if (!pair) {
    return null;
  }
  const homeScore = teamFightScore(input.home, input.phase, input.state);
  const awayScore = teamFightScore(input.away, input.phase, input.state);
  const pressure = 1 / (1 + Math.exp(-(homeScore - awayScore) / 18));
  const fight = resolveFightDamage({
    phase: input.phase,
    intensity: 'poke',
    homeParticipants: pair.home,
    awayParticipants: pair.away,
    homePressure: pressure,
    random: input.random,
  });
  return buildCombatEvent({
    t: input.t,
    intensity: 'poke',
    homeWins: fight.homeTotal >= fight.awayTotal,
    damageByPlayer: fight.damageByPlayer,
    homeTotal: fight.homeTotal,
    awayTotal: fight.awayTotal,
    homeTeamId: input.home.teamId,
    awayTeamId: input.away.teamId,
  });
}

export function maybeResolveSkirmish(input: {
  t: number;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  state: MatchState;
  random: () => number;
  firstBloodTaken: boolean;
}): { events: TimelineEvent[]; firstBloodTaken: boolean; teamfightAt: number | null } {
  if (input.t < SIM_BALANCE.minKillSec) {
    return { events: [], firstBloodTaken: input.firstBloodTaken, teamfightAt: null };
  }
  const homeAliveViews = aliveViews(input.home, input.players, input.t);
  const awayAliveViews = aliveViews(input.away, input.players, input.t);
  if (homeAliveViews.length === 0 || awayAliveViews.length === 0) {
    return { events: [], firstBloodTaken: input.firstBloodTaken, teamfightAt: null };
  }

  const homeScore = teamFightScore(input.home, input.phase, input.state);
  const awayScore = teamFightScore(input.away, input.phase, input.state);
  const manAdvantage =
    (homeAliveViews.length - awayAliveViews.length) * 1.6;
  const edge = homeScore - awayScore + manAdvantage;
  const rawPressure = 1 / (1 + Math.exp(-edge / 32));
  const pressure = compressFightPressure(
    rawPressure,
    input.state.goldGap,
    input.state.killGap,
    input.state.draftEdge,
    input.state.matchupEdge,
  );
  const aggression =
    (input.home.style.earlyAggression + input.away.style.earlyAggression) * 0.08 +
    (input.home.style.teamfightExecute + input.away.style.teamfightExecute) * 0.05;
  const imbalance = Math.abs(pressure - 0.5);
  const closenessBonus = Math.max(0, 0.12 - imbalance * 0.22);
  const onTeamfightCooldown =
    input.state.lastTeamfightAt !== null &&
    input.t - input.state.lastTeamfightAt < SIM_BALANCE.teamfightEngageCooldownSec;
  let fightChance =
    (SIM_BALANCE.killChanceBase + closenessBonus + aggression) *
    fightChanceScale(input.t, input.phase, input.home, input.away);
  fightChance *= behindFightScale(input.state.goldGap, input.state.killGap);
  if (input.phase === 'late') {
    fightChance *= SIM_BALANCE.lateFightChanceScale;
  }
  if (onTeamfightCooldown) {
    fightChance *= SIM_BALANCE.teamfightCooldownFightScale;
  }

  if (input.random() > fightChance) {
    return { events: [], firstBloodTaken: input.firstBloodTaken, teamfightAt: null };
  }

  const intensity = chooseIntensity(
    input.phase,
    input.home,
    input.away,
    homeAliveViews.length,
    awayAliveViews.length,
    input.random,
    { allowTeamfight: !onTeamfightCooldown },
  );
  const participants = pickSkirmishParticipantsByPresence({
    home: homeAliveViews,
    away: awayAliveViews,
    presence: input.state.presence,
    modes: input.state.modes,
    intensity,
    random: input.random,
  });
  if (participants.home.length === 0 || participants.away.length === 0) {
    return { events: [], firstBloodTaken: input.firstBloodTaken, teamfightAt: null };
  }
  const fightLane = participants.lane;
  const combatOnlyRoll =
    intensity === 'teamfight'
      ? SIM_BALANCE.combatOnlyChance * SIM_BALANCE.teamfightCombatOnlyScale
      : intensity === 'gank'
        ? SIM_BALANCE.combatOnlyChance * SIM_BALANCE.gankCombatOnlyScale
        : SIM_BALANCE.combatOnlyChance;
  const combatOnly = input.random() < combatOnlyRoll;
  const upsetNoise =
    (input.random() - 0.5) *
    2 *
    (SIM_BALANCE.upsetNoiseScale +
      Math.min(0.1, Math.abs(input.state.draftEdge) * SIM_BALANCE.upsetNoiseDraftBonus));
  const homeWins = input.random() < Math.min(0.82, Math.max(0.18, pressure + upsetNoise));
  const damagePressure = Math.min(
    0.78,
    Math.max(0.22, pressure * 0.55 + (homeWins ? 0.62 : 0.38) * 0.45),
  );
  const fight = resolveFightDamage({
    phase: input.phase,
    intensity,
    homeParticipants: participants.home,
    awayParticipants: participants.away,
    homePressure: damagePressure,
    random: input.random,
  });
  const damageScale = combatOnly ? SIM_BALANCE.combatOnlyDamageScale : 1;
  const scaledDamageByPlayer: Record<string, number> = {};
  for (const [playerId, amount] of Object.entries(fight.damageByPlayer)) {
    scaledDamageByPlayer[playerId] = Math.round(amount * damageScale);
  }
  const homeTotal = Math.round(fight.homeTotal * damageScale);
  const awayTotal = Math.round(fight.awayTotal * damageScale);
  const winner = homeWins ? input.home : input.away;
  const loser = homeWins ? input.away : input.home;
  const events: TimelineEvent[] = [
    buildCombatEvent({
      t: input.t,
      intensity: combatOnly ? 'poke' : intensity,
      homeWins,
      damageByPlayer: scaledDamageByPlayer,
      homeTotal,
      awayTotal,
      homeTeamId: input.home.teamId,
      awayTeamId: input.away.teamId,
    }),
  ];

  if (intensity === 'teamfight' && !combatOnly) {
    events.push(
      createTimelineEvent({
        t: input.t,
        type: 'teamfight',
        teamId: winner.teamId,
        payload: { marker: 'K' },
        summary: `${formatClock(input.t)} · 關鍵團戰｜${homeWins ? '主隊' : '客隊'}打出團戰勝場`,
      }),
    );
  }

  if (combatOnly) {
    return {
      events,
      firstBloodTaken: input.firstBloodTaken,
      teamfightAt: intensity === 'teamfight' ? input.t : null,
    };
  }

  const winnerParts =
    winner.teamId === input.home.teamId ? participants.home : participants.away;
  const loserParts =
    loser.teamId === input.home.teamId ? participants.home : participants.away;
  const goldLeadAbs = Math.abs(input.state.goldGap);
  const rawKillCount =
    intensity === 'teamfight'
      ? 1 +
        Math.floor(input.random() * 3) +
        (goldLeadAbs >= SIM_BALANCE.stompGoldHard && input.random() < 0.55 ? 1 : 0)
      : intensity === 'gank' && loserParts.length >= 2 && input.random() < 0.22
        ? 2
        : 1;
  const killCount = Math.min(rawKillCount, Math.max(1, loserParts.length));
  let firstBloodTaken = input.firstBloodTaken;
  const damageOf = (playerId: string): number => scaledDamageByPlayer[playerId] ?? 0;
  const participateWeight = (view: SimPlayerView): number =>
    0.2 + Math.sqrt(Math.max(0, damageOf(view.player.id))) * 0.85 + combatPower(view, input.phase) * 0.25;
  const killCreditWeight = (view: SimPlayerView): number => {
    let weight = participateWeight(view);
    if (intensity === 'gank') {
      const position = view.player.position;
      if (position === 'JUNGLE') {
        weight *= 0.68;
      } else if (fightLane === 'bot' && position === 'BOT') {
        weight *= 1.42;
      } else if (fightLane === 'bot' && position === 'SUPPORT') {
        weight *= 1.08;
      } else if (
        (fightLane === 'top' && position === 'TOP') ||
        (fightLane === 'mid' && position === 'MID')
      ) {
        weight *= 1.38;
      }
    } else if (intensity === 'teamfight') {
      const roleBias: Record<SimPlayerView['player']['position'], number> = {
        TOP: 0.82,
        JUNGLE: 0.58,
        MID: 1.36,
        BOT: 1.62,
        SUPPORT: 0.28,
      };
      weight *= roleBias[view.player.position];
    } else {
      const roleBias: Record<SimPlayerView['player']['position'], number> = {
        TOP: 1.02,
        JUNGLE: 0.78,
        MID: 1.16,
        BOT: 1.28,
        SUPPORT: 0.38,
      };
      weight *= roleBias[view.player.position];
    }
    return weight;
  };
  const deathRiskWeight = (view: SimPlayerView): number => {
    const runtime = input.players.find((player) => player.playerId === view.player.id);
    const priorDeaths = runtime?.deaths ?? 0;
    let weight =
      0.4 +
      (1.2 - view.effective.consistency / 200) * 0.85 +
      Math.sqrt(Math.max(0, damageOf(view.player.id))) * 0.28;
    const position = view.player.position;
    if (intensity === 'teamfight') {
      const roleRisk: Record<SimPlayerView['player']['position'], number> = {
        TOP: 0.82,
        JUNGLE: 0.95,
        MID: 1.08,
        BOT: 1.35,
        SUPPORT: 1.18,
      };
      weight *= roleRisk[position];
    } else if (intensity === 'gank') {
      if (position === 'JUNGLE') {
        weight *= 0.5;
      } else if (fightLane === 'bot' && position === 'BOT') {
        weight *= 1.5;
      } else if (fightLane === 'bot' && position === 'SUPPORT') {
        weight *= 1.28;
      } else if (
        (fightLane === 'top' && position === 'TOP') ||
        (fightLane === 'mid' && position === 'MID')
      ) {
        weight *= 1.48;
      }
    } else {
      const skirmishRisk: Record<SimPlayerView['player']['position'], number> = {
        TOP: 1.02,
        JUNGLE: 0.88,
        MID: 1.14,
        BOT: 1.28,
        SUPPORT: 1.2,
      };
      weight *= skirmishRisk[position];
    }
    const victimIsHome = view.player.teamId === input.home.teamId;
    const goldGap = input.state.goldGap;
    const ahead =
      victimIsHome ? goldGap >= SIM_BALANCE.stompGoldHard : goldGap <= -SIM_BALANCE.stompGoldHard;
    const behind =
      victimIsHome ? goldGap <= -SIM_BALANCE.stompGoldHard : goldGap >= SIM_BALANCE.stompGoldHard;
    const softAhead =
      victimIsHome ? goldGap >= SIM_BALANCE.stompGoldSoft : goldGap <= -SIM_BALANCE.stompGoldSoft;
    const softBehind =
      victimIsHome ? goldGap <= -SIM_BALANCE.stompGoldSoft : goldGap >= SIM_BALANCE.stompGoldSoft;
    if (ahead) {
      weight *= 0.5;
    } else if (behind) {
      weight *= 1.28;
    } else if (softAhead) {
      weight *= 0.82;
    } else if (softBehind) {
      weight *= 1.12;
    }
    weight *= 1 / (1 + priorDeaths * 0.16);
    return Math.max(0.05, weight);
  };

  const usedVictims = new Set<string>();
  const laneRoles = (lane: FightLane | undefined): Array<SimPlayerView['player']['position']> => {
    if (lane === 'top') return ['TOP'];
    if (lane === 'mid') return ['MID'];
    if (lane === 'bot') return ['BOT', 'SUPPORT'];
    return ['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'];
  };
  const hotspotLocale =
    input.state.presence.find((row) =>
      [...winnerParts, ...loserParts].some((view) => view.player.id === row.playerId),
    )?.locale ?? null;
  const byLocale = (view: SimPlayerView): boolean => {
    if (!hotspotLocale) {
      return true;
    }
    const row = presenceOf(input.state.presence, view.player.id);
    if (!row) {
      return true;
    }
    return localesCompatible(row.locale, hotspotLocale);
  };

  for (let index = 0; index < killCount; index += 1) {
    const rawKillerPool =
      winnerParts.length > 0
        ? winnerParts
        : aliveViews(winner, input.players, input.t);
    const rawVictimPool =
      loserParts.length > 0
        ? loserParts
        : aliveViews(loser, input.players, input.t);
    if (rawVictimPool.length === 0 || rawKillerPool.length === 0) {
      break;
    }
    const roles = laneRoles(fightLane);
    const useLocaleGate =
      input.state.modes.transition || input.state.modes.objective || input.state.modes.siege;
    const localKillers =
      intensity === 'teamfight'
        ? rawKillerPool.filter((view) => (useLocaleGate ? byLocale(view) : true))
        : intensity === 'gank'
          ? rawKillerPool.filter((view) => {
              const isJungler = view.player.position === 'JUNGLE';
              const isLaner = roles.includes(view.player.position);
              if (!isJungler && !isLaner) {
                return false;
              }
              if (isJungler) {
                return true;
              }
              return useLocaleGate ? byLocale(view) : true;
            })
          : rawKillerPool.filter(
              (view) =>
                roles.includes(view.player.position) && (useLocaleGate ? byLocale(view) : true),
            );
    const localVictims =
      intensity === 'teamfight'
        ? rawVictimPool.filter((view) => {
            if (
              view.player.position === 'BOT' ||
              view.player.position === 'SUPPORT'
            ) {
              return true;
            }
            return useLocaleGate ? byLocale(view) : true;
          })
        : rawVictimPool.filter(
            (view) =>
              roles.includes(view.player.position) && (useLocaleGate ? byLocale(view) : true),
          );
    const killerPool = localKillers.length > 0 ? localKillers : rawKillerPool;
    const victimPool = (localVictims.length > 0 ? localVictims : rawVictimPool).filter(
      (view) => !usedVictims.has(view.player.id),
    );
    if (victimPool.length === 0) {
      break;
    }

    const killerView = pickWeighted(killerPool, (view) => killCreditWeight(view), input.random);
    const victimView = pickWeighted(victimPool, (view) => deathRiskWeight(view), input.random);
    usedVictims.add(victimView.player.id);

    const assistPool = killerPool.filter((view) => view.player.id !== killerView.player.id);
    const damageAssists = assistPool
      .filter((view) => damageOf(view.player.id) > 0)
      .sort((left, right) => damageOf(right.player.id) - damageOf(left.player.id));
    const softAssistCount =
      intensity === 'teamfight'
        ? damageAssists.length
        : Math.min(
            damageAssists.length,
            Math.max(1, 1 + Math.floor(input.random() * 2)),
          );
    const assists = damageAssists.slice(0, softAssistCount);
    const ensureAssist = (position: SimPlayerView['player']['position']): void => {
      if (assists.some((view) => view.player.position === position)) {
        return;
      }
      const candidate = assistPool.find((view) => view.player.position === position);
      if (candidate) {
        assists.unshift(candidate);
      }
    };
    if (intensity === 'teamfight') {
      ensureAssist('SUPPORT');
      ensureAssist('JUNGLE');
    } else if (intensity === 'gank') {
      ensureAssist('JUNGLE');
      if (fightLane === 'bot') {
        ensureAssist('SUPPORT');
      }
    } else if (
      fightLane === 'bot' &&
      (killerView.player.position === 'BOT' || killerView.player.position === 'SUPPORT')
    ) {
      ensureAssist('SUPPORT');
    }
    const mapGrouped =
      input.phase === 'late' ||
      input.state.modes.objective ||
      input.state.modes.siege ||
      goldLeadAbs >= SIM_BALANCE.stompGoldSoft;
    if (mapGrouped) {
      const winnerAlive = aliveViews(winner, input.players, input.t);
      for (const position of ['SUPPORT', 'JUNGLE'] as const) {
        if (assists.some((view) => view.player.position === position)) {
          continue;
        }
        if (killerView.player.position === position) {
          continue;
        }
        const chance =
          position === 'SUPPORT' ? (intensity === 'teamfight' ? 1 : 0.72) : 0.55;
        if (input.random() >= chance) {
          continue;
        }
        const candidate = winnerAlive.find((view) => view.player.position === position);
        if (candidate) {
          assists.unshift(candidate);
        }
      }
    }

    const killer = input.players.find((player) => player.playerId === killerView.player.id);
    const victim = input.players.find((player) => player.playerId === victimView.player.id);
    if (!killer || !victim) {
      continue;
    }

    const isFirstBlood = !firstBloodTaken && index === 0;
    if (isFirstBlood) {
      firstBloodTaken = true;
    }

    const derived = deriveKillContext(intensity, killerView, victimView, assists);
    const killGold =
      SIM_BALANCE.killGoldBase * (isFirstBlood ? SIM_BALANCE.firstBloodGoldMult : 1);
    const assistGoldTotal = killGold * SIM_BALANCE.assistGoldShare;
    const assistGoldByPlayer: Record<string, number> = {};
    if (assists.length > 0) {
      const weightSum = assists.reduce((sum, view) => sum + Math.max(1, damageOf(view.player.id)), 0);
      for (const assist of assists) {
        assistGoldByPlayer[assist.player.id] =
          (assistGoldTotal * Math.max(1, damageOf(assist.player.id))) / weightSum;
      }
    }

    const assistSum = Object.values(assistGoldByPlayer).reduce((sum, value) => sum + value, 0);
    const transferred = killGold + assistSum;

    events.push(
      createTimelineEvent({
        t: input.t + index,
        type: isFirstBlood ? 'first-blood' : 'kill',
        teamId: winner.teamId,
        actorPlayerId: killer.playerId,
        assistPlayerIds: assists.map((view) => view.player.id),
        victimPlayerId: victim.playerId,
        victimTeamId: loser.teamId,
        payload: {
          killGold,
          assistGoldByPlayer,
          goldDeltaHome: winner.teamId === input.home.teamId ? transferred : 0,
          goldDeltaAway: winner.teamId === input.away.teamId ? transferred : 0,
          killContext: derived.context,
          fightLane: derived.fightLane ?? fightLane,
          intensity,
        },
        summary: describeKillSummary({
          t: input.t + index,
          isFirstBlood,
          killer,
          victim,
          killerView,
          victimView,
          assists,
          context: derived.context,
        }),
      }),
    );
  }

  return {
    events,
    firstBloodTaken,
    teamfightAt: intensity === 'teamfight' ? input.t : null,
  };
}

export function maybeMistakeKill(input: {
  t: number;
  phase: PlayPhaseId;
  home: TeamProfile;
  away: TeamProfile;
  players: PlayerRuntimeStats[];
  state: MatchState;
  random: () => number;
}): TimelineEvent[] {
  if (input.t < SIM_BALANCE.minKillSec) {
    return [];
  }
  const sides = [
    { profile: input.home, chance: SIM_BALANCE.mistakeChanceBase },
    { profile: input.away, chance: SIM_BALANCE.mistakeChanceBase },
  ];
  for (const side of sides) {
    const consistency =
      side.profile.players.reduce((sum, view) => sum + view.effective.consistency, 0) /
      Math.max(1, side.profile.players.length);
    const behind =
      side.profile.teamId === input.home.teamId
        ? input.state.goldGap <= -SIM_BALANCE.stompGoldHard
        : input.state.goldGap >= SIM_BALANCE.stompGoldHard;
    const chance =
      side.chance +
      (consistency < 72 ? SIM_BALANCE.mistakeChanceLowConsistency : 0) +
      (behind ? 0.015 : 0);
    if (input.random() > chance) {
      continue;
    }
    const aliveSide = aliveViews(side.profile, input.players, input.t);
    if (aliveSide.length === 0) {
      continue;
    }
    const culprit = [...aliveSide].sort(
      (left, right) => left.effective.consistency - right.effective.consistency,
    )[0];
    const beneficiary = side.profile.teamId === input.home.teamId ? input.away : input.home;
    const aliveBeneficiary = aliveViews(beneficiary, input.players, input.t);
    if (aliveBeneficiary.length === 0) {
      continue;
    }
    const isJungleVictim = culprit.player.position === 'JUNGLE';
    const lanePos = culprit.player.position === 'SUPPORT' ? 'BOT' : culprit.player.position;
    const punishPool = aliveBeneficiary.filter((view) => {
      if (isJungleVictim) {
        return (
          view.player.position === 'JUNGLE' ||
          view.player.position === 'MID' ||
          view.player.position === 'SUPPORT'
        );
      }
      if (view.player.position === 'JUNGLE') {
        return true;
      }
      if (lanePos === 'BOT') {
        return view.player.position === 'BOT' || view.player.position === 'SUPPORT';
      }
      return view.player.position === lanePos;
    });
    const pool = punishPool.length > 0 ? punishPool : aliveBeneficiary;
    const punisher = pickWeighted(pool, (view) => combatPower(view, input.phase), input.random);
    const victim = input.players.find((player) => player.playerId === culprit.player.id);
    const killer = input.players.find((player) => player.playerId === punisher.player.id);
    if (!victim || !killer) {
      return [];
    }
    const fight = resolveFightDamage({
      phase: input.phase,
      intensity: 'skirmish',
      homeParticipants:
        beneficiary.teamId === input.home.teamId
          ? [punisher]
          : [culprit],
      awayParticipants:
        beneficiary.teamId === input.home.teamId
          ? [culprit]
          : [punisher],
      homePressure: beneficiary.teamId === input.home.teamId ? 0.72 : 0.28,
      random: input.random,
    });
    const laneLabel =
      lanePos === 'TOP' ? '上路' : lanePos === 'MID' ? '中路' : lanePos === 'BOT' ? '下路' : '線上';
    let how: string;
    if (isJungleVictim && punisher.player.position === 'JUNGLE') {
      how =
        input.random() < 0.5
          ? `清野時視野失位，遭敵方打野 ${killer.gamertag} 入侵擊殺`
          : `自家野區被入侵，被敵方打野 ${killer.gamertag} 反打擊殺`;
    } else if (isJungleVictim) {
      how = `清野路線過於深入，被遊走的 ${PLAYER_POSITION_LABELS[punisher.player.position]} ${killer.gamertag} 抓掉`;
    } else if (punisher.player.position === 'JUNGLE') {
      how = `在${laneLabel}推線過深，遭敵方打野 ${killer.gamertag} 抓掉`;
    } else {
      how = `在${laneLabel}被對位 ${PLAYER_POSITION_LABELS[punisher.player.position]} ${killer.gamertag} 懲罰`;
    }
    return [
      buildCombatEvent({
        t: input.t,
        intensity: 'skirmish',
        homeWins: fight.homeTotal >= fight.awayTotal,
        damageByPlayer: fight.damageByPlayer,
        homeTotal: fight.homeTotal,
        awayTotal: fight.awayTotal,
        homeTeamId: input.home.teamId,
        awayTeamId: input.away.teamId,
      }),
      createTimelineEvent({
        t: input.t,
        type: 'mistake',
        teamId: beneficiary.teamId,
        actorPlayerId: killer.playerId,
        victimPlayerId: victim.playerId,
        victimTeamId: side.profile.teamId,
        payload: {
          killGold: SIM_BALANCE.killGoldBase,
          goldDeltaHome: beneficiary.teamId === input.home.teamId ? SIM_BALANCE.killGoldBase : 0,
          goldDeltaAway: beneficiary.teamId === input.away.teamId ? SIM_BALANCE.killGoldBase : 0,
          marker: 'K',
          killContext: 'mistake',
          fightLane: isJungleVictim
            ? 'river'
            : lanePos === 'TOP'
              ? 'top'
              : lanePos === 'MID'
                ? 'mid'
                : 'bot',
          intensity: 'skirmish',
        },
        summary: `${formatClock(input.t)} · 重大失誤｜${PLAYER_POSITION_LABELS[culprit.player.position]} ${victim.gamertag} 失誤，${how}`,
      }),
    ];
  }
  return [];
}
