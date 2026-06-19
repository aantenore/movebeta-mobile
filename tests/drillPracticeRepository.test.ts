import { afterEach, describe, expect, it } from 'vitest';

import {
  createDrillPracticeRecord,
  InMemoryDrillPracticeRepository,
  LocalDrillPracticeRepository,
  SQLiteDrillPracticeRepository,
} from '../src/movement/drillPracticeRepository';
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

function createFakeSQLiteDatabase(initialRows: { drill_id: string; payload: string; report_id: string; updated_at: string }[] = []): SQLiteDatabaseLike {
  const rows = new Map(initialRows.map((row) => [row.drill_id, row]));

  return {
    execAsync: async () => undefined,
    getAllAsync: async <T>(sql: string, id?: unknown) =>
      [...rows.values()]
        .filter((row) => (sql.includes('WHERE report_id') ? row.report_id === String(id) : true))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((row) => ({ payload: row.payload }) as T),
    getFirstAsync: async <T>(_sql: string, id: unknown) => {
      const row = rows.get(String(id));
      return row ? ({ payload: row.payload } as T) : null;
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      if (sql.startsWith('INSERT')) {
        const [drillId, reportId, updatedAt, payload] = params.map(String);
        rows.set(drillId, { drill_id: drillId, payload, report_id: reportId, updated_at: updatedAt });
        return { changes: 1 };
      }
      if (sql.includes('WHERE report_id')) {
        const reportId = String(params[0]);
        const matching = [...rows.values()].filter((row) => row.report_id === reportId);
        for (const row of matching) rows.delete(row.drill_id);
        return { changes: matching.length };
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

describe('drill practice repository', () => {
  it('creates, lists, updates, and deletes private drill practice records', async () => {
    const repository = new InMemoryDrillPracticeRepository();
    const completed = createDrillPracticeRecord({
      cueId: 'cue-hip',
      drillId: 'cue-hip-analysis-1',
      note: 'Felt controlled.',
      reportId: 'analysis-1',
      status: 'completed',
      updatedAt: '2026-06-19T16:00:00.000Z',
    });

    await repository.saveRecord(completed);

    expect(await repository.getRecord(completed.drillId)).toEqual(completed);
    expect(await repository.listRecordsForReport('analysis-1')).toEqual([completed]);

    const skipped = createDrillPracticeRecord({
      cueId: completed.cueId,
      drillId: completed.drillId,
      reportId: completed.reportId,
      status: 'skipped',
      updatedAt: '2026-06-19T16:10:00.000Z',
    });

    await repository.saveRecord(skipped);

    expect(await repository.getRecord(completed.drillId)).toMatchObject({ status: 'skipped' });
    expect(await repository.deleteRecordsForReport('analysis-1')).toBe(1);
    expect(await repository.listRecords()).toEqual([]);
  });

  it('persists local drill practice and restores it after reload', async () => {
    const store = installLocalStorage();
    const repository = new LocalDrillPracticeRepository('test.movebeta.drill-practice');
    const record = createDrillPracticeRecord({
      cueId: 'cue-lockoff',
      drillId: 'cue-lockoff-analysis-2',
      reportId: 'analysis-2',
      status: 'completed',
      updatedAt: '2026-06-19T16:00:00.000Z',
    });

    await repository.saveRecord(record);

    const restoredRepository = new LocalDrillPracticeRepository('test.movebeta.drill-practice');

    expect(store.get('test.movebeta.drill-practice')).toContain('cue-lockoff-analysis-2');
    expect(await restoredRepository.getRecord(record.drillId)).toEqual(record);
  });

  it('ignores corrupted local drill practice storage', async () => {
    installLocalStorage({
      'test.movebeta.drill-practice': '{bad-json',
    });

    const repository = new LocalDrillPracticeRepository('test.movebeta.drill-practice');

    expect(await repository.listRecords()).toEqual([]);
  });

  it('stores native drill practice in SQLite and ignores corrupted rows', async () => {
    const record = createDrillPracticeRecord({
      cueId: 'cue-foot-cut',
      drillId: 'cue-foot-cut-analysis-3',
      reportId: 'analysis-3',
      status: 'completed',
      updatedAt: '2026-06-19T16:00:00.000Z',
    });
    const fakeDb = createFakeSQLiteDatabase([
      {
        drill_id: 'bad-row',
        payload: '{bad-json',
        report_id: 'analysis-3',
        updated_at: '2026-06-19T15:00:00.000Z',
      },
    ]);
    const repository = new SQLiteDrillPracticeRepository('test.db', async () => fakeDb);

    await repository.saveRecord(record);

    expect(await repository.getRecord(record.drillId)).toEqual(record);
    expect(await repository.getRecord('bad-row')).toBeNull();
    expect(await repository.listRecordsForReport('analysis-3')).toEqual([record]);
    expect(await repository.deleteRecord(record.drillId)).toBe(true);
    expect(await repository.getRecord(record.drillId)).toBeNull();
  });
});
