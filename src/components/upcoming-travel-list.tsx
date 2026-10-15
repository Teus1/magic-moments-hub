import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { computeEventTravel } from "@/lib/event-travel.functions";
import { eventDestination, eventTravelTotal, isEstimateStale } from "@/lib/event-travel";
import { formatCurrency, formatEventDate } from "@/lib/events";
import { parseCurrencyInput } from "@/lib/events";
import { currentMonth, monthBounds, shiftMonth } from "@/lib/dashboard-finance";

export function UpcomingTravelList() {
  const cache = useQueryClient();
  const compute = useServerFn(computeEventTravel);
  const [busy, setBusy] = useState<string[]>([]);
  const [month, setMonth] = useState(() => currentMonth());
  const tried = useRef(new Set<string>());
  const settings = useQuery({ queryKey: ["travel-settings"], queryFn: async () => { const r = await supabase.from("travel_settings").select("base_address,efficiency_km_l,fuel_price").maybeSingle(); if (r.error) throw r.error; return r.data; } });
  const events = useQuery({ queryKey: ["travel-events", month], queryFn: async () => {
    const bounds = monthBounds(month);
    const fetchPage = (offset: number) => supabase.from("events").select("id,name,event_date,start_time,venue,address,venue_city,venue_state,clients(full_name),event_collaborators(collaborators(full_name))").eq("status", "planned").gte("event_date", bounds.start).lte("event_date", bounds.end).order("event_date").order("start_time").order("id").range(offset, offset + 499);
    const first = await fetchPage(0); if (first.error) throw first.error;
    const rows = [...first.data];
    for (let offset = 500; rows.length === offset; offset += 500) { const next = await fetchPage(offset); if (next.error) throw next.error; rows.push(...next.data); if (next.data.length < 500) break; }
    return rows;
  } });
  const estimates = useQuery({ queryKey: ["travel-estimates"], queryFn: async () => { const r = await supabase.from("event_travel_estimates").select("*").limit(1000); if (r.error) throw r.error; return r.data; } });
  const origin = settings.data?.base_address?.trim() ?? "";
  const byId = new Map((estimates.data ?? []).map(e => [e.event_id, e]));

  async function run(ids: string[], announce = false) {
    if (!ids.length) return;
    setBusy(b => [...b, ...ids]);
    try {
      for (let i = 0; i < ids.length; i += 5) {
        const res = await compute({ data: { eventIds: ids.slice(i, i + 5) } });
        if (announce && res.failures.length) toast.error("Não foi possível calcular o trajeto deste evento.");
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao calcular."); }
    finally { setBusy(b => b.filter(id => !ids.includes(id))); void cache.invalidateQueries({ queryKey: ["travel-estimates"] }); }
  }

  useEffect(() => {
    if (!events.data || !estimates.data || origin.length < 5) return;
    const pending = events.data.filter(ev => { const dest = eventDestination(ev); return dest && !tried.current.has(ev.id) && isEstimateStale(byId.get(ev.id), origin, dest); }).map(ev => ev.id);
    pending.forEach(id => tried.current.add(id));
    void run(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.data, estimates.data, origin]);

  async function saveManualToll(eventId: string, raw: string) {
    const value = raw.trim() ? parseCurrencyInput(raw) : null;
    const r = await supabase.from("event_travel_estimates").update({ manual_toll: value }).eq("event_id", eventId);
    if (r.error) toast.error("Não foi possível salvar o pedágio."); else void cache.invalidateQueries({ queryKey: ["travel-estimates"] });
  }

  const efficiency = Number(settings.data?.efficiency_km_l ?? 0);
  const price = Number(settings.data?.fuel_price ?? 0);

  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
      <div><h2 className="font-display text-xl">Eventos por mês</h2><p className="text-xs text-muted-foreground">Planejamento dos deslocamentos da equipe</p></div>
      <div className="flex items-center gap-1"><Button type="button" size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => setMonth(value => shiftMonth(value, -1))}><ChevronLeft className="size-4" /></Button><span className="min-w-36 text-center text-sm font-semibold capitalize">{new Date(`${month}-15T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span><Button type="button" size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => setMonth(value => shiftMonth(value, 1))}><ChevronRight className="size-4" /></Button></div>
      <p className="text-xs text-muted-foreground">Ida e volta a partir da empresa · {efficiency ? `${efficiency} km/L` : "—"} · {price ? `${formatCurrency(price)}/L` : "—"}</p>
    </div>
    {origin.length < 5 && <p className="text-sm text-warning">Cadastre o endereço da empresa em <Link to="/configuracoes/ficha-contrato" className="underline">Configurações › Ficha de contrato</Link> para calcular automaticamente.</p>}
    {events.isError ? <p role="alert" className="text-sm text-destructive">Não foi possível carregar os eventos deste mês.</p> : events.isPending ? <p className="text-sm text-muted-foreground">Carregando…</p> : (events.data ?? []).length === 0 ? <p className="py-4 text-sm text-muted-foreground">Nenhum evento planejado neste mês.</p> :
      <div className="overflow-x-auto"><table className="responsive-table w-full md:min-w-[900px] text-sm">
        <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-2 pr-3 font-medium">Data</th><th className="pr-3 font-medium">Evento</th><th className="pr-3 font-medium">Local</th><th className="pr-3 font-medium">Equipe</th><th className="pr-3 text-right font-medium">Distância</th><th className="pr-3 text-right font-medium">Combustível</th><th className="pr-3 text-right font-medium">Pedágios</th><th className="pr-3 text-right font-medium">Total</th><th /></tr></thead>
        <tbody className="divide-y divide-border">{events.data?.map(ev => {
          const dest = eventDestination(ev);
          const est = byId.get(ev.id);
          const fresh = est && dest && !isEstimateStale(est, origin, dest) ? est : undefined;
          const loading = busy.includes(ev.id);
          const toll = fresh ? (fresh.manual_toll ?? fresh.toll) : null;
          const cost = fresh ? eventTravelTotal(Number(fresh.distance_km), efficiency, price, fresh.toll === null ? null : Number(fresh.toll), fresh.manual_toll === null ? null : Number(fresh.manual_toll)) : null;
          const fuel = fresh ? (eventTravelTotal(Number(fresh.distance_km), efficiency, price, 0, null)?.fuel ?? null) : null;
          const team = (ev.event_collaborators ?? []).map(c => c.collaborators?.full_name).filter(Boolean).join(", ");
          return <tr key={ev.id} className="align-top">
            <td data-label="Data" className="py-3 pr-3 whitespace-nowrap">{formatEventDate(ev.event_date)}{ev.start_time && <span className="block text-xs text-muted-foreground">{ev.start_time.slice(0, 5)}</span>}</td>
            <td data-label="Evento" className="pr-3 py-3"><p className="font-medium">{ev.name}</p><p className="text-xs text-muted-foreground">{ev.clients?.full_name}</p></td>
            <td data-label="Local" className="pr-3 py-3 max-w-[220px]">{dest ? <span className="break-words">{ev.venue || dest}</span> : <span className="text-warning">Local não informado</span>}</td>
            <td data-label="Equipe" className="pr-3 py-3 max-w-[180px] text-xs">{team || <span className="text-muted-foreground">Sem equipe</span>}</td>
            <td data-label="Distância" className="pr-3 py-3 text-right whitespace-nowrap">{fresh ? `${Number(fresh.distance_km).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km` : "—"}</td>
            <td data-label="Combustível" className="pr-3 py-3 text-right whitespace-nowrap">{fuel !== null ? formatCurrency(fuel) : "—"}</td>
            <td data-label="Pedágios" className="pr-3 py-3 text-right">{fresh ? <div className="flex flex-col items-end gap-1"><span className={fresh.manual_toll === null && fresh.toll === null ? "text-warning" : ""}>{toll !== null ? formatCurrency(Number(toll)) : "Indisponível"}</span><Input aria-label={`Pedágio manual de ${ev.name}`} className="h-7 w-24 text-right text-xs" placeholder="Manual" defaultValue={fresh.manual_toll ?? ""} onBlur={e => { if (e.target.value !== String(fresh.manual_toll ?? "")) void saveManualToll(ev.id, e.target.value); }} /></div> : "—"}</td>
            <td data-label="Total" className="pr-3 py-3 text-right font-semibold text-primary whitespace-nowrap">{loading ? <LoaderCircle className="ml-auto size-4 animate-spin" /> : cost ? formatCurrency(cost.total) : "—"}</td>
            <td data-label="Ações" className="py-2"><div className="flex justify-end gap-1">
              <Button size="icon" variant="ghost" aria-label={`Recalcular ${ev.name}`} disabled={!dest || loading || origin.length < 5} onClick={() => void run([ev.id], true)}><RefreshCw className="size-4" /></Button>
              <Button size="sm" variant="ghost" asChild><Link to="/deslocamento" search={{ event: ev.id }}>Simular</Link></Button>
            </div></td>
          </tr>;
        })}</tbody>
      </table></div>}
  </section>;
}
