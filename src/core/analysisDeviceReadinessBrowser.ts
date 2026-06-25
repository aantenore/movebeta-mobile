import { Platform } from 'react-native';

import type { AnalysisDeviceProbe } from './analysisDeviceReadiness';

type BatteryManagerLike = {
  charging?: boolean;
  level?: number;
};

type NavigatorWithDeviceSignals = Navigator & {
  connection?: {
    saveData?: boolean;
  };
  deviceMemory?: number;
  getBattery?: () => Promise<BatteryManagerLike>;
};

export function nativeAnalysisDeviceProbe(): AnalysisDeviceProbe {
  return {
    batterySupported: false,
    online: true,
    runtime: 'native',
    storageEstimateSupported: false,
  };
}

export function browserAnalysisDeviceProbe(patch: Partial<AnalysisDeviceProbe> = {}): AnalysisDeviceProbe {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') {
    return { ...nativeAnalysisDeviceProbe(), ...patch };
  }

  const navigatorWithSignals = navigator as NavigatorWithDeviceSignals;
  return {
    batterySupported: typeof navigatorWithSignals.getBattery === 'function',
    deviceMemoryGb:
      typeof navigatorWithSignals.deviceMemory === 'number' && Number.isFinite(navigatorWithSignals.deviceMemory)
        ? navigatorWithSignals.deviceMemory
        : undefined,
    hardwareConcurrency:
      typeof navigator.hardwareConcurrency === 'number' && Number.isFinite(navigator.hardwareConcurrency)
        ? navigator.hardwareConcurrency
        : undefined,
    online: navigator.onLine !== false,
    runtime: 'web',
    saveData: navigatorWithSignals.connection?.saveData,
    storageEstimateSupported: typeof navigator.storage?.estimate === 'function',
    ...patch,
  };
}

export async function resolveBrowserAnalysisDeviceProbe(
  patch: Partial<AnalysisDeviceProbe> = {},
): Promise<AnalysisDeviceProbe> {
  const baseProbe = browserAnalysisDeviceProbe(patch);
  if (baseProbe.runtime !== 'web' || typeof navigator === 'undefined') return baseProbe;

  const navigatorWithSignals = navigator as NavigatorWithDeviceSignals;
  const battery = await navigatorWithSignals.getBattery?.().catch(() => undefined);
  const storage = await navigator.storage?.estimate?.().catch(() => undefined);

  return browserAnalysisDeviceProbe({
    ...patch,
    batteryCharging: battery?.charging,
    batteryLevel: battery?.level,
    batterySupported: Boolean(battery),
    freeStorageBytes:
      typeof storage?.quota === 'number' && typeof storage.usage === 'number'
        ? Math.max(0, Math.trunc(storage.quota - storage.usage))
        : undefined,
    storageEstimateSupported: typeof navigator.storage?.estimate === 'function',
  });
}
