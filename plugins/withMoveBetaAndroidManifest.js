const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

const requiredPermissions = ['android.permission.CAMERA', 'android.permission.READ_MEDIA_VIDEO'];
const removedPermissions = new Set(['android.permission.RECORD_AUDIO']);

function permissionName(permission) {
  return permission?.$?.['android:name'];
}

function ensurePermission(permissions, name) {
  if (!permissions.some((permission) => permissionName(permission) === name)) {
    permissions.push({ $: { 'android:name': name } });
  }
}

function normalizePermissions(manifest) {
  const permissions = manifest.manifest['uses-permission'] ?? [];
  const filtered = permissions.filter((permission) => !removedPermissions.has(permissionName(permission)));

  for (const name of requiredPermissions) {
    ensurePermission(filtered, name);
  }

  manifest.manifest['uses-permission'] = filtered;
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
