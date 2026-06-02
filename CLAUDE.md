# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev        # Start the Next.js dev server (localhost:3000)
bun run build      # Production build
bun run start      # Start production server
bun run typecheck  # Run TypeScript type checking (tsc --noEmit)
bun test           # Run the IssueStore unit tests (via bun:test)
```

Dependencies are managed via **bun** (not npm). Run `bun install` before starting.

## Architecture

A minimal kanban issue tracker using **Next.js 15** (App Router) with **React 19**.

### Data flow (in-memory, no database)

Issues are stored in a singleton `IssueStore` class (`lib/store.ts`) backed by a `Map<string, Issue>`. The instance is persisted across Hot Module Replacement via `globalThis` to survive dev server restarts. Data is **ephemeral** — it resets on process restart and is seeded with 3 sample issues on first instantiation.

### Types (`lib/types.ts`)

- `Status`: `"backlog" | "todo" | "in_progress" | "done"`
- `Issue`: `{ id, title, description, status, order, createdAt }`
- `STATUSES`: canonical array of `{ key: Status; label: string }` — used to render columns, populate `<select>`, and validate route params.

### API routes (`app/api/`)

Standard Next.js App Router route handlers:

- `GET /api/issues` — list all issues (sorted by `order`)
- `POST /api/issues` — create an issue (`{ title, description?, status? }`); validates title is a non-empty string
- `GET /api/issues/:id` — get a single issue (404 if missing)
- `PATCH /api/issues/:id` — partially update an issue (404 if missing)
- `DELETE /api/issues/:id` — delete an issue (returns 204, 404 if missing)
- `PUT /api/columns/:status/reorder` — reorder issues within a column (`{ orderedIds: string[] }`); validates `:status` is a valid Status value

Route params use the `params: Promise<{...}>` pattern required by Next.js 15.

### Frontend (client components, `components/`)

- **Board** (`Board.tsx`) — top-level orchestrator: fetches issues on mount, manages drag-and-drop state via `@dnd-kit/core`, groups issues by status in a `Record<Status, Issue[]>`, provides the "add issue" form, and handles optimistic status updates with stale-response tracking via a ref. Contains the global `api<T>()` fetch wrapper.
- **Column** (`Column.tsx`) — a `Droppable` container for one status column. Renders a `SortableContext` with `verticalListSortingStrategy` for its child cards.
- **IssueCard** (`IssueCard.tsx`) — a single `Sortable` card with a title and a status-select `<select>`. Uses `onPointerDown` with `stopPropagation()` on the select to prevent drag interference.

### Drag-and-drop behavior

- `@dnd-kit/core` with `closestCorners` collision detection and a `PointerSensor` (4px activation threshold).
- Drag-over (`onDragOver`) moves an issue between columns optimistically in state (assigns max order + 1 in the target column).
- Drag-end (`onDragEnd`) persists the final order via `PUT /api/columns/:status/reorder`. Reverts to pre-drag snapshot on failure.
- `arrayMove` from `@dnd-kit/sortable` handles reordering within the same column.
- `ErrorBanner` dismissable component shows API failures.

### Styling

Plain CSS in `app/globals.css` (no CSS modules, no Tailwind classes despite the `tailwindcss` dependency in `package.json` — Tailwind PostCSS is configured but unused). 4-column grid layout for the board.

### Path alias

`@/` maps to the project root (`tsconfig.json` paths) — used in all imports.

## Testing

Unit tests are in `lib/store.test.ts` and **require bun** (uses `bun:test` — `describe`, `it`, `expect`, `beforeEach`). The test file exercises the IssueStore class through module-reimport isolation (fresh store per group via module cache busting) and monkey-patches `crypto.randomUUID` for deterministic IDs. Test groups cover: list (ordering), get (exists/missing), create (defaults, status, description, order assignment, persistence), update (title, missing issue, auto-order on status change, explicit order, mutation isolation), delete (exists/missing), reorder (order assignment, cross-column moves, unknown IDs), and HMR singleton reuse.