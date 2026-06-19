import type { AppConfig } from './config';
import type { PrivacyConsent } from './privacy';

export type OfflineReadinessStatus = 'ready' | 'review' | 'blocked';
export type OfflineReadinessCheckStatus = 'pass' | 'watch' | 'fail';

export type OfflineReadinessCheck = {
  detail: string;
  id: string;
  label: string;
  status: OfflineReadinessCheckStatus;
};

export type OfflineReadinessResult = {
  action: string;
  checks: OfflineReadinessCheck[];
  status: OfflineReadinessStatus;
  title: string;
};

const localProviders = new Set([
  'local-fixture',
  'local-video-fallback',
  'web-tfjs-movenet',
  'native-platform-pose',
]);

function statusFromChecks(checks: OfflineReadinessCheck[]): OfflineReadinessStatus {
  if (checks.some((check) => check.status === 'fail')) return 'blocked';
  if (checks.some((check) => check.status === 'watch')) return 'review';
  return 'ready';
}

function resultCopy(status: OfflineReadinessStatus) {
  if (status === 'ready') {
    return {
      action: 'The core coach workflow can run without a network connection.',
      title: 'Ready for offline analysis',
    };
  }

  if (status === 'review') {
    return {
      action: 'The app can run locally, but one setting should be reviewed before a device airplane-mode pass.',
      title: 'Offline with review',
    };
  }

  return {
    action: 'Disable upload-capable settings before claiming airplane-mode readiness.',
    title: 'Offline readiness blocked',
  };
}

export function assessOfflineReadiness(input: {
  config: AppConfig;
  consent: PrivacyConsent;
  reportCount: number;
}): OfflineReadinessResult {
  const { config, consent, reportCount } = input;
  const checks: OfflineReadinessCheck[] = [
    {
      detail:
        config.privacyMode === 'on-device'
          ? 'The configured privacy mode keeps analysis local.'
          : 'Cloud-assisted privacy mode is not airplane-mode ready.',
      id: 'privacy-mode',
      label: 'On-device mode',
      status: config.privacyMode === 'on-device' ? 'pass' : 'fail',
    },
    {
      detail: localProviders.has(config.videoAnalysisProvider)
        ? `${config.videoAnalysisProvider} does not require a remote API for the default workflow.`
        : `${config.videoAnalysisProvider} is not marked as an offline-capable provider.`,
      id: 'video-provider',
      label: 'Video provider',
      status: localProviders.has(config.videoAnalysisProvider) ? 'pass' : 'watch',
    },
    {
      detail: consent.localReportStorage
        ? 'Reports can be saved and reopened from local storage.'
        : 'Local report storage is disabled, so offline history would not persist.',
      id: 'local-storage',
      label: 'Local storage',
      status: consent.localReportStorage ? 'pass' : 'fail',
    },
    {
      detail: consent.cloudSync
        ? 'Cloud sync requires a network and must stay opt-in.'
        : 'Cloud sync is disabled for the default workflow.',
      id: 'cloud-sync',
      label: 'Cloud sync',
      status: consent.cloudSync ? 'fail' : 'pass',
    },
    {
      detail: consent.exportRawVideo
        ? 'Raw video export can move media outside the device boundary.'
        : 'Raw video export is off unless the user explicitly starts an export workflow.',
      id: 'raw-export',
      label: 'Raw video export',
      status: consent.exportRawVideo ? 'fail' : 'pass',
    },
    {
      detail:
        reportCount > 0
          ? `${reportCount} local report${reportCount === 1 ? '' : 's'} available for offline review.`
          : 'No local reports yet; analysis can still run offline after a clip is captured or imported.',
      id: 'report-history',
      label: 'Report history',
      status: reportCount > 0 ? 'pass' : 'watch',
    },
  ];
  const status = statusFromChecks(checks);
  const copy = resultCopy(status);

  return {
    ...copy,
    checks,
    status,
  };
}
