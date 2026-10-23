import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";
const fields = {
  title: z.string().trim().min(1, "Informe o título.").max(200),
  observations: z.string().trim().max(40000),
  assignee_id: z.string().uuid().nullable(),
};
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Informe uma data do evento válida.");
const draftSchema = z
  .object({
    ...fields,
    category: z.enum(["art", "daily"]),
    status: z.enum(["pending", "completed"]),
    group_id: z.string().uuid().nullable(),
  })
  .refine(
    (draft) => (draft.category === "art" ? Boolean(draft.group_id) : draft.group_id === null),
    "Selecione a tarefa principal.",
  );
export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid().nullable(), draft: draftSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "tasks", data.id ? "edit" : "create");
    if (data.draft.assignee_id) {
      const { data: choices, error } = await context.supabase.rpc("task_assignee_options");
      if (error || !choices?.some((person) => person.id === data.draft.assignee_id))
        throw new Error("Selecione um responsável da equipe interna.");
    }
    if (data.draft.group_id) {
      const { data: group, error } = await context.supabase
        .from("task_groups")
        .select("id")
        .eq("id", data.draft.group_id)
        .single();
      if (error || !group) throw new Error("A tarefa principal não está mais disponível.");
    }
    const response = data.id
      ? await context.supabase
          .from("tasks")
          .update(data.draft)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabase
          .from("tasks")
          .insert({ ...data.draft, created_by: context.userId })
          .select("id")
          .single();
    if (response.error)
      throw new Error(
        "Não foi possível salvar a tarefa. Verifique suas permissões e tente novamente.",
      );
    return response.data;
  });
export const saveTaskGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().nullable(),
        draft: z.object({ ...fields, event_date: dateSchema }),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "tasks", data.id ? "edit" : "create");
    if (data.draft.assignee_id) {
      const { data: choices, error } = await context.supabase.rpc("task_assignee_options");
      if (error || !choices?.some((person) => person.id === data.draft.assignee_id))
        throw new Error("Selecione um responsável da equipe interna.");
    }
    const response = data.id
      ? await context.supabase
          .from("task_groups")
          .update(data.draft)
          .eq("id", data.id)
          .select("id")
          .single()
      : await context.supabase
          .from("task_groups")
          .insert({ ...data.draft, created_by: context.userId })
          .select("id")
          .single();
    if (response.error) throw new Error("Não foi possível salvar a tarefa principal.");
    return response.data;
  });
export const changeTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["pending", "completed"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "tasks", "edit");
    const response = await context.supabase
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id)
      .select("id")
      .single();
    if (response.error) throw new Error("Não foi possível alterar o status da tarefa.");
    return response.data;
  });
export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), kind: z.enum(["task", "group"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "tasks", "delete");
    const response = await context.supabase
      .from(data.kind === "group" ? "task_groups" : "tasks")
      .delete()
      .eq("id", data.id)
      .select("id")
      .single();
    if (response.error) throw new Error("Não foi possível excluir a tarefa.");
    return response.data;
  });
