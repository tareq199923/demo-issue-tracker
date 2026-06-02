"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Issue, Status } from "@/lib/types";
import IssueCard from "./IssueCard";

interface Props {
  status: Status;
  label: string;
  issues: Issue[];
  onStatusChange: (id: string, status: Status) => void;
}

export default function Column({ status, label, issues, onStatusChange }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={`column ${isOver ? "over" : ""}`}>
      <h2>
        {label}
        <span className="count">{issues.length}</span>
      </h2>
      <SortableContext items={issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} onStatusChange={onStatusChange} />
        ))}
      </SortableContext>
      {issues.length === 0 && <div className="empty">No issues</div>}
    </div>
  );
}
