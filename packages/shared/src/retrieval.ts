import type { MemoryRecord } from "./memory";

export const retrievalReasonKinds = [
  "task-link",
  "file-match",
  "tag-match",
  "semantic-match",
  "recent"
] as const;
export type RetrievalReasonKind = (typeof retrievalReasonKinds)[number];

export interface MemoryRetrievalQuery {
  query: string;
  taskId?: string;
  relatedFiles?: string[];
  tags?: string[];
  limit: number;
  includeSuperseded?: boolean;
}

export interface MemoryRetrievalReason {
  kind: RetrievalReasonKind;
  score: number;
  detail: string;
}

export interface MemoryRetrievalResult {
  memory: MemoryRecord;
  score: number;
  reasons: MemoryRetrievalReason[];
}

export interface MemoryRetrievalResponse {
  query: MemoryRetrievalQuery;
  results: MemoryRetrievalResult[];
}
