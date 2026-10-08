/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import type { TravelRoute } from "@/lib/travel";

declare global { interface Window { magicTravelMapReady?: () => void } }
let loading: Promise<void> | undefined;
function loadMap(key: string, channel: string) {
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    window.magicTravelMapReady = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async&callback=magicTravelMapReady&libraries=geometry&channel=${encodeURIComponent(channel)}`;
    script.async = true;
    script.onerror = () => { loading = undefined; reject(new Error("Não foi possível carregar o mapa.")); };
    document.head.appendChild(script);
  });
  return loading;
}

export function TravelMap({ route }: { route: TravelRoute | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!route) return;
    const host = window.location.hostname;
    const allowed = host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
    if (!allowed || /-devserver-/.test(host)) {
      setNotice("O mapa está disponível no endereço lovable.app. No domínio próprio, é necessária uma chave Google autorizada.");
      return;
    }
    const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'];
    const channel = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'] ?? "";
    if (!key) { setNotice("Google Maps não conectado."); return; }
    let disposed = false;
    const overlays: google.maps.Polyline[] = [];
    loadMap(key, channel).then(() => {
      if (disposed || !ref.current) return;
      setNotice("");
      const map = new google.maps.Map(ref.current, { zoom: 8, clickableIcons: false, mapTypeControl: false, streetViewControl: false });
      const bounds = new google.maps.LatLngBounds();
      const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
      for (const leg of [route.outbound, route.inbound]) {
        if (!leg) continue;
        const path = google.maps.geometry.encoding.decodePath(leg.polyline);
        path.forEach((point) => bounds.extend(point));
        overlays.push(new google.maps.Polyline({ path, map, strokeColor: color, strokeOpacity: leg === route.outbound ? 1 : 0.55, strokeWeight: 4 }));
      }
      map.fitBounds(bounds, 40);
    }).catch((error: Error) => { if (!disposed) setNotice(error.message); });
    return () => { disposed = true; overlays.forEach((overlay) => overlay.setMap(null)); };
  }, [route]);
  return <div className="relative h-80 overflow-hidden rounded-lg border border-border bg-muted/30">
    <div ref={ref} className="h-full w-full" aria-label="Mapa do trajeto" />
    {(!route || notice) && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground"><MapPinned className="size-10 text-primary/60" /><span>{notice || "Trajeto"}</span></div>}
  </div>;
}