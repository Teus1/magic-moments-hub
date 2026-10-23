export const SOCIAL_MEDIA_QUESTION =
  "Podemos compartilhar alguns registros do seu evento em nossas redes sociais para mostrar um pouco da experiência Magic Moments? As publicações são feitas sempre com respeito aos nossos clientes e ao momento vivido.";
export const REFERRAL_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google" },
  { value: "cerimonialista", label: "Cerimonialista" },
  { value: "instagram_facebook", label: "Instagram/Facebook" },
  { value: "indicacao", label: "Indicação" },
  { value: "evento_conhecido", label: "Evento de conhecido" },
  { value: "casamentos_com_br", label: "Site Casamentos.com.br" },
  { value: "outro", label: "Outro" },
] as const;
export type ReferralSource = (typeof REFERRAL_OPTIONS)[number]["value"];
export const REFERRAL_VALUES = REFERRAL_OPTIONS.map((o) => o.value) as [
  ReferralSource,
  ...ReferralSource[],
];
export function referralLabel(source?: string | null, other?: string | null) {
  if (!source) return "";
  if (source === "outro") return other ? `Outro: ${other}` : "Outro";
  return REFERRAL_OPTIONS.find((o) => o.value === source)?.label ?? "";
}
/** Converte o texto digitado em número de convidados (1–100000) ou null. */
export function parseGuestCount(value: string): number | null {
  const n = Number(value.trim());
  return value.trim() && Number.isInteger(n) ? n : null;
}
