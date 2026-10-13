import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validCpf, intakeSchema } from "./client-intake";
describe("Client identification", () => {
  test("CPF check digits must be valid", () => { assert.equal(validCpf("529.982.247-25"), true); assert.equal(validCpf("529.982.247-24"), false); assert.equal(validCpf("111.111.111-11"), false); });
  test("A public intake requires valid CPF, WhatsApp and email", () => { assert.equal(intakeSchema.safeParse({ full_name: "Teste", cpf: "000", whatsapp: "11", email: "invalid" }).success, false); });
});