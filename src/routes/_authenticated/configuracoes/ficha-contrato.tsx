import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { normalizeRecipientPhone } from "@/lib/client-intake";
import { TravelSettingsSection } from "@/components/travel-settings-section";

export const Route = createFileRoute("/_authenticated/configuracoes/ficha-contrato")({
  head: () => ({ meta: [{ title: "Ficha de contrato — Magic Moments" }, { name: "description", content: "Endereço base do deslocamento e números de WhatsApp avisados sobre novas fichas." }, { property: "og:title", content: "Ficha de contrato — Magic Moments" }, { property: "og:description", content: "Configurações da ficha de contrato." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ContractSettings,
});

function ContractSettings() {
  const { can } = useCurrentUser();
  const canEdit = can("settings", "edit");
  const cache = useQueryClient();
  const recipients = useQuery({ queryKey: ["whatsapp-recipients-all"], queryFn: async () => { const r = await supabase.from("whatsapp_notification_recipients").select("id,name,phone,active").order("name"); if (r.error) throw r.error; return r.data; } });
  const refresh = () => { void cache.invalidateQueries({ queryKey: ["whatsapp-recipients-all"] }); void cache.invalidateQueries({ queryKey: ["whatsapp-recipients"] }); };
  const [recipient, setRecipient] = useState({ name: "", phone: "" });
  const run = (fn: () => PromiseLike<{ error: unknown }>, ok: string) => async () => { const r = await fn(); if (r.error) throw new Error("Não foi possível salvar. Confira os dados e suas permissões."); toast.success(ok); refresh(); };
  const addRecipient = useMutation({ mutationFn: async () => {
    const phone = normalizeRecipientPhone(recipient.phone); const name = recipient.name.trim();
    if (name.length < 2 || !phone) throw new Error("Informe nome e WhatsApp com DDD.");
    await run(() => supabase.from("whatsapp_notification_recipients").insert({ name, phone }), "Número adicionado.")();
    setRecipient({ name: "", phone: "" });
  }, onError: (e: Error) => toast.error(e.message) });
  const act = (fn: () => PromiseLike<{ error: unknown }>, ok: string) => run(fn, ok)().catch((e: Error) => toast.error(e.message));
  return <AppShell>
    <PageHeader title="Ficha de contrato" description="Endereço base do deslocamento e quem recebe o aviso de nova ficha." />
    <div className="grid gap-10 lg:grid-cols-2">
      <TravelSettingsSection canEdit={canEdit} />
      <section className="space-y-4"><h2 className="border-b border-border pb-2 font-semibold">Avisos de WhatsApp</h2>
        <p className="text-sm text-muted-foreground">Quando um cliente envia a ficha, aparece em Clientes um botão para avisar cada número ativo. O envio automático será ativado quando o serviço de mensagens for escolhido.</p>
        {canEdit && <form className="flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); addRecipient.mutate(); }}><Input aria-label="Nome" placeholder="Nome" maxLength={100} value={recipient.name} onChange={e => setRecipient({ ...recipient, name: e.target.value })} /><Input aria-label="WhatsApp" placeholder="(11) 99999-0000" inputMode="tel" value={recipient.phone} onChange={e => setRecipient({ ...recipient, phone: e.target.value })} /><Button type="submit" disabled={addRecipient.isPending}><Plus className="size-4" />Adicionar</Button></form>}
        {recipients.isPending ? <p className="text-sm text-muted-foreground">Carregando…</p> : (recipients.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum número cadastrado.</p> :
          <ul className="divide-y divide-border">{recipients.data?.map(item => <li key={item.id} className="flex items-center justify-between gap-3 py-3"><div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">+{item.phone}</p></div><div className="flex items-center gap-2"><Switch aria-label={`Ativar ${item.name}`} disabled={!canEdit} checked={item.active} onCheckedChange={v => act(() => supabase.from("whatsapp_notification_recipients").update({ active: v }).eq("id", item.id), "Número atualizado.")} />{canEdit && <Button size="icon" variant="ghost" aria-label={`Remover ${item.name}`} onClick={() => act(() => supabase.from("whatsapp_notification_recipients").delete().eq("id", item.id), "Número removido.")}><Trash2 className="size-4" /></Button>}</div></li>)}</ul>}
      </section>
    </div>
  </AppShell>;
}
