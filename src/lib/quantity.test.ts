import assert from "node:assert/strict";
import { test } from "node:test";
import { effectiveQuantityLimits } from "./quantity";

test("auto uses the provider's limits", () => {
  assert.deepEqual(effectiveQuantityLimits({ minQuantity: 1, maxQuantity: 50 }), { minQuantity: 1, maxQuantity: 50 });
  assert.deepEqual(effectiveQuantityLimits({}), { minQuantity: 1, maxQuantity: 1 });
});

test("locked keeps one fixed amount, the provider's minimum", () => {
  assert.deepEqual(effectiveQuantityLimits({ minQuantity: 1, maxQuantity: 50, quantityMode: "locked" }), {
    minQuantity: 1,
    maxQuantity: 1,
  });
});

test("open uses the admin's range even when the provider sends none", () => {
  assert.deepEqual(
    effectiveQuantityLimits({ minQuantity: 1, maxQuantity: 1, quantityMode: "open", customMinQuantity: 2, customMaxQuantity: 100 }),
    { minQuantity: 2, maxQuantity: 100 },
  );
});

test("limits stay within 1–1000 and max is never below min", () => {
  assert.deepEqual(
    effectiveQuantityLimits({ quantityMode: "open", customMinQuantity: 50, customMaxQuantity: 10 }),
    { minQuantity: 50, maxQuantity: 50 },
  );
  assert.deepEqual(
    effectiveQuantityLimits({ quantityMode: "open", customMinQuantity: 0, customMaxQuantity: 99999 }),
    { minQuantity: 1, maxQuantity: 1000 },
  );
});
