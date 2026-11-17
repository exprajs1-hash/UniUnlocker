import assert from "node:assert/strict";
import { test } from "node:test";
import { ceilMoney, isMoney, roundMoney } from "./money";

test("rounds to paisa without float noise", () => {
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
  assert.equal(roundMoney(1.005), 1.01);
  assert.equal(roundMoney(116.274), 116.27);
});

test("prices round up to the next paisa", () => {
  assert.equal(ceilMoney(0.501), 0.51);
  assert.equal(ceilMoney(0.5), 0.5);
  assert.equal(ceilMoney(330.00000000000006), 330);
  assert.equal(ceilMoney(0.004), 0.01);
});

test("accepts at most 2 decimals", () => {
  assert.equal(isMoney(0.01), true);
  assert.equal(isMoney(12), true);
  assert.equal(isMoney(0.1 + 0.2), true);
  assert.equal(isMoney(0.005), false);
  assert.equal(isMoney(Number.NaN), false);
});

test("formats taka with paisa only when needed", async () => {
  const { formatTaka } = await import("./money");
  assert.equal(formatTaka(117), "৳117");
  assert.equal(formatTaka(0.5), "৳0.50");
  assert.equal(formatTaka(1234.567), "৳1,234.57");
});
