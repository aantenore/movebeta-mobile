import { describe, expect, it } from 'vitest';

import { validateEasReleaseReadiness } from '../scripts/eas_release_checks.mjs';

const appConfig = {
  android: {
    package: 'com.movebeta.mobile',
    versionCode: 1,
  },
  extra: {
    analysisProvider: 'local-fixture',
    privacyMode: 'on-device',
  },
  ios: {
    buildNumber: '1',
    bundleIdentifier: 'com.movebeta.mobile',
  },
  name: 'MoveBeta',
  runtimeVersion: {
    policy: 'appVersion',
  },
  slug: 'movebeta-mobile',
  updates: {
    enabled: false,
  },
  version: '1.0.0',
};

const easConfig = {
  build: {
    development: {
      developmentClient: true,
      distribution: 'internal',
    },
    preview: {
      distribution: 'internal',
    },
    production: {
      android: {
        buildType: 'app-bundle',
      },
      autoIncrement: true,
      ios: {
        resourceClass: 'm-medium',
      },
    },
  },
  cli: {
    appVersionSource: 'remote',
    version: '>= 16.0.0',
  },
  submit: {
    production: {},
  },
};

describe('EAS release readiness', () => {
  it('passes the standard gate while warning about account-bound release prerequisites', () => {
    const validation = validateEasReleaseReadiness({
      appConfig,
      easConfig,
      env: {},
    });

    expect(validation.ready).toBe(true);
    expect(validation.checks.filter((check) => check.status === 'fail')).toEqual([]);
    expect(validation.checks.filter((check) => check.status === 'warn').map((check) => check.id)).toEqual([
      'eas-project-id',
      'eas-token',
      'ios-submit-credentials',
      'android-submit-credentials',
    ]);
  });

  it('fails the strict gate until EAS and store credentials are available', () => {
    const validation = validateEasReleaseReadiness({
      appConfig,
      easConfig,
      env: {},
      strict: true,
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual([
      'eas-project-id',
      'eas-token',
      'ios-submit-credentials',
      'android-submit-credentials',
    ]);
  });

  it('passes the strict gate when project id and store automation credentials are injected from the environment', () => {
    const validation = validateEasReleaseReadiness({
      appConfig: {
        ...appConfig,
        extra: {
          ...appConfig.extra,
          eas: {
            projectId: '00000000-0000-4000-8000-000000000000',
          },
        },
      },
      easConfig,
      env: {
        ASC_API_ISSUER_ID: 'issuer-id',
        ASC_API_KEY_ID: 'key-id',
        ASC_API_KEY_P8_BASE64: 'base64-p8',
        EXPO_TOKEN: 'expo-token',
        GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
        MOVEBETA_ASC_APP_ID: '1234567890',
      },
      strict: true,
    });

    expect(validation.ready).toBe(true);
    expect(validation.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('fails when production build settings drift from store-ready artifacts', () => {
    const validation = validateEasReleaseReadiness({
      appConfig,
      easConfig: {
        ...easConfig,
        build: {
          ...easConfig.build,
          production: {
            ...easConfig.build.production,
            android: {
              buildType: 'apk',
            },
            autoIncrement: false,
          },
        },
        cli: {
          appVersionSource: 'local',
          version: '15.0.0',
        },
      },
      env: {},
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual(
      expect.arrayContaining([
        'eas-cli-version',
        'eas-app-version-source',
        'eas-production-autoincrement',
        'eas-android-app-bundle',
      ]),
    );
  });

  it('fails when submit credentials are committed into eas.json', () => {
    const validation = validateEasReleaseReadiness({
      appConfig,
      easConfig: {
        ...easConfig,
        submit: {
          production: {
            android: {
              serviceAccountKeyPath: './google-service-account.json',
            },
          },
        },
      },
      env: {},
    });

    expect(validation.ready).toBe(false);
    expect(validation.checks.find((check) => check.id === 'no-committed-submit-secrets')?.status).toBe('fail');
  });
});
