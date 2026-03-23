import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initializeSqlite } from "../../../storage/src/sqlite";
import { TaskRepository } from "./task-repository";
import { TaskService } from "./task-service";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("TaskService", () => {
  test("persists task lifecycle and reconstructs resumable task state from storage", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "aegis-runtime-task-service-"));
    tempDirs.push(repoRoot);

    const databasePath = join(repoRoot, "aegis.db");
    const firstDatabase = await initializeSqlite(databasePath);
    const firstRepository = new TaskRepository(firstDatabase);
    const firstService = new TaskService(firstRepository);

    const createdTask = firstService.createTask({
      id: "task-1",
      title: "Persist task graph state",
      goal: "Store enough runtime state to resume interrupted work.",
      mode: "build",
      createdAt: "2026-03-23T19:30:00.000Z",
      linkedIssueOrPr: {
        kind: "issue",
        id: "55",
        title: "Task persistence",
        url: "https://example.com/issues/55"
      },
      linkedMemoryIds: ["memory-1"],
      relatedFiles: ["packages/runtime/src/tasks/task-service.ts"],
      planSnapshot: {
        summary: "Add runtime task persistence on top of sqlite storage.",
        steps: ["write red test", "persist task state", "resume task state"],
        updatedAt: "2026-03-23T19:31:00.000Z"
      },
      resumeHints: {
        summary: "Finish the repository and wire resumable lookups.",
        nextStep: "Implement sqlite-backed task persistence",
        commands: ["bun test packages/runtime --test-name-pattern \"task lifecycle\""]
      }
    });

    expect(createdTask.status).toBe("in-progress");
    expect(firstService.getTaskById(createdTask.id)?.planSnapshot?.steps).toEqual([
      "write red test",
      "persist task state",
      "resume task state"
    ]);

    const updatedTask = firstService.updateTask(createdTask.id, {
      updatedAt: "2026-03-23T19:45:00.000Z",
      linkedMemoryIds: ["memory-1", "memory-2"],
      relatedFiles: [
        "packages/runtime/src/tasks/task-service.ts",
        "packages/runtime/src/tasks/task-repository.ts"
      ],
      planSnapshot: {
        summary: "Persist tasks, related files, and resume hints.",
        steps: ["write red test", "save task rows", "hydrate resumable state"],
        updatedAt: "2026-03-23T19:44:00.000Z"
      },
      resumeHints: {
        summary: "Interruption should preserve enough context to continue later.",
        nextStep: "Mark interrupted work with resume guidance",
        commands: ["bun test packages/runtime --test-name-pattern \"task lifecycle\""]
      }
    });

    expect(updatedTask.linkedMemoryIds).toEqual(["memory-1", "memory-2"]);
    expect(updatedTask.relatedFiles).toEqual([
      "packages/runtime/src/tasks/task-service.ts",
      "packages/runtime/src/tasks/task-repository.ts"
    ]);

    const interruptedTask = firstService.markTaskInterrupted(createdTask.id, {
      updatedAt: "2026-03-23T19:50:00.000Z",
      resumeHints: {
        summary: "The task stopped mid-flight but the plan is still valid.",
        nextStep: "Re-open the repo and resume persistence wiring",
        commands: ["bun test packages/runtime --test-name-pattern \"task lifecycle\""]
      }
    });

    expect(interruptedTask.status).toBe("interrupted");
    expect(interruptedTask.resumeHints?.nextStep).toBe(
      "Re-open the repo and resume persistence wiring"
    );

    firstDatabase.close();

    const secondTaskDatabase = await initializeSqlite(databasePath);
    const secondTaskRepository = new TaskRepository(secondTaskDatabase);
    const secondTaskService = new TaskService(secondTaskRepository);

    secondTaskService.createTask({
      id: "task-2",
      title: "Resume the latest active task",
      goal: "Pick the newest resumable task after reopening the repo.",
      mode: "plan",
      createdAt: "2026-03-23T20:00:00.000Z",
      relatedFiles: ["packages/shared/src/task.ts"]
    });

    secondTaskDatabase.close();

    const reopenedDatabase = await initializeSqlite(databasePath);
    const reopenedRepository = new TaskRepository(reopenedDatabase);
    const reopenedService = new TaskService(reopenedRepository);

    const lastActiveTask = reopenedService.getResumableTaskState();
    expect(lastActiveTask).toEqual({
      selection: "last-active",
      task: {
        id: "task-2",
        title: "Resume the latest active task",
        goal: "Pick the newest resumable task after reopening the repo.",
        mode: "plan",
        status: "in-progress",
        linkedIssueOrPr: undefined,
        linkedMemoryIds: [],
        relatedFiles: ["packages/shared/src/task.ts"],
        planSnapshot: undefined,
        completionSummary: undefined,
        resumeHints: undefined,
        createdAt: "2026-03-23T20:00:00.000Z",
        updatedAt: "2026-03-23T20:00:00.000Z"
      }
    });

    const selectedTask = reopenedService.getResumableTaskState({ taskId: createdTask.id });
    expect(selectedTask).toEqual({
      selection: "explicit",
      task: {
        id: "task-1",
        title: "Persist task graph state",
        goal: "Store enough runtime state to resume interrupted work.",
        mode: "build",
        status: "interrupted",
        linkedIssueOrPr: {
          kind: "issue",
          id: "55",
          title: "Task persistence",
          url: "https://example.com/issues/55"
        },
        linkedMemoryIds: ["memory-1", "memory-2"],
        relatedFiles: [
          "packages/runtime/src/tasks/task-service.ts",
          "packages/runtime/src/tasks/task-repository.ts"
        ],
        planSnapshot: {
          summary: "Persist tasks, related files, and resume hints.",
          steps: ["write red test", "save task rows", "hydrate resumable state"],
          updatedAt: "2026-03-23T19:44:00.000Z"
        },
        completionSummary: undefined,
        resumeHints: {
          summary: "The task stopped mid-flight but the plan is still valid.",
          nextStep: "Re-open the repo and resume persistence wiring",
          commands: ["bun test packages/runtime --test-name-pattern \"task lifecycle\""]
        },
        createdAt: "2026-03-23T19:30:00.000Z",
        updatedAt: "2026-03-23T19:50:00.000Z"
      }
    });

    reopenedDatabase.close();
  });
});
