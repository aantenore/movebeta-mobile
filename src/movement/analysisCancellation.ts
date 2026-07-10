export type AnalysisRunOptions = {
  signal?: AbortSignal;
};

export type AnalysisRunTicket = {
  id: number;
  isCurrent(): boolean;
  signal: AbortSignal;
};

export class LatestAnalysisRunCoordinator {
  private controller: AbortController | null = null;
  private latestId = 0;

  start(): AnalysisRunTicket {
    this.controller?.abort();
    const controller = new AbortController();
    const id = this.latestId + 1;
    this.latestId = id;
    this.controller = controller;

    return {
      id,
      isCurrent: () => this.latestId === id && !controller.signal.aborted,
      signal: controller.signal,
    };
  }

  cancel() {
    this.latestId += 1;
    this.controller?.abort();
    this.controller = null;
  }
}

export function throwIfAnalysisAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  const error = new Error('Analysis was cancelled.');
  error.name = 'AbortError';
  throw error;
}

export function isAnalysisAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}
