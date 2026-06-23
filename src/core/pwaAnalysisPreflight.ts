import type { PwaRuntimeReadiness } from './pwaRuntimeReadiness';

export type PwaAnalysisPreflightStatus = 'action' | 'blocked' | 'native' | 'ready';

export type PwaAnalysisPreflight = {
  action: string;
  badge: string;
  canAnalyze: boolean;
  detail: string;
  status: PwaAnalysisPreflightStatus;
  title: string;
};

export function buildPwaAnalysisPreflight({
  hasLocalVideo,
  online,
  readiness,
}: {
  hasLocalVideo: boolean;
  online: boolean;
  readiness: PwaRuntimeReadiness;
}): PwaAnalysisPreflight {
  if (readiness.summary.status === 'native') {
    return {
      action: 'Native builds use the platform pose provider bundle for local video analysis.',
      badge: 'native',
      canAnalyze: true,
      detail: 'Browser Cache Storage is not part of the native analysis path.',
      status: 'native',
      title: 'Native model path ready',
    };
  }

  if (readiness.summary.modelCacheReady) {
    return {
      action: readiness.summary.modelIntegrityVerified
        ? 'The cached MoveNet assets are SHA-256 verified for offline web analysis.'
        : 'The cached MoveNet assets are available for offline web analysis.',
      badge: 'ready',
      canAnalyze: true,
      detail: `${readiness.summary.modelAssetsCached}/${readiness.summary.modelAssetsExpected} model asset(s) cached.`,
      status: 'ready',
      title: 'Model cache ready',
    };
  }

  if (!hasLocalVideo) {
    return {
      action: 'Warm the model cache before relying on offline recording or import.',
      badge: 'warm',
      canAnalyze: true,
      detail: 'Bundled demo attempts can still use local fixture analysis.',
      status: 'action',
      title: 'Warm model before field use',
    };
  }

  if (online) {
    return {
      action: 'Use Warm model to make offline gym analysis deterministic before leaving the network.',
      badge: 'online',
      canAnalyze: true,
      detail: 'Online real-video analysis can fetch same-origin model assets if the cache is not warm yet.',
      status: 'action',
      title: 'Model cache can warm online',
    };
  }

  return {
    action: 'Reconnect and warm the model cache before analyzing this local video offline.',
    badge: 'blocked',
    canAnalyze: false,
    detail: 'Offline real-video analysis needs the MoveNet manifest and model shards in Cache Storage.',
    status: 'blocked',
    title: 'Offline model cache missing',
  };
}
