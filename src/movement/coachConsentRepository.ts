import { z } from 'zod';

import { PrivacyConsentSchema, type PrivacyConsent } from '@/core/privacy';

import { openSQLiteDatabase } from './sqliteOpen';
import type { OpenSQLiteDatabase, SQLiteDatabaseLike } from './reportRepository';

export const CoachReviewConsentRecordSchema = z.object({
  grantedAt: z.string(),
  policyVersion: z.string(),
  rawVideoIncluded: z.literal(false),
  reportId: z.string(),
  revokedAt: z.string().optional(),
  scope: z.array(z.enum(['coach-review', 'cue-validation'])),
  videoLeavesDevice: z.literal(false),
});

export type CoachReviewConsentRecord = z.infer<typeof CoachReviewConsentRecordSchema>;

export type CoachConsentRepository = {
  deleteConsent(reportId: string): Promise<boolean>;
  getConsent(reportId: string): Promise<CoachReviewConsentRecord | null>;
  hasActiveConsent(reportId: string): Promise<boolean>;
  listConsents(): Promise<CoachReviewConsentRecord[]>;
  revokeConsent(reportId: string, revokedAt?: string): Promise<CoachReviewConsentRecord | null>;
  saveConsent(record: CoachReviewConsentRecord): Promise<CoachReviewConsentRecord>;
};

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const storageKey = 'movebeta.coach-consents.v1';
const defaultPolicyVersion = '2026-06-19';

function now() {
  return new Date().toISOString();
}

function getLocalStorage(): KeyValueStorage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export function createCoachReviewConsentRecord(
  reportId: string,
  options: { grantedAt?: string; policyVersion?: string } = {},
): CoachReviewConsentRecord {
  return CoachReviewConsentRecordSchema.parse({
    grantedAt: options.grantedAt ?? now(),
    policyVersion: options.policyVersion ?? defaultPolicyVersion,
    rawVideoIncluded: false,
    reportId,
    scope: ['coach-review', 'cue-validation'],
    videoLeavesDevice: false,
  });
}

export function isCoachReviewConsentActive(record: CoachReviewConsentRecord | null): record is CoachReviewConsentRecord {
  return Boolean(record && !record.revokedAt);
}

export function consentRecordToPrivacyConsent(record: CoachReviewConsentRecord): PrivacyConsent {
  if (!isCoachReviewConsentActive(record)) {
    throw new Error('Coach review consent has been revoked.');
  }

  return PrivacyConsentSchema.parse({
    coachReview: record.scope.includes('coach-review'),
    cueValidation: record.scope.includes('cue-validation'),
    policyVersion: record.policyVersion,
  });
}

export class InMemoryCoachConsentRepository implements CoachConsentRepository {
  protected readonly consents = new Map<string, CoachReviewConsentRecord>();

  async saveConsent(record: CoachReviewConsentRecord) {
    const parsed = CoachReviewConsentRecordSchema.parse(record);
    this.consents.set(parsed.reportId, parsed);
    return parsed;
  }

  async getConsent(reportId: string) {
    return this.consents.get(reportId) ?? null;
  }

  async listConsents() {
    return [...this.consents.values()].sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  }

  async hasActiveConsent(reportId: string) {
    return isCoachReviewConsentActive(await this.getConsent(reportId));
  }

  async revokeConsent(reportId: string, revokedAt = now()) {
    const current = await this.getConsent(reportId);
    if (!current) return null;

    const revoked = CoachReviewConsentRecordSchema.parse({
      ...current,
      revokedAt,
    });
    this.consents.set(reportId, revoked);
    return revoked;
  }

  async deleteConsent(reportId: string) {
    return this.consents.delete(reportId);
  }
}

export class LocalCoachConsentRepository extends InMemoryCoachConsentRepository {
  private restored = false;

  constructor(private readonly key = storageKey) {
    super();
    this.restore();
  }

  private restore() {
    const storage = getLocalStorage();
    if (!storage) return;
    const raw = storage.getItem(this.key);
    if (!raw) {
      this.saveSnapshot(storage);
      this.restored = true;
      return;
    }

    let storedConsents: unknown;
    try {
      storedConsents = JSON.parse(raw);
    } catch {
      this.restored = true;
      return;
    }

    const records = CoachReviewConsentRecordSchema.array().safeParse(storedConsents);
    if (!records.success) {
      this.restored = true;
      return;
    }

    for (const record of records.data) {
      this.consents.set(record.reportId, record);
    }
    this.restored = true;
  }

  private ensureRestored() {
    if (!this.restored) this.restore();
  }

  private snapshot() {
    return [...this.consents.values()].sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  }

  private saveSnapshot(storage: KeyValueStorage) {
    storage.setItem(this.key, JSON.stringify(this.snapshot()));
  }

  private async persist() {
    const storage = getLocalStorage();
    if (!storage) return;
    this.saveSnapshot(storage);
  }

  async getConsent(reportId: string) {
    this.ensureRestored();
    return super.getConsent(reportId);
  }

  async listConsents() {
    this.ensureRestored();
    return super.listConsents();
  }

  async saveConsent(record: CoachReviewConsentRecord) {
    this.ensureRestored();
    const saved = await super.saveConsent(record);
    await this.persist();
    return saved;
  }

  async revokeConsent(reportId: string, revokedAt?: string) {
    this.ensureRestored();
    const revoked = await super.revokeConsent(reportId, revokedAt);
    await this.persist();
    return revoked;
  }

  async deleteConsent(reportId: string) {
    this.ensureRestored();
    const deleted = await super.deleteConsent(reportId);
    await this.persist();
    return deleted;
  }
}

export class SQLiteCoachConsentRepository implements CoachConsentRepository {
  private db: SQLiteDatabaseLike | null = null;

  constructor(
    private readonly databaseName = 'movebeta-consents.db',
    private readonly openDatabase: OpenSQLiteDatabase = openSQLiteDatabase,
  ) {}

  private async getDb() {
    if (this.db) return this.db;

    const db = await this.openDatabase(this.databaseName);
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS coach_consents (report_id TEXT PRIMARY KEY NOT NULL, granted_at TEXT NOT NULL, payload TEXT NOT NULL);',
    );
    this.db = db;
    return db;
  }

  async saveConsent(record: CoachReviewConsentRecord) {
    const parsed = CoachReviewConsentRecordSchema.parse(record);
    const db = await this.getDb();

    await db.runAsync(
      'INSERT OR REPLACE INTO coach_consents (report_id, granted_at, payload) VALUES (?, ?, ?);',
      parsed.reportId,
      parsed.grantedAt,
      JSON.stringify(parsed),
    );

    return parsed;
  }

  async getConsent(reportId: string) {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM coach_consents WHERE report_id = ? LIMIT 1;', reportId);
    if (!row) return null;

    try {
      const record = CoachReviewConsentRecordSchema.safeParse(JSON.parse(row.payload));
      return record.success ? record.data : null;
    } catch {
      return null;
    }
  }

  async listConsents() {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM coach_consents ORDER BY granted_at DESC;');

    return rows.flatMap((row) => {
      try {
        const record = CoachReviewConsentRecordSchema.safeParse(JSON.parse(row.payload));
        return record.success ? [record.data] : [];
      } catch {
        return [];
      }
    });
  }

  async hasActiveConsent(reportId: string) {
    return isCoachReviewConsentActive(await this.getConsent(reportId));
  }

  async revokeConsent(reportId: string, revokedAt = now()) {
    const current = await this.getConsent(reportId);
    if (!current) return null;

    return this.saveConsent({
      ...current,
      revokedAt,
    });
  }

  async deleteConsent(reportId: string) {
    const existing = await this.getConsent(reportId);
    if (!existing) return false;

    const db = await this.getDb();
    await db.runAsync('DELETE FROM coach_consents WHERE report_id = ?;', reportId);
    return true;
  }
}

function isReactNativeRuntime() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

export const coachConsentRepository: CoachConsentRepository = isReactNativeRuntime()
  ? new SQLiteCoachConsentRepository()
  : new LocalCoachConsentRepository();
