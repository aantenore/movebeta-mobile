import { afterEach, describe, expect, it } from 'vitest';

import {
  consentRecordToPrivacyConsent,
  createCoachReviewConsentRecord,
  InMemoryCoachConsentRepository,
  LocalCoachConsentRepository,
  SQLiteCoachConsentRepository,
} from '../src/movement/coachConsentRepository';
import type { SQLiteDatabaseLike } from '../src/movement/reportRepository';

function installLocalStorage(initialValues: Record<string, string> = {}) {
  const store = new Map(Object.entries(initialValues));

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      removeItem: (key: string) => store.delete(key),
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });

  return store;
}

function createFakeSQLiteDatabase(initialRows: { granted_at: string; payload: string; report_id: string }[] = []): SQLiteDatabaseLike {
  const rows = new Map(initialRows.map((row) => [row.report_id, row]));

  return {
    execAsync: async () => undefined,
    getAllAsync: async <T>() =>
      [...rows.values()]
        .sort((a, b) => b.granted_at.localeCompare(a.granted_at))
        .map((row) => ({ payload: row.payload }) as T),
    getFirstAsync: async <T>(_sql: string, id: unknown) => {
      const row = rows.get(String(id));
      return row ? ({ payload: row.payload } as T) : null;
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      if (sql.startsWith('INSERT')) {
        const [reportId, grantedAt, payload] = params.map(String);
        rows.set(reportId, { granted_at: grantedAt, payload, report_id: reportId });
        return { changes: 1 };
      }
      if (sql.startsWith('DELETE')) {
        const deleted = rows.delete(String(params[0]));
        return { changes: deleted ? 1 : 0 };
      }
      return { changes: 0 };
    },
  };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

describe('coach consent repository', () => {
  it('saves active consent and converts it into privacy consent', async () => {
    const repository = new InMemoryCoachConsentRepository();
    const record = createCoachReviewConsentRecord('analysis-1', {
      grantedAt: '2026-06-19T12:00:00.000Z',
      policyVersion: '2026-06-19',
    });

    await repository.saveConsent(record);

    expect(await repository.hasActiveConsent('analysis-1')).toBe(true);
    expect(await repository.listConsents()).toEqual([record]);
    expect(consentRecordToPrivacyConsent(record)).toMatchObject({
      coachReview: true,
      cueValidation: true,
      policyVersion: '2026-06-19',
    });
  });

  it('revokes consent without deleting the audit record', async () => {
    const repository = new InMemoryCoachConsentRepository();
    const record = createCoachReviewConsentRecord('analysis-1', {
      grantedAt: '2026-06-19T12:00:00.000Z',
    });

    await repository.saveConsent(record);
    const revoked = await repository.revokeConsent('analysis-1', '2026-06-19T13:00:00.000Z');

    expect(revoked?.revokedAt).toBe('2026-06-19T13:00:00.000Z');
    expect(await repository.hasActiveConsent('analysis-1')).toBe(false);
    expect(() => consentRecordToPrivacyConsent(revoked!)).toThrow('revoked');
  });

  it('persists local consent records and restores them after reload', async () => {
    const store = installLocalStorage();
    const repository = new LocalCoachConsentRepository('test.movebeta.consents');
    const record = createCoachReviewConsentRecord('analysis-2', {
      grantedAt: '2026-06-19T12:00:00.000Z',
    });

    await repository.saveConsent(record);

    const restoredRepository = new LocalCoachConsentRepository('test.movebeta.consents');

    expect(store.get('test.movebeta.consents')).toContain('analysis-2');
    expect(await restoredRepository.getConsent('analysis-2')).toEqual(record);
  });

  it('ignores corrupted local consent storage instead of blocking sessions', async () => {
    installLocalStorage({
      'test.movebeta.consents': '{bad-json',
    });

    const repository = new LocalCoachConsentRepository('test.movebeta.consents');

    expect(await repository.listConsents()).toEqual([]);
  });

  it('stores native consent records in SQLite and ignores corrupted rows', async () => {
    const record = createCoachReviewConsentRecord('analysis-3', {
      grantedAt: '2026-06-19T12:00:00.000Z',
    });
    const fakeDb = createFakeSQLiteDatabase([
      {
        granted_at: '2026-06-19T10:00:00.000Z',
        payload: '{bad-json',
        report_id: 'bad-row',
      },
    ]);
    const repository = new SQLiteCoachConsentRepository('test.db', async () => fakeDb);

    await repository.saveConsent(record);

    expect(await repository.getConsent('analysis-3')).toEqual(record);
    expect(await repository.getConsent('bad-row')).toBeNull();
    expect(await repository.listConsents()).toEqual([record]);
    expect(await repository.deleteConsent('analysis-3')).toBe(true);
    expect(await repository.getConsent('analysis-3')).toBeNull();
  });
});
