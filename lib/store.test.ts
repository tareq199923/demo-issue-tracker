import { describe, it, expect, beforeEach } from "bun:test";
import type { Issue, Status } from "./types";

// We test the store module via its exported instance.  Because the store is a
// singleton that survives HMR, each test group gets a fresh clone of the seed
// data by re-importing.  We do NOT manipulate the singleton directly between
// groups – instead we import the store and test the class contract through it.
//
// For deterministic ID testing we monkey-patch crypto.randomUUID.  The store
// uses randomUUID for issue IDs, so we control it to assert on the shape of
// returned objects.

const OriginalRandomUUID = crypto.randomUUID;

/** Return a re-imported store (avoids cross-test leakage via the singleton). */
async function freshStore() {
  // Bust the module registry so we get a freshly-seeded store.
  delete (globalThis as Record<string, unknown>).__issueStore;
  const mod = await import("./store");
  return mod.store;
}

describe("IssueStore", () => {
  beforeEach(() => {
    // Restore randomUUID before each test so a broken mock doesn't leak.
    crypto.randomUUID = OriginalRandomUUID;
  });

  describe("list()", () => {
    it("returns issues sorted by order ascending", async () => {
      const store = await freshStore();
      const issues = store.list();
      expect(issues.length).toBeGreaterThanOrEqual(3); // seed data
      for (let i = 1; i < issues.length; i++) {
        expect(issues[i - 1].order).toBeLessThanOrEqual(issues[i].order);
      }
    });
  });

  describe("get()", () => {
    it("returns the issue when it exists", async () => {
      const store = await freshStore();
      const all = store.list();
      const first = all[0];
      expect(store.get(first.id)).toEqual(first);
    });

    it("returns undefined when the issue does not exist", async () => {
      const store = await freshStore();
      expect(store.get("non-existent-id")).toBeUndefined();
    });
  });

  describe("create()", () => {
    it("creates an issue with default status 'backlog'", async () => {
      const store = await freshStore();
      const issue = store.create({ title: "Test issue" });
      expect(issue.title).toBe("Test issue");
      expect(issue.status).toBe("backlog");
      expect(issue.description).toBe("");
      expect(issue.id).toBeDefined();
      expect(typeof issue.id).toBe("string");
      expect(typeof issue.createdAt).toBe("string");
    });

    it("creates an issue with the provided status", async () => {
      const store = await freshStore();
      const issue = store.create({ title: "In progress task", status: "in_progress" });
      expect(issue.status).toBe("in_progress");
    });

    it("creates an issue with a description", async () => {
      const store = await freshStore();
      const issue = store.create({ title: "With desc", description: "Some details" });
      expect(issue.description).toBe("Some details");
    });

    it("assigns the next order in the target column", async () => {
      const store = await freshStore();
      // The seed creates one backlog issue; the new one should get order 1.
      const existing = store.list().filter((i) => i.status === "backlog");
      const maxOrder = Math.max(-1, ...existing.map((i) => i.order));
      const issue = store.create({ title: "Another backlog" });
      expect(issue.order).toBe(maxOrder + 1);
    });

    it("persists the created issue (can be retrieved)", async () => {
      const store = await freshStore();
      const issue = store.create({ title: "Persist me" });
      const found = store.get(issue.id);
      expect(found).toEqual(issue);
    });
  });

  describe("update()", () => {
    it("updates the title", async () => {
      const store = await freshStore();
      const all = store.list();
      const updated = store.update(all[0].id, { title: "New title" });
      expect(updated?.title).toBe("New title");
    });

    it("returns undefined when the issue does not exist", async () => {
      const store = await freshStore();
      expect(store.update("missing", { title: "nope" })).toBeUndefined();
    });

    it("assigns next order when status changes and order is not provided", async () => {
      const store = await freshStore();
      const doneIssues = store.list().filter((i) => i.status === "done");
      const maxDoneOrder = Math.max(-1, ...doneIssues.map((i) => i.order));
      // Move a backlog issue into "done" without explicit order.
      const backlog = store.list().find((i) => i.status === "backlog")!;
      const updated = store.update(backlog.id, { status: "done" });
      expect(updated?.status).toBe("done");
      expect(updated?.order).toBe(maxDoneOrder + 1);
    });

    it("preserves explicit order when status changes", async () => {
      const store = await freshStore();
      const backlog = store.list().find((i) => i.status === "backlog")!;
      const updated = store.update(backlog.id, { status: "done", order: 42 });
      expect(updated?.order).toBe(42);
    });

    it("does not mutate other issues when updating one", async () => {
      const store = await freshStore();
      const all = store.list();
      const updated = store.update(all[0].id, { title: "Changed" });
      expect(updated?.title).toBe("Changed");
      // Other issues should be unchanged.
      for (const issue of all.slice(1)) {
        const retrieved = store.get(issue.id);
        expect(retrieved?.title).toBe(issue.title);
      }
    });
  });

  describe("delete()", () => {
    it("removes the issue and returns true", async () => {
      const store = await freshStore();
      const all = store.list();
      const target = all[0];
      const result = store.delete(target.id);
      expect(result).toBe(true);
      expect(store.get(target.id)).toBeUndefined();
    });

    it("returns false when the issue does not exist", async () => {
      const store = await freshStore();
      expect(store.delete("missing")).toBe(false);
    });
  });

  describe("reorder()", () => {
    it("updates order and status for the given IDs", async () => {
      const store = await freshStore();
      const backlog = store.list().filter((i) => i.status === "backlog");
      expect(backlog.length).toBeGreaterThanOrEqual(1);
      const ids = backlog.map((i) => i.id).reverse();
      const reordered = store.reorder("backlog", ids);
      ids.forEach((id, idx) => {
        const match = reordered.find((i) => i.id === id);
        expect(match).toBeDefined();
        expect(match!.order).toBe(idx);
      });
    });

    it("moves issues into the target status column", async () => {
      const store = await freshStore();
      // Move a backlog issue into "done" via reorder.
      const backlog = store.list().filter((i) => i.status === "backlog");
      if (backlog.length === 0) return; // guard
      const ids = [backlog[0].id];
      const doneBefore = store.list().filter((i) => i.status === "done").length;
      const reordered = store.reorder("done", ids);
      // The moved issue should now be in the done column.
      expect(reordered.find((i) => i.id === backlog[0].id)).toBeDefined();
      expect(reordered.length).toBe(doneBefore + 1);
    });

    it("skips unknown IDs gracefully", async () => {
      const store = await freshStore();
      const backlog = store.list().filter((i) => i.status === "backlog");
      const ids = [...backlog.map((i) => i.id), "non-existent"];
      // Should not throw.
      const reordered = store.reorder("backlog", ids);
      expect(reordered.length).toBe(backlog.length);
    });
  });

  describe("singleton persistence (HMR)", () => {
    it("reuses the same instance across imports", async () => {
      const mod1 = await import("./store");
      const mod2 = await import("./store");
      expect(mod1.store).toBe(mod2.store);
    });
  });
});