import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownUp, Calculator, Fuel, LoaderCircle, Route as RouteIcon } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { TravelMap } from "@/components/travel-map";
import { TravelPlaceInput } from "@/components/travel-place-input";
import { UpcomingTravelList } from "@/components/upcoming-travel-list";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getTravelRoute } from "@/lib/travel.functions";
import { calculateTravelCost, type TravelRoute } from "@/lib/travel";

export const Route = createFileRoute("/_authenticated/deslocamento")({
  validateSearch: (search: Record<string, unknown>) => ({
    event: z.string().uuid().safeParse(search["event"]).success
      ? String(search["event"])
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Deslocamento — Magic Moments" },
      {
        name: "description",
        content: "Cálculo de trajetos, combustível e pedágios para eventos Magic Moments.",
      },
      { property: "og:title", content: "Deslocamento — Magic Moments" },
      {
        property: "og:description",
        content: "Estimativa de custos de deslocamento para eventos Magic Moments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TravelPage,
});

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const numberValue = (value: string) => (value.trim() ? Number(value.replace(",", ".")) : NaN);
const decimal = (value: number) => value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function TravelPage() {
  const { can } = useCurrentUser();
  const fetchRoute = useServerFn(getTravelRoute);
  const { event: eventId } = Route.useSearch();
  const eventLocation = useQuery({
    queryKey: ["travel-event", eventId],
    enabled: Boolean(eventId) && can("events", "view"),
    queryFn: async () => {
      if (!eventId) return null;
      const result = await supabase
        .from("events")
        .select("address,venue,venue_city,venue_state")
        .eq("id", eventId)
        .single();
      if (result.error) throw new Error("Não foi possível carregar o endereço do evento.");
      return result.data;
    },
  });
  const [origin, setOrigin] = useState("");
  const [useCompanyOrigin, setUseCompanyOrigin] = useState(true);
  const [destination, setDestination] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [efficiency, setEfficiency] = useState("");
  const [price, setPrice] = useState("");
  const [manualToll, setManualToll] = useState(false);
  const [tollInput, setTollInput] = useState("");
  const [result, setResult] = useState<TravelRoute | null>(null);
  const [submitted, setSubmitted] = useState<{
    origin: string;
    destination: string;
    roundTrip: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const travelSettings = useQuery({
    queryKey: ["travel-settings"],
    enabled: can("events", "view"),
    queryFn: async () => {
      const response = await supabase
        .from("travel_settings")
        .select("base_address,efficiency_km_l,fuel_price")
        .maybeSingle();
      if (response.error) throw response.error;
      return response.data;
    },
  });
  const companyAddress = travelSettings.data?.base_address?.trim() ?? "";
  useEffect(() => {
    if (!useCompanyOrigin) return;
    setOrigin(companyAddress);
    setResult(null);
    setSubmitted(null);
  }, [companyAddress, useCompanyOrigin]);
  useEffect(() => {
    if (!travelSettings.data) return;
    setEfficiency(String(travelSettings.data.efficiency_km_l ?? "").replace(".", ","));
    setPrice(String(travelSettings.data.fuel_price ?? "").replace(".", ","));
  }, [travelSettings.data]);
  useEffect(() => {
    if (!eventLocation.data) return;
    setDestination(
      eventLocation.data.address ??
        [eventLocation.data.venue, eventLocation.data.venue_city, eventLocation.data.venue_state]
          .filter(Boolean)
          .join(", "),
    );
    setResult(null);
    setSubmitted(null);
  }, [eventLocation.data]);
  const distance = result ? result.outbound.distanceKm + (result.inbound?.distanceKm ?? 0) : 0;
  const tollKnown =
    result && result.outbound.toll !== null && (!result.inbound || result.inbound.toll !== null);
  const estimatedToll =
    tollKnown && result ? (result.outbound.toll ?? 0) + (result.inbound?.toll ?? 0) : null;
  const toll = manualToll ? numberValue(tollInput) : estimatedToll;
  const cost =
    result && toll !== null
      ? calculateTravelCost(distance, numberValue(efficiency), numberValue(price), toll)
      : null;
  const duration = result
    ? result.outbound.durationSeconds + (result.inbound?.durationSeconds ?? 0)
    : 0;

  function clearRoute() {
    setResult(null);
    setSubmitted(null);
    setError("");
  }
  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetchRoute({ data: { origin, destination, roundTrip, avoidTolls } });
      setResult(response);
      setSubmitted({ origin, destination, roundTrip });
      setManualToll(false);
      setTollInput("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível consultar o trajeto.");
    } finally {
      setLoading(false);
    }
  }
  if (!can("events", "view"))
    return (
      <AppShell>
        <PageHeader title="Deslocamento" />
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </AppShell>
    );
  return (
    <AppShell>
      <PageHeader title="Deslocamento" />
      <h2 className="mb-4 border-b border-border pb-2 font-display text-xl">Simulador</h2>
      <div className="grid gap-8 xl:grid-cols-[1fr_1.1fr]">
        <div>
          <form onSubmit={calculate} className="space-y-5">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <RouteIcon className="size-5 text-primary" /> Trajeto
            </h2>
            <div className="flex items-start gap-3">
              <Checkbox
                id="company-origin"
                checked={useCompanyOrigin}
                onCheckedChange={(value) => setUseCompanyOrigin(value === true)}
              />
              <Label htmlFor="company-origin" className="font-normal leading-relaxed">
                Utilizar endereço da empresa como origem
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="travel-origin">Origem</Label>
              <TravelPlaceInput
                id="travel-origin"
                disabled={loading || useCompanyOrigin}
                placeholder="Endereço, cidade e estado"
                value={origin}
                onChange={(value) => {
                  setOrigin(value);
                  clearRoute();
                }}
              />
              {useCompanyOrigin && !companyAddress && (
                <p role="alert" className="text-sm text-warning">
                  Cadastre o endereço da empresa em Configurações › Ficha de contrato.
                </p>
              )}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading || useCompanyOrigin}
                onClick={() => {
                  setOrigin(destination);
                  setDestination(origin);
                  clearRoute();
                }}
              >
                <ArrowDownUp className="size-4" /> Inverter
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="travel-destination">Destino</Label>
              <TravelPlaceInput
                id="travel-destination"
                disabled={loading}
                placeholder="Endereço do evento, cidade e estado"
                value={destination}
                onChange={(value) => {
                  setDestination(value);
                  clearRoute();
                }}
              />
              {eventLocation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {eventLocation.error.message}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="round-trip"
                  disabled={loading}
                  checked={roundTrip}
                  onCheckedChange={(value) => {
                    setRoundTrip(value);
                    clearRoute();
                  }}
                />
                <Label htmlFor="round-trip">Ida e volta</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="avoid-tolls"
                  disabled={loading}
                  checked={avoidTolls}
                  onCheckedChange={(value) => {
                    setAvoidTolls(value);
                    clearRoute();
                  }}
                />
                <Label htmlFor="avoid-tolls">Evitar pedágios</Label>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Calculator className="size-4" />
              )}
              {loading ? "Consultando…" : "Consultar trajeto"}
            </Button>
            {error && (
              <p role="alert" className="break-words text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
          <section className="mt-8 space-y-5 border-t border-border pt-6">
            <h2 className="flex items-center gap-2 font-display text-xl">
              <Fuel className="size-5 text-primary" /> Custos do veículo
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="efficiency">Consumo (km/L)</Label>
                <Input
                  id="efficiency"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={efficiency}
                  onChange={(event) => setEfficiency(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-price">Combustível (R$/L)</Label>
                <Input
                  id="fuel-price"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="manual-toll" checked={manualToll} onCheckedChange={setManualToll} />
              <Label htmlFor="manual-toll">Informar pedágio manualmente</Label>
            </div>
            {manualToll && (
              <div className="space-y-2">
                <Label htmlFor="toll-total">
                  Pedágios totais {submitted?.roundTrip ? "(ida e volta)" : "(ida)"} — R$
                </Label>
                <Input
                  id="toll-total"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={tollInput}
                  onChange={(event) => setTollInput(event.target.value)}
                />
              </div>
            )}
            {(efficiency || price) &&
              !calculateTravelCost(0, numberValue(efficiency), numberValue(price), 0) && (
                <p className="text-sm text-destructive">
                  Informe consumo maior que zero e preço por litro válido.
                </p>
              )}
          </section>
        </div>
        <section className="min-w-0 space-y-5">
          <TravelMap route={result} />
          {result && submitted ? (
            <>
              <div className="flex flex-wrap gap-x-8 gap-y-3 border-b border-border pb-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Distância {submitted.roundTrip ? "total · ida e volta" : "· ida"}
                  </p>
                  <p className="text-2xl font-semibold">{decimal(distance)} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tempo estimado de direção</p>
                  <p className="text-2xl font-semibold">
                    {Math.floor(duration / 3600)}h {Math.ceil((duration % 3600) / 60)}min
                  </p>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Combustível {cost ? `(${decimal(cost.liters)} L)` : ""}</dt>
                  <dd className="font-medium">{cost ? money(cost.fuel) : "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Pedágios {manualToll ? "· manual" : "· Google Maps"}</dt>
                  <dd className="font-medium">
                    {toll !== null && Number.isFinite(toll) && toll >= 0
                      ? money(toll)
                      : "Indisponível"}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
                  <dt className="font-semibold">Total estimado</dt>
                  <dd className="text-3xl font-semibold text-primary">
                    {cost ? money(cost.total) : "—"}
                  </dd>
                </div>
              </dl>
              {!tollKnown && !manualToll && (
                <p role="status" className="text-sm text-warning">
                  Há pedágios sem preço disponível. Informe o total manualmente para concluir o
                  cálculo.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Estimativa para carro de passeio, sem tag. Tarifas podem variar; combustível
                informado por você. Consulta: {new Date(result.queriedAt).toLocaleString("pt-BR")}.
              </p>
              <Button variant="outline" asChild>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(submitted.origin)}&destination=${encodeURIComponent(submitted.destination)}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <RouteIcon className="size-4" /> Abrir ida no Google Maps
                </a>
              </Button>
            </>
          ) : (
            <div className="border-t border-border py-6">
              <p className="font-display text-xl">Resumo do deslocamento</p>
              <p className="mt-4 text-3xl font-semibold text-primary">—</p>
            </div>
          )}
        </section>
      </div>
      <div className="mt-12 border-t border-border pt-8">
        <UpcomingTravelList />
      </div>
    </AppShell>
  );
}
