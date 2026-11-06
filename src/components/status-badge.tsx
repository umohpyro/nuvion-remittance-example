import { Badge } from "@/components/ui/badge";
import type { TransferStatus } from "@/lib/timeline";

const LABEL: Record<TransferStatus, string> = { new: "Created", pending: "On its way", successful: "Delivered", failed: "Failed" };

export function StatusBadge({ status }: { status: TransferStatus }) {
  const tone = status === "successful" ? "bg-ok/15 text-ok" : status === "failed" ? "bg-destructive/15 text-destructive" : "bg-warn/15 text-warn";
  return <Badge className={`h-6 px-2.5 text-sm ${tone}`}>{LABEL[status] ?? status}</Badge>;
}
