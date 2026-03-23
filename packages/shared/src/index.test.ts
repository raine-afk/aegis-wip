import { describe, expect, test } from "bun:test";
import {
  gitChangeTypes,
  memoryConfidences,
  memoryStatuses,
  memoryTypes,
  permissionActions,
  permissionDecisions,
  permissionModes,
  retrievalReasonKinds,
  reviewerCheckpoints,
  reviewerVerdicts,
  taskModes,
  taskStatuses
} from "./index";
import type * as Shared from "./index";

describe("shared contracts", () => {
  test("sample domain objects satisfy the shared contracts", () => {
    const factMemory: Shared.FactMemory = {
      id: "mem-fact-1",
      type: "fact",
      title: "Project uses Bun workspaces",
      summary: "The repo is organized as a Bun workspace monorepo.",
      status: "active",
      confidence: "confirmed",
      provenance: {
        source: "repo",
        recordedAt: "2026-03-23T19:00:00.000Z",
        reason: "Observed in the root package manifest"
      },
      sourceRefs: [
        {
          kind: "file",
          value: "package.json",
          label: "root workspace manifest"
        }
      ],
      createdAt: "2026-03-23T19:00:00.000Z",
      updatedAt: "2026-03-23T19:00:00.000Z",
      supersedes: [],
      tags: ["workspace", "bun"],
      relatedFiles: ["package.json"],
      relatedTasks: ["task-123"]
    };

    const decisionMemory: Shared.DecisionMemory = {
      id: "mem-decision-1",
      type: "decision",
      title: "Use SQLite for structured state",
      summary: "SQLite stores indexed task and retrieval state.",
      status: "active",
      confidence: "confirmed",
      provenance: {
        source: "user",
        recordedAt: "2026-03-23T19:05:00.000Z",
        reason: "Locked in the MVP design"
      },
      sourceRefs: [
        {
          kind: "task",
          value: "design-doc",
          label: "reliability mvp design"
        }
      ],
      createdAt: "2026-03-23T19:05:00.000Z",
      updatedAt: "2026-03-23T19:05:00.000Z",
      supersedes: [],
      tags: ["storage", "sqlite"],
      relatedFiles: ["docs/plans/2026-03-23-aegis-reliability-mvp-design.md"],
      relatedTasks: ["task-123"],
      decision: "Use SQLite for indexes and bookkeeping.",
      rationale: "It is local, inspectable, and boring."
    };

    const taskSummaryMemory: Shared.TaskSummaryMemory = {
      id: "mem-summary-1",
      type: "task-summary",
      title: "Desktop shell scaffolded",
      summary: "The Electron shell opens and exposes a narrow preload bridge.",
      status: "active",
      confidence: "probable",
      provenance: {
        source: "agent",
        recordedAt: "2026-03-23T19:10:00.000Z",
        reason: "Recorded after task completion"
      },
      sourceRefs: [
        {
          kind: "task",
          value: "task-2",
          label: "desktop shell"
        }
      ],
      createdAt: "2026-03-23T19:10:00.000Z",
      updatedAt: "2026-03-23T19:10:00.000Z",
      supersedes: [],
      tags: ["desktop", "shell"],
      relatedFiles: ["apps/desktop/src/main/index.ts"],
      relatedTasks: ["task-2"],
      taskId: "task-2",
      outcome: "completed"
    };

    const task: Shared.TaskRecord = {
      id: "task-123",
      title: "Define stable shared contracts",
      goal: "Create stable product language for Aegis packages.",
      mode: "build",
      status: "in-progress",
      createdAt: "2026-03-23T19:15:00.000Z",
      updatedAt: "2026-03-23T19:20:00.000Z",
      linkedMemoryIds: [factMemory.id, decisionMemory.id],
      linkedIssueOrPr: {
        kind: "issue",
        id: "42",
        title: "Reliability MVP tracking",
        url: "https://example.com/issues/42"
      },
      relatedFiles: ["packages/shared/src/index.ts"],
      planSnapshot: {
        summary: "Create type contracts for the shared domain.",
        steps: ["write test", "implement contracts", "verify"],
        updatedAt: "2026-03-23T19:16:00.000Z"
      },
      resumeHints: {
        summary: "Finish the type exports and rerun the package test.",
        nextStep: "Run bun test packages/shared",
        commands: ["bun test packages/shared"]
      }
    };

    const reviewerOutput: Shared.ReviewerOutput = {
      checkpoint: "pre-commit",
      verdict: "needs-changes",
      blockingIssues: [
        {
          code: "missing-verification",
          message: "Tests must pass before the task can be committed.",
          relatedFiles: ["packages/shared/src/index.test.ts"]
        }
      ],
      nonBlockingConcerns: [
        {
          code: "future-proofing",
          message: "Keep the contracts boring and explicit."
        }
      ],
      needsVerification: true,
      memoryWarnings: [
        {
          memoryId: decisionMemory.id,
          message: "Make sure the contract still matches the latest design doc."
        }
      ],
      recommendedNextStep: "Run the shared package tests and fix any failures."
    };

    const retrievalQuery: Shared.MemoryRetrievalQuery = {
      query: "sqlite storage decision",
      taskId: task.id,
      relatedFiles: ["packages/storage/src/sqlite.ts"],
      limit: 5
    };

    const retrievalResult: Shared.MemoryRetrievalResult = {
      memory: decisionMemory,
      score: 0.98,
      reasons: [
        {
          kind: "task-link",
          score: 1,
          detail: "This memory is explicitly linked to the active task."
        },
        {
          kind: "semantic-match",
          score: 0.82,
          detail: "The query mentions sqlite and storage."
        }
      ]
    };

    const permissionPolicy: Shared.PermissionPolicy = {
      mode: "default",
      rules: {
        "file-read": "allow",
        "file-edit": "allow",
        "command-run": "allow",
        "command-destructive": "ask",
        "git-read": "allow",
        "git-branch": "allow",
        "git-stage": "allow",
        "git-commit": "ask",
        "external-open": "ask"
      }
    };

    const permissionRequest: Shared.PermissionRequest = {
      action: "git-commit",
      target: "HEAD",
      reason: "Persist the shared contract work"
    };

    const permissionResult: Shared.PermissionResult = {
      action: permissionRequest.action,
      decision: permissionPolicy.rules[permissionRequest.action],
      reason: "Committing code should require an explicit checkpoint."
    };

    const gitState: Shared.GitState = {
      branch: {
        name: "main",
        upstreamName: "origin/main",
        ahead: 1,
        behind: 0
      },
      files: [
        {
          path: "packages/shared/src/index.ts",
          staged: "added",
          unstaged: null
        }
      ],
      clean: false,
      lastCommitSha: "d04472a"
    };

    const sharedMemory: Shared.MemoryRecord[] = [
      factMemory,
      decisionMemory,
      taskSummaryMemory
    ];

    expect(memoryTypes).toEqual(["fact", "decision", "task-summary"]);
    expect(memoryStatuses).toEqual(["active", "superseded"]);
    expect(memoryConfidences).toEqual(["tentative", "probable", "confirmed"]);
    expect(taskModes).toEqual(["plan", "build", "review"]);
    expect(taskStatuses).toEqual([
      "pending",
      "in-progress",
      "blocked",
      "interrupted",
      "completed",
      "cancelled"
    ]);
    expect(reviewerCheckpoints).toEqual(["after-plan", "pre-commit", "final-completion"]);
    expect(reviewerVerdicts).toEqual(["approved", "needs-changes", "blocked"]);
    expect(retrievalReasonKinds).toEqual([
      "task-link",
      "file-match",
      "tag-match",
      "semantic-match",
      "recent"
    ]);
    expect(permissionModes).toEqual(["default", "read-only", "confirm-destructive"]);
    expect(permissionActions).toEqual([
      "file-read",
      "file-edit",
      "command-run",
      "command-destructive",
      "git-read",
      "git-branch",
      "git-stage",
      "git-commit",
      "external-open"
    ]);
    expect(permissionDecisions).toEqual(["allow", "ask", "deny"]);
    expect(gitChangeTypes).toEqual([
      "added",
      "modified",
      "deleted",
      "renamed",
      "untracked",
      "conflicted"
    ]);
    expect(sharedMemory).toHaveLength(3);
    expect(task.planSnapshot?.steps).toContain("implement contracts");
    expect(reviewerOutput.blockingIssues[0]?.code).toBe("missing-verification");
    expect(retrievalQuery.taskId).toBe(task.id);
    expect(retrievalResult.memory.type).toBe("decision");
    expect(permissionResult.decision).toBe("ask");
    expect(gitState.clean).toBe(false);
  });
});
