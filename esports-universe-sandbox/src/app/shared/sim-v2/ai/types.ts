import type { LaneId, TeamSide } from '../types/ids';

export type MatchPhase =
  | 'opening'
  | 'laning'
  | 'transition'
  | 'objective-setup'
  | 'siege'
  | 'defend'
  | 'closeout';

export type TeamPlay =
  | 'hold-lanes'
  | 'contest-objective'
  | 'siege-lane'
  | 'defend-base'
  | 'reset-and-deploy';

export type MemberMission =
  | 'hold-lane'
  | 'trade-window'
  | 'clear-jungle'
  | 'setup-objective'
  | 'take-objective'
  | 'siege'
  | 'cover-side'
  | 'anchor-defense'
  | 'reset';

export type FormationSlot = 'frontline' | 'backline' | 'flank' | 'split' | 'cover' | 'core';

export type MissionIntentKind =
  | 'farm'
  | 'lane'
  | 'trade'
  | 'gank'
  | 'skirmish'
  | 'siege'
  | 'defend'
  | 'objective'
  | 'clear'
  | 'swap'
  | 'wave_freeze'
  | 'wave_shove';

export interface UnitAssignment {
  championId: string;
  mission: MemberMission;
  play: TeamPlay;
  targetId: string | null;
  targetCampId: string | null;
  lane: LaneId | null;
  formation: FormationSlot;
  expiresAt: number;
  preferredIntents: readonly MissionIntentKind[];
  allowedIntents: readonly MissionIntentKind[];
}

export interface TeamPlan {
  side: TeamSide;
  phase: MatchPhase;
  play: TeamPlay;
  commitment: 'low' | 'medium' | 'high';
  createdAt: number;
  expiresAt: number;
  targetId: string | null;
  targetCampId: string | null;
  assignments: Map<string, UnitAssignment>;
}

export const MISSION_INTENT_POLICY: Record<
  MemberMission,
  { preferred: MissionIntentKind[]; allowed: MissionIntentKind[] }
> = {
  'hold-lane': {
    preferred: ['farm', 'lane', 'trade', 'wave_freeze'],
    allowed: [
      'farm',
      'lane',
      'trade',
      'gank',
      'skirmish',
      'swap',
      'wave_freeze',
      'wave_shove',
      'objective',
    ],
  },
  'trade-window': {
    preferred: ['trade', 'skirmish'],
    allowed: ['farm', 'lane', 'trade', 'gank', 'skirmish', 'wave_shove'],
  },
  'clear-jungle': {
    preferred: ['clear', 'gank'],
    allowed: ['clear', 'gank', 'farm', 'objective', 'skirmish', 'defend'],
  },
  'setup-objective': {
    preferred: ['wave_shove', 'objective', 'skirmish'],
    allowed: ['wave_shove', 'objective', 'skirmish', 'defend', 'gank', 'lane', 'farm'],
  },
  'take-objective': {
    preferred: ['objective'],
    allowed: ['objective', 'skirmish', 'defend', 'gank', 'wave_shove', 'clear'],
  },
  siege: {
    preferred: ['siege', 'wave_shove'],
    allowed: ['siege', 'farm', 'skirmish', 'lane', 'defend', 'wave_shove'],
  },
  'cover-side': {
    preferred: ['swap', 'farm', 'siege', 'lane', 'wave_shove'],
    allowed: [
      'swap',
      'farm',
      'lane',
      'siege',
      'trade',
      'skirmish',
      'wave_shove',
      'objective',
    ],
  },
  'anchor-defense': {
    preferred: ['defend'],
    allowed: ['defend', 'skirmish', 'farm', 'lane', 'siege'],
  },
  reset: {
    preferred: ['wave_shove'],
    allowed: ['farm', 'lane', 'wave_shove', 'skirmish', 'trade'],
  },
};
