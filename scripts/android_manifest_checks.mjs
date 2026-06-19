export function validateAndroidManifest(manifest) {
  const checks = [
    {
      detail: 'CAMERA permission must be present for in-app recording.',
      id: 'camera-permission',
      pass: /<uses-permission[^>]+android:name="android\.permission\.CAMERA"/.test(manifest),
    },
    {
      detail: 'READ_MEDIA_VIDEO permission must be present for selected video import.',
      id: 'read-media-video-permission',
      pass: /<uses-permission[^>]+android:name="android\.permission\.READ_MEDIA_VIDEO"/.test(manifest),
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
