import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ClientFields } from "@/components/client-fields";
import { emptyClientForm } from "@/lib/clients";
import {
  emptyIntakeEvent,
  intakeSchema,
  intakeSummaryMessage,
  normalizeRecipientPhone,
  sanitizeHoursInput,
  whatsappLink,
  type IntakeEvent,
} from "@/lib/client-intake";
import { intakeLinkStatus, publicServices, submitIntake } from "@/lib/client-intake.functions";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TravelPlaceInput } from "@/components/travel-place-input";
import { EVENT_TYPE_SUGGESTIONS } from "@/lib/events";
import { PickerField } from "@/components/ui/picker-field";
import logo from "@/assets/magic-moments-logo.png";
import { intakeTokenSchema } from "@/lib/intake-links";
import { EventExtraFields, type EventExtraValue } from "@/components/event-extra-fields";
import { parseGuestCount } from "@/lib/event-extra";

export const Route = createFileRoute("/pre-cadastro")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: intakeTokenSchema.safeParse(search["token"]).success ? String(search["token"]) : "",
  }),
  head: () => ({
    meta: [
      { title: "Ficha de contrato — Magic Moments" },
      {
        name: "description",
        content:
          "Envie seus dados com segurança para o atendimento e a preparação do seu contrato Magic Moments.",
      },
      { property: "og:title", content: "Ficha de contrato — Magic Moments" },
      {
        property: "og:description",
        content: "Dados para atendimento e preparação do contrato Magic Moments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: LegacyIntakePage,
});
function LegacyIntakePage() {
  const { token } = Route.useSearch();
  return <IntakePage token={token} />;
}
export function IntakePage({ token }: { token: string }) {
  const statusFn = useServerFn(intakeLinkStatus);
  const submit = useServerFn(submitIntake);
  const status = useQuery({
    queryKey: ["intake-link", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: () => statusFn({ data: { token } }),
  });
  const [form, setForm] = useState(emptyClientForm);
  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [details, setDetails] = useState<IntakeEvent>(emptyIntakeEvent);
  const [hours, setHours] = useState("");
  const [extra, setExtra] = useState<EventExtraValue>({
    guest_count: "",
    social_media_consent: null,
    instagram_handles: "",
    referral_source: "",
    referral_other: "",
  });
  const attractionsFn = useServerFn(publicServices);
  const attractions = useQuery({
    queryKey: ["intake-services", token],
    enabled: Boolean(token) && status.data?.status === "pending",
    retry: false,
    queryFn: () => attractionsFn({ data: { token } }),
  });
  const setDetail = (next: Partial<IntakeEvent>) =>
    setDetails((current) => ({ ...current, ...next }));
  const [consent, setConsent] = useState(false);
  const [whatsappWindow, setWhatsappWindow] = useState<Window | null>(null);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: async () => {
      const parsedHours = Number(hours.replace(",", "."));
      const duration = hours.trim() ? Math.round(parsedHours * 60) : null;
      const checked = intakeSchema.safeParse({
        ...form,
        event_title: eventTitle,
        event_type: eventType,
        event_date: eventDate,
        consent,
        event: {
          ...details,
          duration_minutes: duration === null ? null : Number.isFinite(duration) ? duration : 0,
          venue_state: details.venue_state.toUpperCase(),
          ...(details.has_ceremonial
            ? {}
            : { ceremonial_name: "", ceremonial_contact: "", contact_via_ceremonial: false }),
          attraction_id: "",
          guest_count: parseGuestCount(extra.guest_count),
          social_media_consent: extra.social_media_consent,
          instagram_handles: extra.social_media_consent ? extra.instagram_handles : "",
          referral_source: extra.referral_source,
          referral_other: extra.referral_source === "outro" ? extra.referral_other : "",
        },
      });
      if (!checked.success) {
        setErrors(
          Object.fromEntries(
            checked.error.issues.map((issue) => [
              issue.path[0] === "event" ? `event.${String(issue.path[1])}` : issue.path[0],
              issue.message,
            ]),
          ),
        );
        throw new Error("Confira os campos indicados antes de enviar.");
      }
      setErrors({});
      const result = await submit({ data: { token, draft: checked.data, website: website as "" } });
      const attractionName = attractions.data?.find(
        (item) => item.id === checked.data.event?.service_id,
      )?.name;
      const message = intakeSummaryMessage(checked.data, attractionName);
      return {
        ...result,
        links: result.recipients.flatMap((r) => {
          const phone = normalizeRecipientPhone(r.phone);
          return phone ? [{ name: r.name, href: whatsappLink(phone, message) }] : [];
        }),
      };
    },
    onSuccess: (result) => {
      if (result.links[0] && whatsappWindow) whatsappWindow.location.href = result.links[0].href;
      else whatsappWindow?.close();
      setWhatsappWindow(null);
    },
    onError: () => {
      whatsappWindow?.close();
      setWhatsappWindow(null);
    },
  });
  const received = save.isSuccess || status.data?.status === "received";
  const links = save.data?.links ?? [];
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-5 py-6">
        <div className="mx-auto flex min-w-0 max-w-2xl items-center gap-3">
          <img src={logo} alt="" className="size-14 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="font-display text-2xl text-primary sm:text-3xl">Magic Moments</p>
            <p className="mt-1 text-sm text-muted-foreground">Ficha para elaboração do contrato</p>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-5 py-8 sm:py-10">
        {received ? (
          <section className="space-y-4 py-10">
            <CheckCircle2 className="size-10 text-success" />
            <h1 className="font-display text-3xl">Dados recebidos!</h1>
            <p className="text-muted-foreground">
              A Magic Moments recebeu suas informações e vai utilizá-las para dar continuidade ao
              atendimento e à preparação do contrato.
            </p>
            {save.isSuccess && links.length === 0 && (
              <p role="alert" className="text-sm text-warning">
                Seus dados foram salvos, mas o WhatsApp comercial não está configurado. Entre em
                contato com a Magic Moments pelo canal de atendimento habitual.
              </p>
            )}
            {links.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Para finalizar, envie suas informações para a equipe pelo WhatsApp:
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {links.map((link) => (
                    <Button key={link.href} asChild size="lg">
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="size-4" />
                        {links.length > 1
                          ? `Enviar pelo WhatsApp — ${link.name}`
                          : "Enviar dados pelo WhatsApp"}
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : !token || status.data?.status === "expired" ? (
          <section>
            <h1 className="font-display text-2xl">Link inválido ou expirado</h1>
            <p className="mt-3 text-muted-foreground">
              Solicite um novo link à equipe Magic Moments.
            </p>
          </section>
        ) : status.isPending ? (
          <p role="status">Verificando link…</p>
        ) : status.isError ? (
          <section>
            <p role="alert" className="text-destructive">
              Não foi possível verificar o link.
            </p>
            <Button variant="outline" onClick={() => void status.refetch()} className="mt-4">
              Tentar novamente
            </Button>
          </section>
        ) : (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (!save.isPending) {
                const popup = window.open("about:blank", "_blank");
                if (popup) popup.opener = null;
                setWhatsappWindow(popup);
                save.mutate();
              }
            }}
            className="space-y-7"
          >
            <div>
              <h1 className="font-display text-3xl">Seu próximo momento</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Campos com <span className="text-destructive">*</span> são obrigatórios.
              </p>
            </div>
            <ClientFields
              value={form}
              onChange={(next) => {
                setForm((current) => ({ ...current, ...next }));
                setErrors((current) =>
                  Object.fromEntries(
                    Object.entries(current).filter(
                      ([key]) =>
                        key in form &&
                        next[key as keyof typeof next] === form[key as keyof typeof form],
                    ),
                  ),
                );
              }}
              publicForm
              errors={errors}
              prefix="intake"
              showNotes={false}
            />
            <section className="space-y-4">
              <h2 className="border-b border-border pb-2 font-semibold">Informações do evento</h2>
              <div className="space-y-2">
                <Label htmlFor="intake-event-title">
                  Título do evento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="intake-event-title"
                  placeholder="Ex.: Casamento Mateus e Isabella"
                  maxLength={200}
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                />
                {errors["event_title"] && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors["event_title"]}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Tipo de evento <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={eventType || "none"}
                    onValueChange={(value) => setEventType(value === "none" ? "" : value)}
                  >
                    <SelectTrigger aria-label="Tipo de evento">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPE_SUGGESTIONS.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors["event_type"] && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors["event_type"]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intake-event-date">
                    Data do evento <span className="text-destructive">*</span>
                  </Label>
                  <PickerField
                    id="intake-event-date"
                    variant="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                  {errors["event_date"] && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors["event_date"]}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="intake-start">
                    Início da atração (24h) <span className="text-destructive">*</span>
                  </Label>
                  <PickerField
                    id="intake-start"
                    variant="time"
                    value={details.start_time}
                    onChange={(event) => setDetail({ start_time: event.target.value.slice(0, 5) })}
                  />
                  {errors["event.start_time"] && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors["event.start_time"]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intake-hours">
                    Duração (horas) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="intake-hours"
                    inputMode="decimal"
                    placeholder="Ex.: 4 ou 3,5"
                    value={hours}
                    onChange={(event) => setHours(sanitizeHoursInput(event.target.value))}
                  />
                  {errors["event.duration_minutes"] && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors["event.duration_minutes"]}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Atração escolhida <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={details.service_id || "none"}
                  onValueChange={(value) =>
                    setDetail({ service_id: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger aria-label="Atração escolhida">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione o serviço</SelectItem>
                    {(attractions.data ?? []).map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors["event.service_id"] && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors["event.service_id"]}
                  </p>
                )}
                {attractions.isError && (
                  <p role="alert" className="text-xs text-destructive">
                    Não foi possível carregar os serviços.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="intake-venue">
                  Local do evento <span className="text-destructive">*</span>
                </Label>
                <TravelPlaceInput
                  id="intake-venue"
                  publicToken={token}
                  required
                  placeholder="Busque o nome do local ou endereço"
                  value={details.venue}
                  onChange={(venue) =>
                    setDetail({ venue, place_id: null, latitude: null, longitude: null })
                  }
                  onSelect={(place) =>
                    setDetail({
                      venue: place.name || place.address,
                      address: place.address,
                      venue_city: place.city,
                      venue_state: place.state.slice(0, 2),
                      latitude: place.latitude,
                      longitude: place.longitude,
                      place_id: place.placeId,
                    })
                  }
                />
                {errors["event.venue"] && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors["event.venue"]}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="intake-venue-address">
                  Endereço do local <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="intake-venue-address"
                  maxLength={500}
                  value={details.address}
                  onChange={(event) => setDetail({ address: event.target.value })}
                />
                {errors["event.address"] && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors["event.address"]}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
                <div className="space-y-2">
                  <Label htmlFor="intake-venue-city">
                    Cidade do local <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="intake-venue-city"
                    maxLength={150}
                    value={details.venue_city}
                    onChange={(event) => setDetail({ venue_city: event.target.value })}
                  />
                  {errors["event.venue_city"] && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors["event.venue_city"]}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="intake-venue-uf">
                    UF do local <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="intake-venue-uf"
                    required
                    aria-invalid={Boolean(errors["event.venue_state"])}
                    maxLength={2}
                    value={details.venue_state}
                    onChange={(event) =>
                      setDetail({ venue_state: event.target.value.toUpperCase() })
                    }
                  />
                  {errors["event.venue_state"] && (
                    <p role="alert" className="text-xs text-destructive">
                      {errors["event.venue_state"]}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="intake-ceremonial">Terá cerimonialista?</Label>
                <Switch
                  id="intake-ceremonial"
                  checked={details.has_ceremonial}
                  onCheckedChange={(has_ceremonial) => setDetail({ has_ceremonial })}
                />
              </div>
              {details.has_ceremonial && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="intake-cer-name">Nome do cerimonial</Label>
                      <Input
                        id="intake-cer-name"
                        maxLength={150}
                        value={details.ceremonial_name}
                        onChange={(event) => setDetail({ ceremonial_name: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="intake-cer-contact">Contato do cerimonial</Label>
                      <Input
                        id="intake-cer-contact"
                        maxLength={150}
                        value={details.ceremonial_contact}
                        onChange={(event) => setDetail({ ceremonial_contact: event.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="intake-cer-via" className="font-normal">
                      Os detalhes podem ser combinados direto com o cerimonial
                    </Label>
                    <Switch
                      id="intake-cer-via"
                      checked={details.contact_via_ceremonial}
                      onCheckedChange={(contact_via_ceremonial) =>
                        setDetail({ contact_via_ceremonial })
                      }
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="intake-guestbook">Terá o GuestBook?</Label>
                <Switch
                  id="intake-guestbook"
                  checked={details.has_guestbook}
                  onCheckedChange={(has_guestbook) => setDetail({ has_guestbook })}
                />
              </div>
              <EventExtraFields
                required
                idPrefix="intake"
                value={extra}
                onChange={(next) => setExtra((current) => ({ ...current, ...next }))}
                errors={{
                  social_media_consent: errors["event.social_media_consent"] ?? "",
                  referral_source: errors["event.referral_source"] ?? "",
                  guest_count: errors["event.guest_count"] ?? "",
                  referral_other: errors["event.referral_other"] ?? "",
                }}
              />
            </section>
            <div className="space-y-2">
              <Label htmlFor="intake-notes">Observações (opcional)</Label>
              <Textarea
                id="intake-notes"
                maxLength={5000}
                rows={3}
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
            </div>
            <div className="hidden" aria-hidden="true">
              <Input
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>
            <div className="space-y-2 border-t border-border pt-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="intake-consent"
                  checked={consent}
                  onCheckedChange={(value) => setConsent(value === true)}
                />
                <Label htmlFor="intake-consent" className="text-sm font-normal leading-relaxed">
                  Autorizo a Magic Moments a utilizar estes dados para atendimento e preparação do
                  contrato. O link é pessoal; não compartilhe com terceiros.
                </Label>
              </div>
              {errors["consent"] && (
                <p role="alert" className="text-xs text-destructive">
                  {errors["consent"]}
                </p>
              )}
            </div>
            {save.isError && (
              <p role="alert" className="text-sm text-destructive">
                {save.error.message}
              </p>
            )}
            <Button type="submit" disabled={save.isPending} className="w-full sm:w-auto">
              <Send className="size-4" />
              {save.isPending ? "Enviando…" : "Enviar dados pelo WhatsApp"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
