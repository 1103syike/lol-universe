import type { SimulateGameInput } from '../../sim/match-engine';
import type { MatchReport } from '../../sim/report';

export interface SimWorkerRequest {
  id: number;
  input: SimulateGameInput;
}

export interface SimWorkerResponse {
  id: number;
  ok: boolean;
  report?: MatchReport;
  error?: string;
}
