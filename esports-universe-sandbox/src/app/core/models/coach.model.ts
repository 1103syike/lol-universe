import type { AttributeKey, CareerSeasonRecord, PlayerContract, PlayerNationality } from './player.model';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS } from './player.model';

export const COACH_ATTRIBUTE_KEYS = [
  'draftStrategy',
  'metaAdaptation',
  'tacticalPlanning',
  'teamIntegration',
  'inGameLeadership',
  'playerDevelopment',
] as const;

export type CoachAttributeKey = (typeof COACH_ATTRIBUTE_KEYS)[number];

export const COACH_ATTRIBUTE_LABELS: Record<CoachAttributeKey, string> = {
  draftStrategy: 'BP 策略',
  metaAdaptation: '版本理解',
  tacticalPlanning: '戰術規劃',
  teamIntegration: '團隊整合',
  inGameLeadership: '臨場指揮',
  playerDevelopment: '選手培育',
};

export type CoachAttributes = Record<CoachAttributeKey, number>;

export const COACH_SPECIALTY_KEYS = ATTRIBUTE_KEYS;
export const COACH_SPECIALTY_LABELS = ATTRIBUTE_LABELS;

export interface Coach {
  id: string;
  displayName: string;
  gamertag: string;
  nationality: PlayerNationality;
  teamId: string | null;
  birthday: string;
  attributes: CoachAttributes;
  specialties: AttributeKey[];
  contract: PlayerContract;
  careerRecords: CareerSeasonRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface CoachInput {
  displayName: string;
  gamertag: string;
  nationality: PlayerNationality;
  teamId: string | null;
  birthday: string;
  attributes: CoachAttributes;
  specialties: AttributeKey[];
  contract: PlayerContract;
}

export function isCoachAttributeKey(value: string): value is CoachAttributeKey {
  return (COACH_ATTRIBUTE_KEYS as readonly string[]).includes(value);
}

export function specialtyLabel(key: AttributeKey): string {
  return COACH_SPECIALTY_LABELS[key];
}
