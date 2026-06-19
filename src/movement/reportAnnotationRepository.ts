import { z } from 'zod';

import { openSQLiteDatabase } from './sqliteOpen';
import type { OpenSQLiteDatabase, SQLiteDatabaseLike } from './reportRepository';

export const reportProjectStatuses = ['project', 'repeat', 'sent', 'archived'] as const;

export const ReportAnnotationSchema = z.object({
  confidence: z.number().int().min(1).max(5),
  perceivedEffort: z.number().int().min(1).max(5),
  privateNote: z.string().max(1200),
  projectStatus: z.enum(reportProjectStatuses),
  reportId: z.string(),
  tags: z.array(z.string().min(1).max(24)).max(8),
  updatedAt: z.string(),
});

export type ReportAnnotation = z.infer<typeof ReportAnnotationSchema>;

export type ReportAnnotationRepository = {
  deleteAnnotation(reportId: string): Promise<boolean>;
  getAnnotation(reportId: string): Promise<ReportAnnotation | null>;
  listAnnotations(): Promise<ReportAnnotation[]>;
  saveAnnotation(annotation: ReportAnnotation): Promise<ReportAnnotation>;
};

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const storageKey = 'movebeta.report-annotations.v1';

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

function normalizeTags(tags: string[] = []) {
  return [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
}

export function createReportAnnotation(
  reportId: string,
  updates: Partial<Omit<ReportAnnotation, 'reportId' | 'updatedAt'>> & { updatedAt?: string } = {},
): ReportAnnotation {
  return ReportAnnotationSchema.parse({
    confidence: updates.confidence ?? 3,
    perceivedEffort: updates.perceivedEffort ?? 3,
    privateNote: updates.privateNote ?? '',
    projectStatus: updates.projectStatus ?? 'project',
    reportId,
    tags: normalizeTags(updates.tags),
    updatedAt: updates.updatedAt ?? now(),
  });
}

export function updateReportAnnotation(
  annotation: ReportAnnotation,
  updates: Partial<Omit<ReportAnnotation, 'reportId' | 'updatedAt'>> & { updatedAt?: string },
): ReportAnnotation {
  return ReportAnnotationSchema.parse({
    ...annotation,
    ...updates,
    tags: normalizeTags(updates.tags ?? annotation.tags),
    updatedAt: updates.updatedAt ?? now(),
  });
}

export class InMemoryReportAnnotationRepository implements ReportAnnotationRepository {
  protected readonly annotations = new Map<string, ReportAnnotation>();

  async saveAnnotation(annotation: ReportAnnotation) {
    const parsed = ReportAnnotationSchema.parse({
      ...annotation,
      tags: normalizeTags(annotation.tags),
    });
    this.annotations.set(parsed.reportId, parsed);
    return parsed;
  }

  async getAnnotation(reportId: string) {
    return this.annotations.get(reportId) ?? null;
  }

  async listAnnotations() {
    return [...this.annotations.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async deleteAnnotation(reportId: string) {
    return this.annotations.delete(reportId);
  }
}

export class LocalReportAnnotationRepository extends InMemoryReportAnnotationRepository {
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

    let storedAnnotations: unknown;
    try {
      storedAnnotations = JSON.parse(raw);
    } catch {
      this.restored = true;
      return;
    }

    const records = ReportAnnotationSchema.array().safeParse(storedAnnotations);
    if (!records.success) {
      this.restored = true;
      return;
    }

    for (const record of records.data) {
      this.annotations.set(record.reportId, record);
    }
    this.restored = true;
  }

  private ensureRestored() {
    if (!this.restored) this.restore();
  }

  private snapshot() {
    return [...this.annotations.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private saveSnapshot(storage: KeyValueStorage) {
    storage.setItem(this.key, JSON.stringify(this.snapshot()));
  }

  private async persist() {
    const storage = getLocalStorage();
    if (!storage) return;
    this.saveSnapshot(storage);
  }

  async getAnnotation(reportId: string) {
    this.ensureRestored();
    return super.getAnnotation(reportId);
  }

  async listAnnotations() {
    this.ensureRestored();
    return super.listAnnotations();
  }

  async saveAnnotation(annotation: ReportAnnotation) {
    this.ensureRestored();
    const saved = await super.saveAnnotation(annotation);
    await this.persist();
    return saved;
  }

  async deleteAnnotation(reportId: string) {
    this.ensureRestored();
    const deleted = await super.deleteAnnotation(reportId);
    await this.persist();
    return deleted;
  }
}

export class SQLiteReportAnnotationRepository implements ReportAnnotationRepository {
  private db: SQLiteDatabaseLike | null = null;

  constructor(
    private readonly databaseName = 'movebeta-annotations.db',
    private readonly openDatabase: OpenSQLiteDatabase = openSQLiteDatabase,
  ) {}

  private async getDb() {
    if (this.db) return this.db;

    const db = await this.openDatabase(this.databaseName);
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS report_annotations (report_id TEXT PRIMARY KEY NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL);',
    );
    this.db = db;
    return db;
  }

  async saveAnnotation(annotation: ReportAnnotation) {
    const parsed = ReportAnnotationSchema.parse({
      ...annotation,
      tags: normalizeTags(annotation.tags),
    });
    const db = await this.getDb();

    await db.runAsync(
      'INSERT OR REPLACE INTO report_annotations (report_id, updated_at, payload) VALUES (?, ?, ?);',
      parsed.reportId,
      parsed.updatedAt,
      JSON.stringify(parsed),
    );

    return parsed;
  }

  async getAnnotation(reportId: string) {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM report_annotations WHERE report_id = ? LIMIT 1;',
      reportId,
    );
    if (!row) return null;

    try {
      const record = ReportAnnotationSchema.safeParse(JSON.parse(row.payload));
      return record.success ? record.data : null;
    } catch {
      return null;
    }
  }

  async listAnnotations() {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM report_annotations ORDER BY updated_at DESC;');

    return rows.flatMap((row) => {
      try {
        const record = ReportAnnotationSchema.safeParse(JSON.parse(row.payload));
        return record.success ? [record.data] : [];
      } catch {
        return [];
      }
    });
  }

  async deleteAnnotation(reportId: string) {
    const existing = await this.getAnnotation(reportId);
    if (!existing) return false;

    const db = await this.getDb();
    await db.runAsync('DELETE FROM report_annotations WHERE report_id = ?;', reportId);
    return true;
  }
}

function isReactNativeRuntime() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

export const reportAnnotationRepository: ReportAnnotationRepository = isReactNativeRuntime()
  ? new SQLiteReportAnnotationRepository()
  : new LocalReportAnnotationRepository();
