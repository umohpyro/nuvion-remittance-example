"use client";

import { ArrowRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getQuote, sendMoney } from "@/app/actions";
import { Avatar } from "@/components/person";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CORRIDORS, type CorridorId } from "@/lib/corridors";
import { formatAmount, parseAmount } from "@/lib/money";
import { countdown, formatRate, isExpired, secondsLeft } from "@/lib/quote";

export interface RecipientOption {
  id: string;
  name: string;
  corridor: CorridorId;
  summary: string;
}
export interface AccountOption {
  id: string;
  name: string;
  currency: string;
  availableMinor: number;
}
interface Quote {
  id: string;
  rate: number;
  amountFrom: number;
  amountTo: number;
  from: string;
  to: string;
  expiresAt: number;
}

export function SendForm({ recipients, accounts, initial }: { recipients: RecipientOption[]; accounts: AccountOption[]; initial?: { recipientId?: string; amount?: string } }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [recipientId, setRecipientId] = useState(initial?.recipientId ?? recipients[0]?.id ?? "");
  const recipient = recipients.find((r) => r.id === recipientId);
  const to = recipient ? CORRIDORS[recipient.corridor].currency : "";
  // An account in the recipient's own currency can't fund a conversion, so it isn't offered.
  const usable = accounts.filter((a) => a.currency !== to);
  const [fromId, setFromId] = useState("");
  const from = usable.find((a) => a.id === fromId) ?? usable[0];
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!quote) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [quote]);

  const expired = quote !== null && isExpired(quote.expiresAt, now);
  const minor = parseAmount(amount);
  const problem = !amount ? null : !minor ? "Enter an amount with at most 2 decimals." : from && minor > from.availableMinor ? `Available: ${formatAmount(from.availableMinor, from.currency)}.` : null;
  const reset = () => setQuote(null);

  if (!recipient) return null;
  if (!from) return <p className="text-sm text-muted-foreground">You need a fiat account that isn&apos;t in {to} to send from. Create one in your sandbox dashboard.</p>;

  const firstName = recipient.name.split(" ")[0];
  return (
    <form
      className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (quote && !expired) {
            const r = await sendMoney({ quoteId: quote.id, recipientId, fromId: from.id });
            if (!r.ok) return void toast.error(r.error);
            router.push(`/activity/${r.transferId}`);
            return;
          }
          const r = await getQuote({ recipientId, fromId: from.id, amount });
          if (!r.ok) return void toast.error(r.error);
          setQuote(r.quote);
          setNow(Date.now());
        });
      }}
    >
      <div className="space-y-6">
        <fieldset className="space-y-3">
          <legend className="mb-1 text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">Choose a route</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {recipients.map((r) => {
              const c = CORRIDORS[r.corridor];
              return (
                <label
                  key={r.id}
                  className="flex cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-3.5 transition-colors has-[:checked]:border-c has-[:checked]:bg-c/10 has-[:checked]:ring-2 has-[:checked]:ring-c/30 has-[:focus-visible]:ring-3"
                >
                  <input type="radio" name="recipient" className="sr-only" value={r.id} checked={r.id === recipientId} onChange={() => { setRecipientId(r.id); reset(); }} />
                  <span className="flex items-center gap-3">
                    <Avatar name={r.name} corridor={r.corridor} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{r.name}</span>
                      <span className="block truncate text-sm text-muted-foreground">{r.summary}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 border-t pt-2.5 text-sm">
                    <span className="font-extrabold tabular-nums">{from.currency}</span>
                    <ArrowRight className="size-4 text-c-text" aria-hidden />
                    <span className="font-extrabold tabular-nums">{c.currency}</span>
                    <span className="min-w-0 text-muted-foreground">{c.country}, {c.rail}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="from">Pay from</Label>
          <NativeSelect id="from" className="h-11" value={from.id} onChange={(e) => { setFromId(e.target.value); reset(); }}>
            {usable.map((a) => <option key={a.id} value={a.id}>{a.name} · {formatAmount(a.availableMinor, a.currency)}</option>)}
          </NativeSelect>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-20">
        <section className="rounded-3xl bg-linear-to-br from-band from-55% to-c p-5 text-band-foreground" aria-label="Amount">
          <div className="md:max-lg:grid md:max-lg:grid-cols-[1fr_auto_1fr] md:max-lg:items-center md:max-lg:gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-bold tracking-[0.12em] text-sand-fixed uppercase">You send ({from.currency})</Label>
              <input
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="50.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); reset(); }}
                aria-invalid={Boolean(problem)}
                className="h-16 w-full rounded-2xl border border-white/25 bg-black/25 px-4 text-3xl font-extrabold tracking-tight tabular-nums text-band-foreground outline-none placeholder:text-band-foreground/45 focus-visible:border-white/70 focus-visible:ring-3 focus-visible:ring-white/30 aria-invalid:border-destructive"
              />
              {problem && <p className="text-sm font-semibold text-sand-fixed">{problem}</p>}
            </div>
            <span className="mx-auto my-3 grid size-9 place-items-center rounded-full bg-white/15 md:max-lg:my-0" aria-hidden>
              <ArrowRight className="size-5 rotate-90 md:max-lg:rotate-0" />
            </span>
            <div className="space-y-1.5" aria-live="polite">
              <p className="text-xs font-bold tracking-[0.12em] text-sand-fixed uppercase">{firstName} receives ({to})</p>
              <p className={`flex h-16 items-center rounded-2xl bg-black/25 px-4 text-3xl font-extrabold tracking-tight tabular-nums ${quote ? "" : "text-band-foreground/45"}`}>
                {quote ? formatAmount(quote.amountTo, quote.to) : "—"}
              </p>
            </div>
          </div>
        </section>

        {quote && (
          <section className="rounded-3xl border bg-card p-5 shadow-card" aria-live="polite" aria-label="Your quote">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">You send</dt>
              <dd className="text-right font-semibold tabular-nums">{formatAmount(quote.amountFrom, quote.from)}</dd>
              <dt className="text-muted-foreground">Rate</dt>
              <dd className="text-right font-semibold tabular-nums">1 {quote.from} = {formatRate(quote.rate)} {quote.to}</dd>
              <dt className="text-muted-foreground">Fee</dt>
              <dd className="text-right">Added on top of what you send. Nuvion can&apos;t price it before sending, so it shows on your receipt.</dd>
              <dt className="text-muted-foreground">Quote</dt>
              <dd className={`flex items-center justify-end gap-1.5 font-semibold tabular-nums ${expired ? "text-destructive" : ""}`}>
                <Clock className="size-4" aria-hidden />
                {expired ? "Expired" : `Locked for ${countdown(secondsLeft(quote.expiresAt, now))}`}
              </dd>
            </dl>
          </section>
        )}

        <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base font-bold" disabled={pending || !minor || Boolean(problem)}>
          {pending ? "Working…" : quote && !expired ? `Send ${formatAmount(quote.amountFrom, quote.from)} to ${firstName}` : quote ? "Quote expired. Get a new one" : "See what they'll get"}
        </Button>
      </div>
    </form>
  );
}
