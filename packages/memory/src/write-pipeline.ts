import type { Database } from "bun:sqlite";
import type { DecisionMemory, FactMemory, TaskSummaryMemory } from "../../shared/src/memory";
import { MemoryFileStore } from "./file-store";
import {
  buildDecisionMemory,
  buildFactMemory,
  buildTaskSummaryMemory,
  type WriteDecisionInput,
  type WriteFactInput,
  type WriteTaskSummaryInput
} from "./memory-types";

export interface MemoryWritePipelineOptions {
  repoRoot: string;
  database?: Database;
}

export class MemoryWritePipeline {
  constructor(private readonly fileStore: MemoryFileStore) {}

  async writeFact(input: WriteFactInput): Promise<FactMemory> {
    const record = buildFactMemory(input);
    await this.fileStore.write(record);
    return record;
  }

  async writeDecision(input: WriteDecisionInput): Promise<DecisionMemory> {
    const record = buildDecisionMemory(input);
    await this.fileStore.write(record);
    return record;
  }

  async writeTaskSummary(input: WriteTaskSummaryInput): Promise<TaskSummaryMemory> {
    const record = buildTaskSummaryMemory(input);
    await this.fileStore.write(record);
    return record;
  }
}

export function createMemoryWritePipeline(
  options: MemoryWritePipelineOptions
): MemoryWritePipeline {
  return new MemoryWritePipeline(
    new MemoryFileStore({ repoRoot: options.repoRoot, database: options.database })
  );
}
