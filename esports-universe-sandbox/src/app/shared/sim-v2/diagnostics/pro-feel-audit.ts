import { setSimEngineMode } from '../index';
import { simulateGame } from '../../sim/match-engine';
import type { MatchReport } from '../../sim/report';
import type { Player } from '../../../core/models/player.model';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import { buildV2Input } from '../adapter/from-legacy-input';
import { toMatchReport } from '../adapter/to-match-report';
import type { ReplayDocument, ReplayEvent } from '../replay/recorder';
import type { ChampionEntity } from '../state/entities';
import type { GameState } from '../state/game-state';

export type MatchStrength = 'even' | 'advantage' | 'stomp';

function attr(n: number) {
  return { current: n, potential: n, growthRate: 0 };
}

function fakePlayer(
  id: string,
  position: Player['position'],
  teamId: string,
  rating: number,
): Player {
  return {
    id,
    displayName: id,
    gamertag: id,
    teamId,
    position,
    nationality: 'TW',
    birthday: '2004-01-01',
    form: rating,
    rarity: 'R',
    attributes: {
      laning: attr(rating),
      mechanics: attr(rating),
      teamfighting: attr(rating),
      gameSense: attr(rating),
      consistency: attr(rating),
      adaptability: attr(rating),
    },
    contract: {
      startDate: '2024-01-01',
      endDate: '2026-12-31',
      annualSalary: 100000,
    },
    careerRecords: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

function side(teamId: string, rating: number) {
  return {
    teamId,
    coach: null,
    players: (['TOP', 'JUNGLE', 'MID', 'BOT', 'SUPPORT'] as const).map((position) =>
      fakePlayer(`${teamId}_${position}`, position, teamId, rating),
    ),
  };
}

function ratingsFor(kind: MatchStrength): { home: number; away: number } {
  if (kind === 'even') {
    return { home: 72, away: 72 };
  }
  if (kind === 'advantage') {
    return { home: 82, away: 68 };
  }
  return { home: 95, away: 55 };
}

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function minuteOf(t: number): number {
  return Math.floor(t / 60);
}

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

export interface MatchDiag {
  strength: MatchStrength;
  seed: number;
  durationSec: number;
  endReason: string | null;
  forcedEnd: boolean;
  winnerSide: 'home' | 'away';
  killsHome: number;
  killsAway: number;
  totalKills: number;
  firstBloodSec: number | null;
  firstOuterTowerSec: number | null;
  firstDragonSec: number | null;
  firstBaronSec: number | null;
  dragons: number;
  barons: number;
  towers: number;
  teamfights: number;
  teamfightAvgParticipants: number;
  teamfightAvgKills: number;
  damageToChamps: number;
  abilityCasts: number;
  autoAttacks: number;
  abilityDamageShare: number;
  itemBuys: number;
  firstItemBuySec: number | null;
  avgFinalGold: number;
  goldGapEnd: number;
  aiActions: Record<string, number>;
  aiActionsByRole: Record<string, Record<string, number>>;
  actionsPerMinute: Record<number, Record<string, number>>;
  fightsPerMinute: Record<number, number>;
  objectiveWindowActions: {
    dragonMinus2: Record<string, number>;
    dragonPlus2: Record<string, number>;
    baronMinus2: Record<string, number>;
    baronPlus2: Record<string, number>;
  };
  structureHits: number;
  minionLastHitsApprox: number;
  abilityByChampion: Record<string, number>;
  levelsAtEnd: number[];
  campKills: number;
  recallCounts: number;
  activitySec: {
    lane: number;
    jungle: number;
    fight: number;
    recallTravel: number;
    recallBase: number;
    other: number;
  };
  activityShare: Record<string, number>;
  activityShareByRole: Record<string, Record<string, number>>;
  goldBySource: Record<string, number>;
  expBySource: Record<string, number>;
  levelCurve: Array<{ t: number; avgLevel: number }>;
}

function countBy<T>(items: T[], keyOf: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = keyOf(item);
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function bump(map: Record<string, number>, key: string, amount = 1): void {
  map[key] = (map[key] ?? 0) + amount;
}

function analyzeReplay(
  state: GameState,
  replay: ReplayDocument,
  report: MatchReport,
  strength: MatchStrength,
  seed: number,
): MatchDiag {
  const byChamp = new Map(state.champions.map((champ) => [champ.id, champ]));
  const aiActions: Record<string, number> = {};
  const aiActionsByRole: Record<string, Record<string, number>> = {};
  const actionsPerMinute: Record<number, Record<string, number>> = {};
  const fightsPerMinute: Record<number, number> = {};
  const abilityByChampion: Record<string, number> = {};
  const objectiveWindowActions = {
    dragonMinus2: {} as Record<string, number>,
    dragonPlus2: {} as Record<string, number>,
    baronMinus2: {} as Record<string, number>,
    baronPlus2: {} as Record<string, number>,
  };

  const dragonSpawn = state.lockedPack.objectives.dragonFirstSpawnSec;
  const baronSpawn = state.lockedPack.objectives.baronSpawnSec;

  let abilityCasts = 0;
  let autoAttacks = 0;
  let abilityDamage = 0;
  let autoDamage = 0;
  let structureHits = 0;
  let itemBuys = 0;
  let firstItemBuySec: number | null = null;
  let firstBloodSec: number | null = null;
  let firstOuterTowerSec: number | null = null;
  let firstDragonSec: number | null = null;
  let firstBaronSec: number | null = null;
  let dragons = 0;
  let barons = 0;
  let forcedEnd = false;
  let endReason: string | null = state.endReason;

  const deaths: ReplayEvent[] = [];

  for (const event of replay.events) {
    const minute = minuteOf(event.t);
    if (event.type === 'ai_decision') {
      const action = String(event.payload?.['action'] ?? 'unknown');
      bump(aiActions, action);
      actionsPerMinute[minute] ??= {};
      bump(actionsPerMinute[minute], action);
      const champ = byChamp.get(event.actorId ?? '');
      if (champ) {
        aiActionsByRole[champ.positionLabel] ??= {};
        bump(aiActionsByRole[champ.positionLabel], action);
      }
      const nearDragon = event.t >= dragonSpawn - 120 && event.t <= dragonSpawn + 120;
      const nearBaron = event.t >= baronSpawn - 120 && event.t <= baronSpawn + 120;
      if (nearDragon) {
        if (event.t < dragonSpawn) {
          bump(objectiveWindowActions.dragonMinus2, action);
        } else {
          bump(objectiveWindowActions.dragonPlus2, action);
        }
      }
      if (nearBaron) {
        if (event.t < baronSpawn) {
          bump(objectiveWindowActions.baronMinus2, action);
        } else {
          bump(objectiveWindowActions.baronPlus2, action);
        }
      }
    } else if (event.type === 'ability') {
      abilityCasts += 1;
      const champ = byChamp.get(event.actorId ?? '');
      if (champ) {
        bump(abilityByChampion, champ.championId);
      }
    } else if (event.type === 'attack') {
      autoAttacks += 1;
    } else if (event.type === 'damage') {
      const via = String(event.payload?.['via'] ?? '');
      if (via.startsWith('ability') || via.includes(':')) {
        abilityDamage += event.amount ?? 0;
      } else if (via === 'auto') {
        autoDamage += event.amount ?? 0;
      }
      if (via === 'siege' || via === 'tower') {
        structureHits += 1;
      }
    } else if (event.type === 'item_buy') {
      itemBuys += 1;
      if (firstItemBuySec === null) {
        firstItemBuySec = event.t;
      }
    } else if (event.type === 'death') {
      deaths.push(event);
      if (firstBloodSec === null) {
        firstBloodSec = event.t;
      }
      fightsPerMinute[minute] = (fightsPerMinute[minute] ?? 0) + 1;
    } else if (event.type === 'structure_kill') {
      const kind = String(event.payload?.['kind'] ?? '');
      if (kind === 'outer_tower' && firstOuterTowerSec === null) {
        firstOuterTowerSec = event.t;
      }
    } else if (event.type === 'camp_kill') {
      const campId = String(event.payload?.['campId'] ?? '');
      if (campId === 'dragon') {
        dragons += 1;
        if (firstDragonSec === null) {
          firstDragonSec = event.t;
        }
      }
      if (campId === 'baron') {
        barons += 1;
        if (firstBaronSec === null) {
          firstBaronSec = event.t;
        }
      }
    } else if (event.type === 'match_end') {
      const reason = String(event.payload?.['reason'] ?? '');
      if (reason === 'timeout') {
        endReason = 'timeout';
      } else if (reason === 'nexus') {
        endReason = 'nexus';
      } else if (reason === 'forced') {
        forcedEnd = true;
        endReason = reason;
      }
    }
  }

  const clusters: ReplayEvent[][] = [];
  const sortedDeaths = [...deaths].sort((a, b) => a.t - b.t);
  let i = 0;
  while (i < sortedDeaths.length) {
    const cluster = [sortedDeaths[i]];
    let j = i + 1;
    while (j < sortedDeaths.length && sortedDeaths[j].t - sortedDeaths[i].t <= 12) {
      cluster.push(sortedDeaths[j]);
      j += 1;
    }
    if (cluster.length >= 3) {
      clusters.push(cluster);
    }
    i = j > i + 1 ? j : i + 1;
  }

  const teamfightAvgKills = clusters.length
    ? mean(clusters.map((cluster) => cluster.length))
    : 0;
  const teamfightAvgParticipants = clusters.length
    ? mean(
        clusters.map((cluster) => {
          const ids = new Set<string>();
          for (const death of cluster) {
            if (death.actorId) {
              ids.add(death.actorId);
            }
            if (death.targetId) {
              ids.add(death.targetId);
            }
            const assists = (death.payload?.['assistPlayerIds'] as string[] | undefined) ?? [];
            for (const id of assists) {
              ids.add(id);
            }
          }
          return ids.size;
        }),
      )
    : 0;

  const totalAbilityAuto = abilityDamage + autoDamage;
  const activitySec = {
    lane: 0,
    jungle: 0,
    fight: 0,
    recallTravel: 0,
    recallBase: 0,
    other: 0,
  };
  const activityByRole: Record<string, Record<string, number>> = {};
  const goldBySource: Record<string, number> = {};
  const expBySource: Record<string, number> = {};
  let campKills = 0;
  let recallCounts = 0;
  const curveBuckets = new Map<number, number[]>();
  for (const champ of state.champions) {
    activitySec.lane += champ.activitySec.lane;
    activitySec.jungle += champ.activitySec.jungle;
    activitySec.fight += champ.activitySec.fight;
    activitySec.recallTravel += champ.activitySec.recallTravel;
    activitySec.recallBase += champ.activitySec.recallBase;
    activitySec.other += champ.activitySec.other;
    campKills += champ.campKills;
    recallCounts += champ.recallCount;
    activityByRole[champ.positionLabel] ??= {
      lane: 0,
      jungle: 0,
      fight: 0,
      recallTravel: 0,
      recallBase: 0,
      other: 0,
    };
    for (const [key, value] of Object.entries(champ.activitySec)) {
      bump(activityByRole[champ.positionLabel], key, value);
    }
    for (const [key, value] of Object.entries(champ.goldBySource)) {
      bump(goldBySource, key, value);
    }
    for (const [key, value] of Object.entries(champ.expBySource)) {
      bump(expBySource, key, value);
    }
    for (const sample of champ.levelSamples) {
      const bucket = Math.floor(sample.t / 60) * 60;
      const list = curveBuckets.get(bucket) ?? [];
      list.push(sample.level);
      curveBuckets.set(bucket, list);
    }
  }
  const activityTotal = Object.values(activitySec).reduce((sum, value) => sum + value, 0);
  const activityShare: Record<string, number> = {};
  for (const [key, value] of Object.entries(activitySec)) {
    activityShare[key] = Number((value / Math.max(1, activityTotal)).toFixed(3));
  }
  const activityShareByRole: Record<string, Record<string, number>> = {};
  for (const [role, values] of Object.entries(activityByRole)) {
    const total = Object.values(values).reduce((sum, value) => sum + value, 0);
    activityShareByRole[role] = {};
    for (const [key, value] of Object.entries(values)) {
      activityShareByRole[role][key] = Number((value / Math.max(1, total)).toFixed(3));
    }
  }
  const levelCurve = [...curveBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([t, levels]) => ({ t, avgLevel: Number(mean(levels).toFixed(2)) }));

  return {
    strength,
    seed,
    durationSec: report.boxScore.durationSec,
    endReason,
    forcedEnd,
    winnerSide: report.winnerTeamId === report.homeTeamId ? 'home' : 'away',
    killsHome: report.boxScore.home.kills,
    killsAway: report.boxScore.away.kills,
    totalKills: report.boxScore.home.kills + report.boxScore.away.kills,
    firstBloodSec,
    firstOuterTowerSec,
    firstDragonSec,
    firstBaronSec,
    dragons: Math.max(dragons, report.boxScore.home.dragons + report.boxScore.away.dragons),
    barons: Math.max(barons, report.boxScore.home.barons + report.boxScore.away.barons),
    towers: report.boxScore.home.towers + report.boxScore.away.towers,
    teamfights: clusters.length,
    teamfightAvgParticipants: Number(teamfightAvgParticipants.toFixed(2)),
    teamfightAvgKills: Number(teamfightAvgKills.toFixed(2)),
    damageToChamps: report.boxScore.players.reduce((sum, player) => sum + player.damageToChamps, 0),
    abilityCasts,
    autoAttacks,
    abilityDamageShare: totalAbilityAuto > 0 ? Number((abilityDamage / totalAbilityAuto).toFixed(3)) : 0,
    itemBuys,
    firstItemBuySec,
    avgFinalGold: Number(mean(report.boxScore.players.map((player) => player.gold)).toFixed(1)),
    goldGapEnd: Math.abs(report.boxScore.home.totalGold - report.boxScore.away.totalGold),
    aiActions,
    aiActionsByRole,
    actionsPerMinute,
    fightsPerMinute,
    objectiveWindowActions,
    structureHits,
    minionLastHitsApprox: report.boxScore.players.reduce((sum, player) => sum + player.cs, 0),
    abilityByChampion,
    levelsAtEnd: state.champions.map((champ: ChampionEntity) => champ.level),
    campKills,
    recallCounts,
    activitySec: {
      lane: Number(activitySec.lane.toFixed(1)),
      jungle: Number(activitySec.jungle.toFixed(1)),
      fight: Number(activitySec.fight.toFixed(1)),
      recallTravel: Number(activitySec.recallTravel.toFixed(1)),
      recallBase: Number(activitySec.recallBase.toFixed(1)),
      other: Number(activitySec.other.toFixed(1)),
    },
    activityShare,
    activityShareByRole,
    goldBySource: Object.fromEntries(
      Object.entries(goldBySource).map(([key, value]) => [key, Number(value.toFixed(1))]),
    ),
    expBySource: Object.fromEntries(
      Object.entries(expBySource).map(([key, value]) => [key, Number(value.toFixed(1))]),
    ),
    levelCurve,
  };
}

export function runV2DiagMatch(strength: MatchStrength, seed: number): MatchDiag {
  const ratings = ratingsFor(strength);
  const random = mulberry(seed);
  const input = {
    home: side('H', ratings.home),
    away: side('A', ratings.away),
    random,
    dateIso: '2024-06-01',
  };
  const v2Input: SimulateV2Input = buildV2Input(input, seed);
  const result = simulateV2Match(v2Input);
  const report = toMatchReport(result);
  return analyzeReplay(result.state, result.replay, report, strength, seed);
}

export function runV1Baseline(strength: MatchStrength, seed: number): {
  strength: MatchStrength;
  durationSec: number;
  totalKills: number;
  firstBloodSec: number | null;
  firstTowerSec: number | null;
  dragons: number;
  barons: number;
  towers: number;
  damageToChamps: number;
  goldGapEnd: number;
} {
  const prev = undefined;
  void prev;
  setSimEngineMode('v1');
  const ratings = ratingsFor(strength);
  const random = mulberry(seed);
  const report = simulateGame({
    home: side('H', ratings.home),
    away: side('A', ratings.away),
    random,
    dateIso: '2024-06-01',
  });
  setSimEngineMode('v2');
  const firstBlood = report.boxScore.timeline.find((event) => event.type === 'first-blood');
  const firstTower = report.boxScore.timeline.find((event) => event.type === 'tower');
  return {
    strength,
    durationSec: report.boxScore.durationSec,
    totalKills: report.boxScore.home.kills + report.boxScore.away.kills,
    firstBloodSec: firstBlood?.t ?? null,
    firstTowerSec: firstTower?.t ?? null,
    dragons: report.boxScore.home.dragons + report.boxScore.away.dragons,
    barons: report.boxScore.home.barons + report.boxScore.away.barons,
    towers: report.boxScore.home.towers + report.boxScore.away.towers,
    damageToChamps: report.boxScore.players.reduce((sum, player) => sum + player.damageToChamps, 0),
    goldGapEnd: Math.abs(report.boxScore.home.totalGold - report.boxScore.away.totalGold),
  };
}

export interface AggregateSlice {
  n: number;
  duration: { mean: number; median: number; p90: number };
  totalKills: { mean: number; median: number; p10: number; p90: number };
  firstBloodSec: { mean: number; median: number; missingPct: number };
  firstOuterTowerSec: { mean: number; median: number; missingPct: number };
  firstDragonSec: { mean: number; median: number; missingPct: number };
  firstBaronSec: { mean: number; median: number; missingPct: number };
  dragons: { mean: number };
  barons: { mean: number };
  towers: { mean: number };
  teamfights: { mean: number };
  teamfightAvgParticipants: { mean: number };
  teamfightAvgKills: { mean: number };
  damageToChamps: { mean: number };
  abilityCasts: { mean: number };
  autoAttacks: { mean: number };
  abilityDamageShare: { mean: number };
  forcedEndPct: number;
  avgFinalGold: { mean: number };
  goldGapEnd: { mean: number };
  aiActionShare: Record<string, number>;
  aiActionsByRole: Record<string, Record<string, number>>;
  objectiveWindowActions: MatchDiag['objectiveWindowActions'];
  levelsAtEnd: { mean: number };
  csTotal: { mean: number };
  campKills: { mean: number };
  recallCounts: { mean: number };
  activityShare: Record<string, number>;
  activityShareByRole: Record<string, Record<string, number>>;
  goldBySource: Record<string, number>;
  expBySource: Record<string, number>;
  itemBuys: { mean: number };
  firstItemBuySec: { mean: number; missingPct: number };
}

function aggregate(rows: MatchDiag[]): AggregateSlice {
  const durations = rows.map((row) => row.durationSec);
  const kills = rows.map((row) => row.totalKills);
  const fb = rows.map((row) => row.firstBloodSec).filter((value): value is number => value !== null);
  const ft = rows
    .map((row) => row.firstOuterTowerSec)
    .filter((value): value is number => value !== null);
  const fd = rows.map((row) => row.firstDragonSec).filter((value): value is number => value !== null);
  const fbaron = rows
    .map((row) => row.firstBaronSec)
    .filter((value): value is number => value !== null);
  const aiTotal = rows.reduce((sum, row) => {
    return sum + Object.values(row.aiActions).reduce((inner, value) => inner + value, 0);
  }, 0);
  const aiMerged: Record<string, number> = {};
  const roleMerged: Record<string, Record<string, number>> = {};
  const obj = {
    dragonMinus2: {} as Record<string, number>,
    dragonPlus2: {} as Record<string, number>,
    baronMinus2: {} as Record<string, number>,
    baronPlus2: {} as Record<string, number>,
  };
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.aiActions)) {
      bump(aiMerged, key, value);
    }
    for (const [role, actions] of Object.entries(row.aiActionsByRole)) {
      roleMerged[role] ??= {};
      for (const [action, value] of Object.entries(actions)) {
        bump(roleMerged[role], action, value);
      }
    }
    for (const [action, value] of Object.entries(row.objectiveWindowActions.dragonMinus2)) {
      bump(obj.dragonMinus2, action, value);
    }
    for (const [action, value] of Object.entries(row.objectiveWindowActions.dragonPlus2)) {
      bump(obj.dragonPlus2, action, value);
    }
    for (const [action, value] of Object.entries(row.objectiveWindowActions.baronMinus2)) {
      bump(obj.baronMinus2, action, value);
    }
    for (const [action, value] of Object.entries(row.objectiveWindowActions.baronPlus2)) {
      bump(obj.baronPlus2, action, value);
    }
  }
  const aiActionShare: Record<string, number> = {};
  for (const [key, value] of Object.entries(aiMerged)) {
    aiActionShare[key] = Number((value / Math.max(1, aiTotal)).toFixed(3));
  }
  const normalizeRole = (actions: Record<string, number>) => {
    const total = Object.values(actions).reduce((sum, value) => sum + value, 0);
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(actions)) {
      out[key] = Number((value / Math.max(1, total)).toFixed(3));
    }
    return out;
  };
  return {
    n: rows.length,
    duration: {
      mean: Number(mean(durations).toFixed(1)),
      median: Number(median(durations).toFixed(1)),
      p90: Number(percentile(durations, 0.9).toFixed(1)),
    },
    totalKills: {
      mean: Number(mean(kills).toFixed(2)),
      median: Number(median(kills).toFixed(2)),
      p10: Number(percentile(kills, 0.1).toFixed(2)),
      p90: Number(percentile(kills, 0.9).toFixed(2)),
    },
    firstBloodSec: {
      mean: Number(mean(fb).toFixed(1)),
      median: Number(median(fb).toFixed(1)),
      missingPct: Number((((rows.length - fb.length) / rows.length) * 100).toFixed(1)),
    },
    firstOuterTowerSec: {
      mean: Number(mean(ft).toFixed(1)),
      median: Number(median(ft).toFixed(1)),
      missingPct: Number((((rows.length - ft.length) / rows.length) * 100).toFixed(1)),
    },
    firstDragonSec: {
      mean: Number(mean(fd).toFixed(1)),
      median: Number(median(fd).toFixed(1)),
      missingPct: Number((((rows.length - fd.length) / rows.length) * 100).toFixed(1)),
    },
    firstBaronSec: {
      mean: Number(mean(fbaron).toFixed(1)),
      median: Number(median(fbaron).toFixed(1)),
      missingPct: Number((((rows.length - fbaron.length) / rows.length) * 100).toFixed(1)),
    },
    dragons: { mean: Number(mean(rows.map((row) => row.dragons)).toFixed(2)) },
    barons: { mean: Number(mean(rows.map((row) => row.barons)).toFixed(2)) },
    towers: { mean: Number(mean(rows.map((row) => row.towers)).toFixed(2)) },
    teamfights: { mean: Number(mean(rows.map((row) => row.teamfights)).toFixed(2)) },
    teamfightAvgParticipants: {
      mean: Number(mean(rows.map((row) => row.teamfightAvgParticipants)).toFixed(2)),
    },
    teamfightAvgKills: {
      mean: Number(mean(rows.map((row) => row.teamfightAvgKills)).toFixed(2)),
    },
    damageToChamps: {
      mean: Number(mean(rows.map((row) => row.damageToChamps)).toFixed(1)),
    },
    abilityCasts: { mean: Number(mean(rows.map((row) => row.abilityCasts)).toFixed(1)) },
    autoAttacks: { mean: Number(mean(rows.map((row) => row.autoAttacks)).toFixed(1)) },
    abilityDamageShare: {
      mean: Number(mean(rows.map((row) => row.abilityDamageShare)).toFixed(3)),
    },
    forcedEndPct: Number(
      ((rows.filter((row) => row.forcedEnd).length / rows.length) * 100).toFixed(1),
    ),
    avgFinalGold: { mean: Number(mean(rows.map((row) => row.avgFinalGold)).toFixed(1)) },
    goldGapEnd: { mean: Number(mean(rows.map((row) => row.goldGapEnd)).toFixed(1)) },
    aiActionShare,
    aiActionsByRole: Object.fromEntries(
      Object.entries(roleMerged).map(([role, actions]) => [role, normalizeRole(actions)]),
    ),
    objectiveWindowActions: obj,
    levelsAtEnd: {
      mean: Number(
        mean(rows.flatMap((row) => row.levelsAtEnd)).toFixed(2),
      ),
    },
    csTotal: { mean: Number(mean(rows.map((row) => row.minionLastHitsApprox)).toFixed(1)) },
    campKills: { mean: Number(mean(rows.map((row) => row.campKills)).toFixed(1)) },
    recallCounts: { mean: Number(mean(rows.map((row) => row.recallCounts)).toFixed(1)) },
    activityShare: (() => {
      const totals: Record<string, number> = {};
      for (const row of rows) {
        for (const [key, value] of Object.entries(row.activitySec)) {
          bump(totals, key, value);
        }
      }
      const sum = Object.values(totals).reduce((acc, value) => acc + value, 0);
      const out: Record<string, number> = {};
      for (const [key, value] of Object.entries(totals)) {
        out[key] = Number((value / Math.max(1, sum)).toFixed(3));
      }
      return out;
    })(),
    activityShareByRole: (() => {
      const merged: Record<string, Record<string, number>> = {};
      for (const row of rows) {
        for (const [role, values] of Object.entries(row.activityShareByRole)) {
          merged[role] ??= {};
          for (const [key, value] of Object.entries(values)) {
            bump(merged[role], key, value);
          }
        }
      }
      return Object.fromEntries(
        Object.entries(merged).map(([role, values]) => {
          const total = Object.values(values).reduce((sum, value) => sum + value, 0);
          const out: Record<string, number> = {};
          for (const [key, value] of Object.entries(values)) {
            out[key] = Number((value / Math.max(1, total)).toFixed(3));
          }
          return [role, out];
        }),
      );
    })(),
    goldBySource: (() => {
      const totals: Record<string, number> = {};
      for (const row of rows) {
        for (const [key, value] of Object.entries(row.goldBySource)) {
          bump(totals, key, value);
        }
      }
      const out: Record<string, number> = {};
      for (const [key, value] of Object.entries(totals)) {
        out[key] = Number((value / rows.length).toFixed(1));
      }
      return out;
    })(),
    expBySource: (() => {
      const totals: Record<string, number> = {};
      for (const row of rows) {
        for (const [key, value] of Object.entries(row.expBySource)) {
          bump(totals, key, value);
        }
      }
      const out: Record<string, number> = {};
      for (const [key, value] of Object.entries(totals)) {
        out[key] = Number((value / rows.length).toFixed(1));
      }
      return out;
    })(),
    itemBuys: { mean: Number(mean(rows.map((row) => row.itemBuys)).toFixed(1)) },
    firstItemBuySec: {
      mean: Number(
        mean(
          rows
            .map((row) => row.firstItemBuySec)
            .filter((value): value is number => value !== null),
        ).toFixed(1),
      ),
      missingPct: Number(
        (
          (rows.filter((row) => row.firstItemBuySec === null).length / Math.max(1, rows.length)) *
          100
        ).toFixed(1),
      ),
    },
  };
}

export function runProFeelAudit(seedsPerBucket = 4): {
  v2: Record<MatchStrength, AggregateSlice>;
  v1: Record<MatchStrength, ReturnType<typeof aggregateV1>>;
  samples: MatchDiag[];
} {
  const strengths: MatchStrength[] = ['even', 'advantage', 'stomp'];
  const samples: MatchDiag[] = [];
  const v2: Partial<Record<MatchStrength, AggregateSlice>> = {};
  const v1raw: Partial<Record<MatchStrength, ReturnType<typeof runV1Baseline>[]>> = {};

  for (const strength of strengths) {
    const rows: MatchDiag[] = [];
    const v1rows: ReturnType<typeof runV1Baseline>[] = [];
    for (let i = 0; i < seedsPerBucket; i += 1) {
      const seed = 1000 + strengths.indexOf(strength) * 100 + i * 17;
      rows.push(runV2DiagMatch(strength, seed));
      v1rows.push(runV1Baseline(strength, seed));
    }
    samples.push(...rows);
    v2[strength] = aggregate(rows);
    v1raw[strength] = v1rows;
  }

  return {
    v2: v2 as Record<MatchStrength, AggregateSlice>,
    v1: {
      even: aggregateV1(v1raw.even ?? []),
      advantage: aggregateV1(v1raw.advantage ?? []),
      stomp: aggregateV1(v1raw.stomp ?? []),
    },
    samples,
  };
}

function aggregateV1(rows: ReturnType<typeof runV1Baseline>[]) {
  return {
    n: rows.length,
    duration: {
      mean: Number(mean(rows.map((row) => row.durationSec)).toFixed(1)),
      median: Number(median(rows.map((row) => row.durationSec)).toFixed(1)),
    },
    totalKills: {
      mean: Number(mean(rows.map((row) => row.totalKills)).toFixed(2)),
      median: Number(median(rows.map((row) => row.totalKills)).toFixed(2)),
    },
    firstBloodSec: {
      mean: Number(
        mean(rows.map((row) => row.firstBloodSec).filter((value): value is number => value !== null)).toFixed(1),
      ),
    },
    firstTowerSec: {
      mean: Number(
        mean(rows.map((row) => row.firstTowerSec).filter((value): value is number => value !== null)).toFixed(1),
      ),
    },
    dragons: { mean: Number(mean(rows.map((row) => row.dragons)).toFixed(2)) },
    barons: { mean: Number(mean(rows.map((row) => row.barons)).toFixed(2)) },
    towers: { mean: Number(mean(rows.map((row) => row.towers)).toFixed(2)) },
    damageToChamps: { mean: Number(mean(rows.map((row) => row.damageToChamps)).toFixed(1)) },
    goldGapEnd: { mean: Number(mean(rows.map((row) => row.goldGapEnd)).toFixed(1)) },
  };
}

void countBy;
