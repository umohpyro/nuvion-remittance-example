import { Check, Send, X } from "lucide-react";
import { timeline, type TransferStatus } from "@/lib/timeline";

/** How far along the route a transfer is, 0 to 1. Nuvion keeps no per-step history, so this comes from `status` alone. */
const PROGRESS: Record<TransferStatus, number> = { new: 1 / 3, pending: 2 / 3, successful: 1, failed: 1 / 3 };

/**
 * The delivery track: your currency on the left, theirs on the right, and a marker that travels between them
 * the way a parcel moves on a tracking page. The marker pulses while the money is on its way.
 */
export function RouteTrack({ status, from, to, place }: { status: TransferStatus; from: string; to: string; place: string }) {
  const pct = PROGRESS[status] * 100;
  const failed = status === "failed";
  const done = status === "successful";
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3" role="img" aria-label={`${from} to ${to}: ${done ? "delivered" : failed ? "not delivered" : "on its way"}`}>
      <span className="grid size-12 place-items-center rounded-full bg-secondary text-sm font-extrabold text-secondary-foreground">{from}</span>
      <div className="relative mx-2 h-8">
        <span className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-border" aria-hidden />
        <span className={`absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full ${failed ? "bg-destructive" : done ? "bg-ok" : "bg-c"}`} style={{ width: `${pct}%` }} aria-hidden />
        <span
          className={`absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-c-foreground ${failed ? "bg-destructive" : done ? "bg-ok" : "remit-ping bg-c"}`}
          style={{ left: `${Math.min(pct, 94)}%` }}
          aria-hidden
        >
          {failed ? <X className="size-4" /> : done ? <Check className="size-4" /> : <Send className="size-4 -rotate-12" />}
        </span>
      </div>
      <span className={`grid size-12 place-items-center rounded-full text-sm font-extrabold ${done ? "bg-ok text-c-foreground" : "bg-secondary text-secondary-foreground"}`}>{to}</span>
      <span className="mt-1 text-xs font-semibold text-muted-foreground">You</span>
      <span />
      <span className="mt-1 text-right text-xs font-semibold text-muted-foreground">{place}</span>
    </div>
  );
}

/** Four small segments, one per checkpoint, for lists. */
export function TrackMini({ status }: { status: TransferStatus }) {
  const steps = timeline(status);
  const tone = { done: status === "successful" ? "bg-ok" : "bg-c", current: "bg-c/40", todo: "bg-border", failed: "bg-destructive" } as const;
  return (
    <span className="flex gap-1" role="img" aria-label={`Step ${steps.filter((s) => s.state === "done").length} of ${steps.length}`}>
      {steps.map((s) => <span key={s.key} className={`h-1.5 w-5 rounded-full ${tone[s.state]}`} />)}
    </span>
  );
}
