import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collaboratorBalance, collaboratorPaymentTotals } from "./collaborator-payments";

describe("pagamentos da equipe dos eventos", () => {
  it("alerta pelo valor combinado que ainda não foi pago", () => {
    assert.equal(collaboratorBalance(350, 0), 350);
  });
  it("mostra apenas o restante quando houve pagamento parcial", () => {
    assert.equal(collaboratorBalance(350, 100), 250);
  });
  it("não indica pendência de um valor quitado", () => {
    assert.equal(collaboratorBalance(350, 350), 0);
  });
  it("pagamento excedente de outro evento não apaga uma dívida", () => {
    assert.deepEqual(
      collaboratorPaymentTotals([
        { agreed_value: 300, paid_value: 400 },
        { agreed_value: 250, paid_value: 50 },
      ]),
      { agreed: 550, paid: 450, pending: 200 },
    );
  });
  it("calcula centavos sem resíduo", () => {
    assert.equal(collaboratorBalance(100.1, 100), 0.1);
  });
});
