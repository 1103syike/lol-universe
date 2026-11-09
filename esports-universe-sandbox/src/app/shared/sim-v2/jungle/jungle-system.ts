import { applyDamage } from '../combat/damage';
import { castSmite, hasSummoner, smiteDamageFor, summonerReady } from '../combat/summoner-spells';
import { grantExp, grantGold } from '../economy/economy';
import { dist } from '../map/pathfinding';
import { resolveStructureKill } from '../objectives/structures';
import type { ReplayRecorder } from '../replay/recorder';
import type { ChampionEntity, MonsterEntity } from '../state/entities';
import { allocEntityId, type GameState } from '../state/game-state';
import type { MonsterCampDefinition, MonsterUnitTemplate, Vec2 } from '../version/version-pack';
import { spawnScuttleShrine } from '../vision/vision';
import { jungleClearAttackPower, jungleClearProfile } from './jungle-clear-profile';

const MONSTER_ATTACK_INTERVAL_SEC = 1.4;
const SMALL_DESPAWN_OOC_SEC = 10;
const KRUG_SPLIT_PROTECT_SEC = 1.65;
const SCUTTLE_FLEE_DIST = 280;
const UNIT_OFFSETS: readonly Vec2[] = [
  { x: 0, y: 0 },
  { x: 55, y: -35 },
  { x: -50, y: -40 },
  { x: 70, y: 25 },
  { x: -65, y: 30 },
  { x: 20, y: 60 },
  { x: -25, y: 70 },
  { x: 90, y: -10 },
];

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

function campDefOf(state: GameState, campId: string): MonsterCampDefinition | undefined {
  return state.lockedPack.monsters.find((item) => item.id === campId);
}

function campHasAlive(state: GameState, campId: string): boolean {
  return state.monsters.some((monster) => monster.alive && monster.campId === campId);
}

function purgeDeadCampUnits(state: GameState, campId: string): void {
  for (let i = state.monsters.length - 1; i >= 0; i -= 1) {
    const monster = state.monsters[i];
    if (monster.campId === campId && !monster.alive) {
      state.monsters.splice(i, 1);
    }
  }
}

function offsetAround(origin: Vec2, index: number): Vec2 {
  const offset = UNIT_OFFSETS[index % UNIT_OFFSETS.length];
  return { x: origin.x + offset.x, y: origin.y + offset.y };
}

function monsterLevelScale(state: GameState): number {
  const avg =
    state.champions.length === 0
      ? 1
      : state.champions.reduce((sum, champ) => sum + champ.level, 0) / state.champions.length;
  const monsterLevel = Math.max(1, Math.round(avg));
  return 1 + (monsterLevel - 1) * 0.035;
}

function createMonsterEntity(
  state: GameState,
  camp: MonsterCampDefinition,
  template: MonsterUnitTemplate,
  position: Vec2,
): MonsterEntity {
  const scale = monsterLevelScale(state);
  return {
    id: allocEntityId(state, 'monster'),
    kind: 'monster',
    campId: camp.id,
    unitKind: template.kind,
    size: template.size,
    position: { ...position },
    hp: Math.round(template.hp * (0.92 + scale * 0.08)),
    maxHp: Math.round(template.hp * (0.92 + scale * 0.08)),
    ad: template.ad,
    alive: true,
    gold: template.gold,
    exp: Math.round(template.exp * scale),
    csValue: template.cs,
    splitsInto: template.splitsInto ? { ...template.splitsInto } : null,
    aggroTargetId: null,
    nextAttackAt: 0,
    lastCombatAt: 0,
    spawnProtectUntil: 0,
    respawnAt: 0,
  };
}

function spawnUnitsFromTemplate(
  state: GameState,
  camp: MonsterCampDefinition,
  template: MonsterUnitTemplate,
  startIndex: number,
): number {
  let index = startIndex;
  for (let i = 0; i < template.count; i += 1) {
    state.monsters.push(
      createMonsterEntity(state, camp, template, offsetAround(camp.position, index)),
    );
    index += 1;
  }
  return index;
}

function spawnCamp(state: GameState, campId: string): void {
  const camp = campDefOf(state, campId);
  if (!camp) {
    return;
  }
  if (campHasAlive(state, camp.id)) {
    return;
  }
  purgeDeadCampUnits(state, camp.id);
  let index = 0;
  for (const template of camp.units) {
    index = spawnUnitsFromTemplate(state, camp, template, index);
  }
}

function spawnSplitUnits(state: GameState, parent: MonsterEntity): void {
  if (!parent.splitsInto) {
    return;
  }
  const camp = campDefOf(state, parent.campId);
  if (!camp) {
    return;
  }
  const split = parent.splitsInto;
  parent.splitsInto = null;
  for (let i = 0; i < split.count; i += 1) {
    const monster = createMonsterEntity(
      state,
      camp,
      {
        kind: split.kind,
        count: 1,
        hp: split.hp,
        ad: split.ad,
        gold: split.gold,
        exp: split.exp,
        cs: split.cs,
        size: 'small',
      },
      offsetAround(parent.position, i + 1),
    );
    monster.aggroTargetId = parent.aggroTargetId;
    monster.lastCombatAt = state.scheduler.time;
    monster.spawnProtectUntil = state.scheduler.time + KRUG_SPLIT_PROTECT_SEC;
    state.monsters.push(monster);
  }
}

function fleeScuttle(state: GameState, scuttle: MonsterEntity, from: ChampionEntity): void {
  if (scuttle.unitKind !== 'rift_scuttler' || !scuttle.alive) {
    return;
  }
  const dx = scuttle.position.x - from.position.x;
  const dy = scuttle.position.y - from.position.y;
  const len = Math.hypot(dx, dy) || 1;
  scuttle.position = {
    x: scuttle.position.x + (dx / len) * SCUTTLE_FLEE_DIST,
    y: scuttle.position.y + (dy / len) * SCUTTLE_FLEE_DIST,
  };
}

function splashCampDamage(
  state: GameState,
  champion: ChampionEntity,
  primary: MonsterEntity,
  amount: number,
  recorder?: ReplayRecorder,
): void {
  if (amount <= 0) {
    return;
  }
  for (const monster of state.monsters) {
    if (!monster.alive || monster.id === primary.id || monster.campId !== primary.campId) {
      continue;
    }
    if (monster.spawnProtectUntil > state.scheduler.time) {
      continue;
    }
    if (dist(primary.position, monster.position) > 380) {
      continue;
    }
    const splashScale = monster.unitKind === 'mini_krug' ? 0.08 : monster.size === 'small' ? 0.85 : 1;
    applyDamage(state, champion, monster, amount * splashScale, 'physical', recorder, 'camp');
    monster.aggroTargetId = champion.id;
    if (!monster.alive) {
      creditMonsterKill(state, champion, monster, recorder);
      spawnSplitUnits(state, monster);
    }
  }
}

function markCampCombat(state: GameState, campId: string, time: number): void {
  for (const monster of state.monsters) {
    if (monster.alive && monster.campId === campId) {
      monster.lastCombatAt = time;
    }
  }
}

function despawnLeftoverSmalls(state: GameState, campId: string): void {
  const largeAlive = state.monsters.some(
    (monster) => monster.alive && monster.campId === campId && monster.size === 'large',
  );
  if (largeAlive) {
    return;
  }
  const leftovers = state.monsters.filter(
    (monster) =>
      monster.alive &&
      monster.campId === campId &&
      (monster.size === 'small' || monster.size === 'medium'),
  );
  if (leftovers.length === 0) {
    return;
  }
  const newestCombat = leftovers.reduce(
    (max, monster) => Math.max(max, monster.lastCombatAt),
    0,
  );
  if (state.scheduler.time - newestCombat < SMALL_DESPAWN_OOC_SEC) {
    return;
  }
  for (const monster of leftovers) {
    monster.alive = false;
    monster.hp = 0;
    monster.aggroTargetId = null;
  }
  if (!campHasAlive(state, campId)) {
    const camp = campDefOf(state, campId);
    if (camp) {
      scheduleCampRespawn(state, camp);
    }
  }
}

function scheduleCampRespawn(state: GameState, camp: MonsterCampDefinition): void {
  if (camp.id === 'baron' || camp.id === 'dragon' || camp.id === 'herald') {
    return;
  }
  const respawnAt = state.scheduler.time + camp.respawnSec;
  state.scheduler.schedule(respawnAt, `camp_respawn_${camp.id}_${respawnAt}`, () => {
    spawnCamp(state, camp.id);
  });
}

function resolveCampCleared(
  state: GameState,
  champion: ChampionEntity,
  monster: MonsterEntity,
  recorder?: ReplayRecorder,
): void {
  if (campHasAlive(state, monster.campId)) {
    return;
  }
  champion.campKills += 1;
  const camp = campDefOf(state, monster.campId);
  if (!camp) {
    return;
  }
  if (camp.id === 'dragon') {
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
    return;
  }
  if (camp.id === 'baron') {
    const team = champion.side === 'blue' ? state.blue : state.red;
    team.hasBaron = true;
    state.scheduler.schedule(state.scheduler.time + 180, 'baron_buff_end', () => {
      team.hasBaron = false;
    });
    return;
  }
  if (camp.id === 'herald') {
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
      state.scheduler.time + camp.respawnSec,
      'herald_respawn',
      () => spawnCamp(state, 'herald'),
    );
    return;
  }
  scheduleCampRespawn(state, camp);
}

function averageChampionLevel(state: GameState): number {
  if (state.champions.length === 0) {
    return 1;
  }
  let total = 0;
  for (const champ of state.champions) {
    total += champ.level;
  }
  return total / state.champions.length;
}

function junglePetBonusExp(
  state: GameState,
  champion: ChampionEntity,
  monster: MonsterEntity,
): number {
  if (champion.positionLabel !== 'JUNGLE' || !hasSummoner(champion, 'Smite')) {
    return 0;
  }
  if (monster.size !== 'large') {
    return 0;
  }
  if (
    monster.campId === 'dragon' ||
    monster.campId === 'baron' ||
    monster.campId === 'herald'
  ) {
    return 0;
  }
  let bonus = 80;
  if (!champion.junglePetFirstLargeClaimed) {
    bonus += 150;
    champion.junglePetFirstLargeClaimed = true;
  }
  const deficit = averageChampionLevel(state) - champion.level;
  if (deficit > 1.1) {
    bonus += Math.round(deficit) * 50;
  }
  return bonus;
}

function grantEpicGlobalGold(
  state: GameState,
  killer: ChampionEntity,
  monster: MonsterEntity,
  recorder?: ReplayRecorder,
): void {
  let globalGold = 0;
  let localBonus = 0;
  if (monster.campId === 'baron') {
    globalGold = 150;
    localBonus = 100;
  } else if (monster.campId === 'dragon') {
    globalGold = 25;
    localBonus = 25;
  } else if (monster.campId === 'herald') {
    globalGold = 0;
    localBonus = monster.gold;
  } else {
    return;
  }
  for (const ally of state.champions) {
    if (!ally.alive || ally.side !== killer.side) {
      continue;
    }
    if (globalGold > 0) {
      grantGold(state, ally, globalGold, 'objective', recorder);
    }
  }
  if (localBonus > 0) {
    grantGold(state, killer, localBonus, 'objective', recorder);
  }
}

function creditMonsterKill(
  state: GameState,
  champion: ChampionEntity,
  monster: MonsterEntity,
  recorder?: ReplayRecorder,
): void {
  champion.cs += monster.csValue;
  const isEpic =
    monster.campId === 'dragon' ||
    monster.campId === 'baron' ||
    monster.campId === 'herald';
  if (isEpic) {
    grantEpicGlobalGold(state, champion, monster, recorder);
  } else {
    grantGold(state, champion, monster.gold, 'camp', recorder);
  }
  grantExp(state, champion, monster.exp, recorder, 'camp');
  const petBonus = junglePetBonusExp(state, champion, monster);
  if (petBonus > 0) {
    grantExp(state, champion, petBonus, recorder, 'jungle_pet');
  }
  if (monster.unitKind === 'rift_scuttler') {
    spawnScuttleShrine(state, champion, monster.position, recorder);
  }
  const assistRange =
    monster.campId === 'dragon' || monster.campId === 'baron' || monster.campId === 'herald'
      ? 1200
      : 700;
  const assistIds = state.champions
    .filter(
      (ally) =>
        ally.alive &&
        ally.side === champion.side &&
        ally.id !== champion.id &&
        ally.recallPhase === 'none' &&
        dist(ally.position, monster.position) < assistRange,
    )
    .map((ally) => ally.id);
  recorder?.record(state, {
    type: 'camp_kill',
    actorId: champion.id,
    targetId: monster.id,
    payload: {
      campId: monster.campId,
      unitKind: monster.unitKind,
      cs: champion.cs,
      gold: monster.gold,
      petBonus,
      assistIds,
    },
  });
}

export function tickMonsters(state: GameState, recorder?: ReplayRecorder): void {
  const campIds = new Set(state.monsters.map((monster) => monster.campId));
  for (const campId of campIds) {
    despawnLeftoverSmalls(state, campId);
  }

  for (const monster of state.monsters) {
    if (!monster.alive || monster.ad <= 0) {
      continue;
    }
    if (!monster.aggroTargetId) {
      const nearby = state.champions.find(
        (champ) => champ.alive && dist(champ.position, monster.position) < 500,
      );
      if (nearby) {
        monster.aggroTargetId = nearby.id;
        markCampCombat(state, monster.campId, state.scheduler.time);
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
      const towardJungler =
        target.positionLabel === 'JUNGLE' && hasSummoner(target, 'Smite') ? 0.5 : 1;
      applyDamage(
        state,
        null,
        target,
        monster.ad * 0.45 * towardJungler,
        'physical',
        recorder,
        'monster',
      );
      monster.nextAttackAt = state.scheduler.time + MONSTER_ATTACK_INTERVAL_SEC;
      markCampCombat(state, monster.campId, state.scheduler.time);
    }
  }
}

export function attackCamp(
  state: GameState,
  champion: ChampionEntity,
  monster: MonsterEntity,
  recorder?: ReplayRecorder,
): boolean {
  if (!champion.alive || !monster.alive) {
    return false;
  }
  if (monster.spawnProtectUntil > state.scheduler.time) {
    return false;
  }
  if (dist(champion.position, monster.position) > champion.attackRange + 40) {
    return false;
  }
  const now = state.scheduler.time;
  if (now < champion.nextAttackAt) {
    const campSplitting = state.monsters.some(
      (item) => item.campId === monster.campId && item.spawnProtectUntil > now,
    );
    const smiteDmg = smiteDamageFor(champion);
    const smiteOkTarget =
      monster.size === 'large' ||
      monster.size === 'medium' ||
      monster.unitKind === 'rift_scuttler';
    const smiteOkNow =
      monster.unitKind === 'rift_scuttler' ? monster.hp <= smiteDmg * 1.2 : true;
    if (
      !campSplitting &&
      champion.positionLabel === 'JUNGLE' &&
      hasSummoner(champion, 'Smite') &&
      !!summonerReady(state, champion, 'Smite') &&
      smiteOkTarget &&
      smiteOkNow
    ) {
      castSmite(state, champion, monster, recorder);
      monster.aggroTargetId = champion.id;
      markCampCombat(state, monster.campId, now);
      fleeScuttle(state, monster, champion);
      if (!monster.alive) {
        creditMonsterKill(state, champion, monster, recorder);
        spawnSplitUnits(state, monster);
        resolveCampCleared(state, champion, monster, recorder);
      }
      return true;
    }
    return false;
  }

  const profile = jungleClearProfile(state, champion);
  const clearPower = jungleClearAttackPower(state, champion);
  const sizeMult =
    monster.size === 'large'
      ? profile.largeMult * 0.9
      : monster.size === 'medium'
        ? profile.autoMult
        : profile.autoMult * 1.08;
  const isScuttle = monster.unitKind === 'rift_scuttler';
  const isKrug =
    monster.unitKind === 'ancient_krug' ||
    monster.unitKind === 'krug' ||
    monster.unitKind === 'mini_krug';
  const scuttleTax = isScuttle ? 0.62 : 1;
  const krugTax =
    monster.unitKind === 'mini_krug' ? 0.78 : monster.unitKind === 'krug' ? 0.88 : isKrug ? 0.9 : 1;
  const campTax = scuttleTax * krugTax;
  const monsterAmp =
    champion.positionLabel === 'JUNGLE' && hasSummoner(champion, 'Smite') ? 1.18 : 1;
  const rawAuto = clearPower * sizeMult * campTax * monsterAmp;
  const petLevel = 20 + champion.level * 7.5;
  const pet =
    clearPower * 0.32 * profile.petMult * (isScuttle ? 0.55 : isKrug ? 0.85 : 1) +
    petLevel * profile.petMult * (isScuttle ? 0.55 : 1);
  const abilityPulse =
    clearPower *
    (0.9 + champion.skills.mechanics / 180) *
    profile.autoMult *
    (isScuttle ? 0.55 : isKrug ? 0.78 : 1.12);
  applyDamage(
    state,
    champion,
    monster,
    rawAuto + pet + abilityPulse,
    'physical',
    recorder,
    'camp',
  );
  champion.nextAttackAt = now + 1 / Math.max(0.55, champion.attackSpeed);

  const campmates = state.monsters.filter(
    (item) => item.alive && item.campId === monster.campId && item.id !== monster.id,
  ).length;
  if (campmates > 0) {
    splashCampDamage(
      state,
      champion,
      monster,
      (clearPower * 0.55 + abilityPulse * 0.35) * profile.aoeMult,
      recorder,
    );
  }

  const canSmiteTarget =
    monster.size === 'large' ||
    monster.size === 'medium' ||
    monster.unitKind === 'rift_scuttler';
  const smiteDmg = smiteDamageFor(champion);
  const smiteExecute = monster.hp <= smiteDmg * 1.2;
  const smiteOpen =
    monster.unitKind !== 'rift_scuttler' && monster.hp / monster.maxHp > 0.7;
  if (
    champion.positionLabel === 'JUNGLE' &&
    hasSummoner(champion, 'Smite') &&
    !!summonerReady(state, champion, 'Smite') &&
    monster.hp > 0 &&
    canSmiteTarget &&
    (smiteExecute || smiteOpen)
  ) {
    castSmite(state, champion, monster, recorder);
  }

  monster.aggroTargetId = champion.id;
  markCampCombat(state, monster.campId, now);
  fleeScuttle(state, monster, champion);
  if (!monster.alive) {
    creditMonsterKill(state, champion, monster, recorder);
    spawnSplitUnits(state, monster);
  }
  resolveCampCleared(state, champion, monster, recorder);
  return true;
}

function campSideOf(state: GameState, campId: string): 'blue' | 'red' | 'neutral' {
  return campDefOf(state, campId)?.side ?? 'neutral';
}

export function jungleOrbWalkPosition(
  champion: ChampionEntity,
  monster: MonsterEntity,
  timeSec: number,
): Vec2 {
  const reach = Math.max(90, champion.attackRange * 0.72);
  const angle = timeSec * 2.1 + (champion.id.length % 7) * 0.45;
  return {
    x: monster.position.x + Math.cos(angle) * reach,
    y: monster.position.y + Math.sin(angle) * reach,
  };
}

export function runJungleClearStep(
  state: GameState,
  champion: ChampionEntity,
  monster: MonsterEntity,
  moveTo: (target: Vec2) => void,
  recorder?: ReplayRecorder,
): void {
  const now = state.scheduler.time;
  const range = champion.attackRange + 40;
  const gap = dist(champion.position, monster.position);

  if (gap > range) {
    moveTo(monster.position);
    return;
  }

  attackCamp(state, champion, monster, recorder);
  if (!monster.alive) {
    return;
  }

  if (monster.unitKind === 'rift_scuttler') {
    moveTo(monster.position);
    return;
  }

  moveTo(jungleOrbWalkPosition(champion, monster, now));
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

function engagedCampId(state: GameState, champion: ChampionEntity): string | null {
  const now = state.scheduler.time;
  let bestId: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  const campIds = new Set(state.monsters.filter((monster) => monster.alive).map((m) => m.campId));
  for (const campId of campIds) {
    if (campId === 'dragon' || campId === 'baron' || campId === 'herald') {
      continue;
    }
    const units = state.monsters.filter((monster) => monster.alive && monster.campId === campId);
    if (units.length === 0) {
      continue;
    }
    const touched = units.some(
      (monster) =>
        monster.aggroTargetId === champion.id ||
        monster.hp < monster.maxHp - 1 ||
        now - monster.lastCombatAt < 12,
    );
    const incomplete =
      units.some((monster) => monster.size === 'small' || monster.size === 'medium') &&
      !units.some((monster) => monster.size === 'large');
    if (!touched && !incomplete) {
      continue;
    }
    const nearest = units.reduce(
      (best, monster) => Math.min(best, dist(champion.position, monster.position)),
      Number.POSITIVE_INFINITY,
    );
    if (nearest > 1400) {
      continue;
    }
    const score = nearest + (incomplete ? -500 : 0) + (touched ? -200 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestId = campId;
    }
  }
  return bestId;
}

export function nearestFriendlyCamp(
  state: GameState,
  champion: ChampionEntity,
): MonsterEntity | null {
  const enemySide = champion.side === 'blue' ? 'red' : 'blue';
  const t = state.scheduler.time;
  const lockedCampId = engagedCampId(state, champion);
  const ownCampAlive = state.monsters.some((monster) => {
    if (!monster.alive || monster.spawnProtectUntil > t) {
      return false;
    }
    if (monster.campId === 'dragon' || monster.campId === 'baron' || monster.campId === 'herald') {
      return false;
    }
    return campSideOf(state, monster.campId) === champion.side;
  });
  const expectedCamps =
    t < 180 ? 5 : t < 360 ? 9 : t < 600 ? 14 : t < 900 ? 20 : t < 1200 ? 26 : 32;
  const farmDebt = Math.max(0, expectedCamps - champion.campKills);
  const behindOnScore =
    champion.deaths >= champion.kills + 2 || (farmDebt >= 4 && champion.deaths > champion.kills);
  const canInvade =
    t >= 210 &&
    !behindOnScore &&
    ((ownCampAlive && farmDebt >= 2) || (!ownCampAlive && farmDebt <= 2) || t >= 720);
  let best: MonsterEntity | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const monster of state.monsters) {
    if (!monster.alive) {
      continue;
    }
    if (monster.spawnProtectUntil > state.scheduler.time) {
      continue;
    }
    if (monster.campId === 'dragon' || monster.campId === 'baron' || monster.campId === 'herald') {
      continue;
    }
    const side = campSideOf(state, monster.campId);
    if (side === enemySide && !canInvade) {
      continue;
    }
    const d = dist(champion.position, monster.position);
    const sideBias =
      side === champion.side
        ? 0
        : side === 'neutral'
          ? t < 210
            ? 360
            : 120
          : ownCampAlive
            ? farmDebt >= 2
              ? 420
              : 760
            : 160;
    const sizeBias = monster.size === 'large' ? -80 : monster.size === 'medium' ? -40 : 0;
    const lockBias =
      lockedCampId && monster.campId === lockedCampId
        ? -1400
        : lockedCampId
          ? 600
          : 0;
    const score = d + sideBias + sizeBias + lockBias;
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

export function objectiveSpawnSec(state: GameState, campId: string): number | null {
  const def = campDefOf(state, campId);
  if (!def) {
    return null;
  }
  return campId === 'baron' ? state.lockedPack.objectives.baronSpawnSec : def.firstSpawnSec;
}

export function isObjectiveSetupWindow(state: GameState, campId: string): boolean {
  const spawn = objectiveSpawnSec(state, campId);
  if (spawn == null) {
    return false;
  }
  const t = state.scheduler.time;
  return t >= spawn - 80 && t <= spawn + 70;
}

export function objectiveWindowBoost(state: GameState, campId: string): number {
  const def = campDefOf(state, campId);
  if (!def) {
    return 0;
  }
  const t = state.scheduler.time;
  const spawn = objectiveSpawnSec(state, campId);
  if (spawn != null && t >= spawn - 90 && t <= spawn + 180) {
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
