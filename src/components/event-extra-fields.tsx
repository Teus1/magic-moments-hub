import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { REFERRAL_OPTIONS, SOCIAL_MEDIA_QUESTION } from "@/lib/event-extra";

export interface EventExtraValue {
  guest_count: string;
  social_media_consent: boolean | null;
  instagram_handles: string;
  referral_source: string;
  referral_other: string;
}

/** Convidados, autorização de redes sociais (@ do Instagram) e "Como nos conheceu?". */
export function EventExtraFields({ value, onChange, idPrefix, errors = {} }: { value: EventExtraValue; onChange: (next: Partial<EventExtraValue>) => void; idPrefix: string; errors?: Record<string, string> }) {
  return <div className="space-y-5">
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-guests`}>Quantidade aproximada de convidados</Label>
      <Input id={`${idPrefix}-guests`} inputMode="numeric" maxLength={6} value={value.guest_count} onChange={e => onChange({ guest_count: e.target.value.replace(/\D/g, "") })} placeholder="Ex.: 150" />
      {errors.guest_count && <p className="text-xs text-destructive">{errors.guest_count}</p>}
    </div>
    <div className="space-y-2">
      <Label>{SOCIAL_MEDIA_QUESTION}</Label>
      <RadioGroup className="flex gap-6" value={value.social_media_consent === null ? "" : value.social_media_consent ? "sim" : "nao"} onValueChange={v => onChange({ social_media_consent: v === "sim" })}>
        <div className="flex items-center gap-2"><RadioGroupItem id={`${idPrefix}-social-sim`} value="sim" /><Label htmlFor={`${idPrefix}-social-sim`} className="font-normal">Sim</Label></div>
        <div className="flex items-center gap-2"><RadioGroupItem id={`${idPrefix}-social-nao`} value="nao" /><Label htmlFor={`${idPrefix}-social-nao`} className="font-normal">Não</Label></div>
      </RadioGroup>
      {value.social_media_consent && <div className="space-y-2 pt-1">
        <Label htmlFor={`${idPrefix}-instagram`}>@ do Instagram</Label>
        <Input id={`${idPrefix}-instagram`} maxLength={300} value={value.instagram_handles} onChange={e => onChange({ instagram_handles: e.target.value })} placeholder="Ex.: @noiva, @noivo" />
      </div>}
    </div>
    <div className="space-y-2">
      <Label>Como nos conheceu?</Label>
      <RadioGroup value={value.referral_source} onValueChange={v => onChange({ referral_source: v })}>
        {REFERRAL_OPTIONS.map(o => <div key={o.value} className="flex items-center gap-2"><RadioGroupItem id={`${idPrefix}-ref-${o.value}`} value={o.value} /><Label htmlFor={`${idPrefix}-ref-${o.value}`} className="font-normal">{o.label}</Label></div>)}
      </RadioGroup>
      {value.referral_source === "outro" && <Input aria-label="Onde nos conheceu" maxLength={150} value={value.referral_other} onChange={e => onChange({ referral_other: e.target.value })} placeholder="Conte onde nos conheceu" />}
      {errors.referral_other && <p className="text-xs text-destructive">{errors.referral_other}</p>}
    </div>
  </div>;
}
