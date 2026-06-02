export type Status = "backlog" | "todo" | "in_progress" | "done";

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: Status;
  order: number;
  createdAt: string;
}

export const STATUSES: { key: Status; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];
