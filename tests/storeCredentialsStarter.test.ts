import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  assertStoreCredentialsStarterIsShareSafe,
  buildEasProjectBindingTemplate,
  buildStoreCredentialsEnvTemplate,
  buildStoreCredentialsStarterPacket,
  resolveStoreCredentialsStarterPaths,
  storeCredentialsStarterSchemaVersion,
  writeStoreCredentialsStarter,
} from '../scripts/store_credentials_starter';
import { StoreCredentialsSetupPacketSchema } from '../src/core/storeCredentialsSetupPacket';

function tempRoot(projectId?: string) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'movebeta-store-credentials-starter-'));
  fs.writeFileSync(
    path.join(rootDir, 'app.json'),
    `${JSON.stringify(
      {
        expo: {
          android: { package: 'com.movebeta.mobile' },
          extra: projectId ? { eas: { projectId } } : {},
          ios: { bundleIdentifier: 'com.movebeta.mobile' },
          name: 'MoveBeta',
          slug: 'movebeta-mobile',
        },
      },
      null,
      2,
    )}\n`,
  );
  return rootDir;
}

function readJson(filePath: string) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

describe('store credentials starter', () => {
  it('writes share-safe setup packet and empty templates without exposing values', () => {
    const rootDir = tempRoot();

    try {
      const { packet, paths } = writeStoreCredentialsStarter({
        env: {},
        generatedAt: '2026-06-23T11:00:00.000Z',
        rootDir,
      });

      expect(StoreCredentialsSetupPacketSchema.parse(packet)).toEqual(packet);
      expect(packet.summary).toMatchObject({
        missingGroupCount: 4,
        presentGroupCount: 0,
        status: 'blocked',
      });
      expect(fs.existsSync(paths.envTemplatePath)).toBe(true);
      expect(fs.existsSync(paths.projectBindingTemplatePath)).toBe(true);
      expect(fs.existsSync(paths.packetJsonPath)).toBe(true);
      expect(fs.existsSync(paths.packetMarkdownPath)).toBe(true);
      expect(fs.readFileSync(paths.envTemplatePath, 'utf8')).toContain('EXPO_TOKEN=');
      expect(readJson(paths.projectBindingTemplatePath)).toMatchObject({
        schemaVersion: storeCredentialsStarterSchemaVersion,
        patchShape: {
          expo: {
            extra: {
              eas: {
                projectId: 'replace-with-eas-project-id-from-eas-init',
              },
            },
          },
        },
      });
      expect(JSON.stringify(readJson(paths.packetJsonPath))).not.toMatch(/expo-token|BEGIN PRIVATE KEY|\/Users\/|ghp_/i);
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('marks the setup packet ready from project binding and present key names without serializing values', () => {
    const rootDir = tempRoot('00000000-0000-4000-8000-000000000000');

    try {
      const { packet } = buildStoreCredentialsStarterPacket({
        env: {
          ASC_API_ISSUER_ID: 'issuer-id',
          ASC_API_KEY_ID: 'key-id',
          ASC_API_KEY_P8_BASE64: 'base64-p8',
          EXPO_TOKEN: 'expo-token',
          GOOGLE_SERVICE_ACCOUNT_JSON: '{"private_key":"secret"}',
          MOVEBETA_ASC_APP_ID: '1234567890',
        },
        generatedAt: '2026-06-23T11:05:00.000Z',
        rootDir,
      });

      expect(packet.summary).toMatchObject({
        missingGroupCount: 0,
        presentGroupCount: 4,
        status: 'ready',
      });
      expect(JSON.stringify(packet)).not.toMatch(/expo-token|base64-p8|private_key|00000000-0000-4000-8000-000000000000/);
      expect(packet.credentialGroups.flatMap((group) => group.requiredKeys)).toContain('EXPO_TOKEN');
    } finally {
      fs.rmSync(rootDir, { force: true, recursive: true });
    }
  });

  it('keeps generated templates free from credential values and local paths', () => {
    expect(buildStoreCredentialsEnvTemplate()).not.toMatch(/BEGIN PRIVATE KEY|\/Users\/|ghp_/i);
    expect(JSON.stringify(buildEasProjectBindingTemplate())).not.toMatch(/BEGIN PRIVATE KEY|\/Users\/|ghp_/i);
  });

  it('rejects unsafe starter output before sharing', () => {
    expect(() =>
      assertStoreCredentialsStarterIsShareSafe({
        command: 'open /Users/antonio/private/service-account.json',
        token: 'ghp_1234567890abcdefTOKENVALUE',
      }),
    ).toThrow(/Store credentials starter contains credential values/i);
  });

  it('resolves deterministic output paths', () => {
    const paths = resolveStoreCredentialsStarterPaths('/tmp/project');

    expect(paths.packetJsonPath).toBe('/tmp/project/docs/sdlc/store-credentials-setup-packet.json');
    expect(paths.envTemplatePath).toBe('/tmp/project/docs/sdlc/store-credentials.env.template');
  });
});
