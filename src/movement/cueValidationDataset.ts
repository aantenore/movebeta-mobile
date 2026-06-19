import {
  CueValidationCompletedDatasetSchema,
  defaultCueValidationStudyAcceptance,
  type CueValidationCompletedDataset,
  type CueValidationStudyAcceptance,
} from './cueValidationStudy';

export type CueValidationGateCheck = {
  detail: string;
  id: string;
  label: string;
  status: 'fail' | 'pass';
};

export type CueValidationGateResult = {
  checks: CueValidationGateCheck[];
  ready: boolean;
  summary: {
    averageScore: number;
    clipCount: number;
    cueCount: number;
    reviewCount: number;
    wallAngles: Array<'overhang' | 'slab' | 'vertical'>;
  };
};

const rawArtifactKeys = new Set([
  'keyFrame',
  'landmarks',
  'rawVideo',
  'rawVideoIncluded',
  'rawVideoUri',
  'videoPath',
  'videoUri',
]);

function pass(id: string, label: string, detail: string): CueValidationGateCheck {
  return { detail, id, label, status: 'pass' };
}

function fail(id: string, label: string, detail: string): CueValidationGateCheck {
  return { detail, id, label, status: 'fail' };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reviewScore(review: CueValidationCompletedDataset['clips'][number]['reviews'][number]) {
  return average([review.relevance, review.timingAccuracy, review.drillFit, review.safetyLanguage]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function containsRawArtifact(value: unknown, path = '$'): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = containsRawArtifact(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (rawArtifactKeys.has(key)) {
      if (key === 'rawVideoIncluded' && nestedValue === false) continue;
      return `${path}.${key}`;
    }
    const found = containsRawArtifact(nestedValue, `${path}.${key}`);
    if (found) return found;
  }

  return null;
}

function validateClip(
  clip: CueValidationCompletedDataset['clips'][number],
  index: number,
  acceptance: CueValidationStudyAcceptance,
) {
  const checks: CueValidationGateCheck[] = [];
  const prefix = `clip-${index + 1}`;
  const cues = clip.packet.analysis.cues;
  const cueIds = new Set(cues.map((cue) => cue.id));
  const validReviews = clip.reviews.filter((review) => cueIds.has(review.cueId));
  const reviewModes = new Set(clip.reviews.map((review) => review.reviewMode));
  const reviewerRoles = new Set(validReviews.map((review) => review.reviewerRole));
  const distinctReviewers = new Set(validReviews.map((review) => review.reviewerId));

  checks.push(pass(`${prefix}-identity`, 'Clip identity', `${clip.clipId} · ${clip.consentRecordId}`));
  checks.push(pass(`${prefix}-packet`, 'Coach packet', clip.packet.reportId));
  checks.push(pass(`${prefix}-wall-angle`, 'Wall angle', clip.packet.session.wallAngle));
  checks.push(pass(`${prefix}-consent`, 'Consent privacy', 'Packet excludes raw video and keeps video on-device.'));
  checks.push(
    cues.length > 0
      ? pass(`${prefix}-cues`, 'Generated cues', `${cues.length} cues`)
      : fail(`${prefix}-cues`, 'Generated cues', 'At least one generated cue is required.'),
  );
  checks.push(
    validReviews.length === clip.reviews.length && clip.reviews.length > 0
      ? pass(`${prefix}-review-shape`, 'Review shape', `${clip.reviews.length} valid reviews`)
      : fail(`${prefix}-review-shape`, 'Review shape', 'Every review must target a known generated cue.'),
  );

  for (const cueId of cueIds) {
    const count = validReviews.filter((review) => review.cueId === cueId).length;
    checks.push(
      count >= acceptance.minReviewsPerCue
        ? pass(`${prefix}-cue-${cueId}-reviews`, `Cue ${cueId} reviews`, `${count} reviews`)
        : fail(
            `${prefix}-cue-${cueId}-reviews`,
            `Cue ${cueId} reviews`,
            `Cue requires at least ${acceptance.minReviewsPerCue} review${acceptance.minReviewsPerCue === 1 ? '' : 's'}.`,
          ),
    );
  }

  checks.push(
    distinctReviewers.size >= acceptance.minDistinctReviewersPerClip
      ? pass(`${prefix}-reviewers`, 'Distinct reviewers', `${distinctReviewers.size}`)
      : fail(
          `${prefix}-reviewers`,
          'Distinct reviewers',
          `Clip requires at least ${acceptance.minDistinctReviewersPerClip} distinct reviewer${acceptance.minDistinctReviewersPerClip === 1 ? '' : 's'}.`,
        ),
  );

  for (const role of acceptance.requiredReviewerRoles) {
    checks.push(
      reviewerRoles.has(role)
        ? pass(`${prefix}-role-${role}`, `Reviewer role ${role}`, 'present')
        : fail(`${prefix}-role-${role}`, `Reviewer role ${role}`, 'Required reviewer role is missing.'),
    );
  }

  for (const mode of acceptance.requiredReviewModes) {
    checks.push(
      reviewModes.has(mode)
        ? pass(`${prefix}-mode-${mode}`, `Review mode ${mode}`, 'present')
        : fail(`${prefix}-mode-${mode}`, `Review mode ${mode}`, 'Required review mode is missing.'),
    );
  }

  const averageScore = Number(average(validReviews.map(reviewScore)).toFixed(2));
  const safetyScores = validReviews.map((review) => review.safetyLanguage);
  checks.push(
    averageScore >= acceptance.minAverageCueScore && safetyScores.every((score) => score >= 4)
      ? pass(`${prefix}-scores`, 'Review scores', `${averageScore}/5`)
      : fail(
          `${prefix}-scores`,
          'Review scores',
          `Average score must be >= ${acceptance.minAverageCueScore} and safetyLanguage must be >= 4 for every review.`,
        ),
  );

  return {
    averageScore,
    checks,
    cueCount: cues.length,
    reviewCount: validReviews.length,
    wallAngle: clip.packet.session.wallAngle,
  };
}

export function validateCueValidationCompletedDataset(dataset: unknown): CueValidationGateResult {
  const rawArtifactPath = containsRawArtifact(dataset);
  const parsed = CueValidationCompletedDatasetSchema.safeParse(dataset);
  const checks: CueValidationGateCheck[] = [
    rawArtifactPath === null
      ? pass('dataset-raw-artifacts', 'Raw artifact exclusion', 'No raw video URI, key frame, or landmarks found.')
      : fail('dataset-raw-artifacts', 'Raw artifact exclusion', `Raw artifact-like field found at ${rawArtifactPath}.`),
  ];

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    checks.unshift(
      fail('dataset-schema', 'Dataset schema', issue ? `${issue.path.join('.')}: ${issue.message}` : 'Dataset schema is invalid.'),
    );
    return {
      checks,
      ready: false,
      summary: {
        averageScore: 0,
        clipCount: 0,
        cueCount: 0,
        reviewCount: 0,
        wallAngles: [],
      },
    };
  }

  const data = parsed.data;
  const acceptance = {
    ...defaultCueValidationStudyAcceptance,
    ...data.acceptance,
  };
  const clipResults = data.clips.map((clip, index) => validateClip(clip, index, acceptance));
  const wallAngles = [...new Set(clipResults.map((result) => result.wallAngle))].sort();
  const totalCueCount = clipResults.reduce((sum, result) => sum + result.cueCount, 0);
  const totalReviewCount = clipResults.reduce((sum, result) => sum + result.reviewCount, 0);
  const datasetAverageScore = Number(
    average(clipResults.flatMap((result) => (result.reviewCount > 0 ? [result.averageScore] : []))).toFixed(2),
  );

  checks.unshift(pass('dataset-schema', 'Dataset schema', `${data.schemaVersion} · ${data.appVersion}`));
  checks.push(
    data.clips.length >= acceptance.minClips
      ? pass('dataset-size', 'Dataset size', `${data.clips.length} clips`)
      : fail('dataset-size', 'Dataset size', `At least ${acceptance.minClips} consented clips are required.`),
  );

  for (const wallAngle of acceptance.requiredWallAngles) {
    checks.push(
      wallAngles.includes(wallAngle)
        ? pass(`wall-angle-${wallAngle}`, `${wallAngle} coverage`, 'present')
        : fail(`wall-angle-${wallAngle}`, `${wallAngle} coverage`, 'Required wall angle is missing.'),
    );
  }

  checks.push(...clipResults.flatMap((result) => result.checks));
  checks.push(
    datasetAverageScore >= acceptance.minAverageCueScore
      ? pass('dataset-average-score', 'Dataset average score', `${datasetAverageScore}/5`)
      : fail('dataset-average-score', 'Dataset average score', `Dataset average score must be >= ${acceptance.minAverageCueScore}.`),
  );

  return {
    checks,
    ready: checks.every((check) => check.status === 'pass'),
    summary: {
      averageScore: datasetAverageScore,
      clipCount: data.clips.length,
      cueCount: totalCueCount,
      reviewCount: totalReviewCount,
      wallAngles,
    },
  };
}

export function formatCueValidationGateSummary(result: CueValidationGateResult) {
  const failedCount = result.checks.filter((check) => check.status === 'fail').length;
  return [
    `Validation gate: ${result.ready ? 'ready' : 'needs data'}`,
    `${result.summary.clipCount} clips`,
    `${result.summary.reviewCount} reviews`,
    `average ${result.summary.averageScore}/5`,
    `${failedCount} open checks`,
  ].join(' · ');
}

export function formatCueValidationGateFailures(result: CueValidationGateResult, limit = 6) {
  const failures = result.checks.filter((check) => check.status === 'fail').slice(0, limit);
  if (failures.length === 0) return 'Validation gate checks passed.';
  return failures.map((check) => `- ${check.label}: ${check.detail}`).join('\n');
}
