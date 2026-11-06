import { Check, Circle, Clock, X } from "lucide-react";
import { timeline, type StepState, type TransferStatus } from "@/lib/timeline";

const ICON = { done: Check, current: Clock, todo: Circle, failed: X } as const;
const TONE: Record<StepState, string> = {
  done: "bg-ok text-white",
  current: "bg-warn text-white",
  todo: "bg-muted text-muted-foreground",
  failed: "bg-destructive text-white dark:text-[#170504]",
};

/** The delivery steps as a vertical list. Each step has an icon and a word, so colour is never the only signal. */
export function TimelineView({ status }: { status: TransferStatus }) {
  const steps = timeline(status);
  return (
    <ol className="space-y-0" aria-label="Delivery progress">
      {steps.map((s, i) => {
        const Icon = ICON[s.state];
        return (
          <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span className="absolute top-8 bottom-0 left-4 -ml-px w-0.5 bg-border" aria-hidden />}
            <span className={`z-10 grid size-8 shrink-0 place-items-center rounded-full ${TONE[s.state]}`}>
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="pt-1">
              <span className={`block font-semibold ${s.state === "todo" ? "text-muted-foreground" : ""}`}>{s.title}</span>
              <span className="block text-sm text-muted-foreground">
                {s.state === "current" ? "In progress" : s.state === "done" ? "Done" : s.state === "failed" ? "Stopped" : "Waiting"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
