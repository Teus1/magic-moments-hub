import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskCategory = "art" | "daily";
export type TaskStatus = "pending" | "completed";
export const taskQueryKey = ["tasks"] as const;

export async function loadTasks() {
  const rows: Task[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) break;
  }
  return rows;
}

export async function loadTaskOptions() {
  const [clients, assignees] = await Promise.all([supabase.rpc("task_client_options"), supabase.rpc("task_assignee_options")]);
  if (clients.error) throw clients.error;
  if (assignees.error) throw assignees.error;
  return { clients: clients.data, assignees: assignees.data };
}

export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export const taskDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");