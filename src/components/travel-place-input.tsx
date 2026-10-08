import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTravelPlaceSuggestions, resolveTravelPlace, type TravelPlaceSuggestion } from "@/lib/travel-places.functions";

type Props = { id: string; value: string; onChange: (value: string) => void; placeholder: string; disabled?: boolean };

export function TravelPlaceInput({ id, value, onChange, placeholder, disabled }: Props) {
  const search = useServerFn(getTravelPlaceSuggestions);
  const resolve = useServerFn(resolveTravelPlace);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<TravelPlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const token = useRef<string | null>(null);
  const selected = useRef<string | null>(null);
  const version = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const current = ++version.current;
    setSuggestions([]); setActive(-1); setSearched(false); setBusy(false); setError("");
    if (!focused || disabled || selecting || value.trim().length < 3 || selected.current === value) return;
    const timeout = setTimeout(async () => {
      token.current ??= crypto.randomUUID();
      setBusy(true);
      try {
        const items = await search({ data: { input: value.trim(), sessionToken: token.current } });
        if (version.current === current) { setSuggestions(items); setSearched(true); }
      } catch (cause) {
        if (version.current === current) setError(cause instanceof Error ? cause.message : "Não foi possível buscar locais.");
      } finally { if (version.current === current) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timeout); version.current++; };
  }, [value, focused, disabled, selecting, search]);

  async function choose(item: TravelPlaceSuggestion) {
    const sessionToken = token.current;
    if (!sessionToken || selecting) return;
    version.current++;
    setSelecting(true); setSuggestions([]); setError("");
    try {
      const address = await resolve({ data: { placeId: item.placeId, sessionToken } });
      selected.current = address; onChange(address); setFocused(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível selecionar o local.");
    } finally { token.current = null; setSelecting(false); setBusy(false); }
  }
  const open = focused && !disabled && (busy || selecting || searched || Boolean(error));
  return <div className="relative min-w-0">
    <Input ref={inputRef} id={id} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`} aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
      required minLength={5} maxLength={300} autoComplete="off" disabled={disabled || selecting} placeholder={placeholder} value={value}
      onFocus={() => setFocused(true)} onBlur={() => { setFocused(false); token.current = null; }}
      onChange={(event) => { version.current++; selected.current = null; setSuggestions([]); setActive(-1); onChange(event.target.value); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); setFocused(false); token.current = null; }
        if ((event.key === "ArrowDown" || event.key === "ArrowUp") && suggestions.length) {
          event.preventDefault(); setActive((index) => event.key === "ArrowDown" ? (index + 1) % suggestions.length : (index <= 0 ? suggestions.length - 1 : index - 1));
        }
        if (event.key === "Enter" && active >= 0 && suggestions[active]) { event.preventDefault(); void choose(suggestions[active]); }
      }} />
    {selecting && <LoaderCircle aria-label="Selecionando local" className="absolute right-3 top-3 size-5 animate-spin text-primary" />}
    {open && <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md">
      <div id={`${id}-options`} role="listbox" aria-label="Locais sugeridos" className="max-h-72 overflow-y-auto p-1">
        {suggestions.map((item, index) => <Button key={item.placeId} id={`${id}-option-${index}`} type="button" role="option" aria-selected={index === active} variant="ghost"
          className={`h-auto min-h-11 w-full justify-start gap-2 whitespace-normal py-3 text-left ${index === active ? "bg-accent text-accent-foreground" : ""}`}
          onMouseDown={(event) => event.preventDefault()} onClick={() => void choose(item)}><MapPin className="size-4 shrink-0 text-primary" /><span className="min-w-0 break-words">{item.text}</span></Button>)}
        {busy && <p role="status" className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Buscando locais…</p>}
        {searched && !busy && !suggestions.length && !error && <p role="status" className="px-3 py-3 text-sm text-muted-foreground">Nenhum local encontrado.</p>}
        {error && <p role="alert" className="break-words px-3 py-3 text-sm text-destructive">{error}</p>}
      </div>
      <p className="border-t border-border px-3 py-2 text-right text-xs text-muted-foreground">Google Maps</p>
    </div>}
    {error && !open && <p role="alert" className="mt-2 break-words text-sm text-destructive">{error}</p>}
  </div>;
}