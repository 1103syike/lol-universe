import type { PlayerPosition } from '../../core/models/player.model';
import { SIM_BALANCE } from './balance';
import { combatPower } from './economy';
import {
  localeGroup,
  localesCompatible,
  presenceOf,
  type MapLocale,
  type MapModeFlags,
  type PlayerPresence,
} from './map-presence';
import type { FightLane, PlayPhaseId } from './match-stats';
import type { SimPlayerView } from './team-profile';

export type CombatIntensity = 'poke' | 'skirmish' | 'gank' | 'teamfight';

const ROLE_DAMAGE_WEIGHT: Record<PlayerPosition, number> = {
  TOP: 0.95,
  JUNGLE: 1.05,
  MID: 1.2,
  BOT: 1.35,
  SUPPORT: 0.55,
};

const PHASE_DAMAGE_SCALE: Record<PlayPhaseId, number> = {
  early: 0.72,
  mid: 1,
  late: 1.28,
};

const INTENSITY_POOL: Record<CombatIntensity, { min: number; max: number }> = {
  poke: { min: 160, max: 380 },
  skirmish: { min: 3800, max: 7200 },
  gank: { min: 3200, max: 5800 },
  teamfight: { min: 14000, max: 26000 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function outputWeight(view: SimPlayerView, phase: PlayPhaseId, random: () => number): number {
  const skill =
    combatPower(view, phase) * 0.55 +
    view.effective.mechanics * 0.25 +
    view.effective.teamfighting * 0.2;
  const role = ROLE_DAMAGE_WEIGHT[view.player.position];
  return Math.max(0.08, skill * role * (0.75 + random() * 0.5));
}

function splitPool(
  participants: SimPlayerView[],
  pool: number,
  phase: PlayPhaseId,
  random: () => number,
): Record<string, number> {
  if (participants.length === 0 || pool <= 0) {
    return {};
  }
  const weights = participants.map((view) => outputWeight(view, phase, random));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const result: Record<string, number> = {};
  let assigned = 0;
  for (let index = 0; index < participants.length; index += 1) {
    const share =
      index === participants.length - 1
        ? Math.max(0, pool - assigned)
        : Math.round((pool * weights[index]) / total);
    assigned += share;
    result[participants[index].player.id] = share;
  }
  return result;
}

export function resolveFightDamage(input: {
  phase: PlayPhaseId;
  intensity: CombatIntensity;
  homeParticipants: SimPlayerView[];
  awayParticipants: SimPlayerView[];
  homePressure: number;
  random: () => number;
}): {
  damageByPlayer: Record<string, number>;
  homeTotal: number;
  awayTotal: number;
} {
  const band = INTENSITY_POOL[input.intensity];
  const base =
    (band.min + input.random() * (band.max - band.min)) * PHASE_DAMAGE_SCALE[input.phase];
  const homeShare = clamp(
    0.5 + (input.homePressure - 0.5) * 0.36 + (input.random() - 0.5) * 0.06,
    SIM_BALANCE.damageLoserFloor,
    1 - SIM_BALANCE.damageLoserFloor,
  );
  const homeTotal = Math.round(base * homeShare);
  const awayTotal = Math.round(base * (1 - homeShare));
  return {
    damageByPlayer: {
      ...splitPool(input.homeParticipants, homeTotal, input.phase, input.random),
      ...splitPool(input.awayParticipants, awayTotal, input.phase, input.random),
    },
    homeTotal,
    awayTotal,
  };
}

export function pickLanePair(
  home: SimPlayerView[],
  away: SimPlayerView[],
  random: () => number,
): { home: SimPlayerView[]; away: SimPlayerView[] } | null {
  const lanes: PlayerPosition[] = ['TOP', 'MID', 'BOT'];
  const lane = lanes[Math.floor(random() * lanes.length)];
  const homeCore = home.find((view) => view.player.position === lane);
  const awayCore = away.find((view) => view.player.position === lane);
  if (!homeCore || !awayCore) {
    return null;
  }
  const homeSide = [homeCore];
  const awaySide = [awayCore];
  if (lane === 'BOT') {
    const homeSup = home.find((view) => view.player.position === 'SUPPORT');
    const awaySup = away.find((view) => view.player.position === 'SUPPORT');
    if (homeSup) homeSide.push(homeSup);
    if (awaySup) awaySide.push(awaySup);
  }
  if (random() < 0.28) {
    const homeJg = home.find((view) => view.player.position === 'JUNGLE');
    const awayJg = away.find((view) => view.player.position === 'JUNGLE');
    if (homeJg && random() < 0.5) homeSide.push(homeJg);
    if (awayJg && random() < 0.5) awaySide.push(awayJg);
  }
  return { home: homeSide, away: awaySide };
}

export function pickGankParticipants(
  home: SimPlayerView[],
  away: SimPlayerView[],
  random: () => number,
): { home: SimPlayerView[]; away: SimPlayerView[]; lane: 'top' | 'mid' | 'bot' } {
  const lanes: Array<'top' | 'mid' | 'bot'> = ['top', 'mid', 'bot'];
  const lane = lanes[Math.floor(random() * lanes.length)];
  const lanePos = lane === 'top' ? 'TOP' : lane === 'mid' ? 'MID' : 'BOT';
  const homeLane = home.find((view) => view.player.position === lanePos);
  const awayLane = away.find((view) => view.player.position === lanePos);
  const homeJg = home.find((view) => view.player.position === 'JUNGLE');
  const awayJg = away.find((view) => view.player.position === 'JUNGLE');
  const homeSide = [homeLane, homeJg].filter(Boolean) as SimPlayerView[];
  const awaySide = [awayLane, awayJg].filter(Boolean) as SimPlayerView[];
  if (lane === 'bot') {
    const homeSup = home.find((view) => view.player.position === 'SUPPORT');
    const awaySup = away.find((view) => view.player.position === 'SUPPORT');
    if (homeSup) homeSide.push(homeSup);
    if (awaySup) awaySide.push(awaySup);
  }
  return {
    home: homeSide.length > 0 ? homeSide : home.slice(0, 2),
    away: awaySide.length > 0 ? awaySide : away.slice(0, 2),
    lane,
  };
}

export function pickSkirmishParticipants(
  home: SimPlayerView[],
  away: SimPlayerView[],
  intensity: CombatIntensity,
  random: () => number,
): { home: SimPlayerView[]; away: SimPlayerView[]; lane?: 'top' | 'mid' | 'bot' } {
  if (intensity === 'teamfight') {
    return { home: [...home], away: [...away], lane: undefined };
  }
  if (intensity === 'gank') {
    return pickGankParticipants(home, away, random);
  }
  const pair = pickLanePair(home, away, random);
  if (pair) {
    const lanePos = pair.home[0]?.player.position;
    const lane =
      lanePos === 'TOP' ? 'top' : lanePos === 'MID' ? 'mid' : lanePos === 'BOT' ? 'bot' : undefined;
    return { ...pair, lane };
  }
  return { home: home.slice(0, 2), away: away.slice(0, 2), lane: 'mid' };
}

function fightLaneFromLocale(locale: MapLocale): FightLane {
  const group = localeGroup(locale);
  if (group === 'top') return 'top';
  if (group === 'mid') return 'mid';
  if (group === 'bot') return 'bot';
  return 'river';
}

function viewsAtCompatibleLocale(
  views: SimPlayerView[],
  presence: PlayerPresence[],
  hotspot: MapLocale,
): SimPlayerView[] {
  return views.filter((view) => {
    const row = presenceOf(presence, view.player.id);
    if (!row) {
      return true;
    }
    return localesCompatible(row.locale, hotspot);
  });
}

function pickHotspotLocale(presence: PlayerPresence[], random: () => number): MapLocale {
  const counts = new Map<MapLocale, number>();
  for (const row of presence) {
    counts.set(row.locale, (counts.get(row.locale) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  if (ranked.length === 0) {
    return 'mid-lane';
  }
  const top = ranked.slice(0, Math.min(3, ranked.length));
  return top[Math.floor(random() * top.length)][0];
}

export function pickSkirmishParticipantsByPresence(input: {
  home: SimPlayerView[];
  away: SimPlayerView[];
  presence: PlayerPresence[];
  modes: MapModeFlags;
  intensity: CombatIntensity;
  random: () => number;
}): { home: SimPlayerView[]; away: SimPlayerView[]; lane?: FightLane } {
  if (input.intensity === 'teamfight') {
    if (input.modes.objective || input.modes.siege || input.modes.transition) {
      const hotspot = pickHotspotLocale(input.presence, input.random);
      const homeLocal = viewsAtCompatibleLocale(input.home, input.presence, hotspot);
      const awayLocal = viewsAtCompatibleLocale(input.away, input.presence, hotspot);
      return {
        home: homeLocal.length >= 3 ? homeLocal : [...input.home],
        away: awayLocal.length >= 3 ? awayLocal : [...input.away],
        lane: fightLaneFromLocale(hotspot),
      };
    }
    return { home: [...input.home], away: [...input.away], lane: 'river' };
  }

  if (!input.modes.transition && input.modes.laning && !input.modes.siege) {
    return pickSkirmishParticipants(input.home, input.away, input.intensity, input.random);
  }

  const hotspot = pickHotspotLocale(input.presence, input.random);
  let homeLocal = viewsAtCompatibleLocale(input.home, input.presence, hotspot);
  let awayLocal = viewsAtCompatibleLocale(input.away, input.presence, hotspot);

  if (input.intensity === 'gank') {
    const homeJg = input.home.find((view) => view.player.position === 'JUNGLE');
    const awayJg = input.away.find((view) => view.player.position === 'JUNGLE');
    if (homeJg && !homeLocal.some((view) => view.player.id === homeJg.player.id)) {
      homeLocal = [...homeLocal, homeJg];
    }
    if (awayJg && !awayLocal.some((view) => view.player.id === awayJg.player.id)) {
      awayLocal = [...awayLocal, awayJg];
    }
  }

  if (homeLocal.length === 0 || awayLocal.length === 0) {
    return pickSkirmishParticipants(input.home, input.away, input.intensity, input.random);
  }

  return {
    home: homeLocal,
    away: awayLocal,
    lane: fightLaneFromLocale(hotspot),
  };
}

export function sumDamageByTeam(
  damageByPlayer: Record<string, number>,
  teamPlayerIds: Set<string>,
): number {
  let total = 0;
  for (const [playerId, amount] of Object.entries(damageByPlayer)) {
    if (teamPlayerIds.has(playerId)) {
      total += amount;
    }
  }
  return total;
}
