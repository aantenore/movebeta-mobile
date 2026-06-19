import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../src/core/config';
import { assessOfflineReadiness } from '../src/core/offlineReadiness';
import { PrivacyConsentSchema } from '../src/core/privacy';

const config: AppConfig = {
  activePlan: 'free',
  analysisProvider: 'local-fixture',
  privacyMode: 'on-device',
  videoAnalysisProvider: 'web-tfjs-movenet',
};

describe('offline readiness', () => {
  it('marks the default local workflow as airplane-mode ready after reports exist', () => {
    const result = assessOfflineReadiness({
      config,
      consent: PrivacyConsentSchema.parse({}),
      reportCount: 2,
    });

    expect(result.status).toBe('ready');
    expect(result.title).toBe('Ready for offline analysis');
    expect(result.checks.every((check) => check.status === 'pass')).toBe(true);
  });

  it('keeps first-run installs reviewable when no reports exist yet', () => {
    const result = assessOfflineReadiness({
      config,
      consent: PrivacyConsentSchema.parse({}),
      reportCount: 0,
    });

    expect(result.status).toBe('review');
    expect(result.checks.find((check) => check.id === 'report-history')?.status).toBe('watch');
    expect(result.action).toContain('review');
  });

  it('blocks offline claims when upload-capable settings are enabled', () => {
    const result = assessOfflineReadiness({
      config: {
        ...config,
        privacyMode: 'cloud-assisted',
      },
      consent: PrivacyConsentSchema.parse({
        cloudSync: true,
        exportRawVideo: true,
      }),
      reportCount: 1,
    });

    expect(result.status).toBe('blocked');
    expect(result.checks.filter((check) => check.status === 'fail')).toHaveLength(3);
  });
});
