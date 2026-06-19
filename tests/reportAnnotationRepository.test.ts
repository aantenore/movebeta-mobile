import { afterEach, describe, expect, it } from 'vitest';

import {
  createReportAnnotation,
  InMemoryReportAnnotationRepository,
  LocalReportAnnotationRepository,
  SQLiteReportAnnotationRepository,
  updateCueFeedback,
  updateRepeatOutcome,
  updateReportAnnotation,
} from '../src/movement/reportAnnotationRepository';
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

function createFakeSQLiteDatabase(initialRows: { payload: string; report_id: string; updated_at: string }[] = []): SQLiteDatabaseLike {
  const rows = new Map(initialRows.map((row) => [row.report_id, row]));

  return {
    execAsync: async () => undefined,
    getAllAsync: async <T>() =>
      [...rows.values()]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map((row) => ({ payload: row.payload }) as T),
    getFirstAsync: async <T>(_sql: string, id: unknown) => {
      const row = rows.get(String(id));
      return row ? ({ payload: row.payload } as T) : null;
    },
    runAsync: async (sql: string, ...params: unknown[]) => {
      if (sql.startsWith('INSERT')) {
        const [reportId, updatedAt, payload] = params.map(String);
        rows.set(reportId, { payload, report_id: reportId, updated_at: updatedAt });
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

describe('report annotation repository', () => {
  it('creates, updates, lists, and deletes private report annotations', async () => {
    const repository = new InMemoryReportAnnotationRepository();
    const annotation = createReportAnnotation('analysis-1', {
      confidence: 4,
      perceivedEffort: 5,
      privateNote: 'Right foot beta worked after the pause.',
      projectStatus: 'repeat',
      tags: [' Board ', 'board', 'crux'],
      updatedAt: '2026-06-19T12:00:00.000Z',
    });

    await repository.saveAnnotation(annotation);

    expect(annotation.tags).toEqual(['board', 'crux']);
    expect(annotation.repeatOutcome).toBeNull();
    expect(await repository.getAnnotation('analysis-1')).toEqual(annotation);
    expect(await repository.listAnnotations()).toEqual([annotation]);

    const withCueFeedback = updateCueFeedback(annotation, {
      cueId: 'cue-lockoff',
      rating: 'useful',
      updatedAt: '2026-06-19T12:15:00.000Z',
    });

    await repository.saveAnnotation(withCueFeedback);

    expect((await repository.getAnnotation('analysis-1'))?.cueFeedback).toMatchObject([
      {
        cueId: 'cue-lockoff',
        rating: 'useful',
      },
    ]);

    const withRepeatOutcome = updateRepeatOutcome(withCueFeedback, {
      attempts: 2,
      resolvedCueIds: ['cue-lockoff', 'cue-lockoff', ' cue-hip '],
      status: 'improved',
      updatedAt: '2026-06-19T12:20:00.000Z',
    });

    await repository.saveAnnotation(withRepeatOutcome);

    expect((await repository.getAnnotation('analysis-1'))?.repeatOutcome).toMatchObject({
      attempts: 2,
      resolvedCueIds: ['cue-lockoff', 'cue-hip'],
      status: 'improved',
    });

    const withoutRepeatOutcome = updateReportAnnotation(withRepeatOutcome, {
      repeatOutcome: null,
      updatedAt: '2026-06-19T12:25:00.000Z',
    });

    await repository.saveAnnotation(withoutRepeatOutcome);

    expect((await repository.getAnnotation('analysis-1'))?.repeatOutcome).toBeNull();

    const updated = updateReportAnnotation(withoutRepeatOutcome, {
      confidence: 5,
      privateNote: 'Ready for a send try.',
      projectStatus: 'sent',
      updatedAt: '2026-06-19T12:30:00.000Z',
    });

    await repository.saveAnnotation(updated);

    expect((await repository.getAnnotation('analysis-1'))?.projectStatus).toBe('sent');
    expect(await repository.deleteAnnotation('analysis-1')).toBe(true);
    expect(await repository.getAnnotation('analysis-1')).toBeNull();
  });

  it('restores legacy annotations without cue feedback', async () => {
    const legacyAnnotation = {
      confidence: 3,
      perceivedEffort: 4,
      privateNote: 'Legacy note.',
      projectStatus: 'project',
      reportId: 'legacy-analysis',
      tags: ['board'],
      updatedAt: '2026-06-19T12:00:00.000Z',
    };
    installLocalStorage({
      'test.movebeta.legacy-annotations': JSON.stringify([legacyAnnotation]),
    });

    const repository = new LocalReportAnnotationRepository('test.movebeta.legacy-annotations');

    expect(await repository.getAnnotation('legacy-analysis')).toMatchObject({
      cueFeedback: [],
      privateNote: 'Legacy note.',
      repeatOutcome: null,
    });
  });

  it('persists local annotations and restores them after reload', async () => {
    const store = installLocalStorage();
    const repository = new LocalReportAnnotationRepository('test.movebeta.annotations');
    const annotation = updateCueFeedback(
      createReportAnnotation('analysis-2', {
        privateNote: 'Try quieter feet.',
        updatedAt: '2026-06-19T12:00:00.000Z',
      }),
      {
        cueId: 'cue-foot-cut',
        rating: 'unclear',
        updatedAt: '2026-06-19T12:10:00.000Z',
      },
    );

    await repository.saveAnnotation(annotation);

    const restoredRepository = new LocalReportAnnotationRepository('test.movebeta.annotations');

    expect(store.get('test.movebeta.annotations')).toContain('analysis-2');
    expect(await restoredRepository.getAnnotation('analysis-2')).toEqual(annotation);
  });

  it('ignores corrupted local annotation storage instead of blocking sessions', async () => {
    installLocalStorage({
      'test.movebeta.annotations': '{bad-json',
    });

    const repository = new LocalReportAnnotationRepository('test.movebeta.annotations');

    expect(await repository.listAnnotations()).toEqual([]);
  });

  it('stores native annotations in SQLite and ignores corrupted rows', async () => {
    const annotation = createReportAnnotation('analysis-3', {
      privateNote: 'Keep left hip closer.',
      updatedAt: '2026-06-19T12:00:00.000Z',
    });
    const fakeDb = createFakeSQLiteDatabase([
      {
        payload: '{bad-json',
        report_id: 'bad-row',
        updated_at: '2026-06-19T10:00:00.000Z',
      },
    ]);
    const repository = new SQLiteReportAnnotationRepository('test.db', async () => fakeDb);

    await repository.saveAnnotation(annotation);

    expect(await repository.getAnnotation('analysis-3')).toEqual(annotation);
    expect(await repository.getAnnotation('bad-row')).toBeNull();
    expect(await repository.listAnnotations()).toEqual([annotation]);
    expect(await repository.deleteAnnotation('analysis-3')).toBe(true);
    expect(await repository.getAnnotation('analysis-3')).toBeNull();
  });
});
