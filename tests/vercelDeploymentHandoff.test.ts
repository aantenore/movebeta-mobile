import { describe, expect, it } from 'vitest';

import {
  assertVercelDeploymentHandoffIsShareSafe,
  buildVercelDeploymentHandoff,
  vercelDeploymentHandoffSchemaVersion,
  VercelDeploymentHandoffSchema,
  type VercelDeploymentHandoff,
} from '../src/core/vercelDeploymentHandoff';

const generatedAt = '2026-06-23T18:00:00.000Z';

function readyInputs() {
  return {
    pwaReadinessReport: {
      generatedAt,
      schemaVersion: 'movebeta.pwa-readiness.v1',
      summary: { status: 'ready' },
    },
    releaseGateReport: {
      completedAt: generatedAt,
      schemaVersion: 'movebeta.release-gate-report.v1',
      status: 'pass',
    },
    vercelDeploymentReport: {
      generatedAt,
      schemaVersion: 'movebeta.vercel-deployment-readiness.v1',
      summary: {
        actionNeededCount: 2,
        projectBinding: 'missing',
        status: 'static-ready',
      },
    },
    vercelWorkflowReport: {
      generatedAt,
      schemaVersion: 'movebeta.vercel-workflow-readiness.v1',
      summary: {
        actionNeededCount: 2,
        activeWorkflowExists: false,
        status: 'template-ready',
      },
    },
    webSmokeReport: {
      generatedAt,
      schemaVersion: 'movebeta.web-smoke-report.v1',
      status: 'pass',
    },
  };
}

describe('Vercel deployment handoff', () => {
  it('builds a share-safe no-backend deployment handoff from static-ready evidence', () => {
    const packet = buildVercelDeploymentHandoff({
      ...readyInputs(),
      generatedAt,
    });

    expect(VercelDeploymentHandoffSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(vercelDeploymentHandoffSchemaVersion);
    expect(packet.summary).toMatchObject({
      blockedPhaseCount: 0,
      deploymentStatus: 'static-ready',
      externalActionCount: 3,
      phaseCount: 7,
      readyPhaseCount: 3,
      status: 'handoff-ready',
      workflowStatus: 'template-ready',
    });
    expect(packet.commands.map((command) => command.command)).toEqual(
      expect.arrayContaining([
        'npx vercel pull --yes --environment=production --token=$VERCEL_TOKEN',
        'npx vercel build --prod --token=$VERCEL_TOKEN',
        'npx vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN',
        'MOVEBETA_SMOKE_URL=<deployment-url> python3 scripts/smoke_web_video.py',
        'npx vercel rollback <deployment-url-or-id> --token=$VERCEL_TOKEN',
      ]),
    );
    expect(packet.privacy).toMatchObject({
      backendRequired: false,
      credentialValuesIncluded: false,
      projectIdValuesIncluded: false,
    });
    expect(JSON.stringify(packet)).not.toMatch(/BEGIN PRIVATE KEY|ghp_|github_pat_|file:\/\/|\/Users\//i);
  });

  it('blocks handoff when static deployment or workflow evidence is blocked', () => {
    const packet = buildVercelDeploymentHandoff({
      ...readyInputs(),
      generatedAt,
      vercelDeploymentReport: {
        generatedAt,
        schemaVersion: 'movebeta.vercel-deployment-readiness.v1',
        summary: { status: 'blocked' },
      },
    });

    expect(packet.summary.status).toBe('blocked');
    expect(packet.summary.blockedPhaseCount).toBeGreaterThan(0);
    expect(packet.summary.nextAction).toBe('Fix Vercel static config or PWA readiness before deployment.');
  });

  it('rejects credential values, local paths, raw media references, and token-like values before sharing', () => {
    const packet = buildVercelDeploymentHandoff({
      ...readyInputs(),
      generatedAt,
    });
    const unsafe: VercelDeploymentHandoff = {
      ...packet,
      phases: [
        {
          ...packet.phases[0],
          nextAction: 'Review file:///Users/antonio/private/beta.mov with ghp_1234567890abcdefTOKENVALUE.',
        },
      ],
    };

    expect(() => assertVercelDeploymentHandoffIsShareSafe(unsafe)).toThrow('Vercel deployment handoff contains credential');
  });
});
