import { describe, expect, it } from 'vitest';

import { validateAndroidManifest } from '../scripts/android_manifest_checks.mjs';

const validManifest = `
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.CAMERA" />
  <application android:allowBackup="false" />
</manifest>
`;

describe('Android manifest checks', () => {
  it('passes with camera-only access and the permissionless selected-video picker', () => {
    const validation = validateAndroidManifest(validManifest);

    expect(validation.ready).toBe(true);
    expect(validation.checks.every((check) => check.pass)).toBe(true);
  });

  it('fails when camera is removed, broad media/audio/overlay access is present, or backup is enabled', () => {
    const validation = validateAndroidManifest(`
      <manifest xmlns:android="http://schemas.android.com/apk/res/android">
        <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
        <uses-permission android:name="android.permission.RECORD_AUDIO" />
        <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
        <application android:allowBackup="true" />
      </manifest>
    `);

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => !check.pass).map((check) => check.id)).toEqual([
      'camera-permission',
      'broad-media-permissions-absent',
      'overlay-permission-absent',
      'record-audio-absent',
      'backup-disabled',
    ]);
  });
});
