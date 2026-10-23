import { z } from "zod";

// 128 random bits, URL-safe; retain old 256-bit hex invitations.
export const intakeTokenSchema = z.string().regex(/^(?:[A-Za-z0-9_-]{22}|[a-f0-9]{64})$/);
export const intakeRecipientSchema = z
  .string()
  .trim()
  .min(1, "Informe o nome do destinatário.")
  .max(150);
export function newIntakeToken() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
export function intakeShareUrl(token: string) {
  return `https://gerenciadormagicmoments.app/f/${intakeTokenSchema.parse(token)}`;
}
