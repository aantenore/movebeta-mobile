export function validateAndroidManifest(manifest) {
  const checks = [
    {
      detail: 'CAMERA permission must be present for in-app recording.',
      id: 'camera-permission',
      pass: /<uses-permission[^>]+android:name="android\.permission\.CAMERA"/.test(manifest),
    },
    {
      detail: 'Broad media and legacy storage permissions must stay absent; the system picker grants selected-file access.',
      id: 'broad-media-permissions-absent',
      pass: !/android:name="android\.permission\.(READ_MEDIA_(IMAGES|VIDEO)|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE)"/.test(
        manifest,
      ),
    },
    {
      detail: 'SYSTEM_ALERT_WINDOW must stay absent from production manifests.',
      id: 'overlay-permission-absent',
      pass: !/android:name="android\.permission\.SYSTEM_ALERT_WINDOW"/.test(manifest),
    },
    {
      detail: 'RECORD_AUDIO must stay absent because movement analysis does not need audio.',
      id: 'record-audio-absent',
      pass: !/android:name="android\.permission\.RECORD_AUDIO"/.test(manifest),
    },
    {
      detail: 'Android backup must be disabled for privacy-sensitive local reports.',
      id: 'backup-disabled',
      pass: /<application[^>]+android:allowBackup="false"/.test(manifest),
    },
  ];

  return {
    checks,
    ready: checks.every((check) => check.pass),
  };
}
