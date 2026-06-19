import { z } from 'zod';

import { openSQLiteDatabase } from './sqliteOpen';
import type { OpenSQLiteDatabase, SQLiteDatabaseLike } from './reportRepository';

export const drillPracticeStatuses = ['completed', 'skipped'] as const;

export const DrillPracticeRecordSchema = z.object({
  cueId: z.string(),
  drillId: z.string(),
  note: z.string().max(240).default(''),
  reportId: z.string(),
  status: z.enum(drillPracticeStatuses),
  updatedAt: z.string(),
});

export type DrillPracticeRecord = z.infer<typeof DrillPracticeRecordSchema>;

export type DrillPracticeRepository = {
  deleteRecord(drillId: string): Promise<boolean>;
  deleteRecordsForReport(reportId: string): Promise<number>;
  getRecord(drillId: string): Promise<DrillPracticeRecord | null>;
  listRecords(): Promise<DrillPracticeRecord[]>;
  listRecordsForReport(reportId: string): Promise<DrillPracticeRecord[]>;
  saveRecord(record: DrillPracticeRecord): Promise<DrillPracticeRecord>;
};

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const storageKey = 'movebeta.drill-practice.v1';

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

function normalizeRecord(record: DrillPracticeRecord) {
  return DrillPracticeRecordSchema.parse({
    ...record,
    cueId: record.cueId.trim(),
    drillId: record.drillId.trim(),
    note: record.note.trim(),
    reportId: record.reportId.trim(),
  });
}

export function createDrillPracticeRecord(
  input: Pick<DrillPracticeRecord, 'cueId' | 'drillId' | 'reportId' | 'status'> &
    Partial<Pick<DrillPracticeRecord, 'note' | 'updatedAt'>>,
): DrillPracticeRecord {
  return DrillPracticeRecordSchema.parse({
    cueId: input.cueId,
    drillId: input.drillId,
    note: input.note ?? '',
    reportId: input.reportId,
    status: input.status,
    updatedAt: input.updatedAt ?? now(),
  });
}

export class InMemoryDrillPracticeRepository implements DrillPracticeRepository {
  protected readonly records = new Map<string, DrillPracticeRecord>();

  async saveRecord(record: DrillPracticeRecord) {
    const parsed = normalizeRecord(record);
    this.records.set(parsed.drillId, parsed);
    return parsed;
  }

  async getRecord(drillId: string) {
    return this.records.get(drillId) ?? null;
  }

  async listRecords() {
    return [...this.records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listRecordsForReport(reportId: string) {
    const normalizedReportId = reportId.trim();
    return (await this.listRecords()).filter((record) => record.reportId === normalizedReportId);
  }

  async deleteRecord(drillId: string) {
    return this.records.delete(drillId);
  }

  async deleteRecordsForReport(reportId: string) {
    const records = await this.listRecordsForReport(reportId);
    for (const record of records) {
      this.records.delete(record.drillId);
    }
    return records.length;
  }
}

export class LocalDrillPracticeRepository extends InMemoryDrillPracticeRepository {
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

    let storedRecords: unknown;
    try {
      storedRecords = JSON.parse(raw);
    } catch {
      this.restored = true;
      return;
    }

    const records = DrillPracticeRecordSchema.array().safeParse(storedRecords);
    if (!records.success) {
      this.restored = true;
      return;
    }

    for (const record of records.data) {
      this.records.set(record.drillId, record);
    }
    this.restored = true;
  }

  private ensureRestored() {
    if (!this.restored) this.restore();
  }

  private snapshot() {
    return [...this.records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private saveSnapshot(storage: KeyValueStorage) {
    storage.setItem(this.key, JSON.stringify(this.snapshot()));
  }

  private async persist() {
    const storage = getLocalStorage();
    if (!storage) return;
    this.saveSnapshot(storage);
  }

  async saveRecord(record: DrillPracticeRecord) {
    this.ensureRestored();
    const saved = await super.saveRecord(record);
    await this.persist();
    return saved;
  }

  async getRecord(drillId: string) {
    this.ensureRestored();
    return super.getRecord(drillId);
  }

  async listRecords() {
    this.ensureRestored();
    return super.listRecords();
  }

  async listRecordsForReport(reportId: string) {
    this.ensureRestored();
    return super.listRecordsForReport(reportId);
  }

  async deleteRecord(drillId: string) {
    this.ensureRestored();
    const deleted = await super.deleteRecord(drillId);
    await this.persist();
    return deleted;
  }

  async deleteRecordsForReport(reportId: string) {
    this.ensureRestored();
    const deleted = await super.deleteRecordsForReport(reportId);
    await this.persist();
    return deleted;
  }
}

export class SQLiteDrillPracticeRepository implements DrillPracticeRepository {
  private db: SQLiteDatabaseLike | null = null;

  constructor(
    private readonly databaseName = 'movebeta-drill-practice.db',
    private readonly openDatabase: OpenSQLiteDatabase = openSQLiteDatabase,
  ) {}

  private async getDb() {
    if (this.db) return this.db;

    const db = await this.openDatabase(this.databaseName);
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS drill_practice_records (drill_id TEXT PRIMARY KEY NOT NULL, report_id TEXT NOT NULL, updated_at TEXT NOT NULL, payload TEXT NOT NULL);',
    );
    this.db = db;
    return db;
  }

  async saveRecord(record: DrillPracticeRecord) {
    const parsed = normalizeRecord(record);
    const db = await this.getDb();

    await db.runAsync(
      'INSERT OR REPLACE INTO drill_practice_records (drill_id, report_id, updated_at, payload) VALUES (?, ?, ?, ?);',
      parsed.drillId,
      parsed.reportId,
      parsed.updatedAt,
      JSON.stringify(parsed),
    );

    return parsed;
  }

  async getRecord(drillId: string) {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM drill_practice_records WHERE drill_id = ? LIMIT 1;',
      drillId,
    );
    if (!row) return null;

    try {
      const record = DrillPracticeRecordSchema.safeParse(JSON.parse(row.payload));
      return record.success ? record.data : null;
    } catch {
      return null;
    }
  }

  async listRecords() {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ payload: string }>(
      'SELECT payload FROM drill_practice_records ORDER BY updated_at DESC;',
    );

    return rows.flatMap((row) => {
      try {
        const record = DrillPracticeRecordSchema.safeParse(JSON.parse(row.payload));
        return record.success ? [record.data] : [];
      } catch {
        return [];
      }
    });
  }

  async listRecordsForReport(reportId: string) {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ payload: string }>(
      'SELECT payload FROM drill_practice_records WHERE report_id = ? ORDER BY updated_at DESC;',
      reportId,
    );

    return rows.flatMap((row) => {
      try {
        const record = DrillPracticeRecordSchema.safeParse(JSON.parse(row.payload));
        return record.success ? [record.data] : [];
      } catch {
        return [];
      }
    });
  }

  async deleteRecord(drillId: string) {
    const existing = await this.getRecord(drillId);
    if (!existing) return false;

    const db = await this.getDb();
    await db.runAsync('DELETE FROM drill_practice_records WHERE drill_id = ?;', drillId);
    return true;
  }

  async deleteRecordsForReport(reportId: string) {
    const records = await this.listRecordsForReport(reportId);
    if (records.length === 0) return 0;

    const db = await this.getDb();
    await db.runAsync('DELETE FROM drill_practice_records WHERE report_id = ?;', reportId);
    return records.length;
  }
}

function isReactNativeRuntime() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

export const drillPracticeRepository: DrillPracticeRepository = isReactNativeRuntime()
  ? new SQLiteDrillPracticeRepository()
  : new LocalDrillPracticeRepository();
