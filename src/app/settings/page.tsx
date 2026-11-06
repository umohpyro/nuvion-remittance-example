import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { SettingsForm } from "@/components/settings-form";
import { Skeleton } from "@/components/ui/skeleton";
import { readConfig } from "@/lib/config";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <PageShell title="Connect your sandbox" intro="Remit sends money home across currencies through the Nuvion sandbox. Connect your own key and every transfer runs in your tenant, so you can confirm it in your own dashboard. Nothing is shared with other visitors.">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Form />
      </Suspense>
    </PageShell>
  );
}

async function Form() {
  const cfg = await readConfig();
  return <SettingsForm connectedEntityId={cfg?.entityId ?? null} />;
}
