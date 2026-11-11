import type { SimulateGameInput } from '../../sim/match-engine';
import type { MatchReport } from '../../sim/report';
import { buildV2Input } from '../adapter/from-legacy-input';
import { toMatchReport } from '../adapter/to-match-report';
import { simulateV2Match, type SimulateV2Input } from '../engine';
import type {
  SimWorkerPreparedInput,
  SimWorkerRequest,
  SimWorkerResponse,
} from './sim-worker-protocol';

type Pending = {
  resolve: (report: MatchReport) => void;
  reject: (error: Error) => void;
  onProgress?: (progress01: number) => void;
};

type QueuedJob = {
  id: number;
  input?: SimulateGameInput;
  prepared?: SimWorkerPreparedInput;
  pending: Pending;
};

const POOL_SIZE = Math.max(
  1,
  Math.min(
    4,
    typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? Math.max(2, Math.floor(navigator.hardwareConcurrency / 2))
      : 2,
  ),
);

const workers: Worker[] = [];
const idleWorkers: Worker[] = [];
const pending = new Map<number, Pending>();
const queue: QueuedJob[] = [];
let nextId = 1;
let workerFailed = false;
let poolReady = false;

function stripPrepared(input: SimulateV2Input): SimWorkerPreparedInput {
  const { onProgress: _onProgress, ...wire } = input;
  return wire;
}

function runPreparedOnMain(
  prepared: SimulateV2Input,
  onProgress?: (progress01: number) => void,
): MatchReport {
  const v2 = { ...prepared, onProgress };
  return toMatchReport(simulateV2Match(v2));
}

function runOnMain(input: SimulateGameInput): MatchReport {
  const v2 = buildV2Input(input);
  v2.onProgress = input.onProgress;
  return toMatchReport(simulateV2Match(v2));
}

function attachWorker(host: Worker): void {
  host.addEventListener('message', (event: MessageEvent<SimWorkerResponse>) => {
    const job = pending.get(event.data.id);
    if (!job) {
      return;
    }
    if (event.data.type === 'progress') {
      job.onProgress?.(event.data.progress);
      return;
    }
    pending.delete(event.data.id);
    idleWorkers.push(host);
    if (!event.data.ok || !event.data.report) {
      job.reject(new Error(event.data.error ?? 'sim worker failed'));
    } else {
      job.onProgress?.(1);
      job.resolve(event.data.report);
    }
    pumpQueue();
  });
  host.addEventListener('error', () => {
    workerFailed = true;
    for (const [, job] of pending) {
      job.reject(new Error('sim worker crashed'));
    }
    pending.clear();
    for (const queued of queue.splice(0)) {
      queued.pending.reject(new Error('sim worker crashed'));
    }
    for (const worker of workers) {
      worker.terminate();
    }
    workers.length = 0;
    idleWorkers.length = 0;
    poolReady = false;
  });
}

function ensurePool(): boolean {
  if (workerFailed || typeof Worker === 'undefined') {
    return false;
  }
  if (poolReady && workers.length > 0) {
    return true;
  }
  try {
    const size = POOL_SIZE;
    for (let i = 0; i < size; i += 1) {
      const host = new Worker(new URL('./sim.worker', import.meta.url), { type: 'module' });
      attachWorker(host);
      workers.push(host);
      idleWorkers.push(host);
    }
    poolReady = true;
    return true;
  } catch {
    workerFailed = true;
    return false;
  }
}

function dispatch(host: Worker, job: QueuedJob): void {
  pending.set(job.id, job.pending);
  const request: SimWorkerRequest = {
    id: job.id,
    input: job.input,
    prepared: job.prepared,
  };
  host.postMessage(request);
}

function pumpQueue(): void {
  while (queue.length > 0 && idleWorkers.length > 0) {
    const host = idleWorkers.pop();
    const job = queue.shift();
    if (!host || !job) {
      return;
    }
    dispatch(host, job);
  }
}

function enqueue(
  payload: { input?: SimulateGameInput; prepared?: SimWorkerPreparedInput },
  onProgress?: (progress01: number) => void,
): Promise<MatchReport> {
  const id = nextId;
  nextId += 1;
  return new Promise<MatchReport>((resolve, reject) => {
    const job: QueuedJob = {
      id,
      input: payload.input,
      prepared: payload.prepared,
      pending: { resolve, reject, onProgress },
    };
    if (idleWorkers.length > 0) {
      const host = idleWorkers.pop();
      if (host) {
        dispatch(host, job);
        return;
      }
    }
    queue.push(job);
  });
}

export function runV2MatchAsync(input: SimulateGameInput): Promise<MatchReport> {
  if (!ensurePool()) {
    return Promise.resolve(runOnMain(input));
  }
  const { onProgress, ...wireInput } = input;
  return enqueue({ input: wireInput }, onProgress);
}

export function runPreparedV2MatchAsync(
  prepared: SimulateV2Input,
  onProgress?: (progress01: number) => void,
): Promise<MatchReport> {
  if (!ensurePool()) {
    return Promise.resolve(runPreparedOnMain(prepared, onProgress));
  }
  return enqueue({ prepared: stripPrepared(prepared) }, onProgress);
}

export async function runV2MatchBatchAsync(
  inputs: readonly SimulateGameInput[],
): Promise<MatchReport[]> {
  return Promise.all(inputs.map((input) => runV2MatchAsync(input)));
}
