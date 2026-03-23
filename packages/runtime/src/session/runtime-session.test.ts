import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  DecisionMemory,
  FactMemory,
  MemoryRecord,
  MemoryRetrievalQuery,
  MemoryRetrievalResponse,
  TaskRecord
} from "../../../shared/src/index";
import { initializeSqlite } from "../../../storage/src/sqlite";
import { TaskRepository } from "../tasks/task-repository";
import { TaskService } from "../tasks/task-service";
import { RuntimeSession } from "./runtime-session";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function createFactMemory(overrides: Partial<FactMemory> & Pick<FactMemory, "id" | "title" | "summary">): FactMemory {
  return {
    id: overrides.id,
    type: "fact",
    title: overrides.title,
    summary: overrides.summary,
    status: "active",
    confidence: "confirmed",
    provenance: {
      source: "agent",
      recordedAt: "2026-03-23T20:20:00.000Z",
      reason: "Captured while resuming runtime work"
    },
    sourceRefs: overrides.sourceRefs ?? [],
    createdAt: "2026-03-23T20:20:00.000Z",
    updatedAt: "2026-03-23T20:20:00.000Z",
    supersedes: [],
    tags: overrides.tags ?? ["runtime"],
    relatedFiles: overrides.relatedFiles ?? [],
    relatedTasks: overrides.relatedTasks ?? [],
    ...overrides
  };
}

function createDecisionMemory(
  overrides: Partial<DecisionMemory> & Pick<DecisionMemory, "id" | "title" | "summary" | "decision">
): DecisionMemory {
  return {
    id: overrides.id,
    type: "decision",
    title: overrides.title,
    summary: overrides.summary,
    status: "active",
    confidence: "confirmed",
    provenance: {
      source: "agent",
      recordedAt: "2026-03-23T20:30:00.000Z",
      reason: "Captured while planning runtime mode transitions"
    },
    sourceRefs: overrides.sourceRefs ?? [],
    createdAt: "2026-03-23T20:30:00.000Z",
    updatedAt: "2026-03-23T20:30:00.000Z",
    supersedes: [],
    tags: overrides.tags ?? ["runtime"],
    relatedFiles: overrides.relatedFiles ?? [],
    relatedTasks: overrides.relatedTasks ?? [],
    decision: overrides.decision,
    rationale: overrides.rationale,
    ...overrides
  };
}

describe("runtime session", () => {
  test("starts a task in plan mode, resumes it in build mode, and requests only compact relevant memory", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "aegis-runtime-session-"));
    tempDirs.push(repoRoot);

    const database = await initializeSqlite(join(repoRoot, "aegis.db"));
    const taskService = new TaskService(new TaskRepository(database));
    const retrievalCalls: MemoryRetrievalQuery[] = [];

    const relevantPlanMemory = createFactMemory({
      id: "memory-plan",
      title: "Runtime sessions should start with compact task context",
      summary: "Plan mode should use task state plus scoped memory instead of replaying a full transcript.",
      relatedFiles: ["packages/runtime/src/session/runtime-session.ts"],
      relatedTasks: ["task-8"]
    });

    const relevantBuildMemory = createDecisionMemory({
      id: "memory-build",
      title: "Build mode should resume the runtime task from the stored plan",
      summary: "Resumed build sessions should carry the saved plan snapshot and next-step hints forward through the runtime loop.",
      decision: "Resume build work from task state and scoped retrieval.",
      relatedFiles: ["packages/runtime/src/session/mode-controller.ts"],
      relatedTasks: []
    });

    const irrelevantNoise = createFactMemory({
      id: "memory-noise",
      title: "Runtime sessions once rendered a huge transcript panel",
      summary: "This noisy UI memory mentions runtime sessions but belongs to a different task and file set.",
      relatedFiles: ["packages/ui/src/app.tsx"],
      relatedTasks: ["task-ui"]
    });

    const candidateMemories: MemoryRecord[] = [
      relevantBuildMemory,
      relevantPlanMemory,
      irrelevantNoise
    ];

    const runtimeSession = new RuntimeSession({
      taskService,
      memoryRetriever: {
        retrieve(query): MemoryRetrievalResponse {
          retrievalCalls.push(query);

          const normalizedQuery = query.query.toLowerCase();
          const relatedFiles = new Set(query.relatedFiles ?? []);

          const results = candidateMemories
            .filter((memory) => {
              const scopedToTask = query.taskId ? memory.relatedTasks.includes(query.taskId) : false;
              const scopedToFiles = memory.relatedFiles.some((file) => relatedFiles.has(file));
              const semanticMatch = [memory.title, memory.summary]
                .join(" ")
                .toLowerCase()
                .includes("runtime");

              return semanticMatch && (scopedToTask || scopedToFiles);
            })
            .slice(0, query.limit)
            .map((memory) => ({
              memory,
              score: memory.id === relevantBuildMemory.id ? 0.98 : 0.91,
              reasons: [
                {
                  kind: memory.relatedTasks.includes(query.taskId ?? "") ? "task-link" : "file-match",
                  score: 1,
                  detail: "Scoped to the current task session."
                }
              ]
            }));

          expect(normalizedQuery).not.toContain("message 97");
          expect(query.limit).toBeLessThanOrEqual(4);

          return {
            query,
            results
          };
        }
      }
    });

    const started = await runtimeSession.start({
      id: "task-8",
      title: "Build the runtime mode loop and task session orchestration",
      goal: "Start in plan mode, resume in build mode, and keep session context compact.",
      mode: "plan",
      createdAt: "2026-03-23T20:40:00.000Z",
      relatedFiles: [
        "packages/runtime/src/session/runtime-session.ts",
        "packages/shared/src/task.ts"
      ]
    });

    expect(started.origin).toBe("started");
    expect(started.task.mode).toBe("plan");
    expect(started.flow.mode).toBe("plan");
    expect(started.flow.objective).toContain("executable plan");
    expect(started.context.task.planSnapshot).toBeUndefined();
    expect(started.context.memories.map((memory) => memory.id)).toEqual([
      relevantPlanMemory.id
    ]);
    expect(started.context.transcript).toBeUndefined();
    expect(retrievalCalls[0]).toMatchObject({
      taskId: "task-8",
      relatedFiles: [
        "packages/runtime/src/session/runtime-session.ts",
        "packages/shared/src/task.ts"
      ],
      limit: 4,
      minConfidence: "probable"
    });
    expect(retrievalCalls[0]?.query).toContain("Build the runtime mode loop");

    const interruptedTask = taskService.markTaskInterrupted("task-8", {
      updatedAt: "2026-03-23T20:50:00.000Z",
      resumeHints: {
        summary: "The plan is done. Resume directly in build mode.",
        nextStep: "Implement the mode controller and compact context builder.",
        commands: ["bun test packages/runtime --test-name-pattern \"runtime session\""]
      }
    });

    const persistedTask: TaskRecord = taskService.updateTask(interruptedTask.id, {
      updatedAt: "2026-03-23T20:52:00.000Z",
      relatedFiles: [
        "packages/runtime/src/session/runtime-session.ts",
        "packages/runtime/src/session/mode-controller.ts"
      ],
      planSnapshot: {
        summary: "Plan mode should hand build mode a compact execution brief.",
        steps: [
          "Persist task state",
          "Build mode-specific flow wiring",
          "Retrieve only scoped memory"
        ],
        updatedAt: "2026-03-23T20:51:00.000Z"
      },
      linkedMemoryIds: [relevantPlanMemory.id, relevantBuildMemory.id]
    });

    expect(persistedTask.status).toBe("interrupted");

    const resumed = await runtimeSession.resume({
      taskId: persistedTask.id,
      mode: "build"
    });

    expect(resumed.origin).toBe("resumed");
    expect(resumed.selection).toBe("explicit");
    expect(resumed.task.mode).toBe("build");
    expect(resumed.task.status).toBe("in-progress");
    expect(resumed.flow.mode).toBe("build");
    expect(resumed.flow.objective).toContain("Execute the current plan");
    expect(resumed.context.task.resumeHints?.nextStep).toBe(
      "Implement the mode controller and compact context builder."
    );
    expect(resumed.context.relatedFiles).toEqual([
      "packages/runtime/src/session/runtime-session.ts",
      "packages/runtime/src/session/mode-controller.ts"
    ]);
    expect(resumed.context.memories.map((memory) => memory.id)).toEqual([
      relevantBuildMemory.id,
      relevantPlanMemory.id
    ]);
    expect(resumed.context.memories.map((memory) => memory.id)).not.toContain(irrelevantNoise.id);
    expect(retrievalCalls[1]).toMatchObject({
      taskId: "task-8",
      relatedFiles: [
        "packages/runtime/src/session/runtime-session.ts",
        "packages/runtime/src/session/mode-controller.ts"
      ],
      limit: 4,
      minConfidence: "probable"
    });
    expect(retrievalCalls[1]?.query).toContain("Implement the mode controller");

    database.close();
  });
});
