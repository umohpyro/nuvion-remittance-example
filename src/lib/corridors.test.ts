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

test("Ghana bank transfers need a 6 or 8 digit bank code and digits for the account", () => {
  const ok = { bank_name: "Example Bank", bank_code: "030100", account_number: "1234567890" };
  assert.equal(checkDetails("GHB", ok), null);
  assert.equal(checkDetails("GHB", { ...ok, bank_code: "0301" }), "Bank code must be 6 or 8 digits.");
  assert.match(checkDetails("GHB", { ...ok, account_number: "12ab" }) ?? "", /digits only/);
  assert.equal(paymentDetailFields("GHB", ok).country, "GH");
});

test("only corridors with a bank directory get a picker, and their code patterns skip stray entries", async () => {
  const { BANK_PICKER } = await import("./corridors.ts");
  assert.deepEqual(Object.keys(BANK_PICKER).sort(), ["GHB", "NG"]);
  assert.equal(BANK_PICKER.NG?.code.test("ABSA"), false);
  assert.equal(BANK_PICKER.GHB?.code.test("280100"), true);
});
