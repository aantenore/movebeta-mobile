export const defaultCueValidationDatasetAcceptance = {
  maxReviewerScoreSpreadPerCriterion: 1,
  minAverageCueScore: 4,
  minClips: 20,
  minDistinctReviewersPerCue: 2,
  minDistinctReviewersPerClip: 2,
  minReviewsPerCue: 1,
  requiredReviewModes: ['packet-only'],
  requiredReviewerRoles: ['coach'],
  requiredWallAngles: ['slab', 'vertical', 'overhang'],
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

const cueValidationScoreCriteria = ['relevance', 'timingAccuracy', 'drillFit', 'safetyLanguage'];

function pass(id, label, detail) {
  return { detail, id, label, status: 'pass' };
}

function fail(id, label, detail) {
  return { detail, id, label, status: 'fail' };
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function numericScore(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function reviewScore(review) {
  return average([review.relevance, review.timingAccuracy, review.drillFit, review.safetyLanguage]);
}

function scoreSpread(reviews, criterion) {
  const scores = reviews.map((review) => review[criterion]);
  if (scores.length === 0) return 0;
  return Math.max(...scores) - Math.min(...scores);
}

function cueConsensusCheck(prefix, cueId, reviews, acceptance) {
  const reviewerCount = new Set(reviews.map((review) => review.reviewerId)).size;
  const spreads = cueValidationScoreCriteria.map((criterion) => ({
    criterion,
    spread: scoreSpread(reviews, criterion),
  }));
  const maxSpread = Math.max(0, ...spreads.map((item) => item.spread));
  const failingSpread = spreads.find((item) => item.spread > acceptance.maxReviewerScoreSpreadPerCriterion);

  if (reviewerCount < acceptance.minDistinctReviewersPerCue) {
    return {
      check: fail(
        `${prefix}-cue-${cueId}-reviewer-consensus`,
        `Cue ${cueId} reviewer consensus`,
        `Cue requires at least ${acceptance.minDistinctReviewersPerCue} distinct reviewer${acceptance.minDistinctReviewersPerCue === 1 ? '' : 's'}.`,
      ),
      maxSpread,
    };
  }

  if (failingSpread) {
    return {
      check: fail(
        `${prefix}-cue-${cueId}-reviewer-consensus`,
        `Cue ${cueId} reviewer consensus`,
        `${failingSpread.criterion} spread ${failingSpread.spread}/4 exceeds ${acceptance.maxReviewerScoreSpreadPerCriterion}.`,
      ),
      maxSpread,
    };
  }

  return {
    check: pass(
      `${prefix}-cue-${cueId}-reviewer-consensus`,
      `Cue ${cueId} reviewer consensus`,
      `${reviewerCount} reviewers · max spread ${maxSpread}/4`,
    ),
    maxSpread,
  };
}

function containsRawArtifact(value, path = '$') {
  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = containsRawArtifact(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

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

function validateReviewShape(review) {
  return (
    hasText(review?.cueId) &&
    hasText(review?.reviewerId) &&
    hasText(review?.reviewerRole) &&
    numericScore(review?.drillFit) &&
    numericScore(review?.relevance) &&
    numericScore(review?.safetyLanguage) &&
    numericScore(review?.timingAccuracy)
  );
}

function validateClip(clip, index, acceptance) {
  const checks = [];
  const prefix = `clip-${index + 1}`;
  const packet = clip?.packet;
  const cues = Array.isArray(packet?.analysis?.cues) ? packet.analysis.cues : [];
  const reviews = Array.isArray(clip?.reviews) ? clip.reviews : [];
  const cueIds = new Set(cues.map((cue) => cue?.id).filter(hasText));
  const validReviews = reviews.filter(validateReviewShape).filter((review) => cueIds.has(review.cueId));
  const reviewModes = new Set(reviews.map((review) => review.reviewMode).filter(hasText));
  const reviewerRoles = new Set(validReviews.map((review) => review.reviewerRole));
  const distinctReviewers = new Set(validReviews.map((review) => review.reviewerId));
  const rawArtifactPath = containsRawArtifact(packet);

  checks.push(
    hasText(clip?.clipId) && hasText(clip?.consentRecordId)
      ? pass(`${prefix}-identity`, 'Clip identity', `${clip.clipId} · ${clip.consentRecordId}`)
      : fail(`${prefix}-identity`, 'Clip identity', 'clipId and consentRecordId are required.'),
  );

  checks.push(
    hasText(packet?.reportId) || hasText(packet?.id)
      ? pass(`${prefix}-packet`, 'Coach packet', packet.reportId ?? packet.id)
      : fail(`${prefix}-packet`, 'Coach packet', 'A coach review packet with an id or reportId is required.'),
  );

  checks.push(
    ['slab', 'vertical', 'overhang'].includes(packet?.session?.wallAngle)
      ? pass(`${prefix}-wall-angle`, 'Wall angle', packet.session.wallAngle)
      : fail(`${prefix}-wall-angle`, 'Wall angle', 'Packet session wallAngle must be slab, vertical, or overhang.'),
  );

  checks.push(
    packet?.consent?.videoLeavesDevice === false && packet?.consent?.rawVideoIncluded === false
      ? pass(`${prefix}-consent`, 'Consent privacy', 'Packet excludes raw video and keeps video on-device.')
      : fail(`${prefix}-consent`, 'Consent privacy', 'Packet consent must keep videoLeavesDevice=false and rawVideoIncluded=false.'),
  );

  checks.push(
    rawArtifactPath === null
      ? pass(`${prefix}-raw-artifacts`, 'Raw artifact exclusion', 'No raw video URI, key frame, or landmarks found.')
      : fail(`${prefix}-raw-artifacts`, 'Raw artifact exclusion', `Raw artifact-like field found at ${rawArtifactPath}.`),
  );

  checks.push(
    cues.length > 0 && cues.every((cue) => hasText(cue?.id) && hasText(cue?.title))
      ? pass(`${prefix}-cues`, 'Generated cues', `${cues.length} cues`)
      : fail(`${prefix}-cues`, 'Generated cues', 'At least one cue with id and title is required.'),
  );

  checks.push(
    validReviews.length === reviews.length && reviews.length > 0
      ? pass(`${prefix}-review-shape`, 'Review shape', `${reviews.length} valid reviews`)
      : fail(`${prefix}-review-shape`, 'Review shape', 'Every review must target a known cue and include reviewer id, role, and 1-5 scores.'),
  );

  const consensusSpreads = [];

  for (const cueId of cueIds) {
    const cueReviews = validReviews.filter((review) => review.cueId === cueId);
    const count = cueReviews.length;
    checks.push(
      count >= acceptance.minReviewsPerCue
        ? pass(`${prefix}-cue-${cueId}-reviews`, `Cue ${cueId} reviews`, `${count} reviews`)
        : fail(
            `${prefix}-cue-${cueId}-reviews`,
            `Cue ${cueId} reviews`,
            `Cue requires at least ${acceptance.minReviewsPerCue} review${acceptance.minReviewsPerCue === 1 ? '' : 's'}.`,
          ),
    );
    const consensus = cueConsensusCheck(prefix, cueId, cueReviews, acceptance);
    checks.push(consensus.check);
    consensusSpreads.push(consensus.maxSpread);
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

  const scores = validReviews.map(reviewScore);
  const safetyScores = validReviews.map((review) => review.safetyLanguage);
  const averageScore = Number(average(scores).toFixed(2));
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
    maxReviewerScoreSpreadPerCriterion: Math.max(0, ...consensusSpreads),
    reviewCount: validReviews.length,
    wallAngle: packet?.session?.wallAngle,
  };
}

export function validateCueValidationDataset(dataset) {
  const acceptance = {
    ...defaultCueValidationDatasetAcceptance,
    ...(dataset?.acceptance ?? {}),
  };
  const clips = Array.isArray(dataset?.clips) ? dataset.clips : [];
  const checks = [];
  const clipResults = clips.map((clip, index) => validateClip(clip, index, acceptance));
  const wallAngles = new Set(clipResults.map((result) => result.wallAngle).filter(hasText));
  const totalReviewCount = clipResults.reduce((sum, result) => sum + result.reviewCount, 0);
  const totalCueCount = clipResults.reduce((sum, result) => sum + result.cueCount, 0);
  const maxReviewerScoreSpreadPerCriterion = Math.max(0, ...clipResults.map((result) => result.maxReviewerScoreSpreadPerCriterion));
  const datasetAverageScore = Number(average(clipResults.flatMap((result) => (result.reviewCount > 0 ? [result.averageScore] : []))).toFixed(2));

  checks.push(
    dataset?.schemaVersion === 'movebeta.cue-validation-dataset.v1' && hasText(dataset?.appVersion) && hasText(dataset?.generatedAt)
      ? pass('dataset-header', 'Dataset header', `${dataset.schemaVersion} · ${dataset.appVersion} · ${dataset.generatedAt}`)
      : fail(
          'dataset-header',
          'Dataset header',
          'schemaVersion=movebeta.cue-validation-dataset.v1, appVersion, and generatedAt are required.',
        ),
  );

  checks.push(
    clips.length >= acceptance.minClips
      ? pass('dataset-size', 'Dataset size', `${clips.length} clips`)
      : fail('dataset-size', 'Dataset size', `At least ${acceptance.minClips} consented clips are required.`),
  );

  for (const wallAngle of acceptance.requiredWallAngles) {
    checks.push(
      wallAngles.has(wallAngle)
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
      clipCount: clips.length,
      cueCount: totalCueCount,
      maxReviewerScoreSpreadPerCriterion,
      reviewCount: totalReviewCount,
      wallAngles: [...wallAngles].sort(),
    },
  };
}
