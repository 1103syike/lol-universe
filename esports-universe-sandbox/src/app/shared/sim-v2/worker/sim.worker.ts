/// <reference lib="webworker" />

import { buildV2Input } from '../adapter/from-legacy-input';
import { toMatchReport } from '../adapter/to-match-report';
import { simulateV2Match } from '../engine';
import type { SimWorkerRequest, SimWorkerResponse } from './sim-worker-protocol';

addEventListener('message', (event: MessageEvent<SimWorkerRequest>) => {
  const { id, input, prepared } = event.data;
  try {
    const v2 = prepared ? { ...prepared } : buildV2Input(input!);
    v2.onProgress = (progress) => {
      const message: SimWorkerResponse = { id, type: 'progress', progress };
      postMessage(message);
    };
    const report = toMatchReport(simulateV2Match(v2));
    const response: SimWorkerResponse = { id, type: 'result', ok: true, report };
    postMessage(response);
  } catch (error) {
    const response: SimWorkerResponse = {
      id,
      type: 'result',
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    postMessage(response);
  }
});
