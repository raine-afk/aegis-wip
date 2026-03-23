import { join } from "node:path";

export interface StoragePaths {
  repoRoot: string;
  root: string;
  memory: string;
  tasks: string;
  index: string;
  logs: string;
  browser: string;
  config: string;
  database: string;
}

export function getStoragePaths(repoRoot: string): StoragePaths {
  const root = join(repoRoot, ".aegis");

  return {
    repoRoot,
    root,
    memory: join(root, "memory"),
    tasks: join(root, "tasks"),
    index: join(root, "index"),
    logs: join(root, "logs"),
    browser: join(root, "browser"),
    config: join(root, "config"),
    database: join(root, "aegis.db")
  };
}

export function getStorageDirectories(paths: StoragePaths): string[] {
  return [paths.root, paths.memory, paths.tasks, paths.index, paths.logs, paths.browser, paths.config];
}
