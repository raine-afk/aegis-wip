# Aegis Reliability MVP Design

**Date:** 2026-03-23
**Status:** Approved for planning
**Product target:** Reliability MVP for the real Aegis v1

## Goal

Build the first version of Aegis that actually feels like Aegis: a desktop-first coding agent with quiet cross-session project memory, resumable task state, and stage-gated self-correction.

## Locked Decisions

- Start from a **fresh repo**; the previous Aegis codebase was deleted as legacy.
- Build the **Reliability MVP** first, not the full long-term v1.
- Use **light local git actions** in the MVP:
  - status
  - diff
  - branch context
  - create branch
  - stage changes
  - commit
- Use **OpenAI subscription-backed GPT inference** as the primary inference path.
- Store project state in a repo-local, gitignored **`.aegis/` folder**.
- Use **hybrid storage**:
  - canonical human-readable memory files
  - **SQLite** for indexes, task graph state, provenance links, ranking metadata, and bookkeeping
- Handle browser automation as **interfaces now, real flows later**.
- Use a **monorepo with clear modules**, not a tangled single app and not a separate daemon in v1.

## Product Promise

> Aegis remembers your project across sessions and uses that memory to produce more reliable outputs.

## Concrete MVP Scope

### In scope

- Electron desktop shell for macOS/Linux
- React renderer with one visible `aegis` agent experience
- Explicit user modes: `Plan`, `Build`, `Review`
- Local repo bootstrap and `.aegis/` state creation
- Task graph persistence with resumable threads
- Durable memory objects:
  - facts
  - decisions
  - task summaries
- Event-driven memory writing at key boundaries
- Silent, compact retrieval with inspectable reasons
- Stage-gated reviewer:
  - after planning
  - before commit-worthy completion
  - final completion gate
- Local tool execution with scoped autonomy
- Local git read + branch/stage/commit actions
- Inspect surfaces for memory/reviewer traces
- Local logs only

### Explicitly deferred from this milestone

- Full browser verification flows
- Playwright artifact UI beyond interface placeholders
- GitHub/GitLab PR publication flows
- Multi-repo workspaces
- Cloud sync
- Team sync
- BYOK-first provider support
- Windows polish

## Proposed Technical Shape

## Repo layout

```text
/aegis
  /apps
    /desktop
  /packages
    /shared
    /storage
    /memory
    /runtime
    /tools
    /reviewer
    /inference
    /ui
  /docs/plans
```

### Module responsibilities

#### `apps/desktop`
- Electron main process
- React renderer
- IPC wiring
- app shell, side panels, command surfaces

#### `packages/shared`
- public contracts and stable types
- task, memory, reviewer, retrieval, permissions, git state shapes

#### `packages/storage`
- `.aegis/` bootstrap
- path helpers
- SQLite connection and migrations
- file persistence helpers for canonical memory artifacts

#### `packages/memory`
- memory object schemas
- write pipeline
- confidence and supersession rules
- retrieval and ranking rules

#### `packages/runtime`
- visible Aegis orchestration loop
- mode handling
- task lifecycle
- task-memory linking
- checkpoint scheduling

#### `packages/tools`
- local file/system command abstraction
- permission checks
- git actions
- browser-verifier interface contract

#### `packages/reviewer`
- stage-gated review logic
- structured verdict output
- completion blocking rules

#### `packages/inference`
- provider interface
- OpenAI subscription-backed adapter
- model role mapping for worker/reviewer/memory-manager behavior

#### `packages/ui`
- shared UI primitives specific to Aegis panels and inspect views

## App Flow

1. User opens a repo.
2. Aegis ensures `.aegis/` exists and initializes SQLite + canonical folders.
3. User starts or resumes a task in `Plan`, `Build`, or `Review` mode.
4. Runtime fetches compact relevant memory only when needed.
5. Runtime performs work using allowed local tools.
6. Reviewer intervenes at checkpoint boundaries.
7. Task state, summaries, and memory artifacts are written back to `.aegis/`.
8. User can inspect why memory or reviewer decisions influenced the outcome.

## `.aegis/` Contract

```text
.aegis/
  memory/
    facts/
    decisions/
    task-summaries/
  tasks/
  index/
  logs/
  browser/
  config/
  aegis.db
```

## Stable Domain Contracts

### Memory object base

- `id`
- `type`
- `title`
- `summary`
- `status`
- `confidence`
- `provenance`
- `sourceRefs`
- `createdAt`
- `updatedAt`
- `supersedes`
- `supersededBy`
- `tags`
- `relatedFiles`
- `relatedTasks`

### Task object base

- `id`
- `title`
- `goal`
- `mode`
- `status`
- `createdAt`
- `updatedAt`
- `linkedMemoryIds`
- `linkedIssueOrPr`
- `relatedFiles`
- `planSnapshot`
- `completionSummary`
- `resumeHints`

### Reviewer output

- `verdict`
- `blockingIssues`
- `nonBlockingConcerns`
- `needsVerification`
- `memoryWarnings`
- `recommendedNextStep`

## Behavior Rules

### Memory
- Do not preload the whole project memory base.
- Retrieve only when the current task, files, or request justify it.
- Prefer under-retrieval to noisy retrieval.
- If repo truth or latest user instruction conflicts with memory, memory loses.
- Never hard-delete stale memory; supersede it.

### Reviewer
- Reviewer is checkpoint-based, not continuously shadowing.
- Reviewer can block completion claims.
- Reviewer must flag stale-memory-driven mistakes and unverified claims.

### Permissions
- Allow local reads, edits, tests, build/check commands, and git inspection by default.
- Require confirmation for destructive operations and unusual external actions.
- Keep permission modes extensible.

## Concrete Implementation Choices

- Package manager/runtime: **Bun**
- UI app: **Electron + React + TypeScript**
- Renderer build tooling: **Vite**
- Database: **SQLite**
- Memory artifacts: **JSON files** grouped by type inside `.aegis/memory/`
- Tests:
  - unit/integration via Bun test
  - targeted end-to-end later once shell and resume flows exist

## Biggest Risks

1. **Subscription-backed GPT inference** may be technically awkward compared with BYOK APIs.
2. Memory quality can turn to sludge if write rules are loose.
3. Electron/main/renderer coupling can become spaghetti if IPC contracts are not kept strict.
4. Reviewer logic can become noisy if checkpoints are too frequent or poorly scoped.

## Design Principle

Aegis should feel like **one competent agent with a memory**, not a visible circus of helpers.
