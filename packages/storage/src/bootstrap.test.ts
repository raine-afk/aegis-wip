import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { bootstrapStorage } from "./bootstrap";

const tempRepos: string[] = [];

afterEach(async () => {
  await Promise.all(tempRepos.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("bootstrapStorage", () => {
  test("creates the repo-local .aegis directories and sqlite database", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "aegis-storage-"));
    tempRepos.push(repoRoot);

    const paths = await bootstrapStorage({ repoRoot });

    expect(paths.root).toBe(join(repoRoot, ".aegis"));
    expect(paths.database).toBe(join(repoRoot, ".aegis", "aegis.db"));

    expect((await stat(paths.root)).isDirectory()).toBe(true);
    expect((await stat(paths.memory)).isDirectory()).toBe(true);
    expect((await stat(paths.tasks)).isDirectory()).toBe(true);
    expect((await stat(paths.index)).isDirectory()).toBe(true);
    expect((await stat(paths.logs)).isDirectory()).toBe(true);
    expect((await stat(paths.browser)).isDirectory()).toBe(true);
    expect((await stat(paths.config)).isDirectory()).toBe(true);
    expect((await stat(paths.database)).isFile()).toBe(true);
  });
});
