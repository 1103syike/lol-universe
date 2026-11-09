import {
  isObjectiveSetupWindow,
  objectiveWindowBoost,
} from '../jungle/jungle-system';
import { dist } from '../map/pathfinding';
import {
  canSiege,
  wavePressuringStructure,
} from '../objectives/structures';
import type { ChampionEntity, MonsterEntity, StructureEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { LaneId, TeamSide } from '../types/ids';
import {
  BARON_CORE_CAP,
  CLOSEOUT_SIEGE_CORE_CAP,
  DEFEND_ASSIGNEE_CAP,
  getMatchAiRuntime,
  OBJECTIVE_CORE_CAP,
  PLAN_CLOSEOUT_SIEGE_SEC,
  PLAN_DEFEND_SEC,
  PLAN_HOLD_SEC,
  PLAN_OBJECTIVE_SEC,
  PLAN_SIEGE_SEC,
  SIEGE_CORE_CAP,
} from './runtime';
import type {
  FormationSlot,
  MatchPhase,
  MemberMission,
  TeamPlan,
  TeamPlay,
  UnitAssignment,
} from './types';
import { MISSION_INTENT_POLICY } from './types';

function structureThreatScore(state: GameState, structure: StructureEntity): number {
  const enemyMinions = state.minions.filter(
    (minion) =>
      minion.alive &&
      minion.side !== structure.side &&
      dist(minion.position, structure.position) < (structure.range || 750) + 450,
  ).length;
  const enemyChamps = state.champions.filter(
    (enemy) =>
      enemy.alive &&
      enemy.side !== structure.side &&
      dist(enemy.position, structure.position) < 1600,
  ).length;
  if (enemyMinions + enemyChamps <= 0) {
    return 0;
  }
  const kindWeight =
    structure.structureKind === 'nexus'
      ? 110
      : structure.structureKind === 'nexus_tower'
        ? 80
        : structure.structureKind === 'inhibitor'
          ? 65
          : structure.structureKind === 'inhib_tower'
            ? 50
            : structure.structureKind === 'inner_tower'
              ? 34
              : structure.structureKind === 'outer_tower'
                ? 18
                : 0;
  return kindWeight + enemyMinions * 6 + enemyChamps * 22;
}

function mostThreatenedStructure(
  state: GameState,
  side: TeamSide,
): StructureEntity | null {
  let best: StructureEntity | null = null;
  let bestScore = 0;
  for (const structure of state.structures) {
    if (!structure.alive || structure.side !== side) {
      continue;
    }
    const score = structureThreatScore(state, structure);
    if (score > bestScore) {
      best = structure;
      bestScore = score;
    }
  }
  return bestScore > 0 ? best : null;
}

function bestObjectiveCamp(state: GameState): MonsterEntity | null {
  let best: MonsterEntity | null = null;
  let bestScore = 0;
  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }
    if (
      monster.campId !== 'dragon' &&
      monster.campId !== 'baron' &&
      monster.campId !== 'herald'
    ) {
      continue;
    }
    const boost = objectiveWindowBoost(state, monster.campId);
    const kindBias =
      monster.campId === 'baron' ? 0.35 : monster.campId === 'dragon' ? 0.2 : 0.1;
    const score = boost + kindBias;
    if (score > bestScore) {
      best = monster;
      bestScore = score;
    }
  }
  return bestScore >= 0.45 ? best : null;
}

function bestSiegeStructure(state: GameState, side: TeamSide): StructureEntity | null {
  let best: StructureEntity | null = null;
  let bestScore = 0;
  for (const structure of state.structures) {
    if (!structure.alive || structure.side === side) {
      continue;
    }
    if (!canSiege(state, structure)) {
      continue;
    }
    const pressured = wavePressuringStructure(state, side, structure);
    if (!pressured && state.scheduler.time < 1200) {
      continue;
    }
    const kindWeight =
      structure.structureKind === 'nexus'
        ? 120
        : structure.structureKind === 'nexus_tower'
          ? 90
          : structure.structureKind === 'inhibitor'
            ? 70
            : structure.structureKind === 'inhib_tower'
              ? 55
              : structure.structureKind === 'inner_tower'
                ? 40
                : 25;
    const score = kindWeight + (pressured ? 40 : 0);
    if (score > bestScore) {
      best = structure;
      bestScore = score;
    }
  }
  return best;
}

function livingAvailable(state: GameState, side: TeamSide): ChampionEntity[] {
  return state.champions.filter(
    (champion) =>
      champion.alive &&
      champion.side === side &&
      champion.recallPhase === 'none',
  );
}

function sortByDistanceTo(
  champions: ChampionEntity[],
  point: { x: number; y: number },
): ChampionEntity[] {
  return [...champions].sort((left, right) => {
    const leftDist = dist(left.position, point);
    const rightDist = dist(right.position, point);
    if (leftDist !== rightDist) {
      return leftDist - rightDist;
    }
    return left.id.localeCompare(right.id);
  });
}

function objectiveRoleRank(champion: ChampionEntity, campId: string): number {
  const role = champion.positionLabel;
  if (campId === 'dragon') {
    if (role === 'JUNGLE') return 0;
    if (role === 'BOT' || role === 'SUPPORT') return 1;
    if (role === 'MID') return 2;
    if (role === 'TOP') return 3;
    return 4;
  }
  if (campId === 'herald') {
    if (role === 'JUNGLE') return 0;
    if (role === 'TOP') return 1;
    if (role === 'MID') return 2;
    if (role === 'SUPPORT') return 3;
    return 4;
  }
  if (role === 'JUNGLE') return 0;
  if (role === 'SUPPORT' || role === 'MID') return 1;
  if (role === 'BOT' || role === 'TOP') return 2;
  return 3;
}

function rolePriority(champion: ChampionEntity, mission: MemberMission): number {
  const role = champion.positionLabel;
  if (mission === 'take-objective' || mission === 'setup-objective') {
    return objectiveRoleRank(champion, 'dragon');
  }
  if (mission === 'siege') {
    if (role === 'BOT') return 0;
    if (role === 'MID') return 1;
    if (role === 'TOP') return 2;
    if (role === 'SUPPORT') return 3;
    return 4;
  }
  if (mission === 'cover-side' || mission === 'hold-lane') {
    if (role === 'TOP') return 0;
    if (role === 'MID') return 1;
    return 2;
  }
  if (mission === 'clear-jungle') {
    return role === 'JUNGLE' ? 0 : 5;
  }
  return 3;
}

function enemiesNearObjective(
  state: GameState,
  side: TeamSide,
  camp: MonsterEntity,
  radius = 2200,
): number {
  return state.champions.filter(
    (champ) =>
      champ.alive &&
      champ.side !== side &&
      dist(champ.position, camp.position) < radius,
  ).length;
}

function objectiveContested(state: GameState, side: TeamSide, camp: MonsterEntity): boolean {
  return enemiesNearObjective(state, side, camp) > 0;
}

function topCanRotateToDragon(state: GameState, champion: ChampionEntity): boolean {
  if (champion.positionLabel !== 'TOP') {
    return true;
  }
  const path = state.lockedPack.map.lanePaths.top;
  if (!path || path.length === 0) {
    return true;
  }
  const progress =
    nearestPathProgress(path, champion.position);
  const pushed =
    champion.side === 'blue' ? progress > 0.48 : progress < 0.52;
  const hpRatio = champion.hp / Math.max(1, champion.maxHp);
  if (hpRatio < 0.4) {
    return false;
  }
  return pushed || hpRatio > 0.5 || state.scheduler.time >= 600;
}

function nearestPathProgress(path: readonly { x: number; y: number }[], point: { x: number; y: number }): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < path.length; i += 1) {
    const gap = dist(path[i], point);
    if (gap < bestDist) {
      bestDist = gap;
      best = i;
    }
  }
  return path.length <= 1 ? 0.5 : best / (path.length - 1);
}

function makeAssignment(
  champion: ChampionEntity,
  play: TeamPlay,
  mission: MemberMission,
  formation: FormationSlot,
  expiresAt: number,
  targetId: string | null,
  targetCampId: string | null,
  lane: LaneId | null,
): UnitAssignment {
  const policy = MISSION_INTENT_POLICY[mission];
  return {
    championId: champion.id,
    mission,
    play,
    targetId,
    targetCampId,
    lane,
    formation,
    expiresAt,
    preferredIntents: policy.preferred,
    allowedIntents: policy.allowed,
  };
}

function homeLaneOf(champion: ChampionEntity): LaneId {
  if (champion.positionLabel === 'TOP') return 'top';
  if (champion.positionLabel === 'BOT' || champion.positionLabel === 'SUPPORT') return 'bot';
  return 'mid';
}

function oppositeLane(lane: LaneId): LaneId {
  if (lane === 'top') return 'bot';
  if (lane === 'bot') return 'top';
  return 'top';
}

function isPlanStillValid(state: GameState, plan: TeamPlan): boolean {
  if (plan.expiresAt <= state.scheduler.time) {
    return false;
  }
  if (plan.play === 'contest-objective') {
    return state.monsters.some(
      (monster) =>
        monster.alive &&
        (monster.id === plan.targetId || monster.campId === plan.targetCampId),
    );
  }
  if (plan.play === 'siege-lane') {
    const structure = state.structures.find((item) => item.id === plan.targetId);
    return !!structure?.alive;
  }
  if (plan.play === 'defend-base') {
    const structure = state.structures.find((item) => item.id === plan.targetId);
    return !!structure?.alive && structureThreatScore(state, structure) > 0;
  }
  return true;
}

function choosePlay(
  state: GameState,
  side: TeamSide,
  phase: MatchPhase,
): { play: TeamPlay; target: StructureEntity | MonsterEntity | null; holdSec: number } {
  const t = state.scheduler.time;
  const threatened = mostThreatenedStructure(state, side);
  if (
    threatened &&
    (phase === 'defend' ||
      structureThreatScore(state, threatened) >= 70 ||
      threatened.structureKind === 'nexus' ||
      threatened.structureKind === 'nexus_tower')
  ) {
    return { play: 'defend-base', target: threatened, holdSec: PLAN_DEFEND_SEC };
  }

  const objective = bestObjectiveCamp(state);
  if (objective && (t >= 300 || objective.campId === 'herald')) {
    const contested = objectiveContested(state, side, objective);
    const setupWindow = isObjectiveSetupWindow(state, objective.campId);
    const shouldContest =
      phase === 'objective-setup' ||
      contested ||
      setupWindow ||
      (objective.campId === 'baron' && t >= 1200 && setupWindow);
    if (shouldContest) {
      return { play: 'contest-objective', target: objective, holdSec: PLAN_OBJECTIVE_SEC };
    }
  }

  if (t < 480) {
    return { play: 'hold-lanes', target: null, holdSec: PLAN_HOLD_SEC };
  }

  const siege = bestSiegeStructure(state, side);
  const siegePressured =
    !!siege && wavePressuringStructure(state, side, siege);
  if (
    siege &&
    (phase === 'siege' ||
      phase === 'closeout' ||
      (t >= 960 && siegePressured))
  ) {
    const isNexus = siege.structureKind === 'nexus';
    const holdSec =
      isNexus || phase === 'closeout' ? PLAN_CLOSEOUT_SIEGE_SEC : PLAN_SIEGE_SEC;
    return { play: 'siege-lane', target: siege, holdSec };
  }

  return { play: 'hold-lanes', target: null, holdSec: PLAN_HOLD_SEC };
}

function buildDefendPlan(
  state: GameState,
  side: TeamSide,
  phase: MatchPhase,
  structure: StructureEntity,
  expiresAt: number,
): TeamPlan {
  const available = livingAvailable(state, side);
  const ranked = sortByDistanceTo(available, structure.position);
  const cap =
    structure.structureKind === 'nexus' || structure.structureKind === 'nexus_tower'
      ? DEFEND_ASSIGNEE_CAP
      : 2;
  const defenders = ranked.slice(0, cap);
  const defenderIds = new Set(defenders.map((champ) => champ.id));
  const assignments = new Map<string, UnitAssignment>();

  defenders.forEach((champion, index) => {
    assignments.set(
      champion.id,
      makeAssignment(
        champion,
        'defend-base',
        'anchor-defense',
        index === 0 ? 'frontline' : index === 1 ? 'core' : 'backline',
        expiresAt,
        structure.id,
        null,
        structure.lane ?? null,
      ),
    );
  });

  for (const champion of available) {
    if (defenderIds.has(champion.id)) {
      continue;
    }
    if (champion.positionLabel === 'JUNGLE') {
      assignments.set(
        champion.id,
        makeAssignment(
          champion,
          'defend-base',
          'clear-jungle',
          'cover',
          expiresAt,
          null,
          null,
          homeLaneOf(champion),
        ),
      );
      continue;
    }
    const coverLane = oppositeLane(structure.lane ?? homeLaneOf(champion));
    assignments.set(
      champion.id,
      makeAssignment(
        champion,
        'defend-base',
        'cover-side',
        'split',
        expiresAt,
        null,
        null,
        coverLane,
      ),
    );
  }

  return {
    side,
    phase,
    play: 'defend-base',
    commitment: 'high',
    createdAt: state.scheduler.time,
    expiresAt,
    targetId: structure.id,
    targetCampId: null,
    assignments,
  };
}

function buildObjectivePlan(
  state: GameState,
  side: TeamSide,
  phase: MatchPhase,
  camp: MonsterEntity,
  expiresAt: number,
): TeamPlan {
  const available = livingAvailable(state, side);
  const contested = objectiveContested(state, side, camp);
  const ranked = [...available].sort((left, right) => {
    const leftScore =
      objectiveRoleRank(left, camp.campId) * 1000 + dist(left.position, camp.position);
    const rightScore =
      objectiveRoleRank(right, camp.campId) * 1000 + dist(right.position, camp.position);
    return leftScore - rightScore;
  });

  let core: ChampionEntity[];
  if (camp.campId === 'baron' && contested) {
    core = ranked.slice(0, Math.min(BARON_CORE_CAP, ranked.length));
  } else if (contested) {
    core = ranked.filter((champ) => {
      if (champ.positionLabel !== 'TOP') {
        return true;
      }
      return camp.campId !== 'dragon' || topCanRotateToDragon(state, champ);
    });
    if (camp.campId === 'dragon') {
      const top = ranked.find((champ) => champ.positionLabel === 'TOP');
      if (top && !core.includes(top) && topCanRotateToDragon(state, top)) {
        core.push(top);
      }
    }
    core = core.slice(0, Math.min(OBJECTIVE_CORE_CAP, core.length));
  } else if (camp.campId === 'baron') {
    core = ranked.slice(0, Math.min(3, ranked.length));
  } else if (camp.campId === 'dragon') {
    const jungler = ranked.find((champ) => champ.positionLabel === 'JUNGLE');
    const helpers = ranked.filter(
      (champ) =>
        champ.positionLabel === 'BOT' ||
        champ.positionLabel === 'SUPPORT' ||
        champ.positionLabel === 'MID',
    );
    const top = ranked.find((champ) => champ.positionLabel === 'TOP');
    const earlySetup =
      state.scheduler.time < 720 && isObjectiveSetupWindow(state, 'dragon');
    if (earlySetup) {
      core = [jungler, ...helpers.slice(0, 2)].filter(
        (champ): champ is ChampionEntity => !!champ,
      );
      if (top && top.hp / Math.max(1, top.maxHp) >= 0.4) {
        core.push(top);
      }
      core = core.slice(0, Math.min(OBJECTIVE_CORE_CAP, core.length));
    } else {
      core = [jungler, helpers[0]].filter(
        (champ): champ is ChampionEntity => !!champ,
      );
    }
  } else if (camp.campId === 'herald') {
    const jungler = ranked.find((champ) => champ.positionLabel === 'JUNGLE');
    const top = ranked.find((champ) => champ.positionLabel === 'TOP');
    core = [jungler, top].filter((champ): champ is ChampionEntity => !!champ);
  } else {
    core = ranked.slice(0, Math.min(2, ranked.length));
  }

  const coreIds = new Set(core.map((champ) => champ.id));
  const assignments = new Map<string, UnitAssignment>();
  const objLane: LaneId = camp.campId === 'herald' ? 'top' : camp.campId === 'baron' ? 'mid' : 'bot';

  core.forEach((champion, index) => {
    const mission: MemberMission =
      index === 0 || champion.positionLabel === 'JUNGLE' ? 'take-objective' : 'setup-objective';
    const formation: FormationSlot =
      champion.positionLabel === 'JUNGLE'
        ? 'core'
        : champion.positionLabel === 'SUPPORT' || champion.positionLabel === 'TOP'
          ? 'frontline'
          : index <= 1
            ? 'core'
            : 'backline';
    const memberExpires =
      champion.positionLabel === 'TOP' && camp.campId === 'dragon'
        ? Math.max(expiresAt, state.scheduler.time + 42)
        : expiresAt;
    assignments.set(
      champion.id,
      makeAssignment(
        champion,
        'contest-objective',
        mission,
        formation,
        memberExpires,
        camp.id,
        camp.campId,
        objLane,
      ),
    );
  });

  const leftovers = available.filter((champion) => !coreIds.has(champion.id));
  leftovers.forEach((champion) => {
    if (champion.positionLabel === 'JUNGLE') {
      assignments.set(
        champion.id,
        makeAssignment(
          champion,
          'contest-objective',
          'take-objective',
          'core',
          expiresAt,
          camp.id,
          camp.campId,
          objLane,
        ),
      );
      return;
    }
    assignments.set(
      champion.id,
      makeAssignment(
        champion,
        'contest-objective',
        'cover-side',
        'split',
        expiresAt,
        null,
        null,
        homeLaneOf(champion),
      ),
    );
  });

  return {
    side,
    phase,
    play: 'contest-objective',
    commitment: contested ? 'high' : 'medium',
    createdAt: state.scheduler.time,
    expiresAt,
    targetId: camp.id,
    targetCampId: camp.campId,
    assignments,
  };
}

function buildSiegePlan(
  state: GameState,
  side: TeamSide,
  phase: MatchPhase,
  structure: StructureEntity,
  expiresAt: number,
): TeamPlan {
  const available = livingAvailable(state, side);
  const ranked = [...available].sort((left, right) => {
    const leftScore =
      rolePriority(left, 'siege') * 1000 + dist(left.position, structure.position);
    const rightScore =
      rolePriority(right, 'siege') * 1000 + dist(right.position, structure.position);
    return leftScore - rightScore;
  });
  const isNexus = structure.structureKind === 'nexus';
  const coreCap =
    isNexus || phase === 'closeout' ? CLOSEOUT_SIEGE_CORE_CAP : SIEGE_CORE_CAP;
  const core = ranked.slice(0, Math.min(coreCap, ranked.length));
  const coreIds = new Set(core.map((champ) => champ.id));
  const assignments = new Map<string, UnitAssignment>();
  const siegeLane = structure.lane ?? 'mid';

  core.forEach((champion, index) => {
    assignments.set(
      champion.id,
      makeAssignment(
        champion,
        'siege-lane',
        'siege',
        index === 0 ? 'frontline' : index === 1 ? 'core' : 'backline',
        expiresAt,
        structure.id,
        null,
        siegeLane,
      ),
    );
  });

  for (const champion of available) {
    if (coreIds.has(champion.id)) {
      continue;
    }
    if (isNexus) {
      assignments.set(
        champion.id,
        makeAssignment(
          champion,
          'siege-lane',
          'siege',
          'cover',
          expiresAt,
          structure.id,
          null,
          siegeLane,
        ),
      );
      continue;
    }
    if (champion.positionLabel === 'JUNGLE') {
      assignments.set(
        champion.id,
        makeAssignment(
          champion,
          'siege-lane',
          'clear-jungle',
          'flank',
          expiresAt,
          null,
          null,
          homeLaneOf(champion),
        ),
      );
      continue;
    }
    assignments.set(
      champion.id,
      makeAssignment(
        champion,
        'siege-lane',
        'cover-side',
        'split',
        expiresAt,
        null,
        null,
        oppositeLane(siegeLane),
      ),
    );
  }

  return {
    side,
    phase,
    play: 'siege-lane',
    commitment: phase === 'closeout' ? 'high' : 'medium',
    createdAt: state.scheduler.time,
    expiresAt,
    targetId: structure.id,
    targetCampId: null,
    assignments,
  };
}

function buildHoldPlan(
  state: GameState,
  side: TeamSide,
  phase: MatchPhase,
  expiresAt: number,
): TeamPlan {
  const available = livingAvailable(state, side);
  const assignments = new Map<string, UnitAssignment>();
  for (const champion of available) {
    if (champion.positionLabel === 'JUNGLE') {
      assignments.set(
        champion.id,
        makeAssignment(
          champion,
          'hold-lanes',
          'clear-jungle',
          'cover',
          expiresAt,
          null,
          null,
          homeLaneOf(champion),
        ),
      );
      continue;
    }
    assignments.set(
      champion.id,
      makeAssignment(
        champion,
        'hold-lanes',
        'hold-lane',
        champion.positionLabel === 'SUPPORT' ? 'backline' : 'core',
        expiresAt,
        null,
        null,
        homeLaneOf(champion),
      ),
    );
  }
  return {
    side,
    phase,
    play: 'hold-lanes',
    commitment: 'low',
    createdAt: state.scheduler.time,
    expiresAt,
    targetId: null,
    targetCampId: null,
    assignments,
  };
}

function buildFreshPlan(state: GameState, side: TeamSide, phase: MatchPhase): TeamPlan {
  const choice = choosePlay(state, side, phase);
  const expiresAt = state.scheduler.time + choice.holdSec;
  if (choice.play === 'defend-base' && choice.target && 'structureKind' in choice.target) {
    return buildDefendPlan(state, side, phase, choice.target, expiresAt);
  }
  if (choice.play === 'contest-objective' && choice.target && 'campId' in choice.target) {
    return buildObjectivePlan(state, side, phase, choice.target, expiresAt);
  }
  if (choice.play === 'siege-lane' && choice.target && 'structureKind' in choice.target) {
    return buildSiegePlan(state, side, phase, choice.target, expiresAt);
  }
  return buildHoldPlan(state, side, phase, expiresAt);
}

export function planTeamTick(state: GameState): void {
  const runtime = getMatchAiRuntime(state);
  runtime.assignments.clear();

  for (const side of ['blue', 'red'] as const) {
    const phase = runtime.phases[side];
    const current = runtime.teamPlans[side];
    const plan =
      current && isPlanStillValid(state, current)
        ? current
        : buildFreshPlan(state, side, phase);
    runtime.teamPlans[side] = plan;
    for (const [championId, assignment] of plan.assignments) {
      runtime.assignments.set(championId, assignment);
    }
  }
}

export function canChampionDefend(
  state: GameState,
  champion: ChampionEntity,
): boolean {
  const assignment = getMatchAiRuntime(state).assignments.get(champion.id);
  return assignment?.mission === 'anchor-defense';
}

export function assignmentLaneHint(
  state: GameState,
  champion: ChampionEntity,
): LaneId | null {
  return getMatchAiRuntime(state).assignments.get(champion.id)?.lane ?? null;
}
