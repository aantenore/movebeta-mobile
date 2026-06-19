import { describe, expect, it } from 'vitest';

import {
  PrivacyConsentSchema,
  assertNoImplicitUpload,
  canPrepareCoachReviewPacket,
  canAnalyzeOnDevice,
  canExportRawVideo,
  canSyncToCloud,
  defaultPrivacyConsent,
} from '../src/core/privacy';

describe('privacy consent policy', () => {
  it('defaults to local report storage without raw video export or cloud sync', () => {
    expect(defaultPrivacyConsent.localReportStorage).toBe(true);
    expect(canAnalyzeOnDevice(defaultPrivacyConsent)).toBe(true);
    expect(canPrepareCoachReviewPacket(defaultPrivacyConsent)).toBe(false);
    expect(canExportRawVideo(defaultPrivacyConsent)).toBe(false);
    expect(canSyncToCloud(defaultPrivacyConsent)).toBe(false);
    expect(() => assertNoImplicitUpload(defaultPrivacyConsent)).not.toThrow();
  });

  it('rejects implicit upload-capable consent at workflow boundaries', () => {
    const cloudConsent = PrivacyConsentSchema.parse({ cloudSync: true });
    const exportConsent = PrivacyConsentSchema.parse({ exportRawVideo: true });

    expect(() => assertNoImplicitUpload(cloudConsent)).toThrow('explicit user action');
    expect(() => assertNoImplicitUpload(exportConsent)).toThrow('explicit user action');
  });

  it('allows coach packets only after explicit coach review and cue validation consent', () => {
    const consent = PrivacyConsentSchema.parse({
      coachReview: true,
      cueValidation: true,
    });
    const uploadCapableConsent = PrivacyConsentSchema.parse({
      coachReview: true,
      cueValidation: true,
      exportRawVideo: true,
    });

    expect(canPrepareCoachReviewPacket(consent)).toBe(true);
    expect(canPrepareCoachReviewPacket(uploadCapableConsent)).toBe(false);
  });
});
