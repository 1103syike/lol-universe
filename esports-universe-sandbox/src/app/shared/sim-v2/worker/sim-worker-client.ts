import type { SimulateGameInput } from '../../sim/match-engine';
import type { MatchReport } from '../../sim/report';
import { buildV2Input } from '../adapter/from-legacy-input';
import { toMatchReport } from '../adapter/to-match-report';
import { simulateV2Match } from '../engine';
import type { SimWorkerRequest, SimWorkerResponse } from './sim-worker-protocol';

type Pending = {
  resolve: (report: MatchReport) => void;
  reject: (error: Error) => void;
};

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();
let workerFailed = false;

function ensureWorker(): Worker | null {
  if (workerFailed || typeof Worker === 'undefined') {
    return null;
  }
  if (worker) {
    return worker;
  }
  try {
    worker = new Worker(new URL('./sim.worker', import.meta.url), { type: 'module' });
    worker.addEventListener('message', (event: MessageEvent<SimWorkerResponse>) => {
      const job = pending.get(event.data.id);
      if (!job) {
        return;
      }
      pending.delete(event.data.id);
      if (!event.data.ok || !event.data.report) {
        job.reject(new Error(event.data.error ?? 'sim worker failed'));
        return;
      }
      job.resolve(event.data.report);
    });
    worker.addEventListener('error', () => {
      workerFailed = true;
      for (const [, job] of pending) {
        job.reject(new Error('sim worker crashed'));
      }
      pending.clear();
      worker?.terminate();
      worker = null;
    });
    return worker;
  } catch {
    workerFailed = true;
    return null;
  }
}

function runOnMain(input: SimulateGameInput): MatchReport {
  return toMatchReport(simulateV2Match(buildV2Input(input)));
}

export function runV2MatchAsync(input: SimulateGameInput): Promise<MatchReport> {
  const host = ensureWorker();
  if (!host) {
    return Promise.resolve(runOnMain(input));
  }
  const id = nextId;
  nextId += 1;
  return new Promise<MatchReport>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const request: SimWorkerRequest = { id, input };
    host.postMessage(request);
  });
}
