import { describe, expect, test } from "bun:test";
import { validCpf, intakeSchema } from "./client-intake";
describe("Client identification", () => {
  test("CPF check digits must be valid", () => { expect(validCpf("529.982.247-25")).toBe(true); expect(validCpf("529.982.247-24")).toBe(false); expect(validCpf("111.111.111-11")).toBe(false); });
  test("A public intake requires valid CPF, WhatsApp and email", () => { expect(intakeSchema.safeParse({ full_name: "Teste", cpf: "000", whatsapp: "11", email: "invalid" }).success).toBe(false); });
});