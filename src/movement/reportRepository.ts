import { LocalAnalysisReportSchema, type LocalAnalysisReport } from './contracts';
import { openSQLiteDatabase } from './sqliteOpen';

export type ReportRepository = {
  deleteReport(id: string): Promise<boolean>;
  exportReport(id: string): Promise<LocalAnalysisReport | null>;
  getReport(id: string): Promise<LocalAnalysisReport | null>;
  listReports(): Promise<LocalAnalysisReport[]>;
  saveReport(report: LocalAnalysisReport): Promise<LocalAnalysisReport>;
};

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type SQLiteDatabaseLike = {
  execAsync(sql: string): Promise<void>;
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes?: number }>;
};

export type OpenSQLiteDatabase = (databaseName: string) => Promise<SQLiteDatabaseLike>;

function sanitizeExport(report: LocalAnalysisReport) {
  return LocalAnalysisReportSchema.parse({
    ...report,
    privacy: {
      ...report.privacy,
      videoLeavesDevice: false,
    },
  });
}

export class InMemoryReportRepository implements ReportRepository {
  protected readonly reports = new Map<string, LocalAnalysisReport>();

  async saveReport(report: LocalAnalysisReport) {
    const parsed = LocalAnalysisReportSchema.parse(report);
    this.reports.set(parsed.id, parsed);
    return parsed;
  }

  async getReport(id: string) {
    return this.reports.get(id) ?? null;
  }

  async listReports() {
    return [...this.reports.values()].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
  }

  async exportReport(id: string) {
    const report = await this.getReport(id);
    if (!report) return null;

    return sanitizeExport(report);
  }

  async deleteReport(id: string) {
    return this.reports.delete(id);
  }
}

const storageKey = 'movebeta.reports.v1';

function getLocalStorage(): KeyValueStorage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

export class LocalReportRepository extends InMemoryReportRepository {
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

    let storedReports: unknown;
    try {
      storedReports = JSON.parse(raw);
    } catch {
      this.restored = true;
      return;
    }

    const reports = LocalAnalysisReportSchema.array().safeParse(storedReports);
    if (!reports.success) {
      this.restored = true;
      return;
    }

    for (const report of reports.data) {
      this.reports.set(report.id, report);
    }
    this.restored = true;
  }

  private ensureRestored() {
    if (!this.restored) this.restore();
  }

  private snapshot() {
    return [...this.reports.values()].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
  }

  private saveSnapshot(storage: KeyValueStorage) {
    storage.setItem(this.key, JSON.stringify(this.snapshot()));
  }

  private async persist() {
    const storage = getLocalStorage();
    if (!storage) return;
    this.saveSnapshot(storage);
  }

  async getReport(id: string) {
    this.ensureRestored();
    return super.getReport(id);
  }

  async listReports() {
    this.ensureRestored();
    return super.listReports();
  }

  async saveReport(report: LocalAnalysisReport) {
    this.ensureRestored();
    const saved = await super.saveReport(report);
    await this.persist();
    return saved;
  }

  async deleteReport(id: string) {
    this.ensureRestored();
    const deleted = await super.deleteReport(id);
    await this.persist();
    return deleted;
  }
}

export class SQLiteReportRepository implements ReportRepository {
  private db: SQLiteDatabaseLike | null = null;

  constructor(
    private readonly databaseName = 'movebeta-reports.db',
    private readonly openDatabase: OpenSQLiteDatabase = openSQLiteDatabase,
  ) {}

  private async getDb() {
    if (this.db) return this.db;

    const db = await this.openDatabase(this.databaseName);
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL);',
    );
    this.db = db;
    return db;
  }

  async saveReport(report: LocalAnalysisReport) {
    const parsed = LocalAnalysisReportSchema.parse(report);
    const db = await this.getDb();

    await db.runAsync(
      'INSERT OR REPLACE INTO reports (id, created_at, payload) VALUES (?, ?, ?);',
      parsed.id,
      parsed.session.createdAt,
      JSON.stringify(parsed),
    );

    return parsed;
  }

  async getReport(id: string) {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM reports WHERE id = ? LIMIT 1;', id);
    if (!row) return null;

    try {
      const report = LocalAnalysisReportSchema.safeParse(JSON.parse(row.payload));
      return report.success ? report.data : null;
    } catch {
      return null;
    }
  }

  async listReports() {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM reports ORDER BY created_at DESC;');

    return rows.flatMap((row) => {
      try {
        const report = LocalAnalysisReportSchema.safeParse(JSON.parse(row.payload));
        return report.success ? [report.data] : [];
      } catch {
        return [];
      }
    });
  }

  async exportReport(id: string) {
    const report = await this.getReport(id);
    return report ? sanitizeExport(report) : null;
  }

  async deleteReport(id: string) {
    const existing = await this.getReport(id);
    if (!existing) return false;

    const db = await this.getDb();
    await db.runAsync('DELETE FROM reports WHERE id = ?;', id);
    return true;
  }
}

function isReactNativeRuntime() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

export const reportRepository: ReportRepository = isReactNativeRuntime()
  ? new SQLiteReportRepository()
  : new LocalReportRepository();
