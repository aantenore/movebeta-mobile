import type { LocalAnalysisReport } from './contracts';
import type { ReportAnnotation } from './reportAnnotationRepository';

export type RepeatMatchConfidence = 'high' | 'medium' | 'low';
export type RepeatMatchReason = {
  detail: string;
  id: string;
  label: string;
  points: number;
};

export type RepeatMatchSummary = {
  confidence: RepeatMatchConfidence;
  reasons: RepeatMatchReason[];
  score: number;
  strategy: 'manual' | 'smart-match';
};

export type RepeatMatch = RepeatMatchSummary & {
  report: LocalAnalysisReport;
};

export type RepeatMatchWeights = {
  cueOverlap: number;
  grade: number;
  gym: number;
  projectStatus: number;
  recency: number;
  tags: number;
  title: number;
  wallAngle: number;
};

export const defaultRepeatMatchWeights: RepeatMatchWeights = {
  cueOverlap: 12,
  grade: 14,
  gym: 18,
  projectStatus: 8,
  recency: 8,
  tags: 10,
  title: 14,
  wallAngle: 16,
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenSet(value: string) {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 1));
}

function overlapRatio(left: Set<string>, right: Set<string>) {
  if (left.size === 0 || right.size === 0) return 0;
  const overlap = [...left].filter((token) => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

function annotationByReportId(annotations: ReportAnnotation[]) {
  return new Map(annotations.map((annotation) => [annotation.reportId, annotation]));
}

function confidenceFor(score: number): RepeatMatchConfidence {
  if (score >= 64) return 'high';
  if (score >= 36) return 'medium';
  return 'low';
}

function roundedPoints(weight: number, ratio: number) {
  return Math.round(weight * Math.max(0, Math.min(1, ratio)));
}

function addReason(reasons: RepeatMatchReason[], reason: RepeatMatchReason) {
  if (reason.points > 0) reasons.push(reason);
}

function recencyRatio(currentReport: LocalAnalysisReport, candidate: LocalAnalysisReport) {
  const currentTime = Date.parse(currentReport.session.createdAt);
  const candidateTime = Date.parse(candidate.session.createdAt);
  if (!Number.isFinite(currentTime) || !Number.isFinite(candidateTime) || candidateTime > currentTime) return 0;
  const ageDays = (currentTime - candidateTime) / 86_400_000;
  if (ageDays <= 1) return 1;
  if (ageDays >= 30) return 0.15;
  return 1 - ageDays / 35;
}

function cueOverlapRatio(currentReport: LocalAnalysisReport, candidate: LocalAnalysisReport) {
  const currentCueIds = new Set(currentReport.cues.map((cue) => cue.id));
  const candidateCueIds = new Set(candidate.cues.map((cue) => cue.id));
  return overlapRatio(currentCueIds, candidateCueIds);
}

function tagOverlapRatio(currentAnnotation: ReportAnnotation | undefined, candidateAnnotation: ReportAnnotation | undefined) {
  return overlapRatio(new Set(currentAnnotation?.tags ?? []), new Set(candidateAnnotation?.tags ?? []));
}

function scoreCandidate({
  annotations,
  candidate,
  currentReport,
  weights,
}: {
  annotations: Map<string, ReportAnnotation>;
  candidate: LocalAnalysisReport;
  currentReport: LocalAnalysisReport;
  weights: RepeatMatchWeights;
}): RepeatMatch {
  const reasons: RepeatMatchReason[] = [];
  const currentAnnotation = annotations.get(currentReport.id);
  const candidateAnnotation = annotations.get(candidate.id);
  const wallAnglePoints = currentReport.session.wallAngle === candidate.session.wallAngle ? weights.wallAngle : 0;
  const gymPoints = normalize(currentReport.session.gym) === normalize(candidate.session.gym) ? weights.gym : 0;
  const gradePoints = normalize(currentReport.session.grade) === normalize(candidate.session.grade) ? weights.grade : 0;
  const titlePoints = roundedPoints(weights.title, overlapRatio(tokenSet(currentReport.session.title), tokenSet(candidate.session.title)));
  const cuePoints = roundedPoints(weights.cueOverlap, cueOverlapRatio(currentReport, candidate));
  const tagPoints = roundedPoints(weights.tags, tagOverlapRatio(currentAnnotation, candidateAnnotation));
  const projectStatusPoints =
    currentAnnotation?.projectStatus &&
    candidateAnnotation?.projectStatus &&
    currentAnnotation.projectStatus === candidateAnnotation.projectStatus
      ? weights.projectStatus
      : 0;
  const recencyPoints = roundedPoints(weights.recency, recencyRatio(currentReport, candidate));

  addReason(reasons, {
    detail: `Both attempts use ${currentReport.session.wallAngle} wall-angle metadata.`,
    id: 'wall-angle',
    label: 'Wall angle match',
    points: wallAnglePoints,
  });
  addReason(reasons, {
    detail: `Both attempts are from ${currentReport.session.gym}.`,
    id: 'gym',
    label: 'Gym match',
    points: gymPoints,
  });
  addReason(reasons, {
    detail: `Both attempts use ${currentReport.session.grade}.`,
    id: 'grade',
    label: 'Grade match',
    points: gradePoints,
  });
  addReason(reasons, {
    detail: 'Attempt titles share project tokens.',
    id: 'title',
    label: 'Title overlap',
    points: titlePoints,
  });
  addReason(reasons, {
    detail: 'Current and baseline reports share local cue ids.',
    id: 'cue-overlap',
    label: 'Cue overlap',
    points: cuePoints,
  });
  addReason(reasons, {
    detail: 'Private training-log tags overlap locally.',
    id: 'tags',
    label: 'Tag overlap',
    points: tagPoints,
  });
  addReason(reasons, {
    detail: `Both annotations are marked ${currentAnnotation?.projectStatus}.`,
    id: 'project-status',
    label: 'Project status match',
    points: projectStatusPoints,
  });
  addReason(reasons, {
    detail: 'Candidate is recent enough to compare movement deltas.',
    id: 'recency',
    label: 'Recent baseline',
    points: recencyPoints,
  });

  const score = reasons.reduce((total, reason) => total + reason.points, 0);

  return {
    confidence: confidenceFor(score),
    reasons: reasons.sort((a, b) => b.points - a.points || a.label.localeCompare(b.label)),
    report: candidate,
    score,
    strategy: 'smart-match',
  };
}

export function findBestRepeatMatch(
  currentReport: LocalAnalysisReport,
  candidates: LocalAnalysisReport[],
  annotations: ReportAnnotation[] = [],
  weights: RepeatMatchWeights = defaultRepeatMatchWeights,
): RepeatMatch | null {
  const annotationLookup = annotationByReportId(annotations);
  const eligible = candidates.filter((candidate) => candidate.id !== currentReport.id);
  if (eligible.length === 0) return null;

  return eligible
    .map((candidate) =>
      scoreCandidate({
        annotations: annotationLookup,
        candidate,
        currentReport,
        weights,
      }),
    )
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.report.session.createdAt.localeCompare(a.report.session.createdAt);
    })[0];
}

export function buildManualRepeatMatch(currentReport: LocalAnalysisReport, baselineReport: LocalAnalysisReport): RepeatMatchSummary {
  const match = findBestRepeatMatch(currentReport, [baselineReport]);

  return {
    confidence: match?.confidence ?? 'low',
    reasons: match?.reasons ?? [],
    score: match?.score ?? 0,
    strategy: 'manual',
  };
}
