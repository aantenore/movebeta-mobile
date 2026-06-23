import { describe, expect, it } from 'vitest';

import { buildCoachWorkflowState } from '../src/features/coach/coachWorkflowState';

describe('Coach workflow state', () => {
  it('keeps the default workflow interactive', () => {
    const state = buildCoachWorkflowState({
      analyzing: false,
      recording: false,
      warmingModel: false,
    });

    expect(state).toMatchObject({
      actionDisabled: false,
      actionLabel: 'Analyze',
      captureDisabled: false,
      phase: 'idle',
      stateMessage: null,
      stateTitle: null,
    });
  });

  it('locks capture and analysis actions while warming the model', () => {
    const state = buildCoachWorkflowState({
      analyzing: false,
      recording: false,
      warmingModel: true,
    });

    expect(state).toMatchObject({
      actionDisabled: true,
      actionLabel: 'Warming model',
      captureDisabled: true,
      phase: 'warming-model',
      stateTitle: 'Preparing local model',
    });
    expect(state.stateMessage).toContain('same-origin model assets');
  });

  it('shows analysis copy while the local analyzer is running', () => {
    const state = buildCoachWorkflowState({
      analyzing: true,
      recording: false,
      warmingModel: false,
    });

    expect(state).toMatchObject({
      actionDisabled: true,
      actionLabel: 'Analyzing',
      captureDisabled: true,
      phase: 'analyzing',
      stateMessage: 'No upload, no cloud processing.',
      stateTitle: 'Running local analysis',
    });
  });

  it('prioritizes model warmup over analysis when both flags are set', () => {
    const state = buildCoachWorkflowState({
      analyzing: true,
      recording: false,
      warmingModel: true,
    });

    expect(state.phase).toBe('warming-model');
    expect(state.actionLabel).toBe('Warming model');
  });

  it('locks secondary actions while recording without replacing the recorder UI', () => {
    const state = buildCoachWorkflowState({
      analyzing: false,
      recording: true,
      warmingModel: false,
    });

    expect(state).toMatchObject({
      actionDisabled: true,
      actionLabel: 'Recording',
      captureDisabled: true,
      phase: 'recording',
      stateMessage: null,
      stateTitle: null,
    });
  });
});
