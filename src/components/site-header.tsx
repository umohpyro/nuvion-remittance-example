"use client";

import { History, House, Send, Settings, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitcher } from "@/components/theme-switcher";

const LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Home", Icon: House },
  { href: "/recipients", label: "Recipients", Icon: Users },
  { href: "/send", label: "Send", Icon: Send },
  { href: "/activity", label: "Activity", Icon: History },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function useCurrent() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-full bg-c text-c-foreground" aria-hidden><Send className="size-4 -rotate-12" /></span>
      <span className="text-lg font-extrabold tracking-tight">Remit</span>
      <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-sand-fixed">Sandbox</span>
    </Link>
  );
}

/** Top bar: brand and theme switcher on every width, with the section links from `md` up. Phones get the tab bar instead. */
export function SiteHeader() {
  const current = useCurrent();
  return (
    <header className="print:hidden sticky top-0 z-30 bg-band text-band-foreground">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Main" className="ml-auto hidden h-full items-stretch gap-1 text-sm font-semibold md:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={current(href) ? "page" : undefined}
              className={`flex items-center border-b-[3px] px-3 transition-colors ${current(href) ? "border-c text-band-foreground" : "border-transparent text-band-foreground/70 hover:text-band-foreground"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

/** Phones: a bottom tab bar with Send raised in the middle, within thumb reach. */
export function TabBar() {
  const current = useCurrent();
  return (
    <nav aria-label="Main" className="print:hidden fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {LINKS.map(({ href, label, Icon }) => {
          const active = current(href);
          const centre = href === "/send";
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold ${active ? "text-c-text" : "text-muted-foreground"}`}>
                {centre ? (
                  <span className="-mt-6 grid size-12 place-items-center rounded-full bg-c text-c-foreground shadow-card ring-4 ring-card"><Icon className="size-5" aria-hidden /></span>
                ) : (
                  <Icon className="size-5" aria-hidden />
                )}
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
