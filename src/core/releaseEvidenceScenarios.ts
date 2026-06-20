import { z } from 'zod';

import {
  buildLaunchReadinessSummary,
  defaultLaunchReadinessEvidence,
  LaunchReadinessCheckKeySchema,
  LaunchReadinessEvidenceSchema,
  LaunchStatusSchema,
  LaunchTrackSchema,
  type LaunchReadinessCheck,
  type LaunchReadinessEvidence,
} from './launchReadiness';
import { buildReleaseCriticalPath, type ReleaseCriticalPathStep } from './releaseCriticalPath';

export const releaseEvidenceScenarioPlannerSchemaVersion = 'movebeta.release-evidence-scenario-planner.v1';

export const ReleaseEvidenceScenarioConfigSchema = z.object({
  candidateKeys: z.array(LaunchReadinessCheckKeySchema).min(1),
  description: z.string().min(1),
  key: z.string().regex(/^[a-z][a-z0-9-]*$/),
  label: z.string().min(1),
});

const ScenarioStatusSchema = z.enum(['needs-prerequisite', 'no-impact', 'ready', 'would-improve']);

const ScenarioBlockerSchema = z.object({
  key: LaunchReadinessCheckKeySchema,
  label: z.string(),
  owner: z.enum(['engineering', 'qa', 'product', 'release']),
  tracks: z.array(LaunchTrackSchema).min(1),
});

const ScenarioPrerequisiteSchema = z.object({
  key: LaunchReadinessCheckKeySchema,
  label: z.string(),
  requiredFor: LaunchReadinessCheckKeySchema,
});

const ScenarioTrackDeltaSchema = z.object({
  currentReadyChecks: z.number().int().nonnegative(),
  currentStatus: LaunchStatusSchema,
  key: LaunchTrackSchema,
  label: z.string(),
  projectedReadyChecks: z.number().int().nonnegative(),
  projectedStatus: LaunchStatusSchema,
});

export const ReleaseEvidenceScenarioSchema = z.object({
  acceptance: z.array(z.string()).min(1),
  candidateKeys: z.array(LaunchReadinessCheckKeySchema).min(1),
  clearedBlockers: z.array(ScenarioBlockerSchema),
  commands: z.array(z.string()).min(1),
  description: z.string(),
  key: z.string(),
  label: z.string(),
  missingPrerequisites: z.array(ScenarioPrerequisiteSchema),
  proof: z.array(z.string()).min(1),
  remainingBlockers: z.array(ScenarioBlockerSchema),
  sequence: z.number().int().positive(),
  status: ScenarioStatusSchema,
  summary: z.object({
    changedTrackCount: z.number().int().nonnegative(),
    clearedBlockerCount: z.number().int().nonnegative(),
    currentReadyTracks: z.number().int().nonnegative(),
    missingPrerequisiteCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    projectedReadyTracks: z.number().int().nonnegative(),
    totalTracks: z.number().int().positive(),
  }),
  trackDeltas: z.array(ScenarioTrackDeltaSchema),
});

export const ReleaseEvidenceScenarioPlannerSchema = z.object({
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  scenarios: z.array(ReleaseEvidenceScenarioSchema).min(1),
  schemaVersion: z.literal(releaseEvidenceScenarioPlannerSchemaVersion),
  summary: z.object({
    bestScenarioKey: z.string(),
    currentReadyTracks: z.number().int().nonnegative(),
    improvingScenarioCount: z.number().int().nonnegative(),
    maxClearedBlockers: z.number().int().nonnegative(),
    maxProjectedReadyTracks: z.number().int().nonnegative(),
    nextAction: z.string(),
    prerequisiteScenarioCount: z.number().int().nonnegative(),
    readyScenarioCount: z.number().int().nonnegative(),
    scenarioCount: z.number().int().positive(),
    status: z.enum(['blocked', 'ready', 'scenario-ready']),
    totalTracks: z.number().int().positive(),
  }),
});

export type ReleaseEvidenceScenarioConfig = z.infer<typeof ReleaseEvidenceScenarioConfigSchema>;
export type ReleaseEvidenceScenario = z.infer<typeof ReleaseEvidenceScenarioSchema>;
export type ReleaseEvidenceScenarioPlanner = z.infer<typeof ReleaseEvidenceScenarioPlannerSchema>;

const defaultScenarioConfigs: ReleaseEvidenceScenarioConfig[] = [
  {
    candidateKeys: ['cueValidationDataset'],
    description: 'Run only the real-world cue-validation proof path from consented clips and coach review rows.',
    key: 'validation-pilot',
    label: 'Validation pilot',
  },
  {
    candidateKeys: ['iosBuild', 'nativeDeviceQa'],
    description: 'Finish the native build and physical-device QA proof needed for an internal native beta.',
    key: 'native-beta-proof',
    label: 'Native beta proof',
  },
  {
    candidateKeys: ['easProject', 'easCredentials'],
    description: 'Bind the app to the target Expo account and confirm store credential groups without secret values.',
    key: 'store-account-setup',
    label: 'Store account setup',
  },
  {
    candidateKeys: ['cueValidationDataset', 'iosBuild', 'nativeDeviceQa', 'easProject', 'easCredentials'],
    description: 'Collect every external proof bundle required to make demo, internal beta, and store submission ready.',
    key: 'store-submission-proof',
    label: 'Store submission proof',
  },
];

const forbiddenScenarioValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenScenarioValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}

function checksByKey(evidence: LaunchReadinessEvidence) {
  return new Map(
    buildLaunchReadinessSummary(evidence)
      .tracks.flatMap((track) => track.checks)
      .map((check) => [check.key, check]),
  );
}

function tracksForCheck(key: LaunchReadinessCheck['key'], evidence: LaunchReadinessEvidence) {
  return buildLaunchReadinessSummary(evidence).tracks
    .filter((track) => track.checks.some((check) => check.key === key))
    .map((track) => track.key);
}

function blockerForCheck(key: LaunchReadinessCheck['key'], evidence: LaunchReadinessEvidence): z.infer<typeof ScenarioBlockerSchema> {
  const check = checksByKey(evidence).get(key);
  return ScenarioBlockerSchema.parse({
    key,
    label: check?.label ?? key,
    owner: check?.owner ?? 'release',
    tracks: tracksForCheck(key, evidence),
  });
}

function criticalStepsByKey(steps: ReleaseCriticalPathStep[]) {
  return new Map(steps.map((step) => [step.key, step]));
}

function buildProjectedEvidence(evidence: LaunchReadinessEvidence, candidateKeys: Array<LaunchReadinessCheck['key']>) {
  return candidateKeys.reduce<LaunchReadinessEvidence>(
    (projected, key) => ({
      ...projected,
      [key]: true,
    }),
    { ...evidence },
  );
}

function trackDeltas(currentEvidence: LaunchReadinessEvidence, projectedEvidence: LaunchReadinessEvidence) {
  const current = buildLaunchReadinessSummary(currentEvidence).tracks;
  const projected = buildLaunchReadinessSummary(projectedEvidence).tracks;
  const projectedByKey = new Map(projected.map((track) => [track.key, track]));

  return current
    .map((track) => {
      const nextTrack = projectedByKey.get(track.key) ?? track;
      return ScenarioTrackDeltaSchema.parse({
        currentReadyChecks: track.readyChecks,
        currentStatus: track.status,
        key: track.key,
        label: track.label,
        projectedReadyChecks: nextTrack.readyChecks,
        projectedStatus: nextTrack.status,
      });
    })
    .filter((delta) => delta.currentStatus !== delta.projectedStatus || delta.currentReadyChecks !== delta.projectedReadyChecks);
}

function missingPrerequisitesFor(
  candidateKeys: Array<LaunchReadinessCheck['key']>,
  currentEvidence: LaunchReadinessEvidence,
  currentSteps: Map<LaunchReadinessCheck['key'], ReleaseCriticalPathStep>,
) {
  const selected = new Set(candidateKeys);
  return candidateKeys.flatMap((key) => {
    const step = currentSteps.get(key);
    if (!step) return [];
    return step.dependencyKeys
      .filter((dependencyKey) => currentEvidence[dependencyKey] !== true && !selected.has(dependencyKey))
      .map((dependencyKey) =>
        ScenarioPrerequisiteSchema.parse({
          key: dependencyKey,
          label: currentSteps.get(dependencyKey)?.label ?? dependencyKey,
          requiredFor: key,
        }),
      );
  });
}

function statusForScenario({
  clearedBlockers,
  missingPrerequisites,
  projectedReadinessStatus,
  trackDeltaCount,
}: {
  clearedBlockers: z.infer<typeof ScenarioBlockerSchema>[];
  missingPrerequisites: z.infer<typeof ScenarioPrerequisiteSchema>[];
  projectedReadinessStatus: ReturnType<typeof buildLaunchReadinessSummary>['status'];
  trackDeltaCount: number;
}): z.infer<typeof ScenarioStatusSchema> {
  if (missingPrerequisites.length > 0) return 'needs-prerequisite';
  if (projectedReadinessStatus === 'ready') return 'ready';
  if (clearedBlockers.length > 0 || trackDeltaCount > 0) return 'would-improve';
  return 'no-impact';
}

function nextActionForScenario(scenario: {
  key: string;
  label: string;
  missingPrerequisites: z.infer<typeof ScenarioPrerequisiteSchema>[];
  status: z.infer<typeof ScenarioStatusSchema>;
}) {
  if (scenario.status === 'ready') return `${scenario.label} would make every configured launch track ready once proof is committed.`;
  if (scenario.status === 'needs-prerequisite') {
    const prerequisites = uniqueValues(scenario.missingPrerequisites.map((item) => item.label)).join(', ');
    return `Add prerequisite proof first: ${prerequisites}.`;
  }
  if (scenario.status === 'would-improve') return `${scenario.label} would improve release readiness; collect proof and rerun release checks.`;
  return `${scenario.label} does not clear a current blocker from this evidence state.`;
}

function scenarioScore(scenario: ReleaseEvidenceScenario) {
  const statusScore = scenario.status === 'ready' ? 3 : scenario.status === 'would-improve' ? 2 : scenario.status === 'no-impact' ? 1 : 0;
  return [
    statusScore,
    scenario.summary.projectedReadyTracks,
    scenario.summary.clearedBlockerCount,
    -scenario.summary.missingPrerequisiteCount,
    -scenario.candidateKeys.length,
  ];
}

function compareScores(a: number[], b: number[]) {
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (b[index] ?? 0) - (a[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

function plannerNextAction(currentStatus: ReturnType<typeof buildLaunchReadinessSummary>['status'], best: ReleaseEvidenceScenario) {
  if (currentStatus === 'ready') return 'All launch tracks are ready; preserve evidence and refresh handoff artifacts.';
  if (best.status === 'ready') return `Best scenario: ${best.label}. ${best.summary.nextAction}`;
  if (best.status === 'would-improve') return `Start with ${best.label}: it clears ${best.summary.clearedBlockerCount} blockers.`;
  if (best.status === 'needs-prerequisite') return `Resolve prerequisites for ${best.label} before collecting scenario proof.`;
  return 'No scenario clears a current blocker; inspect launch-readiness evidence for drift.';
}

export function assertReleaseEvidenceScenarioPlannerIsShareSafe(packet: ReleaseEvidenceScenarioPlanner) {
  if (containsForbiddenValue(packet)) {
    throw new Error('Release evidence scenario planner contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildReleaseEvidenceScenarioPlanner({
  currentEvidence = defaultLaunchReadinessEvidence,
  generatedAt = new Date().toISOString(),
  scenarios = defaultScenarioConfigs,
}: {
  currentEvidence?: LaunchReadinessEvidence;
  generatedAt?: string;
  scenarios?: ReleaseEvidenceScenarioConfig[];
} = {}): ReleaseEvidenceScenarioPlanner {
  const evidence = LaunchReadinessEvidenceSchema.parse(currentEvidence);
  const scenarioConfigs = z.array(ReleaseEvidenceScenarioConfigSchema).min(1).parse(scenarios);
  const currentReadiness = buildLaunchReadinessSummary(evidence);
  const currentPath = buildReleaseCriticalPath({ evidence });
  const currentSteps = criticalStepsByKey(currentPath.steps);
  const currentChecks = checksByKey(evidence);

  const builtScenarios = scenarioConfigs.map((scenario, index) => {
    const candidateKeys = uniqueValues(scenario.candidateKeys) as Array<LaunchReadinessCheck['key']>;
    const projectedEvidence = buildProjectedEvidence(evidence, candidateKeys);
    const projectedReadiness = buildLaunchReadinessSummary(projectedEvidence);
    const projectedPath = buildReleaseCriticalPath({ evidence: projectedEvidence });
    const projectedSteps = criticalStepsByKey(projectedPath.steps);
    const deltas = trackDeltas(evidence, projectedEvidence);
    const missingPrerequisites = missingPrerequisitesFor(candidateKeys, evidence, currentSteps);
    const clearedBlockers = candidateKeys
      .filter((key) => currentChecks.get(key)?.status !== 'ready' && checksByKey(projectedEvidence).get(key)?.status === 'ready')
      .map((key) => blockerForCheck(key, evidence));
    const remainingBlockers = projectedPath.steps
      .filter((step) => step.status !== 'ready')
      .map((step) => blockerForCheck(step.key, projectedEvidence));
    const selectedSteps = candidateKeys.map((key) => currentSteps.get(key) ?? projectedSteps.get(key)).filter(Boolean) as ReleaseCriticalPathStep[];
    const acceptance = uniqueValues(selectedSteps.flatMap((step) => step.acceptance));
    const commands = uniqueValues(selectedSteps.flatMap((step) => step.commands));
    const proof = uniqueValues(selectedSteps.flatMap((step) => step.proof));
    const status = statusForScenario({
      clearedBlockers,
      missingPrerequisites,
      projectedReadinessStatus: projectedReadiness.status,
      trackDeltaCount: deltas.length,
    });
    const nextAction = nextActionForScenario({
      key: scenario.key,
      label: scenario.label,
      missingPrerequisites,
      status,
    });

    return ReleaseEvidenceScenarioSchema.parse({
      acceptance: acceptance.length > 0 ? acceptance : ['Refresh launch-readiness evidence after collecting scenario proof.'],
      candidateKeys,
      clearedBlockers,
      commands: commands.length > 0 ? commands : ['npm run release:readiness'],
      description: scenario.description,
      key: scenario.key,
      label: scenario.label,
      missingPrerequisites,
      proof: proof.length > 0 ? proof : ['docs/sdlc/launch-readiness-report.json'],
      remainingBlockers,
      sequence: index + 1,
      status,
      summary: {
        changedTrackCount: deltas.length,
        clearedBlockerCount: clearedBlockers.length,
        currentReadyTracks: currentReadiness.readyTracks,
        missingPrerequisiteCount: missingPrerequisites.length,
        nextAction,
        projectedReadyTracks: projectedReadiness.readyTracks,
        totalTracks: currentReadiness.tracks.length,
      },
      trackDeltas: deltas,
    });
  });

  const bestScenario = [...builtScenarios].sort((a, b) => compareScores(scenarioScore(a), scenarioScore(b)))[0];
  const readyScenarioCount = builtScenarios.filter((scenario) => scenario.status === 'ready').length;
  const improvingScenarioCount = builtScenarios.filter((scenario) => scenario.status === 'would-improve').length;
  const prerequisiteScenarioCount = builtScenarios.filter((scenario) => scenario.status === 'needs-prerequisite').length;
  const maxProjectedReadyTracks = Math.max(...builtScenarios.map((scenario) => scenario.summary.projectedReadyTracks));
  const maxClearedBlockers = Math.max(...builtScenarios.map((scenario) => scenario.summary.clearedBlockerCount));
  const status =
    currentReadiness.status === 'ready' ? 'ready' : readyScenarioCount > 0 ? 'scenario-ready' : 'blocked';
  const packet = ReleaseEvidenceScenarioPlannerSchema.parse({
    generatedAt,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    scenarios: builtScenarios,
    schemaVersion: releaseEvidenceScenarioPlannerSchemaVersion,
    summary: {
      bestScenarioKey: bestScenario.key,
      currentReadyTracks: currentReadiness.readyTracks,
      improvingScenarioCount,
      maxClearedBlockers,
      maxProjectedReadyTracks,
      nextAction: plannerNextAction(currentReadiness.status, bestScenario),
      prerequisiteScenarioCount,
      readyScenarioCount,
      scenarioCount: builtScenarios.length,
      status,
      totalTracks: currentReadiness.tracks.length,
    },
  });

  return assertReleaseEvidenceScenarioPlannerIsShareSafe(packet);
}
