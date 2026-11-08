export const TEAM_TIMELINE_KINDS = [
  'acquired',
  'renamed',
  'sponsored',
  'player-joined',
  'player-left',
  'league-changed',
] as const;

export type TeamTimelineKind = (typeof TEAM_TIMELINE_KINDS)[number];

export interface TeamTimelineEvent {
  id: string;
  teamId: string;
  kind: TeamTimelineKind;
  date: string;
  recordedAt: string;
  summary: string;
  playerId: string | null;
}

export interface TeamTimelineItem {
  id: string;
  date: string;
  recordedAt: string;
  kindLabel: string;
  title: string;
  detail: string;
  playerId: string | null;
  isSeason: boolean;
}
