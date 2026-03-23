import type { Database } from "bun:sqlite";
import { writeFile } from "node:fs/promises";
import type { MemoryRecord } from "../../shared/src/index";
import { superseded } from "./confidence";

interface MemoryIndexRecordRow {
  id: string;
  canonical_path: string;
  payload_json: string;
}

export interface SupersedeMemoryOptions {
  database: Database;
  memoryId: string;
  supersededById: string;
  updatedAt?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

async function writeCanonicalMemory(path: string, record: MemoryRecord): Promise<void> {
  await writeFile(path, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function getIndexedMemoryRow(database: Database, memoryId: string): MemoryIndexRecordRow {
  const row = database
    .query(
      `
        SELECT id, canonical_path, payload_json
        FROM memory_index
        WHERE id = ?1
      `
    )
    .get(memoryId) as MemoryIndexRecordRow | null;

  if (!row) {
    throw new Error(`Memory not found in index: ${memoryId}`);
  }

  return row;
}

function saveIndexedMemory(database: Database, row: MemoryIndexRecordRow, record: MemoryRecord): void {
  database
    .query(
      `
        UPDATE memory_index
        SET
          type = ?2,
          status = ?3,
          confidence = ?4,
          title = ?5,
          summary = ?6,
          provenance_json = ?7,
          source_refs_json = ?8,
          supersedes_json = ?9,
          superseded_by = ?10,
          tags_json = ?11,
          related_files_json = ?12,
          related_tasks_json = ?13,
          payload_json = ?14,
          created_at = ?15,
          updated_at = ?16
        WHERE id = ?1
      `
    )
    .run(
      record.id,
      record.type,
      record.status,
      record.confidence,
      record.title,
      record.summary,
      JSON.stringify(record.provenance),
      JSON.stringify(record.sourceRefs),
      JSON.stringify(record.supersedes),
      record.supersededBy ?? null,
      JSON.stringify(record.tags),
      JSON.stringify(record.relatedFiles),
      JSON.stringify(record.relatedTasks),
      JSON.stringify(record),
      record.createdAt,
      record.updatedAt
    );
}

export async function supersedeMemory({
  database,
  memoryId,
  supersededById,
  updatedAt
}: SupersedeMemoryOptions): Promise<{ superseded: MemoryRecord; successor: MemoryRecord }> {
  if (memoryId === supersededById) {
    throw new Error("A memory cannot supersede itself");
  }

  const nextUpdatedAt = updatedAt ?? nowIso();
  const supersededRow = getIndexedMemoryRow(database, memoryId);
  const successorRow = getIndexedMemoryRow(database, supersededById);

  const supersededRecord = superseded(parseJson<MemoryRecord>(supersededRow.payload_json), {
    updatedAt: nextUpdatedAt,
    supersededBy: supersededById
  });
  const successorRecord = parseJson<MemoryRecord>(successorRow.payload_json);
  const updatedSuccessor: MemoryRecord = {
    ...successorRecord,
    supersedes: uniqueStrings([...successorRecord.supersedes, memoryId]),
    updatedAt: nextUpdatedAt
  };

  await writeCanonicalMemory(supersededRow.canonical_path, supersededRecord);
  await writeCanonicalMemory(successorRow.canonical_path, updatedSuccessor);

  database.exec("BEGIN");

  try {
    saveIndexedMemory(database, supersededRow, supersededRecord);
    saveIndexedMemory(database, successorRow, updatedSuccessor);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return {
    superseded: supersededRecord,
    successor: updatedSuccessor
  };
}
