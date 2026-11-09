import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { TransferRow } from "@/components/transfer-row";
import { Skeleton } from "@/components/ui/skeleton";
import { loadTransfers } from "@/lib/remit";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <PageShell eyebrow="Tracking" title="Activity" intro="Every transfer you sent from this app. Open one to follow its delivery.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <List />
      </Suspense>
    </PageShell>
  );
}

async function List() {
  const transfers = await loadTransfers();
  if (transfers.length === 0) return <p className="text-sm text-muted-foreground">Nothing sent yet. <Link href="/send" className="font-semibold text-c-text underline underline-offset-4">Send money</Link></p>;
  return (
    <ul className="space-y-2">
      {transfers.map((t) => <li key={t.id}><TransferRow t={t} /></li>)}
    </ul>
  );
}
