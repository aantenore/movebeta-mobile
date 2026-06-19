import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildStoreCredentialsReport,
  renderStoreCredentialsMarkdown,
  STORE_CREDENTIALS_REPORT_SCHEMA_VERSION,
  writeStoreCredentialsReport,
} from '../scripts/store_credentials_doctor.mjs';

const tmpRoots: string[] = [];

function appConfig(projectId?: string) {
  return {
    extra: projectId
      ? {
          eas: {
            projectId,
          },
        }
      : {},
  };
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-store-credentials-'));
  tmpRoots.push(root);
  fs.writeFileSync(
    path.join(root, 'app.json'),
    `${JSON.stringify(
      {
        expo: appConfig(),
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

afterEach(() => {
  for (const root of tmpRoots.splice(0)) {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

describe('store credentials doctor', () => {
  it('reports store submission blockers without exposing credential values', () => {
    const report = buildStoreCredentialsReport({
      appConfig: appConfig(),
      env: {
        EXPO_TOKEN: 'secret-token',
        NODE_ENV: 'test',
      },
      generatedAt: '2026-06-20T12:00:00.000Z',
    });

    expect(report.schemaVersion).toBe(STORE_CREDENTIALS_REPORT_SCHEMA_VERSION);
    expect(report.status).toBe('blocked');
    expect(report.summary).toMatchObject({
      androidSubmitReady: false,
      easCredentialsReady: false,
      easProjectReady: false,
      easTokenReady: true,
      iosCredentialMode: 'missing',
      iosSubmitReady: false,
    });
    expect(JSON.stringify(report)).not.toContain('secret-token');
    expect(report.summary.presentEnvKeys).toEqual(['EXPO_TOKEN']);
  });

  it('marks the report ready when EAS, iOS, and Android credentials are present', () => {
    const report = buildStoreCredentialsReport({
      appConfig: appConfig('00000000-0000-4000-8000-000000000000'),
      env: {
        ASC_API_ISSUER_ID: 'issuer-id',
        ASC_API_KEY_ID: 'key-id',
        ASC_API_KEY_P8_BASE64: 'base64-p8',
        EXPO_TOKEN: 'expo-token',
        GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
        MOVEBETA_ASC_APP_ID: '1234567890',
        NODE_ENV: 'test',
      },
      generatedAt: '2026-06-20T12:05:00.000Z',
    });

    expect(report.status).toBe('ready');
    expect(report.summary).toMatchObject({
      androidSubmitReady: true,
      easCredentialsReady: true,
      easProjectReady: true,
      iosCredentialMode: 'api-key',
      iosSubmitReady: true,
    });
    expect(renderStoreCredentialsMarkdown(report)).toContain('# Store Credentials Report');
    expect(JSON.stringify(report)).not.toContain('expo-token');
    expect(JSON.stringify(report)).not.toContain('base64-p8');
  });

  it('writes durable JSON and Markdown artifacts', () => {
    const rootDir = makeRoot();
    const report = buildStoreCredentialsReport({
      appConfig: appConfig(),
      env: { NODE_ENV: 'test' },
      generatedAt: '2026-06-20T12:10:00.000Z',
    });
    const jsonPath = path.join(rootDir, 'docs/sdlc/store-credentials-report.json');
    const markdownPath = path.join(rootDir, 'docs/sdlc/store-credentials-report.md');

    writeStoreCredentialsReport({ jsonPath, markdownPath, report } as Parameters<typeof writeStoreCredentialsReport>[0] & { report: typeof report });

    expect(JSON.parse(fs.readFileSync(jsonPath, 'utf8'))).toEqual(report);
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('Credential values included: no');
  });
});
