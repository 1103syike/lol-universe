import { getChampionKit, listChampionKits, type ChampionKit } from '../../core/data/champion-kits';
import { getChampionById } from '../../core/data/champions';
import type { Coach } from '../../core/models/coach.model';
import type {
  CompIntent,
  PatchMetaTable,
  PatchVersion,
} from '../../core/models/patch.model';
import { COMP_INTENT_LABELS } from '../../core/models/patch.model';
import type { AttributeKey, PlayerPosition } from '../../core/models/player.model';
import { PLAYER_POSITIONS } from '../../core/models/player.model';
import { championMetaOf } from './resolve-patch';
import type { EffectiveAttributes, TeamStyleAxes } from './report';
import type { SimPlayerView, TeamProfile } from './team-profile';

export interface DraftBanEntry {
  teamId: string;
  championId: string;
  championNameZh: string;
}

export interface DraftPickEntry {
  teamId: string;
  playerId: string;
  gamertag: string;
  position: PlayerPosition;
  championId: string;
  championNameZh: string;
  fitScore: number;
  metaPower: number;
}

export interface DraftSideResult {
  teamId: string;
  intent: CompIntent;
  power: number;
  phaseBias: { early: number; mid: number; late: number };
  picks: DraftPickEntry[];
  notes: string[];
}

export interface DraftResult {
  patch: PatchVersion;
  blueTeamId: string;
  redTeamId: string;
  bans: DraftBanEntry[];
  home: DraftSideResult;
  away: DraftSideResult;
  draftEdge: number;
  notes: string[];
}

type SideCtx = {
  teamId: string;
  profile: TeamProfile;
  intent: CompIntent;
  starters: SimPlayerView[];
  picks: DraftPickEntry[];
  openPositions: Set<PlayerPosition>;
};

const BAN1: Array<'blue' | 'red'> = ['blue', 'red', 'blue', 'red', 'blue', 'red'];
const PICK1: Array<'blue' | 'red'> = ['blue', 'red', 'red', 'blue', 'blue', 'red'];
const BAN2: Array<'blue' | 'red'> = ['red', 'blue', 'red', 'blue'];
const PICK2: Array<'blue' | 'red'> = ['red', 'blue', 'blue', 'red'];

const INTENT_STYLE_WEIGHT: Record<CompIntent, Partial<Record<keyof ChampionKit['style'], number>>> = {
  poke: { poke: 1, laning: 0.4 },
  teamfight: { teamfight: 1, engage: 0.5 },
  late: { teamfight: 0.4 },
  early: { laning: 0.6, engage: 0.4 },
  split: { splitPush: 1, laning: 0.3 },
  balanced: { laning: 0.3, teamfight: 0.3, engage: 0.2, poke: 0.1, splitPush: 0.1 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function championNameZh(id: string): string {
  return getChampionById(id)?.nameZh ?? id;
}

function avgAttr(attrs: EffectiveAttributes, weights: Partial<Record<AttributeKey, number>>): number {
  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    const w = weight ?? 0;
    total += attrs[key as AttributeKey] * w;
    weightSum += w;
  }
  return weightSum > 0 ? total / weightSum : 60;
}

export function resolveCompIntent(style: TeamStyleAxes, coach: Coach | null): CompIntent {
  const scores: Record<CompIntent, number> = {
    poke: style.lanePressure * 0.55 + style.resourceControl * 0.25,
    teamfight: style.teamfightExecute * 0.7 + style.jungleMidSync * 0.2,
    late: style.lateScaling * 0.75 + style.resourceControl * 0.15,
    early: style.earlyAggression * 0.7 + style.lanePressure * 0.2,
    split: style.splitPush * 0.8 + style.lanePressure * 0.1,
    balanced: style.balanced * 0.55,
  };
  if (coach) {
    if (coach.specialties.includes('laning')) {
      scores.early += 0.12;
      scores.poke += 0.08;
    }
    if (coach.specialties.includes('mechanics')) {
      scores.early += 0.06;
      scores.split += 0.05;
    }
    if (coach.specialties.includes('teamfighting')) {
      scores.teamfight += 0.14;
    }
    if (coach.specialties.includes('gameSense')) {
      scores.late += 0.1;
      scores.teamfight += 0.04;
    }
  }
  let best: CompIntent = 'balanced';
  let bestScore = -1;
  for (const intent of Object.keys(scores) as CompIntent[]) {
    if (scores[intent] > bestScore) {
      best = intent;
      bestScore = scores[intent];
    }
  }
  return best;
}

function isReleased(kit: ChampionKit, dateIso: string): boolean {
  return kit.releasedAt.slice(0, 10) <= dateIso.slice(0, 10);
}

function poolForPatch(patch: PatchVersion): ChampionKit[] {
  return listChampionKits().filter((kit) => isReleased(kit, patch.startsOn));
}

function playerFitScore(view: SimPlayerView, kit: ChampionKit): number {
  const raw = avgAttr(view.effective, kit.playerFit);
  const archetypeBonus =
    (view.archetype === 'aggressive' && (kit.style.laning >= 70 || kit.combatClass === 'assassin')) ||
    (view.archetype === 'teamfight' && kit.style.teamfight >= 70) ||
    (view.archetype === 'stable' && (kit.combatClass === 'tank' || kit.style.splitPush >= 70))
      ? 6
      : 0;
  return clamp(raw + archetypeBonus, 20, 120);
}

function intentFit(kit: ChampionKit, intent: CompIntent, patchDate: string): number {
  if (intent === 'late') {
    return kit.scaling.late / 100;
  }
  if (intent === 'early') {
    return kit.scaling.early / 100;
  }
  const weights = INTENT_STYLE_WEIGHT[intent];
  let total = 0;
  let weightSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    total += kit.style[key as keyof ChampionKit['style']] * (weight ?? 0);
    weightSum += weight ?? 0;
  }
  const styleScore = weightSum > 0 ? total / (weightSum * 100) : 0.5;
  void patchDate;
  return styleScore;
}

function pickScore(args: {
  kit: ChampionKit;
  view: SimPlayerView;
  meta: PatchMetaTable;
  intent: CompIntent;
  patch: PatchVersion;
  banned: Set<string>;
  picked: Set<string>;
}): number {
  const { kit, view, meta, intent, patch, banned, picked } = args;
  if (banned.has(kit.id) || picked.has(kit.id)) {
    return -1;
  }
  if (!kit.positions.includes(view.player.position)) {
    return -1;
  }
  if (!isReleased(kit, patch.startsOn)) {
    return -1;
  }
  const entry = championMetaOf(meta, kit.id);
  const fit = playerFitScore(view, kit) / 100;
  const intentScore = intentFit(kit, intent, patch.startsOn);
  const metaPower = entry.power / 100;
  const presence = entry.presence;
  const offMetaPenalty = presence < 0.04 ? 0.82 : presence < 0.1 ? 0.92 : 1;
  const primaryPos = kit.positions[0];
  const roleBias =
    view.player.position === primaryPos ? 1 : kit.positions.indexOf(view.player.position) === 1 ? 0.62 : 0.45;
  const spice = ((kit.id.charCodeAt(0) + view.player.id.charCodeAt(0)) % 17) / 200;
  return (
    (metaPower * 0.36 + fit * 0.34 + intentScore * 0.22 * offMetaPenalty + presence * 0.08 + spice) *
    roleBias
  );
}

function banScore(args: {
  kit: ChampionKit;
  meta: PatchMetaTable;
  enemy: SideCtx;
  self: SideCtx;
  banned: Set<string>;
  picked: Set<string>;
  patch: PatchVersion;
}): number {
  const { kit, meta, enemy, self, banned, picked, patch } = args;
  if (banned.has(kit.id) || picked.has(kit.id) || !isReleased(kit, patch.startsOn)) {
    return -1;
  }
  const entry = championMetaOf(meta, kit.id);
  let enemyDesire = 0;
  for (const view of enemy.starters) {
    if (!enemy.openPositions.has(view.player.position)) {
      continue;
    }
    if (!kit.positions.includes(view.player.position)) {
      continue;
    }
    const score = pickScore({
      kit,
      view,
      meta,
      intent: enemy.intent,
      patch,
      banned,
      picked,
    });
    enemyDesire = Math.max(enemyDesire, score);
  }
  let selfDesire = 0;
  for (const view of self.starters) {
    if (!self.openPositions.has(view.player.position)) {
      continue;
    }
    if (!kit.positions.includes(view.player.position)) {
      continue;
    }
    const score = pickScore({
      kit,
      view,
      meta,
      intent: self.intent,
      patch,
      banned,
      picked,
    });
    selfDesire = Math.max(selfDesire, score);
  }
  return entry.banRate * 0.55 + entry.presence * 0.25 + enemyDesire * 0.35 - selfDesire * 0.2;
}

function chooseBan(
  side: SideCtx,
  enemy: SideCtx,
  pool: ChampionKit[],
  meta: PatchMetaTable,
  banned: Set<string>,
  picked: Set<string>,
  patch: PatchVersion,
  random: () => number,
): string | null {
  const ranked = pool
    .map((kit) => ({
      kit,
      score: banScore({ kit, meta, enemy, self: side, banned, picked, patch }),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) {
    return null;
  }
  const coach = side.profile.coach;
  const draftSkill = coach ? coach.attributes.draftStrategy / 120 : 0.55;
  const metaSkill = coach ? coach.attributes.metaAdaptation / 120 : 0.55;
  const depth = clamp(Math.round(2 + (1 - (draftSkill + metaSkill) / 2) * 5 + random() * 2), 1, 8);
  const pick = ranked[Math.floor(random() * Math.min(depth, ranked.length))];
  return pick?.kit.id ?? ranked[0].kit.id;
}

function nextOpenView(side: SideCtx, preferred: PlayerPosition[] | null): SimPlayerView | null {
  const order = preferred ?? [...PLAYER_POSITIONS];
  for (const position of order) {
    if (!side.openPositions.has(position)) {
      continue;
    }
    const view = side.profile.byPosition[position];
    if (view) {
      return view;
    }
  }
  for (const view of side.starters) {
    if (side.openPositions.has(view.player.position)) {
      return view;
    }
  }
  return null;
}

function choosePick(
  side: SideCtx,
  pool: ChampionKit[],
  meta: PatchMetaTable,
  banned: Set<string>,
  picked: Set<string>,
  patch: PatchVersion,
  random: () => number,
): DraftPickEntry | null {
  const view = nextOpenView(side, null);
  if (!view) {
    return null;
  }
  const ranked = pool
    .map((kit) => ({
      kit,
      score: pickScore({
        kit,
        view,
        meta,
        intent: side.intent,
        patch,
        banned,
        picked,
      }),
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (ranked.length === 0) {
    return null;
  }
  const coach = side.profile.coach;
  const draftSkill = coach ? coach.attributes.draftStrategy / 120 : 0.55;
  const depth = clamp(Math.round(1 + (1 - draftSkill) * 4 + random() * 2), 1, 6);
  const chosen = ranked[Math.floor(random() * Math.min(depth, ranked.length))] ?? ranked[0];
  const entry = championMetaOf(meta, chosen.kit.id);
  const fit = playerFitScore(view, chosen.kit);
  return {
    teamId: side.teamId,
    playerId: view.player.id,
    gamertag: view.player.gamertag,
    position: view.player.position,
    championId: chosen.kit.id,
    championNameZh: championNameZh(chosen.kit.id),
    fitScore: Number(fit.toFixed(1)),
    metaPower: entry.power,
  };
}

function applyPick(side: SideCtx, pick: DraftPickEntry, picked: Set<string>): void {
  side.picks.push(pick);
  side.openPositions.delete(pick.position);
  picked.add(pick.championId);
}

function sidePower(side: SideCtx, meta: PatchMetaTable, coach: Coach | null): {
  power: number;
  phaseBias: { early: number; mid: number; late: number };
  notes: string[];
} {
  const notes: string[] = [];
  if (side.picks.length === 0) {
    return { power: 50, phaseBias: { early: 0, mid: 0, late: 0 }, notes };
  }
  let powerSum = 0;
  let early = 0;
  let mid = 0;
  let late = 0;
  let fitSum = 0;
  for (const pick of side.picks) {
    const kit = getChampionKit(pick.championId);
    const entry = championMetaOf(meta, pick.championId);
    const fitFactor = clamp(pick.fitScore / 100, 0.55, 1.15);
    const champPower = entry.power * fitFactor;
    powerSum += champPower;
    fitSum += pick.fitScore;
    if (kit) {
      early += kit.scaling.early * fitFactor;
      mid += kit.scaling.mid * fitFactor;
      late += kit.scaling.late * fitFactor;
    }
  }
  const n = side.picks.length;
  let power = powerSum / n;
  if (coach) {
    power += (coach.attributes.draftStrategy / 120) * 6;
    power += (coach.attributes.metaAdaptation / 120) * 5;
  }
  const avgFit = fitSum / n;
  if (avgFit >= 90) {
    notes.push(`${COMP_INTENT_LABELS[side.intent]}人選對味`);
  } else if (avgFit < 70) {
    notes.push('選手英雄適性一般');
  }
  const weak = side.picks.filter((pick) => pick.metaPower < 40);
  if (weak.length >= 2) {
    notes.push('版本外英雄偏多');
    power -= 4;
  }
  const strong = side.picks.filter((pick) => pick.metaPower >= 70);
  if (strong.length >= 3) {
    notes.push('吃到版本答案');
    power += 3;
  }
  notes.push(`走${COMP_INTENT_LABELS[side.intent]}`);
  return {
    power: Number(power.toFixed(2)),
    phaseBias: {
      early: Number(((early / n - 65) / 40).toFixed(3)),
      mid: Number(((mid / n - 70) / 40).toFixed(3)),
      late: Number(((late / n - 70) / 40).toFixed(3)),
    },
    notes,
  };
}

function makeSide(profile: TeamProfile): SideCtx {
  return {
    teamId: profile.teamId,
    profile,
    intent: resolveCompIntent(profile.style, profile.coach),
    starters: profile.players.slice(),
    picks: [],
    openPositions: new Set(PLAYER_POSITIONS.filter((pos) => profile.byPosition[pos])),
  };
}

export function runClassicDraft(input: {
  home: TeamProfile;
  away: TeamProfile;
  patch: PatchVersion;
  meta: PatchMetaTable;
  random?: () => number;
}): DraftResult {
  const random = input.random ?? Math.random;
  const pool = poolForPatch(input.patch);
  const blue = makeSide(input.home);
  const red = makeSide(input.away);
  const banned = new Set<string>();
  const picked = new Set<string>();
  const bans: DraftBanEntry[] = [];

  const sideOf = (color: 'blue' | 'red'): SideCtx => (color === 'blue' ? blue : red);
  const enemyOf = (color: 'blue' | 'red'): SideCtx => (color === 'blue' ? red : blue);

  for (const color of BAN1) {
    const side = sideOf(color);
    const id = chooseBan(side, enemyOf(color), pool, input.meta, banned, picked, input.patch, random);
    if (!id) {
      continue;
    }
    banned.add(id);
    bans.push({
      teamId: side.teamId,
      championId: id,
      championNameZh: championNameZh(id),
    });
  }

  for (const color of PICK1) {
    const side = sideOf(color);
    const pick = choosePick(side, pool, input.meta, banned, picked, input.patch, random);
    if (pick) {
      applyPick(side, pick, picked);
    }
  }

  for (const color of BAN2) {
    const side = sideOf(color);
    const id = chooseBan(side, enemyOf(color), pool, input.meta, banned, picked, input.patch, random);
    if (!id) {
      continue;
    }
    banned.add(id);
    bans.push({
      teamId: side.teamId,
      championId: id,
      championNameZh: championNameZh(id),
    });
  }

  for (const color of PICK2) {
    const side = sideOf(color);
    const pick = choosePick(side, pool, input.meta, banned, picked, input.patch, random);
    if (pick) {
      applyPick(side, pick, picked);
    }
  }

  for (const side of [blue, red]) {
    while (side.openPositions.size > 0) {
      const pick = choosePick(side, pool, input.meta, banned, picked, input.patch, random);
      if (!pick) {
        break;
      }
      applyPick(side, pick, picked);
    }
  }

  const homeEval = sidePower(blue, input.meta, input.home.coach);
  const awayEval = sidePower(red, input.meta, input.away.coach);
  const draftEdge = (homeEval.power - awayEval.power) / 8;

  const notes = [
    ...homeEval.notes.map((note) => `主隊：${note}`),
    ...awayEval.notes.map((note) => `客隊：${note}`),
  ];

  return {
    patch: input.patch,
    blueTeamId: blue.teamId,
    redTeamId: red.teamId,
    bans,
    home: {
      teamId: blue.teamId,
      intent: blue.intent,
      power: homeEval.power,
      phaseBias: homeEval.phaseBias,
      picks: blue.picks,
      notes: homeEval.notes,
    },
    away: {
      teamId: red.teamId,
      intent: red.intent,
      power: awayEval.power,
      phaseBias: awayEval.phaseBias,
      picks: red.picks,
      notes: awayEval.notes,
    },
    draftEdge: Number(draftEdge.toFixed(2)),
    notes,
  };
}
