import { sortCode, ukAccountNumber } from "./bank.ts";

/** The places this app can send money to. Each one is a payment rail the Nuvion docs list under "Supported corridors". */
export type CorridorId = "KE" | "GH" | "GHB" | "NG" | "GB";

export interface Field {
  key: string;
  label: string;
  placeholder: string;
  inputMode?: "numeric" | "tel" | "text";
}

export interface Corridor {
  id: CorridorId;
  country: string;
  /** The currency the recipient receives. */
  currency: string;
  /** How the money arrives, in plain words. */
  rail: string;
  method: "momo-transfer" | "bank-transfer";
  /** Payment detail fields that are the same for every recipient on this rail (a mobile money operator is a `scheme`). */
  fixed: Record<string, string>;
  fields: Field[];
  /** Categorical colour for this corridor's avatar and chip. */
  color: string;
}

export const CORRIDORS: Record<CorridorId, Corridor> = {
  KE: {
    id: "KE",
    country: "Kenya",
    currency: "KES",
    rail: "M-Pesa mobile money",
    method: "momo-transfer",
    fixed: { scheme: "mpesa", country: "KE" },
    fields: [{ key: "phone_number", label: "M-Pesa number", placeholder: "+254700000001", inputMode: "tel" }],
    color: "#2E9E4F",
  },
  GH: {
    id: "GH",
    country: "Ghana",
    currency: "GHS",
    rail: "MTN mobile money",
    method: "momo-transfer",
    fixed: { scheme: "mtn", country: "GH" },
    fields: [{ key: "phone_number", label: "MTN MoMo number", placeholder: "+233240000001", inputMode: "tel" }],
    color: "#B8470A",
  },
  GHB: {
    id: "GHB",
    country: "Ghana",
    currency: "GHS",
    rail: "Bank transfer (GH EFT)",
    method: "bank-transfer",
    fixed: { country: "GH" },
    fields: [
      { key: "bank_name", label: "Bank name", placeholder: "Example Bank" },
      { key: "bank_code", label: "Bank code", placeholder: "030100", inputMode: "numeric" },
      { key: "account_number", label: "Account number", placeholder: "0123456789", inputMode: "numeric" },
    ],
    color: "#8E3FA8",
  },
  NG: {
    id: "NG",
    country: "Nigeria",
    currency: "NGN",
    rail: "Bank transfer (NIP)",
    method: "bank-transfer",
    fixed: { country: "NG" },
    fields: [
      { key: "bank_name", label: "Bank name", placeholder: "Example Bank" },
      { key: "bank_code", label: "Bank code", placeholder: "058", inputMode: "numeric" },
      { key: "account_number", label: "Account number", placeholder: "0123456789", inputMode: "numeric" },
    ],
    color: "#0E8F83",
  },
  GB: {
    id: "GB",
    country: "United Kingdom",
    currency: "GBP",
    rail: "Bank transfer (Faster Payments)",
    method: "bank-transfer",
    fixed: { country: "GB" },
    fields: [
      { key: "bank_name", label: "Bank name", placeholder: "Example Bank" },
      { key: "sort_code", label: "Sort code", placeholder: "04-00-04", inputMode: "numeric" },
      { key: "account_number", label: "Account number", placeholder: "12345678", inputMode: "numeric" },
    ],
    color: "#2F6FE0",
  },
};

/**
 * Corridors whose bank comes from Nuvion's directory (GET /bank-codes/{country}) instead of being typed. `code` is the
 * shape of a usable bank_code; directory entries that don't match (Nigeria's list has a stray Ghanaian bank) are skipped.
 * The UK has no directory in the sandbox, so it stays free text.
 */
export const BANK_PICKER: Partial<Record<CorridorId, { country: string; code: RegExp }>> = {
  NG: { country: "NG", code: /^\d{3,6}$/ },
  GHB: { country: "GH", code: /^(\d{6}|\d{8})$/ },
};

export const CORRIDOR_IDS = Object.keys(CORRIDORS) as CorridorId[];
export const isCorridor = (v: string): v is CorridorId => v in CORRIDORS;

const clean = (v: string) => v.replace(/[\s-]/g, "");

/** Normalises what the visitor typed into the exact values Nuvion needs. Whitespace and dashes are dropped from numbers. */
export function normalise(id: CorridorId, values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of CORRIDORS[id].fields) {
    const raw = values[f.key] ?? "";
    out[f.key] = f.key === "bank_name" ? raw.trim() : f.key === "sort_code" ? (sortCode(raw) ?? clean(raw)) : clean(raw);
  }
  return out;
}

/** Returns a sentence that says what is wrong, or null when the details look valid for this rail. Nuvion checks them again. */
export function checkDetails(id: CorridorId, values: Record<string, string>): string | null {
  const v = normalise(id, values);
  switch (id) {
    case "KE":
      return /^\+254[17]\d{8}$/.test(v.phone_number) ? null : "Enter a Kenyan number in international format, like +254700000001.";
    case "GH":
      return /^\+233\d{9}$/.test(v.phone_number) ? null : "Enter a Ghanaian number in international format, like +233240000001.";
    case "NG":
      if (!v.bank_name) return "Enter the bank's name.";
      if (!/^\d{3,6}$/.test(v.bank_code)) return "Bank code must be 3 to 6 digits.";
      return /^\d{10}$/.test(v.account_number) ? null : "Account number must be 10 digits.";
    case "GHB":
      if (!v.bank_name) return "Choose the bank.";
      if (!/^(\d{6}|\d{8})$/.test(v.bank_code)) return "Bank code must be 6 or 8 digits.";
      return /^\d{6,20}$/.test(v.account_number) ? null : "Enter the account number, digits only.";
    case "GB":
      if (!v.bank_name) return "Enter the bank's name.";
      if (!sortCode(v.sort_code)) return "Sort code must be 6 digits.";
      return ukAccountNumber(v.account_number) ? null : "Account number must be 8 digits.";
  }
}

/** The body of `POST /payment-details`, minus the IDs and the holder's name. */
export function paymentDetailFields(id: CorridorId, values: Record<string, string>): Record<string, string> {
  const c = CORRIDORS[id];
  return { payment_method: c.method, currency: c.currency, ...c.fixed, ...normalise(id, values) };
}

/** A short label for lists. It hides all but the last four digits, so it is safe to keep in counterparty `meta`. */
export function summarise(id: CorridorId, values: Record<string, string>): string {
  const v = normalise(id, values);
  const tail = (s: string) => `••••${s.slice(-4)}`;
  if (CORRIDORS[id].method === "momo-transfer") return `${id === "KE" ? "M-Pesa" : "MTN MoMo"} ${tail(v.phone_number)}`;
  return `${v.bank_name} ${tail(v.account_number)}`;
}
