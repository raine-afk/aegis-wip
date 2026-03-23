import { Database } from "bun:sqlite";
import { readFile } from "node:fs/promises";

const migrations = [
  {
    id: "0001_init",
    fileUrl: new URL("./migrations/0001_init.sql", import.meta.url)
  }
] as const;

export async function initializeSqlite(databasePath: string): Promise<Database> {
  const database = new Database(databasePath, { create: true, strict: true });

  try {
    database.exec("PRAGMA foreign_keys = ON;");
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `);

    for (const migration of migrations) {
      const existingMigration = database
        .query("SELECT id FROM schema_migrations WHERE id = ?1")
        .get(migration.id);

      if (existingMigration) {
        continue;
      }

      const sql = await readFile(migration.fileUrl, "utf8");

      database.exec("BEGIN");

      try {
        database.exec(sql);
        database
          .query("INSERT INTO schema_migrations (id, applied_at) VALUES (?1, ?2)")
          .run(migration.id, new Date().toISOString());
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    }

    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}
