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

test("resumo da ficha inclui dados preenchidos e GuestBook", async () => {
  const { intakeSummaryMessage } = await import("./client-intake");
  const msg = intakeSummaryMessage({ full_name: "João Silva", birth_date: "", cpf: "52998224725", rg: "", whatsapp: "11999998888", email: "j@x.com", zip_code: "", address: "", address_number: "", address_complement: "", neighborhood: "", city: "", state: "", notes: "", event_title: "Casamento", event_type: "", event_date: "2026-12-05", consent: true, event: { start_time: "20:00", duration_minutes: 90, venue: "Espaço X", address: "", venue_city: "", venue_state: "", latitude: null, longitude: null, place_id: null, attraction_id: "", has_ceremonial: false, ceremonial_name: "", ceremonial_contact: "", contact_via_ceremonial: false, has_guestbook: true } } as never, "Polaroide");
  for (const s of ["João Silva", "52998224725", "05/12/2026", "1h30", "Espaço X", "*Atração:* Polaroide", "*GuestBook:* Sim"]) assert.ok(msg.includes(s), s);
});

test("Como nos conheceu: 'Outro' exige texto e convidados entre 1 e 100000", async () => {
  const { intakeEventSchema, emptyIntakeEvent } = await import("./client-intake");
  assert.equal(intakeEventSchema.safeParse({ ...emptyIntakeEvent, referral_source: "outro", referral_other: "" }).success, false);
  assert.equal(intakeEventSchema.safeParse({ ...emptyIntakeEvent, referral_source: "outro", referral_other: "Feira de noivas" }).success, true);
  assert.equal(intakeEventSchema.safeParse({ ...emptyIntakeEvent, guest_count: 0 }).success, false);
  assert.equal(intakeEventSchema.safeParse({ ...emptyIntakeEvent, guest_count: 150 }).success, true);
});
