"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getConfig } from "@/lib/config";
import { BANK_PICKER, CORRIDORS, CORRIDOR_IDS, checkDetails, type CorridorId } from "@/lib/corridors";
import { ConfigError } from "@/lib/env";
import { UserError } from "@/lib/errors";
import { formatAmount, parseAmount } from "@/lib/money";
import { NuvionError, nuvion, type ApiTransfer, type FxQuote } from "@/lib/nuvion";
import { REFERENCE_PREFIX, createRecipient, getRecipient, loadSourceAccounts, paymentDetailId } from "@/lib/remit";

/*
 * Server Actions are public POST endpoints, so every input is validated here. The browser sends IDs, an amount
 * and the recipient's details; currencies, rates and where the money goes are read back from Nuvion.
 */

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string; code?: string };

async function guard<T extends object>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (e) {
    if (e instanceof NuvionError) return { ok: false, error: friendly(e), code: e.type };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Please check your input." };
    if (e instanceof UserError) return { ok: false, error: e.message };
    if (e instanceof ConfigError) return { ok: false, error: `${e.message} Connect your sandbox on the Settings page.`, code: "config" };
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Turns Nuvion error types into sentences a sender can act on. */
function friendly(e: NuvionError): string {
  switch (e.type) {
    case "error_transfer_insufficient_funds":
    case "error_validation_value_out_of_range":
      return e.message; // both messages state the available balance or the allowed range
    case "error_duplicate_resource":
      return "This transfer was already submitted. Check Activity before trying again.";
    case "error_fx_quote_used":
    case "error_fx_quote_expired":
      return "This quote expired or was already used. Get a new one.";
    case "error_fx_quote_amount_mismatch":
      return "The amount no longer matches the quote. Get a new one.";
    case "error_operation_invalid_for_state":
      return "Nuvion can't process this transfer right now. The attempt may be recorded as failed in Activity.";
    case "error_system_dependency_unavailable":
      return "Nuvion couldn't reach a provider. Wait a moment and try again.";
    default:
      return e.summary;
  }
}

const entityId = async () => (await getConfig()).entityId;
const id = z.string().regex(/^[0-9A-Z]{26}$/, "Invalid ID.");

/* ---------------- Recipients ---------------- */

const text = (label: string, max = 60) => z.string().trim().min(1, `Enter ${label}.`).max(max);

const recipientSchema = z.object({
  firstName: text("a first name", 40),
  lastName: text("a last name", 40),
  corridor: z.enum(CORRIDOR_IDS as [CorridorId, ...CorridorId[]]),
  details: z.record(z.string(), z.string().max(80)),
  street: text("a street address", 80),
  city: text("a city"),
  postcode: text("a postcode", 12),
});

export async function addRecipient(input: z.input<typeof recipientSchema>) {
  return guard(async () => {
    const v = recipientSchema.parse(input);
    const bad = checkDetails(v.corridor, v.details);
    if (bad) throw new UserError(bad);
    const recipient = await createRecipient(v);
    revalidatePath("/", "layout");
    return { recipientId: recipient.id };
  });
}

/* ---------------- Bank directory ---------------- */

export type Bank = { name: string; code: string };

// shortcut: per-instance memory cache, a cold start refetches; move to a shared cache if that matters.
const bankCache = new Map<string, { at: number; banks: Bank[] }>();

/** A corridor's bank directory (GET /bank-codes/{country}), cached for a day because it is the same for every tenant. */
export async function loadBanks(corridor: CorridorId) {
  return guard(async () => {
    const picker = BANK_PICKER[corridor];
    if (!picker) throw new UserError("This corridor has no bank directory.");
    const hit = bankCache.get(picker.country);
    if (hit && Date.now() - hit.at < 86_400_000) return { banks: hit.banks };
    const rows = await nuvion<{ bank_name: string; bank_code?: string }[]>("GET", `/bank-codes/${picker.country}`);
    const banks = rows.filter((b) => picker.code.test(b.bank_code ?? "")).map((b) => ({ name: b.bank_name, code: b.bank_code as string }));
    bankCache.set(picker.country, { at: Date.now(), banks });
    return { banks };
  });
}

/* ---------------- Quote and send ---------------- */

const quoteSchema = z.object({ recipientId: id, fromId: id, amount: z.string() });

/** Resolves the sender's account and the recipient from Nuvion. Currencies come from there, never from the browser. */
async function route(recipientId: string, fromId: string) {
  const [accounts, recipient] = await Promise.all([loadSourceAccounts(), getRecipient(recipientId)]);
  const from = accounts.find((a) => a.id === fromId);
  if (!from) throw new UserError("Choose an account to pay from.");
  if (!recipient) throw new UserError("That recipient no longer exists. Save them again on the Recipients page.");
  const to = CORRIDORS[recipient.corridor].currency;
  if (from.currency === to) throw new UserError(`Pick an account that isn't in ${to}. A transfer needs a currency conversion here.`);
  return { from, recipient, to };
}

export async function getQuote(input: z.input<typeof quoteSchema>) {
  return guard(async () => {
    const v = quoteSchema.parse(input);
    const { from, to } = await route(v.recipientId, v.fromId);
    const amount = parseAmount(v.amount);
    if (!amount) throw new UserError("Enter an amount greater than zero with at most 2 decimals.");
    if (amount > from.balance.available) throw new UserError(`Available balance is ${formatAmount(from.balance.available, from.currency)}.`);
    const q = await nuvion<FxQuote>("POST", "/fx-quotes", { entity_id: await entityId(), from_currency: from.currency, to_currency: to, amount_from: amount, account_id: from.id });
    return { quote: { id: q.id, rate: q.rate, amountFrom: q.amount_from, amountTo: q.amount_to, from: q.from, to: q.to, expiresAt: q.quote.expires_at } };
  });
}

const sendSchema = z.object({ quoteId: id, recipientId: id, fromId: id });

/**
 * Re-reads the quote from Nuvion instead of trusting the browser: it must be active and match the account and the
 * recipient's currency. The transfer reference comes from the quote ID and a quote is single use, so a double click
 * can't send twice (the second attempt returns 409).
 */
export async function sendMoney(input: z.input<typeof sendSchema>) {
  return guard(async () => {
    const v = sendSchema.parse(input);
    const { from, recipient, to } = await route(v.recipientId, v.fromId);
    const quote = await nuvion<FxQuote>("GET", `/fx-quotes/${v.quoteId}?entity_id=${await entityId()}`);
    if (quote.quote.status !== "active") throw new UserError("This quote expired or was already used. Get a new one.");
    if (quote.from !== from.currency || quote.to !== to) throw new UserError("This quote doesn't match the account and recipient. Get a new one.");
    if (quote.amount_from > from.balance.available) throw new UserError(`Available balance is ${formatAmount(from.balance.available, from.currency)}.`);

    const detail = await paymentDetailId(recipient);
    if (!detail) throw new UserError("This recipient has no payout details. Save them again on the Recipients page.");
    const transfer = await nuvion<ApiTransfer>("POST", "/transfers", {
      entity_id: await entityId(),
      account_id: from.id,
      payment_detail_id: detail,
      counterparty_id: recipient.id,
      amount: quote.amount_from,
      currency: from.currency, // the source currency: Nuvion debits this and pays out the quote's `to` currency
      narration: `Money to ${recipient.name}`.slice(0, 255),
      payment_type: CORRIDORS[recipient.corridor].method,
      unique_reference: `${REFERENCE_PREFIX}${quote.id}`,
      fx_quote_id: quote.id,
    });
    revalidatePath("/", "layout");
    return { transferId: transfer.id };
  });
}
