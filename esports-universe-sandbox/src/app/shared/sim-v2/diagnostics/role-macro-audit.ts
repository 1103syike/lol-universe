import { simulateV2Match, type SimulateV2Input } from '../engine';
import { dist } from '../map/pathfinding';
import type { ReplayDocument, ReplayEvent } from '../replay/recorder';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';

type Role = 'TOP' | 'JUNGLE' | 'MID' | 'BOT' | 'SUPPORT';

function roster(side: 'blue' | 'red') {
  return (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) => ({
    playerId: `${side}_${position}`,
    gamertag: `${side}_${position}`,
    position,
    championId:
      position === 'TOP'
        ? 'Garen'
        : position === 'JUNGLE'
          ? 'LeeSin'
          : position === 'MID'
            ? 'Annie'
            : position === 'BOT'
              ? 'Ashe'
              : 'Thresh',
    laning: 72,
    mechanics: 70,
    teamfighting: 70,
    gameSense: 74,
    consistency: 68,
    adaptability: 65,
  }));
}

function input(seed: number, maxDurationSec = 1800): SimulateV2Input {
  return {
    versionId: 'demo-a',
    seed,
    blueTeamId: 'blue',
    redTeamId: 'red',
    blue: roster('blue'),
    red: roster('red'),
    maxDurationSec,
  };
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function byRole(state: GameState, role: Role): ChampionEntity[] {
  return state.champions.filter((champ) => champ.positionLabel === role);
}

function teamKillsOf(state: GameState, side: ChampionEntity['side']): number {
  return state.champions
    .filter((champ) => champ.side === side)
    .reduce((sum, champ) => sum + champ.kills, 0);
}

function kpOf(champ: ChampionEntity, state: GameState): number {
  const team = teamKillsOf(state, champ.side);
  return team <= 0 ? 0 : (champ.kills + champ.assists) / team;
}

function laneCenter(state: GameState, lane: 'top' | 'mid' | 'bot') {
  const path = state.lockedPack.map.lanePaths[lane];
  if (!path || path.length === 0) {
    return { x: 7500, y: 7500 };
  }
  return path[Math.floor(path.length / 2)];
}

function objectivePoint(state: GameState, id: 'dragon' | 'baron' | 'herald') {
  if (id === 'dragon') {
    return state.lockedPack.objectives.dragonPosition;
  }
  if (id === 'baron') {
    return state.lockedPack.objectives.baronPosition;
  }
  return state.lockedPack.objectives.heraldPosition;
}

interface FightCluster {
  t: number;
  x: number;
  y: number;
  deaths: number;
  nearDragon: boolean;
  nearBaron: boolean;
  nearHerald: boolean;
  roles: Record<Role, number>;
}

function buildFightClusters(replay: ReplayDocument, state: GameState): FightCluster[] {
  const deaths = replay.events.filter((event) => event.type === 'death');
  const clusters: FightCluster[] = [];
  const dragon = objectivePoint(state, 'dragon');
  const baron = objectivePoint(state, 'baron');
  const herald = objectivePoint(state, 'herald');

  for (const death of deaths) {
    const t = death.t ?? 0;
    const x = death.x ?? 7500;
    const y = death.y ?? 7500;
    let cluster = clusters.find(
      (item) => Math.abs(item.t - t) <= 18 && dist({ x: item.x, y: item.y }, { x, y }) <= 1600,
    );
    if (!cluster) {
      cluster = {
        t,
        x,
        y,
        deaths: 0,
        nearDragon: false,
        nearBaron: false,
        nearHerald: false,
        roles: { TOP: 0, JUNGLE: 0, MID: 0, BOT: 0, SUPPORT: 0 },
      };
      clusters.push(cluster);
    }
    cluster.deaths += 1;
    cluster.x = (cluster.x * (cluster.deaths - 1) + x) / cluster.deaths;
    cluster.y = (cluster.y * (cluster.deaths - 1) + y) / cluster.deaths;
    cluster.nearDragon = dist(cluster, dragon) < 2200;
    cluster.nearBaron = dist(cluster, baron) < 2200;
    cluster.nearHerald = dist(cluster, herald) < 2200;

    const victim = state.champions.find((champ) => champ.id === death.actorId);
    const killer = state.champions.find((champ) => champ.id === death.targetId);
    for (const champ of [victim, killer]) {
      if (!champ) {
        continue;
      }
      const role = champ.positionLabel as Role;
      if (role in cluster.roles) {
        cluster.roles[role] += 1;
      }
    }
    const snap = replay.snapshots.find((item) => Math.abs(item.t - t) <= 2) ??
      replay.snapshots.reduce<(typeof replay.snapshots)[number] | null>((best, item) => {
        if (!best) {
          return item;
        }
        return Math.abs(item.t - t) < Math.abs(best.t - t) ? item : best;
      }, null);
    if (snap) {
      for (const row of snap.champions) {
        if (!row.alive) {
          continue;
        }
        if (dist({ x: row.x, y: row.y }, { x: cluster.x, y: cluster.y }) > 1400) {
          continue;
        }
        const role = row.positionLabel as Role;
        if (role in cluster.roles) {
          cluster.roles[role] += 1;
        }
      }
    }
  }
  return clusters;
}

function pathWeirdFlags(
  champ: ChampionEntity,
  replay: ReplayDocument,
  state: GameState,
): string[] {
  const flags: string[] = [];
  const snaps = replay.snapshots.filter((_, index) => index % 15 === 0);
  let fountainLingers = 0;
  let enemyBaseDeep = 0;
  let oppositeLane = 0;
  const fountain =
    champ.side === 'blue' ? state.lockedPack.map.blueFountain : state.lockedPack.map.redFountain;
  const enemyFountain =
    champ.side === 'blue' ? state.lockedPack.map.redFountain : state.lockedPack.map.blueFountain;
  const home =
    champ.positionLabel === 'TOP'
      ? 'top'
      : champ.positionLabel === 'BOT' || champ.positionLabel === 'SUPPORT'
        ? 'bot'
        : champ.positionLabel === 'MID'
          ? 'mid'
          : null;
  const homeCenter = home ? laneCenter(state, home) : null;
  const crossCenter =
    home === 'top' ? laneCenter(state, 'bot') : home === 'bot' ? laneCenter(state, 'top') : null;

  for (const snap of snaps) {
    const row = snap.champions.find((item) => item.id === champ.id);
    if (!row || !row.alive) {
      continue;
    }
    const pos = { x: row.x, y: row.y };
    if (dist(pos, fountain) < 900 && snap.t > 120 && snap.t < state.scheduler.time - 60) {
      fountainLingers += 1;
    }
    if (dist(pos, enemyFountain) < 1800 && snap.t < 720) {
      enemyBaseDeep += 1;
    }
    if (
      crossCenter &&
      homeCenter &&
      champ.positionLabel !== 'JUNGLE' &&
      champ.positionLabel !== 'SUPPORT' &&
      snap.t > 180 &&
      snap.t < 540 &&
      dist(pos, crossCenter) + 900 < dist(pos, homeCenter)
    ) {
      oppositeLane += 1;
    }
  }
  if (fountainLingers >= 8) {
    flags.push('fountain_linger');
  }
  if (enemyBaseDeep >= 3) {
    flags.push('early_enemy_base');
  }
  if (oppositeLane >= 10) {
    flags.push('wrong_lane_early');
  }
  return flags;
}

export interface RoleAuditRow {
  role: Role;
  avgDamage: number;
  avgKp: number;
  avgCs: number;
  avgCampKills: number;
  avgVision: number;
  avgWards: number;
  fightPresence: number;
  dragonPresence: number;
  rotatePresence: number;
  pathFlags: string[];
  damageFlags: string[];
}

export interface JungleFocusAudit {
  avgCampKills: number;
  avgCampKillsBy12: number;
  avgFirstGankSec: number;
  avgGankDecisions: number;
  avgDamage: number;
  clearPaceNote: string;
}

export interface FightTypeAudit {
  objectiveFights: number;
  regularFights: number;
  avgObjDeaths: number;
  avgRegularDeaths: number;
  avgObjRolesPresent: number;
  avgRegularRolesPresent: number;
  notes: string[];
}

export interface RoleMacroAudit {
  seeds: number[];
  roles: RoleAuditRow[];
  jungle: JungleFocusAudit;
  fights: FightTypeAudit;
  vision: {
    avgWardsPlaced: number;
    avgVisionScore: number;
    supportVisionShare: number;
  };
  anomalies: string[];
}

function firstGankSec(replay: ReplayDocument, junglerIds: Set<string>): number {
  for (const event of replay.events) {
    if (event.type !== 'ai_decision' || !event.actorId || !junglerIds.has(event.actorId)) {
      continue;
    }
    const action = String(event.payload?.['action'] ?? '');
    if (action === 'fight' || action === 'gank' || action === 'skirmish') {
      return event.t ?? 0;
    }
  }
  return -1;
}

function countGankDecisions(replay: ReplayDocument, junglerIds: Set<string>): number {
  return replay.events.filter((event) => {
    if (event.type !== 'ai_decision' || !event.actorId || !junglerIds.has(event.actorId)) {
      return false;
    }
    const action = String(event.payload?.['action'] ?? '');
    return action === 'fight' || action === 'gank' || action === 'skirmish';
  }).length;
}

function campKillsByTime(replay: ReplayDocument, junglerIds: Set<string>, beforeSec: number): number {
  const cleared = new Set<string>();
  for (const event of replay.events) {
    if (event.type !== 'camp_clear' || !event.actorId || !junglerIds.has(event.actorId)) {
      continue;
    }
    if ((event.t ?? 0) > beforeSec) {
      continue;
    }
    const campId = String(event.payload?.['campId'] ?? event.targetId ?? '');
    const campKills = Number(event.payload?.['campKills'] ?? NaN);
    if (!campId || !Number.isFinite(campKills)) {
      continue;
    }
    cleared.add(`${event.actorId}:${campId}:${campKills}`);
  }
  return cleared.size;
}

function rolePresentInCluster(cluster: FightCluster): number {
  return (Object.values(cluster.roles) as number[]).filter((count) => count > 0).length;
}

export function auditRoleMacro(
  seeds: readonly number[] = [91001, 42, 1000, 1100, 1200],
): RoleMacroAudit {
  const roleBuckets: Record<
    Role,
    {
      damage: number[];
      kp: number[];
      cs: number[];
      camps: number[];
      vision: number[];
      wards: number[];
      fight: number[];
      dragon: number[];
      rotate: number[];
      pathFlags: string[];
      damageFlags: string[];
    }
  > = {
    TOP: {
      damage: [],
      kp: [],
      cs: [],
      camps: [],
      vision: [],
      wards: [],
      fight: [],
      dragon: [],
      rotate: [],
      pathFlags: [],
      damageFlags: [],
    },
    JUNGLE: {
      damage: [],
      kp: [],
      cs: [],
      camps: [],
      vision: [],
      wards: [],
      fight: [],
      dragon: [],
      rotate: [],
      pathFlags: [],
      damageFlags: [],
    },
    MID: {
      damage: [],
      kp: [],
      cs: [],
      camps: [],
      vision: [],
      wards: [],
      fight: [],
      dragon: [],
      rotate: [],
      pathFlags: [],
      damageFlags: [],
    },
    BOT: {
      damage: [],
      kp: [],
      cs: [],
      camps: [],
      vision: [],
      wards: [],
      fight: [],
      dragon: [],
      rotate: [],
      pathFlags: [],
      damageFlags: [],
    },
    SUPPORT: {
      damage: [],
      kp: [],
      cs: [],
      camps: [],
      vision: [],
      wards: [],
      fight: [],
      dragon: [],
      rotate: [],
      pathFlags: [],
      damageFlags: [],
    },
  };

  const jungleCamps: number[] = [];
  const jungleCamps12: number[] = [];
  const jungleFirstGank: number[] = [];
  const jungleGankDecisions: number[] = [];
  const jungleDamage: number[] = [];
  let objFights = 0;
  let regularFights = 0;
  const objDeaths: number[] = [];
  const regularDeaths: number[] = [];
  const objRoles: number[] = [];
  const regularRoles: number[] = [];
  const wardsPlaced: number[] = [];
  const visionScores: number[] = [];
  const supportVision: number[] = [];
  const anomalies: string[] = [];

  for (const seed of seeds) {
    const { state, replay } = simulateV2Match(input(seed));
    const clusters = buildFightClusters(replay, state);
    const junglers = byRole(state, 'JUNGLE');
    const junglerIds = new Set(junglers.map((champ) => champ.id));

    jungleCamps.push(mean(junglers.map((champ) => champ.campKills)));
    jungleCamps12.push(campKillsByTime(replay, junglerIds, 720) / Math.max(1, junglers.length));
    const gankSec = firstGankSec(replay, junglerIds);
    if (gankSec >= 0) {
      jungleFirstGank.push(gankSec);
    }
    jungleGankDecisions.push(countGankDecisions(replay, junglerIds) / Math.max(1, junglers.length));
    jungleDamage.push(mean(junglers.map((champ) => champ.damageToChampions)));

    const matchWards = state.champions.reduce((sum, champ) => sum + champ.wardsPlaced, 0);
    wardsPlaced.push(matchWards);
    visionScores.push(mean(state.champions.map((champ) => champ.visionScore)));
    const supportScore = mean(byRole(state, 'SUPPORT').map((champ) => champ.visionScore));
    const totalVision = state.champions.reduce((sum, champ) => sum + champ.visionScore, 0);
    supportVision.push(totalVision <= 0 ? 0 : (supportScore * 2) / totalVision);

    if (matchWards < 4) {
      anomalies.push(`seed ${seed}: wards_low=${matchWards}`);
    }

    for (const role of Object.keys(roleBuckets) as Role[]) {
      const champs = byRole(state, role);
      for (const champ of champs) {
        const damage = champ.damageToChampions;
        const kp = kpOf(champ, state);
        roleBuckets[role].damage.push(damage);
        roleBuckets[role].kp.push(kp);
        roleBuckets[role].cs.push(champ.cs);
        roleBuckets[role].camps.push(champ.campKills);
        roleBuckets[role].vision.push(champ.visionScore);
        roleBuckets[role].wards.push(champ.wardsPlaced);

        const pathFlags = pathWeirdFlags(champ, replay, state);
        roleBuckets[role].pathFlags.push(...pathFlags);

        if (role !== 'SUPPORT' && role !== 'JUNGLE' && damage < 800 && state.scheduler.time > 1200) {
          roleBuckets[role].damageFlags.push('near_zero_damage');
          anomalies.push(`seed ${seed}: ${role} near_zero_damage=${Math.round(damage)}`);
        }
        if (role === 'JUNGLE' && damage < 400) {
          roleBuckets[role].damageFlags.push('near_zero_damage');
          anomalies.push(`seed ${seed}: jungle_zeroish_damage=${Math.round(damage)}`);
        }
        if (role === 'SUPPORT' && champ.deaths >= 8 && state.scheduler.time < 1500) {
          anomalies.push(`seed ${seed}: support_feed deaths=${champ.deaths}`);
        }
      }

      const roleFight = clusters.filter((cluster) => cluster.roles[role] > 0).length;
      const roleDragon = clusters.filter(
        (cluster) => cluster.nearDragon && cluster.roles[role] > 0,
      ).length;
      const dragonClusters = clusters.filter((cluster) => cluster.nearDragon).length;
      roleBuckets[role].fight.push(clusters.length <= 0 ? 0 : roleFight / clusters.length);
      roleBuckets[role].dragon.push(dragonClusters <= 0 ? 0 : roleDragon / dragonClusters);

      let rotateHits = 0;
      let rotateChances = 0;
      for (const cluster of clusters) {
        if (cluster.t < 480 || cluster.deaths < 2) {
          continue;
        }
        const topMid = laneCenter(state, 'top');
        const botMid = laneCenter(state, 'bot');
        const midMid = laneCenter(state, 'mid');
        const isSide =
          dist(cluster, topMid) < 1800 || dist(cluster, botMid) < 1800;
        if (!isSide || dist(cluster, midMid) < 1200) {
          continue;
        }
        rotateChances += 1;
        if (role === 'MID' || role === 'JUNGLE') {
          if (cluster.roles[role] > 0) {
            rotateHits += 1;
          }
        }
      }
      roleBuckets[role].rotate.push(rotateChances <= 0 ? 0 : rotateHits / rotateChances);
    }

    for (const cluster of clusters) {
      const isObj = cluster.nearDragon || cluster.nearBaron || cluster.nearHerald;
      if (isObj) {
        objFights += 1;
        objDeaths.push(cluster.deaths);
        objRoles.push(rolePresentInCluster(cluster));
      } else if (cluster.deaths >= 2) {
        regularFights += 1;
        regularDeaths.push(cluster.deaths);
        regularRoles.push(rolePresentInCluster(cluster));
      }
    }
  }

  const roles: RoleAuditRow[] = (Object.keys(roleBuckets) as Role[]).map((role) => ({
    role,
    avgDamage: Math.round(mean(roleBuckets[role].damage)),
    avgKp: Number(mean(roleBuckets[role].kp).toFixed(2)),
    avgCs: Number(mean(roleBuckets[role].cs).toFixed(1)),
    avgCampKills: Number(mean(roleBuckets[role].camps).toFixed(1)),
    avgVision: Number(mean(roleBuckets[role].vision).toFixed(1)),
    avgWards: Number(mean(roleBuckets[role].wards).toFixed(1)),
    fightPresence: Number(mean(roleBuckets[role].fight).toFixed(2)),
    dragonPresence: Number(mean(roleBuckets[role].dragon).toFixed(2)),
    rotatePresence: Number(mean(roleBuckets[role].rotate).toFixed(2)),
    pathFlags: [...new Set(roleBuckets[role].pathFlags)],
    damageFlags: [...new Set(roleBuckets[role].damageFlags)],
  }));

  const firstGankAvg = mean(jungleFirstGank);
  const jungle: JungleFocusAudit = {
    avgCampKills: Number(mean(jungleCamps).toFixed(1)),
    avgCampKillsBy12: Number(mean(jungleCamps12).toFixed(1)),
    avgFirstGankSec: jungleFirstGank.length ? Math.round(firstGankAvg) : -1,
    avgGankDecisions: Number(mean(jungleGankDecisions).toFixed(1)),
    avgDamage: Math.round(mean(jungleDamage)),
    clearPaceNote:
      mean(jungleCamps12) < 4
        ? '12分前刷野偏少'
        : mean(jungleCamps12) > 14
          ? '12分前刷野偏多、可能過貪'
          : '12分前刷野數合理',
  };

  if (jungle.avgFirstGankSec > 420 || jungle.avgFirstGankSec < 0) {
    anomalies.push(`jungle_first_gank_late=${jungle.avgFirstGankSec}`);
  }
  if (jungle.avgDamage < 1500) {
    anomalies.push(`jungle_avg_damage_low=${jungle.avgDamage}`);
  }
  if (jungle.avgCampKillsBy12 < 3) {
    anomalies.push(`jungle_camps_by_12_low=${jungle.avgCampKillsBy12}`);
  }

  const mid = roles.find((row) => row.role === 'MID');
  if (mid && mid.rotatePresence < 0.15 && mid.dragonPresence < 0.2) {
    anomalies.push(`mid_roam_low rotate=${mid.rotatePresence} dragon=${mid.dragonPresence}`);
  }
  const jg = roles.find((row) => row.role === 'JUNGLE');
  if (jg && jg.dragonPresence < 0.2) {
    anomalies.push(`jungle_dragon_low=${jg.dragonPresence}`);
  }
  const top = roles.find((row) => row.role === 'TOP');
  if (top && top.dragonPresence <= 0) {
    anomalies.push('top_never_dragon');
  }

  const fightNotes: string[] = [];
  const avgObjRoles = mean(objRoles);
  const avgRegRoles = mean(regularRoles);
  if (avgObjRoles + 0.4 < avgRegRoles) {
    fightNotes.push('資源團人數偏少（相對一般團）');
  }
  if (objFights === 0) {
    fightNotes.push('幾乎沒有龍／巴龍／預示者附近團戰');
  }
  if (regularFights === 0) {
    fightNotes.push('一般團戰樣本不足');
  }
  if (avgObjRoles >= avgRegRoles) {
    fightNotes.push('資源團人數>=一般團，集結感正常');
  }

  return {
    seeds: [...seeds],
    roles,
    jungle,
    fights: {
      objectiveFights: objFights,
      regularFights: regularFights,
      avgObjDeaths: Number(mean(objDeaths).toFixed(2)),
      avgRegularDeaths: Number(mean(regularDeaths).toFixed(2)),
      avgObjRolesPresent: Number(avgObjRoles.toFixed(2)),
      avgRegularRolesPresent: Number(avgRegRoles.toFixed(2)),
      notes: fightNotes,
    },
    vision: {
      avgWardsPlaced: Number(mean(wardsPlaced).toFixed(1)),
      avgVisionScore: Number(mean(visionScores).toFixed(1)),
      supportVisionShare: Number(mean(supportVision).toFixed(2)),
    },
    anomalies: [...new Set(anomalies)],
  };
}

export function formatRoleMacroAudit(audit: RoleMacroAudit): string {
  const lines: string[] = [];
  lines.push(`seeds=${audit.seeds.join(',')}`);
  lines.push(
    `vision wards/game=${audit.vision.avgWardsPlaced} visionScore=${audit.vision.avgVisionScore} supportShare=${audit.vision.supportVisionShare}`,
  );
  lines.push('role | dmg | kp | cs | camps | vision | wards | fight% | dragon% | rotate% | flags');
  for (const row of audit.roles) {
    const flags = [...row.pathFlags, ...row.damageFlags].join(',') || '-';
    lines.push(
      `${row.role.padEnd(7)} | ${row.avgDamage} | ${row.avgKp} | ${row.avgCs} | ${row.avgCampKills} | ${row.avgVision} | ${row.avgWards} | ${row.fightPresence} | ${row.dragonPresence} | ${row.rotatePresence} | ${flags}`,
    );
  }
  lines.push(
    `jungle camps=${audit.jungle.avgCampKills} by12=${audit.jungle.avgCampKillsBy12} firstGank=${audit.jungle.avgFirstGankSec}s gankActs=${audit.jungle.avgGankDecisions} dmg=${audit.jungle.avgDamage} (${audit.jungle.clearPaceNote})`,
  );
  lines.push(
    `fights obj=${audit.fights.objectiveFights}(deaths=${audit.fights.avgObjDeaths}, roles=${audit.fights.avgObjRolesPresent}) regular=${audit.fights.regularFights}(deaths=${audit.fights.avgRegularDeaths}, roles=${audit.fights.avgRegularRolesPresent})`,
  );
  for (const note of audit.fights.notes) {
    lines.push(`fight-note: ${note}`);
  }
  if (audit.anomalies.length === 0) {
    lines.push('anomalies: none');
  } else {
    lines.push(`anomalies (${audit.anomalies.length}):`);
    for (const item of audit.anomalies.slice(0, 24)) {
      lines.push(`- ${item}`);
    }
  }
  return lines.join('\n');
}

export type { ReplayEvent };
