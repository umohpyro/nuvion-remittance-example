/** Pure helpers for the quote and receipt screens. No server imports, so they run in unit tests. */

/** Whole seconds until a quote expires, never negative. Rounded up so "0:00" only shows once it has really lapsed. */
export const secondsLeft = (expiresAt: number, now: number) => Math.max(0, Math.ceil((expiresAt - now) / 1000));

export const isExpired = (expiresAt: number, now: number) => secondsLeft(expiresAt, now) === 0;

/** 125 seconds becomes "2:05". */
export const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** The effective rate Nuvion returns, to at most 6 decimals with trailing zeros dropped: 10.036105, 1500, 0.8. */
export const formatRate = (rate: number) => String(Number(rate.toFixed(6)));

/**
 * What the sender is debited. Nuvion debits the fee in the source currency on top of `amount`,
 * so a balance must cover both. Both numbers are integers in the smallest unit.
 */
export const totalDebited = (amount: number, fee: number) => amount + fee;

/** True once a fee exists. Nuvion has no way to price a fee before a transfer is created, so a quote can't show one. */
export const feeKnown = (fee: number | undefined): fee is number => typeof fee === "number";

/**
 * What a settled or in-flight transfer cost the sender. A failed transfer debits nothing: Nuvion reports its
 * `applicable_fee` but doesn't charge it, and returns the funds.
 */
export function debitedFor(status: "new" | "pending" | "successful" | "failed", amount: number, fee: number): { fee: number; total: number } {
  return status === "failed" ? { fee: 0, total: 0 } : { fee, total: totalDebited(amount, fee) };
}
