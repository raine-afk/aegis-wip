import type { Database } from "bun:sqlite";
import type { MemoryRecord } from "../../shared/src/index";

export interface MemoryIndexRecordRow {
  id: string;
  canonical_path: string;
  payload_json: string;
}

export function getIndexedMemoryRow(database: Database, memoryId: string): MemoryIndexRecordRow {
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

export function upsertIndexedMemory(
  database: Database,
  record: MemoryRecord,
  canonicalPath: string
): void {
  database
    .query(
      `
        INSERT INTO memory_index (
          id,
          type,
          status,
          confidence,
          title,
          summary,
          canonical_path,
          provenance_json,
          source_refs_json,
          supersedes_json,
          superseded_by,
          tags_json,
          related_files_json,
          related_tasks_json,
          payload_json,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          status = excluded.status,
          confidence = excluded.confidence,
          title = excluded.title,
          summary = excluded.summary,
          canonical_path = excluded.canonical_path,
          provenance_json = excluded.provenance_json,
          source_refs_json = excluded.source_refs_json,
          supersedes_json = excluded.supersedes_json,
          superseded_by = excluded.superseded_by,
          tags_json = excluded.tags_json,
          related_files_json = excluded.related_files_json,
          related_tasks_json = excluded.related_tasks_json,
          payload_json = excluded.payload_json,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
      `
    )
    .run(
      record.id,
      record.type,
      record.status,
      record.confidence,
      record.title,
      record.summary,
      canonicalPath,
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
