import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validCpf, intakeSchema } from "./client-intake";
import { intakeRecipientSchema, intakeShareUrl, intakeTokenSchema, newIntakeToken } from "./intake-links";
test("João can identify a new client invitation before a client exists", () => {
  assert.equal(intakeRecipientSchema.parse(" João "), "João");
  assert.equal(intakeRecipientSchema.safeParse(" ").success, false);
});
test("new links are short and use only the custom domain", () => {
  const token = newIntakeToken();
  assert.equal(token.length, 22);
  const url = new URL(intakeShareUrl(token));
  assert.equal(url.origin, "https://gerenciadormagicmoments.app");
  assert.equal(url.pathname, `/f/${token}`);
  assert.equal(url.search, "");
  assert.equal(intakeTokenSchema.safeParse("a".repeat(64)).success, true);
  assert.equal(intakeTokenSchema.safeParse("João").success, false);
});
describe("Client identification", () => {
  test("CPF check digits must be valid", () => { assert.equal(validCpf("529.982.247-25"), true); assert.equal(validCpf("529.982.247-24"), false); assert.equal(validCpf("111.111.111-11"), false); });
  test("A public intake requires valid CPF, WhatsApp and email", () => { assert.equal(intakeSchema.safeParse({ full_name: "Teste", cpf: "000", whatsapp: "11", email: "invalid" }).success, false); });
});
import { intakeEventSchema, emptyIntakeEvent, intakeNotificationMessage, normalizeRecipientPhone } from "./client-intake";
test("event block rejects duration above 23h59 and accepts 4h", () => {
  assert.equal(intakeEventSchema.safeParse({ ...emptyIntakeEvent, duration_minutes: 1440 }).success, false);
  assert.equal(intakeEventSchema.safeParse({ ...emptyIntakeEvent, duration_minutes: 240, start_time: "20:00" }).success, true);
});
test("notification message omits CPF and formats date", () => {
  const msg = intakeNotificationMessage({ full_name: "Ana", event_title: "Casamento", event_date: "2026-11-20" }, "https://x/clientes");
  assert.match(msg, /20\/11\/2026/);
  assert.doesNotMatch(msg, /\d{11}/);
});
test("recipient phone gets country code 55", () => {
  assert.equal(normalizeRecipientPhone("(11) 99999-0000"), "5511999990000");
  assert.equal(normalizeRecipientPhone("123"), null);
});
