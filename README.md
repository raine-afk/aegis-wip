# Aegis

> Aegis remembers your project across sessions and uses that memory to produce more reliable outputs.

Aegis is a desktop-first coding agent built for long-running software work. The Reliability MVP focuses on the boring stuff that actually matters: durable task state, quiet project memory, stage-gated review, and inspectable local execution.

## MVP scope

This repository bootstraps the monorepo foundation for:

- an Electron desktop app shell
- shared TypeScript contracts
- repo-local `.aegis/` state bootstrap
- canonical memory storage and retrieval
- runtime orchestration for Plan / Build / Review modes
- stage-gated reviewer logic
- scoped local tools and git actions
- inference provider boundaries
- shared UI primitives

## Repository layout

```text
apps/
  desktop/        Electron main process + React renderer
packages/
  shared/         Stable domain contracts and shared types
  storage/        .aegis bootstrap, paths, SQLite helpers
  memory/         Memory schemas, writes, retrieval, supersession
  runtime/        Task lifecycle and visible Aegis orchestration
  tools/          Local file, command, git, and browser tool boundaries
  reviewer/       Checkpoint review logic and verdicts
  inference/      Provider contracts and model routing
  ui/             Shared UI primitives for desktop surfaces
docs/
  plans/          Product design and implementation plans
```

## Workspace commands

The root workspace is intentionally minimal right now:

- `bun run dev`
- `bun run build`
- `bun run test`
- `bun run lint`
- `bun run typecheck`

Those commands are placeholders during bootstrap and will be replaced with real pipelines as each package lands.

## Getting started

1. Install Bun.
2. Run `bun install` at the repo root.
3. Build out each workspace task-by-task.

That’s it. No fake complexity, no premature runtime logic.
