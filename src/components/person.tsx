import { CORRIDORS, type CorridorId } from "@/lib/corridors";

/** Initials on a circle in the corridor's colour. White text on these fills is bold and large, as the design contrast rule asks. */
export function Avatar({ name, corridor, size = 44 }: { name: string; corridor: CorridorId; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-extrabold text-white"
      style={{ width: size, height: size, background: CORRIDORS[corridor].color, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

/** Corridor chip: country code, country and the currency the recipient gets. Colour comes from the corridor. */
export function CorridorChip({ corridor }: { corridor: CorridorId }) {
  const c = CORRIDORS[corridor];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">
      <span className="size-2 rounded-full" style={{ background: c.color }} aria-hidden />
      {c.country} · {c.currency}
    </span>
  );
}
