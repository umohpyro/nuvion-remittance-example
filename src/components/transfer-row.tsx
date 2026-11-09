import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { TrackMini } from "@/components/track";
import { formatAmount, formatDate } from "@/lib/money";
import type { TransferStatus } from "@/lib/timeline";

/** One transfer in a list: who, when, how much, and a four-segment progress bar. */
export function TransferRow({ t }: { t: { id: string; narration: string; created: number; amount: number; currency: string; status: TransferStatus } }) {
  return (
    <Link href={`/activity/${t.id}`} className="group flex min-h-16 items-center gap-3 rounded-2xl border bg-card p-3.5 transition-[border-color,box-shadow] hover:border-c hover:shadow-card">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate font-bold">{t.narration}</p>
        <p className="text-sm text-muted-foreground">{formatDate(t.created)}</p>
        <TrackMini status={t.status} />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <p className="font-extrabold tabular-nums">{formatAmount(t.amount, t.currency)}</p>
        <StatusBadge status={t.status} />
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground group-hover:text-c-text" aria-hidden />
    </Link>
  );
}
