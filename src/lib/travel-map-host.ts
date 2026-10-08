export function isTravelMapHostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host.includes("-devserver-")) return false;
  return host === "gerenciadormagicmoments.app"
    || host === "www.gerenciadormagicmoments.app"
    || host.endsWith(".lovable.app")
    || host.endsWith(".lovableproject.com");
}