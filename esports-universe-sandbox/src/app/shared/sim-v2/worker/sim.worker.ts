/// <reference lib="webworker" />

import { buildV2Input } from '../adapter/from-legacy-input';
import { toMatchReport } from '../adapter/to-match-report';
import { simulateV2Match } from '../engine';
import type { SimWorkerRequest, SimWorkerResponse } from './sim-worker-protocol';

addEventListener('message', (event: MessageEvent<SimWorkerRequest>) => {
  const { id, input } = event.data;
  try {
    const report = toMatchReport(simulateV2Match(buildV2Input(input)));
    const response: SimWorkerResponse = { id, ok: true, report };
    postMessage(response);
  } catch (error) {
    const response: SimWorkerResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
    postMessage(response);
  }
});
