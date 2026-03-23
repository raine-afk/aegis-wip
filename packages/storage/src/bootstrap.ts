import { mkdir } from "node:fs/promises";
import { getStorageDirectories, getStoragePaths, type StoragePaths } from "./paths";
import { initializeSqlite } from "./sqlite";

export interface BootstrapStorageOptions {
  repoRoot: string;
}

export async function bootstrapStorage({ repoRoot }: BootstrapStorageOptions): Promise<StoragePaths> {
  const paths = getStoragePaths(repoRoot);

  await Promise.all(getStorageDirectories(paths).map((directory) => mkdir(directory, { recursive: true })));

  const database = await initializeSqlite(paths.database);
  database.close();

  return paths;
}
