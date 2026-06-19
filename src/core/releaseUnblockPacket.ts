import { z } from 'zod';

import {
  buildReleaseUnblockChecklist,
  ReleaseUnblockChecklistSchema,
  type ReleaseUnblockChecklist,
} from './releaseUnblockChecklist';
import { type LaunchReadinessEvidence } from './launchReadiness';

export const releaseUnblockPacketSchemaVersion = 'movebeta.release-unblock-packet.v1';

export const ReleaseUnblockPacketSchema = z.object({
  checklist: ReleaseUnblockChecklistSchema,
  generatedAt: z.string(),
  privacy: z.object({
    credentialValuesIncluded: z.literal(false),
    localPathsIncluded: z.literal(false),
    rawArtifactsIncluded: z.literal(false),
  }),
  schemaVersion: z.literal(releaseUnblockPacketSchemaVersion),
  summary: z.object({
    blockedItems: z.number().int().nonnegative(),
    commandCount: z.number().int().nonnegative(),
    nextAction: z.string(),
    ownerCount: z.number().int().nonnegative(),
    proofCount: z.number().int().nonnegative(),
    status: z.enum(['ready', 'needs-external-access']),
  }),
});

export type ReleaseUnblockPacket = z.infer<typeof ReleaseUnblockPacketSchema>;

const forbiddenPacketValuePattern =
  /(file:\/\/|content:\/\/|ph:\/\/|\/users\/|\/private\/|\/var\/|BEGIN PRIVATE KEY|ghp_[A-Za-z0-9_]+|pat_[A-Za-z0-9_]+|sk_live_[A-Za-z0-9_]+|sk_test_[A-Za-z0-9_]+|eyJ[A-Za-z0-9_-]{20,})/i;

function containsForbiddenPacketValue(value: unknown): boolean {
  if (typeof value === 'string') return forbiddenPacketValuePattern.test(value);
  if (Array.isArray(value)) return value.some(containsForbiddenPacketValue);
  if (value && typeof value === 'object') return Object.values(value).some(containsForbiddenPacketValue);
  return false;
}

export function assertReleaseUnblockPacketIsShareSafe(packet: ReleaseUnblockPacket) {
  if (containsForbiddenPacketValue(packet)) {
    throw new Error('Release unblock packet contains credential values, local paths, raw artifact references, or token-like data.');
  }
  return packet;
}

export function buildReleaseUnblockPacket(
  options: {
    checklist?: ReleaseUnblockChecklist;
    evidence?: LaunchReadinessEvidence;
    generatedAt?: string;
  } = {},
): ReleaseUnblockPacket {
  const checklist = options.checklist ?? buildReleaseUnblockChecklist(options.evidence);
  const packet = ReleaseUnblockPacketSchema.parse({
    checklist,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    privacy: {
      credentialValuesIncluded: false,
      localPathsIncluded: false,
      rawArtifactsIncluded: false,
    },
    schemaVersion: releaseUnblockPacketSchemaVersion,
    summary: checklist.summary,
  });

  return assertReleaseUnblockPacketIsShareSafe(packet);
}
