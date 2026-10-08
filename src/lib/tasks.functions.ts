import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertCan } from "@/lib/admin.server";

const draftSchema = z.object({
  category: z.enum(["art", "daily"]), status: z.enum(["pending", "completed"]),
  title: z.string().trim().min(1, "Informe o título da tarefa.").max(200),
  description: z.string().trim().max(20000), observations: z.string().trim().max(20000),
  client_id: z.string().uuid().nullable(), assignee_id: z.string().uuid().nullable(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Informe um prazo válido.").nullable(),
}).refine((data) => data.category !== "art" || data.client_id !== null, "Selecione o cliente da validação de arte.");

export const saveTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid().nullable(), draft: draftSchema }).parse(data))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "tasks", data.id ? "edit" : "create");
    if (data.draft.assignee_id) {
      const { data: choices, error } = await context.supabase.rpc("task_assignee_options");
      if (error) throw new Error("Não foi possível verificar o responsável.");
      if (!choices.some((person) => person.id === data.draft.assignee_id)) throw new Error("Selecione um responsável da equipe interna.");
    }
    const response = data.id
      ? await context.supabase.from("tasks").update(data.draft).eq("id", data.id).select("id").single()
      : await context.supabase.from("tasks").insert({ ...data.draft, created_by: context.userId }).select("id").single();
    if (response.error) throw new Error(response.error.code === "23503" ? "O cliente ou responsável não está mais disponível. Atualize e tente novamente." : "Não foi possível salvar a tarefa. Verifique suas permissões e tente novamente.");
    return response.data;
  });

export const changeTaskStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "completed"]) }).parse(data))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "tasks", "edit");
    const response = await context.supabase.from("tasks").update({ status: data.status }).eq("id", data.id).select("id").single();
    if (response.error) throw new Error("Não foi possível alterar o status da tarefa. Tente novamente.");
    return response.data;
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertCan(context.supabase, "tasks", "delete");
    const response = await context.supabase.from("tasks").delete().eq("id", data.id).select("id").single();
    if (response.error) throw new Error("Não foi possível excluir a tarefa. Tente novamente.");
    return response.data;
  });