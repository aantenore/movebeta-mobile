import { z } from 'zod';

export const StoreScreenshotSchema = z.object({
  fileName: z.string().min(1),
  label: z.string().min(1),
  route: z.enum(['analyze', 'drills', 'progress', 'sessions', 'plan', 'privacy']),
  viewport: z.object({
    height: z.number().int().positive(),
    width: z.number().int().positive(),
  }),
});

export const StoreListingSchema = z.object({
  appName: z.string().min(2).max(30),
  category: z.string().min(2),
  fullDescription: z.string().min(120).max(4000),
  keywords: z.array(z.string().min(2)).min(6).max(100),
  promotionalText: z.string().max(170),
  shortDescription: z.string().min(10).max(80),
  subtitle: z.string().min(3).max(30),
});

export const StorePrivacyDeclarationSchema = z.object({
  cloudSyncDefault: z.literal(false),
  dataLinkedToUser: z.literal(false),
  diagnosticsContainRawVideo: z.literal(false),
  medicalClaims: z.literal(false),
  rawVideoUploadDefault: z.literal(false),
  tracking: z.literal(false),
});

export const StoreReadinessManifestSchema = z.object({
  androidPackage: z.string(),
  androidPermissions: z.array(z.string()),
  iosBundleIdentifier: z.string(),
  iosUsageDescriptions: z.record(z.string(), z.string()),
  listing: StoreListingSchema,
  privacy: StorePrivacyDeclarationSchema,
  screenshots: z.array(StoreScreenshotSchema).min(5),
  version: z.string().min(1),
});

export type StoreReadinessManifest = z.infer<typeof StoreReadinessManifestSchema>;
export type StoreReadinessCheckStatus = 'pass' | 'fail';

export type StoreReadinessCheck = {
  detail: string;
  id: string;
  label: string;
  status: StoreReadinessCheckStatus;
};

export type StoreReadinessValidation = {
  checks: StoreReadinessCheck[];
  ready: boolean;
};

export type ExpoStoreConfig = {
  android?: {
    package?: string;
    permissions?: string[];
  };
  ios?: {
    bundleIdentifier?: string;
    infoPlist?: Record<string, string>;
  };
  name?: string;
  version?: string;
};

export const defaultStoreListing = {
  appName: 'MoveBeta',
  category: 'Sports',
  fullDescription:
    'MoveBeta helps indoor climbers review short attempts without sending raw video to a cloud service. Record or import a clip, run local pose analysis, review movement quality, and turn cues into drills. The app focuses on flow, pause time, bent-arm load, hip drift, and likely foot cuts while keeping reports, metrics, and diagnostics privacy-safe by default.',
  keywords: [
    'climbing',
    'bouldering',
    'training',
    'movement',
    'technique',
    'video',
    'coach',
    'on-device',
  ],
  promotionalText: 'Review climbing movement locally with pose-based cues, drills, and privacy-safe reports.',
  shortDescription: 'On-device climbing video coach for local technique review.',
  subtitle: 'Local climbing coach',
} satisfies z.infer<typeof StoreListingSchema>;

export const defaultStorePrivacy = {
  cloudSyncDefault: false,
  dataLinkedToUser: false,
  diagnosticsContainRawVideo: false,
  medicalClaims: false,
  rawVideoUploadDefault: false,
  tracking: false,
} satisfies z.infer<typeof StorePrivacyDeclarationSchema>;

export const defaultStoreScreenshots = [
  {
    fileName: '01-analyze.png',
    label: 'On-device video analysis',
    route: 'analyze',
    viewport: { height: 844, width: 390 },
  },
  {
    fileName: '02-drills.png',
    label: 'Evidence-based drills',
    route: 'drills',
    viewport: { height: 844, width: 390 },
  },
  {
    fileName: '03-progress.png',
    label: 'Technique progress trends',
    route: 'progress',
    viewport: { height: 844, width: 390 },
  },
  {
    fileName: '04-sessions.png',
    label: 'Local report history',
    route: 'sessions',
    viewport: { height: 844, width: 390 },
  },
  {
    fileName: '05-plan.png',
    label: 'Freemium plan catalog',
    route: 'plan',
    viewport: { height: 844, width: 390 },
  },
  {
    fileName: '06-privacy.png',
    label: 'Privacy and offline readiness',
    route: 'privacy',
    viewport: { height: 844, width: 390 },
  },
  {
    fileName: '08-data-portability.png',
    label: 'Local backup restore preview',
    route: 'privacy',
    viewport: { height: 844, width: 390 },
  },
] satisfies z.infer<typeof StoreScreenshotSchema>[];

function pass(id: string, label: string, detail: string): StoreReadinessCheck {
  return { detail, id, label, status: 'pass' };
}

function fail(id: string, label: string, detail: string): StoreReadinessCheck {
  return { detail, id, label, status: 'fail' };
}

function hasText(value: string | undefined, pattern: RegExp) {
  return Boolean(value && pattern.test(value));
}

function validBundleIdentifier(value: string) {
  return /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/.test(value);
}

function validAndroidPackage(value: string) {
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(value);
}

export function buildStoreReadinessManifest(config: ExpoStoreConfig): StoreReadinessManifest {
  return StoreReadinessManifestSchema.parse({
    androidPackage: config.android?.package ?? '',
    androidPermissions: config.android?.permissions ?? [],
    iosBundleIdentifier: config.ios?.bundleIdentifier ?? '',
    iosUsageDescriptions: config.ios?.infoPlist ?? {},
    listing: {
      ...defaultStoreListing,
      appName: config.name ?? defaultStoreListing.appName,
    },
    privacy: defaultStorePrivacy,
    screenshots: defaultStoreScreenshots,
    version: config.version ?? '',
  });
}

export function validateStoreReadinessManifest(manifest: StoreReadinessManifest): StoreReadinessValidation {
  const checks: StoreReadinessCheck[] = [];

  checks.push(
    validBundleIdentifier(manifest.iosBundleIdentifier)
      ? pass('ios-bundle', 'iOS bundle identifier', manifest.iosBundleIdentifier)
      : fail('ios-bundle', 'iOS bundle identifier', 'Missing or invalid reverse-DNS iOS bundle identifier.'),
  );

  checks.push(
    validAndroidPackage(manifest.androidPackage)
      ? pass('android-package', 'Android package', manifest.androidPackage)
      : fail('android-package', 'Android package', 'Missing or invalid reverse-DNS Android package name.'),
  );

  checks.push(
    manifest.androidPermissions.includes('CAMERA') && manifest.androidPermissions.includes('READ_MEDIA_VIDEO')
      ? pass('android-permissions', 'Android video permissions', manifest.androidPermissions.join(', '))
      : fail('android-permissions', 'Android video permissions', 'CAMERA and READ_MEDIA_VIDEO must match the capture/import workflow.'),
  );

  checks.push(
    hasText(manifest.iosUsageDescriptions.NSCameraUsageDescription, /camera|record/i) &&
      hasText(manifest.iosUsageDescriptions.NSCameraUsageDescription, /on-device|local/i)
      ? pass('ios-camera-copy', 'iOS camera privacy copy', manifest.iosUsageDescriptions.NSCameraUsageDescription)
      : fail('ios-camera-copy', 'iOS camera privacy copy', 'Camera copy must describe recording and local/on-device analysis.'),
  );

  checks.push(
    hasText(manifest.iosUsageDescriptions.NSPhotoLibraryUsageDescription, /import|video/i) &&
      hasText(manifest.iosUsageDescriptions.NSPhotoLibraryUsageDescription, /on-device|local/i)
      ? pass('ios-library-copy', 'iOS photo library privacy copy', manifest.iosUsageDescriptions.NSPhotoLibraryUsageDescription)
      : fail('ios-library-copy', 'iOS photo library privacy copy', 'Photo library copy must describe importing selected videos for local analysis.'),
  );

  checks.push(
    manifest.iosUsageDescriptions.NSMicrophoneUsageDescription === undefined
      ? pass('ios-microphone-absent', 'iOS microphone permission', 'No microphone usage description is declared for the muted movement workflow.')
      : fail('ios-microphone-absent', 'iOS microphone permission', 'Microphone usage must stay absent because recordings are muted.'),
  );

  checks.push(
    manifest.privacy.rawVideoUploadDefault === false &&
      manifest.privacy.cloudSyncDefault === false &&
      manifest.privacy.tracking === false &&
      manifest.privacy.diagnosticsContainRawVideo === false
      ? pass('privacy-declaration', 'Store privacy declaration', 'Raw video upload, cloud sync, tracking, and raw-video diagnostics are off by default.')
      : fail('privacy-declaration', 'Store privacy declaration', 'Privacy declaration must match the on-device default product behavior.'),
  );

  checks.push(
    manifest.listing.appName.length > 1 &&
      manifest.listing.subtitle.length <= 30 &&
      manifest.listing.shortDescription.length <= 80 &&
      manifest.listing.fullDescription.length >= 120
      ? pass('listing-copy', 'Store listing copy', `${manifest.listing.appName} · ${manifest.listing.subtitle}`)
      : fail('listing-copy', 'Store listing copy', 'Listing copy must satisfy store length and completeness constraints.'),
  );

  checks.push(
    manifest.screenshots.length >= 5 && new Set(manifest.screenshots.map((item) => item.route)).size >= 5
      ? pass('screenshots', 'Store screenshot plan', `${manifest.screenshots.length} screenshots across Analyze, Drills, Progress, Sessions, Plan, and Privacy.`)
      : fail('screenshots', 'Store screenshot plan', 'Provide at least five screenshots across the core product tabs.'),
  );

  return {
    checks,
    ready: checks.every((check) => check.status === 'pass'),
  };
}
