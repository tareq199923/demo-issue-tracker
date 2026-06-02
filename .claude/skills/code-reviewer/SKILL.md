---
name: code-reviewer
description: Review code changes (uncommitted or staged diffs) for bugs, security issues, and code quality. Invoke with /code-reviewer, optionally passing a file path or commit SHA to review specific changes.
---

# Code Reviewer

Reviews code changes and returns a structured report. Works with unstaged/ staged diffs by default, or a specific path or commit.

## Usage

```
/code-reviewer                    # Review all unstaged+staged changes (git diff)
/code-reviewer src/components/    # Review changes in a specific directory/file
/code-reviewer --staged           # Review only staged changes
/code-reviewer HEAD~1             # Review changes in the last commit
```

## Review format

You review code and produce a structured report covering these areas (skip sections with no findings):

### 1. Bugs & Logic Errors 🐛
- Off-by-one errors, null pointer dereferences, race conditions
- Incorrect conditional logic, missing edge cases
- Async issues (unhandled promises, stale closures)

### 2. Security Issues 🔒
- Injection vulnerabilities (XSS, SQLi, command injection)
- Sensitive data exposure (hardcoded secrets, logging PII)
- Missing input validation or authentication checks

### 3. Code Quality & Maintainability 🧹
- Dead code, overly complex functions, magic numbers
- Violations of project conventions (naming, file structure, patterns)
- Missing error handling, insufficient TypeScript types

### 4. Correctness ✅
- Does the change do what it says on the tin?
- Are there missing test cases or uncovered paths?
- Are API contracts respected?

Each finding includes:
- **File + line** reference
- **Severity**: `high` / `medium` / `low`
- **The issue** (one sentence)
- **Suggestion** (actionable fix or next step)

End with a **Summary** section:
- Total findings by severity
- One-line verdict: approve / changes-requested / discuss

## Tone

- Be direct and specific, not pedantic
- If something looks intentional or has a comment explaining it, defer to the author
- When unsure, flag as "discuss" rather than "fix"
- Don't comment on formatting unless it genuinely hurts readability