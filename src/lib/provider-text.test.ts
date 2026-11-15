import assert from "node:assert/strict";
import { test } from "node:test";
import { parseResultLines, stripProviderContacts } from "./provider-text";

test("splits labelled lines so only the value is copied", () => {
  assert.deepEqual(parseResultLines("Username: Trueunlock12@gmail.com\nPassword: 4VyGsYsvh3"), [
    { label: "Username", value: "Trueunlock12@gmail.com" },
    { label: "Password", value: "4VyGsYsvh3" },
  ]);
});

test("keeps unlabelled lines and links whole", () => {
  assert.deepEqual(parseResultLines("Your code is ready\nhttps://example.com/x"), [
    { label: null, value: "Your code is ready" },
    { label: null, value: "https://example.com/x" },
  ]);
});

test("a value that itself contains a colon stays intact", () => {
  assert.deepEqual(parseResultLines("Password: ab:cd"), [{ label: "Password", value: "ab:cd" }]);
});

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
