/** Where a transfer is, as steps a person can follow. Derived from the transfer `status`: Nuvion keeps no per-step event history. */
export type TransferStatus = "new" | "pending" | "successful" | "failed";
export type StepState = "done" | "current" | "todo" | "failed";
export interface Step {
  key: "quote" | "created" | "sent" | "delivered";
  title: string;
  state: StepState;
}

export function timeline(status: TransferStatus): Step[] {
  const quote: Step = { key: "quote", title: "Rate locked", state: "done" };
  const created: Step = { key: "created", title: "Transfer created", state: "done" };
  const sent = (state: StepState): Step => ({ key: "sent", title: "Sent to the payment network", state });
  switch (status) {
    case "new":
      return [quote, created, sent("current"), { key: "delivered", title: "Delivered", state: "todo" }];
    case "pending":
      return [quote, created, sent("done"), { key: "delivered", title: "Delivered", state: "current" }];
    case "successful":
      return [quote, created, sent("done"), { key: "delivered", title: "Delivered", state: "done" }];
    case "failed":
      // Nuvion doesn't say how far a failed transfer got, so the middle step stays neutral.
      return [quote, created, sent("todo"), { key: "delivered", title: "Not delivered", state: "failed" }];
  }
}

export const isSettled = (status: TransferStatus) => status === "successful" || status === "failed";
