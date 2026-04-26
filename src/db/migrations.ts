import { getDb } from './client';
import { schemaStatements } from './schema';

const MIGRATION_VERSION = 1;

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion >= MIGRATION_VERSION) {
    return;
  }

  for (const statement of schemaStatements) {
    await db.execAsync(statement);
  }

  await db.execAsync(`PRAGMA user_version = ${MIGRATION_VERSION};`);
}
