import { describe, expect, it } from "bun:test";
import { isAccountAvailable, validateExistingAccountId } from "./collaborator-accounts";

describe("vínculo de conta existente", () => {
  const profileId = "61d1be66-d335-4257-844f-a2b12792bc22";
  const rows = [{ id: "collaborator-1", profile_id: profileId }];
  it("impede uma conta ligada a outro colaborador", () => {
    expect(isAccountAvailable(profileId, rows)).toBe(false);
  });
  it("mantém a conta do próprio colaborador disponível na edição", () => {
    expect(isAccountAvailable(profileId, rows, "collaborator-1")).toBe(true);
  });
  it("permite conta ainda não vinculada", () => {
    expect(isAccountAvailable(profileId, [])).toBe(true);
  });
  it("exige selecionar uma conta existente", () => {
    expect(() => validateExistingAccountId("")).toThrow();
    expect(validateExistingAccountId(profileId)).toBe(profileId);
  });
});