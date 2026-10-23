import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskGroup = Database["public"]["Tables"]["task_groups"]["Row"];
export type TaskCategory = "art" | "daily";
export type TaskStatus = "pending" | "completed";
export type BoardItem = {
  id: string;
  title: string;
  observations: string;
  assignee_id: string | null;
  date: string | null;
  status: TaskStatus;
  progress?: { completed: number; total: number };
};
export const taskQueryKey = ["tasks"] as const;
export const groupQueryKey = ["task-groups"] as const;
export async function loadTasks() {
  const rows: Task[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) break;
  }
  return rows;
}
export async function loadTaskGroups() {
  const rows: TaskGroup[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("task_groups")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) break;
  }
  return rows;
}
export async function loadTaskOptions() {
  const { data, error } = await supabase.rpc("task_assignee_options");
  if (error) throw error;
  return { assignees: data };
}
export function groupProgress(children: Task[]) {
  const completed = children.filter((task) => task.status === "completed").length;
  return {
    completed,
    total: children.length,
    status:
      children.length > 0 && completed === children.length
        ? ("completed" as const)
        : ("pending" as const),
  };
}
export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export const taskDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
