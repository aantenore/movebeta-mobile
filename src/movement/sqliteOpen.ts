import type { SQLiteDatabaseLike } from './reportRepository';

export async function openSQLiteDatabase(databaseName: string): Promise<SQLiteDatabaseLike> {
  throw new Error(`SQLite is not available for this runtime: ${databaseName}`);
}
