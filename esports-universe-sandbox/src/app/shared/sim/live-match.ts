import { applyTimelineEvents, type ApplyEventState } from './apply-event';
import { SIM_BALANCE } from './balance';
import { maybeLanePoke, maybeMistakeKill, maybeResolveSkirmish } from './combat';
import {
  buildIncomeEvent,
  pushGoldSample,
  sampleGold,
  startingPlayerGold,
  teamGold,
} from './economy';
import type { GoldSeries, MatchSimResult, PlayerRuntimeStats, TimelineEvent } from './match-stats';
import type { MatchBoxScore } from './match-stats';
import {
  buildMatchState,
  emptyModifiers,
  type MatchLiveModifiers,
} from './match-state';
import { createLaningPresence, maybeApplyRotations } from './map-presence';
import {
  createObjectiveProgress,
  forceSiegeBreakthrough,
  maybeEndMatch,
  maybeTakeObjectives,
} from './objectives';
import { buildBoxScore } from './reduce-stats';
import { createTimelineEvent, formatClock, phaseAt, resetTimelineIds } from './timeline';
import type { TeamProfile } from './team-profile';

function commitEvents(
  applyState: ApplyEventState,
  timeline: TimelineEvent[],
  goldSeries: GoldSeries,
  events: TimelineEvent[],
  sampleAt: number,
): void {
  const applied = applyTimelineEvents(applyState, events);
  timeline.push(...applied);
  const hasImpact = applied.some((event) => event.type !== 'income');
  if (hasImpact) {
    const stamp =
      applied.reduce((max, event) => Math.max(max, event.t), 0) || sampleAt;
    pushGoldSample(
      goldSeries,
      sampleGold(stamp, applyState.players, applyState.homeTeamId, applyState.awayTeamId),
    );
  }
}

function createTickClock(tickEnd: number, random: () => number): () => number {
  const windowStart = Math.max(1, tickEnd - (SIM_BALANCE.tickSeconds - 1));
  let cursor = windowStart + Math.floor(random() * 8);
  return () => {
    const next = Math.min(tickEnd, Math.max(cursor + 1, cursor + 2 + Math.floor(random() * 6)));
    cursor = next;
    return cursor;
  };
}

function finalizeLiveMatch(
  input: {
    home: TeamProfile;
    away: TeamProfile;
    forceWinnerTeamId?: string;
  },
  timeline: TimelineEvent[],
  goldSeries: GoldSeries,
  players: PlayerRuntimeStats[],
  durationSec: number,
  rawWinnerTeamId: string,
): { sim: MatchSimResult; boxScore: MatchBoxScore } {
  let winnerTeamId = rawWinnerTeamId;
  if (input.forceWinnerTeamId) {
    winnerTeamId = input.forceWinnerTeamId;
    const winnerLabel = winnerTeamId === input.home.teamId ? '主隊' : '客隊';
    let patched = false;
    for (let index = timeline.length - 1; index >= 0; index -= 1) {
      const event = timeline[index];
      if (event.type === 'nexus' || event.type === 'surrender') {
        timeline[index] = {
          ...event,
          teamId: winnerTeamId,
          summary: `${formatClock(event.t)} · 主堡｜${winnerLabel}推掉主堡，比賽結束`,
        };
        patched = true;
        break;
      }
    }
    if (!patched) {
      timeline.push(
        createTimelineEvent({
          t: durationSec,
          type: 'nexus',
          teamId: winnerTeamId,
          payload: { endMethod: 'siege' },
          summary: `${formatClock(durationSec)} · 主堡｜${winnerLabel}推掉主堡，比賽結束`,
        }),
      );
    }
  }
  const sim: MatchSimResult = {
    homeTeamId: input.home.teamId,
    awayTeamId: input.away.teamId,
    durationSec,
    winnerTeamId,
    timeline,
    goldSeries,
    players,
  };
  return { sim, boxScore: buildBoxScore(sim) };
}

export function simulateLiveMatch(input: {
  home: TeamProfile;
  away: TeamProfile;
  random: () => number;
  modifiers?: MatchLiveModifiers;
  forceWinnerTeamId?: string;
}): { sim: MatchSimResult; boxScore: MatchBoxScore } {
  resetTimelineIds();
  const modifiers = input.modifiers ?? emptyModifiers();
  const timeline: TimelineEvent[] = [];
  const goldSeries: GoldSeries = [];
  const homePlayers = startingPlayerGold(input.home);
  const awayPlayers = startingPlayerGold(input.away);
  const players: PlayerRuntimeStats[] = [...homePlayers, ...awayPlayers];
  const progress = createObjectiveProgress();
  const presence = createLaningPresence(input.home, input.away);
  const applyState: ApplyEventState = {
    players,
    homeTeamId: input.home.teamId,
    awayTeamId: input.away.teamId,
    appliedIds: new Set<string>(),
  };
  let firstBloodTaken = false;
  let t = 0;

  pushGoldSample(
    goldSeries,
    sampleGold(0, players, input.home.teamId, input.away.teamId),
  );

  const hardCapSec = SIM_BALANCE.maxMatchSeconds + 5 * 60;
  while (t < hardCapSec) {
    t += SIM_BALANCE.tickSeconds;
    const phase = phaseAt(t);
    const state = buildMatchState({
      t,
      phase,
      homeTeamId: input.home.teamId,
      awayTeamId: input.away.teamId,
      players,
      progress,
      modifiers,
      presence,
    });

    commitEvents(
      applyState,
      timeline,
      goldSeries,
      [
        buildIncomeEvent({
          t,
          phase,
          profile: input.home,
          homeTeamId: input.home.teamId,
          awayTeamId: input.away.teamId,
          random: input.random,
        }),
        buildIncomeEvent({
          t,
          phase,
          profile: input.away,
          homeTeamId: input.home.teamId,
          awayTeamId: input.away.teamId,
          random: input.random,
        }),
      ],
      t,
    );

    const nextActionAt = createTickClock(t, input.random);

    const pokeAt = nextActionAt();
    const poke = maybeLanePoke({
      t: pokeAt,
      phase,
      home: input.home,
      away: input.away,
      players,
      state,
      random: input.random,
    });
    if (poke) {
      commitEvents(applyState, timeline, goldSeries, [poke], pokeAt);
    }

    const fightAt = nextActionAt();
    const skirmish = maybeResolveSkirmish({
      t: fightAt,
      phase,
      home: input.home,
      away: input.away,
      players,
      state,
      random: input.random,
      firstBloodTaken,
    });
    firstBloodTaken = skirmish.firstBloodTaken;
    if (skirmish.teamfightAt !== null) {
      progress.lastTeamfightAt = skirmish.teamfightAt;
    }
    commitEvents(applyState, timeline, goldSeries, skirmish.events, fightAt);

    if (skirmish.events.length === 0) {
      const mistakeAt = nextActionAt();
      const mistake = maybeMistakeKill({
        t: mistakeAt,
        phase,
        home: input.home,
        away: input.away,
        players,
        state,
        random: input.random,
      });
      if (mistake.length > 0) {
        firstBloodTaken = true;
        commitEvents(applyState, timeline, goldSeries, mistake, mistakeAt);
      }
    }

    const stateAfterFight = buildMatchState({
      t,
      phase,
      homeTeamId: input.home.teamId,
      awayTeamId: input.away.teamId,
      players,
      progress,
      modifiers,
      presence,
    });
    const objectiveAt = nextActionAt();
    const objectiveEvents = maybeTakeObjectives({
      t: objectiveAt,
      phase,
      home: input.home,
      away: input.away,
      players,
      progress,
      presence,
      state: stateAfterFight,
      random: input.random,
    });
    commitEvents(applyState, timeline, goldSeries, objectiveEvents, objectiveAt);

    if (t >= SIM_BALANCE.maxMatchSeconds) {
      const breakthroughAt = nextActionAt();
      const breakthrough = forceSiegeBreakthrough({
        t: breakthroughAt,
        phase,
        home: input.home,
        away: input.away,
        players,
        progress,
        random: input.random,
      });
      if (breakthrough.length > 0) {
        commitEvents(applyState, timeline, goldSeries, breakthrough, breakthroughAt);
      }
    }

    const stateAfterObj = buildMatchState({
      t,
      phase,
      homeTeamId: input.home.teamId,
      awayTeamId: input.away.teamId,
      players,
      progress,
      modifiers,
      presence,
    });
    const rotationAt = nextActionAt();
    const rotations = maybeApplyRotations({
      presence,
      home: input.home,
      away: input.away,
      canRotateHome: progress.canRotateHome,
      canRotateAway: progress.canRotateAway,
      homeDefense: progress.homeDefense,
      awayDefense: progress.awayDefense,
      modes: stateAfterObj.modes,
      t: rotationAt,
      nextDragonAt: progress.nextDragonAt,
      nextBaronAt: progress.nextBaronAt,
      random: input.random,
    });
    if (rotations.length > 0) {
      const rotationEvents = rotations.map((decision) =>
        createTimelineEvent({
          t: rotationAt,
          type: 'rotation',
          teamId: decision.teamId,
          payload: {
            decisionReason: decision.summary,
            decisionOutcome: 'trade-take',
          },
          summary: `${formatClock(rotationAt)} · 轉線｜${
            decision.teamId === input.home.teamId ? '主隊' : '客隊'
          }${decision.summary}`,
        }),
      );
      commitEvents(applyState, timeline, goldSeries, rotationEvents, rotationAt);
    }

    pushGoldSample(
      goldSeries,
      sampleGold(t, players, input.home.teamId, input.away.teamId),
    );

    const endAt = nextActionAt();
    const endProbe = maybeEndMatch({
      t,
      stampT: endAt,
      home: input.home,
      away: input.away,
      players,
      progress,
      random: input.random,
    });
    if (endProbe.hold) {
      commitEvents(applyState, timeline, goldSeries, [endProbe.hold], endAt);
    }
    if (endProbe.end) {
      commitEvents(applyState, timeline, goldSeries, [endProbe.end], endAt);
      pushGoldSample(
        goldSeries,
        sampleGold(endAt, players, input.home.teamId, input.away.teamId),
      );
      const winnerTeamId =
        endProbe.end.teamId ??
        (teamGold(players, input.home.teamId) >= teamGold(players, input.away.teamId)
          ? input.home.teamId
          : input.away.teamId);
      return finalizeLiveMatch(input, timeline, goldSeries, players, endAt, winnerTeamId);
    }
  }

  const phase = phaseAt(t);
  for (let guard = 0; guard < 16; guard += 1) {
    const stamp = t + guard * SIM_BALANCE.tickSeconds;
    const breakthrough = forceSiegeBreakthrough({
      t: stamp,
      phase,
      home: input.home,
      away: input.away,
      players,
      progress,
      random: input.random,
    });
    if (breakthrough.length > 0) {
      commitEvents(applyState, timeline, goldSeries, breakthrough, stamp);
    }
    const endStamp = stamp + Math.min(10, SIM_BALANCE.nexusCloseGapSec);
    const endProbe = maybeEndMatch({
      t: Math.max(stamp, SIM_BALANCE.maxMatchSeconds),
      stampT: endStamp,
      home: input.home,
      away: input.away,
      players,
      progress,
      random: () => 0,
    });
    if (endProbe.hold) {
      commitEvents(applyState, timeline, goldSeries, [endProbe.hold], endStamp);
    }
    if (endProbe.end) {
      commitEvents(applyState, timeline, goldSeries, [endProbe.end], endStamp);
      return finalizeLiveMatch(
        input,
        timeline,
        goldSeries,
        players,
        endStamp,
        endProbe.end.teamId ?? input.home.teamId,
      );
    }
  }

  const homeGold = teamGold(players, input.home.teamId);
  const awayGold = teamGold(players, input.away.teamId);
  const winnerTeamId = homeGold >= awayGold ? input.home.teamId : input.away.teamId;
  const fallbackProbe = maybeEndMatch({
    t: SIM_BALANCE.maxMatchSeconds,
    stampT: t,
    home: input.home,
    away: input.away,
    players,
    progress,
    random: () => 0,
  });
  if (fallbackProbe.hold) {
    commitEvents(applyState, timeline, goldSeries, [fallbackProbe.hold], t);
  }
  if (fallbackProbe.end) {
    commitEvents(applyState, timeline, goldSeries, [fallbackProbe.end], t);
  }
  return finalizeLiveMatch(
    input,
    timeline,
    goldSeries,
    players,
    t,
    fallbackProbe.end?.teamId ?? winnerTeamId,
  );
}
