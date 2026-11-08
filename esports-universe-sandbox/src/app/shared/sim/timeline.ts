import type {
  DragonType,
  PlayPhaseId,
  TimelineEvent,
  TimelineEventType,
  TimelineMarker,
} from './match-stats';

let eventSeq = 0;

export function resetTimelineIds(): void {
  eventSeq = 0;
}

export function nextTimelineId(prefix = 'ev'): string {
  eventSeq += 1;
  return `${prefix}-${eventSeq}`;
}

export function phaseAt(t: number): PlayPhaseId {
  if (t < 14 * 60) {
    return 'early';
  }
  if (t < 25 * 60) {
    return 'mid';
  }
  return 'late';
}

export function formatClock(t: number): string {
  const minutes = Math.floor(t / 60);
  const seconds = Math.floor(t % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function dragonMarker(dragonIndex: number): TimelineMarker {
  if (dragonIndex <= 1) {
    return 'D1';
  }
  if (dragonIndex === 2) {
    return 'D2';
  }
  if (dragonIndex === 3) {
    return 'D3';
  }
  return 'D4';
}

export function createTimelineEvent(
  partial: Omit<TimelineEvent, 'id' | 'phase'> & { id?: string; phase?: PlayPhaseId },
): TimelineEvent {
  return {
    id: partial.id ?? nextTimelineId(),
    t: partial.t,
    type: partial.type,
    phase: partial.phase ?? phaseAt(partial.t),
    teamId: partial.teamId,
    actorPlayerId: partial.actorPlayerId,
    assistPlayerIds: partial.assistPlayerIds,
    victimPlayerId: partial.victimPlayerId,
    victimTeamId: partial.victimTeamId,
    payload: partial.payload,
    summary: partial.summary,
  };
}

export function isObjectiveType(type: TimelineEventType): boolean {
  return (
    type === 'dragon' ||
    type === 'dragon-soul' ||
    type === 'baron' ||
    type === 'elder' ||
    type === 'tower' ||
    type === 'inhibitor' ||
    type === 'herald' ||
    type === 'voidgrub'
  );
}

export function isKillType(type: TimelineEventType): boolean {
  return type === 'kill' || type === 'first-blood';
}

export function isEndType(type: TimelineEventType): boolean {
  return type === 'nexus' || type === 'surrender';
}

export const DRAGON_TYPES: DragonType[] = [
  'infernal',
  'mountain',
  'ocean',
  'cloud',
  'hextech',
  'chemtech',
];
