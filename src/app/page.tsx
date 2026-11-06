import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, formatDate } from "@/lib/money";
import { loadSourceAccounts, loadTransfers } from "@/lib/remit";

export default function Home() {
  return (
    <PageShell title="Send money home" intro="Choose who gets it, see the exact amount they receive before you send, then follow it until it arrives.">
      <div className="space-y-8">
        <Link href="/send" className="flex min-h-14 items-center justify-between rounded-full bg-primary px-6 py-3 text-lg font-bold text-primary-foreground">
          Send money <ArrowRight className="size-5" aria-hidden />
        </Link>
        <Suspense fallback={<Skeleton className="h-48 w-full" />}>
          <Overview />
        </Suspense>
      </div>
    </PageShell>
  );
}

async function Overview() {
  const [accounts, transfers] = await Promise.all([loadSourceAccounts(), loadTransfers(5)]);
  return (
    <>
      <section>
        <h2 className="mb-3 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">You can pay from</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">This entity has no fiat accounts. Create one in your sandbox dashboard.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {accounts.map((a) => (
              <li key={a.id} className="rounded-2xl border bg-card p-4">
                <p className="truncate text-sm text-muted-foreground">{a.display_name}</p>
                <p className="text-2xl font-extrabold tracking-tight tabular-nums">{formatAmount(a.balance.available, a.currency)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">Recent</h2>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
