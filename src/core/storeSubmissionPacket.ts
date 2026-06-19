import { z } from 'zod';

import {
  buildSafetyLanguageGuard,
  type SafetyLanguageGuardSummary,
  type SafetyLanguageSource,
} from './safetyLanguage';
import {
  StoreReadinessManifestSchema,
  type StoreReadinessManifest,
  type StoreReadinessValidation,
  validateStoreReadinessManifest,
} from './storeReadiness';

export const storeSubmissionPacketSchemaVersion = 'movebeta.store-submission-packet.v1';

const StoreSubmissionCommandSchema = z.object({
  command: z.string(),
  key: z.string(),
  label: z.string(),
  owner: z.enum(['engineering', 'product', 'release']),
  purpose: z.string(),
});

export const StoreSubmissionPacketSchema = z.object({
  commands: z.array(StoreSubmissionCommandSchema),
  generatedAt: z.string(),
  manifest: StoreReadinessManifestSchema,
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
    rawVideoIncluded: z.literal(false),
    secretsIncluded: z.literal(false),
    trackingEnabled: z.literal(false),
  }),
  readiness: z.custom<StoreReadinessValidation>(),
  safetyLanguage: z.custom<SafetyLanguageGuardSummary>(),
  schemaVersion: z.literal(storeSubmissionPacketSchemaVersion),
  summary: z.object({
    androidPackage: z.string(),
    blockerCount: z.number().int().nonnegative(),
    checkCount: z.number().int().nonnegative(),
    checksPassed: z.number().int().nonnegative(),
    copyIssueCount: z.number().int().nonnegative(),
    iosBundleIdentifier: z.string(),
    nextAction: z.string(),
    screenshotCount: z.number().int().nonnegative(),
    status: z.enum(['metadata-ready', 'review-required']),
  }),
});

export type StoreSubmissionPacket = z.infer<typeof StoreSubmissionPacketSchema>;

const forbiddenStoreSubmissionValuePattern =
  /(file:\/\/|content:\/\/|asset:\/\/|ph:\/\/|\/Users\/|\/private\/|\/var\/mobile\/|[A-Za-z]:\\|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenStoreSubmissionValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenStoreSubmissionValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenStoreSubmissionValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenStoreSubmissionValue);
  return false;
}

function buildStoreSafetySources(manifest: StoreReadinessManifest): SafetyLanguageSource[] {
  return [
    {
      key: 'listing-summary',
      label: 'Store listing summary',
      text: [
        manifest.listing.appName,
        manifest.listing.subtitle,
        manifest.listing.shortDescription,
        manifest.listing.promotionalText,
      ].join(' '),
    },
    {
      key: 'listing-description',
      label: 'Store full description',
      text: manifest.listing.fullDescription,
    },
    {
      key: 'platform-privacy-copy',
      label: 'Platform permission copy',
      text: Object.values(manifest.iosUsageDescriptions).join(' '),
    },
    {
      key: 'privacy-declaration',
      label: 'Store privacy declaration',
      text: [
        `Raw video upload default: ${manifest.privacy.rawVideoUploadDefault ? 'on' : 'off'}.`,
        `Cloud sync default: ${manifest.privacy.cloudSyncDefault ? 'on' : 'off'}.`,
        `Tracking: ${manifest.privacy.tracking ? 'enabled' : 'not used'}.`,
        `Medical claims: ${manifest.privacy.medicalClaims ? 'declared' : 'not made'}.`,
      ].join(' '),
    },
  ];
}

function nextActionFor(readiness: StoreReadinessValidation, safetyLanguage: SafetyLanguageGuardSummary) {
  if (!readiness.ready) return 'Fix failing store metadata, permission, privacy, or screenshot checks before submission.';
  if (safetyLanguage.status !== 'clear') return 'Rewrite flagged store copy before App Store or Play submission.';
  return 'Store metadata packet is ready for account-bound credential and native QA gates.';
}

export function assertStoreSubmissionPacketIsShareSafe(packet: StoreSubmissionPacket) {
  if (containsForbiddenStoreSubmissionValue(packet)) {
    throw new Error('Store submission packet contains credential values, local paths, raw artifacts, or token-like data.');
  }
  return packet;
}

export function buildStoreSubmissionPacket({
  generatedAt = new Date().toISOString(),
  manifest,
}: {
  generatedAt?: string;
  manifest: StoreReadinessManifest;
}): StoreSubmissionPacket {
  const parsedManifest = StoreReadinessManifestSchema.parse(manifest);
  const readiness = validateStoreReadinessManifest(parsedManifest);
  const safetyLanguage = buildSafetyLanguageGuard(buildStoreSafetySources(parsedManifest));
  const failedChecks = readiness.checks.filter((check) => check.status === 'fail');
  const status = readiness.ready && safetyLanguage.status === 'clear' ? 'metadata-ready' : 'review-required';
  const commands = [
    {
      command: 'npm run store:manifest',
      key: 'store-manifest',
      label: 'Store manifest',
      owner: 'product',
      purpose: 'Regenerate listing, privacy declarations, permission copy, identifiers, and screenshot plan from release config.',
    },
    {
      command: 'npm run store:screenshots',
      key: 'store-screenshots',
      label: 'Store screenshots',
      owner: 'product',
      purpose: 'Refresh current mobile screenshots before App Store or Play submission.',
    },
    {
      command: 'npm run store:submission',
      key: 'store-submission-packet',
      label: 'Store submission packet',
      owner: 'release',
      purpose: 'Regenerate this share-safe metadata packet after manifest or screenshots change.',
    },
    {
      command: 'npm run release:credentials:doctor',
      key: 'store-credentials-doctor',
      label: 'Store credentials doctor',
      owner: 'release',
      purpose: 'Verify account-bound Expo, Apple, and Google credential key presence without exposing values.',
    },
    {
      command: 'npm run release:eas:strict',
      key: 'eas-strict',
      label: 'Strict EAS submission gate',
      owner: 'release',
      purpose: 'Block native store submission until Expo, Apple, and Google credentials are present.',
    },
    {
      command: 'npm run native:qa:validate',
      key: 'native-qa-validate',
      label: 'Native QA validator',
      owner: 'engineering',
      purpose: 'Verify physical-device evidence before claiming native release readiness.',
    },
  ] satisfies Array<z.infer<typeof StoreSubmissionCommandSchema>>;

  const packet = StoreSubmissionPacketSchema.parse({
    commands,
    generatedAt,
    manifest: parsedManifest,
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
      rawVideoIncluded: false,
      secretsIncluded: false,
      trackingEnabled: false,
    },
    readiness,
    safetyLanguage,
    schemaVersion: storeSubmissionPacketSchemaVersion,
    summary: {
      androidPackage: parsedManifest.androidPackage,
      blockerCount: failedChecks.length + safetyLanguage.blockerCount,
      checkCount: readiness.checks.length,
      checksPassed: readiness.checks.length - failedChecks.length,
      copyIssueCount: safetyLanguage.issueCount,
      iosBundleIdentifier: parsedManifest.iosBundleIdentifier,
      nextAction: nextActionFor(readiness, safetyLanguage),
      screenshotCount: parsedManifest.screenshots.length,
      status,
    },
  });

  return assertStoreSubmissionPacketIsShareSafe(packet);
}
