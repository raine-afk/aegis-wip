import type { ResumableTaskState, TaskRecord } from "../../../shared/src/task";
import type {
  CreateTaskInput,
  GetResumableTaskStateOptions,
  InterruptTaskInput,
  UpdateTaskInput
} from "./task-events";
import { TaskRepository } from "./task-repository";

function nowIso(): string {
  return new Date().toISOString();
}

function isResumableStatus(status: TaskRecord["status"]): boolean {
  return status !== "completed" && status !== "cancelled";
}

function resolveNullablePatch<T>(
  currentValue: T | undefined,
  nextValue: T | null | undefined
): T | undefined {
  if (nextValue === undefined) {
    return currentValue;
  }

  if (nextValue === null) {
    return undefined;
  }

  return nextValue;
}

export class TaskService {
  constructor(private readonly repository: TaskRepository) {}

  createTask(input: CreateTaskInput): TaskRecord {
    const createdAt = input.createdAt ?? nowIso();
    const task: TaskRecord = {
      id: input.id,
      title: input.title,
      goal: input.goal,
      mode: input.mode,
      status: input.status ?? "in-progress",
      linkedIssueOrPr: input.linkedIssueOrPr,
      linkedMemoryIds: input.linkedMemoryIds ?? [],
      relatedFiles: input.relatedFiles ?? [],
      planSnapshot: input.planSnapshot,
      completionSummary: input.completionSummary,
      resumeHints: input.resumeHints,
      createdAt,
      updatedAt: input.updatedAt ?? createdAt
    };

    return this.repository.save(task);
  }

  getTaskById(taskId: string): TaskRecord | null {
    return this.repository.getById(taskId);
  }

  updateTask(taskId: string, input: UpdateTaskInput): TaskRecord {
    const existingTask = this.repository.getById(taskId);

    if (!existingTask) {
      throw new Error(`Task ${taskId} does not exist.`);
    }

    const updatedTask: TaskRecord = {
      ...existingTask,
      title: input.title ?? existingTask.title,
      goal: input.goal ?? existingTask.goal,
      mode: input.mode ?? existingTask.mode,
      status: input.status ?? existingTask.status,
      linkedIssueOrPr: resolveNullablePatch(existingTask.linkedIssueOrPr, input.linkedIssueOrPr),
      linkedMemoryIds: input.linkedMemoryIds ?? existingTask.linkedMemoryIds,
      relatedFiles: input.relatedFiles ?? existingTask.relatedFiles,
      planSnapshot: resolveNullablePatch(existingTask.planSnapshot, input.planSnapshot),
      completionSummary: resolveNullablePatch(existingTask.completionSummary, input.completionSummary),
      resumeHints: resolveNullablePatch(existingTask.resumeHints, input.resumeHints),
      updatedAt: input.updatedAt ?? nowIso()
    };

    return this.repository.save(updatedTask);
  }

  markTaskInterrupted(taskId: string, input: InterruptTaskInput): TaskRecord {
    return this.updateTask(taskId, {
      status: "interrupted",
      updatedAt: input.updatedAt,
      resumeHints: input.resumeHints
    });
  }

  getResumableTaskState(
    options: GetResumableTaskStateOptions = {}
  ): ResumableTaskState | null {
    if (options.taskId) {
      const task = this.repository.getById(options.taskId);

      if (!task || !isResumableStatus(task.status)) {
        return null;
      }

      return {
        selection: "explicit",
        task
      };
    }

    const task = this.repository.getLatestResumable();

    if (!task) {
      return null;
    }

    return {
      selection: "last-active",
      task
    };
  }
}
