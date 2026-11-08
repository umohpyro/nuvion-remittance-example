"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addRecipient } from "@/app/actions";
import { NativeSelect } from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CORRIDORS, CORRIDOR_IDS, checkDetails, type CorridorId } from "@/lib/corridors";

const EMPTY = { firstName: "", lastName: "", street: "", city: "", postcode: "" };

export function RecipientForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [corridor, setCorridor] = useState<CorridorId>("KE");
  const [who, setWho] = useState(EMPTY);
  const [details, setDetails] = useState<Record<string, string>>({});
  const c = CORRIDORS[corridor];
  const filled = c.fields.every((f) => details[f.key]?.trim());
  const error = filled ? checkDetails(corridor, details) : null;
  const ready = Object.values(who).every((v) => v.trim()) && filled && !error;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addRecipient({ ...who, corridor, details });
          if (!r.ok) return void toast.error(r.error);
          toast.success("Recipient saved.");
          setWho(EMPTY);
          setDetails({});
          router.refresh();
        });
      }}
    >
      <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Use fake details only. Enter made-up names, phone numbers and account numbers, never real personal data.</p>
      <div className="space-y-1.5">
        <Label htmlFor="rc-corridor">Where are you sending to?</Label>
        <NativeSelect id="rc-corridor" className="h-11" value={corridor} onChange={(e) => { setCorridor(e.target.value as CorridorId); setDetails({}); }}>
          {CORRIDOR_IDS.map((id) => <option key={id} value={id}>{CORRIDORS[id].country} · {CORRIDORS[id].currency} · {CORRIDORS[id].rail}</option>)}
        </NativeSelect>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="rc-first">First name</Label>
          <Input id="rc-first" className="h-11" autoComplete="off" value={who.firstName} onChange={(e) => setWho({ ...who, firstName: e.target.value })} maxLength={40} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rc-last">Last name</Label>
          <Input id="rc-last" className="h-11" autoComplete="off" value={who.lastName} onChange={(e) => setWho({ ...who, lastName: e.target.value })} maxLength={40} required />
        </div>
      </div>
      {c.fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`rc-${f.key}`}>{f.label}</Label>
          <Input id={`rc-${f.key}`} className="h-11" inputMode={f.inputMode} autoComplete="off" spellCheck={false} placeholder={f.placeholder} value={details[f.key] ?? ""} onChange={(e) => setDetails({ ...details, [f.key]: e.target.value })} aria-invalid={Boolean(error)} required />
        </div>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <fieldset className="space-y-4 rounded-2xl border p-4">
        <legend className="px-1 text-sm font-semibold">Where do they live?</legend>
        <div className="space-y-1.5">
          <Label htmlFor="rc-street">Street address</Label>
          <Input id="rc-street" className="h-11" autoComplete="off" value={who.street} onChange={(e) => setWho({ ...who, street: e.target.value })} maxLength={80} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rc-city">City</Label>
            <Input id="rc-city" className="h-11" autoComplete="off" value={who.city} onChange={(e) => setWho({ ...who, city: e.target.value })} maxLength={60} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rc-post">Postcode</Label>
            <Input id="rc-post" className="h-11" autoComplete="off" value={who.postcode} onChange={(e) => setWho({ ...who, postcode: e.target.value })} maxLength={12} required />
          </div>
        </div>
      </fieldset>
      <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base font-bold" disabled={pending || !ready}>{pending ? "Saving…" : "Save recipient"}</Button>
    </form>
  );
}
