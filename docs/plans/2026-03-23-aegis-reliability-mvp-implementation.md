# Aegis Reliability MVP Implementation Plan

**Goal:** Build the first real Aegis repo as a desktop-first coding agent with resumable task state, quiet project memory, and stage-gated review.
**Architecture:** Bun-workspace monorepo with a desktop app (`apps/desktop`) and focused packages for runtime, storage, memory, reviewer, tools, inference, shared contracts, and shared UI. `.aegis/` is the project brain; SQLite handles structured state while canonical JSON files preserve inspectable memory artifacts.
**Tech Stack:** Bun, TypeScript, Electron, React, Vite, SQLite

---

### Task 1: Bootstrap the monorepo skeleton

**Files:**
- Create: `package.json`
- Create: `bunfig.toml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `apps/desktop/package.json`
- Create: `packages/shared/package.json`
- Create: `packages/storage/package.json`
- Create: `packages/memory/package.json`
- Create: `packages/runtime/package.json`
- Create: `packages/tools/package.json`
- Create: `packages/reviewer/package.json`
- Create: `packages/inference/package.json`
- Create: `packages/ui/package.json`

**Step 1: Write the root workspace manifest**
Create the root `package.json` with Bun workspaces for `apps/*` and `packages/*`, plus scripts for `dev`, `build`, `test`, `lint`, and `typecheck`.

**Step 2: Add root repo hygiene files**
Create `.gitignore` including `node_modules`, `dist`, Electron output, and repo-local `.aegis/`. Add `bunfig.toml` and `tsconfig.base.json`.

**Step 3: Create package manifests**
Add minimal `package.json` files for the desktop app and each package with `type`, `main`, `module`, and `types` entries.

**Step 4: Add a README with the product promise and repo layout**
Document what Aegis is, what this MVP includes, and how the workspace is organized.

**Step 5: Verify the workspace boots**
Run: `bun install`
Expected: install completes without workspace resolution errors.

**Step 6: Commit**
`git add . && git commit -m "chore: bootstrap aegis monorepo"`

---

### Task 2: Build the Electron + React shell

**Files:**
- Create: `apps/desktop/src/main/index.ts`
- Create: `apps/desktop/src/main/preload.ts`
- Create: `apps/desktop/src/renderer/index.html`
- Create: `apps/desktop/src/renderer/main.tsx`
- Create: `apps/desktop/src/renderer/app.tsx`
- Create: `apps/desktop/src/renderer/styles.css`
- Create: `apps/desktop/vite.config.ts`
- Create: `apps/desktop/tsconfig.json`

**Step 1: Add Electron app dependencies**
Install Electron, React, React DOM, Vite, and TypeScript tooling in `apps/desktop`.

**Step 2: Create the Electron main process**
Open one BrowserWindow, wire preload, and load the renderer URL in dev / local file in prod.

**Step 3: Create a minimal preload bridge**
Expose a narrow `window.aegis` API for app version and future IPC methods.

**Step 4: Create the renderer entry**
Render a root React app with a clean empty-state shell.

**Step 5: Create the shell layout**
Add central workstream area and collapsed placeholders for Tasks, Memory, Git, Inspect, and Browser panels.

**Step 6: Verify the shell launches**
Run: `bun run dev --filter apps/desktop`
Expected: Electron window opens with the Aegis shell and no preload/runtime errors.

**Step 7: Commit**
`git add . && git commit -m "feat: add desktop shell"`

---

### Task 3: Define stable shared contracts

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/memory.ts`
- Create: `packages/shared/src/task.ts`
- Create: `packages/shared/src/reviewer.ts`
- Create: `packages/shared/src/retrieval.ts`
- Create: `packages/shared/src/permissions.ts`
- Create: `packages/shared/src/git.ts`
- Create: `packages/shared/tsconfig.json`
- Test: `packages/shared/src/index.test.ts`

**Step 1: Write the failing contract test**
Add a test that imports all exported shared types and validates sample task/memory/reviewer objects against runtime schemas if schema helpers are used.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/shared`
Expected: fail because shared exports do not exist yet.

**Step 3: Implement shared contracts**
Define stable TypeScript types for memory objects, tasks, retrieval results, reviewer outputs, permissions, and git state.

**Step 4: Re-run the test**
Run: `bun test packages/shared`
Expected: pass.

**Step 5: Commit**
`git add . && git commit -m "feat: add shared domain contracts"`

---

### Task 4: Implement `.aegis/` bootstrap and SQLite storage

**Files:**
- Create: `packages/storage/src/index.ts`
- Create: `packages/storage/src/bootstrap.ts`
- Create: `packages/storage/src/paths.ts`
- Create: `packages/storage/src/sqlite.ts`
- Create: `packages/storage/src/migrations/0001_init.sql`
- Create: `packages/storage/tsconfig.json`
- Test: `packages/storage/src/bootstrap.test.ts`

**Step 1: Write the failing bootstrap test**
Test that pointing storage bootstrap at a temp repo creates `.aegis/`, child directories, and an `aegis.db` file.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/storage`
Expected: fail because bootstrap functions are missing.

**Step 3: Implement path helpers and bootstrap**
Create helpers for `.aegis/`, `memory`, `tasks`, `index`, `logs`, `browser`, and `config` directories.

**Step 4: Implement SQLite initialization**
Open or create the database and apply `0001_init.sql` for task and retrieval tables.

**Step 5: Re-run the test**
Run: `bun test packages/storage`
Expected: pass, with temp repo bootstrap succeeding.

**Step 6: Commit**
`git add . && git commit -m "feat: add aegis storage bootstrap"`

---

### Task 5: Build task graph persistence and resumable threads

**Files:**
- Create: `packages/runtime/src/tasks/task-service.ts`
- Create: `packages/runtime/src/tasks/task-repository.ts`
- Create: `packages/runtime/src/tasks/task-events.ts`
- Create: `packages/runtime/src/tasks/task-service.test.ts`
- Modify: `packages/storage/src/migrations/0001_init.sql`
- Modify: `packages/shared/src/task.ts`

**Step 1: Write the failing task lifecycle test**
Cover create task, update task, mark interrupted, and reconstruct a resumable task state from storage.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/runtime --test-name-pattern "task lifecycle"`
Expected: fail because task persistence does not exist.

**Step 3: Implement the repository and service**
Persist task records, plan snapshots, related files, linked memory IDs, and resume hints.

**Step 4: Add interruption and resume helpers**
Make sure reopening a repo can retrieve the last active or explicitly selected task.

**Step 5: Re-run the test**
Run: `bun test packages/runtime --test-name-pattern "task lifecycle"`
Expected: pass.

**Step 6: Commit**
`git add . && git commit -m "feat: add task graph persistence"`

---

### Task 6: Implement memory object schemas and canonical writes

**Files:**
- Create: `packages/memory/src/index.ts`
- Create: `packages/memory/src/memory-types.ts`
- Create: `packages/memory/src/write-pipeline.ts`
- Create: `packages/memory/src/file-store.ts`
- Create: `packages/memory/src/confidence.ts`
- Create: `packages/memory/src/memory-write.test.ts`
- Modify: `packages/shared/src/memory.ts`

**Step 1: Write the failing memory write test**
Test writing one fact, one decision, and one task summary into canonical JSON files with required metadata fields.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/memory --test-name-pattern "memory write"`
Expected: fail because file-store and writer do not exist.

**Step 3: Implement memory schemas and writer**
Create stable object builders and persist files into `.aegis/memory/facts`, `.aegis/memory/decisions`, and `.aegis/memory/task-summaries`.

**Step 4: Add confidence and status helpers**
Implement `tentative`, `probable`, `confirmed`, and `superseded` transitions.

**Step 5: Re-run the test**
Run: `bun test packages/memory --test-name-pattern "memory write"`
Expected: pass.

**Step 6: Commit**
`git add . && git commit -m "feat: add canonical memory writes"`

---

### Task 7: Add retrieval, linking, and supersession rules

**Files:**
- Create: `packages/memory/src/retrieve.ts`
- Create: `packages/memory/src/supersession.ts`
- Create: `packages/memory/src/ranking.ts`
- Create: `packages/memory/src/retrieve.test.ts`
- Modify: `packages/storage/src/migrations/0001_init.sql`
- Modify: `packages/shared/src/retrieval.ts`

**Step 1: Write the failing retrieval test**
Test that retrieval excludes superseded memories by default, returns provenance, and ranks explicit task-linked memory above semantic-only matches.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/memory --test-name-pattern "retrieval"`
Expected: fail because retrieval logic is missing.

**Step 3: Implement retrieval queries**
Support filters by task, files, recency, confidence, and include/exclude superseded behavior.

**Step 4: Implement supersession updates**
When a memory is superseded, update canonical file state and structured indexes so normal retrieval excludes it.

**Step 5: Re-run the test**
Run: `bun test packages/memory --test-name-pattern "retrieval"`
Expected: pass.

**Step 6: Commit**
`git add . && git commit -m "feat: add memory retrieval and supersession"`

---

### Task 8: Build the runtime mode loop and task session orchestration

**Files:**
- Create: `packages/runtime/src/index.ts`
- Create: `packages/runtime/src/session/runtime-session.ts`
- Create: `packages/runtime/src/session/mode-controller.ts`
- Create: `packages/runtime/src/session/context-builder.ts`
- Create: `packages/runtime/src/session/runtime-session.test.ts`
- Modify: `packages/shared/src/task.ts`

**Step 1: Write the failing runtime session test**
Cover starting a task in `Plan` mode, resuming it in `Build` mode, and ensuring only compact relevant memory is requested.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/runtime --test-name-pattern "runtime session"`
Expected: fail because session orchestration does not exist.

**Step 3: Implement the mode controller**
Create mode-specific flow wiring for `Plan`, `Build`, and `Review`.

**Step 4: Implement compact context assembly**
Attach task state, linked files, and retrieved memory without replaying full transcript history.

**Step 5: Re-run the test**
Run: `bun test packages/runtime --test-name-pattern "runtime session"`
Expected: pass.

**Step 6: Commit**
`git add . && git commit -m "feat: add runtime task orchestration"`

---

### Task 9: Add reviewer checkpoints and blocking verdicts

**Files:**
- Create: `packages/reviewer/src/index.ts`
- Create: `packages/reviewer/src/checkpoints.ts`
- Create: `packages/reviewer/src/verdicts.ts`
- Create: `packages/reviewer/src/reviewer.test.ts`
- Modify: `packages/shared/src/reviewer.ts`
- Modify: `packages/runtime/src/session/runtime-session.ts`

**Step 1: Write the failing reviewer test**
Cover checkpoint verdicts for plan approval, pre-commit review, and final completion blocking when verification is missing.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/reviewer`
Expected: fail because reviewer module is missing.

**Step 3: Implement reviewer contracts and checkpoint logic**
Return structured verdicts with blocking issues, non-blocking concerns, verification needs, and recommended next step.

**Step 4: Wire reviewer into runtime session boundaries**
Invoke reviewer after plan finalization, before commit-worthy completion, and before declaring done.

**Step 5: Re-run the test**
Run: `bun test packages/reviewer`
Expected: pass.

**Step 6: Commit**
`git add . && git commit -m "feat: add stage-gated reviewer"`

---

### Task 10: Implement scoped local tools and git actions

**Files:**
- Create: `packages/tools/src/index.ts`
- Create: `packages/tools/src/permissions.ts`
- Create: `packages/tools/src/files.ts`
- Create: `packages/tools/src/commands.ts`
- Create: `packages/tools/src/git.ts`
- Create: `packages/tools/src/browser.ts`
- Create: `packages/tools/src/tools.test.ts`
- Modify: `packages/shared/src/permissions.ts`
- Modify: `packages/shared/src/git.ts`

**Step 1: Write the failing tools test**
Cover allowed local read/edit/check operations, blocked destructive actions, and git branch/stage/commit behavior under scoped autonomy.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/tools`
Expected: fail because tools module does not exist.

**Step 3: Implement permission checks**
Create permission guards for local reads, local edits, local tests, git inspection, branch creation, staging, and commit actions.

**Step 4: Implement git service**
Support status, diff, current branch, branch creation, stage files, and commit.

**Step 5: Add browser verifier interface placeholder**
Define a stable interface for future Playwright integration, but return `unavailable` or `not-implemented` in this milestone.

**Step 6: Re-run the test**
Run: `bun test packages/tools`
Expected: pass.

**Step 7: Commit**
`git add . && git commit -m "feat: add tools permissions and git actions"`

---

### Task 11: Add inference provider contracts and subscription-backed adapter scaffold

**Files:**
- Create: `packages/inference/src/index.ts`
- Create: `packages/inference/src/provider.ts`
- Create: `packages/inference/src/openai-subscription.ts`
- Create: `packages/inference/src/roles.ts`
- Create: `packages/inference/src/inference.test.ts`
- Modify: `packages/runtime/src/session/runtime-session.ts`

**Step 1: Write the failing inference contract test**
Cover provider selection, role routing, and failure handling when the subscription session is unavailable.

**Step 2: Run the test to verify it fails**
Run: `bun test packages/inference`
Expected: fail because provider contracts do not exist.

**Step 3: Implement provider interfaces**
Define worker/reviewer/memory-manager request shapes and response envelopes.

**Step 4: Implement the OpenAI subscription-backed adapter scaffold**
Build the initial adapter boundary and session/auth persistence contract, even if some lower-level auth details remain iterative.

**Step 5: Re-run the test**
Run: `bun test packages/inference`
Expected: pass for contract behavior and failure handling.

**Step 6: Commit**
`git add . && git commit -m "feat: add inference provider scaffolding"`

---

### Task 12: Wire the desktop UI to runtime state and inspect surfaces

**Files:**
- Create: `apps/desktop/src/renderer/features/workstream/workstream.tsx`
- Create: `apps/desktop/src/renderer/features/tasks/tasks-panel.tsx`
- Create: `apps/desktop/src/renderer/features/memory/memory-panel.tsx`
- Create: `apps/desktop/src/renderer/features/git/git-panel.tsx`
- Create: `apps/desktop/src/renderer/features/inspect/inspect-panel.tsx`
- Create: `apps/desktop/src/renderer/features/browser/browser-panel.tsx`
- Create: `apps/desktop/src/renderer/features/session/use-session-state.ts`
- Modify: `apps/desktop/src/renderer/app.tsx`
- Modify: `apps/desktop/src/main/preload.ts`

**Step 1: Write the failing UI state test**
Test that the shell can render task state, linked memory, reviewer warnings, and git summary from a mocked runtime session.

**Step 2: Run the test to verify it fails**
Run: `bun test apps/desktop --test-name-pattern "shell state"`
Expected: fail because the panels and hooks do not exist.

**Step 3: Implement UI feature slices**
Wire the central workstream and side panels to runtime-derived state.

**Step 4: Keep inspectability first-class**
Ensure retrieved memories show why-selected info and reviewer warnings are visible without taking over the main chat surface.

**Step 5: Re-run the test**
Run: `bun test apps/desktop --test-name-pattern "shell state"`
Expected: pass.

**Step 6: Commit**
`git add . && git commit -m "feat: add runtime-backed desktop panels"`

---

### Task 13: Add end-to-end continuity tests

**Files:**
- Create: `packages/runtime/src/e2e/resume-flow.test.ts`
- Create: `packages/runtime/src/e2e/memory-recall.test.ts`
- Create: `packages/runtime/src/e2e/reviewer-gate.test.ts`

**Step 1: Write the failing continuity tests**
Cover: open repo, create task, persist memory, close session, reopen session, ask where work left off, and verify the answer comes from task state + memory rather than transcript replay.

**Step 2: Run the tests to verify they fail**
Run: `bun test packages/runtime/src/e2e`
Expected: fail because end-to-end orchestration behavior is incomplete.

**Step 3: Fill the missing glue**
Patch any missing wiring across storage, memory, runtime, reviewer, and tools until the continuity flows work.

**Step 4: Re-run the tests**
Run: `bun test packages/runtime/src/e2e`
Expected: pass.

**Step 5: Commit**
`git add . && git commit -m "test: add continuity and reliability e2e coverage"`

---

### Task 14: Final verification and repo hygiene

**Files:**
- Modify: `README.md`
- Create: `docs/plans/2026-03-23-aegis-reliability-mvp-design.md`
- Create: `docs/plans/2026-03-23-aegis-reliability-mvp-implementation.md`

**Step 1: Run the full quality suite**
Run: `bun test && bun run typecheck && bun run build`
Expected: all commands pass.

**Step 2: Run the app manually**
Run: `bun run dev --filter apps/desktop`
Expected: app launches, repo bootstrap works, panels render, and a simple task can be created and resumed.

**Step 3: Check git status for junk**
Run: `git status --short`
Expected: only intentional tracked files remain.

**Step 4: Commit the milestone**
`git add . && git commit -m "feat: ship aegis reliability mvp foundation"`

---

## Execution Notes

- Use TDD for each task; do not write implementation before the failing test exists.
- Keep commits small and boring.
- Do not build the real browser verifier yet; keep only the interface boundary.
- If the subscription-backed inference path becomes the bottleneck, keep the provider contract stable and continue the rest of the runtime first.
- Prefer precise memory retrieval over aggressive retrieval.
- Avoid prematurely building PR publication or remote review flows in this milestone.
