import { z } from 'zod';

export const vercelDeploymentHandoffSchemaVersion = 'movebeta.vercel-deployment-handoff.v1';

const VercelHandoffStatusSchema = z.enum(['handoff-ready', 'linked-ready', 'deployed-ready', 'blocked']);
const VercelHandoffPhaseStatusSchema = z.enum(['verified', 'ready-to-run', 'external-required', 'blocked']);
const VercelHandoffOwnerSchema = z.enum(['engineering', 'qa', 'release']);

const VercelHandoffPhaseSchema = z.object({
  evidence: z.array(z.string()).min(1),
  key: z.string(),
  label: z.string(),
  nextAction: z.string(),
  owner: VercelHandoffOwnerSchema,
  status: VercelHandoffPhaseStatusSchema,
});

const VercelHandoffCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: VercelHandoffOwnerSchema,
  purpose: z.string(),
});

export const VercelDeploymentHandoffSchema = z.object({
  commands: z.array(VercelHandoffCommandSchema),
  generatedAt: z.string(),
  phases: z.array(VercelHandoffPhaseSchema),
  privacy: z.object({
    backendRequired: z.literal(false),
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    projectIdValuesIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  rollback: z.object({
    command: z.string(),
    strategy: z.string(),
  }),
  schemaVersion: z.literal(vercelDeploymentHandoffSchemaVersion),
  summary: z.object({
    blockedPhaseCount: z.number().int().nonnegative(),
    commandCount: z.number().int().nonnegative(),
    deploymentStatus: z.string(),
    externalActionCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    phaseCount: z.number().int().positive(),
    readyPhaseCount: z.number().int().nonnegative(),
    status: VercelHandoffStatusSchema,
    workflowStatus: z.string(),
  }),
});

export type VercelDeploymentHandoff = z.infer<typeof VercelDeploymentHandoffSchema>;
export type VercelHandoffStatus = z.infer<typeof VercelHandoffStatusSchema>;
type VercelHandoffPhase = z.infer<typeof VercelHandoffPhaseSchema>;

export type VercelDeploymentHandoffInput = {
  generatedAt?: string;
  pwaReadinessReport?: unknown;
  releaseGateReport?: unknown;
  vercelDeploymentReport?: unknown;
  vercelWorkflowReport?: unknown;
  webSmokeReport?: unknown;
};

const forbiddenVercelHandoffValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenVercelHandoffValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenVercelHandoffValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenVercelHandoffValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenVercelHandoffValue);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function nestedRecord(value: unknown, key: string): Record<string, unknown> {
  const next = record(value)[key];
  return isRecord(next) ? next : {};
}

function text(value: unknown, fallback = 'unknown') {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function reportStatus(report: unknown, fallback = 'missing') {
  return text(record(report).status ?? nestedRecord(report, 'summary').status, fallback);
}

function phase(input: VercelHandoffPhase): VercelHandoffPhase {
  return VercelHandoffPhaseSchema.parse(input);
}

function isReadyStatus(value: string, readyStatuses: string[]) {
  return readyStatuses.includes(value);
}

function commands(): Array<z.infer<typeof VercelHandoffCommandSchema>> {
  return [
    {
      command: 'npm run release:check',
      key: 'release-check',
      label: 'Local release gate',
      owner: 'engineering',
      purpose: 'Refresh tests, model evidence, PWA output, Vercel readiness, supply review, data-room, and freshness gates before deployment.',
    },
    {
      command: 'npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN',
      key: 'vercel-pull',
      label: 'Pull Vercel settings',
      owner: 'release',
      purpose: 'Bind the working copy to the selected Vercel project using CI/local secrets only.',
    },
    {
      command: 'npx vercel build --prod --token=$VERCEL_TOKEN',
      key: 'vercel-build',
      label: 'Build prebuilt artifact',
      owner: 'release',
      purpose: 'Build the static PWA with production Vercel settings before deployment.',
    },
    {
      command: 'npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN',
      key: 'vercel-deploy',
      label: 'Deploy prebuilt artifact',
      owner: 'release',
      purpose: 'Deploy the already-built static PWA artifact to production without remote rebuilding.',
    },
    {
      command: 'MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py',
      key: 'post-deploy-smoke',
      label: 'Post-deploy smoke',
      owner: 'qa',
      purpose: 'Verify the production URL renders release UI, PWA cache paths, and model-delivery screens.',
    },
    {
      command: 'npx vercel inspect <deployment-url> --token=$VERCEL_TOKEN',
      key: 'inspect-deployment',
      label: 'Inspect deployment',
      owner: 'release',
      purpose: 'Capture deployment status and metadata after production deploy.',
    },
    {
      command: 'npx vercel rollback <deployment-url-or-id> --token=$VERCEL_TOKEN',
      key: 'rollback',
      label: 'Rollback deployment',
      owner: 'release',
      purpose: 'Restore a previous production deployment if post-deploy smoke or monitoring fails.',
    },
  ];
}

function nextActionFor(status: VercelHandoffStatus, phases: VercelHandoffPhase[]) {
  const blocked = phases.find((item) => item.status === 'blocked');
  if (blocked) return blocked.nextAction;

  const external = phases.find((item) => item.status === 'external-required');
  if (external) return external.nextAction;

  const readyToRun = phases.find((item) => item.status === 'ready-to-run');
  if (readyToRun) return readyToRun.nextAction;

  if (status === 'deployed-ready') return 'Keep production deployment evidence and smoke results fresh before handoff.';
  return 'Run the prebuilt Vercel deployment commands and post-deploy smoke against the deployment URL.';
}

export function assertVercelDeploymentHandoffIsShareSafe(packet: VercelDeploymentHandoff) {
  if (containsForbiddenVercelHandoffValue(packet)) {
    throw new Error('Vercel deployment handoff contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildVercelDeploymentHandoff({
  generatedAt = new Date().toISOString(),
  pwaReadinessReport,
  releaseGateReport,
  vercelDeploymentReport,
  vercelWorkflowReport,
  webSmokeReport,
}: VercelDeploymentHandoffInput = {}): VercelDeploymentHandoff {
  const releaseGateStatus = reportStatus(releaseGateReport);
  const pwaStatus = reportStatus(pwaReadinessReport);
  const webSmokeStatus = reportStatus(webSmokeReport);
  const deploymentStatus = reportStatus(vercelDeploymentReport);
  const workflowStatus = reportStatus(vercelWorkflowReport);
  const deploymentSummary = nestedRecord(vercelDeploymentReport, 'summary');
  const workflowSummary = nestedRecord(vercelWorkflowReport, 'summary');
  const deploymentBlocked = deploymentStatus === 'blocked';
  const workflowBlocked = workflowStatus === 'blocked';
  const deploymentLinked = deploymentStatus === 'linked' || deploymentStatus === 'ready';
  const workflowActive = workflowStatus === 'active-ready' || workflowStatus === 'ready';
  const productionProofReady = deploymentLinked && workflowActive && webSmokeStatus === 'pass';

  const phases = [
    phase({
      evidence: ['docs/sdlc/release-gate-report.json', 'docs/sdlc/pwa-readiness-report.json', 'docs/sdlc/web-smoke-report.json'],
      key: 'static-release-proof',
      label: 'Static release proof',
      nextAction: 'Run npm run release:check before deployment.',
      owner: 'engineering',
      status:
        releaseGateStatus === 'pass' && pwaStatus === 'ready' && webSmokeStatus === 'pass'
          ? 'verified'
          : 'blocked',
    }),
    phase({
      evidence: ['docs/sdlc/vercel-deployment-report.json', 'vercel.json'],
      key: 'static-vercel-config',
      label: 'Static Vercel config',
      nextAction: deploymentBlocked
        ? 'Fix Vercel static config or PWA readiness before deployment.'
        : 'Keep vercel.json on the static prebuilt PWA contract before deployment.',
      owner: 'release',
      status: deploymentBlocked ? 'blocked' : 'verified',
    }),
    phase({
      evidence: ['docs/sdlc/vercel-deployment-report.json', '.vercel/project.json'],
      key: 'project-binding',
      label: 'Project binding',
      nextAction: 'Run npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN on the target Vercel account.',
      owner: 'release',
      status: deploymentLinked ? 'verified' : deploymentBlocked ? 'blocked' : 'external-required',
    }),
    phase({
      evidence: ['docs/sdlc/vercel-deployment-report.json', '.env.example'],
      key: 'deployment-secrets',
      label: 'Deployment secrets',
      nextAction: 'Set VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID only in local shell, Vercel settings, or GitHub secrets.',
      owner: 'release',
      status:
        numberValue(deploymentSummary.actionNeededCount) === 0 && deploymentLinked
          ? 'verified'
          : deploymentBlocked
            ? 'blocked'
            : 'external-required',
    }),
    phase({
      evidence: ['docs/sdlc/vercel-workflow-report.json', 'docs/sdlc/ci-templates/vercel-static-deploy.yml'],
      key: 'workflow-template',
      label: 'Workflow template',
      nextAction: 'Keep the documented Vercel workflow template aligned with release gate and prebuilt deploy commands.',
      owner: 'release',
      status: workflowBlocked ? 'blocked' : 'verified',
    }),
    phase({
      evidence: ['docs/sdlc/vercel-workflow-report.json', '.github/workflows/vercel-static-deploy.yml'],
      key: 'workflow-activation',
      label: 'Workflow activation',
      nextAction: 'Add Vercel GitHub secrets and activate .github/workflows/vercel-static-deploy.yml when workflow scope is available.',
      owner: 'release',
      status:
        workflowActive && numberValue(workflowSummary.actionNeededCount) === 0
          ? 'verified'
          : workflowBlocked
            ? 'blocked'
            : 'external-required',
    }),
    phase({
      evidence: ['docs/sdlc/vercel-deployment-handoff.json', 'docs/sdlc/web-smoke-report.json'],
      key: 'production-smoke',
      label: 'Production smoke',
      nextAction: 'Run MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py after production deployment.',
      owner: 'qa',
      status: productionProofReady ? 'verified' : deploymentBlocked || workflowBlocked ? 'blocked' : 'ready-to-run',
    }),
  ];
  const blockedPhaseCount = phases.filter((item) => item.status === 'blocked').length;
  const externalActionCount = phases.filter((item) => item.status === 'external-required').length;
  const readyPhaseCount = phases.filter((item) => item.status === 'verified').length;
  const status: VercelHandoffStatus =
    blockedPhaseCount > 0
      ? 'blocked'
      : productionProofReady
        ? 'deployed-ready'
        : deploymentLinked && workflowActive
          ? 'linked-ready'
          : 'handoff-ready';
  const commandList = commands();
  const packet = VercelDeploymentHandoffSchema.parse({
    commands: commandList,
    generatedAt,
    phases,
    privacy: {
      backendRequired: false,
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      projectIdValuesIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    rollback: {
      command: 'npx vercel rollback <deployment-url-or-id> --token=$VERCEL_TOKEN',
      strategy: 'Use Vercel rollback to restore the previous production deployment if production smoke fails after deploy.',
    },
    schemaVersion: vercelDeploymentHandoffSchemaVersion,
    summary: {
      blockedPhaseCount,
      commandCount: commandList.length,
      deploymentStatus,
      externalActionCount,
      nextAction: nextActionFor(status, phases),
      phaseCount: phases.length,
      readyPhaseCount,
      status,
      workflowStatus,
    },
  });

  return assertVercelDeploymentHandoffIsShareSafe(packet);
}
