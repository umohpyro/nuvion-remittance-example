import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { PageShell } from "@/components/page-shell";
import { Avatar, CorridorChip } from "@/components/person";
import { StatusBadge } from "@/components/status-badge";
import { TimelineView } from "@/components/timeline-view";
import { Skeleton } from "@/components/ui/skeleton";
import { getConfig } from "@/lib/config";
import { formatAmount, formatDate } from "@/lib/money";
import { NuvionError, nuvion, type ApiTransfer, type FxQuote } from "@/lib/nuvion";
import { debitedFor, formatRate } from "@/lib/quote";
import { getRecipient } from "@/lib/remit";
import { isSettled } from "@/lib/timeline";

export const metadata: Metadata = { title: "Transfer" };

export default function TransferPage({ params }: PageProps<"/activity/[id]">) {
  return (
    <PageShell title="Delivery" intro="Read from Nuvion on every visit, so it always shows where the money is.">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Transfer params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Transfer({ params }: { params: PageProps<"/activity/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9A-Z]{26}$/.test(id)) notFound();
  const entity = (await getConfig()).entityId;

  // Nuvion is the source of truth: the transfer, its quote and its recipient are read from the API on every visit.
  let t: ApiTransfer;
  try {
    t = await nuvion<ApiTransfer>("GET", `/transfers/${id}?entity_id=${entity}`);
  } catch (e) {
    if (e instanceof NuvionError && e.httpStatus === 404) notFound();
    throw e;
  }
  const quoteId = t.meta?.fx_quote_id;
  const [quote, recipient] = await Promise.all([
    quoteId ? nuvion<FxQuote>("GET", `/fx-quotes/${quoteId}?entity_id=${entity}`).catch(() => null) : null,
    t.counterparty_id ? getRecipient(t.counterparty_id).catch(() => null) : null,
  ]);
  const { fee, total } = debitedFor(t.status, t.amount, t.applicable_fee);

  return (
    <div className="space-y-6">
      {!isSettled(t.status) && <AutoRefresh />}
      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <div className="flex items-center gap-3">
          {recipient && <Avatar name={recipient.name} corridor={recipient.corridor} />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{recipient?.name ?? t.narration}</p>
            {recipient && <CorridorChip corridor={recipient.corridor} />}
          </div>
          <StatusBadge status={t.status} />
        </div>
        {quote && (
          <>
            <p className="mt-5 text-sm text-muted-foreground">{t.status === "successful" ? "They received" : "They receive"}</p>
            <p className="text-4xl font-extrabold tracking-tight tabular-nums">{formatAmount(quote.amount_to, quote.to)}</p>
          </>
        )}
        {t.status === "failed" && (
          <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {t.status_reason ? `${t.status_reason}. ` : ""}This transfer was not delivered. Nothing was debited from your account.
          </p>
        )}
        {!isSettled(t.status) && <p className="mt-4 text-sm text-muted-foreground">Still on its way. This page refreshes on its own.</p>}
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="mb-4 text-lg font-bold">Delivery progress</h2>
        <TimelineView status={t.status} />
      </section>

      <section className="rounded-3xl border bg-card p-5 shadow-card">
        <h2 className="mb-3 text-lg font-bold">Receipt</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-muted-foreground">You sent</dt><dd className="text-right font-semibold tabular-nums">{formatAmount(t.amount, t.currency)}</dd>
          {quote && (<><dt className="text-muted-foreground">Rate</dt><dd className="text-right tabular-nums">1 {quote.from} = {formatRate(quote.rate)} {quote.to}</dd></>)}
          <dt className="text-muted-foreground">Fee</dt><dd className="text-right tabular-nums">{t.status === "failed" ? "Not charged" : formatAmount(fee, t.currency)}</dd>
          <dt className="border-t pt-2 font-semibold">Total from your account</dt><dd className="border-t pt-2 text-right font-bold tabular-nums">{formatAmount(total, t.currency)}</dd>
          <dt className="text-muted-foreground">Sent</dt><dd className="text-right">{formatDate(t.created)}</dd>
          <dt className="text-muted-foreground">Transfer ID</dt><dd className="text-right font-mono text-xs break-all">{t.id}</dd>
        </dl>
      </section>
      <Link href="/activity" className="inline-block font-semibold text-pink-text underline underline-offset-4">Back to activity</Link>
    </div>
  );
}
