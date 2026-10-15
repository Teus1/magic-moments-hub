import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPixPayload, normalizePixKey, pixCrc16, pixMerchantName, pixTransactionId } from "./pix";

describe("codigo pix (br code)", () => {
  it("calcula o CRC16-CCITT-FALSE igual ao valor de referência", () => {
    assert.equal(pixCrc16("123456789"), "29B1");
  });

  it("monta o codigo completo com chave, nome e valor", () => {
    const payload = buildPixPayload({
      key: "joao@email.com",
      amount: 350,
      receiverName: "João da Silva",
      linkId: "11111111-2222-3333-4444-555555555555",
    });
    const body =
      "000201" +
      "010212" +
      "26360014br.gov.bcb.pix0114joao@email.com" +
      "52040000" +
      "5303986" +
      "5406350.00" +
      "5802BR" +
      "5913JOAO DA SILVA" +
      "6006BRASIL" +
      "62140510MM11111111" +
      "6304";
    assert.equal(payload, `${body}${pixCrc16(body)}`);
  });

  it("escreve o valor com duas casas decimais", () => {
    const payload = buildPixPayload({
      key: "12345678901",
      amount: 0.1,
      receiverName: "Ana",
      linkId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    });
    assert.ok(payload.includes("54040.10"));
    assert.ok(payload.includes("011112345678901"));
  });

  it("normaliza cada tipo de chave", () => {
    assert.equal(normalizePixKey("123.456.789-01"), "12345678901");
    assert.equal(normalizePixKey("12.345.678/0001-90"), "12345678000190");
    assert.equal(normalizePixKey("+55 (11) 99999-9999"), "+5511999999999");
    assert.equal(normalizePixKey("11 99999-9999"), "+5511999999999");
    assert.equal(normalizePixKey("12345678901"), "12345678901");
    assert.equal(normalizePixKey(" Maria@Exemplo.Com "), "Maria@Exemplo.Com");
    assert.equal(
      normalizePixKey("123E45EC-7562-4B35-8A3E-DA514ACD82CE"),
      "123e45ec-7562-4b35-8a3e-da514acd82ce",
    );
  });

  it("ajusta nome e identificador para o padrao do BR Code", () => {
    assert.equal(pixMerchantName("Ana Beatriz Ção"), "ANA BEATRIZ CAO");
    assert.equal(pixMerchantName("X".repeat(40)).length, 25);
    assert.equal(pixTransactionId("11111111-2222-3333-4444-555555555555"), "MM11111111");
  });

  it("recusa chave vazia, valor zero e valor negativo", () => {
    assert.throws(() => normalizePixKey("   "));
    assert.throws(() =>
      buildPixPayload({ key: "joao@email.com", amount: 0, receiverName: "Joao", linkId: "11111111" }),
    );
    assert.throws(() =>
      buildPixPayload({ key: "joao@email.com", amount: -20, receiverName: "Joao", linkId: "11111111" }),
    );
    assert.throws(() =>
      buildPixPayload({ key: "###", amount: 10, receiverName: "Joao", linkId: "11111111" }),
    );
  });
});
