import assert from "node:assert/strict";
import { test } from "node:test";
import { parseProviderState } from "./provider-state";

test("DHRU status numbers", () => {
  assert.equal(parseProviderState("4"), "completed");
  assert.equal(parseProviderState("3"), "rejected");
  assert.equal(parseProviderState("1"), "processing");
  assert.equal(parseProviderState("0"), "pending");
  assert.equal(parseProviderState(" 4 "), "completed");
});

test("words with extra text are understood", () => {
  assert.equal(parseProviderState("Completed Successfully"), "completed");
  assert.equal(parseProviderState("Order Completed!"), "completed");
  assert.equal(parseProviderState("SUCCESS"), "completed");
  assert.equal(parseProviderState("<span class='label'>Success</span>"), "completed");
  assert.equal(parseProviderState("Delivered"), "completed");
  assert.equal(parseProviderState("In Process"), "processing");
  assert.equal(parseProviderState("Processing..."), "processing");
  assert.equal(parseProviderState("Order Rejected - Refunded"), "rejected");
  assert.equal(parseProviderState("Cancelled"), "rejected");
});

test("never mistakes a failure for a delivery", () => {
  assert.equal(parseProviderState("Not Completed"), "rejected");
  assert.equal(parseProviderState("Incomplete"), "pending");
  assert.equal(parseProviderState("Failed"), "rejected");
  assert.equal(parseProviderState("Success? No - Rejected"), "rejected");
});

test("unknown or empty stays pending", () => {
  assert.equal(parseProviderState(""), "pending");
  assert.equal(parseProviderState("Waiting"), "pending");
  assert.equal(parseProviderState("New"), "pending");
});
