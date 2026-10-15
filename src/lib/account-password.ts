import { z } from "zod";

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual."),
  password: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres.").max(200),
  confirmation: z.string(),
}).refine(value => value.password === value.confirmation, {
  path: ["confirmation"], message: "As senhas não coincidem.",
});