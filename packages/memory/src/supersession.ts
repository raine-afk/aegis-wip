import type { Database } from "bun:sqlite";
import { writeFile } from "node:fs/promises";
import type { MemoryRecord } from "../../shared/src/index";
import { superseded } from "./confidence";
import { getIndexedMemoryRow, type MemoryIndexRecordRow, upsertIndexedMemory } from "./memory-index";

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
    upsertIndexedMemory(database, supersededRecord, supersededRow.canonical_path);
    upsertIndexedMemory(database, updatedSuccessor, successorRow.canonical_path);
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
