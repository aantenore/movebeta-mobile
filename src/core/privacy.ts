import { z } from 'zod';

export const PrivacyConsentSchema = z.object({
  captureVideo: z.boolean().default(false),
  cloudSync: z.boolean().default(false),
  coachReview: z.boolean().default(false),
  cueValidation: z.boolean().default(false),
  diagnosticsExport: z.boolean().default(false),
  exportRawVideo: z.boolean().default(false),
  importVideo: z.boolean().default(false),
  localReportStorage: z.boolean().default(true),
  policyVersion: z.string().default('2026-06-17'),
});

export type PrivacyConsent = z.infer<typeof PrivacyConsentSchema>;

export const defaultPrivacyConsent = PrivacyConsentSchema.parse({});

export function canAnalyzeOnDevice(consent: PrivacyConsent) {
  return consent.captureVideo || consent.importVideo || consent.localReportStorage;
}

export function canExportRawVideo(consent: PrivacyConsent) {
  return consent.exportRawVideo;
}

export function canSyncToCloud(consent: PrivacyConsent) {
  return consent.cloudSync;
}

export function canPrepareCoachReviewPacket(consent: PrivacyConsent) {
  return consent.coachReview && consent.cueValidation && !consent.cloudSync && !consent.exportRawVideo;
}

export function assertCoachReviewConsent(consent: PrivacyConsent) {
  if (canPrepareCoachReviewPacket(consent)) return;
  throw new Error('Coach review packet export requires explicit athlete consent for coach review and cue validation.');
}

export function assertNoImplicitUpload(consent: PrivacyConsent) {
  if (!consent.cloudSync && !consent.exportRawVideo) return;
  throw new Error('Cloud sync or raw video export requires explicit user action at the workflow boundary.');
}
