export type CoachWorkflowPhase = 'analyzing' | 'idle' | 'recording' | 'warming-model';

export type CoachWorkflowState = {
  actionDisabled: boolean;
  actionLabel: string;
  captureDisabled: boolean;
  phase: CoachWorkflowPhase;
  stateMessage: string | null;
  stateTitle: string | null;
};

export function buildCoachWorkflowState({
  analyzing,
  recording,
  warmingModel,
}: {
  analyzing: boolean;
  recording: boolean;
  warmingModel: boolean;
}): CoachWorkflowState {
  if (warmingModel) {
    return {
      actionDisabled: true,
      actionLabel: 'Warming model',
      captureDisabled: true,
      phase: 'warming-model',
      stateMessage: 'Fetching same-origin model assets before local video analysis.',
      stateTitle: 'Preparing local model',
    };
  }

  if (analyzing) {
    return {
      actionDisabled: true,
      actionLabel: 'Analyzing',
      captureDisabled: true,
      phase: 'analyzing',
      stateMessage: 'No upload, no cloud processing.',
      stateTitle: 'Running local analysis',
    };
  }

  if (recording) {
    return {
      actionDisabled: true,
      actionLabel: 'Recording',
      captureDisabled: true,
      phase: 'recording',
      stateMessage: null,
      stateTitle: null,
    };
  }

  return {
    actionDisabled: false,
    actionLabel: 'Analyze',
    captureDisabled: false,
    phase: 'idle',
    stateMessage: null,
    stateTitle: null,
  };
}
