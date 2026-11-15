import assert from "node:assert/strict";
import { test } from "node:test";
import { stripProviderContacts } from "./provider-text";

test("removes the provider's help line", () => {
  assert.equal(stripProviderContacts("Any help (+60 11-3788 9442)"), "");
});

test("keeps credentials and drops the contact line", () => {
  const input = "User ID: abc123\nPassword: 98765432\nAny help (+60 11-3788 9442)";
  assert.equal(stripProviderContacts(input), "User ID: abc123\nPassword: 98765432");
});

test("removes an international number inside other text", () => {
  assert.equal(stripProviderContacts("Done. Questions? +880 1712-345678"), "Done. Questions?");
});

test("drops WhatsApp lines", () => {
  assert.equal(stripProviderContacts("Login: x\nWhatsApp 01712345678"), "Login: x");
});

test("leaves numeric passwords without a contact word alone", () => {
  assert.equal(stripProviderContacts("Password: 0171234567890"), "Password: 0171234567890");
});
