import { z } from 'zod';

import type { CoachLibrary, CoachLibraryEntry } from './coachLibrary';

export const CoachTeamTemplateSchema = z.object({
  audience: z.string(),
  entryIds: z.array(z.string()),
  focus: z.string(),
  id: z.string(),
  privacyNote: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  sessionFormat: z.string(),
  title: z.string(),
});

export const CoachTeamTemplatePlanSchema = z.object({
  sourceEntryCount: z.number().int().nonnegative(),
  templates: z.array(CoachTeamTemplateSchema),
});

export type CoachTeamTemplate = z.infer<typeof CoachTeamTemplateSchema>;
export type CoachTeamTemplatePlan = z.infer<typeof CoachTeamTemplatePlanSchema>;

function entryIds(entries: CoachLibraryEntry[]) {
  return entries.map((entry) => entry.reportId);
}

function uniqueFocus(entries: CoachLibraryEntry[]) {
  return [...new Set(entries.map((entry) => entry.reviewFocus).filter(Boolean))].slice(0, 3);
}

export function buildCoachTeamTemplates(library: CoachLibrary): CoachTeamTemplatePlan {
  const highPriority = library.entries.filter((entry) => entry.priority === 'high');
  const reviewSignal = library.entries.filter((entry) => entry.signalStatus === 'review-signal');
  const contextRich = library.entries.filter((entry) => entry.cueFeedbackCount > 0 || entry.drillPracticeCount > 0);
  const templates: CoachTeamTemplate[] = [];

  if (highPriority.length > 0) {
    templates.push({
      audience: 'Coach-led small group',
      entryIds: entryIds(highPriority),
      focus: uniqueFocus(highPriority).join(' · '),
      id: 'high-priority-review',
      privacyNote: 'Uses consented packet metadata only; raw video stays out of the template.',
      priority: 'high',
      sessionFormat: '3 athletes · 20 minute review block',
      title: 'High-priority review block',
    });
  }

  if (contextRich.length > 0) {
    templates.push({
      audience: 'Project athletes',
      entryIds: entryIds(contextRich),
      focus: 'Cue usefulness, drill follow-through, and next repeat decision',
      id: 'follow-through-review',
      privacyNote: 'Summarizes ratings and practice counts without private training notes.',
      priority: highPriority.length > 0 ? 'medium' : 'high',
      sessionFormat: '2 attempts · 1 cue decision · 1 drill adjustment',
      title: 'Follow-through review',
    });
  }

  if (reviewSignal.length > 0) {
    templates.push({
      audience: 'Technique class',
      entryIds: entryIds(reviewSignal),
      focus: 'Capture setup and movement baseline retake',
      id: 'signal-retake-clinic',
      privacyNote: 'Uses signal status only; no frame, landmark, or video artifact leaves the device.',
      priority: 'medium',
      sessionFormat: '5 minute setup check · 1 baseline repeat',
      title: 'Signal retake clinic',
    });
  }

  if (library.entries.length > 0) {
    templates.push({
      audience: 'Remote coach review',
      entryIds: entryIds(library.entries),
      focus: 'Consent check, review rubric, and privacy-safe packet handoff',
      id: 'privacy-safe-packet-review',
      privacyNote: 'Confirms rawVideoIncluded=false and videoLeavesDevice=false before review.',
      priority: 'low',
      sessionFormat: 'Packet triage · rubric review · next-session note',
      title: 'Privacy-safe packet review',
    });
  }

  return CoachTeamTemplatePlanSchema.parse({
    sourceEntryCount: library.entries.length,
    templates,
  });
}
