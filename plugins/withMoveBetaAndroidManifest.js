const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const requiredPermissions = ['android.permission.CAMERA'];
const blockedPermissions = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.RECORD_AUDIO',
  'android.permission.SYSTEM_ALERT_WINDOW',
];

function permissionName(permission) {
  return permission?.$?.['android:name'];
}

function ensurePermission(permissions, name) {
  if (!permissions.some((permission) => permissionName(permission) === name)) {
    permissions.push({ $: { 'android:name': name } });
  }
}

function normalizePermissions(manifest) {
  AndroidConfig.Manifest.ensureToolsAvailable(manifest);
  AndroidConfig.Permissions.addBlockedPermissions(manifest, blockedPermissions);

  const permissions = manifest.manifest['uses-permission'] ?? [];

  for (const name of requiredPermissions) {
    ensurePermission(permissions, name);
  }

  manifest.manifest['uses-permission'] = permissions;
  return manifest;
}

module.exports = function withMoveBetaAndroidManifest(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults;
    normalizePermissions(manifest);

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    application.$['android:allowBackup'] = 'false';

    return androidConfig;
  });
};

module.exports.normalizePermissions = normalizePermissions;
