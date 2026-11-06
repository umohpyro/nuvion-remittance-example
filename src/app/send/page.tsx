import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { SendForm } from "@/components/send-form";
import { Skeleton } from "@/components/ui/skeleton";
import { listRecipients, loadSourceAccounts } from "@/lib/remit";

export const metadata: Metadata = { title: "Send money" };

export default function SendPage() {
  return (
    <PageShell title="Send money" intro="Pick who gets it and how much you send. You see the exact amount they receive, the rate and how long it is locked before anything leaves your account.">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Form />
      </Suspense>
    </PageShell>
  );
}

async function Form() {
  const [recipients, accounts] = await Promise.all([listRecipients(), loadSourceAccounts()]);
  if (recipients.length === 0) {
    return (
      <div className="rounded-2xl bg-secondary p-5 text-secondary-foreground">
        <p className="font-semibold">Save someone to send to first.</p>
        <p className="mt-1 text-sm">Add a recipient with their mobile money number or bank details.</p>
        <Link href="/recipients" className="mt-3 inline-block font-semibold underline underline-offset-4">Add a recipient</Link>
      </div>
    );
  }
  return (
    <>
      <SendForm
        recipients={recipients}
        accounts={accounts.map((a) => ({ id: a.id, name: a.display_name, currency: a.currency, availableMinor: a.balance.available }))}
      />
      <p className="mt-6 text-sm text-muted-foreground text-pretty">
        The sandbox doesn&apos;t settle every payout, so a transfer can end as Failed. Nothing real moves either way, and a failed transfer is not charged.
      </p>
    </>
  );
}
