import { CHAMPIONS } from '../../../core/data/champions';
import { COMP_INTENT_LABELS } from '../../../core/models/patch.model';
import type { PlayerPosition } from '../../../core/models/player.model';
import {
  deriveKeyPlayers,
  deriveNarrativeEvents,
  derivePhaseReports,
  deriveTurningPoints,
  isUpsetFromBox,
} from '../../sim/derive-from-box';
import { classifyMatchArchetypes } from '../../sim/match-archetype';
import type {
  KillContext,
  MatchBoxScore,
  MatchMapFrame,
  PlayerMatchStats,
  TeamMatchStats,
  TimelineEvent,
} from '../../sim/match-stats';
import {
  buildAdvantageSummary,
  buildDecisiveSummary,
  pickPrimaryReasonKey,
} from '../../sim/narrative';
import type { MatchDraftReport, MatchPhaseId, MatchReport } from '../../sim/report';
import type { TeamProfile } from '../../sim/team-profile';
import { dragonMarker } from '../../sim/timeline';
import type { SimulateV2Result } from '../engine';
import type { ChampionEntity, StructureEntity } from '../state/entities';
import type { GameState } from '../state/game-state';
import type { ReplayDocument } from '../replay/recorder';

function phaseAt(t: number): Exclude<MatchPhaseId, 'draft'> {
  if (t < 14 * 60) {
    return 'early';
  }
  if (t < 25 * 60) {
    return 'mid';
  }
  return 'late';
}

function clock(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}

function champNameZh(id: string): string {
  return CHAMPIONS.find((champion) => champion.id === id)?.nameZh ?? id;
}

function toPlayerStats(
  champ: ChampionEntity,
  teamKills: number,
  teamDamage: number,
  teamGold: number,
): PlayerMatchStats {
  const kpDenom = Math.max(1, teamKills);
  const damageDenom = Math.max(1, teamDamage);
  const goldDenom = Math.max(1, teamGold);
  const deaths = Math.max(1, champ.deaths);
  return {
    playerId: champ.playerId,
    teamId: champ.teamId,
    gamertag: champ.gamertag,
    position: champ.positionLabel as PlayerPosition,
    kills: champ.kills,
    deaths: champ.deaths,
    assists: champ.assists,
    damageToChamps: Math.round(champ.damageToChampions),
    gold: Math.round(champ.earnedGold),
    cs: champ.cs,
    visionScore: Math.round(champ.visionScore),
    kda: Number(((champ.kills + champ.assists) / deaths).toFixed(2)),
    kpPct: Number((((champ.kills + champ.assists) / kpDenom) * 100).toFixed(1)),
    damagePct: Number(((champ.damageToChampions / damageDenom) * 100).toFixed(1)),
    goldPct: Number(((champ.earnedGold / goldDenom) * 100).toFixed(1)),
    items: [...champ.items],
  };
}

function teamStats(state: GameState, side: 'blue' | 'red'): TeamMatchStats {
  const champs = state.champions.filter((champ) => champ.side === side);
  const team = side === 'blue' ? state.blue : state.red;
  return {
    teamId: team.teamId,
    kills: champs.reduce((sum, champ) => sum + champ.kills, 0),
    deaths: champs.reduce((sum, champ) => sum + champ.deaths, 0),
    towers: state.structures.filter(
      (structure) =>
        !structure.alive &&
        structure.side !== side &&
        (structure.structureKind.includes('tower') || structure.structureKind === 'nexus_tower'),
    ).length,
    dragons: team.dragonStacks,
    dragonSoul: team.hasSoul,
    barons: team.hasBaron ? 1 : 0,
    elders: 0,
    inhibitors: state.structures.filter(
      (structure) =>
        !structure.alive && structure.side !== side && structure.structureKind === 'inhibitor',
    ).length,
    totalGold: champs.reduce((sum, champ) => sum + Math.round(champ.earnedGold), 0),
  };
}

function sameLane(a: string, b: string): boolean {
  const lane = (position: string) => {
    if (position === 'TOP') {
      return 'top';
    }
    if (position === 'MID') {
      return 'mid';
    }
    if (position === 'BOT' || position === 'SUPPORT') {
      return 'bot';
    }
    return 'jungle';
  };
  return lane(a) === lane(b) && lane(a) !== 'jungle';
}

function killContextOf(
  killer: ChampionEntity | undefined,
  victim: ChampionEntity | undefined,
  assistPlayerIds: string[],
  champions: ChampionEntity[],
): KillContext {
  if (!killer || !victim) {
    return 'skirmish';
  }
  const assistViews = champions.filter((champ) => assistPlayerIds.includes(champ.playerId));
  const junglerHelp =
    killer.positionLabel === 'JUNGLE' ||
    assistViews.some((champ) => champ.positionLabel === 'JUNGLE');
  if (junglerHelp && victim.positionLabel !== 'JUNGLE') {
    return 'gank';
  }
  if (sameLane(killer.positionLabel, victim.positionLabel)) {
    return 'lane';
  }
  if (assistPlayerIds.length >= 2) {
    return 'teamfight';
  }
  return 'skirmish';
}

function towerTierOf(kind: string): 1 | 2 | 3 | 'nexus' | null {
  if (kind === 'outer_tower') {
    return 1;
  }
  if (kind === 'inner_tower') {
    return 2;
  }
  if (kind === 'inhib_tower') {
    return 3;
  }
  if (kind === 'nexus_tower') {
    return 'nexus';
  }
  return null;
}

function findSwing(phases: MatchReport['phases']): MatchPhaseId | null {
  let prev: string | null = null;
  for (const phase of phases) {
    if (!phase.leaderTeamId) {
      continue;
    }
    if (prev && prev !== phase.leaderTeamId) {
      return phase.id;
    }
    prev = phase.leaderTeamId;
  }
  return null;
}

function enrichKillStories(events: TimelineEvent[]): void {
  let firstBloodDone = false;
  for (const event of events) {
    if (event.type !== 'kill' && event.type !== 'first-blood' && event.type !== 'mistake') {
      continue;
    }
    if (!firstBloodDone && event.type !== 'mistake') {
      event.type = 'first-blood';
      firstBloodDone = true;
      if (!event.summary.includes('First Blood')) {
        event.summary = `${event.summary}（First Blood）`;
      }
    }
  }
}

function synthesizeTeamfights(events: TimelineEvent[]): TimelineEvent[] {
  const kills = events
    .filter((event) => event.type === 'kill' || event.type === 'first-blood' || event.type === 'mistake')
    .sort((left, right) => left.t - right.t);
  const extra: TimelineEvent[] = [];
  let index = 0;
  let seq = 9000;
  while (index < kills.length) {
    const start = kills[index];
    const cluster = [start];
    let cursor = index + 1;
    while (cursor < kills.length && kills[cursor].t - start.t <= 12) {
      cluster.push(kills[cursor]);
      cursor += 1;
    }
    if (cluster.length >= 3) {
      const teamCounts = new Map<string, number>();
      for (const kill of cluster) {
        if (!kill.teamId) {
          continue;
        }
        teamCounts.set(kill.teamId, (teamCounts.get(kill.teamId) ?? 0) + 1);
      }
      let winnerTeamId: string | null = null;
      let best = 0;
      for (const [teamId, count] of teamCounts) {
        if (count > best) {
          best = count;
          winnerTeamId = teamId;
        }
      }
      for (const kill of cluster) {
        kill.payload = { ...kill.payload, killContext: 'teamfight' };
      }
      extra.push({
        id: `v2_tf_${seq++}`,
        t: start.t,
        type: 'teamfight',
        phase: phaseAt(start.t),
        teamId: winnerTeamId,
        payload: { intensity: 'teamfight' },
        summary: `${clock(start.t)} · ${cluster.length} 人參與團戰`,
      });
    }
    index = cursor;
  }
  return [...events, ...extra].sort((left, right) => left.t - right.t);
}

function buildTimeline(state: GameState, replay: ReplayDocument, box: MatchBoxScore): TimelineEvent[] {
  const byEntity = new Map(state.champions.map((champ) => [champ.id, champ]));
  const byStructure = new Map(state.structures.map((structure) => [structure.id, structure]));
  const events: TimelineEvent[] = [];
  let seq = 1;

  const damageByPlayer: Record<string, number> = {};
  let homeDamage = 0;
  let awayDamage = 0;
  for (const player of box.players) {
    damageByPlayer[player.playerId] = player.damageToChamps;
    if (player.teamId === box.homeTeamId) {
      homeDamage += player.damageToChamps;
    } else {
      awayDamage += player.damageToChamps;
    }
  }
  if (homeDamage > 0 && awayDamage > 0) {
    events.push({
      id: `v2_${seq++}`,
      t: Math.max(60, Math.min(box.durationSec - 1, box.durationSec * 0.5)),
      phase: 'mid',
      type: 'combat',
      teamId: null,
      payload: { damageByPlayer, intensity: 'teamfight' },
      summary: `${clock(box.durationSec * 0.5)} · 戰鬥結算`,
    });
  }

  for (const event of replay.events) {
    if (event.type === 'death') {
      const victim = byEntity.get(event.actorId ?? '');
      const killer = byEntity.get(event.targetId ?? '');
      const assists = (event.payload?.['assistPlayerIds'] as string[] | undefined) ?? [];
      let context = killContextOf(killer, victim, assists, state.champions);
      if (assists.length === 0 && killer && victim && !sameLane(killer.positionLabel, victim.positionLabel)) {
        context = 'mistake';
      }
      const killerName = killer ? `${killer.positionLabel} ${killer.gamertag}` : '敵方';
      const victimName = victim ? `${victim.positionLabel} ${victim.gamertag}` : '選手';
      const summary =
        context === 'mistake'
          ? `${clock(event.t)} · 重大失誤｜${victimName} 落單被 ${killerName} 帶走`
          : context === 'gank'
            ? `${clock(event.t)} · 遊走｜${killerName} 擊殺 ${victimName}`
            : context === 'lane'
              ? `${clock(event.t)} · 對線｜${killerName} 擊殺 ${victimName}`
              : `${clock(event.t)} · 擊殺｜${killerName} 擊殺 ${victimName}`;
      events.push({
        id: `v2_${seq++}`,
        t: event.t,
        type: context === 'mistake' ? 'mistake' : 'kill',
        phase: phaseAt(event.t),
        teamId: killer?.teamId ?? null,
        actorPlayerId: killer?.playerId,
        assistPlayerIds: assists,
        victimPlayerId: victim?.playerId,
        victimTeamId: victim?.teamId,
        payload: {
          marker: 'K',
          killContext: context,
          fightLane:
            victim?.positionLabel === 'TOP'
              ? 'top'
              : victim?.positionLabel === 'MID'
                ? 'mid'
                : victim?.positionLabel === 'BOT' || victim?.positionLabel === 'SUPPORT'
                  ? 'bot'
                  : undefined,
        },
        summary,
      });
    } else if (event.type === 'structure_kill') {
      const kind = String(event.payload?.['kind'] ?? 'tower');
      const actor = byEntity.get(event.actorId ?? '');
      const structure = byStructure.get(event.targetId ?? '') as StructureEntity | undefined;
      const assistIds = (event.payload?.['assistIds'] as string[] | undefined) ?? [];
      const assistPlayerIds = assistIds
        .map((id) => byEntity.get(id)?.playerId)
        .filter((id): id is string => Boolean(id));
      const defenderTeamId =
        (event.payload?.['defenderTeamId'] as string | undefined) ??
        (structure
          ? structure.side === 'blue'
            ? state.blue.teamId
            : state.red.teamId
          : undefined);
      const rawLane =
        (event.payload?.['lane'] as string | null | undefined) ?? structure?.lane ?? undefined;
      const lane =
        rawLane === 'top' || rawLane === 'mid' || rawLane === 'bot' ? rawLane : undefined;
      if (kind === 'nexus') {
        events.push({
          id: `v2_${seq++}`,
          t: event.t,
          type: 'nexus',
          phase: phaseAt(event.t),
          teamId: actor?.teamId ?? event.teamId ?? box.winnerTeamId,
          actorPlayerId: actor?.playerId,
          assistPlayerIds,
          payload: { endMethod: 'siege' },
          summary: `${clock(event.t)} · 推掉主堡`,
        });
      } else if (kind === 'inhibitor') {
        events.push({
          id: `v2_${seq++}`,
          t: event.t,
          type: 'inhibitor',
          phase: phaseAt(event.t),
          teamId: actor?.teamId ?? null,
          actorPlayerId: actor?.playerId,
          assistPlayerIds,
          payload: { defenderTeamId, towerLane: lane },
          summary: `${clock(event.t)} · 拆除兵營`,
        });
      } else {
        const tier = towerTierOf(kind);
        if (tier) {
          events.push({
            id: `v2_${seq++}`,
            t: event.t,
            type: 'tower',
            phase: phaseAt(event.t),
            teamId: actor?.teamId ?? null,
            actorPlayerId: actor?.playerId,
            assistPlayerIds,
            payload: {
              marker: 'T',
              towerTier: tier,
              towerLane: lane,
              defenderTeamId,
            },
            summary: `${clock(event.t)} · 摧毀防禦塔`,
          });
        }
      }
    } else if (event.type === 'camp_kill') {
      const campId = String(event.payload?.['campId'] ?? '');
      const actor = byEntity.get(event.actorId ?? '');
      const assistIds = (event.payload?.['assistIds'] as string[] | undefined) ?? [];
      const assistPlayerIds = assistIds
        .map((id) => byEntity.get(id)?.playerId)
        .filter((id): id is string => Boolean(id));
      if (campId === 'dragon') {
        const nearbyFight = replay.events.some(
          (row) =>
            row.type === 'death' &&
            Math.abs(row.t - event.t) <= 50 &&
            row.actorId !== event.actorId,
        );
        const nearbyDeaths = replay.events.filter(
          (row) => row.type === 'death' && Math.abs(row.t - event.t) <= 50,
        ).length;
        const stolen = nearbyDeaths === 0;
        const priorDragons = events.filter(
          (row) => row.type === 'dragon' && row.teamId === actor?.teamId,
        ).length;
        const isSoul = priorDragons >= 3;
        events.push({
          id: `v2_${seq++}`,
          t: event.t,
          type: isSoul ? 'dragon-soul' : 'dragon',
          phase: phaseAt(event.t),
          teamId: actor?.teamId ?? null,
          actorPlayerId: actor?.playerId,
          assistPlayerIds,
          payload: {
            marker: dragonMarker(priorDragons + 1),
            ...(nearbyFight
              ? {
                  objectiveIntent: 'contest' as const,
                  decisionOutcome: 'fight' as const,
                }
              : {
                  decisionOutcome: 'free-take' as const,
                }),
            decisionReason: stolen
              ? isSoul
                ? '空窗偷龍魂'
                : '換線空檔偷龍'
              : nearbyFight
                ? isSoul
                  ? '龍魂團後拿下'
                  : '龍團後拿下'
                : isSoul
                  ? '拿下龍魂'
                  : '控龍節奏',
          },
          summary: stolen
            ? `${clock(event.t)} · ${isSoul ? '偷了龍魂' : '偷了小龍'}`
            : nearbyFight
              ? `${clock(event.t)} · ${isSoul ? '龍魂團後拿下龍魂' : '龍團後拿下小龍'}`
              : `${clock(event.t)} · ${isSoul ? '拿下龍魂' : '拿下小龍'}`,
        });
      } else if (campId === 'baron') {
        const nearbyFight = replay.events.some(
          (row) => row.type === 'death' && Math.abs(row.t - event.t) <= 55,
        );
        const stolen = !nearbyFight;
        events.push({
          id: `v2_${seq++}`,
          t: event.t,
          type: 'baron',
          phase: phaseAt(event.t),
          teamId: actor?.teamId ?? null,
          actorPlayerId: actor?.playerId,
          assistPlayerIds,
          payload: {
            marker: 'B',
            ...(stolen
              ? {
                  decisionOutcome: 'free-take' as const,
                }
              : {
                  objectiveIntent: 'contest' as const,
                  decisionOutcome: 'fight' as const,
                }),
            decisionReason: stolen ? '空窗偷巴龍' : '巴龍團後拿下',
          },
          summary: stolen
            ? `${clock(event.t)} · 偷下巴龍`
            : `${clock(event.t)} · 巴龍團後拿下巴龍`,
        });
      } else if (campId === 'herald') {
        events.push({
          id: `v2_${seq++}`,
          t: event.t,
          type: 'herald',
          phase: phaseAt(event.t),
          teamId: actor?.teamId ?? null,
          actorPlayerId: actor?.playerId,
          assistPlayerIds,
          payload: { decisionReason: '用預示者換塔' },
          summary: `${clock(event.t)} · 拿下預示者`,
        });
      }
    } else if (event.type === 'match_end') {
      const exists = events.some(
        (item) => item.type === 'nexus' || item.type === 'surrender',
      );
      if (!exists) {
        const reason = String(event.payload?.['reason'] ?? '');
        const timedOut = reason === 'timeout';
        events.push({
          id: `v2_${seq++}`,
          t: event.t,
          type: timedOut ? 'surrender' : 'nexus',
          phase: phaseAt(event.t),
          teamId: event.teamId ?? box.winnerTeamId,
          payload: { endMethod: timedOut ? 'timeout' : 'siege' },
          summary: timedOut
            ? `${clock(event.t)} · 時間到，依防禦塔／經濟判定勝方（主堡未被推破）`
            : `${clock(event.t)} · 推掉主堡`,
        });
      }
    }
  }

  if (!events.some((event) => event.type === 'nexus' || event.type === 'surrender')) {
    events.push({
      id: `v2_${seq++}`,
      t: box.durationSec,
      type: 'surrender',
      phase: 'late',
      teamId: box.winnerTeamId,
      payload: { endMethod: 'timeout' },
      summary: `${clock(box.durationSec)} · 時間到，依防禦塔／經濟判定勝方（主堡未被推破）`,
    });
  }

  const withFights = synthesizeTeamfights(events);
  enrichKillStories(withFights);
  return enrichArchetypeSignals(withFights).sort((left, right) => left.t - right.t);
}

function isKillLike(event: TimelineEvent): boolean {
  return event.type === 'kill' || event.type === 'first-blood' || event.type === 'mistake';
}

function enrichArchetypeSignals(events: TimelineEvent[]): TimelineEvent[] {
  const fightLookbackSec = 55;
  const contestWindowSec = 50;
  const kills = events.filter(isKillLike);
  const objectiveContextAt = (t: number): 'dragon' | 'baron' | 'elder' | null => {
    for (const event of events) {
      if (Math.abs(event.t - t) > contestWindowSec) {
        continue;
      }
      if (event.type === 'baron') return 'baron';
      if (event.type === 'elder') return 'elder';
      if (event.type === 'dragon' || event.type === 'dragon-soul') return 'dragon';
    }
    return null;
  };

  return events.map((event) => {
    if (isKillLike(event)) {
      const nearObj = objectiveContextAt(event.t);
      if (nearObj && (!event.payload?.killContext || event.payload.killContext === 'skirmish' || event.payload.killContext === 'teamfight')) {
        return {
          ...event,
          payload: {
            ...event.payload,
            killContext: nearObj,
            fightLane: event.payload?.fightLane ?? 'river',
          },
        };
      }
      return event;
    }

    if (event.type === 'dragon' || event.type === 'baron' || event.type === 'herald' || event.type === 'elder') {
      const nearby = kills.filter((kill) => Math.abs(kill.t - event.t) <= contestWindowSec);
      const our = nearby.filter((kill) => kill.teamId === event.teamId).length;
      const their = nearby.filter((kill) => kill.teamId && kill.teamId !== event.teamId).length;
      const sides = new Set<string>();
      for (const kill of nearby) {
        if (kill.teamId) {
          sides.add(kill.teamId);
        }
        if (kill.victimTeamId) {
          sides.add(kill.victimTeamId);
        }
      }
      const contested = sides.size >= 2 && nearby.length >= 2;
      let decisionReason = event.payload?.decisionReason;
      if (event.type === 'baron') {
        decisionReason =
          our >= 3
            ? '團戰打出人數差後強開巴龍'
            : our >= 1 && their === 0
              ? '先抓到人再轉巴龍'
              : contested
                ? '巴龍坑硬碰硬收下'
                : '趁對面收線空檔偷巴龍';
      } else if (event.type === 'dragon') {
        decisionReason =
          our >= 2
            ? '打完團順勢轉小龍'
            : our >= 1 && their === 0
              ? '抓人後轉小龍'
              : contested
                ? '龍坑拉扯後收下'
                : '換線空檔收下小龍';
      }
      return {
        ...event,
        payload: {
          ...event.payload,
          decisionReason,
          ...(contested
            ? {
                objectiveIntent: 'contest' as const,
                opponentIntent: 'contest' as const,
                decisionOutcome: 'fight' as const,
              }
            : {}),
        },
      };
    }

    if (
      event.type === 'tower' &&
      (event.payload?.towerLane === 'top' || event.payload?.towerLane === 'bot') &&
      event.payload?.towerTier !== 'nexus'
    ) {
      const nearbyFight = events.some(
        (other) =>
          (other.type === 'teamfight' || isKillLike(other)) &&
          Math.abs(other.t - event.t) <= fightLookbackSec,
      );
      return {
        ...event,
        payload: {
          ...event.payload,
          pushStyle: nearbyFight ? 'grouped' : 'split',
        },
      };
    }

    return event;
  });
}

function buildDraftFallback(state: GameState): MatchDraftReport {
  const pick = (side: 'blue' | 'red') =>
    state.champions
      .filter((champ) => champ.side === side)
      .map((champ) => ({
        teamId: champ.teamId,
        playerId: champ.playerId,
        gamertag: champ.gamertag,
        position: champ.positionLabel as PlayerPosition,
        championId: champ.championId,
        championNameZh: champNameZh(champ.championId),
        fitScore: 70,
        metaPower: 70,
      }));
  return {
    patchId: state.lockedPack.manifest.id,
    patchLabel: state.lockedPack.manifest.label,
    riotPatch: state.lockedPack.manifest.riotPatch,
    blueTeamId: state.blue.teamId,
    redTeamId: state.red.teamId,
    bans: [],
    home: {
      teamId: state.blue.teamId,
      intent: 'balanced',
      power: 70,
      picks: pick('blue'),
    },
    away: {
      teamId: state.red.teamId,
      intent: 'balanced',
      power: 70,
      picks: pick('red'),
    },
  };
}

export function toMatchReport(result: SimulateV2Result): MatchReport {
  const { state, replay } = result;
  const winnerTeamId = state.winnerTeamId ?? state.blue.teamId;
  const home = teamStats(state, 'blue');
  const away = teamStats(state, 'red');
  const homeDamage = state.champions
    .filter((champ) => champ.side === 'blue')
    .reduce((sum, champ) => sum + champ.damageToChampions, 0);
  const awayDamage = state.champions
    .filter((champ) => champ.side === 'red')
    .reduce((sum, champ) => sum + champ.damageToChampions, 0);
  const players = state.champions.map((champ) =>
    toPlayerStats(
      champ,
      champ.side === 'blue' ? home.kills : away.kills,
      champ.side === 'blue' ? homeDamage : awayDamage,
      champ.side === 'blue' ? home.totalGold : away.totalGold,
    ),
  );
  const durationSec = Math.round(state.scheduler.time);
  const goldSeries = state.goldSamples.map((sample) => ({
    t: Number(sample.t.toFixed(1)),
    homeGold: Math.round(sample.blue),
    awayGold: Math.round(sample.red),
  }));
  const finalPoint = {
    t: durationSec,
    homeGold: home.totalGold,
    awayGold: away.totalGold,
  };
  const last = goldSeries[goldSeries.length - 1];
  if (!last) {
    goldSeries.push(finalPoint);
  } else if (Math.abs(last.t - durationSec) <= 1.5) {
    last.t = durationSec;
    last.homeGold = finalPoint.homeGold;
    last.awayGold = finalPoint.awayGold;
  } else {
    goldSeries.push(finalPoint);
  }

  const draft = result.draft ?? buildDraftFallback(state);
  const mapTrack: MatchMapFrame[] = replay.snapshots.map((snap) => ({
    t: snap.t,
    champions: snap.champions.map((champ) => ({
      playerId: champ.playerId,
      teamId: champ.teamId,
      side: champ.side,
      position: champ.positionLabel as PlayerPosition,
      championId: champ.championId,
      gamertag: champ.gamertag,
      x: champ.x,
      y: champ.y,
      hp: Math.round(champ.hp),
      maxHp: Math.round(champ.maxHp),
      mana: Math.round(champ.mana ?? 0),
      maxMana: Math.round(champ.maxMana ?? 0),
      gold: Math.round(champ.gold),
      earnedGold: Math.round(champ.earnedGold ?? champ.gold),
      level: champ.level,
      exp: Math.round(champ.exp ?? 0),
      alive: champ.alive,
      kills: champ.kills ?? 0,
      deaths: champ.deaths ?? 0,
      assists: champ.assists ?? 0,
      damageToChamps: Math.round(champ.damageToChamps ?? 0),
      damageTaken: Math.round(champ.damageTaken ?? 0),
      damageTakenFromChamps: Math.round(
        champ.damageTakenFromChamps ?? champ.damageTaken ?? 0,
      ),
      cs: champ.cs ?? 0,
      items: [...champ.items],
      abilities: (champ.abilities ?? []).map((ability) => ({
        slot: ability.slot,
        level: ability.level,
        name: ability.name,
        cooldownRemaining: ability.cooldownRemaining,
      })),
      summonerSpells: (champ.summonerSpells ?? []).map((spell) => ({
        id: spell.id,
        slot: spell.slot,
        cooldownRemaining: spell.cooldownRemaining,
      })),
      recalling: !!champ.recalling,
      recallProgress: champ.recallProgress ?? 0,
    })),
    minions: (snap.minions ?? []).map((minion) => ({ ...minion })),
    monsters: (snap.monsters ?? []).map((monster) => ({ ...monster })),
    structures: (snap.structures ?? []).map((structure) => ({ ...structure })),
    wards: (snap.wards ?? []).map((ward) => ({ ...ward })),
  }));

  const boxScore: MatchBoxScore = {
    durationSec,
    winnerTeamId,
    homeTeamId: state.blue.teamId,
    awayTeamId: state.red.teamId,
    goldSeries,
    timeline: [],
    home,
    away,
    players,
    mapTrack,
  };
  boxScore.timeline = buildTimeline(state, replay, boxScore);
  const countSide = (type: TimelineEvent['type'], teamId: string): number =>
    boxScore.timeline.filter((event) => event.type === type && event.teamId === teamId).length;
  home.barons = countSide('baron', home.teamId);
  away.barons = countSide('baron', away.teamId);
  home.elders = countSide('elder', home.teamId);
  away.elders = countSide('elder', away.teamId);
  home.dragons = countSide('dragon', home.teamId);
  away.dragons = countSide('dragon', away.teamId);
  home.dragonSoul = boxScore.timeline.some(
    (event) => event.type === 'dragon-soul' && event.teamId === home.teamId,
  );
  away.dragonSoul = boxScore.timeline.some(
    (event) => event.type === 'dragon-soul' && event.teamId === away.teamId,
  );

  const phases = derivePhaseReports(boxScore);
  phases[0] = {
    id: 'draft',
    edge: Number((((draft.home.power - draft.away.power) / 8) || 0).toFixed(2)),
    leaderTeamId:
      Math.abs(draft.home.power - draft.away.power) < 6
        ? null
        : draft.home.power > draft.away.power
          ? draft.home.teamId
          : draft.away.teamId,
    notes: [
      `${draft.patchLabel}（${draft.riotPatch}）`,
      `${COMP_INTENT_LABELS[draft.home.intent]} vs ${COMP_INTENT_LABELS[draft.away.intent]}`,
      `Ban ${draft.bans.length}`,
    ],
  };

  const isUpset = isUpsetFromBox(boxScore);
  const turningPoints = deriveTurningPoints(boxScore, winnerTeamId);
  const events = deriveNarrativeEvents(boxScore);
  const stubProfile = { teamId: winnerTeamId } as TeamProfile;
  const keyPlayers = deriveKeyPlayers(boxScore, winnerTeamId, stubProfile);
  const styleNotes = [
    `主隊走${COMP_INTENT_LABELS[draft.home.intent]}`,
    `客隊走${COMP_INTENT_LABELS[draft.away.intent]}`,
  ];
  const coachNotes = [
    draft.bans.length > 0 ? `BP 共 ${draft.bans.length} 個禁角` : 'BP 資訊不足',
    home.towers + away.towers > 0 ? `本場拆塔 ${home.towers + away.towers} 座` : '塔防壓力有限',
  ];
  const primaryReason = pickPrimaryReasonKey(
    phases,
    winnerTeamId,
    styleNotes,
    coachNotes,
    turningPoints,
    isUpset,
  );
  const advantageSummary = buildAdvantageSummary(phases, home.teamId, away.teamId);
  const decisiveSummary = buildDecisiveSummary({
    phases,
    winnerTeamId,
    homeTeamId: home.teamId,
    awayTeamId: away.teamId,
    primaryReason,
    keyPlayers,
    turningPoints,
    isUpset,
  });
  const archetypes = classifyMatchArchetypes({
    box: boxScore,
    preMatchEdge: draft.home.power - draft.away.power,
  });

  return {
    homeTeamId: state.blue.teamId,
    awayTeamId: state.red.teamId,
    winnerTeamId,
    phases,
    keyPlayers,
    mvp: keyPlayers[0] ?? null,
    events,
    turningPoints,
    coachNotes,
    styleNotes,
    swingPhase: findSwing(phases),
    primaryReason,
    advantageSummary,
    decisiveSummary,
    homeStyles: { primary: [COMP_INTENT_LABELS[draft.home.intent]], secondary: [] },
    awayStyles: { primary: [COMP_INTENT_LABELS[draft.away.intent]], secondary: [] },
    isUpset,
    archetypes,
    boxScore,
    draft,
  };
}
