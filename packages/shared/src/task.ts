export const taskModes = ["plan", "build", "review"] as const;
export type TaskMode = (typeof taskModes)[number];

export const taskStatuses = [
  "pending",
  "in-progress",
  "blocked",
  "interrupted",
  "completed",
  "cancelled"
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const linkedWorkItemKinds = ["issue", "pull-request"] as const;
export type LinkedWorkItemKind = (typeof linkedWorkItemKinds)[number];

export interface LinkedIssueOrPr {
  kind: LinkedWorkItemKind;
  id: string;
  title?: string;
  url?: string;
}

export interface PlanSnapshot {
  summary: string;
  steps: string[];
  updatedAt: string;
}

export interface TaskCompletionSummary {
  summary: string;
  completedAt: string;
  openQuestions?: string[];
}

export interface TaskResumeHints {
  summary: string;
  nextStep: string;
  commands?: string[];
}

export interface TaskRecord {
  id: string;
  title: string;
  goal: string;
  mode: TaskMode;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  linkedMemoryIds: string[];
  linkedIssueOrPr?: LinkedIssueOrPr;
  relatedFiles: string[];
  planSnapshot?: PlanSnapshot;
  completionSummary?: TaskCompletionSummary;
  resumeHints?: TaskResumeHints;
}

export const taskResumeSelections = ["last-active", "explicit"] as const;
export type TaskResumeSelection = (typeof taskResumeSelections)[number];

export interface ResumableTaskState {
  selection: TaskResumeSelection;
  task: TaskRecord;
}
