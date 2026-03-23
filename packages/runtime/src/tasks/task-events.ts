import type {
  LinkedIssueOrPr,
  PlanSnapshot,
  ResumableTaskState,
  TaskCompletionSummary,
  TaskMode,
  TaskRecord,
  TaskResumeHints,
  TaskStatus
} from "../../../shared/src/task";

export interface CreateTaskInput {
  id: string;
  title: string;
  goal: string;
  mode: TaskMode;
  status?: Extract<TaskStatus, "pending" | "in-progress" | "blocked" | "interrupted">;
  createdAt?: string;
  updatedAt?: string;
  linkedIssueOrPr?: LinkedIssueOrPr;
  linkedMemoryIds?: string[];
  relatedFiles?: string[];
  planSnapshot?: PlanSnapshot;
  completionSummary?: TaskCompletionSummary;
  resumeHints?: TaskResumeHints;
}

export interface UpdateTaskInput {
  title?: string;
  goal?: string;
  mode?: TaskMode;
  status?: TaskStatus;
  updatedAt?: string;
  linkedIssueOrPr?: LinkedIssueOrPr | null;
  linkedMemoryIds?: string[];
  relatedFiles?: string[];
  planSnapshot?: PlanSnapshot | null;
  completionSummary?: TaskCompletionSummary | null;
  resumeHints?: TaskResumeHints | null;
}

export interface InterruptTaskInput {
  updatedAt?: string;
  resumeHints: TaskResumeHints;
}

export interface GetResumableTaskStateOptions {
  taskId?: string;
}

export interface TaskCreatedEvent {
  type: "task-created";
  task: TaskRecord;
}

export interface TaskUpdatedEvent {
  type: "task-updated";
  task: TaskRecord;
}

export interface TaskInterruptedEvent {
  type: "task-interrupted";
  task: TaskRecord;
}

export interface ResumableTaskStateResolvedEvent {
  type: "resumable-task-state-resolved";
  state: ResumableTaskState;
}

export type TaskLifecycleEvent =
  | TaskCreatedEvent
  | TaskUpdatedEvent
  | TaskInterruptedEvent
  | ResumableTaskStateResolvedEvent;
