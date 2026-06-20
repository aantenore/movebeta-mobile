import { describe, expect, it } from 'vitest';

import {
  assertStoreCredentialsSetupPacketIsShareSafe,
  buildStoreCredentialsSetupPacket,
  storeCredentialsSetupPacketSchemaVersion,
  StoreCredentialsSetupPacketSchema,
  type StoreCredentialsSetupPacket,
} from '../src/core/storeCredentialsSetupPacket';

describe('store credentials setup packet', () => {
  it('builds a blocked share-safe packet with required key names only', () => {
    const packet = buildStoreCredentialsSetupPacket({
      generatedAt: '2026-06-20T18:00:00.000Z',
    });

    expect(StoreCredentialsSetupPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.schemaVersion).toBe(storeCredentialsSetupPacketSchemaVersion);
    expect(packet.generatedAt).toBe('2026-06-20T18:00:00.000Z');
    expect(packet.summary).toMatchObject({
      missingGroupCount: 4,
      presentGroupCount: 0,
      status: 'blocked',
      totalGroupCount: 4,
    });
    expect(packet.credentialGroups.map((group) => [group.key, group.status])).toEqual([
      ['eas-project', 'missing'],
      ['eas-token', 'missing'],
      ['ios-submit', 'missing'],
      ['android-submit', 'missing'],
    ]);
    expect(packet.credentialGroups.flatMap((group) => group.requiredKeys)).toContain('EXPO_TOKEN');
    expect(packet.credentialGroups.flatMap((group) => group.requiredKeys)).toContain('MOVEBETA_ASC_APP_ID');
    expect(packet.credentialGroups.flatMap((group) => group.requiredKeys)).toContain('GOOGLE_SERVICE_ACCOUNT_JSON');
    expect(packet.privacy).toEqual({
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
    });
    expect(JSON.stringify(packet)).not.toMatch(/ghp_|pat_|BEGIN PRIVATE KEY|file:\/\/|\/Users\/|expo-token|"private_key"/i);
  });

  it('marks the packet ready when the project binding and credential key names are present', () => {
    const packet = buildStoreCredentialsSetupPacket({
      easProjectConfigured: true,
      generatedAt: '2026-06-20T18:05:00.000Z',
      presentEnvKeys: [
        'ASC_API_ISSUER_ID',
        'ASC_API_KEY_ID',
        'ASC_API_KEY_P8_BASE64',
        'EXPO_TOKEN',
        'GOOGLE_SERVICE_ACCOUNT_JSON',
        'MOVEBETA_ASC_APP_ID',
      ],
    });

    expect(packet.summary).toMatchObject({
      missingGroupCount: 0,
      presentGroupCount: 4,
      status: 'ready',
      totalGroupCount: 4,
    });
    expect(packet.summary.nextAction).toContain('npm run release:eas:strict');
    expect(packet.credentialGroups.every((group) => group.status === 'ready')).toBe(true);
  });

  it('rejects injected credential values, local paths, and service-account bodies before sharing', () => {
    const packet = buildStoreCredentialsSetupPacket({
      generatedAt: '2026-06-20T18:10:00.000Z',
    });
    const unsafe: StoreCredentialsSetupPacket = {
      ...packet,
      commands: [
        ...packet.commands,
        {
          command: 'open /Users/antonio/private/service-account.json',
          key: 'unsafe',
          label: 'Unsafe credential setup',
          owner: 'release',
          purpose: 'Use ghp_1234567890abcdefTOKEN and {"private_key":"leaked"} here.',
        },
      ],
    };

    expect(() => assertStoreCredentialsSetupPacketIsShareSafe(unsafe)).toThrow('Store credentials setup packet contains credential');
  });
});
