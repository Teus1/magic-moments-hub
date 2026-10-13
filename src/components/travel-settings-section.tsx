import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TravelPlaceInput } from "@/components/travel-place-input";

const num = (v: string) => Number(v.replace(",", "."));

export function TravelSettingsSection({ canEdit }: { canEdit: boolean }) {
  const cache = useQueryClient();
  const settings = useQuery({ queryKey: ["travel-settings"], queryFn: async () => { const r = await supabase.from("travel_settings").select("base_address,efficiency_km_l,fuel_price").maybeSingle(); if (r.error) throw r.error; return r.data; } });
  const [form, setForm] = useState({ base_address: "", efficiency: "", price: "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (settings.data) setForm({ base_address: settings.data.base_address, efficiency: String(settings.data.efficiency_km_l).replace(".", ","), price: String(settings.data.fuel_price).replace(".", ",") }); }, [settings.data]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const efficiency = num(form.efficiency), price = num(form.price);
    if (form.base_address.trim().length < 5 || !(efficiency > 0) || !(price >= 0)) { toast.error("Informe endereço, consumo e preço válidos."); return; }
    setSaving(true);
    const r = await supabase.from("travel_settings").upsert({ id: true, base_address: form.base_address.trim(), efficiency_km_l: efficiency, fuel_price: price, updated_at: new Date().toISOString() });
    setSaving(false);
    if (r.error) { toast.error("Não foi possível salvar. Confira suas permissões."); return; }
    toast.success("Deslocamento padrão salvo.");
    void cache.invalidateQueries({ queryKey: ["travel-settings"] });
  }
  return <section className="space-y-4"><h2 className="border-b border-border pb-2 font-semibold">Deslocamento padrão</h2>
    <p className="text-sm text-muted-foreground">Usado para pré-calcular o deslocamento (ida e volta) dos próximos eventos na aba Deslocamento.</p>
    <form className="space-y-3" onSubmit={save}>
      <div className="space-y-2"><Label htmlFor="base-address">Endereço da empresa</Label><TravelPlaceInput id="base-address" disabled={!canEdit} placeholder="Endereço, cidade e estado" value={form.base_address} onChange={v => setForm(f => ({ ...f, base_address: v }))} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label htmlFor="base-eff">Consumo (km/L)</Label><Input id="base-eff" inputMode="decimal" disabled={!canEdit} value={form.efficiency} onChange={e => setForm(f => ({ ...f, efficiency: e.target.value }))} /></div>
        <div className="space-y-2"><Label htmlFor="base-price">Combustível (R$/L)</Label><Input id="base-price" inputMode="decimal" disabled={!canEdit} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
      </div>
      {canEdit && <Button type="submit" disabled={saving}>Salvar</Button>}
    </form>
  </section>;
}
