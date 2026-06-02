---
name: project-architecture
description: "In-memory kanban issue tracker using Next.js 15 App Router, React 19, @dnd-kit, plain CSS"
metadata:
  type: project
---

**Architecture:** Minimal kanban board with singleton `IssueStore` (Map-based, no database). Data is ephemeral -- resets on process restart. 3 seed issues on startup.

**Stack:** Next.js 15 (App Router), React 19, `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop, plain CSS in `app/globals.css` (Tailwind is listed as a dependency but not used in components -- only as PostCSS plugin).

**State pattern:** Single `useState<Issue[]>` in Board component. Column and IssueCard are presentational (receive props). Drag-and-drop uses optimistic local state updates before persisting via API calls. No global state library, no React Context.

**Notable patterns:**
- `api<T>()` generic fetch wrapper in Board.tsx -- wraps all API calls
- Next.js 15 `params: Promise<{...}>` pattern used in route handlers
- Store instance persisted via `globalThis` to survive HMR
- 4-column CSS Grid layout (backlog, todo, in_progress, done)

**Known gaps (identified in code review):**
- No input sanitization on issue title (XSS vector in title display)
- No error handling in API failure paths on frontend (silent failures, stale optimistic state)
- Drag-over `handleDragOver` reassigns `active.id` status optimistically but reorder request on drag-end may conflict with status already mutated by drag-over
- `reorder` route does not validate `status` param is a valid Status
- Race condition: multiple rapid drag events can cause stale closure reads of issues state
- Tailwind (`@tailwindcss/postcss`) listed as dependency but CSS is all plain -- unused dep