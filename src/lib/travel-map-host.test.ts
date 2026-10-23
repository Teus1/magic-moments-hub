import { test } from "node:test";
import assert from "node:assert/strict";
import { isTravelMapHostAllowed } from "./travel-map-host";

test("allows the authorized root custom domain", () => {
  assert.equal(isTravelMapHostAllowed("gerenciadormagicmoments.app"), true);
});
test("allows the authorized www custom domain", () => {
  assert.equal(isTravelMapHostAllowed("www.gerenciadormagicmoments.app"), true);
});
test("preserves credential-free Lovable hosts", () => {
  assert.equal(isTravelMapHostAllowed("magic-moments-suite.lovable.app"), true);
  assert.equal(isTravelMapHostAllowed("preview.lovableproject.com"), true);
});
test("blocks credential-bearing development hosts", () => {
  assert.equal(isTravelMapHostAllowed("project-devserver-private.lovableproject.com"), false);
});
test("blocks local and unauthorized or lookalike domains", () => {
  for (const host of [
    "localhost",
    "example.com",
    "gerenciadormagicmoments.app.example.com",
    "evilgerenciadormagicmoments.app",
  ]) {
    assert.equal(isTravelMapHostAllowed(host), false);
  }
});
