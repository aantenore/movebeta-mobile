import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearActiveFocusedRepeat,
  loadActiveFocusedRepeat,
  saveActiveFocusedRepeat,
} from '../src/movement/focusedRepeatRepository';
import { analyzeSampleSession } from '../src/movement/repository';

describe('focused repeat repository', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage');
  });

  it('restores the selected baseline and cue after a reload', async () => {
    const report = await analyzeSampleSession();

    saveActiveFocusedRepeat(report);

    expect(loadActiveFocusedRepeat()).toMatchObject({
      baselineReportId: report.id,
      cueId: report.cues[0].id,
    });
  });

  it('clears the active repeat without touching report history', async () => {
    const report = await analyzeSampleSession();
    saveActiveFocusedRepeat(report);

    clearActiveFocusedRepeat();

    expect(loadActiveFocusedRepeat()).toBeNull();
  });
});
