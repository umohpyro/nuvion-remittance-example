import { Send } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { Avatar, CorridorChip } from "@/components/person";
import { RecipientForm } from "@/components/recipient-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CORRIDORS } from "@/lib/corridors";
import { toDecimal } from "@/lib/money";
import { listRecipients, loadTransfers } from "@/lib/remit";

export const metadata: Metadata = { title: "Recipients" };

export default function RecipientsPage() {
  return (
    <PageShell eyebrow="Contacts" title="Recipients" intro="People you send money to. Each one is saved in your Nuvion sandbox as a counterparty with its payout details, so you can see them in your dashboard.">
      <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-start">
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <Saved />
        </Suspense>
        <Card>
          <CardHeader><CardTitle>Add a recipient</CardTitle></CardHeader>
          <CardContent><RecipientForm /></CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

async function Saved() {
  const [recipients, transfers] = await Promise.all([listRecipients(), loadTransfers(50)]);
  // The newest transfer to each recipient, so "Send again" can prefill the same amount.
  const last = new Map<string, number>();
  for (const t of [...transfers].sort((a, b) => a.created - b.created)) if (t.counterparty_id) last.set(t.counterparty_id, t.amount);
  if (recipients.length === 0) return <p className="text-sm text-muted-foreground">No recipients yet. Add the first one.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {recipients.map((r) => (
        // --c is this corridor's colour for the card, as the design skill asks; it overrides the page coral here only.
        <li key={r.id} style={{ "--c": CORRIDORS[r.corridor].color } as CSSProperties} className="overflow-hidden rounded-2xl border bg-card">
          <div className="h-1.5 bg-c" aria-hidden />
          <div className="space-y-3 p-3.5">
            <div className="flex items-center gap-3">
              <Avatar name={r.name} corridor={r.corridor} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{r.name}</p>
                <p className="truncate text-sm text-muted-foreground">{r.summary}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CorridorChip corridor={r.corridor} />
              <Link
                href={`/send?to=${r.id}${last.has(r.id) ? `&amount=${toDecimal(last.get(r.id)!)}` : ""}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-4 font-bold text-primary-foreground"
              >
                <Send className="size-4" aria-hidden /> Send again
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
