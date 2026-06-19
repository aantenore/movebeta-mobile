import { afterEach, describe, expect, it } from 'vitest';

import { localMovementAnalyzer } from '../src/movement/localAnalyzer';
import {
  InMemoryReportRepository,
  LocalReportRepository,
  SQLiteReportRepository,
  type SQLiteDatabaseLike,
} from '../src/movement/reportRepository';
import { analyzeSampleSession } from '../src/movement/repository';
import { samplePoseFrames, sampleSession } from '../src/movement/sampleSession';

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

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'localStorage');
});

function createFakeSQLiteDatabase(initialRows: { id: string; created_at: string; payload: string }[] = []): SQLiteDatabaseLike {
  const rows = new Map(initialRows.map((row) => [row.id, row]));

  return {
    execAsync: async () => undefined,
    getAllAsync: async <T>() =>
      [...rows.values()]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((row) => ({ payload: row.payload }) as T),
    getFirstAsync: async <T>(_sql: string, id: unknown) => {
      const row = rows.get(String(id));
      return row ? ({ payload: row.payload } as T) : null;
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      if (sql.startsWith('INSERT')) {
        const [id, createdAt, payload] = params.map(String);
        rows.set(id, { created_at: createdAt, id, payload });
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

describe('report repository contract', () => {
  it('saves, exports, lists, and deletes reports without exporting raw video', async () => {
    const repository = new InMemoryReportRepository();
    const report = await analyzeSampleSession();

    await repository.saveReport(report);

    expect(await repository.getReport(report.id)).toEqual(report);
    expect(await repository.listReports()).toHaveLength(1);

    const exported = await repository.exportReport(report.id);
    expect(exported?.privacy.videoLeavesDevice).toBe(false);
    expect(exported?.privacy.storedArtifacts).toContain('movement metrics');

    expect(await repository.deleteReport(report.id)).toBe(true);
    expect(await repository.getReport(report.id)).toBeNull();
  });

  it('persists local reports and restores them after a reload', async () => {
    const store = installLocalStorage();
    const report = await localMovementAnalyzer.analyze({
      frames: samplePoseFrames,
      session: sampleSession,
    });
    const repository = new LocalReportRepository('test.movebeta.reports');

    await repository.saveReport(report);

    const restoredRepository = new LocalReportRepository('test.movebeta.reports');
    const restoredReports = await restoredRepository.listReports();

    expect(store.get('test.movebeta.reports')).toContain(report.id);
    expect(restoredReports).toHaveLength(1);
    expect(restoredReports[0]).toEqual(report);

    expect(await restoredRepository.deleteReport(report.id)).toBe(true);
    expect(await restoredRepository.listReports()).toHaveLength(0);
  });

  it('ignores corrupted local storage instead of blocking the app', async () => {
    installLocalStorage({
      'test.movebeta.reports': '{bad-json',
    });

    const repository = new LocalReportRepository('test.movebeta.reports');

    expect(await repository.listReports()).toEqual([]);
  });

  it('stores native reports in SQLite and keeps export privacy-safe', async () => {
    const report = await localMovementAnalyzer.analyze({
      frames: samplePoseFrames,
      session: sampleSession,
    });
    const fakeDb = createFakeSQLiteDatabase();
    const repository = new SQLiteReportRepository('test.db', async () => fakeDb);

    await repository.saveReport(report);

    expect(await repository.getReport(report.id)).toEqual(report);
    expect(await repository.listReports()).toEqual([report]);
    expect((await repository.exportReport(report.id))?.privacy.videoLeavesDevice).toBe(false);
    expect(await repository.deleteReport(report.id)).toBe(true);
    expect(await repository.getReport(report.id)).toBeNull();
  });

  it('ignores corrupted SQLite rows instead of blocking native report history', async () => {
    const fakeDb = createFakeSQLiteDatabase([
      {
        created_at: '2026-06-19T10:00:00+02:00',
        id: 'bad-row',
        payload: '{bad-json',
      },
    ]);
    const repository = new SQLiteReportRepository('test.db', async () => fakeDb);

    expect(await repository.getReport('bad-row')).toBeNull();
    expect(await repository.listReports()).toEqual([]);
  });
});
