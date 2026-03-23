import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  confirmed,
  createMemoryWritePipeline,
  probable,
  superseded,
  tentative
} from "./index";

const tempRepos: string[] = [];

afterEach(async () => {
  await Promise.all(tempRepos.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("memory write pipeline", () => {
  test("memory write persists canonical fact, decision, and task summary JSON files with required metadata", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "aegis-memory-write-"));
    tempRepos.push(repoRoot);

    const pipeline = createMemoryWritePipeline({ repoRoot });

    const fact = await pipeline.writeFact({
      id: "mem-fact-1",
      title: "Repo uses Bun workspaces",
      summary: "The root package manifest defines a Bun workspace monorepo.",
      confidence: "confirmed",
      provenance: {
        source: "repo",
        recordedAt: "2026-03-23T19:40:00.000Z",
        reason: "Observed in the root package manifest"
      },
      sourceRefs: [
        {
          kind: "file",
          value: "package.json",
          label: "root manifest"
        }
      ],
      tags: ["workspace", "bun"],
      relatedFiles: ["package.json"],
      relatedTasks: ["task-6"],
      createdAt: "2026-03-23T19:40:00.000Z"
    });

    const decision = await pipeline.writeDecision({
      id: "mem-decision-1",
      title: "Use JSON files as canonical memory artifacts",
      summary: "Canonical memory stays inspectable on disk under .aegis/memory.",
      confidence: "confirmed",
      provenance: {
        source: "user",
        recordedAt: "2026-03-23T19:41:00.000Z",
        reason: "Locked in the MVP design"
      },
      sourceRefs: [
        {
          kind: "task",
          value: "task-6",
          label: "memory writes"
        }
      ],
      tags: ["memory", "design"],
      relatedFiles: ["docs/plans/2026-03-23-aegis-reliability-mvp-design.md"],
      relatedTasks: ["task-6"],
      decision: "Write canonical memory records as JSON files first, then index them separately.",
      rationale: "Human-inspectable artifacts beat opaque storage."
    });

    const taskSummary = await pipeline.writeTaskSummary({
      id: "mem-summary-1",
      title: "Canonical memory writes implemented",
      summary: "The memory package now writes facts, decisions, and task summaries into typed folders.",
      confidence: "probable",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T19:42:00.000Z",
        reason: "Recorded after finishing the write pipeline"
      },
      sourceRefs: [
        {
          kind: "task",
          value: "task-6",
          label: "memory writes"
        }
      ],
      tags: ["memory", "implementation"],
      relatedFiles: ["packages/memory/src/write-pipeline.ts"],
      relatedTasks: ["task-6"],
      taskId: "task-6",
      outcome: "completed"
    });

    const factPath = join(repoRoot, ".aegis", "memory", "facts", `${fact.id}.json`);
    const decisionPath = join(repoRoot, ".aegis", "memory", "decisions", `${decision.id}.json`);
    const taskSummaryPath = join(repoRoot, ".aegis", "memory", "task-summaries", `${taskSummary.id}.json`);

    expect((await stat(join(repoRoot, ".aegis", "memory", "facts"))).isDirectory()).toBe(true);
    expect((await stat(join(repoRoot, ".aegis", "memory", "decisions"))).isDirectory()).toBe(true);
    expect((await stat(join(repoRoot, ".aegis", "memory", "task-summaries"))).isDirectory()).toBe(true);

    expect(JSON.parse(await readFile(factPath, "utf8"))).toEqual({
      id: "mem-fact-1",
      type: "fact",
      title: "Repo uses Bun workspaces",
      summary: "The root package manifest defines a Bun workspace monorepo.",
      status: "active",
      confidence: "confirmed",
      provenance: {
        source: "repo",
        recordedAt: "2026-03-23T19:40:00.000Z",
        reason: "Observed in the root package manifest"
      },
      sourceRefs: [
        {
          kind: "file",
          value: "package.json",
          label: "root manifest"
        }
      ],
      createdAt: "2026-03-23T19:40:00.000Z",
      updatedAt: "2026-03-23T19:40:00.000Z",
      supersedes: [],
      tags: ["workspace", "bun"],
      relatedFiles: ["package.json"],
      relatedTasks: ["task-6"]
    });

    expect(JSON.parse(await readFile(decisionPath, "utf8"))).toEqual({
      id: "mem-decision-1",
      type: "decision",
      title: "Use JSON files as canonical memory artifacts",
      summary: "Canonical memory stays inspectable on disk under .aegis/memory.",
      status: "active",
      confidence: "confirmed",
      provenance: {
        source: "user",
        recordedAt: "2026-03-23T19:41:00.000Z",
        reason: "Locked in the MVP design"
      },
      sourceRefs: [
        {
          kind: "task",
          value: "task-6",
          label: "memory writes"
        }
      ],
      createdAt: "2026-03-23T19:41:00.000Z",
      updatedAt: "2026-03-23T19:41:00.000Z",
      supersedes: [],
      tags: ["memory", "design"],
      relatedFiles: ["docs/plans/2026-03-23-aegis-reliability-mvp-design.md"],
      relatedTasks: ["task-6"],
      decision: "Write canonical memory records as JSON files first, then index them separately.",
      rationale: "Human-inspectable artifacts beat opaque storage."
    });

    expect(JSON.parse(await readFile(taskSummaryPath, "utf8"))).toEqual({
      id: "mem-summary-1",
      type: "task-summary",
      title: "Canonical memory writes implemented",
      summary: "The memory package now writes facts, decisions, and task summaries into typed folders.",
      status: "active",
      confidence: "probable",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T19:42:00.000Z",
        reason: "Recorded after finishing the write pipeline"
      },
      sourceRefs: [
        {
          kind: "task",
          value: "task-6",
          label: "memory writes"
        }
      ],
      createdAt: "2026-03-23T19:42:00.000Z",
      updatedAt: "2026-03-23T19:42:00.000Z",
      supersedes: [],
      tags: ["memory", "implementation"],
      relatedFiles: ["packages/memory/src/write-pipeline.ts"],
      relatedTasks: ["task-6"],
      taskId: "task-6",
      outcome: "completed"
    });
  });

  test("memory write rejects ids that escape canonical type directories", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "aegis-memory-write-"));
    tempRepos.push(repoRoot);

    const pipeline = createMemoryWritePipeline({ repoRoot });

    await expect(
      pipeline.writeFact({
        id: "../escape",
        title: "Bad id",
        summary: "This should never write outside the canonical facts directory.",
        provenance: {
          source: "agent",
          recordedAt: "2026-03-23T19:49:00.000Z",
          reason: "Testing path validation"
        }
      })
    ).rejects.toThrow("Memory ids must be filesystem-safe");
  });

  test("memory write confidence helpers transition records without losing canonical fields", () => {
    const baseRecord = {
      id: "mem-fact-transition",
      type: "fact" as const,
      title: "Transitioned fact",
      summary: "Confidence helpers should preserve stable object shape.",
      status: "active" as const,
      confidence: "tentative" as const,
      provenance: {
        source: "agent" as const,
        recordedAt: "2026-03-23T19:50:00.000Z",
        reason: "Testing transitions"
      },
      sourceRefs: [],
      createdAt: "2026-03-23T19:50:00.000Z",
      updatedAt: "2026-03-23T19:50:00.000Z",
      supersedes: [],
      supersededBy: "mem-fact-successor",
      tags: ["testing"],
      relatedFiles: ["packages/memory/src/confidence.ts"],
      relatedTasks: ["task-6"]
    };

    const { supersededBy: _supersededBy, ...activeBaseRecord } = baseRecord;

    expect(tentative(baseRecord, { updatedAt: "2026-03-23T19:51:00.000Z" })).toEqual({
      ...activeBaseRecord,
      status: "active",
      confidence: "tentative",
      updatedAt: "2026-03-23T19:51:00.000Z"
    });

    expect(probable(baseRecord, { updatedAt: "2026-03-23T19:52:00.000Z" })).toEqual({
      ...activeBaseRecord,
      status: "active",
      confidence: "probable",
      updatedAt: "2026-03-23T19:52:00.000Z"
    });

    expect(confirmed(baseRecord, { updatedAt: "2026-03-23T19:53:00.000Z" })).toEqual({
      ...activeBaseRecord,
      status: "active",
      confidence: "confirmed",
      updatedAt: "2026-03-23T19:53:00.000Z"
    });

    expect(tentative(baseRecord, { updatedAt: "2026-03-23T19:51:00.000Z" })).not.toHaveProperty(
      "supersededBy"
    );
    expect(probable(baseRecord, { updatedAt: "2026-03-23T19:52:00.000Z" })).not.toHaveProperty(
      "supersededBy"
    );
    expect(confirmed(baseRecord, { updatedAt: "2026-03-23T19:53:00.000Z" })).not.toHaveProperty(
      "supersededBy"
    );

    expect(
      superseded(baseRecord, {
        updatedAt: "2026-03-23T19:54:00.000Z",
        supersededBy: "mem-fact-successor"
      })
    ).toEqual({
      ...baseRecord,
      status: "superseded",
      confidence: "superseded",
      updatedAt: "2026-03-23T19:54:00.000Z",
      supersededBy: "mem-fact-successor"
    });
  });
});
