import { ArrowRight, CircleCheck, FileCheck2, Lock, Send, UserPlus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/page-shell";
import { TransferRow } from "@/components/transfer-row";
import { Skeleton } from "@/components/ui/skeleton";
import { CORRIDORS, CORRIDOR_IDS } from "@/lib/corridors";
import { formatAmount } from "@/lib/money";
import { loadSourceAccounts, loadTransfers } from "@/lib/remit";

const STEPS = [
  { Icon: Lock, title: "Rate locked", text: "You see what they get before anything leaves your account." },
  { Icon: FileCheck2, title: "Transfer created", text: "Nuvion accepts it and holds the quote for you." },
  { Icon: Send, title: "Sent to the network", text: "Mobile money or bank rails, depending on the country." },
  { Icon: CircleCheck, title: "Delivered", text: "The page follows it until it lands or fails." },
];

const eyebrow = "text-[0.72rem] font-bold tracking-[0.12em] text-muted-foreground uppercase";

export default function Home() {
  return (
    <Container className="space-y-8">
      <section className="grid gap-8 rounded-[28px] bg-linear-to-br from-band from-50% to-c p-6 text-band-foreground sm:p-8 lg:grid-cols-[1fr_340px] lg:gap-10">
        <div className="flex flex-col justify-center">
          <p className="text-[0.72rem] font-bold tracking-[0.12em] text-sand-fixed uppercase">Sandbox remittances</p>
          <h1 className="mt-2 text-[clamp(1.9rem,4vw,2.8rem)] leading-tight font-extrabold tracking-tight text-balance">Send money home</h1>
          <p className="mt-3 max-w-md text-band-foreground/90 text-pretty">Choose who gets it, see the exact amount they receive before you send, then follow it until it arrives.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/send" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground">
              Send money <ArrowRight className="size-5" aria-hidden />
            </Link>
            <Link href="/recipients" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white/10 px-5 font-bold hover:bg-white/15">
              <UserPlus className="size-5" aria-hidden /> Add a recipient
            </Link>
          </div>
        </div>
        <div>
          <h2 className="text-[0.72rem] font-bold tracking-[0.12em] text-sand-fixed uppercase">Where you can send</h2>
          <ul className="mt-3 space-y-2">
            {CORRIDOR_IDS.map((id) => {
              const c = CORRIDORS[id];
              return (
                <li key={id} className="flex items-center gap-3 rounded-2xl bg-black/25 px-3.5 py-2.5">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{c.country}</span>
                    <span className="block truncate text-xs text-band-foreground/80">{c.rail}</span>
                  </span>
                  <span className="text-sm font-extrabold tabular-nums">{c.currency}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <Suspense fallback={<Skeleton className="h-72 w-full" />}>
          <Overview />
        </Suspense>
        <aside className="h-fit rounded-3xl border bg-card p-5 shadow-card">
          <h2 className={eyebrow}>How a transfer travels</h2>
          <ol className="mt-4 space-y-4">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-c/15 text-c-text"><Icon className="size-4.5" aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block font-bold"><span className="mr-1.5 text-c-text tabular-nums">{i + 1}</span>{title}</span>
                  <span className="block text-sm text-muted-foreground text-pretty">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Container>
  );
}

async function Overview() {
  const [accounts, transfers] = await Promise.all([loadSourceAccounts(), loadTransfers(5)]);
  return (
    <div className="space-y-8">
      <section>
        <h2 className={`mb-3 ${eyebrow}`}>You can pay from</h2>
        {accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">This entity has no fiat accounts. Create one in your sandbox dashboard.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-c text-sm font-extrabold text-c-foreground">{a.currency}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm text-muted-foreground">{a.display_name}</span>
                  <span className="block text-2xl font-extrabold tracking-tight tabular-nums">{formatAmount(a.balance.available, a.currency)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className={eyebrow}>Recent transfers</h2>
          {transfers.length > 0 && <Link href="/activity" className="text-sm font-semibold text-c-text underline underline-offset-4">All activity</Link>}
        </div>
        {transfers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-2">
            {transfers.map((t) => <li key={t.id}><TransferRow t={t} /></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
