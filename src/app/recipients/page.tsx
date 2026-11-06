import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { Avatar, CorridorChip } from "@/components/person";
import { RecipientForm } from "@/components/recipient-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listRecipients } from "@/lib/remit";

export const metadata: Metadata = { title: "Recipients" };

export default function RecipientsPage() {
  return (
    <PageShell title="Recipients" intro="People you send money to. Each one is saved in your Nuvion sandbox as a counterparty with its payout details, so you can see them in your dashboard.">
      <div className="space-y-6">
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
  const recipients = await listRecipients();
  if (recipients.length === 0) return <p className="text-sm text-muted-foreground">No recipients yet. Add the first one below.</p>;
  return (
    <ul className="space-y-2">
      {recipients.map((r) => (
        <li key={r.id} className="flex min-h-14 items-center gap-3 rounded-2xl border bg-card p-3">
          <Avatar name={r.name} corridor={r.corridor} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.name}</p>
            <p className="truncate text-sm text-muted-foreground">{r.summary}</p>
          </div>
          <CorridorChip corridor={r.corridor} />
        </li>
      ))}
      <li><Link href="/send" className="inline-block pt-2 font-semibold text-pink-text underline underline-offset-4">Send money</Link></li>
    </ul>
  );
}
