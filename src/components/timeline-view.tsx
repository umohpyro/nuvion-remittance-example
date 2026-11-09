import { Check, X } from "lucide-react";
import { timeline, type Step, type TransferStatus } from "@/lib/timeline";

/** One line under each checkpoint, in the words a tracking page uses. */
function detail(s: Step, name: string, rail: string): string {
  switch (s.key) {
    case "quote":
      return "The rate you saw is the rate this transfer uses.";
    case "created":
      return "Nuvion accepted the transfer.";
    case "sent":
      return s.state === "current" ? `Sending via ${rail}.` : s.state === "done" ? `Sent via ${rail}.` : "Waiting for the payment network.";
    case "delivered":
      return s.state === "done" ? `${name} has the money.` : s.state === "current" ? `Waiting for ${name}'s provider to confirm.` : s.state === "failed" ? "The provider did not complete it." : `${name} gets the money.`;
  }
}

/** Delivery checkpoints as a vertical tracking list. Every checkpoint has an icon, a title and a sentence, so colour is never the only signal. */
export function TimelineView({ status, name, rail }: { status: TransferStatus; name: string; rail: string }) {
  const steps = timeline(status);
  return (
    <ol aria-label="Delivery progress">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        const filled = s.state === "done" || s.state === "failed";
        const node = s.state === "failed" ? "bg-destructive text-c-foreground" : s.state === "done" ? (last ? "bg-ok text-c-foreground" : "bg-c text-c-foreground") : s.state === "current" ? "remit-ping border-2 border-c bg-card" : "border-2 border-dashed border-border bg-card";
        return (
          <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0" aria-current={s.state === "current" ? "step" : undefined}>
            {!last && <span className={`absolute top-7 -bottom-1 left-3.5 w-0.5 -translate-x-1/2 ${s.state === "done" ? "bg-c" : "bg-border"}`} aria-hidden />}
            <span className={`z-10 grid size-7 shrink-0 place-items-center rounded-full ${node}`}>
              {filled ? s.state === "failed" ? <X className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden /> : s.state === "current" ? <span className="size-2.5 rounded-full bg-c" aria-hidden /> : null}
            </span>
            <span className="-mt-0.5 min-w-0">
              <span className={`block font-bold ${s.state === "todo" ? "text-muted-foreground" : ""}`}>{s.title}</span>
              <span className="block text-sm text-muted-foreground text-pretty">{detail(s, name, rail)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
