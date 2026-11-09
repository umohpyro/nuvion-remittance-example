import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { debitedFor, formatRate } from "@/lib/quote";
import { loadTransfer } from "@/lib/remit";
import { isSettled } from "@/lib/timeline";

export const metadata: Metadata = { title: "Receipt" };

export default function ReceiptPage({ params }: PageProps<"/activity/[id]/receipt">) {
  return (
    <PageShell title="Receipt" intro="A record of this transfer, read from Nuvion. Print it or save it as a PDF.">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Receipt params={params} />
      </Suspense>
    </PageShell>
  );
}

async function Receipt({ params }: { params: PageProps<"/activity/[id]/receipt">["params"] }) {
  const { id } = await params;
  if (!/^[0-9A-Z]{26}$/.test(id)) notFound();
  const view = await loadTransfer(id);
  if (!view) notFound();
  const { t, quote, recipient } = view;
  if (!isSettled(t.status)) redirect(`/activity/${id}`); // a receipt is final only once the transfer is delivered or failed
  const { fee, total } = debitedFor(t.status, t.amount, t.applicable_fee);
  const rows: [string, string][] = [
    ["Status", ""],
    ["Recipient", recipient ? `${recipient.name}, ${recipient.summary}` : t.narration],
    ["Date", formatDate(t.created)],
    ["You sent", formatAmount(quote?.amount_from ?? t.amount, quote?.from ?? t.currency)],
    ...(quote ? ([["They receive", formatAmount(quote.amount_to, quote.to)], ["Rate", `1 ${quote.from} = ${formatRate(quote.rate)} ${quote.to}`]] as [string, string][]) : []),
    ["Fee", t.status === "failed" ? "Not charged" : formatAmount(fee, t.currency)],
    ["Total from your account", formatAmount(total, t.currency)],
    ["Transfer ID", t.id],
    ...(quote ? ([["Quote ID", quote.id]] as [string, string][]) : []),
    ["Reference", t.unique_reference],
    ...(t.counterparty_id ? ([["Recipient ID", t.counterparty_id]] as [string, string][]) : []),
  ];
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border bg-card p-5 shadow-card print:border-0 print:shadow-none">
        <h2 className="mb-3 text-lg font-bold">Nuvion sandbox transfer</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className={`min-w-0 text-right ${/ID$|^Reference$/.test(k) ? "font-mono text-xs break-all" : "font-semibold"}`}>{k === "Status" ? <StatusBadge status={t.status} /> : v}</dd>
            </div>
          ))}
        </dl>
        {t.status === "failed" && <p className="mt-4 text-sm text-muted-foreground">{t.status_reason ? `${t.status_reason}. ` : ""}This transfer was not delivered and nothing was debited.</p>}
        <p className="mt-4 text-xs text-muted-foreground">Independent demo on the Nuvion sandbox. No real money moved. Not a financial record.</p>
      </section>
      <div className="flex flex-wrap items-center gap-4 print:hidden">
        <PrintButton />
        <Link href={`/activity/${id}`} className="font-semibold text-pink-text underline underline-offset-4">Back to delivery</Link>
      </div>
    </div>
  );
}
