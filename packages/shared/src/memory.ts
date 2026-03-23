export const memoryTypes = ["fact", "decision", "task-summary"] as const;
export type MemoryType = (typeof memoryTypes)[number];

export const memoryStatuses = ["tentative", "probable", "confirmed", "superseded"] as const;
export type MemoryStatus = (typeof memoryStatuses)[number];

export const memoryConfidences = ["tentative", "probable", "confirmed"] as const;
export type MemoryConfidence = (typeof memoryConfidences)[number];

export const memoryProvenanceSources = ["user", "agent", "system", "tool", "repo"] as const;
export type MemoryProvenanceSource = (typeof memoryProvenanceSources)[number];

export const memorySourceKinds = ["file", "task", "message", "command", "url"] as const;
export type MemorySourceKind = (typeof memorySourceKinds)[number];

export const taskSummaryOutcomes = [
  "in-progress",
  "completed",
  "blocked",
  "interrupted",
  "cancelled"
] as const;
export type TaskSummaryOutcome = (typeof taskSummaryOutcomes)[number];

export interface MemoryProvenance {
  source: MemoryProvenanceSource;
  recordedAt: string;
  reason: string;
}

export interface MemorySourceRef {
  kind: MemorySourceKind;
  value: string;
  label?: string;
}

export interface MemoryRecordBase {
  id: string;
  type: MemoryType;
  title: string;
  summary: string;
  status: MemoryStatus;
  confidence: MemoryConfidence;
  provenance: MemoryProvenance;
  sourceRefs: MemorySourceRef[];
  createdAt: string;
  updatedAt: string;
  supersedes: string[];
  supersededBy?: string;
  tags: string[];
  relatedFiles: string[];
  relatedTasks: string[];
}

export interface FactMemory extends MemoryRecordBase {
  type: "fact";
}

export interface DecisionMemory extends MemoryRecordBase {
  type: "decision";
  decision: string;
  rationale?: string;
}

export interface TaskSummaryMemory extends MemoryRecordBase {
  type: "task-summary";
  taskId: string;
  outcome: TaskSummaryOutcome;
}

export type MemoryRecord = FactMemory | DecisionMemory | TaskSummaryMemory;
