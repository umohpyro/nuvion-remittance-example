import "server-only";
import { CORRIDORS, isCorridor, paymentDetailFields, summarise, type CorridorId } from "@/lib/corridors";
import { getConfig } from "@/lib/config";
import { isStablecoin } from "@/lib/money";
import { nuvion, type ApiAccount, type ApiTransfer, type Counterparty, type List, type PaymentDetail } from "@/lib/nuvion";

/** The visitor's entity. Every Nuvion call acts for it. */
const entityId = async () => (await getConfig()).entityId;

/** Every transfer this app creates has a `unique_reference` that starts with this, so Activity can tell them from other transfers on the entity. */
export const REFERENCE_PREFIX = "remit-";

/** Accounts the sender can pay from: fiat accounts of the entity. Stablecoin accounts are left out. */
export async function loadSourceAccounts(): Promise<ApiAccount[]> {
  const all = await nuvion<List<ApiAccount>>("GET", `/accounts?entity_id=${await entityId()}&limit=100`);
  return all.data.filter((a) => !isStablecoin(a.currency));
}

export async function loadTransfers(limit = 50): Promise<ApiTransfer[]> {
  const r = await nuvion<List<ApiTransfer>>("GET", `/transfers?entity_id=${await entityId()}&type=outflow&limit=${limit}`);
  return r.data.filter((t) => t.unique_reference.startsWith(REFERENCE_PREFIX));
}

/* ---------------- Recipients: individual counterparties tagged in their `meta` ---------------- */

export interface Recipient {
  id: string;
  name: string;
  corridor: CorridorId;
  /** A short, masked label such as "M-Pesa ••••0001". */
  summary: string;
}

const NICKNAME_PREFIX = "Recipient: ";

const toRecipient = (c: Counterparty): Recipient[] =>
  c.meta?.kind === "remit" && c.meta.corridor && isCorridor(c.meta.corridor) && c.nickname?.startsWith(NICKNAME_PREFIX)
    ? [{ id: c.id, name: c.nickname.slice(NICKNAME_PREFIX.length), corridor: c.meta.corridor, summary: c.meta.summary ?? "" }]
    : [];

/** A recipient is a counterparty whose `meta` marks it. Nuvion stores it, so this app needs no database. */
export async function listRecipients(): Promise<Recipient[]> {
  const r = await nuvion<List<Counterparty>>("GET", `/counterparties?entity_id=${await entityId()}&search=${encodeURIComponent(NICKNAME_PREFIX.trim())}&status=active&limit=100`);
  return r.data.flatMap(toRecipient);
}

export async function getRecipient(id: string): Promise<Recipient | null> {
  const c = await nuvion<Counterparty>("GET", `/counterparties/${id}?entity_id=${await entityId()}`);
  return c.status === "inactive" ? null : (toRecipient(c)[0] ?? null);
}

export interface NewRecipient {
  firstName: string;
  lastName: string;
  corridor: CorridorId;
  details: Record<string, string>;
  street: string;
  city: string;
  postcode: string;
}

/**
 * Creates the counterparty, then the payment detail the money will be paid to. If the second call fails, the
 * counterparty is deactivated so a half-saved recipient never shows up in the list (counterparties can't be deleted).
 */
export async function createRecipient(r: NewRecipient): Promise<Recipient> {
  const entity = await entityId();
  const corridor = CORRIDORS[r.corridor];
  const name = `${r.firstName} ${r.lastName}`;
  const summary = summarise(r.corridor, r.details);
  const cp = await nuvion<Counterparty>("POST", "/counterparties", {
    type: "individual",
    entity_id: entity,
    nickname: `${NICKNAME_PREFIX}${name}`,
    meta: { kind: "remit", corridor: r.corridor, summary },
    profile: {
      first_name: r.firstName,
      last_name: r.lastName,
      relationship: "vendor", // the API accepts any string; none of the recommended values fits a family member
      email: "recipient@example.com", // required by the API; this example doesn't collect the recipient's email
      address: { line1: r.street, city: r.city, state_or_province: r.city, postal_code: r.postcode, country: corridor.fixed.country },
    },
  });
  try {
    await nuvion<PaymentDetail>("POST", "/payment-details", {
      ...paymentDetailFields(r.corridor, r.details),
      account_holder_name: name,
      entity_id: entity,
      counterparty_id: cp.id,
    });
  } catch (e) {
    await nuvion("POST", `/counterparties/${cp.id}/deactivate`, { entity_id: entity }).catch(() => {});
    throw e;
  }
  return { id: cp.id, name, corridor: r.corridor, summary };
}

/** The payment detail to pay a recipient: the one on their counterparty in the corridor's currency. */
export async function paymentDetailId(recipient: Recipient): Promise<string | null> {
  const corridor = CORRIDORS[recipient.corridor];
  const list = await nuvion<List<PaymentDetail>>("GET", `/counterparties/${recipient.id}/payment-details?entity_id=${await entityId()}&limit=100`);
  return list.data.find((p) => p.currency === corridor.currency && p.payment_method === corridor.method)?.id ?? null;
}
