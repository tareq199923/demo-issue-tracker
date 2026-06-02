"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Issue, Status } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import Column from "./Column";

const STATUS_KEYS = STATUSES.map((s) => s.key);

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed`);
  return res.status === 204 ? (undefined as T) : res.json();
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Dismiss">&times;</button>
    </div>
  );
}

export default function Board() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which issue status updates are in-flight so we can ignore stale responses.
  const pendingStatusRef = useRef<Map<string, number>>(new Map());
  const dragStartSnapshot = useRef<Issue[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  useEffect(() => {
    api<Issue[]>("/api/issues").then((data) => {
      setIssues(data);
      setLoading(false);
    });
  }, []);

  const byStatus = useMemo(() => {
    const map: Record<Status, Issue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
    };
    [...issues]
      .sort((a, b) => a.order - b.order)
      .forEach((i) => map[i.status].push(i));
    return map;
  }, [issues]);

  const findContainer = (id: string): Status | undefined => {
    if (STATUS_KEYS.includes(id as Status)) return id as Status;
    return issues.find((i) => i.id === id)?.status;
  };

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setTitle("");
    setError(null);
    try {
      const created = await api<Issue>("/api/issues", {
        method: "POST",
        body: JSON.stringify({ title: value, status: "backlog" }),
      });
      setIssues((prev) => [...prev, created]);
    } catch {
      // Restore the title so the user doesn't lose their input.
      setTitle(value);
      setError("Failed to create issue. Check your connection and try again.");
    }
  }

  async function handleStatusChange(id: string, newStatus: Status) {
    setError(null);

    // Save the old status so we can revert if the request fails.
    const prevStatus = issues.find((i) => i.id === id)?.status;
    // Optimistically apply the new status so the UI feels instant.
    setIssues((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)),
    );

    // Track this request to ignore stale responses.
    const token = Date.now();
    pendingStatusRef.current.set(id, token);

    try {
      const updated = await api<Issue>(`/api/issues/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      // Only apply if this is still the latest request for this issue.
      if (pendingStatusRef.current.get(id) === token) {
        setIssues((prev) => prev.map((i) => (i.id === id ? updated : i)));
      }
    } catch {
      // Revert optimistic update on failure, but only if no newer request has superseded it.
      if (pendingStatusRef.current.get(id) === token && prevStatus) {
        setIssues((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: prevStatus } : i)),
        );
      }
      setError("Failed to update status. Check your connection and try again.");
    } finally {
      if (pendingStatusRef.current.get(id) === token) {
        pendingStatusRef.current.delete(id);
      }
    }
  }

  function handleDragStart(_event: DragStartEvent) {
    dragStartSnapshot.current = issues;
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const from = findContainer(active.id as string);
    const to = findContainer(over.id as string);
    if (!from || !to || from === to) return;

    setIssues((prev) => {
      const moving = prev.find((i) => i.id === active.id);
      if (!moving) return prev;
      const maxOrder = Math.max(-1, ...prev.filter((i) => i.status === to).map((i) => i.order));
      return prev.map((i) =>
        i.id === active.id ? { ...i, status: to, order: maxOrder + 1 } : i,
      );
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      setIssues(dragStartSnapshot.current);
      return;
    }
    const to = findContainer(over.id as string);
    if (!to) {
      setIssues(dragStartSnapshot.current);
      return;
    }

    let column = byStatus[to];
    const fromIdx = column.findIndex((i) => i.id === active.id);
    const toIdx = column.findIndex((i) => i.id === over.id);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      column = arrayMove(column, fromIdx, toIdx);
    }

    const orderedIds = column.map((i) => i.id);
    const snapshot = issues;
    setIssues((prev) =>
      prev.map((i) => {
        const idx = orderedIds.indexOf(i.id);
        return idx === -1 ? i : { ...i, status: to, order: idx };
      }),
    );

    try {
      await api(`/api/columns/${to}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ orderedIds }),
      });
    } catch {
      setIssues(snapshot);
      setError("Failed to save the new order. Reverted to the previous order.");
    }
  }

  return (
    <>
      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      <form className="new-issue" onSubmit={handleAdd}>
        <input
          placeholder="Add a new issue..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" disabled={!title.trim()}>
          Add
        </button>
      </form>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="board">
            {STATUSES.map((s) => (
              <Column
                key={s.key}
                status={s.key}
                label={s.label}
                issues={byStatus[s.key]}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </DndContext>
      )}
    </>
  );
}
