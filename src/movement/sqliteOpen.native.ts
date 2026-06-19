import * as SQLite from 'expo-sqlite';

import type { SQLiteDatabaseLike } from './reportRepository';

export async function openSQLiteDatabase(databaseName: string): Promise<SQLiteDatabaseLike> {
  return SQLite.openDatabaseAsync(databaseName);
}
