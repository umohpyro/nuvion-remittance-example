import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { loadTransfers } from "@/lib/remit";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <PageShell title="Activity" intro="Every transfer you sent from this app. Open one to follow its delivery.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <List />
      </Suspense>
    </PageShell>
  );
}

async function List() {
  const transfers = await loadTransfers();
  if (transfers.length === 0) return <p className="text-sm text-muted-foreground">Nothing sent yet. <Link href="/send" className="font-semibold underline underline-offset-4">Send money</Link></p>;
  return (
    <ul className="space-y-2">
      {transfers.map((t) => (
        <li key={t.id}>
          <Link href={`/activity/${t.id}`} className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-3 hover:border-primary">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{t.narration}</p>
              <p className="text-sm text-muted-foreground">{formatDate(t.created)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums">{formatAmount(t.amount, t.currency)}</p>
              <StatusBadge status={t.status} />
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
