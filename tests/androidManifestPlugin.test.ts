import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { normalizePermissions } = require('../plugins/withMoveBetaAndroidManifest.js') as {
  normalizePermissions: (manifest: Record<string, any>) => Record<string, any>;
};

describe('MoveBeta Android manifest plugin', () => {
  it('keeps camera access and blocks permissions contributed by native libraries', () => {
    const manifest = normalizePermissions({
      manifest: {
        $: { 'xmlns:android': 'http://schemas.android.com/apk/res/android' },
        'uses-permission': [
          { $: { 'android:name': 'android.permission.WRITE_EXTERNAL_STORAGE', 'android:maxSdkVersion': '32' } },
          { $: { 'android:name': 'android.permission.INTERNET' } },
        ],
      },
    });

    const permissions = manifest.manifest['uses-permission'];
    const byName = new Map(permissions.map((permission: any) => [permission.$['android:name'], permission.$]));

    expect(byName.get('android.permission.CAMERA')).toEqual({ 'android:name': 'android.permission.CAMERA' });
    expect(byName.get('android.permission.INTERNET')).toEqual({ 'android:name': 'android.permission.INTERNET' });
    expect(byName.get('android.permission.WRITE_EXTERNAL_STORAGE')).toEqual({
      'android:name': 'android.permission.WRITE_EXTERNAL_STORAGE',
      'tools:node': 'remove',
    });
    expect(manifest.manifest.$['xmlns:tools']).toBe('http://schemas.android.com/tools');
  });
});
