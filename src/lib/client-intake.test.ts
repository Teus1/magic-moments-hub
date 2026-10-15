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

const complete = {
  full_name: "João Silva", birth_date: "1990-01-01", cpf: "52998224725", rg: "12345678", whatsapp: "11999998888", email: "", zip_code: "01001000", address: "Praça da Sé", address_number: "1", address_complement: "", neighborhood: "Sé", city: "São Paulo", state: "SP", notes: "", event_title: "Casamento", event_type: "Casamento", event_date: "2026-12-05", consent: true,
  event: { ...emptyIntakeEvent, start_time: "20:00", duration_minutes: 240, service_id: "11111111-1111-4111-8111-111111111111", venue: "Espaço", address: "Rua do local, 1", venue_city: "São Paulo", venue_state: "SP", social_media_consent: false, referral_source: "google" },
};
for (const field of ["full_name", "birth_date", "cpf", "rg", "whatsapp", "zip_code", "address", "address_number", "neighborhood", "city", "state", "event_type", "event_date"] as const) {
  test(`new public contract requires ${field}`, () => {
    assert.equal(intakeSchema.safeParse(complete).success, true);
    assert.equal(intakeSchema.safeParse({ ...complete, [field]: "" }).success, false);
  });
}
for (const field of ["start_time", "venue", "address", "venue_city", "venue_state", "service_id", "referral_source"] as const) {
  test(`new public contract requires event ${field}`, () => assert.equal(intakeSchema.safeParse({ ...complete, event: { ...complete.event, [field]: "" } }).success, false));
}
test("contract needs duration and explicit social decision; email, complement, guests optional", () => {
  assert.equal(intakeSchema.safeParse(complete).success, true);
  assert.equal(intakeSchema.safeParse({ ...complete, event: { ...complete.event, duration_minutes: null } }).success, false);
  assert.equal(intakeSchema.safeParse({ ...complete, event: { ...complete.event, social_media_consent: null } }).success, false);
  assert.equal(intakeSchema.safeParse({ ...complete, event: { ...complete.event, social_media_consent: true } }).success, true);
});
test("contact sources include new channels and preserve legacy answers", () => {
  for (const referral_source of ["instagram", "tiktok", "google", "indicacao", "cerimonialista", "casamentos_com_br", "instagram_facebook", "evento_conhecido"]) assert.equal(intakeSchema.safeParse({ ...complete, event: { ...complete.event, referral_source } }).success, true);
});
test("event location UF must contain two uppercase letters", () => {
  for (const venue_state of ["S", "12", "  "]) assert.equal(intakeSchema.safeParse({ ...complete, event: { ...complete.event, venue_state } }).success, false);
  assert.equal(intakeSchema.safeParse(complete).success, true);
});
