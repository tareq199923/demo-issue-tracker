import type { Issue, Status } from "./types";

class IssueStore {
  private issues = new Map<string, Issue>();

  constructor() {
    this.seed();
  }

  list(): Issue[] {
    return [...this.issues.values()].sort((a, b) => a.order - b.order);
  }

  get(id: string): Issue | undefined {
    return this.issues.get(id);
  }

  create(input: { title: string; description?: string; status?: Status }): Issue {
    const status = input.status ?? "backlog";
    const issue: Issue = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? "",
      status,
      order: this.nextOrder(status),
      createdAt: new Date().toISOString(),
    };
    this.issues.set(issue.id, issue);
    return issue;
  }

  update(
    id: string,
    patch: Partial<Pick<Issue, "title" | "description" | "status" | "order">>,
  ): Issue | undefined {
    const issue = this.issues.get(id);
    if (!issue) return undefined;
    if (patch.status && patch.status !== issue.status && patch.order === undefined) {
      patch.order = this.nextOrder(patch.status);
    }
    Object.assign(issue, patch);
    return issue;
  }

  delete(id: string): boolean {
    return this.issues.delete(id);
  }

  reorder(status: Status, orderedIds: string[]): Issue[] {
    orderedIds.forEach((id, idx) => {
      const issue = this.issues.get(id);
      if (issue) {
        issue.status = status;
        issue.order = idx;
      }
    });
    return this.list().filter((i) => i.status === status);
  }

  private nextOrder(status: Status): number {
    const col = [...this.issues.values()].filter((i) => i.status === status);
    return col.length === 0 ? 0 : Math.max(...col.map((i) => i.order)) + 1;
  }

  private seed() {
    this.create({ title: "Set up project skeleton", status: "done" });
    this.create({ title: "Design board layout", status: "in_progress" });
    this.create({ title: "Write API routes", status: "todo" });
  }
}

// Persist a single instance across Next.js dev hot-reloads.
const globalForStore = globalThis as unknown as { __issueStore?: IssueStore };
export const store = globalForStore.__issueStore ?? new IssueStore();
if (process.env.NODE_ENV !== "production") globalForStore.__issueStore = store;
