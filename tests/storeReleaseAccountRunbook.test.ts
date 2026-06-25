import { describe, expect, it } from 'vitest';

import {
  StoreReleaseAccountRunbookSchema,
  assertStoreReleaseAccountRunbookIsShareSafe,
  buildStoreReleaseAccountRunbook,
  storeReleaseAccountRunbookSchemaVersion,
  type StoreReleaseAccountRunbook,
} from '../src/core/storeReleaseAccountRunbook';

describe('store release account runbook', () => {
  it('builds a blocked share-safe account and submit sequence by default', () => {
    const runbook = buildStoreReleaseAccountRunbook({
      generatedAt: '2026-06-25T10:00:00.000Z',
    });

    expect(StoreReleaseAccountRunbookSchema.parse(runbook)).toEqual(runbook);
    expect(runbook.schemaVersion).toBe(storeReleaseAccountRunbookSchemaVersion);
    expect(runbook.generatedAt).toBe('2026-06-25T10:00:00.000Z');
    expect(runbook.summary).toMatchObject({
      blockedPhaseCount: 8,
      currentCommand: 'npm run store:submission',
      currentPhase: 'store-metadata',
      phaseCount: 8,
      readyPhaseCount: 0,
      status: 'blocked',
      verifiedPhaseCount: 0,
    });
    expect(runbook.phases.map((phase) => phase.key)).toEqual([
      'store-metadata',
      'eas-project-binding',
      'expo-token',
      'ios-submit-account',
      'android-submit-account',
      'native-qa-evidence',
      'strict-eas-gate',
      'store-submit',
    ]);
    expect(runbook.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      projectIdsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
      tokenLikeValuesIncluded: false,
    });
    expect(JSON.stringify(runbook)).not.toMatch(/ghp_|github_pat_|BEGIN PRIVATE KEY|file:\/\/|\/Users\/|bearer\s+[A-Za-z0-9._-]+|"private_key"/i);
  });

  it('marks strict EAS as the current runnable phase when account prerequisites are ready', () => {
    const runbook = buildStoreReleaseAccountRunbook({
      generatedAt: '2026-06-25T10:05:00.000Z',
      presentEnvKeys: [
        'ASC_API_ISSUER_ID',
        'ASC_API_KEY_ID',
        'ASC_API_KEY_P8_BASE64',
        'EXPO_TOKEN',
        'GOOGLE_SERVICE_ACCOUNT_JSON',
        'MOVEBETA_ASC_APP_ID',
      ],
      staticEasProjectConfigured: true,
      storeMetadataReady: true,
    });

    expect(runbook.summary).toMatchObject({
      blockedPhaseCount: 2,
      currentCommand: 'npm run release:eas:strict',
      currentPhase: 'strict-eas-gate',
      readyPhaseCount: 6,
      status: 'ready-for-strict-gate',
    });
    expect(runbook.phases.find((phase) => phase.key === 'strict-eas-gate')?.status).toBe('ready');
    expect(runbook.summary.nextAction).toContain('Run the strict EAS gate');
  });

  it('marks store submit ready only after strict gate and native QA evidence are verified', () => {
    const runbook = buildStoreReleaseAccountRunbook({
      generatedAt: '2026-06-25T10:10:00.000Z',
      nativeQaEvidenceReady: true,
      presentEnvKeys: [
        'ASC_API_ISSUER_ID',
        'ASC_API_KEY_ID',
        'ASC_API_KEY_P8_BASE64',
        'EXPO_TOKEN',
        'GOOGLE_SERVICE_ACCOUNT_JSON',
        'MOVEBETA_ASC_APP_ID',
      ],
      staticEasProjectConfigured: true,
      storeMetadataReady: true,
      strictGatePassed: true,
    });

    expect(runbook.summary).toMatchObject({
      blockedPhaseCount: 0,
      currentCommand: 'npx eas-cli@latest submit --platform ios --profile production',
      currentPhase: 'store-submit',
      readyPhaseCount: 7,
      status: 'ready-for-submission',
      verifiedPhaseCount: 1,
    });
    expect(runbook.phases.find((phase) => phase.key === 'strict-eas-gate')?.status).toBe('verified');
    expect(runbook.phases.find((phase) => phase.key === 'store-submit')?.status).toBe('ready');
  });

  it('rejects credential values, local paths, raw media, and token-like strings before sharing', () => {
    const runbook = buildStoreReleaseAccountRunbook({
      generatedAt: '2026-06-25T10:15:00.000Z',
    });
    const unsafe: StoreReleaseAccountRunbook = {
      ...runbook,
      phases: [
        ...runbook.phases,
        {
          action: 'Open /Users/antonio/private/service-account.json with ghp_1234567890abcdefTOKEN.',
          commandKey: 'unsafe',
          dependsOn: [],
          evidence: ['raw-video.mp4', '{"private_key":"leaked"}'],
          key: 'store-submit',
          label: 'Unsafe submit',
          owner: 'release',
          requiredKeys: [],
          status: 'blocked',
        },
      ],
    };

    expect(() => assertStoreReleaseAccountRunbookIsShareSafe(unsafe)).toThrow('Store release account runbook contains credential');
  });
});
