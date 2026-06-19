import type { LocalAnalysisReport } from './contracts';
import { buildDrillPlan } from './drillPlanner';
import { summarizeDrillPracticeInsights } from './drillPracticeInsights';
import type { DrillPracticeRecord } from './drillPracticeRepository';
import { summarizePersonalBenchmarks } from './personalBenchmarks';
import { summarizeProjectQueue } from './projectQueue';
import type { ReportAnnotation } from './reportAnnotationRepository';
import { buildTechniqueReadinessPlan } from './techniqueReadiness';

export type SessionPlanIntensity = 'baseline' | 'easy' | 'moderate' | 'hard';

export type SessionPlanPhase = {
  durationMinutes: number;
  evidence: string;
  id: string;
  instruction: string;
  title: string;
};

export type SessionPlan = {
  anchor: string;
  durationMinutes: number;
  intensityCap: SessionPlanIntensity;
  phases: SessionPlanPhase[];
  safetyNote: string;
  status: 'baseline' | 'recover' | 'repeat' | 'progress';
  target: string;
  title: string;
};

function totalDuration(phases: SessionPlanPhase[]) {
  return phases.reduce((sum, phase) => sum + phase.durationMinutes, 0);
}

function latestReport(reports: LocalAnalysisReport[]) {
  return [...reports].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt))[0] ?? null;
}

export function buildSessionPlan(
  reports: LocalAnalysisReport[],
  annotations: ReportAnnotation[],
  drillPractice: DrillPracticeRecord[] = [],
): SessionPlan {
  const readiness = buildTechniqueReadinessPlan(reports, annotations);
  const drillPlan = buildDrillPlan(reports, annotations);
  const practiceInsights = summarizeDrillPracticeInsights(reports, drillPractice);
  const projectQueue = summarizeProjectQueue(reports, annotations);
  const benchmarks = summarizePersonalBenchmarks(reports);
  const latest = latestReport(reports);
  const drill = readiness.drill ?? drillPlan.items[0] ?? null;
  const project = projectQueue.nextProject;
  const anchor = project?.report.session.title ?? benchmarks.bestOverall?.bestReport.session.title ?? latest?.session.title ?? 'New baseline';

  if (readiness.status === 'baseline') {
    const phases: SessionPlanPhase[] = [
      {
        durationMinutes: 8,
        evidence: 'No local movement baseline exists yet.',
        id: 'baseline-warmup',
        instruction: 'Move on an easy climb and keep the full body visible in frame.',
        title: 'Easy movement check',
      },
      {
        durationMinutes: 12,
        evidence: 'First report creates the comparison anchor.',
        id: 'baseline-record',
        instruction: 'Record one controlled benchmark attempt before changing grade or angle.',
        title: 'Record benchmark',
      },
      {
        durationMinutes: 5,
        evidence: 'A private note makes the next comparison useful.',
        id: 'baseline-log',
        instruction: 'Save perceived effort, confidence, and one short note after the attempt.',
        title: 'Save baseline note',
      },
    ];

    return {
      anchor,
      durationMinutes: totalDuration(phases),
      intensityCap: 'baseline',
      phases,
      safetyNote: 'Treat the first report as calibration, not a performance verdict.',
      status: 'baseline',
      target: 'Create a clean local baseline',
      title: 'Baseline session',
    };
  }

  if (readiness.status === 'recover') {
    const phases: SessionPlanPhase[] = [
      {
        durationMinutes: 10,
        evidence: readiness.risk,
        id: 'recover-warmup',
        instruction: readiness.warmup,
        title: 'Low-load warm-up',
      },
      {
        durationMinutes: 12,
        evidence: drill?.evidence ?? 'Latest trend asks for lower intensity.',
        id: 'recover-drill',
        instruction: drill ? `${drill.drill} Keep every repeat below max effort.` : 'Repeat easy movement with no max attempts.',
        title: drill?.title ?? 'Easy technique repeat',
      },
      {
        durationMinutes: 8,
        evidence: project ? `${project.annotation.projectStatus} project, effort ${project.annotation.perceivedEffort}/5.` : 'No active project note.',
        id: 'recover-log',
        instruction: 'Stop before fatigue changes technique and update the private training log.',
        title: 'Log recovery signal',
      },
    ];

    return {
      anchor,
      durationMinutes: totalDuration(phases),
      intensityCap: 'easy',
      phases,
      safetyNote: 'Avoid max-intensity tries until effort and video signal improve.',
      status: 'recover',
      target: readiness.focus,
      title: 'Recovery technique session',
    };
  }

  if (practiceInsights.status === 'blocked') {
    const skippedDrill =
      drillPlan.items.find((item) => item.cueId === practiceInsights.skippedCue?.cueId) ?? drill ?? drillPlan.items[0] ?? null;
    const phases: SessionPlanPhase[] = [
      {
        durationMinutes: 10,
        evidence: practiceInsights.recommendation,
        id: 'practice-reset-warmup',
        instruction: 'Warm up on easier terrain and keep the first repeat intentionally low effort.',
        title: 'Reset warm-up',
      },
      {
        durationMinutes: 12,
        evidence: practiceInsights.skippedCue
          ? `${practiceInsights.skippedCue.skippedCount}/${practiceInsights.skippedCue.total} practice logs skipped.`
          : 'Practice consistency shows skipped drills.',
        id: 'practice-reset-drill',
        instruction: skippedDrill
          ? `${skippedDrill.drill} Use an easier hold option or lower wall angle before repeating.`
          : 'Choose one skipped drill and make it easier before adding volume.',
        title: skippedDrill?.title ?? practiceInsights.skippedCue?.title ?? 'Easier drill variant',
      },
      {
        durationMinutes: 10,
        evidence: 'Practice follow-through should recover before adding intensity.',
        id: 'practice-reset-log',
        instruction: 'Mark the drill as Done or Skip and keep one short note about why.',
        title: 'Log follow-through',
      },
    ];

    return {
      anchor,
      durationMinutes: totalDuration(phases),
      intensityCap: 'easy',
      phases,
      safetyNote: 'Reduce complexity until the suggested drill is repeatable and logged.',
      status: 'recover',
      target: practiceInsights.skippedCue?.title ?? readiness.focus,
      title: 'Practice reset session',
    };
  }

  if (readiness.status === 'repeat') {
    const phases: SessionPlanPhase[] = [
      {
        durationMinutes: 12,
        evidence: readiness.risk,
        id: 'repeat-warmup',
        instruction: readiness.warmup,
        title: 'Focused warm-up',
      },
      {
        durationMinutes: 10,
        evidence: drill?.evidence ?? 'Top coach cue from recent local reports.',
        id: 'repeat-drill',
        instruction: drill?.drill ?? readiness.nextAction,
        title: drill?.title ?? 'Cue rehearsal',
      },
      {
        durationMinutes: 18,
        evidence: project?.action ?? 'Repeat status confirms this should stay comparable.',
        id: 'repeat-project',
        instruction: project?.action ?? `Repeat ${anchor} and compare the same movement window.`,
        title: 'Comparable repeat',
      },
      {
        durationMinutes: 5,
        evidence: 'Private training log powers the next session plan.',
        id: 'repeat-log',
        instruction: 'Save effort, confidence, and whether the cue felt resolved.',
        title: 'Update project log',
      },
    ];

    return {
      anchor,
      durationMinutes: totalDuration(phases),
      intensityCap: 'moderate',
      phases,
      safetyNote: 'Keep the climb comparable so the next report can show whether the beta changed.',
      status: 'repeat',
      target: readiness.focus,
      title: 'Repeat-and-compare session',
    };
  }

  const phases: SessionPlanPhase[] = [
    {
      durationMinutes: 12,
      evidence: `Readiness score ${readiness.score}/100.`,
      id: 'progress-warmup',
      instruction: readiness.warmup,
      title: 'Quality warm-up',
    },
    {
      durationMinutes: 10,
      evidence: benchmarks.bestOverall ? `${benchmarks.bestOverall.title}, ${benchmarks.bestOverall.bestReport.analysisQuality.score}/100.` : 'No benchmark segment available.',
      id: 'progress-benchmark',
      instruction: `Repeat ${anchor} once with the same camera setup before increasing difficulty.`,
      title: 'Benchmark check',
    },
    {
      durationMinutes: 20,
      evidence: readiness.risk,
      id: 'progress-attempt',
      instruction: readiness.nextAction,
      title: 'Progress attempt',
    },
    {
      durationMinutes: 6,
      evidence: 'A fresh note keeps benchmark deltas explainable.',
      id: 'progress-log',
      instruction: 'Log the attempt and mark whether it should become the next benchmark.',
      title: 'Capture evidence',
    },
  ];

  return {
    anchor,
    durationMinutes: totalDuration(phases),
    intensityCap: 'hard',
    phases,
    safetyNote: 'Increase difficulty only after one honest benchmark repeat.',
    status: 'progress',
    target: readiness.focus,
    title: 'Progression session',
  };
}
