import type { Coach } from '../../core/models/coach.model';
import type { AttributeKey, Player, PlayerPosition } from '../../core/models/player.model';
import { ATTRIBUTE_KEYS, PLAYER_POSITIONS } from '../../core/models/player.model';
import { clampRating } from '../utils/rating-scale';
import { SIM_BALANCE } from './balance';
import type {
  EffectiveAttributes,
  PlayerArchetype,
  StyleAxisKey,
  TeamStyleAxes,
  TeamStylePresentation,
} from './report';
import { STYLE_AXIS_KEYS, STYLE_AXIS_LABELS } from './report';

export interface SimPlayerView {
  player: Player;
  effective: EffectiveAttributes;
  archetype: PlayerArchetype;
}

export interface TeamProfile {
  teamId: string;
  players: SimPlayerView[];
  byPosition: Partial<Record<PlayerPosition, SimPlayerView>>;
  style: TeamStyleAxes;
  styleLabels: TeamStylePresentation;
  chemistry: number;
  coach: Coach | null;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function avg(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formFactor(form: number): number {
  const t = clampRating(form) / 120;
  return SIM_BALANCE.formMinFactor + t * (SIM_BALANCE.formMaxFactor - SIM_BALANCE.formMinFactor);
}

function sampleNoise(consistency: number, random: () => number): number {
  const stability = consistency / 120;
  const spread = SIM_BALANCE.consistencyNoiseScale * (1 - stability);
  return 1 + (random() * 2 - 1) * spread;
}

export function deriveArchetype(attrs: EffectiveAttributes): PlayerArchetype {
  const aggression = (attrs.laning + attrs.mechanics) / 2;
  const teamfight = (attrs.teamfighting + attrs.gameSense) / 2;
  const stable = (attrs.consistency + attrs.adaptability) / 2;
  const values = [aggression, teamfight, stable];
  const mean = avg(values);
  const variance = avg(values.map((value) => (value - mean) ** 2));
  if (variance < 36) {
    return 'balanced';
  }
  if (aggression >= teamfight && aggression >= stable) {
    return 'aggressive';
  }
  if (teamfight >= aggression && teamfight >= stable) {
    return 'teamfight';
  }
  return 'stable';
}

export function buildEffectiveAttributes(player: Player, random: () => number): EffectiveAttributes {
  const factor = formFactor(player.form);
  const effective = {} as EffectiveAttributes;
  for (const key of ATTRIBUTE_KEYS) {
    const base = player.attributes[key].current;
    const jitter = sampleNoise(player.attributes.consistency.current, random);
    effective[key] = clampRating(base * factor * jitter);
  }
  return effective;
}

function pickStarters(players: readonly Player[]): Player[] {
  const starters: Player[] = [];
  for (const position of PLAYER_POSITIONS) {
    const atRole = players.filter((player) => player.position === position);
    if (atRole.length === 0) {
      continue;
    }
    let best = atRole[0];
    let bestScore = -1;
    for (const player of atRole) {
      const score = ATTRIBUTE_KEYS.reduce((sum, key) => sum + player.attributes[key].current, 0);
      if (score > bestScore) {
        best = player;
        bestScore = score;
      }
    }
    starters.push(best);
  }
  return starters;
}

function attrOf(view: SimPlayerView | undefined, key: AttributeKey): number {
  return view?.effective[key] ?? 0;
}

function buildStyleAxes(views: SimPlayerView[], coach: Coach | null): TeamStyleAxes {
  const byPos = {} as Partial<Record<PlayerPosition, SimPlayerView>>;
  for (const view of views) {
    byPos[view.player.position] = view;
  }

  const top = byPos.TOP;
  const jng = byPos.JUNGLE;
  const mid = byPos.MID;
  const bot = byPos.BOT;
  const sup = byPos.SUPPORT;

  const laneCore = avg([attrOf(top, 'laning'), attrOf(mid, 'laning'), attrOf(bot, 'laning')]) / 120;
  const mechCore = avg([attrOf(top, 'mechanics'), attrOf(jng, 'mechanics'), attrOf(mid, 'mechanics')]) / 120;
  const earlyAgg = clamp01(laneCore * 0.45 + mechCore * 0.55);
  const lanePressure = clamp01(laneCore);
  const jungleMidSync = clamp01(
    avg([
      attrOf(jng, 'gameSense'),
      attrOf(mid, 'gameSense'),
      attrOf(jng, 'mechanics'),
      attrOf(mid, 'mechanics'),
    ]) / 120,
  );
  const resourceControl = clamp01(avg([attrOf(jng, 'gameSense'), attrOf(sup, 'gameSense')]) / 120);
  const teamfightExecute = clamp01(
    avg(views.map((view) => (view.effective.teamfighting + view.effective.consistency) / 2)) / 120,
  );
  const lateScaling = clamp01(
    avg([
      attrOf(bot, 'teamfighting'),
      attrOf(top, 'teamfighting'),
      attrOf(sup, 'gameSense'),
      120 - attrOf(top, 'laning') * 0.35,
    ]) / 120,
  );
  const splitPush = clamp01(
    (attrOf(top, 'mechanics') * 0.55 + attrOf(top, 'laning') * 0.25 + (120 - attrOf(top, 'teamfighting')) * 0.2) /
      120,
  );

  const axes: TeamStyleAxes = {
    earlyAggression: earlyAgg,
    lanePressure,
    jungleMidSync,
    resourceControl,
    teamfightExecute,
    lateScaling,
    splitPush,
    balanced: 0,
  };

  const mean = avg(STYLE_AXIS_KEYS.filter((key) => key !== 'balanced').map((key) => axes[key]));
  const variance = avg(
    STYLE_AXIS_KEYS.filter((key) => key !== 'balanced').map((key) => (axes[key] - mean) ** 2),
  );
  axes.balanced = clamp01(1 - variance * 8);

  if (coach) {
    const pull = SIM_BALANCE.styleCoachPull * (coach.attributes.tacticalPlanning / 120);
    const meta = SIM_BALANCE.styleCoachPull * (coach.attributes.metaAdaptation / 120);
    axes.teamfightExecute = clamp01(axes.teamfightExecute + pull * 0.4);
    axes.resourceControl = clamp01(axes.resourceControl + pull * 0.3 + meta * 0.2);
    axes.earlyAggression = clamp01(axes.earlyAggression + meta * 0.25);
  }

  return axes;
}

export function topStyleLabels(style: TeamStyleAxes, count = 2): {
  primary: string[];
  secondary: string[];
} {
  const ranked = [...STYLE_AXIS_KEYS]
    .map((key) => ({ key, value: style[key] }))
    .sort((left, right) => right.value - left.value)
    .filter((item) => item.value >= 0.42);

  const primaryKeys = ranked
    .filter((item) => item.key !== 'balanced')
    .slice(0, count)
    .map((item) => item.key as StyleAxisKey);
  const secondary: string[] = [];
  const balanced = ranked.find((item) => item.key === 'balanced');
  if (balanced && balanced.value >= 0.55) {
    secondary.push(STYLE_AXIS_LABELS.balanced);
  }
  if (primaryKeys.length === 0 && balanced) {
    return { primary: [STYLE_AXIS_LABELS.balanced], secondary: [] };
  }
  return {
    primary: primaryKeys.map((key) => STYLE_AXIS_LABELS[key]),
    secondary,
  };
}

export function buildTeamProfile(
  teamId: string,
  roster: readonly Player[],
  coach: Coach | null,
  random: () => number,
  chemistry: number,
): TeamProfile {
  const starters = pickStarters(roster);
  const players = starters.map((player) => {
    const effective = buildEffectiveAttributes(player, random);
    return {
      player,
      effective,
      archetype: deriveArchetype(effective),
    };
  });
  const byPosition: Partial<Record<PlayerPosition, SimPlayerView>> = {};
  for (const view of players) {
    byPosition[view.player.position] = view;
  }
  const style = buildStyleAxes(players, coach);
  return {
    teamId,
    players,
    byPosition,
    style,
    styleLabels: topStyleLabels(style),
    chemistry,
    coach,
  };
}
