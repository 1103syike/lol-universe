import { markPlayerDead } from './death-state';
import type { PlayerRuntimeStats, TimelineEvent } from './match-stats';
import { isKillType } from './timeline';

export interface ApplyEventState {
  players: PlayerRuntimeStats[];
  homeTeamId: string;
  awayTeamId: string;
  appliedIds: Set<string>;
}

function findPlayer(players: PlayerRuntimeStats[], playerId: string | undefined): PlayerRuntimeStats | null {
  if (!playerId) {
    return null;
  }
  return players.find((player) => player.playerId === playerId) ?? null;
}

function addGold(player: PlayerRuntimeStats | null, amount: number): void {
  if (!player || amount === 0) {
    return;
  }
  player.gold += amount;
}

export function applyTimelineEvent(state: ApplyEventState, event: TimelineEvent): boolean {
  if (state.appliedIds.has(event.id)) {
    return false;
  }
  state.appliedIds.add(event.id);

  if (event.type === 'income') {
    const goldMap = event.payload?.playerGold ?? {};
    const csMap = event.payload?.playerCs ?? {};
    const visionMap = event.payload?.playerVision ?? {};
    for (const player of state.players) {
      if (goldMap[player.playerId]) {
        player.gold += goldMap[player.playerId];
      }
      if (csMap[player.playerId]) {
        player.cs += csMap[player.playerId];
      }
      if (visionMap[player.playerId]) {
        player.visionScore += visionMap[player.playerId];
      }
    }
    return true;
  }

  if (event.type === 'combat') {
    const damage = event.payload?.damageByPlayer ?? {};
    for (const [playerId, amount] of Object.entries(damage)) {
      const player = findPlayer(state.players, playerId);
      if (player && amount > 0) {
        player.damageToChamps += amount;
      }
    }
    return true;
  }

  if (isKillType(event.type) || event.type === 'mistake') {
    const killer = findPlayer(state.players, event.actorPlayerId);
    const victim = findPlayer(state.players, event.victimPlayerId);
    if (killer) {
      killer.kills += 1;
    }
    if (victim) {
      victim.deaths += 1;
      markPlayerDead(victim, event.t);
    }
    for (const assistId of event.assistPlayerIds ?? []) {
      const assist = findPlayer(state.players, assistId);
      if (assist) {
        assist.assists += 1;
      }
    }
    addGold(killer, event.payload?.killGold ?? 0);
    const assistGold = event.payload?.assistGoldByPlayer ?? {};
    for (const [playerId, amount] of Object.entries(assistGold)) {
      addGold(findPlayer(state.players, playerId), amount);
    }
    return true;
  }

  if (
    event.type === 'tower' ||
    event.type === 'inhibitor' ||
    event.type === 'dragon' ||
    event.type === 'dragon-soul' ||
    event.type === 'baron' ||
    event.type === 'elder' ||
    event.type === 'herald' ||
    event.type === 'voidgrub'
  ) {
    const focus = findPlayer(state.players, event.actorPlayerId);
    const total =
      event.teamId === state.homeTeamId
        ? (event.payload?.goldDeltaHome ?? 0)
        : event.teamId === state.awayTeamId
          ? (event.payload?.goldDeltaAway ?? 0)
          : 0;
    if (total <= 0 || !event.teamId) {
      return true;
    }
    const roster = state.players.filter((player) => player.teamId === event.teamId);
    if (roster.length === 0) {
      return true;
    }
    if (focus && focus.teamId === event.teamId) {
      const focusShare = total * 0.45;
      const rest = (total - focusShare) / Math.max(1, roster.length - 1);
      for (const player of roster) {
        player.gold += player.playerId === focus.playerId ? focusShare : rest;
      }
    } else {
      const each = total / roster.length;
      for (const player of roster) {
        player.gold += each;
      }
    }
    return true;
  }

  return true;
}

export function applyTimelineEvents(state: ApplyEventState, events: TimelineEvent[]): TimelineEvent[] {
  const applied: TimelineEvent[] = [];
  for (const event of events) {
    if (applyTimelineEvent(state, event)) {
      applied.push(event);
    }
  }
  return applied;
}
