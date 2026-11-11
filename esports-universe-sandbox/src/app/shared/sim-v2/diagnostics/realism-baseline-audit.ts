import { simulateV2Match, type SimulateV2Input } from '../engine';
import { dist } from '../map/pathfinding';
import {
  canSiege,
  hasAlliedSiegePresence,
  siegeEligibility,
  wavePressuringStructure,
} from '../objectives/structures';
import type { GameState } from '../state/game-state';
import type { ReplayDocument } from '../replay/recorder';

export interface RealismScenarioResult {
  id: string;
  seed: number;
  maxDurationSec: number;
  endReason: string | null;
  winnerTeamId: string | null;
  metrics: Record<string, number | string | boolean>;
}

function roster(
  side: 'blue' | 'red',
  champs: [string, string, string, string, string],
) {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position, index) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId: champs[index],
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 70,
    consistency: 68,
    adaptability: 65,
  }));
}

function baseInput(
  seed: number,
  maxDurationSec: number,
  blue: [string, string, string, string, string],
  red: [string, string, string, string, string],
): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue', blue),
    red: roster('red', red),
    maxDurationSec,
  };
}

function actionShare(
  replay: ReplayDocument,
  actorIds: Set<string>,
  untilSec: number,
): Record<string, number> {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const event of replay.events) {
    if (event.type !== 'ai_decision' || event.t > untilSec) {
      continue;
    }
    if (!event.actorId || !actorIds.has(event.actorId)) {
      continue;
    }
    const action = String(event.payload?.['action'] ?? 'other');
    counts[action] = (counts[action] ?? 0) + 1;
    total += 1;
  }
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(counts)) {
    out[key] = total > 0 ? value / total : 0;
  }
  return out;
}

function topLaneMetrics(state: GameState, replay: ReplayDocument, untilSec: number) {
  const tops = state.champions.filter((champ) => champ.positionLabel === 'TOP');
  const ids = new Set(tops.map((champ) => champ.id));
  const share = actionShare(replay, ids, untilSec);
  return {
    blueCs: tops.find((champ) => champ.side === 'blue')?.cs ?? 0,
    redCs: tops.find((champ) => champ.side === 'red')?.cs ?? 0,
    blueChampDmg:
      tops.find((champ) => champ.side === 'blue')?.damageToChampions ?? 0,
    redChampDmg:
      tops.find((champ) => champ.side === 'red')?.damageToChampions ?? 0,
    fightShare: share['fight'] ?? 0,
    tradeShare: share['trade'] ?? 0,
    farmShare: (share['farm'] ?? 0) + (share['lane'] ?? 0),
    retreatShare: share['retreat'] ?? 0,
  };
}

function closeoutSnapshot(state: GameState): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {
    endReason: state.endReason ?? 'null',
  };
  for (const side of ['blue', 'red'] as const) {
    const nexus = state.structures.find(
      (structure) =>
        structure.side !== side && structure.structureKind === 'nexus',
    );
    if (!nexus) {
      continue;
    }
    const eligibility = siegeEligibility(state, side, nexus);
    out[`${side}_nexus_canSiege`] = canSiege(state, nexus);
    out[`${side}_nexus_wave`] = wavePressuringStructure(state, side, nexus);
    out[`${side}_nexus_presence`] = hasAlliedSiegePresence(state, side, nexus);
    out[`${side}_nexus_pressured`] = eligibility.pressured;
    out[`${side}_nexus_hp`] = Math.round(nexus.hp);
  }
  return out;
}

function macroLaneDistance(state: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const champ of state.champions) {
    const home =
      champ.positionLabel === 'TOP'
        ? 'top'
        : champ.positionLabel === 'BOT' || champ.positionLabel === 'SUPPORT'
          ? 'bot'
          : champ.positionLabel === 'MID'
            ? 'mid'
            : null;
    if (!home) {
      continue;
    }
    const poly = state.lockedPack.map.lanePaths[home];
    if (!poly?.length) {
      continue;
    }
    const midPoint = poly[Math.floor(poly.length / 2)];
    out[`${champ.side}_${champ.positionLabel}_homeGap`] = Math.round(
      dist(champ.position, midPoint),
    );
  }
  return out;
}

export function runRealismScenario(
  id: string,
  seed: number,
  maxDurationSec: number,
  blue: [string, string, string, string, string],
  red: [string, string, string, string, string],
): RealismScenarioResult {
  const { state, replay } = simulateV2Match(
    baseInput(seed, maxDurationSec, blue, red),
  );
  const metrics: Record<string, number | string | boolean> = {
    ...topLaneMetrics(state, replay, Math.min(360, maxDurationSec)),
    ...closeoutSnapshot(state),
  };

  if (id === 'S1' || id === 'S2') {
    const tops = state.champions.filter((champ) => champ.positionLabel === 'TOP');
    metrics['minTopCs'] = Math.min(...tops.map((champ) => champ.cs));
    metrics['maxTopCs'] = Math.max(...tops.map((champ) => champ.cs));
  }

  if (id === 'S3' || id === 'S4') {
    const jgDecisions = replay.events.filter(
      (event) =>
        event.type === 'ai_decision' &&
        event.t <= maxDurationSec &&
        state.champions.some(
          (champ) =>
            champ.id === event.actorId && champ.positionLabel === 'JUNGLE',
        ),
    );
    const gankish = jgDecisions.filter((event) => {
      const action = String(event.payload?.['action'] ?? '');
      return action === 'gank' || action === 'skirmish' || action === 'defend';
    }).length;
    metrics['jgGankishDecisions'] = gankish;
    metrics['jgDecisionTotal'] = jgDecisions.length;
  }

  if (id === 'S4') {
    const defendMoves = replay.events.filter(
      (event) =>
        event.type === 'ai_decision' &&
        event.t <= maxDurationSec &&
        String(event.payload?.['action'] ?? '') === 'defend' &&
        state.champions.some(
          (champ) =>
            champ.id === event.actorId && champ.positionLabel !== 'JUNGLE',
        ),
    ).length;
    metrics['nonJungleDefendDecisions'] = defendMoves;
  }

  if (id === 'S5') {
    Object.assign(metrics, macroLaneDistance(state));
    const heraldWindow = replay.events.filter(
      (event) => event.type === 'ai_decision' && event.t >= 420 && event.t <= 560,
    );
    const actors = new Set(
      heraldWindow
        .map((event) => event.actorId)
        .filter((actorId): actorId is string => !!actorId),
    );
    metrics['heraldWindowActors'] = actors.size;
    const midBot = state.champions.find(
      (champ) => champ.side === 'blue' && champ.positionLabel === 'BOT',
    );
    if (midBot) {
      metrics['blueBotX'] = Math.round(midBot.position.x);
      metrics['blueBotY'] = Math.round(midBot.position.y);
    }
  }

  return {
    id,
    seed,
    maxDurationSec,
    endReason: state.endReason,
    winnerTeamId: state.winnerTeamId,
    metrics,
  };
}

export function runRealismBaseline(seeds = [42, 77, 101]): RealismScenarioResult[] {
  const out: RealismScenarioResult[] = [];
  for (const seed of seeds) {
    out.push(
      runRealismScenario(
        'S1',
        seed,
        360,
        ['Ornn', 'LeeSin', 'Ahri', 'Jinx', 'Thresh'],
        ['Aatrox', 'Viego', 'Syndra', 'Ashe', 'Leona'],
      ),
    );
    out.push(
      runRealismScenario(
        'S2',
        seed,
        360,
        ['Ornn', 'LeeSin', 'Ahri', 'Jinx', 'Thresh'],
        ['Aatrox', 'Viego', 'Syndra', 'Ashe', 'Leona'],
      ),
    );
    out.push(
      runRealismScenario(
        'S3',
        seed,
        480,
        ['Ornn', 'Pantheon', 'Ahri', 'Jinx', 'Thresh'],
        ['Aatrox', 'LeeSin', 'Syndra', 'Ashe', 'Leona'],
      ),
    );
    out.push(
      runRealismScenario(
        'S4',
        seed,
        420,
        ['Garen', 'LeeSin', 'Annie', 'Ashe', 'Thresh'],
        ['Darius', 'Viego', 'Ahri', 'Jinx', 'Nautilus'],
      ),
    );
  }
  out.push(
    runRealismScenario(
      'S5',
      42,
      600,
      ['Garen', 'LeeSin', 'Annie', 'Ashe', 'Thresh'],
      ['Darius', 'Viego', 'Ahri', 'Jinx', 'Nautilus'],
    ),
  );
  out.push(
    runRealismScenario(
      'S6',
      42,
      2700,
      ['Garen', 'LeeSin', 'Annie', 'Ashe', 'Thresh'],
      ['Darius', 'Viego', 'Ahri', 'Jinx', 'Nautilus'],
    ),
  );
  return out;
}
