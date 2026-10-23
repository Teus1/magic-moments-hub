import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAccountAvailable, validateExistingAccountId } from "./collaborator-accounts";

describe("vínculo de conta existente", () => {
  const profileId = "61d1be66-d335-4257-844f-a2b12792bc22";
  const rows = [{ id: "collaborator-1", profile_id: profileId }];
  it("impede uma conta ligada a outro colaborador", () => {
    assert.equal(isAccountAvailable(profileId, rows), false);
  });
  it("mantém a conta do próprio colaborador disponível na edição", () => {
    assert.equal(isAccountAvailable(profileId, rows, "collaborator-1"), true);
  });
  it("permite conta ainda não vinculada", () => {
    assert.equal(isAccountAvailable(profileId, []), true);
  });
  it("exige selecionar uma conta existente", () => {
    assert.throws(() => validateExistingAccountId(""));
    assert.equal(validateExistingAccountId(profileId), profileId);
  });
});
