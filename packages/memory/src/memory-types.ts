import type {
  DecisionMemory,
  FactMemory,
  MemoryConfidence,
  MemoryProvenance,
  MemoryRecord,
  MemorySourceRef,
  MemoryStatus,
  TaskSummaryMemory,
  TaskSummaryOutcome
} from "../../shared/src/memory";

export interface MemoryWriteInputBase {
  id: string;
  title: string;
  summary: string;
  status?: MemoryStatus;
  confidence?: MemoryConfidence;
  provenance: MemoryProvenance;
  sourceRefs?: MemorySourceRef[];
  createdAt?: string;
  updatedAt?: string;
  supersedes?: string[];
  supersededBy?: string;
  tags?: string[];
  relatedFiles?: string[];
  relatedTasks?: string[];
}

export interface WriteFactInput extends MemoryWriteInputBase {}

export interface WriteDecisionInput extends MemoryWriteInputBase {
  decision: string;
  rationale?: string;
}

export interface WriteTaskSummaryInput extends MemoryWriteInputBase {
  taskId: string;
  outcome: TaskSummaryOutcome;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uniqueStrings(values: string[] | undefined): string[] {
  return values ? [...new Set(values)] : [];
}

function resolveStatusAndConfidence(
  status: MemoryStatus | undefined,
  confidence: MemoryConfidence | undefined
): Pick<MemoryRecord, "status" | "confidence"> {
  if (status === "superseded" || confidence === "superseded") {
    return {
      status: "superseded",
      confidence: "superseded"
    };
  }

  return {
    status: status ?? "active",
    confidence: confidence ?? "tentative"
  };
}

function buildBaseMemoryRecord(
  type: MemoryRecord["type"],
  input: MemoryWriteInputBase
): Omit<MemoryRecord, "type"> & { type: MemoryRecord["type"] } {
  const createdAt = input.createdAt ?? input.provenance.recordedAt ?? nowIso();
  const updatedAt = input.updatedAt ?? createdAt;
  const state = resolveStatusAndConfidence(input.status, input.confidence);

  return {
    id: input.id,
    type,
    title: input.title,
    summary: input.summary,
    status: state.status,
    confidence: state.confidence,
    provenance: input.provenance,
    sourceRefs: input.sourceRefs ?? [],
    createdAt,
    updatedAt,
    supersedes: uniqueStrings(input.supersedes),
    ...(input.supersededBy ? { supersededBy: input.supersededBy } : {}),
    tags: uniqueStrings(input.tags),
    relatedFiles: uniqueStrings(input.relatedFiles),
    relatedTasks: uniqueStrings(input.relatedTasks)
  };
}

export function buildFactMemory(input: WriteFactInput): FactMemory {
  return {
    ...buildBaseMemoryRecord("fact", input),
    type: "fact"
  };
}

export function buildDecisionMemory(input: WriteDecisionInput): DecisionMemory {
  return {
    ...buildBaseMemoryRecord("decision", input),
    type: "decision",
    decision: input.decision,
    ...(input.rationale ? { rationale: input.rationale } : {})
  };
}

export function buildTaskSummaryMemory(input: WriteTaskSummaryInput): TaskSummaryMemory {
  return {
    ...buildBaseMemoryRecord("task-summary", input),
    type: "task-summary",
    taskId: input.taskId,
    outcome: input.outcome
  };
}
