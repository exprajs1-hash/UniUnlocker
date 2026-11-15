import assert from "node:assert/strict";
import { test } from "node:test";
import { detectCategory, effectiveCategory } from "./rent-category";

test("rent in the name wins over the provider type", () => {
  assert.equal(detectCategory("SERVER", "UNLOCK TOOL RENT (6-Hours)"), "rent");
  assert.equal(detectCategory("IMEI", "Alien Tool 6 Hour (Rental)"), "rent");
});

test("provider type decides otherwise", () => {
  assert.equal(detectCategory("REMOTE", "Remote unlock"), "rent");
  assert.equal(detectCategory("SERVER", "UnlockTool 12 Months License"), "server");
  assert.equal(detectCategory("IMEI", "iPhone Carrier Check"), "imei");
  assert.equal(detectCategory("", "Something"), "imei");
});

test("the admin's choice overrides detection", () => {
  assert.equal(effectiveCategory({ category: "server", type: "IMEI", name: "x rent" }), "server");
  assert.equal(effectiveCategory({ category: "", type: "SERVER", name: "License" }), "server");
});
