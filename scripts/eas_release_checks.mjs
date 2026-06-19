export const easReleaseEnv = {
  androidServiceAccount: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH', 'MOVEBETA_GOOGLE_SERVICE_ACCOUNT_JSON_BASE64'],
  easToken: 'EXPO_TOKEN',
  iosAppleId: 'MOVEBETA_APPLE_ID',
  iosApiKey: ['ASC_API_KEY_ID', 'ASC_API_ISSUER_ID', 'ASC_API_KEY_P8_BASE64'],
  iosAscAppId: 'MOVEBETA_ASC_APP_ID',
};

const secretLikeKeys = new Set([
  'appleTeamId',
  'ascApiKey',
  'ascApiKeyId',
  'ascApiKeyIssuerId',
  'password',
  'serviceAccountKey',
  'serviceAccountKeyPath',
]);

function check(status, id, label, detail) {
  return { detail, id, label, status };
}

function pass(id, label, detail) {
  return check('pass', id, label, detail);
}

function warn(id, label, detail) {
  return check('warn', id, label, detail);
}

function fail(id, label, detail) {
  return check('fail', id, label, detail);
}

function external(strict, id, label, detail) {
  return strict ? fail(id, label, detail) : warn(id, label, detail);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validReverseDns(value) {
  return /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/.test(value ?? '');
}

function targetsMinimumMajor(versionRange, minimumMajor) {
  if (!hasText(versionRange)) return false;

  const versionMatch = versionRange.match(/(\d+)(?:\.\d+)?(?:\.\d+)?/);
  if (!versionMatch) return false;

  return Number(versionMatch[1]) >= minimumMajor;
}

function hasAllEnv(env, keys) {
  return keys.every((key) => hasText(env[key]));
}

function hasAnyEnv(env, keys) {
  return keys.some((key) => hasText(env[key]));
}

function getProjectId(appConfig) {
  return appConfig?.extra?.eas?.projectId;
}

function findSecretLikeConfig(value, path = '$') {
  if (!value || typeof value !== 'object') return null;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findSecretLikeConfig(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (secretLikeKeys.has(key) && hasText(nested)) {
      return `${path}.${key}`;
    }
    const found = findSecretLikeConfig(nested, `${path}.${key}`);
    if (found) return found;
  }

  return null;
}

function validateBuildProfiles(easConfig) {
  const build = easConfig?.build ?? {};
  const production = build.production ?? {};
  const checks = [];

  checks.push(
    build.development?.developmentClient === true && build.development?.distribution === 'internal'
      ? pass('eas-development-profile', 'EAS development profile', 'developmentClient=true and distribution=internal')
      : fail('eas-development-profile', 'EAS development profile', 'Development profile must use a development client and internal distribution.'),
  );

  checks.push(
    build.preview?.distribution === 'internal'
      ? pass('eas-preview-profile', 'EAS preview profile', 'distribution=internal')
      : fail('eas-preview-profile', 'EAS preview profile', 'Preview profile must use internal distribution.'),
  );

  checks.push(
    production.autoIncrement === true
      ? pass('eas-production-autoincrement', 'EAS production versioning', 'autoIncrement=true')
      : fail('eas-production-autoincrement', 'EAS production versioning', 'Production builds must auto-increment native build numbers.'),
  );

  checks.push(
    production.android?.buildType === 'app-bundle'
      ? pass('eas-android-app-bundle', 'Android production artifact', 'buildType=app-bundle')
      : fail('eas-android-app-bundle', 'Android production artifact', 'Production Android builds must generate an app bundle for Play Console.'),
  );

  checks.push(
    hasText(production.ios?.resourceClass)
      ? pass('eas-ios-resource-class', 'iOS production resource class', production.ios.resourceClass)
      : warn('eas-ios-resource-class', 'iOS production resource class', 'No iOS resourceClass configured; EAS default will be used.'),
  );

  return checks;
}

function validateAppIdentity(appConfig) {
  const checks = [];

  checks.push(
    hasText(appConfig?.name) && hasText(appConfig?.slug) && hasText(appConfig?.version)
      ? pass('expo-app-identity', 'Expo app identity', `${appConfig.name} · ${appConfig.slug} · ${appConfig.version}`)
      : fail('expo-app-identity', 'Expo app identity', 'Expo name, slug, and version are required.'),
  );

  checks.push(
    validReverseDns(appConfig?.ios?.bundleIdentifier) && hasText(appConfig?.ios?.buildNumber)
      ? pass('ios-binary-identity', 'iOS binary identity', `${appConfig.ios.bundleIdentifier} · build ${appConfig.ios.buildNumber}`)
      : fail('ios-binary-identity', 'iOS binary identity', 'iOS bundleIdentifier and buildNumber are required.'),
  );

  checks.push(
    validReverseDns(appConfig?.android?.package) && Number.isInteger(appConfig?.android?.versionCode)
      ? pass('android-binary-identity', 'Android binary identity', `${appConfig.android.package} · versionCode ${appConfig.android.versionCode}`)
      : fail('android-binary-identity', 'Android binary identity', 'Android package and integer versionCode are required.'),
  );

  checks.push(
    appConfig?.runtimeVersion?.policy === 'appVersion'
      ? pass('runtime-version-policy', 'Runtime version policy', 'appVersion')
      : fail('runtime-version-policy', 'Runtime version policy', 'runtimeVersion.policy must remain appVersion for native release traceability.'),
  );

  checks.push(
    appConfig?.updates?.enabled === false
      ? pass('ota-updates-disabled', 'OTA update policy', 'Expo Updates disabled for this local-first release.')
      : warn('ota-updates-disabled', 'OTA update policy', 'Expo Updates are enabled; verify rollback and native model compatibility before release.'),
  );

  return checks;
}

function validateExternalReadiness(appConfig, env, strict) {
  const checks = [];
  const projectId = getProjectId(appConfig);

  checks.push(
    hasText(projectId)
      ? pass('eas-project-id', 'EAS project id', projectId)
      : external(strict, 'eas-project-id', 'EAS project id', 'Run `npx eas-cli@latest init` on the target Expo account and store the generated project id in app config.'),
  );

  checks.push(
    hasText(env[easReleaseEnv.easToken])
      ? pass('eas-token', 'EAS auth token', 'EXPO_TOKEN is present.')
      : external(strict, 'eas-token', 'EAS auth token', 'Set EXPO_TOKEN for non-interactive EAS builds.'),
  );

  const iosApiKeyReady = hasAllEnv(env, easReleaseEnv.iosApiKey);
  checks.push(
    hasText(env[easReleaseEnv.iosAscAppId]) && (hasText(env[easReleaseEnv.iosAppleId]) || iosApiKeyReady)
      ? pass('ios-submit-credentials', 'iOS submit credentials', 'App Store Connect app id and Apple/API credentials are present.')
      : external(
          strict,
          'ios-submit-credentials',
          'iOS submit credentials',
          `Set ${easReleaseEnv.iosAscAppId} plus ${easReleaseEnv.iosAppleId} or ${easReleaseEnv.iosApiKey.join(', ')} before submission.`,
        ),
  );

  checks.push(
    hasAnyEnv(env, easReleaseEnv.androidServiceAccount)
      ? pass('android-submit-credentials', 'Android submit credentials', 'Google Play service account credential is present.')
      : external(
          strict,
          'android-submit-credentials',
          'Android submit credentials',
          `Set one of ${easReleaseEnv.androidServiceAccount.join(', ')} before Play submission.`,
        ),
  );

  return checks;
}

export function validateEasReleaseReadiness({ appConfig, easConfig, env = {}, strict = false }) {
  const checks = [];

  checks.push(
    targetsMinimumMajor(easConfig?.cli?.version, 16)
      ? pass('eas-cli-version', 'EAS CLI version', easConfig.cli.version)
      : fail('eas-cli-version', 'EAS CLI version', 'EAS CLI version must target major version 16 or newer for this release flow.'),
  );

  checks.push(
    easConfig?.cli?.appVersionSource === 'remote'
      ? pass('eas-app-version-source', 'EAS app version source', 'remote')
      : fail('eas-app-version-source', 'EAS app version source', 'Use remote appVersionSource so EAS manages submitted build numbers.'),
  );

  checks.push(...validateBuildProfiles(easConfig));
  checks.push(...validateAppIdentity(appConfig));

  checks.push(
    easConfig?.submit?.production && typeof easConfig.submit.production === 'object'
      ? pass('eas-submit-profile', 'EAS submit profile', 'production profile exists.')
      : fail('eas-submit-profile', 'EAS submit profile', 'A submit.production profile is required.'),
  );

  const secretPath = findSecretLikeConfig(easConfig?.submit?.production);
  checks.push(
    secretPath === null
      ? pass('no-committed-submit-secrets', 'Committed submit secrets', 'No local submit credential path or secret-like value is committed in eas.json.')
      : fail('no-committed-submit-secrets', 'Committed submit secrets', `Move submit credential value out of eas.json: ${secretPath}.`),
  );

  checks.push(...validateExternalReadiness(appConfig, env, strict));

  return {
    checks,
    ready: checks.every((item) => item.status !== 'fail'),
    strict,
  };
}
