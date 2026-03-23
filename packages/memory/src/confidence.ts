import type { MemoryRecord } from "../../shared/src/memory";

export interface MemoryTransitionOptions {
  updatedAt?: string;
}

export interface SupersededTransitionOptions extends MemoryTransitionOptions {
  supersededBy?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function withConfidence<TRecord extends MemoryRecord>(
  record: TRecord,
  confidence: Extract<TRecord["confidence"], "tentative" | "probable" | "confirmed">,
  options: MemoryTransitionOptions = {}
): TRecord {
  const { supersededBy: _supersededBy, ...rest } = record;

  return {
    ...rest,
    status: "active",
    confidence,
    updatedAt: options.updatedAt ?? nowIso()
  } as TRecord;
}

export function tentative<TRecord extends MemoryRecord>(
  record: TRecord,
  options: MemoryTransitionOptions = {}
): TRecord {
  return withConfidence(record, "tentative", options);
}

export function probable<TRecord extends MemoryRecord>(
  record: TRecord,
  options: MemoryTransitionOptions = {}
): TRecord {
  return withConfidence(record, "probable", options);
}

export function confirmed<TRecord extends MemoryRecord>(
  record: TRecord,
  options: MemoryTransitionOptions = {}
): TRecord {
  return withConfidence(record, "confirmed", options);
}

export function superseded<TRecord extends MemoryRecord>(
  record: TRecord,
  options: SupersededTransitionOptions = {}
): TRecord {
  return {
    ...record,
    status: "superseded",
    confidence: "superseded",
    updatedAt: options.updatedAt ?? nowIso(),
    ...(options.supersededBy ? { supersededBy: options.supersededBy } : {})
  };
}
