import type {
  MemoryRecord,
  MemoryRetrievalQuery,
  MemoryRetrievalReason
} from "../../shared/src/index";

export interface MemoryRankingContext {
  taskLinkedMemoryIds: ReadonlySet<string>;
}

const TASK_LINK_WEIGHT = 1;
const RELATED_TASK_WEIGHT = 0.7;
const FILE_MATCH_WEIGHT = 0.45;
const TAG_MATCH_WEIGHT = 0.3;
const SEMANTIC_MATCH_WEIGHT = 0.9;
const RECENT_WEIGHT = 0.15;

function roundScore(score: number): number {
  return Number(score.toFixed(3));
}

function uniqueLowercase(values: string[]): string[] {
  return [...new Set(values.map((value) => value.toLowerCase()))];
}

function tokenize(value: string): string[] {
  const matches = value.toLowerCase().match(/[a-z0-9._/-]+/g);
  return matches ? uniqueLowercase(matches.filter((token) => token.length > 1)) : [];
}

function intersect(left: string[], right: string[]): string[] {
  const rightSet = new Set(uniqueLowercase(right));
  return uniqueLowercase(left).filter((value) => rightSet.has(value.toLowerCase()));
}

function buildSemanticReason(memory: MemoryRecord, query: MemoryRetrievalQuery): MemoryRetrievalReason | null {
  const queryTokens = tokenize(query.query);

  if (queryTokens.length === 0) {
    return null;
  }

  const searchableText = [
    memory.title,
    memory.summary,
    memory.type === "decision" ? memory.decision : "",
    memory.type === "decision" ? memory.rationale ?? "" : "",
    ...memory.tags,
    ...memory.relatedFiles
  ]
    .join(" ")
    .toLowerCase();

  const matchedTerms = queryTokens.filter((token) => searchableText.includes(token));

  if (matchedTerms.length === 0) {
    return null;
  }

  const overlap = matchedTerms.length / queryTokens.length;

  return {
    kind: "semantic-match",
    score: roundScore(SEMANTIC_MATCH_WEIGHT * overlap),
    detail: `Matched query terms: ${matchedTerms.join(", ")}`
  };
}

export function rankMemory(
  memory: MemoryRecord,
  query: MemoryRetrievalQuery,
  context: MemoryRankingContext
): { score: number; reasons: MemoryRetrievalReason[] } | null {
  const reasons: MemoryRetrievalReason[] = [];

  if (query.taskId && context.taskLinkedMemoryIds.has(memory.id)) {
    reasons.push({
      kind: "task-link",
      score: TASK_LINK_WEIGHT,
      detail: `Task ${query.taskId} explicitly links to this memory.`
    });
  } else if (query.taskId && memory.relatedTasks.includes(query.taskId)) {
    reasons.push({
      kind: "task-link",
      score: RELATED_TASK_WEIGHT,
      detail: `This memory is tagged as related to task ${query.taskId}.`
    });
  }

  const fileMatches = query.relatedFiles ? intersect(query.relatedFiles, memory.relatedFiles) : [];
  if (fileMatches.length > 0 && query.relatedFiles) {
    reasons.push({
      kind: "file-match",
      score: roundScore(FILE_MATCH_WEIGHT * (fileMatches.length / query.relatedFiles.length)),
      detail: `Related files matched: ${fileMatches.join(", ")}`
    });
  }

  const tagMatches = query.tags ? intersect(query.tags, memory.tags) : [];
  if (tagMatches.length > 0 && query.tags) {
    reasons.push({
      kind: "tag-match",
      score: roundScore(TAG_MATCH_WEIGHT * (tagMatches.length / query.tags.length)),
      detail: `Matched tags: ${tagMatches.join(", ")}`
    });
  }

  const semanticReason = buildSemanticReason(memory, query);
  if (semanticReason) {
    reasons.push(semanticReason);
  }

  if (query.updatedAfter && memory.updatedAt >= query.updatedAfter) {
    reasons.push({
      kind: "recent",
      score: RECENT_WEIGHT,
      detail: `Updated after ${query.updatedAfter}.`
    });
  }

  const hasPrimaryReason = reasons.some((reason) => reason.kind !== "recent");
  if (!hasPrimaryReason) {
    return null;
  }

  reasons.sort((left, right) => right.score - left.score || left.kind.localeCompare(right.kind));

  return {
    score: roundScore(reasons.reduce((total, reason) => total + reason.score, 0)),
    reasons
  };
}
