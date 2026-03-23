import type { Database } from "bun:sqlite";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getStoragePaths, initializeSqlite } from "../../storage/src/index";
import type { MemoryDirectoryName, MemoryRecord, MemoryType } from "../../shared/src/memory";
import { memoryTypeDirectories } from "../../shared/src/memory";
import { upsertIndexedMemory } from "./memory-index";

export interface MemoryFileStoreOptions {
  repoRoot: string;
  database?: Database;
}

const MEMORY_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

function toCanonicalJson(record: MemoryRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}

function assertSafeMemoryId(id: string): void {
  if (!MEMORY_ID_PATTERN.test(id) || id === "." || id === "..") {
    throw new Error(`Memory ids must be filesystem-safe: ${id}`);
  }
}

export class MemoryFileStore {
  readonly root: string;

  constructor(private readonly options: MemoryFileStoreOptions) {
    this.root = join(options.repoRoot, ".aegis", "memory");
  }

  async write(record: MemoryRecord): Promise<string> {
    assertSafeMemoryId(record.id);
    const filePath = this.getFilePath(record.type, record.id);
    await mkdir(this.getDirectoryPath(record.type), { recursive: true });
    await writeFile(filePath, toCanonicalJson(record), "utf8");
    await this.writeIndexRecord(filePath, record);
    return filePath;
  }

  getDirectoryPath(type: MemoryType): string {
    return join(this.root, this.getDirectoryName(type));
  }

  getFilePath(type: MemoryType, id: string): string {
    return join(this.getDirectoryPath(type), `${id}.json`);
  }

  private async writeIndexRecord(canonicalPath: string, record: MemoryRecord): Promise<void> {
    if (this.options.database) {
      upsertIndexedMemory(this.options.database, record, canonicalPath);
      return;
    }

    const database = await initializeSqlite(getStoragePaths(this.options.repoRoot).database);

    try {
      upsertIndexedMemory(database, record, canonicalPath);
    } finally {
      database.close();
    }
  }

  private getDirectoryName(type: MemoryType): MemoryDirectoryName {
    return memoryTypeDirectories[type];
  }
}
