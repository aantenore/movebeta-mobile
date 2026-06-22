import { z } from 'zod';

export const iosToolchainSetupPacketSchemaVersion = 'movebeta.ios-toolchain-setup-packet.v1';

const IosToolchainSetupCheckSchema = z.object({
  action: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['engineering', 'release']),
  proof: z.array(z.string()).min(1),
  status: z.enum(['ready', 'blocked', 'review']),
});

const IosToolchainSetupCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['engineering', 'release']),
  purpose: z.string(),
});

export const IosToolchainSetupPacketSchema = z.object({
  checks: z.array(IosToolchainSetupCheckSchema),
  commands: z.array(IosToolchainSetupCommandSchema),
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    tokenLikeValuesIncluded: z.literal(false),
  }),
  reportStatus: z.enum(['ready', 'blocked']),
  reportSchemaVersion: z.literal('movebeta.ios-toolchain-report.v1').optional(),
  schemaVersion: z.literal(iosToolchainSetupPacketSchemaVersion),
  summary: z.object({
    blockedCheckCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    readyCheckCount: z.number().int().nonnegative(),
    status: z.enum(['ready-for-ios-build', 'needs-full-xcode']),
    totalCheckCount: z.number().int().positive(),
  }),
});

export type IosToolchainSetupPacket = z.infer<typeof IosToolchainSetupPacketSchema>;

type IosToolchainReportLike = {
  generatedAt?: unknown;
  schemaVersion?: unknown;
  status?: unknown;
  summary?: {
    buildSettingsProbe?: unknown;
    commandLineToolsOnly?: unknown;
    fullXcode?: unknown;
    podsInstalled?: unknown;
    workspaceExists?: unknown;
    xcodebuildAvailable?: unknown;
  };
};

const forbiddenIosToolchainSetupValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/Library\/|\/Applications\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|\.mov\b|\.mp4\b|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|bearer\s+[A-Za-z0-9._-]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenIosToolchainSetupValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenValue);
  return false;
}

function readyStatus(value: unknown) {
  return value ? 'ready' as const : 'blocked' as const;
}

function reviewWhenSkipped(value: unknown) {
  if (value === 'pass') return 'ready' as const;
  if (value === 'fail') return 'blocked' as const;
  return 'review' as const;
}

export function assertIosToolchainSetupPacketIsShareSafe(packet: IosToolchainSetupPacket) {
  if (containsForbiddenValue(packet)) {
    throw new Error('iOS toolchain setup packet contains credential values, local paths, raw artifacts, raw video references, or token-like data.');
  }
  return packet;
}

export function buildIosToolchainSetupPacket({
  generatedAt,
  report,
}: {
  generatedAt?: string;
  report?: IosToolchainReportLike;
} = {}): IosToolchainSetupPacket {
  const summary = report?.summary ?? {};
  const reportStatus = report?.status === 'ready' ? 'ready' : 'blocked';
  const checks = [
    {
      action: 'Install full Xcode from Apple, open it once, accept licenses, then rerun the iOS toolchain doctor.',
      key: 'full-xcode',
      label: 'Full Xcode installed',
      owner: 'engineering' as const,
      proof: ['docs/sdlc/ios-toolchain-report.json reports fullXcode true'],
      status: readyStatus(summary.fullXcode),
    },
    {
      action: 'Select the full Xcode Developer directory using the standard Xcode selection workflow, then rerun the doctor.',
      key: 'developer-directory',
      label: 'Developer directory selected',
      owner: 'engineering' as const,
      proof: ['docs/sdlc/ios-toolchain-report.json reports commandLineToolsOnly false'],
      status: summary.commandLineToolsOnly === false ? 'ready' as const : 'blocked' as const,
    },
    {
      action: 'Keep the generated iOS workspace present before build verification.',
      key: 'workspace',
      label: 'iOS workspace present',
      owner: 'engineering' as const,
      proof: ['docs/sdlc/ios-toolchain-report.json reports workspaceExists true'],
      status: readyStatus(summary.workspaceExists),
    },
    {
      action: 'Run the local CocoaPods install command until MoveBetaPose is installed.',
      key: 'pods',
      label: 'CocoaPods installed',
      owner: 'engineering' as const,
      proof: ['docs/sdlc/ios-toolchain-report.json reports podsInstalled true'],
      status: readyStatus(summary.podsInstalled),
    },
    {
      action: 'Run the build-settings probe after full Xcode, workspace, and Pods are ready.',
      key: 'build-settings',
      label: 'Build settings probe',
      owner: 'engineering' as const,
      proof: ['docs/sdlc/ios-toolchain-report.json reports buildSettingsProbe pass'],
      status: reviewWhenSkipped(summary.buildSettingsProbe),
    },
    {
      action: 'Run an iOS simulator or device build and capture a share-safe build log before physical-device QA.',
      key: 'ios-build-log',
      label: 'iOS build log captured',
      owner: 'release' as const,
      proof: ['iOS simulator or device build log'],
      status: reportStatus === 'ready' ? 'ready' as const : 'blocked' as const,
    },
  ];
  const blockedCheckCount = checks.filter((check) => check.status === 'blocked').length;
  const readyCheckCount = checks.filter((check) => check.status === 'ready').length;
  const packet = IosToolchainSetupPacketSchema.parse({
    checks,
    commands: [
      {
        command: 'npm run native:ios:doctor',
        key: 'ios-toolchain-doctor',
        label: 'Refresh iOS toolchain report',
        owner: 'engineering',
        purpose: 'Refresh full-Xcode, workspace, Pods, and build-settings evidence.',
      },
      {
        command: 'npm run native:ios:pods',
        key: 'ios-pods',
        label: 'Refresh iOS Pods',
        owner: 'engineering',
        purpose: 'Install or repair iOS Pods for the native pose module.',
      },
      {
        command: 'npx expo run:ios --device',
        key: 'ios-device-build',
        label: 'Run iOS device build',
        owner: 'release',
        purpose: 'Verify the native app shell and local analysis on iOS after full Xcode is ready.',
      },
    ],
    generatedAt: generatedAt ?? (typeof report?.generatedAt === 'string' ? report.generatedAt : new Date().toISOString()),
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      tokenLikeValuesIncluded: false,
    },
    reportSchemaVersion: report?.schemaVersion === 'movebeta.ios-toolchain-report.v1' ? report.schemaVersion : undefined,
    reportStatus,
    schemaVersion: iosToolchainSetupPacketSchemaVersion,
    summary: {
      blockedCheckCount,
      nextAction:
        reportStatus === 'ready'
          ? 'Run an iOS simulator or device build and attach a share-safe build log to native QA evidence.'
          : 'Install and select full Xcode, rerun npm run native:ios:doctor, then run an iOS simulator or device build.',
      readyCheckCount,
      status: reportStatus === 'ready' ? 'ready-for-ios-build' : 'needs-full-xcode',
      totalCheckCount: checks.length,
    },
  });

  return assertIosToolchainSetupPacketIsShareSafe(packet);
}
