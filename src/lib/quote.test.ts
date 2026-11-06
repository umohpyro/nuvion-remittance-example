import assert from "node:assert/strict";
import { test } from "node:test";
import { countdown, feeKnown, formatRate, isExpired, secondsLeft, totalDebited } from "./quote.ts";

test("seconds left rounds up and never goes negative", () => {
  assert.equal(secondsLeft(10_000, 0), 10);
  assert.equal(secondsLeft(10_000, 9_001), 1);
  assert.equal(secondsLeft(10_000, 10_000), 0);
  assert.equal(secondsLeft(10_000, 99_999), 0);
});

test("a quote is expired exactly when no time is left", () => {
  assert.equal(isExpired(10_000, 9_999), false);
  assert.equal(isExpired(10_000, 10_000), true);
});

test("countdown shows minutes and padded seconds", () => {
  assert.equal(countdown(125), "2:05");
  assert.equal(countdown(59), "0:59");
  assert.equal(countdown(0), "0:00");
});

test("rate keeps up to 6 decimals and drops trailing zeros", () => {
  assert.equal(formatRate(10.036105), "10.036105");
  assert.equal(formatRate(1500), "1500");
  assert.equal(formatRate(0.8), "0.8");
  assert.equal(formatRate(0.12345678), "0.123457");
});

test("the fee is debited on top of the amount, in whole minor units", () => {
  assert.equal(totalDebited(5000, 50), 5050);
  assert.equal(totalDebited(5000, 0), 5000);
});

test("a fee of zero is still a known fee", () => {
  assert.equal(feeKnown(0), true);
  assert.equal(feeKnown(undefined), false);
});

import { debitedFor } from "./quote.ts";

test("a failed transfer debits nothing, any other status debits amount plus fee", () => {
  assert.deepEqual(debitedFor("failed", 5000, 200), { fee: 0, total: 0 });
  assert.deepEqual(debitedFor("pending", 5000, 200), { fee: 200, total: 5200 });
  assert.deepEqual(debitedFor("successful", 5000, 0), { fee: 0, total: 5000 });
});
