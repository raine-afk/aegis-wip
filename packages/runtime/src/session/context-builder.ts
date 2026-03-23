import type {
  MemoryRecord,
  MemoryRetrievalQuery,
  MemoryRetrievalResponse,
  TaskMode,
  TaskRecord
} from "../../../shared/src/index";

const compactMemoryLimit = 4;
const compactFileLimit = 8;
const compactQueryPartLimit = 5;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

function buildCompactQuery(task: TaskRecord): string {
  return dedupe(
    [
      task.title,
      task.goal,
      task.planSnapshot?.summary,
      task.resumeHints?.summary,
      task.resumeHints?.nextStep
    ]
      .filter((value): value is string => Boolean(value))
      .map(collapseWhitespace)
  )
    .slice(0, compactQueryPartLimit)
    .join(" ");
}

export interface RuntimeSessionMemory {
  id: string;
  type: MemoryRecord["type"];
  title: string;
  summary: string;
  confidence: MemoryRecord["confidence"];
  score: number;
  reasons: string[];
}

export interface RuntimeSessionTaskContext {
  id: string;
  title: string;
  goal: string;
  mode: TaskMode;
  status: TaskRecord["status"];
  linkedMemoryIds: string[];
  linkedIssueOrPr?: TaskRecord["linkedIssueOrPr"];
  planSnapshot?: TaskRecord["planSnapshot"];
  completionSummary?: TaskRecord["completionSummary"];
  resumeHints?: TaskRecord["resumeHints"];
}

export interface RuntimeSessionContext {
  task: RuntimeSessionTaskContext;
  relatedFiles: string[];
  memories: RuntimeSessionMemory[];
  transcript?: never;
}

export interface RuntimeSessionContextInput {
  task: TaskRecord;
}

export interface RuntimeMemoryRetriever {
  retrieve(query: MemoryRetrievalQuery): MemoryRetrievalResponse | Promise<MemoryRetrievalResponse>;
}

export class ContextBuilder {
  constructor(private readonly memoryRetriever: RuntimeMemoryRetriever) {}

  async build(input: RuntimeSessionContextInput): Promise<RuntimeSessionContext> {
    const task = input.task;
    const query = this.buildMemoryQuery(task);
    const response = await this.memoryRetriever.retrieve(query);

    return {
      task: {
        id: task.id,
        title: task.title,
        goal: task.goal,
        mode: task.mode,
        status: task.status,
        linkedMemoryIds: [...task.linkedMemoryIds],
        linkedIssueOrPr: task.linkedIssueOrPr,
        planSnapshot: task.planSnapshot,
        completionSummary: task.completionSummary,
        resumeHints: task.resumeHints
      },
      relatedFiles: task.relatedFiles.slice(0, compactFileLimit),
      memories: response.results.slice(0, compactMemoryLimit).map((result) => ({
        id: result.memory.id,
        type: result.memory.type,
        title: result.memory.title,
        summary: result.memory.summary,
        confidence: result.memory.confidence,
        score: result.score,
        reasons: result.reasons.map((reason) => reason.detail)
      }))
    };
  }

  private buildMemoryQuery(task: TaskRecord): MemoryRetrievalQuery {
    return {
      query: buildCompactQuery(task),
      taskId: task.id,
      relatedFiles: task.relatedFiles.slice(0, compactFileLimit),
      limit: compactMemoryLimit,
      minConfidence: "probable"
    };
  }
}
