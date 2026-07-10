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

type QuarantinedReportEntry = {
  payload: unknown;
  quarantinedAt: string;
  reason: string;
};

const reportStoreSchemaVersion = 'movebeta.reports.v2';
const reportQuarantineSchemaVersion = 'movebeta.report-quarantine.v1';

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

function isBundledDemoReport(report: LocalAnalysisReport) {
  return (
    report.session.source === 'fixture' &&
    report.engine.provider === 'local-fixture' &&
    ['fixture-pose-v1', 'sample-pose-rules-v1'].includes(report.engine.model)
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function storedReportCandidates(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && value.schemaVersion === reportStoreSchemaVersion && Array.isArray(value.reports)) {
    return value.reports;
  }
  return null;
}

function reportIdFromUnknown(value: unknown) {
  return isRecord(value) && typeof value.id === 'string' ? value.id : null;
}

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
      this.quarantine(storage, [raw], 'Stored report collection is not valid JSON.');
      this.saveSnapshot(storage);
      this.restored = true;
      return;
    }

    const candidates = storedReportCandidates(storedReports);
    if (!candidates) {
      this.quarantine(storage, [storedReports], 'Stored report collection has an unsupported root schema.');
      this.saveSnapshot(storage);
      this.restored = true;
      return;
    }

    const quarantined: unknown[] = [];
    for (const candidate of candidates) {
      const report = LocalAnalysisReportSchema.safeParse(candidate);
      if (report.success && !isBundledDemoReport(report.data)) {
        this.reports.set(report.data.id, report.data);
      } else if (!report.success) {
        quarantined.push(candidate);
      }
    }
    if (quarantined.length > 0) {
      this.quarantine(storage, quarantined, 'Stored report does not match the current report schema.');
    }
    this.saveSnapshot(storage);
    this.restored = true;
  }

  private ensureRestored() {
    if (!this.restored) this.restore();
  }

  private snapshot() {
    return [...this.reports.values()].sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));
  }

  private saveSnapshot(storage: KeyValueStorage) {
    storage.setItem(
      this.key,
      JSON.stringify({
        reports: this.snapshot(),
        schemaVersion: reportStoreSchemaVersion,
      }),
    );
  }

  private quarantineKey() {
    return `${this.key}.quarantine`;
  }

  private readQuarantine(storage: KeyValueStorage): QuarantinedReportEntry[] {
    const raw = storage.getItem(this.quarantineKey());
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.schemaVersion !== reportQuarantineSchemaVersion || !Array.isArray(parsed.entries)) {
        return [];
      }
      return parsed.entries.filter(
        (entry): entry is QuarantinedReportEntry =>
          isRecord(entry) &&
          typeof entry.quarantinedAt === 'string' &&
          typeof entry.reason === 'string' &&
          'payload' in entry,
      );
    } catch {
      return [];
    }
  }

  private writeQuarantine(storage: KeyValueStorage, entries: QuarantinedReportEntry[]) {
    storage.setItem(
      this.quarantineKey(),
      JSON.stringify({
        entries,
        schemaVersion: reportQuarantineSchemaVersion,
      }),
    );
  }

  private quarantine(storage: KeyValueStorage, payloads: unknown[], reason: string) {
    const quarantinedAt = new Date().toISOString();
    this.writeQuarantine(storage, [
      ...this.readQuarantine(storage),
      ...payloads.map((payload) => ({ payload, quarantinedAt, reason })),
    ]);
  }

  private deleteQuarantinedReport(storage: KeyValueStorage, id: string) {
    const entries = this.readQuarantine(storage);
    const retained = entries.filter((entry) => reportIdFromUnknown(entry.payload) !== id);
    if (retained.length === entries.length) return false;
    this.writeQuarantine(storage, retained);
    return true;
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
    const storage = getLocalStorage();
    if (storage) {
      this.deleteQuarantinedReport(storage, saved.id);
      this.saveSnapshot(storage);
    }
    return saved;
  }

  async deleteReport(id: string) {
    this.ensureRestored();
    const deleted = await super.deleteReport(id);
    const storage = getLocalStorage();
    const quarantinedDeleted = storage ? this.deleteQuarantinedReport(storage, id) : false;
    await this.persist();
    return deleted || quarantinedDeleted;
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
      if (!report.success) return null;
      if (isBundledDemoReport(report.data)) {
        await db.runAsync('DELETE FROM reports WHERE id = ?;', report.data.id);
        return null;
      }
      return report.data;
    } catch {
      return null;
    }
  }

  async listReports() {
    const db = await this.getDb();
    const rows = await db.getAllAsync<{ payload: string }>('SELECT payload FROM reports ORDER BY created_at DESC;');

    const reports: LocalAnalysisReport[] = [];
    const demoIds: string[] = [];
    for (const row of rows) {
      try {
        const report = LocalAnalysisReportSchema.safeParse(JSON.parse(row.payload));
        if (!report.success) continue;
        if (isBundledDemoReport(report.data)) {
          demoIds.push(report.data.id);
        } else {
          reports.push(report.data);
        }
      } catch {
        continue;
      }
    }
    await Promise.all(demoIds.map((id) => db.runAsync('DELETE FROM reports WHERE id = ?;', id)));
    return reports;
  }

  async exportReport(id: string) {
    const report = await this.getReport(id);
    return report ? sanitizeExport(report) : null;
  }

  async deleteReport(id: string) {
    const db = await this.getDb();
    const result = await db.runAsync('DELETE FROM reports WHERE id = ?;', id);
    return (result.changes ?? 0) > 0;
  }
}

function isReactNativeRuntime() {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

export const reportRepository: ReportRepository = isReactNativeRuntime()
  ? new SQLiteReportRepository()
  : new LocalReportRepository();
