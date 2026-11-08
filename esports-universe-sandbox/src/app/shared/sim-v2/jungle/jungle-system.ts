import { applyDamage } from '../combat/damage';
import { grantExp, grantGold } from '../economy/economy';
import { dist } from '../map/pathfinding';
import { resolveStructureKill } from '../objectives/structures';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MonsterEntity } from '../state/entities';
import { allocEntityId, type GameState } from '../state/game-state';

export function bootstrapCamps(state: GameState): void {
  for (const camp of state.lockedPack.monsters) {
    if (camp.id === 'baron') {
      continue;
    }
    state.scheduler.schedule(camp.firstSpawnSec, `camp_spawn_${camp.id}`, () => {
      spawnCamp(state, camp.id);
    });
  }
  state.scheduler.schedule(state.lockedPack.objectives.baronSpawnSec, 'baron_spawn', () => {
    spawnCamp(state, 'baron');
  });
}

function spawnCamp(state: GameState, campId: string): void {
  const camp = state.lockedPack.monsters.find((item) => item.id === campId);
  if (!camp) {
    return;
  }
  const existing = state.monsters.find((monster) => monster.campId === camp.id && monster.alive);
  if (existing) {
    return;
  }
  const monster: MonsterEntity = {
    id: allocEntityId(state, 'monster'),
    kind: 'monster',
    campId: camp.id,
    position: { ...camp.position },
    hp: camp.hp,
    maxHp: camp.hp,
    ad: camp.ad,
    alive: true,
    gold: camp.gold,
    exp: camp.exp,
    aggroTargetId: null,
    nextAttackAt: 0,
    respawnAt: 0,
  };
  state.monsters.push(monster);
}

const MONSTER_ATTACK_INTERVAL_SEC = 1.4;

export function tickMonsters(state: GameState, recorder?: ReplayRecorder): void {
  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }
    if (!monster.aggroTargetId) {
      const nearby = state.champions.find(
        (champ) => champ.alive && dist(champ.position, monster.position) < 500,
      );
      if (nearby) {
        monster.aggroTargetId = nearby.id;
      }
      continue;
    }
    const target = state.champions.find((champ) => champ.id === monster.aggroTargetId);
    if (!target || !target.alive || dist(target.position, monster.position) > 900) {
      monster.aggroTargetId = null;
      continue;
    }
    if (
      dist(target.position, monster.position) <= 175 &&
      state.scheduler.time >= monster.nextAttackAt
    ) {
      applyDamage(state, null, target, monster.ad * 0.4, 'physical', recorder, 'monster');
      monster.nextAttackAt = state.scheduler.time + MONSTER_ATTACK_INTERVAL_SEC;
    }
  }
}

export function attackCamp(
  state: GameState,
  champion: ChampionEntity,
  monster: MonsterEntity,
  recorder?: ReplayRecorder,
): void {
  if (!champion.alive || !monster.alive) {
    return;
  }
  if (dist(champion.position, monster.position) > champion.attackRange + 40) {
    return;
  }
  const clearBonus = champion.positionLabel === 'JUNGLE' ? 1.9 : 1;
  applyDamage(state, champion, monster, champion.ad * clearBonus, 'physical', recorder, 'camp');
  monster.aggroTargetId = champion.id;
  if (!monster.alive) {
    champion.campKills += 1;
    champion.cs += 6;
    const campGold =
      champion.positionLabel === 'JUNGLE' ? Math.round(monster.gold * 1.85) : monster.gold * 0.45;
    grantGold(state, champion, campGold, 'camp', recorder);
    grantExp(state, champion, monster.exp, recorder, 'camp');
    recorder?.record(state, {
      type: 'camp_kill',
      actorId: champion.id,
      targetId: monster.id,
      payload: { campId: monster.campId, cs: champion.cs },
    });
    const camp = state.lockedPack.monsters.find((item) => item.id === monster.campId);
    if (camp && camp.id !== 'baron' && camp.id !== 'dragon' && camp.id !== 'herald') {
      monster.respawnAt = state.scheduler.time + camp.respawnSec;
      state.scheduler.schedule(monster.respawnAt, `camp_respawn_${camp.id}`, () => {
        spawnCamp(state, camp.id);
      });
    }
    if (monster.campId === 'dragon') {
      const team = champion.side === 'blue' ? state.blue : state.red;
      team.dragonStacks += 1;
      if (team.dragonStacks >= 4) {
        team.hasSoul = true;
      }
      state.scheduler.schedule(
        state.scheduler.time + state.lockedPack.objectives.dragonRespawnSec,
        'dragon_respawn',
        () => spawnCamp(state, 'dragon'),
      );
    }
    if (monster.campId === 'baron') {
      const team = champion.side === 'blue' ? state.blue : state.red;
      team.hasBaron = true;
      state.scheduler.schedule(state.scheduler.time + 180, 'baron_buff_end', () => {
        team.hasBaron = false;
      });
    }
    if (monster.campId === 'herald') {
      const target = state.structures
        .filter(
          (structure) =>
            structure.alive &&
            structure.side !== champion.side &&
            (structure.structureKind === 'outer_tower' ||
              structure.structureKind === 'inner_tower' ||
              structure.structureKind === 'inhib_tower'),
        )
        .sort(
          (left, right) =>
            dist(champion.position, left.position) - dist(champion.position, right.position),
        )[0];
      if (target) {
        const charge = Math.min(target.hp, Math.max(900, target.maxHp * 0.35));
        target.hp = Math.max(0, target.hp - charge);
        recorder?.record(state, {
          type: 'structure_damage',
          actorId: champion.id,
          targetId: target.id,
          amount: charge,
          payload: { via: 'herald' },
        });
        if (target.hp <= 0) {
          target.alive = false;
          resolveStructureKill(state, target, champion, recorder);
        }
      }
      state.scheduler.schedule(
        state.scheduler.time + (camp?.respawnSec ?? 360),
        'herald_respawn',
        () => spawnCamp(state, 'herald'),
      );
    }
  }
}

function campSideOf(state: GameState, campId: string): 'blue' | 'red' | 'neutral' {
  return state.lockedPack.monsters.find((camp) => camp.id === campId)?.side ?? 'neutral';
}

export function nearestAliveCamp(
  state: GameState,
  champion: ChampionEntity,
): MonsterEntity | null {
  let best: MonsterEntity | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }
    const d = dist(champion.position, monster.position);
    if (d < bestDist) {
      best = monster;
      bestDist = d;
    }
  }
  return best;
}

export function nearestFriendlyCamp(
  state: GameState,
  champion: ChampionEntity,
): MonsterEntity | null {
  const enemySide = champion.side === 'blue' ? 'red' : 'blue';
  let best: MonsterEntity | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }
    if (monster.campId === 'dragon' || monster.campId === 'baron' || monster.campId === 'herald') {
      continue;
    }
    const side = campSideOf(state, monster.campId);
    if (side === enemySide && state.scheduler.time < 600) {
      continue;
    }
    const d = dist(champion.position, monster.position);
    const sideBias = side === champion.side ? 0 : side === 'neutral' ? 200 : 800;
    const score = d + sideBias;
    if (score < bestScore) {
      best = monster;
      bestScore = score;
    }
  }
  return best;
}

export function nearestObjectiveCamp(
  state: GameState,
  champion: ChampionEntity,
): MonsterEntity | null {
  let best: MonsterEntity | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }
    if (monster.campId !== 'dragon' && monster.campId !== 'baron' && monster.campId !== 'herald') {
      continue;
    }
    if (monster.campId === 'baron' && state.scheduler.time < state.lockedPack.objectives.baronSpawnSec) {
      continue;
    }
    const d = dist(champion.position, monster.position);
    const priority =
      monster.campId === 'baron' ? 0 : monster.campId === 'dragon' ? 80 : 120;
    const score = d + priority;
    if (score < bestScore) {
      best = monster;
      bestScore = score;
    }
  }
  return best;
}

export function objectiveWindowBoost(state: GameState, campId: string): number {
  const def = state.lockedPack.monsters.find((camp) => camp.id === campId);
  if (!def) {
    return 0;
  }
  const t = state.scheduler.time;
  const spawn =
    campId === 'baron' ? state.lockedPack.objectives.baronSpawnSec : def.firstSpawnSec;
  if (t >= spawn - 90 && t <= spawn + 180) {
    return 1;
  }
  const alive = state.monsters.some((monster) => monster.alive && monster.campId === campId);
  if (!alive) {
    return 0;
  }
  if (campId === 'baron' || campId === 'dragon') {
    return 0.9;
  }
  return 0.75;
}
