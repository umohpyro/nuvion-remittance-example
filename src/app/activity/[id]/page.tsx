import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type CSSProperties } from "react";
import { AutoRefresh } from "@/components/auto-refresh";
import { Container } from "@/components/page-shell";
import { Avatar } from "@/components/person";
import { StatusBadge } from "@/components/status-badge";
import { RouteTrack } from "@/components/track";
import { TimelineView } from "@/components/timeline-view";
import { Skeleton } from "@/components/ui/skeleton";
import { CORRIDORS } from "@/lib/corridors";
import { formatAmount, formatDate } from "@/lib/money";
import { debitedFor, formatRate } from "@/lib/quote";
import { loadTransfer } from "@/lib/remit";
import { isSettled } from "@/lib/timeline";

export const metadata: Metadata = { title: "Transfer" };

export default function TransferPage({ params }: PageProps<"/activity/[id]">) {
  return (
    <Container>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Transfer params={params} />
      </Suspense>
    </Container>
  );
}

async function Transfer({ params }: { params: PageProps<"/activity/[id]">["params"] }) {
  const { id } = await params;
  if (!/^[0-9A-Z]{26}$/.test(id)) notFound();
  const view = await loadTransfer(id); // Nuvion is the source of truth: read on every visit
  if (!view) notFound();
  const { t, quote, recipient } = view;
  const { fee, total } = debitedFor(t.status, t.amount, t.applicable_fee);

  const corridor = recipient ? CORRIDORS[recipient.corridor] : null;
  const from = quote?.from ?? t.currency;
  const to = quote?.to ?? corridor?.currency;
  const first = recipient?.name.split(" ")[0] ?? "They";
  const eyebrow = "text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground uppercase";

  return (
    <div className="space-y-6">
      {!isSettled(t.status) && <AutoRefresh />}
      {/* --c is the corridor's colour for this page, as the design skill asks; it overrides the page coral here only. */}
      <section style={corridor ? ({ "--c": t.status === "failed" ? "var(--destructive)" : corridor.color } as CSSProperties) : undefined} className="rounded-[28px] bg-linear-to-br from-band from-50% to-c p-6 text-band-foreground sm:p-8">
        <div className="flex items-center gap-3">
          {recipient && <Avatar name={recipient.name} corridor={recipient.corridor} />}
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{recipient?.name ?? t.narration}</p>
            {corridor && <p className="truncate text-sm text-band-foreground/85">{corridor.country} · {corridor.rail}</p>}
          </div>
          <span className="rounded-full bg-card"><StatusBadge status={t.status} /></span>
        </div>
        {quote && (
          <>
            <p className="mt-6 text-[0.72rem] font-bold tracking-[0.12em] text-sand-fixed uppercase">{t.status === "successful" ? "They received" : "They receive"}</p>
            <p className="text-[clamp(2.4rem,7vw,3.6rem)] leading-tight font-extrabold tracking-tight tabular-nums">{formatAmount(quote.amount_to, quote.to)}</p>
          </>
        )}
        {t.status === "failed" && (
          <p className="mt-4 rounded-xl bg-black/30 p-3 text-sm text-pretty">
            {t.status_reason ? `${t.status_reason}. ` : ""}This transfer was not delivered. Nothing was debited from your account.
          </p>
        )}
        {!isSettled(t.status) && <p className="mt-4 text-sm text-band-foreground/90">Still on its way. This page refreshes on its own.</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <section className="space-y-6 rounded-3xl border bg-card p-5 shadow-card sm:p-6">
          <h2 className={eyebrow}>Tracking</h2>
          {to && <RouteTrack status={t.status} from={from} to={to} place={corridor?.country ?? "Recipient"} />}
          <TimelineView status={t.status} name={first} rail={corridor?.rail ?? "the payment network"} />
        </section>

        <section className="rounded-3xl border bg-card p-5 shadow-card">
          <h2 className={`mb-3 ${eyebrow}`}>Receipt</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">You sent</dt><dd className="text-right font-semibold tabular-nums">{formatAmount(t.amount, t.currency)}</dd>
            {quote && (<><dt className="text-muted-foreground">Rate</dt><dd className="text-right tabular-nums">1 {quote.from} = {formatRate(quote.rate)} {quote.to}</dd></>)}
            <dt className="text-muted-foreground">Fee</dt><dd className="text-right tabular-nums">{t.status === "failed" ? "Not charged" : formatAmount(fee, t.currency)}</dd>
            <dt className="border-t pt-2 font-semibold">Total from your account</dt><dd className="border-t pt-2 text-right font-bold tabular-nums">{formatAmount(total, t.currency)}</dd>
            <dt className="text-muted-foreground">Sent</dt><dd className="text-right">{formatDate(t.created)}</dd>
            <dt className="text-muted-foreground">Transfer ID</dt><dd className="text-right font-mono text-xs break-all">{t.id}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4">
            {isSettled(t.status) && <Link href={`/activity/${t.id}/receipt`} className="font-semibold text-c-text underline underline-offset-4">View receipt</Link>}
            <Link href="/activity" className="font-semibold text-c-text underline underline-offset-4">Back to activity</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
