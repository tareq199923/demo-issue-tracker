# Issue Tracker — Claude Code Demo

A minimal kanban-style issue tracker built with **Next.js 15**, **React 19**, and **TypeScript**. This project was created by **Claude Code** to demonstrate its capabilities as an AI coding assistant.

## What We Built with Claude Code

This project was built from scratch using Claude Code (Anthropic's AI coding assistant). Claude Code helped with:

- **Full project scaffolding** — Initialized the Next.js project, configured TypeScript, and set up the project structure
- **Kanban board UI** — Built drag-and-drop columns using `@dnd-kit/core` and `@dnd-kit/sortable` with three components: Board, Column, and IssueCard
- **In-memory data store** — Created a singleton `IssueStore` class with full CRUD operations, persisted across HMR via `globalThis`
- **REST API routes** — Implemented 6 API endpoints (list, create, get, update, delete, reorder) following Next.js 15 App Router patterns with proper validation
- **Optimistic UI updates** — Added stale-response tracking, drag-and-drop with snapshots and revert-on-failure, and instant status changes via dropdown
- **Unit tests** — Wrote comprehensive `bun:test` tests covering all store operations with module-reimport isolation
- **CLAUDE.md** — Generated project documentation to guide future Claude Code sessions

## Setup

```bash
bun install
bun run dev
```

Open http://localhost:3000.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (localhost:3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run typecheck` | TypeScript type checking |
| `bun test` | Run unit tests |

## API

- `GET /api/issues` — List all issues
- `POST /api/issues` — Create an issue (`{ title, description?, status? }`)
- `GET /api/issues/:id` — Get a single issue
- `PATCH /api/issues/:id` — Update an issue
- `DELETE /api/issues/:id` — Delete an issue
- `PUT /api/columns/:status/reorder` — Reorder issues (`{ orderedIds: string[] }`)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, TypeScript
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Testing**: bun:test
- **Package Manager**: bun