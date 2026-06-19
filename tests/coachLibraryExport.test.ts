import { describe, expect, it } from 'vitest';

import { buildCoachLibrary } from '../src/movement/coachLibrary';
import { createCoachReviewConsentRecord } from '../src/movement/coachConsentRepository';
import {
  assertCoachLibraryExportIsPrivacySafe,
  buildCoachLibraryExport,
  formatCoachLibraryExportSummary,
  type CoachLibraryExport,
} from '../src/movement/coachLibraryExport';
import { buildCoachTeamTemplates } from '../src/movement/coachTeamTemplates';
import type { LocalAnalysisReport } from '../src/movement/contracts';
import { createDrillPracticeRecord } from '../src/movement/drillPracticeRepository';
import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import { createReportAnnotation, updateCueFeedback } from '../src/movement/reportAnnotationRepository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

async function buildReport(id: string): Promise<LocalAnalysisReport> {
  const report = await localMovementAnalyzer.analyze({
    frames: samplePoseFrames,
    session: {
      ...sampleSession,
      id,
      title: id,
    },
  });
  return {
    ...report,
    id,
    session: {
      ...report.session,
      id,
      title: id,
    },
  };
}

describe('coach library export', () => {
  it('builds a versioned privacy-safe batch export from the coach library and team templates', async () => {
    const report = await buildReport('export-project');
    const annotation = updateCueFeedback(
      createReportAnnotation(report.id, {
        privateNote: 'Private athlete note must stay local.',
        updatedAt: '2026-06-19T22:00:00.000Z',
      }),
      {
        cueId: report.cues[0].id,
        note: 'Private cue validation note must stay local.',
        rating: 'useful',
        updatedAt: '2026-06-19T22:05:00.000Z',
      },
    );
    const library = buildCoachLibrary(
      [report],
      [createCoachReviewConsentRecord(report.id, { grantedAt: '2026-06-19T22:10:00.000Z' })],
      [annotation],
      [
        createDrillPracticeRecord({
          cueId: report.cues[0].id,
          drillId: 'export-project-drill',
          note: 'Private drill note must stay local.',
          reportId: report.id,
          status: 'completed',
          updatedAt: '2026-06-19T22:15:00.000Z',
        }),
      ],
    );
    const templatePlan = buildCoachTeamTemplates(library);

    const exportBundle = buildCoachLibraryExport(library, {
      generatedAt: '2026-06-19T22:30:00.000Z',
      templatePlan,
    });
    const serialized = JSON.stringify(exportBundle);

    expect(() => assertCoachLibraryExportIsPrivacySafe(exportBundle)).not.toThrow();
    expect(exportBundle).toMatchObject({
      generatedAt: '2026-06-19T22:30:00.000Z',
      privacy: {
        drillNotesIncluded: false,
        keyFramesIncluded: false,
        landmarksIncluded: false,
        privateNotesIncluded: false,
        rawUrisIncluded: false,
        rawVideoIncluded: false,
        videoLeavesDevice: false,
      },
      schemaVersion: 'movebeta.coach-library-export.v1',
      summary: {
        activeConsentCount: 1,
        highPriorityCount: 1,
        readyPacketCount: 1,
        sourceEntryCount: 1,
        templateCount: 3,
      },
    });
    expect(exportBundle.entries[0]).toMatchObject({
      athleteContextIncluded: true,
      cueFeedbackCount: 1,
      drillPracticeCount: 1,
      rawVideoIncluded: false,
      reportId: report.id,
      videoLeavesDevice: false,
    });
    expect(exportBundle.templates.map((template) => template.id)).toEqual([
      'high-priority-review',
      'follow-through-review',
      'privacy-safe-packet-review',
    ]);
    expect(formatCoachLibraryExportSummary(exportBundle)).toBe(
      '1 consented packets · 3 team templates · raw video: no · private notes: no',
    );
    expect(serialized).not.toContain('Private athlete note');
    expect(serialized).not.toContain('Private cue validation note');
    expect(serialized).not.toContain('Private drill note');
    expect(serialized).not.toMatch(/"(?:privateNote|drillNote|keyFrame|landmarks|uri|videoUri)"\s*:/i);
  });

  it('exports an empty coach library with explicit zero-count privacy metadata', () => {
    const exportBundle = buildCoachLibraryExport(buildCoachLibrary([], []), {
      generatedAt: '2026-06-19T22:45:00.000Z',
    });

    expect(() => assertCoachLibraryExportIsPrivacySafe(exportBundle)).not.toThrow();
    expect(exportBundle).toMatchObject({
      entries: [],
      generatedAt: '2026-06-19T22:45:00.000Z',
      summary: {
        activeConsentCount: 0,
        highPriorityCount: 0,
        readyPacketCount: 0,
        sourceEntryCount: 0,
        templateCount: 0,
        totalReports: 0,
      },
      templates: [],
    });
    expect(formatCoachLibraryExportSummary(exportBundle)).toBe(
      '0 consented packets · 0 team templates · raw video: no · private notes: no',
    );
  });

  it('rejects injected raw artifact keys before export handoff', () => {
    const exportBundle = buildCoachLibraryExport(buildCoachLibrary([], []), {
      generatedAt: '2026-06-19T23:00:00.000Z',
    });
    const unsafeBundle = {
      ...exportBundle,
      privateNote: 'Injected sensitive note',
    } as unknown as CoachLibraryExport;

    expect(() => assertCoachLibraryExportIsPrivacySafe(unsafeBundle)).toThrow(/forbidden raw artifact keys/i);
  });
});
