---
name: test
description: Generate unit tests for a file in a Next.js TypeScript project using bun:test. Accepts a file path, reads the source, creates focused tests covering happy path, edge cases, and error scenarios. Checks for an existing test file and only adds missing tests. Follows project conventions (bun:test, co-located .test.ts/.test.tsx files).
---

# Test Generator

Generates unit tests for Next.js TypeScript files using Bun's built-in test runner (`bun:test`).

## Usage

```
/test components/IssueCard.tsx
/test lib/store.ts
/test app/api/issues/route.ts
```

The path is relative to the project root (no leading `/` needed).

## Behavior

1. **Accepts a file path** — the user provides a path to a source file (e.g., `components/IssueCard.tsx`)
2. **Resolves the full path** — joins the project root with the provided path
3. **Reads the source file** — understands the logic, types, dependencies, and patterns
4. **Checks for an existing test file** — looks for `{basename}.test.ts` or `{basename}.test.tsx` next to the source
5. **If no test file exists** — creates one with comprehensive tests
6. **If a test file exists** — reads it, determines what's missing (untested functions, branches, scenarios), and adds only the missing test cases (never overwrites)
7. **Writes the test file** — co-located beside the source

## Test conventions

- Import from `bun:test`: `import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test"`
- `describe` blocks to group related tests
- Clear test names that describe the scenario and expected outcome (e.g., `"returns the issue when it exists"`)
- Happy path, edge cases, and error scenarios
- Mock external dependencies: `fetch`, `store`, database calls, Next.js response objects
- Mock `crypto.randomUUID()` for deterministic IDs in store tests
- For React components: render with `@testing-library/react` if available, or keep tests focused on pure logic extraction and event handling
- For API routes: test request/response behavior by invoking the handler directly with mock `Request` objects
- No snapshot testing
- Use `expect().toBe()` / `toEqual()` / `toThrow()` / `toBeNull()` / `toBeUndefined()`

## When to skip

- `globals.css`, `layout.tsx`, `page.tsx` — these are structural bootstrapping files with little testable logic
- `node_modules` files
- Test files themselves (`.test.ts` / `.test.tsx`)