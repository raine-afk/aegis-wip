import { afterEach, describe, expect, test } from "bun:test";
import type { Database } from "bun:sqlite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TaskRecord } from "../../shared/src/index";
import { bootstrapStorage, initializeSqlite } from "../../storage/src/index";
import { createMemoryWritePipeline, retrieveMemories, supersedeMemory } from "./index";

const tempRepos: string[] = [];

afterEach(async () => {
  await Promise.all(tempRepos.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function insertTask(database: Database, task: TaskRecord): void {
  database
    .query(
      `
        INSERT INTO tasks (
          id,
          title,
          goal,
          mode,
          status,
          linked_issue_or_pr_json,
          plan_snapshot_json,
          completion_summary_json,
          resume_hints_json,
          linked_memory_ids_json,
          related_files_json,
          created_at,
          updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
      `
    )
    .run(
      task.id,
      task.title,
      task.goal,
      task.mode,
      task.status,
      null,
      null,
      null,
      null,
      JSON.stringify(task.linkedMemoryIds),
      JSON.stringify(task.relatedFiles),
      task.createdAt,
      task.updatedAt
    );
}

describe("memory retrieval", () => {
  test("retrieval excludes superseded memories by default, returns provenance, and ranks task-linked memory above semantic-only matches", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "aegis-memory-retrieval-"));
    tempRepos.push(repoRoot);

    const paths = await bootstrapStorage({ repoRoot });
    const pipeline = createMemoryWritePipeline({ repoRoot });

    const linkedDecision = await pipeline.writeDecision({
      id: "mem-decision-linked",
      title: "Use SQLite retrieval state for the active task",
      summary: "Task-linked retrieval should prioritize SQLite-backed memory state.",
      confidence: "confirmed",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T20:00:00.000Z",
        reason: "Captured while wiring retrieval ranking"
      },
      sourceRefs: [
        {
          kind: "task",
          value: "task-7",
          label: "retrieval implementation"
        }
      ],
      tags: ["retrieval", "sqlite"],
      relatedFiles: ["packages/storage/src/sqlite.ts"],
      relatedTasks: ["task-7"],
      decision: "Prefer the memory index for retrieval lookups.",
      rationale: "Explicit task links should beat fuzzy semantic similarity."
    });

    const semanticFact = await pipeline.writeFact({
      id: "mem-fact-semantic",
      title: "SQLite indexes retrieval state",
      summary: "Semantic retrieval can match sqlite memory state even without a task link.",
      confidence: "probable",
      provenance: {
        source: "repo",
        recordedAt: "2026-03-23T20:01:00.000Z",
        reason: "Observed in the storage package"
      },
      sourceRefs: [
        {
          kind: "file",
          value: "packages/storage/src/sqlite.ts",
          label: "sqlite bootstrap"
        }
      ],
      tags: ["retrieval", "storage"],
      relatedFiles: ["packages/storage/src/sqlite.ts"]
    });

    const staleFact = await pipeline.writeFact({
      id: "mem-fact-stale",
      title: "Old retrieval state",
      summary: "This stale sqlite retrieval memory should disappear from normal results.",
      confidence: "confirmed",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T20:02:00.000Z",
        reason: "Older implementation note"
      },
      sourceRefs: [],
      tags: ["retrieval"],
      relatedFiles: ["packages/storage/src/sqlite.ts"]
    });

    const successorFact = await pipeline.writeFact({
      id: "mem-fact-successor",
      title: "Replacement implementation note",
      summary: "This replacement keeps the canonical record current without changing ranking expectations.",
      confidence: "confirmed",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T20:03:00.000Z",
        reason: "Replacement memory"
      },
      sourceRefs: [],
      tags: ["retrieval"],
      relatedFiles: ["packages/storage/src/sqlite.ts"]
    });

    const tentativeFact = await pipeline.writeFact({
      id: "mem-fact-tentative",
      title: "Tentative retrieval guess",
      summary: "A low-confidence sqlite retrieval guess should be filtered out.",
      confidence: "tentative",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-19T20:04:00.000Z",
        reason: "Unverified hunch"
      },
      sourceRefs: [],
      tags: ["retrieval"],
      relatedFiles: ["packages/storage/src/sqlite.ts"]
    });

    const database = await initializeSqlite(paths.database);

    insertTask(database, {
      id: "task-7",
      title: "Add retrieval and supersession rules",
      goal: "Retrieve useful memory with inspectable ranking.",
      mode: "build",
      status: "in-progress",
      linkedIssueOrPr: undefined,
      linkedMemoryIds: [linkedDecision.id],
      relatedFiles: ["packages/storage/src/sqlite.ts"],
      planSnapshot: undefined,
      completionSummary: undefined,
      resumeHints: undefined,
      createdAt: "2026-03-23T19:50:00.000Z",
      updatedAt: "2026-03-23T20:05:00.000Z"
    });

    await supersedeMemory({
      database,
      memoryId: staleFact.id,
      supersededById: successorFact.id,
      updatedAt: "2026-03-23T20:06:00.000Z"
    });

    const response = retrieveMemories(database, {
      query: "sqlite retrieval memory state",
      taskId: "task-7",
      relatedFiles: ["packages/storage/src/sqlite.ts"],
      limit: 10,
      minConfidence: "probable",
      updatedAfter: "2026-03-20T00:00:00.000Z"
    });

    expect(response.query.taskId).toBe("task-7");
    expect(response.results.map((result) => result.memory.id)).toEqual([
      linkedDecision.id,
      semanticFact.id,
      successorFact.id
    ]);
    expect(response.results[0]?.memory.provenance).toEqual(linkedDecision.provenance);
    expect(response.results[0]?.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "task-link" }),
        expect.objectContaining({ kind: "semantic-match" })
      ])
    );
    expect(response.results[1]?.reasons).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "semantic-match" })])
    );
    expect(response.results.map((result) => result.memory.id)).not.toContain(staleFact.id);
    expect(response.results.map((result) => result.memory.id)).not.toContain(tentativeFact.id);

    const staleCanonical = JSON.parse(
      await readFile(join(repoRoot, ".aegis", "memory", "facts", `${staleFact.id}.json`), "utf8")
    );
    const successorCanonical = JSON.parse(
      await readFile(join(repoRoot, ".aegis", "memory", "facts", `${successorFact.id}.json`), "utf8")
    );

    expect(staleCanonical.status).toBe("superseded");
    expect(staleCanonical.supersededBy).toBe(successorFact.id);
    expect(successorCanonical.supersedes).toContain(staleFact.id);

    database.close();
  });

  test("retrieval can include superseded memories when requested", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "aegis-memory-retrieval-"));
    tempRepos.push(repoRoot);

    const paths = await bootstrapStorage({ repoRoot });
    const pipeline = createMemoryWritePipeline({ repoRoot });

    const original = await pipeline.writeFact({
      id: "mem-fact-original",
      title: "Original retrieval note",
      summary: "A superseded retrieval note should remain queryable when explicitly requested.",
      confidence: "confirmed",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T20:10:00.000Z",
        reason: "Initial note"
      }
    });

    const replacement = await pipeline.writeFact({
      id: "mem-fact-replacement",
      title: "Replacement retrieval note",
      summary: "This active note replaced the original retrieval note.",
      confidence: "confirmed",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T20:11:00.000Z",
        reason: "Replacement note"
      }
    });

    const database = await initializeSqlite(paths.database);

    await supersedeMemory({
      database,
      memoryId: original.id,
      supersededById: replacement.id,
      updatedAt: "2026-03-23T20:12:00.000Z"
    });

    const response = retrieveMemories(database, {
      query: "original retrieval note",
      limit: 10,
      includeSuperseded: true
    });

    expect(response.results.map((result) => result.memory.id)).toEqual(
      expect.arrayContaining([original.id, replacement.id])
    );
    expect(response.results.find((result) => result.memory.id === original.id)?.memory.status).toBe(
      "superseded"
    );

    database.close();
  });
});
