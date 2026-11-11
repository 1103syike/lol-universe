import type { SimulateGameInput } from '../../sim/match-engine';
import type { MatchReport } from '../../sim/report';
import type { SimulateV2Input } from '../engine';

export type SimWorkerPreparedInput = Omit<SimulateV2Input, 'onProgress'>;

export interface SimWorkerRequest {
  id: number;
  input?: SimulateGameInput;
  prepared?: SimWorkerPreparedInput;
}

export interface SimWorkerProgress {
  id: number;
  type: 'progress';
  progress: number;
}

export interface SimWorkerResult {
  id: number;
  type: 'result';
  ok: boolean;
  report?: MatchReport;
  error?: string;
}

export type SimWorkerResponse = SimWorkerProgress | SimWorkerResult;
