import assert from "node:assert/strict";
import { test } from "node:test";
import { checkDetails, paymentDetailFields, summarise } from "./corridors.ts";

test("accepts valid details for each corridor", () => {
  assert.equal(checkDetails("KE", { phone_number: "+254 700 000 001" }), null);
  assert.equal(checkDetails("GH", { phone_number: "+233240000001" }), null);
  assert.equal(checkDetails("NG", { bank_name: "Example Bank", bank_code: "058", account_number: "0123456789" }), null);
  assert.equal(checkDetails("GB", { bank_name: "Example Bank", sort_code: "04-00-04", account_number: "12345678" }), null);
});

test("rejects numbers in the wrong shape", () => {
  assert.ok(checkDetails("KE", { phone_number: "0700000001" }));
  assert.ok(checkDetails("GH", { phone_number: "+254700000001" }));
  assert.ok(checkDetails("NG", { bank_name: "B", bank_code: "058", account_number: "123" }));
  assert.ok(checkDetails("GB", { bank_name: "B", sort_code: "0400", account_number: "12345678" }));
  assert.ok(checkDetails("GB", { bank_name: "", sort_code: "040004", account_number: "12345678" }));
});

test("payment detail body carries the rail, currency and scheme", () => {
  assert.deepEqual(paymentDetailFields("KE", { phone_number: "+254 700 000 001" }), {
    payment_method: "momo-transfer",
    currency: "KES",
    scheme: "mpesa",
    country: "KE",
    phone_number: "+254700000001",
  });
  assert.equal(paymentDetailFields("GB", { bank_name: "Example Bank", sort_code: "04-00-04", account_number: "12345678" }).sort_code, "040004");
});

test("the saved summary hides all but the last four digits", () => {
  assert.equal(summarise("KE", { phone_number: "+254700000001" }), "M-Pesa ••••0001");
  assert.ok(!summarise("GB", { bank_name: "Example Bank", sort_code: "040004", account_number: "12345678" }).includes("1234"));
});
