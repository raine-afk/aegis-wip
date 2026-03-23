import type { Database } from "bun:sqlite";
import type {
  MemoryConfidence,
  MemoryRecord,
  MemoryRetrievalQuery,
  MemoryRetrievalResponse
} from "../../shared/src/index";
import { rankMemory } from "./ranking";

interface MemoryIndexRow {
  payload_json: string;
  confidence: MemoryConfidence;
  updated_at: string;
  created_at: string;
}

interface TaskLinkRow {
  linked_memory_ids_json: string;
}

const confidenceOrder: Record<MemoryConfidence, number> = {
  tentative: 1,
  probable: 2,
  confirmed: 3,
  superseded: 0
};

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function matchesConfidence(memory: MemoryRecord, minConfidence?: Exclude<MemoryConfidence, "superseded">): boolean {
  if (!minConfidence) {
    return true;
  }

  return confidenceOrder[memory.confidence] >= confidenceOrder[minConfidence];
}

function matchesRelatedFiles(memory: MemoryRecord, relatedFiles?: string[]): boolean {
  if (!relatedFiles || relatedFiles.length === 0) {
    return true;
  }

  const relatedFileSet = new Set(relatedFiles);
  return memory.relatedFiles.some((file) => relatedFileSet.has(file));
}

function matchesTags(memory: MemoryRecord, tags?: string[]): boolean {
  if (!tags || tags.length === 0) {
    return true;
  }

  const tagSet = new Set(tags.map((tag) => tag.toLowerCase()));
  return memory.tags.some((tag) => tagSet.has(tag.toLowerCase()));
}

function getTaskLinkedMemoryIds(database: Database, taskId: string | undefined): ReadonlySet<string> {
  if (!taskId) {
    return new Set<string>();
  }

  const row = database
    .query(
      `
        SELECT linked_memory_ids_json
        FROM tasks
        WHERE id = ?1
      `
    )
    .get(taskId) as TaskLinkRow | null;

  return new Set(row ? parseJson<string[]>(row.linked_memory_ids_json) : []);
}

export function retrieveMemories(
  database: Database,
  query: MemoryRetrievalQuery
): MemoryRetrievalResponse {
  const rows = database
    .query(
      `
        SELECT payload_json, confidence, updated_at, created_at
        FROM memory_index
        WHERE (?1 = 1 OR status = 'active')
          AND (?2 IS NULL OR updated_at >= ?2)
        ORDER BY updated_at DESC, created_at DESC
        LIMIT ?3
      `
    )
    .all(
      query.includeSuperseded ? 1 : 0,
      query.updatedAfter ?? null,
      Math.max(query.limit * 10, query.limit, 25)
    ) as MemoryIndexRow[];

  const taskLinkedMemoryIds = getTaskLinkedMemoryIds(database, query.taskId);

  const results = rows
    .map((row) => parseJson<MemoryRecord>(row.payload_json))
    .filter((memory) => matchesConfidence(memory, query.minConfidence))
    .filter((memory) => matchesRelatedFiles(memory, query.relatedFiles))
    .filter((memory) => matchesTags(memory, query.tags))
    .map((memory) => {
      const ranking = rankMemory(memory, query, { taskLinkedMemoryIds });

      if (!ranking) {
        return null;
      }

      return {
        memory,
        score: ranking.score,
        reasons: ranking.reasons
      };
    })
    .filter((result): result is NonNullable<typeof result> => result !== null)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.memory.updatedAt.localeCompare(left.memory.updatedAt) ||
        right.memory.createdAt.localeCompare(left.memory.createdAt)
    )
    .slice(0, query.limit);

  return {
    query,
    results
  };
}
