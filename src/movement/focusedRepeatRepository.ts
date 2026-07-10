import { z } from 'zod';

import type { LocalAnalysisReport } from './contracts';

const storageKey = 'movebeta.focused-repeat.v1';

const ActiveFocusedRepeatSchema = z.object({
  baselineReportId: z.string().min(1),
  cueId: z.string().min(1).optional(),
  startedAt: z.string(),
});

export type ActiveFocusedRepeat = z.infer<typeof ActiveFocusedRepeatSchema>;

function storage() {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
}

export function loadActiveFocusedRepeat(): ActiveFocusedRepeat | null {
  const value = storage()?.getItem(storageKey);
  if (!value) return null;
  let decoded: unknown;
  try {
    decoded = JSON.parse(value);
  } catch {
    storage()?.removeItem(storageKey);
    return null;
  }
  const parsed = ActiveFocusedRepeatSchema.safeParse(decoded);
  if (parsed.success) return parsed.data;
  storage()?.removeItem(storageKey);
  return null;
}

export function saveActiveFocusedRepeat(report: LocalAnalysisReport): ActiveFocusedRepeat | null {
  const cue = report.cues[0];
  const active = ActiveFocusedRepeatSchema.parse({
    baselineReportId: report.id,
    ...(cue ? { cueId: cue.id } : {}),
    startedAt: new Date().toISOString(),
  });
  storage()?.setItem(storageKey, JSON.stringify(active));
  return active;
}

export function clearActiveFocusedRepeat() {
  storage()?.removeItem(storageKey);
}
