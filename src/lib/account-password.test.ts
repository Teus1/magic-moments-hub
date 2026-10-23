import { test } from "node:test";
import assert from "node:assert/strict";
import { passwordChangeSchema } from "./account-password";
test("own password accepts six simple characters, rejects five", () => {
  assert.equal(
    passwordChangeSchema.safeParse({
      currentPassword: "old",
      password: "abcdef",
      confirmation: "abcdef",
    }).success,
    true,
  );
  assert.equal(
    passwordChangeSchema.safeParse({
      currentPassword: "old",
      password: "abcde",
      confirmation: "abcde",
    }).success,
    false,
  );
});
test("password change requires current password and matching confirmation", () => {
  assert.equal(
    passwordChangeSchema.safeParse({
      currentPassword: "",
      password: "abcdef",
      confirmation: "abcdef",
    }).success,
    false,
  );
  assert.equal(
    passwordChangeSchema.safeParse({
      currentPassword: "old",
      password: "abcdef",
      confirmation: "abcdeg",
    }).success,
    false,
  );
});
